import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type AdminCreateOrderItemRequest = {
  itemType?: string;
  referenceId?: number | null;
  name: string;
  sku?: string | null;
  quantity?: number;
  unitPriceExclVat: number;
  unitPriceInclVat?: number;
};

export type AdminCreateOrderRequest = {
  resellerId: number;
  clientId?: number | null;
  notes?: string | null;
  adminNotes?: string | null;
  items: AdminCreateOrderItemRequest[];
};

export type AdminCreateOrderResponse = {
  id: number;
  resellerId: number;
  resellerName?: string;
  resellerEmail?: string;
  status: string;
  notes?: string | null;
  adminNotes?: string | null;
  totalExclVat: number;
  totalInclVat: number;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: number;
    orderId: number;
    itemType: string;
    referenceId?: number | null;
    name: string;
    sku?: string | null;
    quantity: number;
    unitPriceExclVat: number;
    unitPriceInclVat: number;
    lineTotal: number;
    createdAt: string;
  }>;
};

export function useAdminCreateOrder(): UseMutationResult<
  AdminCreateOrderResponse,
  Error,
  { data: AdminCreateOrderRequest }
> {
  return useMutation({
    mutationFn: ({ data }) =>
      customFetch<AdminCreateOrderResponse>("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}
