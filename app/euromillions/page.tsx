"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useEuromillionsData } from "@/hooks/useEuromillionsData";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { computeEuroStats, filterDrawsByDate, filterDrawsByNumbers } from "@/lib/statistics";
import { EuroDrawCard } from "@/components/DrawCard";
import { StatisticsPanel } from "@/components/StatisticsPanel";
import { SuggestionGridPanel } from "@/components/SuggestionGrid";
import { FilterPanel } from "@/components/FilterPanel";
import { BallGroup } from "@/components/LotteryBall";
import type { DrawFilter } from "@/lib/types";

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-card" />
      ))}
    </div>
  );
}

/** Page principale EuroMillions */
export default function EuromillionsPage() {
  const { draws, total, lastUpdated, isLoading, isError, refresh } = useEuromillionsData();
  const { isUpdating, lastResult, triggerUpdate } = useAutoRefresh(refresh);
  const [filter, setFilter] = useState<DrawFilter>({});
  const [showCount, setShowCount] = useState(20);

  // Calcul des stats sur l'ensemble des tirages
  const { main: mainStats, stars: starStats } = useMemo(
    () => computeEuroStats(draws),
    [draws]
  );

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
          <span className="text-3xl">⭐</span>
          <h1 className="text-3xl font-bold text-white">EuroMillions</h1>
        </div>
        <p className="text-sm text-white/40">
          {total > 0 ? `${total} tirages analysés` : "Chargement..."}{" "}
          {lastUpdated && (
            <span>· mis à jour {new Date(lastUpdated).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
          )}
          {isUpdating ? (
            <span className="ml-3 text-xs text-amber-400/70 animate-pulse">⟳ Récupération des nouveaux tirages…</span>
          ) : (
            <>
              {lastResult && lastResult.addedEuro > 0 && (
                <span className="ml-3 text-xs text-green-400/70">+{lastResult.addedEuro} tirage{lastResult.addedEuro > 1 ? "s" : ""} ajouté{lastResult.addedEuro > 1 ? "s" : ""}</span>
              )}
              <button
                onClick={() => triggerUpdate()}
                className="ml-3 text-xs text-white/20 underline underline-offset-2 hover:text-white/50"
              >
                Actualiser
              </button>
            </>
          )}
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
          📊 Données : CSV FDJ 2004–2024 · loterieplus.com juil. 2024–présent · FDJ direct (derniers tirages).
          Couverture complète sur {total} tirages EuroMillions.
        </div>
      )}

      {/* Dernier tirage */}
      {!isLoading && draws.length > 0 && (
        <section className="rounded-3xl border border-euro-primary/20 bg-gradient-to-br from-euro-primary/5 to-surface-card p-6">
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-euro-primary/70">
            Dernier tirage
          </p>
          <p className="mb-4 text-sm text-white/40">
            {new Date(draws[0].date).toLocaleDateString("fr-FR", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
          <BallGroup
            numbers={draws[0].numbers}
            extra={draws[0].stars}
            extraType="star"
            size="lg"
            animate
          />
        </section>
      )}

      {/* Grilles de suggestion */}
      {!isLoading && mainStats.totalDraws > 0 && (
        <SuggestionGridPanel
          game="euromillions"
          mainStats={mainStats}
          extraStats={starStats}
        />
      )}

      {/* Statistiques */}
      {!isLoading && mainStats.totalDraws > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Statistiques</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <StatisticsPanel
              stats={mainStats}
              title="Boules (1–50)"
              accentColor="#2563EB"
              maxNumber={50}
              ballType="main"
            />
            <StatisticsPanel
              stats={starStats}
              title="Étoiles (1–12)"
              accentColor="#FBBF24"
              maxNumber={12}
              ballType="star"
            />
          </div>
        </section>
      )}

      {/* Historique */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Historique des tirages</h2>

        <FilterPanel filter={filter} onChange={setFilter} maxNumber={50} />

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
                    <EuroDrawCard
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
