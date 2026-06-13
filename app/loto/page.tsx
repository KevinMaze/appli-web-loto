"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useLotoData } from "@/hooks/useLotoData";
import { computeLotoStats, filterDrawsByDate, filterDrawsByNumbers } from "@/lib/statistics";
import { LotoDrawCard } from "@/components/DrawCard";
import { StatisticsPanel } from "@/components/StatisticsPanel";
import { SuggestionGridPanel } from "@/components/SuggestionGrid";
import { FilterPanel } from "@/components/FilterPanel";
import { BallGroup } from "@/components/LotteryBall";
import type { DrawFilter } from "@/lib/types";

/** Composant squelette de chargement */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-card" />
      ))}
    </div>
  );
}

/** Page principale Loto */
export default function LotoPage() {
  const { draws, total, lastUpdated, isLoading, isError, refresh } = useLotoData();
  const [filter, setFilter] = useState<DrawFilter>({});
  const [showCount, setShowCount] = useState(20);

  // Calcul des statistiques sur TOUS les tirages (non filtrés)
  const allStats = useMemo(() => computeLotoStats(draws), [draws]);

  // Stats du numéro chance séparément
  const chanceStats = useMemo(() => {
    if (draws.length === 0) return { totalDraws: 0, numberStats: [], hotNumbers: [], coldNumbers: [], averageNumbers: 0 };
    const counts = new Array(11).fill(0);
    const lastIdx = new Array(11).fill(-1);
    draws.forEach((d, i) => {
      counts[d.chance]++;
      if (lastIdx[d.chance] < i) lastIdx[d.chance] = i;
    });
    const numberStats = Array.from({ length: 10 }, (_, k) => {
      const n = k + 1;
      return {
        number: n,
        count: counts[n],
        frequency: draws.length > 0 ? (counts[n] / draws.length) * 100 : 0,
        gap: lastIdx[n] >= 0 ? draws.length - 1 - lastIdx[n] : draws.length,
      };
    });
    const sorted = [...numberStats].sort((a, b) => b.count - a.count);
    return {
      totalDraws: draws.length,
      numberStats,
      hotNumbers: sorted.slice(0, 3).map((s) => s.number),
      coldNumbers: sorted.slice(-3).map((s) => s.number),
      averageNumbers: draws.reduce((acc, d) => acc + d.chance, 0) / draws.length,
    };
  }, [draws]);

  // Application des filtres pour l'affichage de l'historique
  const filteredDraws = useMemo(() => {
    let result = draws;
    result = filterDrawsByDate(result, filter.dateFrom, filter.dateTo);
    result = filterDrawsByNumbers(result, filter.includeNumbers);
    return result;
  }, [draws, filter]);

  const visibleDraws = filteredDraws.slice(0, showCount);

  return (
    <div className="space-y-10">
      {/* En-tête */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-1 flex items-center gap-3">
          <span className="text-3xl">🎱</span>
          <h1 className="text-3xl font-bold text-white">Loto</h1>
        </div>
        <p className="text-sm text-white/40">
          {total > 0 ? `${total} tirages analysés` : "Chargement..."}{" "}
          {lastUpdated && (
            <span>· mis à jour {new Date(lastUpdated).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
          )}
          <button
            onClick={() => refresh()}
            className="ml-3 text-xs text-white/20 underline underline-offset-2 hover:text-white/50"
          >
            Actualiser
          </button>
        </p>
      </motion.div>

      {isError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          Impossible de charger les données. Vérifiez votre connexion ou réessayez.
        </div>
      )}

      {/* Bannière couverture des données */}
      {!isLoading && total > 0 && (
        <div className="rounded-xl border border-white/5 bg-surface-elevated px-4 py-3 text-xs text-white/40">
          📊 Données : CSV FDJ 2008–2024 · loterieplus.com jan 2026–présent · FDJ direct (derniers tirages).
          La période août 2024–déc. 2025 n&apos;est pas disponible en open data — les statistiques portent sur {total} tirages.
        </div>
      )}

      {/* Dernier tirage mis en valeur */}
      {!isLoading && draws.length > 0 && (
        <section className="rounded-3xl border border-loto-primary/20 bg-gradient-to-br from-loto-primary/5 to-surface-card p-6">
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-loto-primary/70">
            Dernier tirage
          </p>
          <p className="mb-4 text-sm text-white/40">
            {new Date(draws[0].date).toLocaleDateString("fr-FR", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
          <BallGroup
            numbers={draws[0].numbers}
            extra={[draws[0].chance]}
            extraType="chance"
            size="lg"
            animate
          />
        </section>
      )}

      {/* Grilles de suggestion */}
      {!isLoading && allStats.totalDraws > 0 && (
        <SuggestionGridPanel
          game="loto"
          mainStats={allStats}
          extraStats={chanceStats}
        />
      )}

      {/* Statistiques */}
      {!isLoading && allStats.totalDraws > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Statistiques</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <StatisticsPanel
              stats={allStats}
              title="Boules (1–49)"
              accentColor="#E63946"
              maxNumber={49}
              ballType="main"
            />
            <StatisticsPanel
              stats={chanceStats}
              title="Numéro chance (1–10)"
              accentColor="#F4A261"
              maxNumber={10}
              ballType="chance"
            />
          </div>
        </section>
      )}

      {/* Historique des tirages */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Historique des tirages</h2>

        <FilterPanel filter={filter} onChange={setFilter} maxNumber={49} />

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {filteredDraws.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/30">
                Aucun tirage ne correspond aux filtres sélectionnés.
              </p>
            ) : (
              <>
                <p className="text-xs text-white/30">
                  {filteredDraws.length} tirage{filteredDraws.length > 1 ? "s" : ""} trouvé{filteredDraws.length > 1 ? "s" : ""}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleDraws.map((draw, i) => (
                    <LotoDrawCard
                      key={draw.date}
                      draw={draw}
                      index={i}
                      isLatest={i === 0 && !filter.dateFrom && !filter.dateTo}
                    />
                  ))}
                </div>

                {showCount < filteredDraws.length && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowCount((c) => c + 30)}
                      className="rounded-xl border border-white/10 px-6 py-3 text-sm text-white/50 transition hover:border-white/20 hover:text-white/80"
                    >
                      Afficher plus ({filteredDraws.length - showCount} restants)
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
