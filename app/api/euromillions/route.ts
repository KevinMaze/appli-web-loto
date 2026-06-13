import { NextResponse } from "next/server";
import JSZip from "jszip";
import Papa from "papaparse";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { EuroDraw } from "@/lib/types";
import { scrapeHistoricalDraws } from "@/lib/fdjScraper";

/**
 * URLs des CSV historiques EuroMillions (open data FDJ).
 * Gel des fichiers CSV : 23 juillet 2024.
 * Les tirages plus récents sont scrappés depuis fdj.fr (SSR, sans clé API).
 */
const EURO_CSV_URLS = [
  "https://cdn-media.fdj.fr/static-draws/csv/euromillions/euromillions_202002.zip", // 2020-2024
  "https://cdn-media.fdj.fr/static-draws/csv/euromillions/euromillions_201609.zip", // 2016-2020
  "https://cdn-media.fdj.fr/static-draws/csv/euromillions/euromillions_201105.zip", // 2011-2016
  "https://cdn-media.fdj.fr/static-draws/csv/euromillions/euromillions_200402.zip", // 2004-2011
];

const CSV_CUTOFF_DATE = "2024-07-23";

export const revalidate = 3600;

async function fetchAndExtractZip(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const csvFile = Object.values(zip.files).find((f) => f.name.endsWith(".csv"));
    if (!csvFile) return null;
    return await csvFile.async("string");
  } catch {
    return null;
  }
}

/**
 * Parse le CSV EuroMillions FDJ.
 * Colonnes : date_de_tirage, boule_1..5, etoile_1, etoile_2
 */
function parseEuroCSV(csv: string): EuroDraw[] {
  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    delimiter: ";",
  });

  const draws: EuroDraw[] = [];

  for (const row of data) {
    try {
      const rawDate = row["date_de_tirage"] || "";
      if (!rawDate) continue;
      const [day, month, year] = rawDate.split("/");
      if (!day || !month || !year) continue;
      const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

      const numbers = [
        parseInt(row["boule_1"] || "0"),
        parseInt(row["boule_2"] || "0"),
        parseInt(row["boule_3"] || "0"),
        parseInt(row["boule_4"] || "0"),
        parseInt(row["boule_5"] || "0"),
      ];
      const stars = [
        parseInt(row["etoile_1"] || "0"),
        parseInt(row["etoile_2"] || "0"),
      ];

      if (numbers.some((n) => n < 1 || n > 50)) continue;
      if (stars.some((s) => s < 1 || s > 12)) continue;

      draws.push({
        date: isoDate,
        numbers: numbers.sort((a, b) => a - b),
        stars: stars.sort((a, b) => a - b),
      });
    } catch {
      continue;
    }
  }

  return draws.sort((a, b) => b.date.localeCompare(a.date));
}

/** GET /api/euromillions — Historique : CSV (2004-2024) + supplément (2024-2026) + scraping FDJ récent */
export async function GET() {
  const allDraws: EuroDraw[] = [];
  const seenDates = new Set<string>();

  // 1. Données CSV historiques (2004-2024)
  for (const url of EURO_CSV_URLS) {
    const csv = await fetchAndExtractZip(url);
    if (!csv) continue;
    for (const draw of parseEuroCSV(csv)) {
      if (!seenDates.has(draw.date)) {
        seenDates.add(draw.date);
        allDraws.push(draw);
      }
    }
  }

  // 2. Supplément historique (2024-2026) depuis public/historical-supplement.json
  try {
    const supplementPath = join(process.cwd(), "public", "historical-supplement.json");
    if (existsSync(supplementPath)) {
      const supplement = JSON.parse(readFileSync(supplementPath, "utf8"));
      const euroSupp: EuroDraw[] = supplement.euro ?? [];
      for (const draw of euroSupp) {
        if (draw.date > CSV_CUTOFF_DATE && !seenDates.has(draw.date)) {
          seenDates.add(draw.date);
          allDraws.push(draw);
        }
      }
    }
  } catch {
    // Fichier optionnel — fonctionne sans
  }

  // 3. Tirages très récents depuis le scraping FDJ (~5 derniers tirages)
  try {
    const { euro: recentDraws } = await scrapeHistoricalDraws("euromillions", CSV_CUTOFF_DATE);
    for (const draw of recentDraws) {
      if (!seenDates.has(draw.date)) {
        seenDates.add(draw.date);
        allDraws.push(draw);
      }
    }
  } catch {
    // Scraping optionnel — ne bloque pas si indisponible
  }

  if (allDraws.length === 0) {
    return NextResponse.json(
      { error: "Impossible de récupérer les données EuroMillions." },
      { status: 503 }
    );
  }

  allDraws.sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json(
    { draws: allDraws, total: allDraws.length, lastUpdated: new Date().toISOString() },
    { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200" } }
  );
}
