import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type CatalogMinuteBundle = {
  id: number;
  name: string;
  description?: string | null;
  minutes: number;
  retailPriceExclVat?: number | null;
  resellerPriceExclVat?: number | null;
  resellerPriceInclVat?: number | null;
  priceInclVat?: number | null;
  status: "active" | "inactive";
  sortOrder: number;
  createdAt: string;
};

export function useGetCatalogMinuteBundles(options?: {
  query?: { enabled?: boolean; staleTime?: number; refetchInterval?: number; refetchOnWindowFocus?: boolean };
}): UseQueryResult<CatalogMinuteBundle[], Error> {
  return useQuery<CatalogMinuteBundle[], Error>({
    queryKey: ["/api/catalog/minute-bundles"],
    queryFn: () => customFetch<CatalogMinuteBundle[]>("/api/catalog/minute-bundles"),
    ...(options?.query ? { ...options.query } : {}),
  });
}
