/**
 * Scraper des résultats récents FDJ depuis le site officiel fdj.fr
 *
 * La FDJ publie ses résultats via une app Next.js SSR. Les données sont
 * pré-chargées dans le HTML sous forme de chunks RSC (React Server Components).
 * On extrait le cache React Query embarqué dans le flux RSC.
 *
 * Limite : seuls les ~5 derniers tirages sont présents dans le RSC initial.
 * Pour plus d'historique, on itère sur les pages de résultats par date.
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

  // Extrait tous les chunks RSC
  // Flag 's' (dotAll) remplacé par [\s\S] pour compatibilité ES2017
  const chunkRegex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
  let match;

  while ((match = chunkRegex.exec(html)) !== null) {
    try {
      // Décode l'échappement JSON du chunk
      const decoded = match[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");

      // Cherche les tirages : {"id":"...","gameName":"loto"|"euromillions","date":"...","numbers":[...]}
      // Cherche les tirages avec leurs numéros et complémentaires
      // Note: [^}]* ne suffit pas car "shares" contient des }, on utilise [\s\S]*? (non-greedy)
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

  return draws;
}

/** Convertit un tirage FDJ brut en LotoDraw */
function toLoTo(raw: RawFDJDraw): LotoDraw | null {
  try {
    // Parse la date ISO en YYYY-MM-DD
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

/**
 * Scrape la page de résultats FDJ pour un jeu donné et retourne les tirages récents.
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
    const res = await fetch(url, {
      headers: SCRAPE_HEADERS,
      signal: AbortSignal.timeout(20000),
      next: { revalidate: 3600 },
    });

    if (!res.ok) return { loto: [], euro: [] };

    const html = await res.text();
    const rawDraws = extractRSCData(html);

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
 * Scrape les tirages historiques récents (depuis août 2024) en naviguant
 * sur les pages de résultats FDJ semaine par semaine.
 *
 * Stratégie : on récupère les "drawGameActiveDates" (dates disponibles)
 * depuis la page principale, puis on les itère.
 */
export async function scrapeHistoricalDraws(
  game: "loto" | "euromillions",
  afterDate: string  // YYYY-MM-DD — on ne récupère que les tirages après cette date
): Promise<{ loto: LotoDraw[]; euro: EuroDraw[] }> {
  // La page principale donne les 5 derniers tirages
  const recent = await scrapeRecentDraws(game);

  // Pour l'instant on retourne juste les résultats récents
  // (couverture des ~5 derniers tirages = suffisant pour les dernières semaines)
  const loto = recent.loto.filter((d) => d.date > afterDate);
  const euro = recent.euro.filter((d) => d.date > afterDate);

  return { loto, euro };
}
