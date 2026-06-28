import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import type { LotoDraw, EuroDraw } from "@/lib/types";
import { scrapeHistoricalDraws } from "@/lib/fdjScraper";

const SUPPLEMENT_PATH = join(process.cwd(), "public", "historical-supplement.json");
const LOTO_CSV_CUTOFF = "2024-07-24";
const EURO_CSV_CUTOFF = "2024-07-23";

interface Supplement {
  generatedAt: string;
  loto: LotoDraw[];
  euro: EuroDraw[];
}

function readSupplement(): Supplement {
  try {
    if (existsSync(SUPPLEMENT_PATH)) {
      return JSON.parse(readFileSync(SUPPLEMENT_PATH, "utf8"));
    }
  } catch {
    // ignore
  }
  return { generatedAt: new Date().toISOString(), loto: [], euro: [] };
}

function writeSupplement(data: Supplement): void {
  writeFileSync(SUPPLEMENT_PATH, JSON.stringify(data, null, 2), "utf8");
}

function mergeDedupe<T extends { date: string }>(
  existing: T[],
  fresh: T[]
): T[] {
  const seen = new Set(existing.map((d) => d.date));
  const merged = [...existing];
  for (const d of fresh) {
    if (!seen.has(d.date)) {
      seen.add(d.date);
      merged.push(d);
    }
  }
  return merged.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * POST /api/update-supplement
 * Scrape les tirages FDJ depuis la dernière date connue et met à jour le supplément.
 * Retourne le nombre de tirages ajoutés.
 */
export async function POST() {
  const supplement = readSupplement();

  // Dernière date connue pour chaque jeu (jamais avant la coupure CSV)
  const lastLotoDate =
    supplement.loto.length > 0
      ? supplement.loto[0].date
      : LOTO_CSV_CUTOFF;

  const lastEuroDate =
    supplement.euro.length > 0
      ? supplement.euro[0].date
      : EURO_CSV_CUTOFF;

  const today = new Date().toISOString().slice(0, 10);

  // Si les données sont déjà à jour (tirages des 2 derniers jours) on ne re-scrape pas
  const lotoAge = Math.floor(
    (Date.now() - new Date(lastLotoDate).getTime()) / 86400000
  );
  const euroAge = Math.floor(
    (Date.now() - new Date(lastEuroDate).getTime()) / 86400000
  );

  if (lotoAge <= 1 && euroAge <= 1) {
    return NextResponse.json({
      ok: true,
      addedLoto: 0,
      addedEuro: 0,
      lastLotoDate,
      lastEuroDate,
      message: "Données déjà à jour.",
    });
  }

  // Scrape les deux jeux en parallèle
  const [lotoResult, euroResult] = await Promise.allSettled([
    scrapeHistoricalDraws("loto", lastLotoDate),
    scrapeHistoricalDraws("euromillions", lastEuroDate),
  ]);

  const newLoto: LotoDraw[] =
    lotoResult.status === "fulfilled" ? lotoResult.value.loto : [];
  const newEuro: EuroDraw[] =
    euroResult.status === "fulfilled" ? euroResult.value.euro : [];

  const updatedLoto = mergeDedupe(supplement.loto, newLoto);
  const updatedEuro = mergeDedupe(supplement.euro, newEuro);

  const updated: Supplement = {
    generatedAt: today,
    loto: updatedLoto,
    euro: updatedEuro,
  };

  writeSupplement(updated);

  return NextResponse.json({
    ok: true,
    addedLoto: newLoto.length,
    addedEuro: newEuro.length,
    lastLotoDate: updatedLoto[0]?.date ?? lastLotoDate,
    lastEuroDate: updatedEuro[0]?.date ?? lastEuroDate,
    message: `${newLoto.length + newEuro.length} nouveau(x) tirage(s) ajouté(s).`,
  });
}

/**
 * GET /api/update-supplement
 * Retourne le statut actuel du supplément (fraîcheur des données).
 */
export async function GET() {
  const supplement = readSupplement();
  const today = new Date().toISOString().slice(0, 10);

  const lastLotoDate = supplement.loto[0]?.date ?? null;
  const lastEuroDate = supplement.euro[0]?.date ?? null;

  const lotoAge = lastLotoDate
    ? Math.floor((Date.now() - new Date(lastLotoDate).getTime()) / 86400000)
    : 9999;
  const euroAge = lastEuroDate
    ? Math.floor((Date.now() - new Date(lastEuroDate).getTime()) / 86400000)
    : 9999;

  // Loto : max 3 jours entre tirages (sam → lun → mer → sam)
  // Euro  : max 4 jours entre tirages (ven → mar → ven)
  const lotoStale = lotoAge > 3;
  const euroStale = euroAge > 4;

  return NextResponse.json({
    generatedAt: supplement.generatedAt,
    today,
    loto: { lastDate: lastLotoDate, ageDays: lotoAge, stale: lotoStale },
    euro: { lastDate: lastEuroDate, ageDays: euroAge, stale: euroStale },
    needsUpdate: lotoStale || euroStale,
  });
}
