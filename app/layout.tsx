import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "LotoStats – Loto & EuroMillions",
  description:
    "Statistiques, historique et grilles de suggestion pour le Loto et l'EuroMillions. Données officielles FDJ, 100% gratuit.",
  keywords: ["loto", "euromillions", "statistiques", "fréquence", "numéros", "grille"],
  openGraph: {
    title: "LotoStats",
    description: "Statistiques complètes du Loto et EuroMillions",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-surface antialiased">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        <footer className="mt-16 border-t border-white/5 py-8 text-center text-xs text-white/20">
          Données issues des CSV ouverts FDJ / data.gouv.fr · 100% gratuit · Aucune IA
        </footer>
      </body>
    </html>
  );
}
