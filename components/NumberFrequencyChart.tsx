"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { NumberStat } from "@/lib/types";

interface NumberFrequencyChartProps {
  stats: NumberStat[];
  hotNumbers: number[];
  coldNumbers: number[];
  color?: string;
  label?: string;
}

/** Tooltip personnalisé pour le graphique */
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: NumberStat }> }) {
  if (!active || !payload || !payload[0]) return null;
  const s = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-surface-elevated px-3 py-2 shadow-xl">
      <p className="text-sm font-bold text-white">Numéro {s.number}</p>
      <p className="text-xs text-white/60">Sorties : <span className="text-white">{s.count}</span></p>
      <p className="text-xs text-white/60">Fréquence : <span className="text-white">{s.frequency.toFixed(1)}%</span></p>
      <p className="text-xs text-white/60">Écart : <span className="text-white">{s.gap} tirages</span></p>
    </div>
  );
}

/**
 * Graphique à barres de la fréquence de sortie de chaque numéro.
 * Les numéros chauds apparaissent en rouge/orange, les froids en bleu.
 */
export function NumberFrequencyChart({
  stats,
  hotNumbers,
  coldNumbers,
  color = "#6366f1",
  label = "Fréquence des numéros",
}: NumberFrequencyChartProps) {
  if (stats.length === 0) return null;

  return (
    <div className="w-full">
      <p className="mb-3 text-sm font-medium text-white/60">{label}</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={stats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="number"
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            // Affiche 1 tick sur 5 pour éviter la surcharge
            tickFormatter={(v) => (v % 5 === 0 ? String(v) : "")}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {stats.map((entry) => {
              let fill = color;
              if (hotNumbers.includes(entry.number)) fill = "#ef4444";
              else if (coldNumbers.includes(entry.number)) fill = "#3b82f6";
              return <Cell key={entry.number} fill={fill} fillOpacity={0.8} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Légende */}
      <div className="mt-2 flex items-center gap-4 text-xs text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          Chaud (top 10)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          Froid (bottom 10)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          Neutre
        </span>
      </div>
    </div>
  );
}
