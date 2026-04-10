import { AppLayout } from "@/components/layout/AppLayout";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { formatZar } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, Eye, Lock, MessageSquare, Pencil, ShoppingCart, Trash2, X, Zap } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useGetMyOrders, type Order, type Client, useResellerGetClients, getGetMyOrdersQueryKey } from "@workspace/api-client-react";
import { useResellerPostOrderComment, useResellerActivateOrder, useResellerCancelOrder } from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { format } from "date-fns";

type OrderWithClient = Order & { clientId?: number; clientName?: string };

export default function ResellerMyOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: orders = [], isLoading } = useGetMyOrders({ query: { staleTime: 10_000 } });
  const { data: clients = [] } = useResellerGetClients();
  const postComment = useResellerPostOrderComment();
  const activateOrder = useResellerActivateOrder();
  const cancelOrder = useResellerCancelOrder();

  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const [activatingOrder, setActivatingOrder] = useState<{ id: number } | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const list = useMemo(() => (orders as OrderWithClient[]).slice(), [orders]);
  const clientList = clients as Client[];

  const statusStyle = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (s === "processing") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (s === "cancelled") return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-muted/30 text-muted-foreground border-border/60";
  };

  const isEditable = (status: string) => ["pending", "new"].includes((status || "").toLowerCase());

  const openRequest = (id: number) => {
    setRequestingId(id);
    setMessage("");
  };

  const submitRequest = async () => {
    if (!requestingId) return;
    if (!message.trim()) {
      toast({ title: "Message required", description: "Please enter a comment/request.", variant: "destructive" });
      return;
    }
    try {
      await postComment.mutateAsync({ id: requestingId, data: { message } });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${requestingId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${requestingId}/comments`] });
      toast({ title: "Sent", description: "Your request was sent to admin." });
      setRequestingId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Failed to send", description: msg, variant: "destructive" });
    }
  };

  const openActivate = (id: number) => {
    setActivatingOrder({ id });
    setSelectedClientId("");
  };

  const submitActivate = async () => {
    if (!activatingOrder) return;
    if (!selectedClientId) {
      toast({ title: "Select a client", description: "Please choose a client to activate this order for.", variant: "destructive" });
      return;
    }
    const clientId = parseInt(selectedClientId, 10);
    const client = clientList.find((c) => c.id === clientId);
    try {
      await activateOrder.mutateAsync({ id: activatingOrder.id, clientId });
      queryClient.invalidateQueries({ queryKey: getGetMyOrdersQueryKey() });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${activatingOrder.id}`] });
      toast({ title: "Order activated", description: `Services are now live for ${client?.companyName ?? "the client"}.` });
      setActivatingOrder(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Activation failed", description: msg, variant: "destructive" });
    }
  };

  const submitCancel = async () => {
    if (!cancellingId) return;
    try {
      await cancelOrder.mutateAsync({ id: cancellingId });
      queryClient.invalidateQueries({ queryKey: getGetMyOrdersQueryKey() });
      toast({ title: "Order cancelled", description: `Order #${cancellingId} has been cancelled.` });
      setCancellingId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Cancellation failed", description: msg, variant: "destructive" });
    }
  };

  return (
    <AppLayout role="reseller" title="My Orders">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-muted-foreground">{list.length} orders</div>
        <Link
          href="/reseller/orders/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all"
        >
          <ShoppingCart className="w-4 h-4" /> New Order
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg font-semibold text-muted-foreground">No orders yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1 mb-6">Place your first order to see it here.</p>
          <button
            onClick={() => setLocation("/reseller/orders/new")}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold"
          >
            <ShoppingCart className="w-4 h-4" /> Create Order
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Order</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Total (incl VAT)</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((o, idx) => {
                const isCompleted = o.status === "completed";
                const hasClient = !!o.clientId;
                const editable = isEditable(o.status);
                const locked = !editable && o.status !== "cancelled";
                return (
                  <motion.tr
                    key={o.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="border-b border-border/40 hover:bg-muted/10 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold">#{o.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      {(o as OrderWithClient).clientName ? (
                        <span className="text-sm font-medium">{(o as OrderWithClient).clientName}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No client</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold border ${statusStyle(o.status)}`}>
                          {o.status}
                        </span>
                        {isCompleted && hasClient && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatZar(Number(o.totalInclVat ?? 0))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.createdAt ? format(new Date(o.createdAt), "dd MMM yyyy") : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/reseller/orders/${o.id}`}
                          className="p-2 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {editable && (
                          <Link
                            href={`/reseller/orders/${o.id}/edit`}
                            className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Edit order"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                        )}
                        {editable && (
                          <button
                            onClick={() => setCancellingId(o.id)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                            title="Cancel order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {locked && (
                          <span
                            className="p-2 rounded-lg text-muted-foreground/40 cursor-default"
                            title={`Order is ${o.status} — editing and cancellation not available`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {isCompleted && !hasClient && (
                          <button
                            onClick={() => openActivate(o.id)}
                            className="p-2 rounded-lg hover:bg-amber-500/10 text-amber-500 hover:text-amber-600 transition-colors"
                            title="Activate order — link to a client"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openRequest(o.id)}
                          className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title="Request update / comment"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Request Update Modal */}
      <Modal isOpen={!!requestingId} onClose={() => setRequestingId(null)} title="Request Update / Comment">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Your message will be visible to admin for this order.</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm min-h-28"
            placeholder="Type your request…"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRequestingId(null)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background text-sm font-semibold"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              type="button"
              onClick={submitRequest}
              disabled={postComment.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
            >
              <MessageSquare className="w-4 h-4" /> Send
            </button>
          </div>
        </div>
      </Modal>

      {/* Activate Order Modal */}
      <Modal isOpen={!!activatingOrder} onClose={() => setActivatingOrder(null)} title="Activate Order">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Select the client this order will provision services for.</p>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
          >
            <option value="">— Select a client —</option>
            {clientList.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
          {clientList.length === 0 && (
            <p className="text-xs text-amber-600">You have no clients yet. Add a client first.</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setActivatingOrder(null)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background text-sm font-semibold"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              type="button"
              onClick={submitActivate}
              disabled={activateOrder.isPending || !selectedClientId}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
            >
              <Zap className="w-4 h-4" /> Activate
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Order Confirmation Modal */}
      <Modal isOpen={!!cancellingId} onClose={() => setCancellingId(null)} title="Cancel Order">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel <span className="font-semibold text-foreground">Order #{cancellingId}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCancellingId(null)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background text-sm font-semibold"
            >
              <X className="w-4 h-4" /> Keep Order
            </button>
            <button
              type="button"
              onClick={submitCancel}
              disabled={cancelOrder.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" /> Cancel Order
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
