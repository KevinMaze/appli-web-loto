"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const links = [
  { href: "/loto", label: "Loto", emoji: "🎱" },
  { href: "/euromillions", label: "EuroMillions", emoji: "⭐" },
];

/** Barre de navigation principale avec indicateur de page active animé */
export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">
            Loto<span className="text-blue-400">Stats</span>
          </span>
        </Link>

        {/* Liens de navigation */}
        <div className="flex items-center gap-1 rounded-xl bg-surface-elevated p-1">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} className="relative">
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span
                  className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? "text-white" : "text-white/50 hover:text-white/80"
                  }`}
                >
                  <span>{link.emoji}</span>
                  <span className="hidden sm:inline">{link.label}</span>
                </span>
              </Link>
            );
          })}
        </div>

        {/* Bouton futur "Mon Compte" */}
        <button
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/50 transition hover:border-white/20 hover:text-white/80"
          title="Fonctionnalité à venir"
        >
          Connexion
        </button>
      </div>
    </nav>
  );
}
