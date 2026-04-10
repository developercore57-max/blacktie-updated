import { AppLayout } from "@/components/layout/AppLayout";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Eye, Phone, Paperclip } from "lucide-react";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminGetPortingRequests,
  useAdminUpdatePortingRequest,
  type NumberPortingRequest,
} from "@workspace/api-client-react";

const STATUSES = ["pending", "in_progress", "approved", "completed", "rejected"] as const;

export default function AdminNumberPorting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useAdminGetPortingRequests();
  const updateReq = useAdminUpdatePortingRequest();

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<NumberPortingRequest | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editAdminNotes, setEditAdminNotes] = useState("");

  const list = useMemo(() => {
    const all = (requests as NumberPortingRequest[]).slice();
    if (filterStatus === "all") return all;
    return all.filter((r) => r.status === filterStatus);
  }, [requests, filterStatus]);

  const statusPill = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (s === "approved") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (s === "in_progress") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    if (s === "rejected") return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-muted/30 text-muted-foreground border-border/60";
  };

  const openDetail = (r: NumberPortingRequest) => {
    setSelectedRequest(r);
    setEditStatus(r.status);
    setEditAdminNotes(r.adminNotes || "");
  };

  const saveChanges = async () => {
    if (!selectedRequest) return;
    try {
      const updated = await updateReq.mutateAsync({
        id: selectedRequest.id,
        data: { status: editStatus, adminNotes: editAdminNotes },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/number-porting"] });
      setSelectedRequest(updated);
      toast({ title: "Updated", description: "Porting request updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update", variant: "destructive" });
    }
  };

  return (
    <AppLayout role="admin" title="Number Porting">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Number Porting</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Manage number porting requests from resellers</p>
          </div>
          <select
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading…</div>
        ) : list.length === 0 ? (
          <div className="text-center py-16">
            <Phone className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">No porting requests</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Reseller</th>
                  <th className="px-4 py-3 text-left font-semibold">Numbers</th>
                  <th className="px-4 py-3 text-left font-semibold">Provider</th>
                  <th className="px-4 py-3 text-left font-semibold">Contact</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{r.resellerName || "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.resellerEmail || ""}</p>
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[180px] truncate">{r.portingNumbers}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.currentProvider}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.contactName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusPill(r.status)}`}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openDetail(r)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail / Edit Modal */}
      <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title="Porting Request Details" maxWidth="max-w-2xl">
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Reseller</p>
                <p className="font-medium">{selectedRequest.resellerName || "—"}</p>
                <p className="text-xs text-muted-foreground">{selectedRequest.resellerEmail || ""}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="font-medium">{selectedRequest.createdAt ? format(new Date(selectedRequest.createdAt), "dd MMM yyyy HH:mm") : "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Numbers to Port</p>
                <p className="font-medium whitespace-pre-wrap">{selectedRequest.portingNumbers}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Provider</p>
                <p className="font-medium">{selectedRequest.currentProvider}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account Number</p>
                <p className="font-medium">{selectedRequest.accountNumber || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contact Name</p>
                <p className="font-medium">{selectedRequest.contactName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contact Email</p>
                <p className="font-medium">{selectedRequest.contactEmail || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contact Phone</p>
                <p className="font-medium">{selectedRequest.contactPhone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Preferred Porting Date</p>
                <p className="font-medium">{selectedRequest.portingDate || "—"}</p>
              </div>
              {selectedRequest.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Reseller Notes</p>
                  <p className="font-medium whitespace-pre-wrap">{selectedRequest.notes}</p>
                </div>
              )}
              {(() => {
                const att = selectedRequest.attachments
                  ? (typeof selectedRequest.attachments === "string" ? JSON.parse(selectedRequest.attachments) : selectedRequest.attachments)
                  : [];
                return att.length > 0 ? (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Attachments</p>
                    <div className="space-y-1">
                      {att.map((a: any, i: number) => (
                        <a
                          key={i}
                          href={`/api/number-porting/attachments/${a.storedName}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50 text-sm hover:bg-muted/50 transition-colors"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate text-primary">{a.originalName}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                <select
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Admin Notes</label>
                <textarea
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px]"
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  placeholder="Internal notes (not visible to reseller)…"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-border">
              <button onClick={() => setSelectedRequest(null)} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={saveChanges}
                disabled={updateReq.isPending}
                className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50"
              >
                {updateReq.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
