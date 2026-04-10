import { AppLayout } from "@/components/layout/AppLayout";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Eye, PhoneCall, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminGetDidRequests,
  useAdminUpdateDidRequest,
  useAdminDeleteDidRequest,
  type DidRequest,
} from "@workspace/api-client-react";

const STATUSES = ["pending", "approved", "rejected"] as const;

export default function AdminDidRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useAdminGetDidRequests();
  const updateReq = useAdminUpdateDidRequest();
  const deleteReq = useAdminDeleteDidRequest();

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<DidRequest | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editAdminNotes, setEditAdminNotes] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const list = useMemo(() => {
    const all = (requests as DidRequest[]).slice();
    if (filterStatus === "all") return all;
    return all.filter((r) => r.status === filterStatus);
  }, [requests, filterStatus]);

  const statusPill = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (s === "rejected") return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  };

  const openDetail = (r: DidRequest) => {
    setSelectedRequest(r);
    setEditStatus(r.status);
    setEditAdminNotes(r.adminNotes || "");
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteReq.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/did-requests"] });
      setConfirmDeleteId(null);
      toast({ title: "DID request deleted" });
    } catch {
      toast({ title: "Failed to delete request", variant: "destructive" });
    }
  };

  const saveChanges = async () => {
    if (!selectedRequest) return;
    try {
      await updateReq.mutateAsync({
        id: selectedRequest.id,
        data: { status: editStatus, adminNotes: editAdminNotes },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/did-requests"] });
      toast({ title: "Updated", description: "DID request updated." });
      setSelectedRequest(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update", variant: "destructive" });
    }
  };

  return (
    <AppLayout role="admin" title="DID Requests">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">DID Requests</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Manage DID allocation requests from resellers</p>
          </div>
          <select
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading…</div>
        ) : list.length === 0 ? (
          <div className="text-center py-16">
            <PhoneCall className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">No DID requests</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Reseller</th>
                  <th className="px-4 py-3 text-left font-semibold">Area Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Region</th>
                  <th className="px-4 py-3 text-left font-semibold">Qty</th>
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
                    <td className="px-4 py-3 font-mono font-medium">{r.areaCode || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.region || "—"}</td>
                    <td className="px-4 py-3 font-medium">{r.quantity}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusPill(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {confirmDeleteId === r.id ? (
                        <div className="flex justify-end items-center gap-2">
                          <span className="text-xs text-muted-foreground">Delete?</span>
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deleteReq.isPending}
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
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openDetail(r)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmDeleteId(r.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500" title="Delete">
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
      </div>

      {/* Detail / Edit Modal */}
      <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title="DID Request Details" maxWidth="max-w-2xl">
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
              <div>
                <p className="text-xs text-muted-foreground">Area Code</p>
                <p className="font-medium font-mono">{selectedRequest.areaCode || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Region</p>
                <p className="font-medium">{selectedRequest.region || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quantity</p>
                <p className="font-medium">{selectedRequest.quantity}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">DID IDs</p>
                <p className="font-medium font-mono text-xs">{selectedRequest.didIds || "—"}</p>
              </div>
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
                    <option key={s} value={s}>{s.replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
                {editStatus === "approved" && selectedRequest.status === "pending" && (
                  <p className="text-xs text-emerald-600 mt-1">Approving will assign the requested DIDs to the reseller.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Admin Notes</label>
                <textarea
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px]"
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  placeholder="Internal notes…"
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
