// ─── Types partagés pour Loto et EuroMillions ───────────────────────────────

/** Un tirage du Loto */
export interface LotoDraw {
  date: string;           // ISO date string
  numbers: number[];      // 5 boules (1-49)
  chance: number;         // numéro chance (1-10)
  jackpot?: number;       // montant en euros si disponible
}

/** Un tirage EuroMillions */
export interface EuroDraw {
  date: string;           // ISO date string
  numbers: number[];      // 5 boules (1-50)
  stars: number[];        // 2 étoiles (1-12)
  jackpot?: number;
}

/** Statistique d'un numéro */
export interface NumberStat {
  number: number;
  count: number;          // nombre de fois sorti
  frequency: number;      // fréquence en %
  lastSeen?: string;      // date du dernier tirage
  gap: number;            // écart depuis le dernier tirage (en tirages)
}

/** Résumé statistiques global */
export interface DrawStats {
  totalDraws: number;
  numberStats: NumberStat[];
  hotNumbers: number[];   // 10 numéros les plus fréquents
  coldNumbers: number[];  // 10 numéros les moins fréquents
  averageNumbers: number; // moyenne de la somme des boules
}

/** Une grille de suggestion */
export interface SuggestionGrid {
  id: string;
  numbers: number[];
  extra: number[];        // numéro chance (Loto) ou étoiles (Euro)
  generatedAt: string;
  strategy: "balanced" | "hot" | "cold" | "random";
  game: "loto" | "euromillions";
}

/** Filtre de recherche */
export interface DrawFilter {
  dateFrom?: string;
  dateTo?: string;
  includeNumbers?: number[];
  excludeNumbers?: number[];
}
