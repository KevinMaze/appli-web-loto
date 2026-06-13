import type { NumberStat, SuggestionGrid } from "./types";

/**
 * Génère un identifiant unique simple pour une grille
 */
function generateId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

/**
 * Tire un nombre sans remise depuis un tableau pondéré.
 * Les numéros "chauds" ont plus de poids, les "froids" moins.
 */
function weightedSample(
  stats: NumberStat[],
  count: number,
  strategy: "balanced" | "hot" | "cold" | "random"
): number[] {
  if (stats.length === 0) return [];

  // Calcul du poids selon la stratégie
  const withWeights = stats.map((s) => {
    let weight: number;
    switch (strategy) {
      case "hot":
        // Favorise les numéros fréquents
        weight = Math.pow(s.count + 1, 2);
        break;
      case "cold":
        // Favorise les numéros peu sortis (grande valeur d'écart)
        weight = Math.pow(s.gap + 1, 1.5);
        break;
      case "balanced":
        // Mix équilibré : chaud * 0.6 + froid * 0.4
        weight = (s.count + 1) * 0.6 + (s.gap + 1) * 0.4;
        break;
      default:
        // Pure aléatoire
        weight = 1;
    }
    return { number: s.number, weight };
  });

  const selected: number[] = [];
  const pool = [...withWeights];

  for (let i = 0; i < Math.min(count, pool.length); i++) {
    // Somme totale des poids restants
    const totalWeight = pool.reduce((acc, p) => acc + p.weight, 0);
    let rand = Math.random() * totalWeight;

    // Sélection par roue de la fortune (roulette wheel selection)
    for (let j = 0; j < pool.length; j++) {
      rand -= pool[j].weight;
      if (rand <= 0) {
        selected.push(pool[j].number);
        pool.splice(j, 1); // retire le numéro sélectionné
        break;
      }
    }
  }

  return selected.sort((a, b) => a - b);
}

/**
 * Génère une grille de suggestion pour le Loto
 * @param mainStats - Stats des boules 1-49
 * @param chanceStats - Stats du numéro chance 1-10
 * @param strategy - Stratégie de génération
 */
export function generateLotoGrid(
  mainStats: NumberStat[],
  chanceStats: NumberStat[],
  strategy: "balanced" | "hot" | "cold" | "random" = "balanced"
): SuggestionGrid {
  const numbers = weightedSample(mainStats, 5, strategy);
  const chance = weightedSample(chanceStats, 1, strategy);

  return {
    id: generateId(),
    numbers,
    extra: chance,
    generatedAt: new Date().toISOString(),
    strategy,
    game: "loto",
  };
}

/**
 * Génère une grille de suggestion pour l'EuroMillions
 * @param mainStats - Stats des boules 1-50
 * @param starStats - Stats des étoiles 1-12
 * @param strategy - Stratégie de génération
 */
export function generateEuroGrid(
  mainStats: NumberStat[],
  starStats: NumberStat[],
  strategy: "balanced" | "hot" | "cold" | "random" = "balanced"
): SuggestionGrid {
  const numbers = weightedSample(mainStats, 5, strategy);
  const stars = weightedSample(starStats, 2, strategy);

  return {
    id: generateId(),
    numbers,
    extra: stars,
    generatedAt: new Date().toISOString(),
    strategy,
    game: "euromillions",
  };
}

/**
 * Génère plusieurs grilles avec des stratégies différentes.
 * Les 3 stratégies couvrent : équilibré, chaud, froid.
 */
export function generateMultipleGrids(
  game: "loto" | "euromillions",
  mainStats: NumberStat[],
  extraStats: NumberStat[],
  count: 1 | 2 | 3 = 1
): SuggestionGrid[] {
  const strategies: Array<"balanced" | "hot" | "cold"> = ["balanced", "hot", "cold"];
  const grids: SuggestionGrid[] = [];

  for (let i = 0; i < count; i++) {
    const strategy = strategies[i % strategies.length];
    if (game === "loto") {
      grids.push(generateLotoGrid(mainStats, extraStats, strategy));
    } else {
      grids.push(generateEuroGrid(mainStats, extraStats, strategy));
    }
  }

  return grids;
}
