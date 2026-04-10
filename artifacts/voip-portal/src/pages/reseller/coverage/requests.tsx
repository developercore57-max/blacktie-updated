import { AppLayout } from "@/components/layout/AppLayout";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { PROVINCES } from "@/lib/utils";
import { format } from "date-fns";
import { Eye, MessageSquare, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useResellerCreateCoverageRequest,
  useResellerGetCoverageRequests,
  useResellerGetCoverageRequest,
  useResellerGetCoverageComments,
  useResellerPostCoverageComment,
  type CoverageCheckRequest,
  type CoverageCheckComment,
} from "@workspace/api-client-react";

type FormState = {
  serviceType: string;
  unitStreetNumber: string;
  buildingComplex: string;
  streetName: string;
  address2: string;
  city: string;
  province: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
};

const DEFAULT_FORM: FormState = {
  serviceType: "fibre",
  unitStreetNumber: "",
  buildingComplex: "",
  streetName: "",
  address2: "",
  city: "",
  province: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
};

/**
 * Parse a Google Maps formatted address string into individual form fields.
 * Typical SA format: "210 Albertus Street, La Montagne, Pretoria, Gauteng, 0184, South Africa"
 */
function parseGoogleAddress(raw: string): Partial<FormState> {
  const CITY_TO_PROVINCE: Record<string, string> = {
    pretoria: "Gauteng", tshwane: "Gauteng", centurion: "Gauteng",
    midrand: "Gauteng", sandton: "Gauteng", johannesburg: "Gauteng",
    joburg: "Gauteng", soweto: "Gauteng", germiston: "Gauteng",
    "cape town": "Western Cape", stellenbosch: "Western Cape",
    paarl: "Western Cape", george: "Western Cape", worcester: "Western Cape",
    knysna: "Western Cape", "mossel bay": "Western Cape",
    durban: "KwaZulu-Natal", pietermaritzburg: "KwaZulu-Natal",
    "richards bay": "KwaZulu-Natal", newcastle: "KwaZulu-Natal",
    "port elizabeth": "Eastern Cape", gqeberha: "Eastern Cape",
    "east london": "Eastern Cape", grahamstown: "Eastern Cape",
    polokwane: "Limpopo", tzaneen: "Limpopo", lephalale: "Limpopo",
    nelspruit: "Mpumalanga", mbombela: "Mpumalanga", witbank: "Mpumalanga",
    bloemfontein: "Free State", welkom: "Free State",
    kimberley: "Northern Cape", upington: "Northern Cape",
    rustenburg: "North West", mahikeng: "North West", mafikeng: "North West",
    klerksdorp: "North West", potchefstroom: "North West",
  };

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => p.toLowerCase() !== "south africa")
    .filter((p) => !/^\d{4,5}$/.test(p)); // strip postal codes

  const result: Partial<FormState> = {};
  if (parts.length === 0) return result;

  // Part 0: "210 Albertus Street" → unitStreetNumber + streetName
  const numberMatch = parts[0].match(/^(\d+[a-zA-Z]?)\s+(.+)$/);
  if (numberMatch) {
    result.unitStreetNumber = numberMatch[1];
    result.streetName = numberMatch[2];
  } else {
    result.streetName = parts[0];
  }

  // Check if any remaining parts match a known province exactly
  let provinceIdx = -1;
  for (let i = 1; i < parts.length; i++) {
    if (PROVINCES.includes(parts[i])) {
      result.province = parts[i];
      provinceIdx = i;
      break;
    }
  }

  // Remaining parts (excluding province), used for suburb + city
  const rest = parts.slice(1).filter((_, i) => i + 1 !== provinceIdx);

  if (rest.length >= 2) {
    result.address2 = rest[0]; // suburb / area
    result.city = rest[1];
  } else if (rest.length === 1) {
    result.city = rest[0];
  }

  // If province not found explicitly, try city → province lookup
  if (!result.province && result.city) {
    result.province = CITY_TO_PROVINCE[result.city.toLowerCase()] ?? "";
  }

  return result;
}

