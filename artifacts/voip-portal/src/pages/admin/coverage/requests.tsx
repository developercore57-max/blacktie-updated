import { AppLayout } from "@/components/layout/AppLayout";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Eye, MessageSquare, Save, Send, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useAdminGetCoverageRequests,
  useAdminGetCoverageComments,
  useAdminPostCoverageComment,
  useAdminUpdateCoverageStatus,
  useAdminDeleteCoverageRequest,
  type CoverageCheckRequest,
  type CoverageCheckComment,
} from "@workspace/api-client-react";

const STATUS_OPTIONS = ["pending", "in_progress", "completed", "cancelled"];

export default function AdminCoverageRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useAdminGetCoverageRequests();
  const { mutateAsync: updateStatus, isPending: statusPending } = useAdminUpdateCoverageStatus();
  const postComment = useAdminPostCoverageComment();
  const deleteRequest = useAdminDeleteCoverageRequest();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [reply, setReply] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<CoverageCheckRequest | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const { data: comments = [] } = useAdminGetCoverageComments(selectedId ?? 0, !!selectedId);

  const list = useMemo(() => (requests as CoverageCheckRequest[]).slice(), [requests]);
  const convo = useMemo(() => (comments as CoverageCheckComment[]).slice().reverse(), [comments]);

  const statusPill = (s: string) => {
    const v = (s || "").toLowerCase();
    if (v === "completed") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (v === "in_progress") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (v === "cancelled") return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-muted/30 text-muted-foreground border-border/60";
  };

  const open = (r: CoverageCheckRequest) => {
    setSelectedId(r.id);
    setSelectedRequest(r);
    setStatus(r.status);
    setReply("");
  };

  const saveStatus = async () => {
    if (!selectedId) return;
    try {
      await updateStatus({ id: selectedId, data: { status } });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coverage/requests"] });
      toast({ title: "Status updated" });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const sendReply = async () => {
    if (!selectedId) return;
    if (!reply.trim()) {
      toast({ title: "Message required", variant: "destructive" });
      return;
    }
    try {
      await postComment.mutateAsync({ id: selectedId, data: { message: reply.trim() } });
      setReply("");
      queryClient.invalidateQueries({ queryKey: [`/api/admin/coverage/requests/${selectedId}/comments`] });
      toast({ title: "Reply sent" });
    } catch {
      toast({ title: "Failed to send reply", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRequest.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coverage/requests"] });
      setConfirmDeleteId(null);
      toast({ title: "Request deleted" });
    } catch {
      toast({ title: "Failed to delete request", variant: "destructive" });
    }
  };

  return (
    <AppLayout role="admin" title="Coverage Check Requests">
      <div className="text-sm text-muted-foreground mb-6">{list.length} request{list.length !== 1 ? "s" : ""}</div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg font-semibold text-muted-foreground">No coverage check requests</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Requests submitted by resellers will show here.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Request</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Reseller</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Service</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold">#{r.id}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.address}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">#{r.resellerId}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold border ${statusPill(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.serviceType}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy") : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {confirmDeleteId === r.id ? (
                      <div className="flex justify-end items-center gap-2">
                        <span className="text-xs text-muted-foreground">Delete?</span>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deleteRequest.isPending}
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 rounded-lg bg-muted/30 text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => open(r)}
                          className="p-2 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => open(r)}
                          className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title="Comments"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={selectedId ? `Request #${selectedId}` : "Request"}
        maxWidth="max-w-6xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {selectedRequest && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Reseller</div>
                    <div className="text-base font-bold mt-1">#{selectedRequest.resellerId}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Created: {selectedRequest.createdAt ? format(new Date(selectedRequest.createdAt), "dd MMM yyyy, HH:mm") : "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Service</div>
                    <div className="text-base font-bold mt-1">{selectedRequest.serviceType}</div>
                  </div>
                </div>

                <div className="mt-5 pt-5 border-t border-border/60">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Address</div>
                  <div className="text-sm font-semibold mt-2">
                    {[
                      (selectedRequest as any).unitStreetNumber,
                      (selectedRequest as any).buildingComplex,
                      (selectedRequest as any).streetName,
                    ]
                      .filter((v: any) => v && String(v).trim().length > 0)
                      .join(", ") || selectedRequest.address}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {(selectedRequest as any).address2 ? `${(selectedRequest as any).address2} · ` : ""}
                    {selectedRequest.city ? `${selectedRequest.city} · ` : ""}
                    {selectedRequest.province ?? ""}
                  </div>
                </div>

                {(selectedRequest.contactName || selectedRequest.contactEmail || selectedRequest.contactPhone) && (
                  <div className="mt-5 pt-5 border-t border-border/60 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Contact Name</div>
                      <div className="text-sm mt-1">{selectedRequest.contactName || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Contact Email</div>
                      <div className="text-sm mt-1 break-words">{selectedRequest.contactEmail || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Contact Phone</div>
                      <div className="text-sm mt-1">{selectedRequest.contactPhone || "—"}</div>
                    </div>
                  </div>
                )}

                {selectedRequest.notes && (
                  <div className="mt-5 pt-5 border-t border-border/60">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Notes</div>
                    <div className="text-sm mt-2 whitespace-pre-wrap">{selectedRequest.notes}</div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">Conversation</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{convo.length} message{convo.length !== 1 ? "s" : ""}</div>
                </div>
              </div>
              {convo.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-muted-foreground">No comments yet.</div>
              ) : (
                <div className="divide-y divide-border/50 max-h-[420px] overflow-y-auto">
                  {convo.map((c) => (
                    <div key={c.id} className="px-6 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{c.authorRole}</div>
                        <div className="text-[11px] text-muted-foreground">{format(new Date(c.createdAt), "dd MMM, HH:mm")}</div>
                      </div>
                      <div className="text-sm mt-2 whitespace-pre-wrap">{c.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-muted/10 rounded-2xl p-5 border border-border/50">
              <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Status</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-2 w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={saveStatus}
                disabled={statusPending}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                <Save className="w-4 h-4" /> Save Status
              </button>
            </div>

            <div className="bg-muted/10 rounded-2xl p-5 border border-border/50">
              <div className="text-sm font-bold mb-2">Reply to reseller</div>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm min-h-28"
                placeholder="Type your response…"
              />
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold"
                >
                  <X className="w-4 h-4" /> Close
                </button>
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={postComment.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
                >
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
