/**
 * Scraper des résultats récents FDJ depuis le site officiel fdj.fr
 *
 * La FDJ publie ses résultats via une app Next.js SSR. Les données sont
 * pré-chargées dans le HTML sous forme de chunks RSC (React Server Components).
 * On extrait le cache React Query embarqué dans le flux RSC.
 */

import type { LotoDraw, EuroDraw } from "./types";

const FDJ_BASE = "https://www.fdj.fr";
const SCRAPE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9",
  "Accept-Encoding": "identity",
};

interface RawFDJDraw {
  id: string;
  gameName: string;
  date: string;                     // ISO datetime "2026-06-10T20:55:00.000+02:00"
  numbers: string[];                // boules principales
  complementariesNumbers?: string[]; // numéro chance (Loto) ou étoiles (Euro)
}

/**
 * Extrait le cache React Query embarqué dans les chunks RSC Next.js.
 * Cherche le pattern self.__next_f.push([1,"..."]) dans le HTML.
 */
function extractRSCData(html: string): RawFDJDraw[] {
  const draws: RawFDJDraw[] = [];

  const chunkRegex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
  let match;

  while ((match = chunkRegex.exec(html)) !== null) {
    try {
      const decoded = match[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");

      const drawRegex =
        /\{"id":"([^"]+)","gameName":"(loto|euromillions)","date":"([^"]+)","externalId":"[^"]+","numbers":\[([^\]]+)\][\s\S]*?"complementariesNumbers":\[([^\]]*)\]/g;

      let drawMatch;
      while ((drawMatch = drawRegex.exec(decoded)) !== null) {
        const [, id, gameName, dateStr, numsRaw, extrasRaw] = drawMatch;

        draws.push({
          id,
          gameName,
          date: dateStr,
          numbers: numsRaw
            .split(",")
            .map((n) => n.replace(/"/g, "").trim())
            .filter(Boolean),
          complementariesNumbers: extrasRaw
            ? extrasRaw
                .split(",")
                .map((n) => n.replace(/"/g, "").trim())
                .filter(Boolean)
            : [],
        });
      }
    } catch {
      continue;
    }
  }

  // Déduplique par id
  const seen = new Set<string>();
  return draws.filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });
}

/** Convertit un tirage FDJ brut en LotoDraw */
function toLoTo(raw: RawFDJDraw): LotoDraw | null {
  try {
    const isoDate = raw.date.slice(0, 10);

    const numbers = raw.numbers
      .map(Number)
      .filter((n) => n >= 1 && n <= 49)
      .sort((a, b) => a - b);

    const chance = Number(raw.complementariesNumbers?.[0] ?? 0);

    if (numbers.length !== 5 || chance < 1 || chance > 10) return null;

    return { date: isoDate, numbers, chance };
  } catch {
    return null;
  }
}

/** Convertit un tirage FDJ brut en EuroDraw */
function toEuro(raw: RawFDJDraw): EuroDraw | null {
  try {
    const isoDate = raw.date.slice(0, 10);

    const numbers = raw.numbers
      .map(Number)
      .filter((n) => n >= 1 && n <= 50)
      .sort((a, b) => a - b);

    const stars = (raw.complementariesNumbers ?? [])
      .map(Number)
      .filter((n) => n >= 1 && n <= 12)
      .sort((a, b) => a - b);

    if (numbers.length !== 5 || stars.length !== 2) return null;

    return { date: isoDate, numbers, stars };
  } catch {
    return null;
  }
}

/** Fetch une URL FDJ et extrait les tirages bruts depuis le RSC */
async function fetchFDJPage(url: string): Promise<RawFDJDraw[]> {
  try {
    const res = await fetch(url, {
      headers: SCRAPE_HEADERS,
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const html = await res.text();
    return extractRSCData(html);
  } catch {
    return [];
  }
}

/**
 * Scrape la page de résultats FDJ pour un jeu donné.
 * La page SSR contient les ~5 derniers tirages pré-chargés dans le RSC.
 */
export async function scrapeRecentDraws(
  game: "loto" | "euromillions"
): Promise<{ loto: LotoDraw[]; euro: EuroDraw[] }> {
  const url =
    game === "loto"
      ? `${FDJ_BASE}/jeux-de-tirage/loto/resultats`
      : `${FDJ_BASE}/jeux-de-tirage/euromillions/resultats`;

  try {
    const rawDraws = await fetchFDJPage(url);

    const loto: LotoDraw[] = rawDraws
      .filter((d) => d.gameName === "loto")
      .map(toLoTo)
      .filter((d): d is LotoDraw => d !== null);

    const euro: EuroDraw[] = rawDraws
      .filter((d) => d.gameName === "euromillions")
      .map(toEuro)
      .filter((d): d is EuroDraw => d !== null);

    return { loto, euro };
  } catch {
    return { loto: [], euro: [] };
  }
}

/**
 * Génère toutes les dates de tirage attendues entre deux dates ISO.
 * Loto : lundi, mercredi, samedi
 * Euro : mardi, vendredi
 */
function getExpectedDrawDates(
  game: "loto" | "euromillions",
  afterDate: string,
  beforeDate: string
): string[] {
  const drawDays =
    game === "loto"
      ? [1, 3, 6] // Lundi=1, Mercredi=3, Samedi=6
      : [2, 5];   // Mardi=2, Vendredi=5

  const dates: string[] = [];
  const start = new Date(afterDate);
  const end = new Date(beforeDate);

  // Avance d'un jour pour ne pas inclure afterDate lui-même
  start.setDate(start.getDate() + 1);

  const cur = new Date(start);
  while (cur <= end) {
    if (drawDays.includes(cur.getDay())) {
      dates.push(cur.toISOString().slice(0, 10));
    }
    cur.setDate(cur.getDate() + 1);
  }

  return dates;
}

/**
 * Scrape les tirages historiques depuis une date donnée.
 *
 * Stratégie multi-passes :
 * 1. Page principale (derniers ~5 tirages)
 * 2. Pages par date (?date=YYYY-MM-DD et variantes)
 * 3. Déduplication et filtrage
 */
export async function scrapeHistoricalDraws(
  game: "loto" | "euromillions",
  afterDate: string
): Promise<{ loto: LotoDraw[]; euro: EuroDraw[] }> {
  const today = new Date().toISOString().slice(0, 10);
  const allRaw: RawFDJDraw[] = [];

  // 1. Page principale (derniers tirages)
  const baseUrl =
    game === "loto"
      ? `${FDJ_BASE}/jeux-de-tirage/loto/resultats`
      : `${FDJ_BASE}/jeux-de-tirage/euromillions/resultats`;

  const mainDraws = await fetchFDJPage(baseUrl);
  allRaw.push(...mainDraws);

  // 2. Essaie d'accéder aux pages par date pour couvrir les tirages manquants
  // On cible les dates de tirages attendues entre afterDate et aujourd'hui
  const expectedDates = getExpectedDrawDates(game, afterDate, today);

  // Regroupe par semaines pour limiter les requêtes (max 8 semaines = 8 requêtes)
  const datesByWeek = new Map<string, string>();
  for (const date of expectedDates) {
    const d = new Date(date);
    // Lundi de la semaine comme clé
    const dayOfWeek = d.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const weekKey = monday.toISOString().slice(0, 10);
    if (!datesByWeek.has(weekKey)) {
      datesByWeek.set(weekKey, date);
    }
  }

  // Essaie plusieurs patterns d'URL FDJ avec une date représentative par semaine
  const urlPatterns = [
    (date: string) => `${baseUrl}?date=${date}`,
    (date: string) => `${baseUrl}?drawDate=${date}`,
    (date: string) => `${baseUrl}/${date}`,
  ];

  for (const [, repDate] of Array.from(datesByWeek.entries())) {
    // Essaie le premier pattern qui retourne des données
    for (const makeUrl of urlPatterns) {
      const draws = await fetchFDJPage(makeUrl(repDate));
      if (draws.length > 0) {
        allRaw.push(...draws);
        break;
      }
    }
  }

  // Déduplique et convertit
  const seen = new Set<string>();
  const uniqueRaw = allRaw.filter((d) => {
    const key = `${d.gameName}:${d.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const loto: LotoDraw[] = uniqueRaw
    .filter((d) => d.gameName === "loto")
    .map(toLoTo)
    .filter((d): d is LotoDraw => d !== null && d.date > afterDate);

  const euro: EuroDraw[] = uniqueRaw
    .filter((d) => d.gameName === "euromillions")
    .map(toEuro)
    .filter((d): d is EuroDraw => d !== null && d.date > afterDate);

  return { loto, euro };
}
