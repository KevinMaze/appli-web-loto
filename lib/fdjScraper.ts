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

      // FDJ insère des champs variables entre "date" et "numbers" (ex: "gameExternalId"),
      // et "complementariesNumbers" peut être loin après "numbers" (imbriqué sous "shares").
      // On repère d'abord l'en-tête du tirage, puis on cherche "numbers" et
      // "complementariesNumbers" dans une fenêtre bornée qui suit, sans supposer d'ordre strict.
      const headerRegex = /"id":"(\d+)","gameName":"(loto|euromillions)","date":"([^"]+)"/g;
      const WINDOW = 15000;

      let headerMatch;
      while ((headerMatch = headerRegex.exec(decoded)) !== null) {
        const [, id, gameName, dateStr] = headerMatch;
        const block = decoded.slice(headerMatch.index, headerMatch.index + WINDOW);

        const numsMatch = block.match(/"numbers":\[([^\]]+)\]/);
        if (!numsMatch) continue;
        const extrasMatch = block.match(/"complementariesNumbers":\[([^\]]*)\]/);

        draws.push({
          id,
          gameName,
          date: dateStr,
          numbers: numsMatch[1]
            .split(",")
            .map((n) => n.replace(/"/g, "").trim())
            .filter(Boolean),
          complementariesNumbers: extrasMatch
            ? extrasMatch[1]
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
 * Scrape le(s) tirage(s) le(s) plus récent(s) depuis fdj.fr.
 *
 * Note : FDJ a retiré l'accès aux résultats par date — toute URL historique
 * (?date=, /YYYY-MM-DD, etc.) redirige désormais vers la page du dernier
 * tirage. Seul le tirage le plus récent est donc récupérable ici ; le reste
 * de l'historique post-CSV doit venir d'une autre source
 * (voir scripts/fetchMissingDraws.mjs).
 */
export async function scrapeHistoricalDraws(
  game: "loto" | "euromillions",
  afterDate: string
): Promise<{ loto: LotoDraw[]; euro: EuroDraw[] }> {
  const baseUrl =
    game === "loto"
      ? `${FDJ_BASE}/jeux-de-tirage/loto/resultats`
      : `${FDJ_BASE}/jeux-de-tirage/euromillions/resultats`;

  const allRaw = await fetchFDJPage(baseUrl);

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
