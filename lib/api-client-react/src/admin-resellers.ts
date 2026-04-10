import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type AdminResetResellerPasswordRequest = {
  password: string;
};

export type AdminResetResellerPasswordResponse = {
  success: boolean;
};

export function useAdminResetResellerPassword(): UseMutationResult<
  AdminResetResellerPasswordResponse,
  Error,
  { id: number; data: AdminResetResellerPasswordRequest }
> {
  return useMutation({
    mutationFn: ({ id, data }) =>
      customFetch<AdminResetResellerPasswordResponse>(`/api/admin/resellers/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

