import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SuggestionGrid } from "./types";

/** Nombre maximum de grilles pour un utilisateur non connecté */
export const MAX_GRIDS_ANONYMOUS = 3;

interface GridStore {
  lotoGrids: SuggestionGrid[];
  euroGrids: SuggestionGrid[];

  /** Ajoute une grille (vérifie la limite max) */
  addGrid: (grid: SuggestionGrid) => { success: boolean; reason?: string };

  /** Remplace toutes les grilles d'un jeu (init hebdomadaire) */
  setWeeklyGrids: (game: "loto" | "euromillions", grids: SuggestionGrid[]) => void;

  /** Supprime une grille par son id */
  removeGrid: (id: string) => void;

  /** Vide toutes les grilles d'un jeu */
  clearGrids: (game: "loto" | "euromillions") => void;
}

export const useGridStore = create<GridStore>()(
  // persist() sauvegarde les grilles dans localStorage pour retrouver entre sessions
  persist(
    (set, get) => ({
      lotoGrids: [],
      euroGrids: [],

      addGrid: (grid) => {
        const { lotoGrids, euroGrids } = get();
        const grids = grid.game === "loto" ? lotoGrids : euroGrids;

        if (grids.length >= MAX_GRIDS_ANONYMOUS) {
          return {
            success: false,
            reason: `Maximum ${MAX_GRIDS_ANONYMOUS} grilles atteint. Créez un compte pour en générer plus.`,
          };
        }

        if (grid.game === "loto") {
          set({ lotoGrids: [...lotoGrids, grid] });
        } else {
          set({ euroGrids: [...euroGrids, grid] });
        }
        return { success: true };
      },

      setWeeklyGrids: (game, grids) => {
        if (game === "loto") {
          set({ lotoGrids: grids });
        } else {
          set({ euroGrids: grids });
        }
      },

      removeGrid: (id) => {
        const { lotoGrids, euroGrids } = get();
        set({
          lotoGrids: lotoGrids.filter((g) => g.id !== id),
          euroGrids: euroGrids.filter((g) => g.id !== id),
        });
      },

      clearGrids: (game) => {
        if (game === "loto") {
          set({ lotoGrids: [] });
        } else {
          set({ euroGrids: [] });
        }
      },
    }),
    {
      name: "lottery-grids-storage",
    }
  )
);
