import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { formatZar } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Package, Save } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import {
  useGetMyOrder,
  useResellerGetClients,
  getGetMyOrdersQueryKey,
  type Client,
  type OrderDetail,
  type OrderItem,
} from "@workspace/api-client-react";
import { useResellerUpdateOrder } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";

type OrderDetailExtended = OrderDetail & { clientId?: number; clientName?: string };

export default function ResellerOrderEdit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/reseller/orders/:id/edit");
  const id = parseInt(params?.id || "0", 10);

  const { data: detail, isLoading } = useGetMyOrder(id, { query: { enabled: !!id } });
  const { data: clients = [] } = useResellerGetClients();
  const updateOrder = useResellerUpdateOrder();

  const det = detail as OrderDetailExtended | undefined;
  const clientList = clients as Client[];
  const editable = ["pending", "new"].includes((det?.status || "").toLowerCase());

  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (det && !initialized) {
      setSelectedClientId(det.clientId ? String(det.clientId) : "");
      setNotes(det.notes ?? "");
      setInitialized(true);
    }
  }, [det, initialized]);

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateOrder.mutateAsync({
        id,
        data: {
          clientId: selectedClientId ? parseInt(selectedClientId, 10) : null,
          notes,
        },
      });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
      queryClient.invalidateQueries({ queryKey: getGetMyOrdersQueryKey() });
      toast({ title: "Order updated", description: "Your changes have been saved." });
      setLocation(`/reseller/orders/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Failed to save", description: msg, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AppLayout role="reseller" title="Edit Order">
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!det) {
    return (
      <AppLayout role="reseller" title="Edit Order">
        <div className="py-16 text-center text-muted-foreground">Order not found.</div>
      </AppLayout>
    );
  }

  if (!editable) {
    return (
      <AppLayout role="reseller" title="Edit Order">
        <div className="max-w-xl mx-auto py-16 text-center">
          <p className="text-lg font-semibold mb-2">Order cannot be edited</p>
          <p className="text-sm text-muted-foreground mb-6">
            This order is <span className="font-medium capitalize">{det.status}</span> and can no longer be modified.
          </p>
          <Link
            href={`/reseller/orders/${id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-secondary transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Order
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="reseller" title={`Edit Order #${id}`}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Back link */}
        <Link
          href={`/reseller/orders/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Order #{id}
        </Link>

        {/* Header */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Editing</p>
              <h2 className="text-xl font-bold">Order #{id}</h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium">{det.createdAt ? format(new Date(det.createdAt), "dd MMM yyyy") : "—"}</p>
            </div>
          </div>
        </div>

        {/* Client */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <label className="block text-sm font-semibold">
            Client <span className="text-red-500">*</span>
          </label>
          {clientList.length === 0 ? (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              No clients yet.{" "}
              <Link href="/reseller/clients/new" className="font-bold underline hover:no-underline">
                Create a client first
              </Link>.
            </div>
          ) : (
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— select a client —</option>
              {clientList.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          )}
        </div>

        {/* Notes */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <label className="block text-sm font-semibold">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder="Add any notes for this order…"
          />
        </div>

        {/* Items (read-only) */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border/50 bg-muted/20">
            <p className="text-sm font-semibold">Order Items</p>
            <p className="text-xs text-muted-foreground mt-0.5">Items cannot be changed after placing an order.</p>
          </div>
          <div className="divide-y divide-border/50">
            {(det.items ?? ([] as OrderItem[])).map((item) => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.itemType?.replace(/-/g, " ")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatZar(Number(item.unitPriceInclVat ?? 0))}</p>
                  {item.qty > 1 && (
                    <p className="text-xs text-muted-foreground">× {item.qty}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-border/50 bg-muted/10 flex justify-between items-center">
            <span className="text-sm font-semibold text-muted-foreground">Total (incl VAT)</span>
            <span className="text-base font-bold">{formatZar(Number(det.totalInclVat ?? 0))}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link
            href={`/reseller/orders/${id}`}
            className="px-5 py-2.5 rounded-xl border border-border bg-background hover:bg-secondary text-sm font-semibold transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={updateOrder.isPending || !selectedClientId}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {updateOrder.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
