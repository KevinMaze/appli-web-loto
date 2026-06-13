"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BallGroup } from "./LotteryBall";
import { useGridStore, MAX_GRIDS_ANONYMOUS } from "@/lib/store";
import { generateMultipleGrids } from "@/lib/gridGenerator";
import type { DrawStats, SuggestionGrid as GridType } from "@/lib/types";

interface SuggestionGridPanelProps {
  game: "loto" | "euromillions";
  mainStats: DrawStats;
  extraStats: DrawStats; // chance stats pour Loto, star stats pour Euro
}

const strategyLabels = {
  balanced: "Équilibré",
  hot: "Chauds",
  cold: "Froids",
  random: "Aléatoire",
};

const strategyIcons = {
  balanced: "⚖️",
  hot: "🔥",
  cold: "❄️",
  random: "🎲",
};

/** Carte d'une grille de suggestion individuelle */
function GridCard({
  grid,
  onRemove,
  theme,
}: {
  grid: GridType;
  onRemove: () => void;
  theme: "loto" | "euromillions";
}) {
  const extraType = theme === "loto" ? "chance" : "star";
  const borderColor = theme === "loto" ? "border-loto-primary/20" : "border-euro-primary/20";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      className={`relative rounded-2xl border ${borderColor} bg-surface-card p-5`}
    >
      {/* Stratégie */}
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-white/40">
          <span>{strategyIcons[grid.strategy]}</span>
          <span>{strategyLabels[grid.strategy]}</span>
        </span>
        <button
          onClick={onRemove}
          className="rounded-md p-1 text-white/20 transition hover:bg-white/5 hover:text-white/60"
          title="Supprimer cette grille"
        >
          ✕
        </button>
      </div>

      {/* Boules */}
      <BallGroup
        numbers={grid.numbers}
        extra={grid.extra}
        extraType={extraType}
        size="md"
        animate
      />

      <p className="mt-3 text-xs text-white/20">
        Générée le {new Date(grid.generatedAt).toLocaleDateString("fr-FR")}
      </p>
    </motion.div>
  );
}

/**
 * Panneau de gestion des grilles de suggestion.
 * Affiche les grilles existantes et permet d'en générer de nouvelles (max 3 sans compte).
 */
export function SuggestionGridPanel({ game, mainStats, extraStats }: SuggestionGridPanelProps) {
  const { lotoGrids, euroGrids, addGrid, removeGrid, setWeeklyGrids } = useGridStore();
  const grids = game === "loto" ? lotoGrids : euroGrids;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const theme = game;

  const accentClass = game === "loto" ? "bg-loto-primary/10 hover:bg-loto-primary/20 border-loto-primary/30 text-loto-primary" : "bg-euro-primary/10 hover:bg-euro-primary/20 border-euro-primary/30 text-euro-primary";

  /** Génère les 3 grilles hebdomadaires initiales (remplace toutes) */
  async function handleInitWeekly() {
    if (mainStats.numberStats.length === 0) return;
    setIsGenerating(true);
    setErrorMsg(null);

    // Petit délai pour l'animation de chargement
    await new Promise((r) => setTimeout(r, 400));

    const newGrids = generateMultipleGrids(game, mainStats.numberStats, extraStats.numberStats, 3);
    setWeeklyGrids(game, newGrids);
    setIsGenerating(false);
  }

  /** Ajoute une grille supplémentaire */
  async function handleAddGrid() {
    if (mainStats.numberStats.length === 0) return;
    setIsGenerating(true);
    setErrorMsg(null);

    await new Promise((r) => setTimeout(r, 300));

    // Cycle entre les 3 stratégies selon le nombre de grilles existantes
    const strategies = ["balanced", "hot", "cold"] as const;
    const strategy = strategies[grids.length % strategies.length];

    const [newGrid] = generateMultipleGrids(game, mainStats.numberStats, extraStats.numberStats, 1);
    const result = addGrid({ ...newGrid, strategy });

    if (!result.success) {
      setErrorMsg(result.reason ?? "Limite atteinte");
    }

    setIsGenerating(false);
  }

  const canAddMore = grids.length < MAX_GRIDS_ANONYMOUS;

  return (
    <section className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Grilles de la semaine</h2>
          <p className="text-xs text-white/40">
            {grids.length}/{MAX_GRIDS_ANONYMOUS} grilles générées
          </p>
        </div>

        <div className="flex gap-2">
          {grids.length === 0 ? (
            <button
              onClick={handleInitWeekly}
              disabled={isGenerating || mainStats.totalDraws === 0}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:opacity-40 ${accentClass}`}
            >
              {isGenerating ? (
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  ⟳
                </motion.span>
              ) : (
                "✨"
              )}
              Générer les grilles
            </button>
          ) : (
            <button
              onClick={handleAddGrid}
              disabled={!canAddMore || isGenerating || mainStats.totalDraws === 0}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:opacity-40 ${accentClass}`}
            >
              {isGenerating ? "..." : "+ Nouvelle grille"}
            </button>
          )}
        </div>
      </div>

      {/* Message d'erreur / limite */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"
          >
            {errorMsg}
            <span className="ml-2 opacity-50">
              (fonctionnalité "Mon Compte" à venir)
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des grilles */}
      <AnimatePresence mode="popLayout">
        {grids.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30"
          >
            Aucune grille générée. Cliquez sur "Générer les grilles" pour commencer.
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grids.map((grid) => (
              <GridCard
                key={grid.id}
                grid={grid}
                onRemove={() => removeGrid(grid.id)}
                theme={theme}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Indicateur de compte */}
      {!canAddMore && (
        <p className="text-center text-xs text-white/25">
          Créez un compte pour générer jusqu&apos;à 10 grilles et conserver votre historique.
        </p>
      )}
    </section>
  );
}
