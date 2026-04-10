import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type OrderComment = {
  id: number;
  orderId: number;
  authorRole: "admin" | "reseller";
  kind: string;
  message: string;
  createdAt: string;
};

export function useResellerGetOrderComments(
  id: number,
  options?: { query?: { enabled?: boolean; staleTime?: number; refetchInterval?: number; refetchOnWindowFocus?: boolean } },
): UseQueryResult<OrderComment[], Error> {
  return useQuery<OrderComment[], Error>({
    queryKey: [`/api/orders/${id}/comments`],
    queryFn: () => customFetch<OrderComment[]>(`/api/orders/${id}/comments`),
    enabled: options?.query?.enabled ?? !!id,
    ...(options?.query ? { ...options.query } : {}),
  });
}

export function useResellerPostOrderComment(): UseMutationResult<
  OrderComment,
  Error,
  { id: number; data: { message: string } }
> {
  return useMutation({
    mutationFn: ({ id, data }) =>
      customFetch<OrderComment>(`/api/orders/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useAdminGetOrderComments(
  id: number,
  options?: { query?: { enabled?: boolean; staleTime?: number; refetchInterval?: number; refetchOnWindowFocus?: boolean } },
): UseQueryResult<OrderComment[], Error> {
  return useQuery<OrderComment[], Error>({
    queryKey: [`/api/admin/orders/${id}/comments`],
    queryFn: () => customFetch<OrderComment[]>(`/api/admin/orders/${id}/comments`),
    enabled: options?.query?.enabled ?? !!id,
    ...(options?.query ? { ...options.query } : {}),
  });
}

export function useAdminPostOrderComment(): UseMutationResult<
  OrderComment,
  Error,
  { id: number; data: { message: string; kind?: string } }
> {
  return useMutation({
    mutationFn: ({ id, data }) =>
      customFetch<OrderComment>(`/api/admin/orders/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}
