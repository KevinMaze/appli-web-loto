import { useState, useEffect, useCallback } from "react";

interface SupplementStatus {
  generatedAt: string;
  today: string;
  loto: { lastDate: string | null; ageDays: number; stale: boolean };
  euro: { lastDate: string | null; ageDays: number; stale: boolean };
  needsUpdate: boolean;
}

interface UpdateResult {
  ok: boolean;
  addedLoto: number;
  addedEuro: number;
  lastLotoDate: string;
  lastEuroDate: string;
  message: string;
}

/**
 * Hook qui vérifie la fraîcheur du supplément au montage et lance une mise à jour
 * automatique si les données sont périmées.
 *
 * onUpdateDone est appelé après une mise à jour réussie pour permettre au parent
 * de recharger ses données SWR.
 */
export function useAutoRefresh(onUpdateDone?: () => void) {
  const [status, setStatus] = useState<SupplementStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastResult, setLastResult] = useState<UpdateResult | null>(null);

  const triggerUpdate = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/update-supplement", { method: "POST" });
      if (!res.ok) return;
      const result: UpdateResult = await res.json();
      setLastResult(result);
      if ((result.addedLoto > 0 || result.addedEuro > 0) && onUpdateDone) {
        onUpdateDone();
      }
    } catch {
      // Silencieux — la mise à jour est best-effort
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, onUpdateDone]);

  // Vérifie le statut au montage puis lance une mise à jour si nécessaire
  useEffect(() => {
    let cancelled = false;

    async function checkAndRefresh() {
      try {
        const res = await fetch("/api/update-supplement");
        if (!res.ok || cancelled) return;
        const s: SupplementStatus = await res.json();
        if (!cancelled) {
          setStatus(s);
          if (s.needsUpdate) {
            triggerUpdate();
          }
        }
      } catch {
        // Ignoré
      }
    }

    checkAndRefresh();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, isUpdating, lastResult, triggerUpdate };
}