export default function ResellerCoverageRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useResellerGetCoverageRequests();
  const createReq = useResellerCreateCoverageRequest();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: selectedDetail } = useResellerGetCoverageRequest(selectedId ?? 0, !!selectedId);
  const { data: comments = [] } = useResellerGetCoverageComments(selectedId ?? 0, !!selectedId);
  const postComment = useResellerPostCoverageComment();
  const [message, setMessage] = useState("");

  // Auto-open + prefill form when navigated from Telkom LTE / Fibre coverage map
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefillAddress = params.get("prefill_address");
    const service = params.get("service");
    const autoopen = params.get("autoopen");
    if (autoopen === "1" && prefillAddress) {
      const parsed = parseGoogleAddress(prefillAddress);
      setForm({
        ...DEFAULT_FORM,
        serviceType: service === "lte" ? "lte" : service === "fibre" ? "fibre" : "lte",
        ...parsed,
      });
      setIsCreateOpen(true);
      // Clean up URL params without triggering navigation
      window.history.replaceState(null, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => (requests as CoverageCheckRequest[]).slice(), [requests]);
  const convo = useMemo(() => (comments as CoverageCheckComment[]).slice().reverse(), [comments]);

  const statusPill = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (s === "in_progress") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (s === "cancelled") return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-muted/30 text-muted-foreground border-border/60";
  };

  const openCreate = () => {
    setForm(DEFAULT_FORM);
    setIsCreateOpen(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.streetName.trim() && !form.unitStreetNumber.trim() && !form.buildingComplex.trim()) {
      toast({ title: "Provide address details", description: "Enter Unit/Street, Building/Complex, or Street Name.", variant: "destructive" });
      return;
    }
    try {
      await createReq.mutateAsync({
        data: {
          clientId: null,
          serviceType: form.serviceType,
          address: "",
          unitStreetNumber: form.unitStreetNumber || null,
          buildingComplex: form.buildingComplex || null,
          streetName: form.streetName || null,
          address2: form.address2 || null,
          city: form.city || null,
          province: form.province || null,
          contactName: form.contactName || null,
          contactEmail: form.contactEmail || null,
          contactPhone: form.contactPhone || null,
          notes: form.notes || null,
        } as any,
      });
      toast({ title: "Request submitted", description: "Admin will respond with coverage feedback." });
      queryClient.invalidateQueries({ queryKey: ["/api/coverage/requests"] });
      setIsCreateOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Failed", description: msg, variant: "destructive" });
    }
  };

  const openDetail = (id: number) => {
    setSelectedId(id);
    setMessage("");
  };

  const sendMessage = async () => {
    if (!selectedId) return;
    if (!message.trim()) {
      toast({ title: "Message required", variant: "destructive" });
      return;
    }
    try {
      await postComment.mutateAsync({ id: selectedId, data: { message } });
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/coverage/requests/${selectedId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/coverage/requests/${selectedId}`] });
      toast({ title: "Sent" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Failed", description: msg, variant: "destructive" });
    }
  };

  return (
    <AppLayout role="reseller" title="Coverage Check Requests">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-muted-foreground">{list.length} request{list.length !== 1 ? "s" : ""}</div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all"
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg font-semibold text-muted-foreground">No coverage check requests</p>
          <p className="text-sm text-muted-foreground/70 mt-1 mb-6">Submit a request and admin will respond with coverage feedback.</p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold"
          >
            <Plus className="w-4 h-4" /> New Request
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Request</th>
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
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold border ${statusPill(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.serviceType}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy") : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openDetail(r.id)}
                        className="p-2 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDetail(r.id)}
                        className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="Comments"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Coverage Check Request">
        <form onSubmit={submitCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Service Type</label>
              <select
                value={form.serviceType}
                onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}
                className="mt-1 w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none"
              >
                <option value="fibre">fibre</option>
                <option value="lte">lte</option>
                <option value="other">other</option>
              </select>
            </div>
          </div>
          <div className="space-y-4 md:col-span-2 pt-4 border-t border-border/50">
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Address Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Unit / Street Number</label>
                <input
                  value={form.unitStreetNumber}
                  onChange={(e) => setForm((f) => ({ ...f, unitStreetNumber: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="e.g. Unit 4 / 12"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Building / Complex</label>
                <input
                  value={form.buildingComplex}
                  onChange={(e) => setForm((f) => ({ ...f, buildingComplex: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="e.g. Sunridge Business Park"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium">Street Name</label>
                <input
                  value={form.streetName}
                  onChange={(e) => setForm((f) => ({ ...f, streetName: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="e.g. Main Road"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium">
                  Address Line 2 <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  value={form.address2}
                  onChange={(e) => setForm((f) => ({ ...f, address2: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="e.g. Industrial area, Estate name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">City</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="e.g. Cape Town"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Province</label>
                <select
                  value={form.province}
                  onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none"
                >
                  <option value="">Select Province...</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Contact Name</label>
              <input
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Contact Email</label>
              <input
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Contact Phone</label>
              <input
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm min-h-24"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background text-sm font-semibold"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              type="submit"
              disabled={createReq.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
            >
              <Plus className="w-4 h-4" /> Submit
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!selectedId} onClose={() => setSelectedId(null)} title={selectedId ? `Request #${selectedId}` : "Request"}>
        <div className="space-y-4">
          {selectedDetail ? (
            <div className="bg-muted/10 rounded-xl p-4 border border-border/50">
              <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Address</div>
              <div className="text-sm font-semibold mt-1">
                {[
                  selectedDetail.unitStreetNumber,
                  selectedDetail.buildingComplex,
                  selectedDetail.streetName,
                ]
                  .filter((v: any) => v && String(v).trim().length > 0)
                  .join(", ") || selectedDetail.address}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {selectedDetail.address2 ? `${selectedDetail.address2} · ` : ""}
                {selectedDetail.city ? `${selectedDetail.city} · ` : ""}
                {selectedDetail.province ?? ""}
              </div>
              <div className="mt-3 text-xs text-muted-foreground uppercase tracking-wide font-semibold">Status</div>
              <div className="text-sm font-semibold mt-1">{selectedDetail.status}</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Loading…</div>
          )}

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/60">
              <div className="text-sm font-bold">Comments</div>
            </div>
            {convo.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">No comments yet.</div>
            ) : (
              <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
                {convo.map((c) => (
                  <div key={c.id} className="px-5 py-4">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {c.authorRole} · {format(new Date(c.createdAt), "dd MMM, HH:mm")}
                    </div>
                    <div className="text-sm mt-2 whitespace-pre-wrap">{c.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-muted/10 rounded-xl p-4 border border-border/50">
            <div className="text-sm font-bold mb-2">Send message</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm min-h-20"
              placeholder="Ask admin for an update…"
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={sendMessage}
                disabled={postComment.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                <MessageSquare className="w-4 h-4" /> Send
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
