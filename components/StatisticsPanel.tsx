"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NumberFrequencyChart } from "./NumberFrequencyChart";
import { LotteryBall } from "./LotteryBall";
import type { DrawStats } from "@/lib/types";

type Tab = "frequence" | "chauds" | "froids" | "ecart";

interface StatisticsPanelProps {
  stats: DrawStats;
  title: string;
  accentColor?: string;
  maxNumber: number;
  ballType?: "main" | "chance" | "star";
}

/** Panneau d'onglets pour les statistiques d'un ensemble de numéros */
export function StatisticsPanel({
  stats,
  title,
  accentColor = "#6366f1",
  ballType = "main",
}: StatisticsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("frequence");

  const tabs: { id: Tab; label: string }[] = [
    { id: "frequence", label: "Fréquence" },
    { id: "chauds", label: "🔥 Chauds" },
    { id: "froids", label: "❄️ Froids" },
    { id: "ecart", label: "Écart" },
  ];

  // Tri par écart décroissant pour l'onglet Écart
  const byGap = [...stats.numberStats].sort((a, b) => b.gap - a.gap).slice(0, 15);

  return (
    <div className="rounded-2xl border border-white/5 bg-surface-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-white">{title}</h3>
        <span className="text-xs text-white/30">{stats.totalDraws} tirages analysés</span>
      </div>

      {/* Onglets */}
      <div className="mb-5 flex gap-1 rounded-lg bg-surface-elevated p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.id ? "text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId={`tab-${title}`}
                className="absolute inset-0 rounded-md bg-white/10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "frequence" && (
            <NumberFrequencyChart
              stats={stats.numberStats}
              hotNumbers={stats.hotNumbers}
              coldNumbers={stats.coldNumbers}
              color={accentColor}
            />
          )}

          {activeTab === "chauds" && (
            <div>
              <p className="mb-3 text-xs text-white/40">Numéros sortis le plus souvent</p>
              <div className="flex flex-wrap gap-2">
                {stats.hotNumbers.map((n, i) => (
                  <div key={n} className="flex flex-col items-center gap-1">
                    <LotteryBall number={n} type={ballType} size="md" animate delay={i * 0.05} />
                    <span className="text-xs text-white/30">
                      {stats.numberStats.find((s) => s.number === n)?.count}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "froids" && (
            <div>
              <p className="mb-3 text-xs text-white/40">Numéros sortis le moins souvent</p>
              <div className="flex flex-wrap gap-2">
                {stats.coldNumbers.map((n, i) => (
                  <div key={n} className="flex flex-col items-center gap-1">
                    <LotteryBall number={n} type={ballType} size="md" animate delay={i * 0.05} />
                    <span className="text-xs text-white/30">
                      {stats.numberStats.find((s) => s.number === n)?.count}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "ecart" && (
            <div>
              <p className="mb-3 text-xs text-white/40">Numéros absents depuis le plus de tirages</p>
              <div className="flex flex-wrap gap-2">
                {byGap.map((s, i) => (
                  <div key={s.number} className="flex flex-col items-center gap-1">
                    <LotteryBall number={s.number} type={ballType} size="md" animate delay={i * 0.04} />
                    <span className="text-xs text-white/30">−{s.gap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Moyenne */}
      <div className="mt-4 rounded-lg bg-surface-elevated px-4 py-2.5">
        <span className="text-xs text-white/40">Somme moyenne par tirage : </span>
        <span className="text-sm font-semibold text-white">
          {stats.averageNumbers.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
