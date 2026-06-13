import { NextResponse } from "next/server";
import JSZip from "jszip";
import Papa from "papaparse";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { LotoDraw } from "@/lib/types";
import { scrapeHistoricalDraws } from "@/lib/fdjScraper";

/**
 * URLs des fichiers CSV historiques du Loto publiés par la FDJ (open data).
 * Couvrent jusqu'au 24 juillet 2024 (date de gel des fichiers CSV FDJ).
 * Les tirages plus récents sont récupérés via scraping du site fdj.fr (SSR).
 */
const LOTO_CSV_URLS = [
  "https://cdn-media.fdj.fr/static-draws/csv/loto/loto_201911.zip", // 2019-2024
  "https://cdn-media.fdj.fr/static-draws/csv/loto/loto_201703.zip", // 2017-2019
  "https://cdn-media.fdj.fr/static-draws/csv/loto/loto_200810.zip", // 2008-2017
];

/** Date du dernier CSV FDJ — après cette date on complète par scraping */
const CSV_CUTOFF_DATE = "2024-07-24";

/** Durée de cache côté serveur : 1 heure (tirages 3x/semaine) */
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
 * Parse le CSV Loto FDJ (séparateur ";", date DD/MM/YYYY).
 * Colonnes : date_de_tirage, boule_1..5, numero_chance
 */
function parseLotoCSV(csv: string): LotoDraw[] {
  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    delimiter: ";",
  });

  const draws: LotoDraw[] = [];

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
      const chance = parseInt(row["numero_chance"] || "0");

      if (numbers.some((n) => n < 1 || n > 49)) continue;
      if (chance < 1 || chance > 10) continue;

      draws.push({ date: isoDate, numbers: numbers.sort((a, b) => a - b), chance });
    } catch {
      continue;
    }
  }

  return draws.sort((a, b) => b.date.localeCompare(a.date));
}

/** GET /api/loto — Historique : CSV (2008-2024) + supplément (2026+) + scraping FDJ récent */
export async function GET() {
  const allDraws: LotoDraw[] = [];
  const seenDates = new Set<string>();

  // 1. Données historiques depuis les CSV FDJ (2008-2024)
  for (const url of LOTO_CSV_URLS) {
    const csv = await fetchAndExtractZip(url);
    if (!csv) continue;
    for (const draw of parseLotoCSV(csv)) {
      if (!seenDates.has(draw.date)) {
        seenDates.add(draw.date);
        allDraws.push(draw);
      }
    }
  }

  // 2. Supplément historique (2024+) depuis public/historical-supplement.json
  try {
    const supplementPath = join(process.cwd(), "public", "historical-supplement.json");
    if (existsSync(supplementPath)) {
      const supplement = JSON.parse(readFileSync(supplementPath, "utf8"));
      const lotoSupp: LotoDraw[] = supplement.loto ?? [];
      for (const draw of lotoSupp) {
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
    const { loto: recentDraws } = await scrapeHistoricalDraws("loto", CSV_CUTOFF_DATE);
    for (const draw of recentDraws) {
      if (!seenDates.has(draw.date)) {
        seenDates.add(draw.date);
        allDraws.push(draw);
      }
    }
  } catch {
    // Le scraping peut échouer sans bloquer — les données CSV sont suffisantes
  }

  if (allDraws.length === 0) {
    return NextResponse.json(
      { error: "Impossible de récupérer les données. Réessayez dans quelques instants." },
      { status: 503 }
    );
  }

  allDraws.sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json(
    { draws: allDraws, total: allDraws.length, lastUpdated: new Date().toISOString() },
    { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200" } }
  );
}
