"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DrawFilter } from "@/lib/types";

interface FilterPanelProps {
  filter: DrawFilter;
  onChange: (filter: DrawFilter) => void;
  maxNumber: number;
}

/**
 * Panneau de filtres de recherche pour les tirages historiques.
 * Permet de filtrer par plage de dates et par présence de numéros.
 */
export function FilterPanel({ filter, onChange, maxNumber }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [numberInput, setNumberInput] = useState("");

  const activeFiltersCount =
    (filter.dateFrom ? 1 : 0) +
    (filter.dateTo ? 1 : 0) +
    (filter.includeNumbers?.length ?? 0);

  function handleAddNumber() {
    const n = parseInt(numberInput.trim());
    if (isNaN(n) || n < 1 || n > maxNumber) return;
    const current = filter.includeNumbers ?? [];
    if (!current.includes(n)) {
      onChange({ ...filter, includeNumbers: [...current, n].sort((a, b) => a - b) });
    }
    setNumberInput("");
  }

  function handleRemoveNumber(n: number) {
    onChange({
      ...filter,
      includeNumbers: filter.includeNumbers?.filter((x) => x !== n),
    });
  }

  function handleReset() {
    onChange({});
    setNumberInput("");
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-surface-card">
      {/* Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">Filtres de recherche</span>
          {activeFiltersCount > 0 && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/30"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-white/5 px-5 pb-5 pt-4">
              {/* Plage de dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs text-white/40">Depuis</label>
                  <input
                    type="date"
                    value={filter.dateFrom ?? ""}
                    onChange={(e) => onChange({ ...filter, dateFrom: e.target.value || undefined })}
                    className="w-full rounded-lg border border-white/10 bg-surface-elevated px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-white/40">Jusqu&apos;au</label>
                  <input
                    type="date"
                    value={filter.dateTo ?? ""}
                    onChange={(e) => onChange({ ...filter, dateTo: e.target.value || undefined })}
                    className="w-full rounded-lg border border-white/10 bg-surface-elevated px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                  />
                </div>
              </div>

              {/* Filtre par numéros */}
              <div>
                <label className="mb-1.5 block text-xs text-white/40">
                  Numéros à inclure (tirages contenant au moins 1)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={maxNumber}
                    value={numberInput}
                    onChange={(e) => setNumberInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddNumber()}
                    placeholder={`1-${maxNumber}`}
                    className="flex-1 rounded-lg border border-white/10 bg-surface-elevated px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                  />
                  <button
                    onClick={handleAddNumber}
                    className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                  >
                    Ajouter
                  </button>
                </div>

                {/* Tags des numéros sélectionnés */}
                {filter.includeNumbers && filter.includeNumbers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {filter.includeNumbers.map((n) => (
                      <button
                        key={n}
                        onClick={() => handleRemoveNumber(n)}
                        className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70 transition hover:bg-red-500/20 hover:text-red-300"
                      >
                        {n} ✕
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleReset}
                  className="text-xs text-white/30 underline underline-offset-2 transition hover:text-white/60"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
