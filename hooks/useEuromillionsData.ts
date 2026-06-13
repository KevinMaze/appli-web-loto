import useSWR from "swr";
import type { EuroDraw } from "@/lib/types";

interface EuroApiResponse {
  draws: EuroDraw[];
  total: number;
  lastUpdated: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Hook SWR pour les données EuroMillions.
 * Tirages mardi et vendredi → rafraîchissement horaire suffisant.
 */
export function useEuromillionsData() {
  const { data, error, isLoading, mutate } = useSWR<EuroApiResponse>(
    "/api/euromillions",
    fetcher,
    {
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
