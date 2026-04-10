import { AppLayout } from "@/components/layout/AppLayout";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { formatZar } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, MessageSquare, Receipt, Send, X, Zap } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useGetMyOrder, useResellerGetClients, getGetMyOrdersQueryKey, type Client, type OrderDetail, type OrderItem } from "@workspace/api-client-react";
import { useResellerGetOrderComments, useResellerPostOrderComment, useResellerActivateOrder, type OrderComment } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useMemo, useState } from "react";

type OrderDetailExtended = OrderDetail & { clientId?: number; clientName?: string };

function orderRef(id: number) {
  return `ORD-${String(id).padStart(6, "0")}`;
}

export default function ResellerOrderView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/reseller/orders/:id");
  const id = parseInt(params?.id || "0", 10);

  const { data: detail, isLoading } = useGetMyOrder(id, { query: { enabled: !!id } });
  const { data: comments = [] } = useResellerGetOrderComments(id, { query: { enabled: !!id, staleTime: 0 } });
  const { data: clients = [] } = useResellerGetClients();
  const postComment = useResellerPostOrderComment();
  const activateOrder = useResellerActivateOrder();

  const [message, setMessage] = useState("");
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const list = useMemo(() => (comments as OrderComment[]).slice().reverse(), [comments]);

  const submit = async () => {
    if (!message.trim()) {
      toast({ title: "Message required", variant: "destructive" });
      return;
    }
    try {
      await postComment.mutateAsync({ id, data: { message } });
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
      toast({ title: "Sent", description: "Your message was sent to admin." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Failed to send", description: msg, variant: "destructive" });
    }
  };

  const clientList = clients as Client[];

  const submitActivate = async () => {
    if (!selectedClientId) {
      toast({ title: "Select a client", description: "Please choose a client to activate this order for.", variant: "destructive" });
      return;
    }
    const clientId = parseInt(selectedClientId, 10);
    const client = clientList.find((c) => c.id === clientId);
    try {
      await activateOrder.mutateAsync({ id, clientId });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
      queryClient.invalidateQueries({ queryKey: getGetMyOrdersQueryKey() });
      toast({ title: "Order activated", description: `Services are now live for ${client?.companyName ?? "the client"}.` });
      setShowActivateModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Activation failed", description: msg, variant: "destructive" });
    }
  };

  const det = detail as OrderDetailExtended | undefined;
  const isCompleted = det?.status === "completed";
  const hasClient = !!det?.clientId;

  return (
    <AppLayout role="reseller" title={id ? `Order ${orderRef(id)}` : "Order"}>
      <div className="mb-6">
        <button
          onClick={() => setLocation("/reseller/orders")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <Receipt className="w-4 h-4" /> Back to My Orders
        </button>
      </div>

      {isLoading || !detail ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold">{orderRef(detail.id)}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {det?.createdAt ? format(new Date(det.createdAt), "dd MMM yyyy, HH:mm") : "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="text-sm font-bold capitalize">{det?.status}</div>
                </div>
              </div>
              {det?.notes && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order Notes</div>
                  <div className="text-sm mt-1">{det.notes}</div>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-border/60">
                <div className="text-sm font-bold">Order Items</div>
              </div>
              <div className="divide-y divide-border/50">
                {(det?.items ?? ([] as OrderItem[])).map((it) => (
                  <div key={it.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{it.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Qty: <span className="font-semibold text-foreground">{it.quantity}</span> · Type:{" "}
                        <span className="font-semibold text-foreground">{it.itemType}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Line total</div>
                      <div className="font-bold">{formatZar(Number(it.lineTotal ?? 0))}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-border/60 flex justify-end">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Total incl VAT</div>
                  <div className="text-lg font-bold text-primary">{formatZar(Number(det?.totalInclVat ?? 0))}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Activation card — only visible for completed orders */}
            {isCompleted && (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="text-sm font-bold mb-3">Activation</div>
                {hasClient ? (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-emerald-600">Active</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Services are live for <span className="font-medium text-foreground">{det?.clientName ?? "the client"}</span>.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      <Zap className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-amber-600">Not yet activated</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Activate this order to provision services for a client.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowActivateModal(true); setSelectedClientId(""); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
                    >
                      <Zap className="w-4 h-4" /> Activate Order
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-primary" />
                <div className="text-sm font-bold">Request Update / Comments</div>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm min-h-24"
                placeholder="Write a message to admin…"
              />
              <button
                type="button"
                onClick={submit}
                disabled={postComment.isPending}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-border/60">
                <div className="text-sm font-bold">Conversation</div>
                <div className="text-xs text-muted-foreground mt-1">{list.length} message{list.length !== 1 ? "s" : ""}</div>
              </div>
              {list.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">No comments yet.</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {list.map((c) => (
                    <div key={c.id} className="px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {c.authorRole === "admin" ? "Admin" : "Reseller"} · {c.kind}
                        </div>
                        <div className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "dd MMM, HH:mm")}</div>
                      </div>
                      <div className="text-sm mt-2 whitespace-pre-wrap">{c.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activate Order Modal */}
      <Modal isOpen={showActivateModal} onClose={() => setShowActivateModal(false)} title="Activate Order">
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
              onClick={() => setShowActivateModal(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background text-sm font-semibold"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              type="button"
              onClick={submitActivate}
              disabled={activateOrder.isPending || !selectedClientId}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              <Zap className="w-4 h-4" /> Activate
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
