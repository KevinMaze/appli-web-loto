"use client";

import { motion } from "framer-motion";

interface LotteryBallProps {
  number: number;
  type: "main" | "chance" | "star";
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  delay?: number;
}

const sizeClasses = {
  sm: "h-8 w-8 text-sm",
  md: "h-11 w-11 text-base",
  lg: "h-14 w-14 text-lg",
};

/** Couleurs selon le type de boule */
const typeStyles = {
  main: "bg-gradient-to-br from-white/20 to-white/5 text-white border border-white/20",
  chance: "bg-gradient-to-br from-amber-400/30 to-amber-600/20 text-amber-300 border border-amber-400/40",
  star: "bg-gradient-to-br from-blue-400/30 to-blue-600/20 text-blue-300 border border-blue-400/40",
};

/**
 * Boule de loterie animée avec effet de reveal au chargement.
 * Le type "star" représente les étoiles EuroMillions (forme losange).
 */
export function LotteryBall({
  number,
  type,
  size = "md",
  animate = true,
  delay = 0,
}: LotteryBallProps) {
  const isStar = type === "star";

  return (
    <motion.div
      initial={animate ? { scale: 0, opacity: 0, rotate: -180 } : false}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay,
      }}
      className={`
        flex items-center justify-center font-bold
        ${sizeClasses[size]}
        ${typeStyles[type]}
        ${isStar ? "rotate-45" : "rounded-full"}
        shadow-lg backdrop-blur-sm
      `}
    >
      <span className={isStar ? "-rotate-45" : ""}>{number}</span>
    </motion.div>
  );
}

/** Affiche un groupe de boules pour un tirage */
export function BallGroup({
  numbers,
  extra,
  extraType = "chance",
  size = "md",
  animate = true,
}: {
  numbers: number[];
  extra?: number[];
  extraType?: "chance" | "star";
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {numbers.map((n, i) => (
        <LotteryBall
          key={n}
          number={n}
          type="main"
          size={size}
          animate={animate}
          delay={i * 0.08}
        />
      ))}
      {extra && extra.length > 0 && (
        <>
          <span className="text-white/20">·</span>
          {extra.map((n, i) => (
            <LotteryBall
              key={`extra-${n}`}
              number={n}
              type={extraType}
              size={size}
              animate={animate}
              delay={(numbers.length + i) * 0.08}
            />
          ))}
        </>
      )}
    </div>
  );
}
