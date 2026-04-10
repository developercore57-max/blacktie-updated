import { useMutation } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export function useResellerCancelOrder() {
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      customFetch<{ id: number; status: string }>(`/api/orders/${id}/cancel`, {
        method: "POST",
      }),
  });
}
