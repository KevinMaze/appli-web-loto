import type { LotoDraw, EuroDraw, NumberStat, DrawStats } from "./types";

/**
 * Calcule les statistiques de fréquence pour un tableau de numéros issus de tirages.
 * @param draws - Liste de tirages
 * @param mainField - Clé contenant les numéros principaux
 * @param maxNumber - Valeur max possible (49 pour Loto, 50 pour Euro)
 * @param totalDraws - Nombre total de tirages
 */
function computeNumberStats(
  allNumbers: number[][],
  dates: string[],
  maxNumber: number,
  totalDraws: number
): NumberStat[] {
  // Comptage des occurrences pour chaque numéro
  const counts = new Array(maxNumber + 1).fill(0);
  const lastSeenIndex = new Array(maxNumber + 1).fill(-1);

  allNumbers.forEach((nums, drawIndex) => {
    nums.forEach((n) => {
      counts[n]++;
      if (lastSeenIndex[n] < drawIndex) lastSeenIndex[n] = drawIndex;
    });
  });

  const stats: NumberStat[] = [];
  for (let n = 1; n <= maxNumber; n++) {
    stats.push({
      number: n,
      count: counts[n],
      frequency: totalDraws > 0 ? (counts[n] / totalDraws) * 100 : 0,
      lastSeen: lastSeenIndex[n] >= 0 ? dates[lastSeenIndex[n]] : undefined,
      // Écart = nombre de tirages depuis le dernier passage
      gap: lastSeenIndex[n] >= 0 ? totalDraws - 1 - lastSeenIndex[n] : totalDraws,
    });
  }

  return stats;
}

/** Calcule les stats complètes pour le Loto */
export function computeLotoStats(draws: LotoDraw[]): DrawStats {
  if (draws.length === 0) {
    return { totalDraws: 0, numberStats: [], hotNumbers: [], coldNumbers: [], averageNumbers: 0 };
  }

  const allNumbers = draws.map((d) => d.numbers);
  const dates = draws.map((d) => d.date);
  const numberStats = computeNumberStats(allNumbers, dates, 49, draws.length);

  // Tri par fréquence décroissante pour les chauds, croissante pour les froids
  const sorted = [...numberStats].sort((a, b) => b.count - a.count);
  const hotNumbers = sorted.slice(0, 10).map((s) => s.number);
  const coldNumbers = sorted.slice(-10).map((s) => s.number);

  // Moyenne de la somme des 5 boules par tirage
  const avgSum = draws.reduce((acc, d) => acc + d.numbers.reduce((s, n) => s + n, 0), 0) / draws.length;

  return { totalDraws: draws.length, numberStats, hotNumbers, coldNumbers, averageNumbers: avgSum };
}

/** Calcule les stats complètes pour l'EuroMillions */
export function computeEuroStats(draws: EuroDraw[]): {
  main: DrawStats;
  stars: DrawStats;
} {
  if (draws.length === 0) {
    const empty: DrawStats = { totalDraws: 0, numberStats: [], hotNumbers: [], coldNumbers: [], averageNumbers: 0 };
    return { main: empty, stars: empty };
  }

  // Stats boules principales (1-50)
  const mainNums = draws.map((d) => d.numbers);
  const dates = draws.map((d) => d.date);
  const mainStats = computeNumberStats(mainNums, dates, 50, draws.length);
  const sortedMain = [...mainStats].sort((a, b) => b.count - a.count);
  const avgMain = draws.reduce((acc, d) => acc + d.numbers.reduce((s, n) => s + n, 0), 0) / draws.length;

  // Stats étoiles (1-12)
  const starNums = draws.map((d) => d.stars);
  const starStats = computeNumberStats(starNums, dates, 12, draws.length);
  const sortedStars = [...starStats].sort((a, b) => b.count - a.count);
  const avgStars = draws.reduce((acc, d) => acc + d.stars.reduce((s, n) => s + n, 0), 0) / draws.length;

  return {
    main: {
      totalDraws: draws.length,
      numberStats: mainStats,
      hotNumbers: sortedMain.slice(0, 10).map((s) => s.number),
      coldNumbers: sortedMain.slice(-10).map((s) => s.number),
      averageNumbers: avgMain,
    },
    stars: {
      totalDraws: draws.length,
      numberStats: starStats,
      hotNumbers: sortedStars.slice(0, 5).map((s) => s.number),
      coldNumbers: sortedStars.slice(-5).map((s) => s.number),
      averageNumbers: avgStars,
    },
  };
}

/** Filtre les tirages par plage de dates */
export function filterDrawsByDate<T extends { date: string }>(
  draws: T[],
  dateFrom?: string,
  dateTo?: string
): T[] {
  return draws.filter((d) => {
    if (dateFrom && d.date < dateFrom) return false;
    if (dateTo && d.date > dateTo) return false;
    return true;
  });
}

/** Filtre les tirages contenant au moins un des numéros donnés */
export function filterDrawsByNumbers<T extends { numbers: number[] }>(
  draws: T[],
  includeNumbers?: number[]
): T[] {
  if (!includeNumbers || includeNumbers.length === 0) return draws;
  return draws.filter((d) => includeNumbers.some((n) => d.numbers.includes(n)));
}
