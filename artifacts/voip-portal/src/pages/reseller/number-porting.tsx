import { AppLayout } from "@/components/layout/AppLayout";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Eye, Plus, Phone, Trash2, Upload, Paperclip, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useResellerGetPortingRequests,
  useResellerCreatePortingRequest,
  type NumberPortingRequest,
} from "@workspace/api-client-react";

type FormState = {
  currentProvider: string;
  accountNumber: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  portingDate: string;
  notes: string;
};

const DEFAULT_FORM: FormState = {
  currentProvider: "",
  accountNumber: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  portingDate: "",
  notes: "",
};

const MAX_FILES = 5;

export default function ResellerNumberPorting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useResellerGetPortingRequests();
  const createReq = useResellerCreatePortingRequest();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [numbersList, setNumbersList] = useState<string[]>([""]);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRequest, setSelectedRequest] = useState<NumberPortingRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const list = useMemo(() => (requests as NumberPortingRequest[]).slice(), [requests]);

  const statusPill = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (s === "approved") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (s === "in_progress") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    if (s === "rejected") return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-muted/30 text-muted-foreground border-border/60";
  };

  const openCreate = () => {
    setForm(DEFAULT_FORM);
    setNumbersList([""]);
    setFiles([]);
    setIsCreateOpen(true);
  };

  const addNumber = () => setNumbersList((prev) => [...prev, ""]);
  const removeNumber = (idx: number) => setNumbersList((prev) => prev.filter((_, i) => i !== idx));
  const updateNumber = (idx: number, val: string) =>
    setNumbersList((prev) => prev.map((n, i) => (i === idx ? val : n)));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      toast({ title: "Limit reached", description: `Maximum ${MAX_FILES} files allowed.`, variant: "destructive" });
      return;
    }
    setFiles((prev) => [...prev, ...selected.slice(0, remaining)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const validNumbers = numbersList.map((n) => n.trim()).filter(Boolean);
    if (validNumbers.length === 0) {
      toast({ title: "Numbers required", description: "Enter at least one number to port.", variant: "destructive" });
      return;
    }
    if (!form.currentProvider.trim()) {
      toast({ title: "Provider required", description: "Enter the current service provider.", variant: "destructive" });
      return;
    }
    if (!form.contactName.trim()) {
      toast({ title: "Contact required", description: "Enter a contact name.", variant: "destructive" });
      return;
    }
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("portingNumbers", validNumbers.join(", "));
      formData.append("currentProvider", form.currentProvider.trim());
      if (form.accountNumber.trim()) formData.append("accountNumber", form.accountNumber.trim());
      formData.append("contactName", form.contactName.trim());
      if (form.contactEmail.trim()) formData.append("contactEmail", form.contactEmail.trim());
      if (form.contactPhone.trim()) formData.append("contactPhone", form.contactPhone.trim());
      if (form.portingDate) formData.append("portingDate", form.portingDate);
      if (form.notes.trim()) formData.append("notes", form.notes.trim());
      for (const file of files) {
        formData.append("files", file);
      }

      const res = await fetch("/api/reseller/number-porting", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/reseller/number-porting"] });
      setIsCreateOpen(false);
      toast({ title: "Request submitted", description: "Your number porting request has been sent to admin." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to submit request", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const field = (label: string, name: keyof FormState, opts?: { type?: string; required?: boolean; placeholder?: string; multiline?: boolean }) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label} {opts?.required && <span className="text-destructive">*</span>}
      </label>
      {opts?.multiline ? (
        <textarea
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px]"
          value={form[name]}
          onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
          placeholder={opts?.placeholder}
        />
      ) : (
        <input
          type={opts?.type || "text"}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          value={form[name]}
          onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
          placeholder={opts?.placeholder}
        />
      )}
    </div>
  );

  return (
    <AppLayout role="reseller" title="Number Porting">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Number Porting</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Request to port numbers from another provider</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all text-sm"
          >
            <Plus className="w-4 h-4" /> New Porting Request
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading…</div>
        ) : list.length === 0 ? (
          <div className="text-center py-16">
            <Phone className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">No porting requests yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Click "New Porting Request" to get started</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">#</th>
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
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{r.portingNumbers}</td>
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
                      <button onClick={() => setSelectedRequest(r)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
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

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Porting Request" maxWidth="max-w-2xl">
        <form onSubmit={submitCreate} className="space-y-4">
          {/* Dynamic numbers list */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Numbers to Port <span className="text-destructive">*</span>
            </label>
            <div className="space-y-2">
              {numbersList.map((num, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={num}
                    onChange={(e) => updateNumber(idx, e.target.value)}
                    placeholder={`e.g. 011 123 4567`}
                  />
                  {numbersList.length > 1 && (
                    <button type="button" onClick={() => removeNumber(idx)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addNumber}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add more
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field("Current Provider", "currentProvider", { required: true, placeholder: "e.g. Telkom, Vodacom" })}
            {field("Account Number", "accountNumber", { placeholder: "Account # with current provider" })}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field("Contact Name", "contactName", { required: true, placeholder: "Full name" })}
            {field("Contact Email", "contactEmail", { type: "email", placeholder: "email@example.com" })}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field("Contact Phone", "contactPhone", { placeholder: "Phone number" })}
            {field("Preferred Porting Date", "portingDate", { type: "date" })}
          </div>
          {field("Notes", "notes", { multiline: true, placeholder: "Any additional details…" })}

          {/* File uploads */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Attachments <span className="text-muted-foreground/60">(up to {MAX_FILES} files, 10 MB each)</span>
            </label>
            {files.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50 text-sm">
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => removeFile(idx)} className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {files.length < MAX_FILES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full justify-center"
              >
                <Upload className="w-4 h-4" /> Choose files
              </button>
            )}
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.zip" className="hidden" onChange={handleFileSelect} />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Detail Modal */}
      <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title="Porting Request Details" maxWidth="max-w-2xl">
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusPill(selectedRequest.status)}`}>
                  {selectedRequest.status.replace(/_/g, " ")}
                </span>
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
                  <p className="text-xs text-muted-foreground">Notes</p>
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
            <div className="pt-4 flex justify-end border-t border-border">
              <button onClick={() => setSelectedRequest(null)} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5 transition-colors">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
