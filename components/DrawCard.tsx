"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BallGroup } from "./LotteryBall";
import type { LotoDraw, EuroDraw } from "@/lib/types";

interface LotoDrawCardProps {
  draw: LotoDraw;
  index: number;
  isLatest?: boolean;
}

interface EuroDrawCardProps {
  draw: EuroDraw;
  index: number;
  isLatest?: boolean;
}

function formatDate(isoDate: string): string {
  try {
    return format(new Date(isoDate), "EEEE d MMMM yyyy", { locale: fr });
  } catch {
    return isoDate;
  }
}

/** Carte d'un tirage Loto */
export function LotoDrawCard({ draw, index, isLatest }: LotoDrawCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      className={`relative rounded-2xl border p-5 transition-all hover:border-white/15 ${
        isLatest
          ? "border-loto-primary/40 bg-gradient-to-br from-loto-primary/10 to-surface-card"
          : "border-white/5 bg-surface-card"
      }`}
    >
      {isLatest && (
        <span className="absolute right-4 top-4 rounded-full bg-loto-primary/20 px-2.5 py-0.5 text-xs font-semibold text-loto-primary">
          Dernier tirage
        </span>
      )}

      <p className="mb-3 text-xs capitalize text-white/40">{formatDate(draw.date)}</p>

      <BallGroup
        numbers={draw.numbers}
        extra={[draw.chance]}
        extraType="chance"
        size="sm"
        animate={isLatest}
      />
    </motion.div>
  );
}

/** Carte d'un tirage EuroMillions */
export function EuroDrawCard({ draw, index, isLatest }: EuroDrawCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      className={`relative rounded-2xl border p-5 transition-all hover:border-white/15 ${
        isLatest
          ? "border-euro-primary/40 bg-gradient-to-br from-euro-primary/10 to-surface-card"
          : "border-white/5 bg-surface-card"
      }`}
    >
      {isLatest && (
        <span className="absolute right-4 top-4 rounded-full bg-euro-primary/20 px-2.5 py-0.5 text-xs font-semibold text-euro-primary">
          Dernier tirage
        </span>
      )}

      <p className="mb-3 text-xs capitalize text-white/40">{formatDate(draw.date)}</p>

      <BallGroup
        numbers={draw.numbers}
        extra={draw.stars}
        extraType="star"
        size="sm"
        animate={isLatest}
      />
    </motion.div>
  );
}
