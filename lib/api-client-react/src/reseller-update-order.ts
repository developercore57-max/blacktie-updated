import { useMutation } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type UpdateOrderItemRequest = {
  itemType: string;
  referenceId: number;
  name: string;
  unitPriceExclVat: number;
  unitPriceInclVat: number;
  quantity: number;
};

export type UpdateOrderRequest = {
  clientId?: number | null;
  notes?: string;
  items?: UpdateOrderItemRequest[];
};

export function useResellerUpdateOrder() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOrderRequest }) =>
      customFetch<{ id: number; status: string; clientId?: number; notes?: string }>(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}
