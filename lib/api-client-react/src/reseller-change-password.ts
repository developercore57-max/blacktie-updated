import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type ResellerChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type ResellerChangePasswordResponse = {
  success: boolean;
};

export function useResellerChangePassword(): UseMutationResult<
  ResellerChangePasswordResponse,
  Error,
  { data: ResellerChangePasswordRequest }
> {
  return useMutation({
    mutationFn: ({ data }) =>
      customFetch<ResellerChangePasswordResponse>("/api/reseller/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

