import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type NumberPortingStatus = "pending" | "in_progress" | "approved" | "completed" | "rejected";

export type NumberPortingRequest = {
  id: number;
  resellerId: number;
  resellerName?: string;
  resellerEmail?: string;
  clientId?: number | null;
  portingNumbers: string;
  currentProvider: string;
  accountNumber?: string | null;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  portingDate?: string | null;
  notes?: string | null;
  adminNotes?: string | null;
  attachments?: string | null;
  status: NumberPortingStatus | string;
  createdAt: string;
  updatedAt: string;
};

// ── Reseller hooks ──────────────────────────────────────────────────────────

export function useResellerGetPortingRequests(): UseQueryResult<NumberPortingRequest[], Error> {
  return useQuery({
    queryKey: ["/api/reseller/number-porting"],
    queryFn: () => customFetch<NumberPortingRequest[]>("/api/reseller/number-porting"),
  });
}

export function useResellerCreatePortingRequest(): UseMutationResult<
  NumberPortingRequest,
  Error,
  { data: Omit<NumberPortingRequest, "id" | "resellerId" | "status" | "createdAt" | "updatedAt" | "resellerName" | "resellerEmail" | "adminNotes"> }
> {
  return useMutation({
    mutationFn: ({ data }) =>
      customFetch<NumberPortingRequest>("/api/reseller/number-porting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

// ── Admin hooks ─────────────────────────────────────────────────────────────

export function useAdminGetPortingRequests(): UseQueryResult<NumberPortingRequest[], Error> {
  return useQuery({
    queryKey: ["/api/admin/number-porting"],
    queryFn: () => customFetch<NumberPortingRequest[]>("/api/admin/number-porting"),
  });
}

export function useAdminUpdatePortingRequest(): UseMutationResult<
  NumberPortingRequest,
  Error,
  { id: number; data: { status?: string; adminNotes?: string } }
> {
  return useMutation({
    mutationFn: ({ id, data }) =>
      customFetch<NumberPortingRequest>(`/api/admin/number-porting/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}
