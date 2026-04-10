import { useMutation, useQuery, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type MinuteBundleStatus = "active" | "inactive";

export type MinuteBundle = {
  id: number;
  name: string;
  description?: string | null;
  minutes: number;
  retailPriceExclVat?: number | null;
  resellerPriceExclVat?: number | null;
  resellerPriceInclVat?: number | null;
  priceInclVat?: number | null;
  status: MinuteBundleStatus;
  sortOrder: number;
  createdAt: string;
};

export type CreateMinuteBundleRequest = {
  name: string;
  description?: string | null;
  minutes: number;
  retailPriceExclVat?: number | null;
  resellerPriceExclVat?: number | null;
  resellerPriceInclVat?: number | null;
  priceInclVat?: number | null;
  status?: MinuteBundleStatus;
  sortOrder?: number;
};

export type UpdateMinuteBundleRequest = Partial<CreateMinuteBundleRequest>;

export function useAdminGetMinuteBundles(): UseQueryResult<MinuteBundle[], Error> {
  return useQuery({
    queryKey: ["/api/admin/minute-bundles"],
    queryFn: () => customFetch<MinuteBundle[]>("/api/admin/minute-bundles"),
  });
}

export function useAdminCreateMinuteBundle(): UseMutationResult<
  MinuteBundle,
  Error,
  { data: CreateMinuteBundleRequest }
> {
  return useMutation({
    mutationFn: ({ data }) =>
      customFetch<MinuteBundle>("/api/admin/minute-bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useAdminUpdateMinuteBundle(): UseMutationResult<
  MinuteBundle,
  Error,
  { id: number; data: UpdateMinuteBundleRequest }
> {
  return useMutation({
    mutationFn: ({ id, data }) =>
      customFetch<MinuteBundle>(`/api/admin/minute-bundles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useAdminDeleteMinuteBundle(): UseMutationResult<
  { success: boolean },
  Error,
  { id: number }
> {
  return useMutation({
    mutationFn: ({ id }) =>
      customFetch<{ success: boolean }>(`/api/admin/minute-bundles/${id}`, {
        method: "DELETE",
      }),
  });
}
