import { useMutation } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type ActivateOrderResponse = {
  id: number;
  resellerId: number;
  clientId: number;
  clientName?: string;
  status: string;
  totalExclVat: number;
  totalInclVat: number;
  createdAt: string;
  updatedAt: string;
};

export function useResellerActivateOrder() {
  return useMutation({
    mutationFn: ({ id, clientId }: { id: number; clientId: number }) =>
      customFetch<ActivateOrderResponse>(`/api/orders/${id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      }),
  });
}
