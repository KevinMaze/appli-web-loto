import useSWR from "swr";
import type { LotoDraw } from "@/lib/types";

interface LotoApiResponse {
  draws: LotoDraw[];
  total: number;
  lastUpdated: string;
}

/** Fetcher générique SWR */
const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Hook SWR pour les données Loto.
 * Rafraîchit automatiquement toutes les heures.
 */
export function useLotoData() {
  const { data, error, isLoading, mutate } = useSWR<LotoApiResponse>(
    "/api/loto",
    fetcher,
    {
      // Rafraîchit toutes les heures (les tirages sont 3x/semaine)
      refreshInterval: 60 * 60 * 1000,
      revalidateOnFocus: false,
      dedupingInterval: 30 * 60 * 1000,
    }
  );

  return {
    draws: data?.draws ?? [],
    total: data?.total ?? 0,
    lastUpdated: data?.lastUpdated,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
