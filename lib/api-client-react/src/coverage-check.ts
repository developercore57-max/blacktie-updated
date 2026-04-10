import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type CoverageCheckStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type CoverageServiceType = "fibre" | "lte" | "other";

export type CoverageCheckRequest = {
  id: number;
  resellerId: number;
  clientId?: number | null;
  serviceType: CoverageServiceType | string;
  address: string;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  status: CoverageCheckStatus | string;
  createdAt: string;
  updatedAt: string;
};

export type CoverageCheckComment = {
  id: number;
  requestId: number;
  authorRole: "admin" | "reseller";
  message: string;
  createdAt: string;
};

export function useResellerGetCoverageRequests(): UseQueryResult<CoverageCheckRequest[], Error> {
  return useQuery({
    queryKey: ["/api/coverage/requests"],
    queryFn: () => customFetch<CoverageCheckRequest[]>("/api/coverage/requests"),
  });
}

export function useResellerCreateCoverageRequest(): UseMutationResult<
  CoverageCheckRequest,
  Error,
  { data: Omit<CoverageCheckRequest, "id" | "resellerId" | "status" | "createdAt" | "updatedAt"> & { status?: never } }
> {
  return useMutation({
    mutationFn: ({ data }) =>
      customFetch<CoverageCheckRequest>("/api/coverage/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useResellerGetCoverageRequest(id: number, enabled = true): UseQueryResult<any, Error> {
  return useQuery({
    queryKey: [`/api/coverage/requests/${id}`],
    queryFn: () => customFetch<any>(`/api/coverage/requests/${id}`),
    enabled: enabled && !!id,
  });
}

export function useResellerGetCoverageComments(id: number, enabled = true): UseQueryResult<CoverageCheckComment[], Error> {
  return useQuery({
    queryKey: [`/api/coverage/requests/${id}/comments`],
    queryFn: () => customFetch<CoverageCheckComment[]>(`/api/coverage/requests/${id}/comments`),
    enabled: enabled && !!id,
  });
}

export function useResellerPostCoverageComment(): UseMutationResult<
  CoverageCheckComment,
  Error,
  { id: number; data: { message: string } }
> {
  return useMutation({
    mutationFn: ({ id, data }) =>
      customFetch<CoverageCheckComment>(`/api/coverage/requests/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useAdminGetCoverageRequests(): UseQueryResult<CoverageCheckRequest[], Error> {
  return useQuery({
    queryKey: ["/api/admin/coverage/requests"],
    queryFn: () => customFetch<CoverageCheckRequest[]>("/api/admin/coverage/requests"),
  });
}

export function useAdminGetCoverageComments(id: number, enabled = true): UseQueryResult<CoverageCheckComment[], Error> {
  return useQuery({
    queryKey: [`/api/admin/coverage/requests/${id}/comments`],
    queryFn: () => customFetch<CoverageCheckComment[]>(`/api/admin/coverage/requests/${id}/comments`),
    enabled: enabled && !!id,
  });
}

export function useAdminPostCoverageComment(): UseMutationResult<
  CoverageCheckComment,
  Error,
  { id: number; data: { message: string } }
> {
  return useMutation({
    mutationFn: ({ id, data }) =>
      customFetch<CoverageCheckComment>(`/api/admin/coverage/requests/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useAdminUpdateCoverageStatus(): UseMutationResult<
  CoverageCheckRequest,
  Error,
  { id: number; data: { status: string } }
> {
  return useMutation({
    mutationFn: ({ id, data }) =>
      customFetch<CoverageCheckRequest>(`/api/admin/coverage/requests/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useAdminDeleteCoverageRequest(): UseMutationResult<void, Error, { id: number }> {
  return useMutation({
    mutationFn: ({ id }) =>
      customFetch<void>(`/api/admin/coverage/requests/${id}`, { method: "DELETE" }),
  });
}

