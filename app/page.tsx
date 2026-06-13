"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/** Page d'accueil : présentation des deux sections */
export default function HomePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      {/* Titre principal */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-white sm:text-6xl">
          Loto<span className="text-blue-400">Stats</span>
        </h1>
        <p className="mb-12 max-w-lg text-base text-white/50">
          Statistiques complètes, historique des tirages et grilles de suggestion
          intelligentes pour le Loto et l&apos;EuroMillions. Données officielles FDJ.
        </p>
      </motion.div>

      {/* Deux cartes d'entrée */}
      <div className="grid w-full max-w-2xl gap-5 sm:grid-cols-2">
        {/* Loto */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Link href="/loto">
            <div className="group relative overflow-hidden rounded-3xl border border-loto-primary/20 bg-gradient-to-br from-loto-primary/10 to-surface-card p-8 text-left transition-all hover:border-loto-primary/40 hover:shadow-[0_0_40px_rgba(230,57,70,0.15)]">
              {/* Cercle décoratif */}
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-loto-primary/10 blur-xl transition-all group-hover:bg-loto-primary/20" />

              <div className="relative">
                <span className="mb-4 block text-4xl">🎱</span>
                <h2 className="mb-2 text-2xl font-bold text-white">Loto</h2>
                <p className="text-sm text-white/40">
                  5 boules + numéro chance · 3x/semaine
                </p>
                <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-loto-primary">
                  Explorer
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* EuroMillions */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Link href="/euromillions">
            <div className="group relative overflow-hidden rounded-3xl border border-euro-primary/20 bg-gradient-to-br from-euro-primary/10 to-surface-card p-8 text-left transition-all hover:border-euro-primary/40 hover:shadow-[0_0_40px_rgba(37,99,235,0.15)]">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-euro-primary/10 blur-xl transition-all group-hover:bg-euro-primary/20" />

              <div className="relative">
                <span className="mb-4 block text-4xl">⭐</span>
                <h2 className="mb-2 text-2xl font-bold text-white">EuroMillions</h2>
                <p className="text-sm text-white/40">
                  5 boules + 2 étoiles · Mar & Ven
                </p>
                <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-euro-primary">
                  Explorer
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Features rapides */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-16 grid grid-cols-2 gap-4 text-sm text-white/30 sm:grid-cols-4"
      >
        {[
          { icon: "📊", label: "Statistiques complètes" },
          { icon: "🔥", label: "Numéros chauds & froids" },
          { icon: "🎯", label: "Grilles de suggestion" },
          { icon: "🔍", label: "Filtres avancés" },
        ].map((f) => (
          <div key={f.label} className="flex flex-col items-center gap-2">
            <span className="text-2xl">{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
