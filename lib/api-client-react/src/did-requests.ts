import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type DidRequestStatus = "pending" | "approved" | "rejected";

export type DidRequest = {
  id: number;
  resellerId: number;
  resellerName?: string | null;
  resellerEmail?: string | null;
  areaCodeId: number;
  areaCode?: string | null;
  region?: string | null;
  quantity: number;
  didIds?: string | null;
  status: DidRequestStatus | string;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── Admin hooks ─────────────────────────────────────────────────────────────

export function useAdminGetDidRequests(): UseQueryResult<DidRequest[], Error> {
  return useQuery({
    queryKey: ["/api/admin/did-requests"],
    queryFn: () => customFetch<DidRequest[]>("/api/admin/did-requests"),
  });
}

export function useAdminUpdateDidRequest(): UseMutationResult<
  DidRequest,
  Error,
  { id: number; data: { status?: string; adminNotes?: string } }
> {
  return useMutation({
    mutationFn: ({ id, data }) =>
      customFetch<DidRequest>(`/api/admin/did-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useAdminDeleteDidRequest(): UseMutationResult<void, Error, { id: number }> {
  return useMutation({
    mutationFn: ({ id }) =>
      customFetch<void>(`/api/admin/did-requests/${id}`, { method: "DELETE" }),
  });
}
