import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Building2, User, Mail, Phone, Calendar, CheckCircle2,
  XCircle, ClipboardList, AlertCircle, Search, Inbox,
  Eye, MessageSquare, FileText, Paperclip, Send,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Application {
  id: number;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
}

interface DocumentItem {
  id: number;
  fileName: string;
  storedName: string;
  description: string;
  mimeType: string | null;
  fileSize: number;
  isActive: boolean;
}

function isInStorage(doc: { storedName: string }): boolean {
  return doc.storedName.startsWith("documents/");
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Pending Review</Badge>;
  }
  if (status === "info_requested") {
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Info Requested</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
  }
  return null;
}

// ── Application card ──────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  onView,
  onApprove,
  onReject,
  onRequestInfo,
  onSendDocuments,
}: {
  app: Application;
  onView: (app: Application) => void;
  onApprove?: (app: Application) => void;
  onReject?: (app: Application) => void;
  onRequestInfo?: (app: Application) => void;
  onSendDocuments?: (app: Application) => void;
}) {
  const isActionable = app.status === "pending" || app.status === "info_requested";

  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Avatar + details */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base truncate">{app.companyName}</h3>
                <StatusBadge status={app.status} />
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                  {app.contactName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <a href={`mailto:${app.email}`} className="hover:text-primary transition-colors truncate">
                    {app.email}
                  </a>
                </span>
                {app.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    {app.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  Applied {format(new Date(app.createdAt), "dd MMM yyyy, HH:mm")}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onView(app)}
              className="gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </Button>
            {isActionable && onRequestInfo && (
              <Button
                size="sm"
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 gap-1.5"
                onClick={() => onRequestInfo(app)}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Request Info
              </Button>
            )}
            {isActionable && onSendDocuments && (
              <Button
                size="sm"
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 gap-1.5"
                onClick={() => onSendDocuments(app)}
              >
                <Paperclip className="w-3.5 h-3.5" />
                Send Docs
              </Button>
            )}
            {isActionable && onReject && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-1.5"
                onClick={() => onReject(app)}
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </Button>
            )}
            {isActionable && onApprove && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5"
                onClick={() => onApprove(app)}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── View Dialog ───────────────────────────────────────────────────────────────

function ViewDialog({
  app,
  open,
  onClose,
  onApprove,
  onReject,
  onRequestInfo,
  onSendDocuments,
}: {
  app: Application | null;
  open: boolean;
  onClose: () => void;
  onApprove: (app: Application) => void;
  onReject: (app: Application) => void;
  onRequestInfo: (app: Application) => void;
  onSendDocuments: (app: Application) => void;
}) {
  if (!app) return null;
  const isActionable = app.status === "pending" || app.status === "info_requested";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Application Details
          </DialogTitle>
          <DialogDescription>
            Full details for <strong>{app.companyName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="bg-muted/50 rounded-xl p-4 space-y-2.5 text-sm">
            <div className="flex items-center gap-2">
              <StatusBadge status={app.status} />
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-y-2 pt-1">
              <span className="text-muted-foreground font-medium">Company</span>
              <span className="font-semibold">{app.companyName}</span>
              <span className="text-muted-foreground font-medium">Contact</span>
              <span>{app.contactName}</span>
              <span className="text-muted-foreground font-medium">Email</span>
              <a href={`mailto:${app.email}`} className="text-primary hover:underline break-all">{app.email}</a>
              <span className="text-muted-foreground font-medium">Phone</span>
              <span>{app.phone || <span className="text-muted-foreground italic">Not provided</span>}</span>
              <span className="text-muted-foreground font-medium">Applied</span>
              <span>{format(new Date(app.createdAt), "dd MMM yyyy 'at' HH:mm")}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {isActionable && (
            <>
              <Button
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/5 gap-1.5"
                onClick={() => { onClose(); onSendDocuments(app); }}
              >
                <Paperclip className="w-4 h-4" />
                Send Docs
              </Button>
              <Button
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50 gap-1.5"
                onClick={() => { onClose(); onRequestInfo(app); }}
              >
                <MessageSquare className="w-4 h-4" />
                Request Info
              </Button>
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
                onClick={() => { onClose(); onReject(app); }}
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                onClick={() => { onClose(); onApprove(app); }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Request Info Dialog ───────────────────────────────────────────────────────

function RequestInfoDialog({
  app,
  open,
  onClose,
}: {
  app: Application | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) =>
      apiFetch(`/api/admin/resellers/${id}/request-info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      }),
    onSuccess: () => {
      toast({
        title: "Information Requested",
        description: `An email has been sent to ${app?.companyName} asking for more details.`,
      });
      queryClient.invalidateQueries({ queryKey: ["reseller-applications"] });
      queryClient.invalidateQueries({ queryKey: ["reseller-applications-count"] });
      setMessage("");
      onClose();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const handleClose = () => {
    setMessage("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            Request More Information
          </DialogTitle>
          <DialogDescription>
            Send a message to <strong>{app?.companyName}</strong> asking for additional details.
            Their application status will be updated to <em>Info Requested</em>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm space-y-0.5">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Sending to</p>
            <p className="font-medium">{app?.contactName} &mdash; <span className="text-primary">{app?.email}</span></p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="e.g. Could you please provide your business registration number and a brief description of the services you plan to resell?"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The applicant will receive this message via email and can reply directly. An email notification requires SMTP to be configured in Company Settings.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            onClick={() => app && mutation.mutate({ id: app.id, message })}
            disabled={mutation.isPending || !message.trim()}
          >
            <MessageSquare className="w-4 h-4" />
            {mutation.isPending ? "Sending…" : "Send & Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Send Documents Dialog ─────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function SendDocumentsDialog({
  app,
  open,
  onClose,
}: {
  app: Application | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");

  const { data: documents = [], isLoading: docsLoading } = useQuery<DocumentItem[]>({
    queryKey: ["admin-documents-for-send"],
    queryFn: () => apiFetch("/api/admin/documents"),
    enabled: open,
  });

  const activeDocuments = documents.filter((d) => d.isActive);
  const sendableDocuments = activeDocuments.filter(isInStorage);
  const legacyDocuments = activeDocuments.filter((d) => !isInStorage(d));

  const mutation = useMutation({
    mutationFn: ({ id, documentIds, message }: { id: number; documentIds: number[]; message: string }) =>
      apiFetch(`/api/admin/resellers/${id}/send-documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds, message }),
      }),
    onSuccess: () => {
      toast({
        title: "Documents Sent",
        description: `${selectedIds.length} document(s) emailed to ${app?.email}.`,
      });
      setSelectedIds([]);
      setMessage("");
      onClose();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Failed to Send", description: err.message });
    },
  });

  const handleClose = () => {
    setSelectedIds([]);
    setMessage("");
    onClose();
  };

  const toggleDoc = (docId: number) => {
    setSelectedIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === sendableDocuments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sendableDocuments.map((d) => d.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-primary" />
            Send Documents
          </DialogTitle>
          <DialogDescription>
            Select documents to email to <strong>{app?.companyName}</strong> ({app?.email}).
            Files will be sent as attachments via SMTP.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1 flex-1 overflow-y-auto min-h-0">
          {/* Document selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-muted-foreground">
                Documents <span className="text-red-500">*</span>
              </label>
              {sendableDocuments.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleAll}>
                  {selectedIds.length === sendableDocuments.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>

            {docsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : activeDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                <FileText className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm font-medium">No documents available</p>
                <p className="text-xs mt-1">Upload documents in the Documents section first.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto rounded-lg border border-border p-2">
                {sendableDocuments.map((doc) => (
                  <label
                    key={doc.id}
                    className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedIds.includes(doc.id)
                        ? "bg-primary/5 border border-primary/20"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <Checkbox
                      checked={selectedIds.includes(doc.id)}
                      onCheckedChange={() => toggleDoc(doc.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{doc.fileName}</span>
                      </div>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-0.5">{formatFileSize(doc.fileSize)}</p>
                    </div>
                  </label>
                ))}

                {legacyDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg border border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/20 opacity-70"
                  >
                    <div className="mt-0.5 w-4 h-4 rounded border border-border bg-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium truncate text-muted-foreground line-through">{doc.fileName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-400/30 flex-shrink-0">
                          Re-upload required
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">File lost — please delete and re-upload in Documents</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {legacyDocuments.length > 0 && sendableDocuments.length === 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-300/40 rounded-lg px-3 py-2">
                All documents need to be re-uploaded. Go to <strong>Documents</strong>, delete the listed files, and upload fresh copies.
              </p>
            )}
          </div>

          {/* Optional message */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Message <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="e.g. Please complete the attached forms and return them by replying to this email."
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
            />
          </div>

          {selectedIds.length > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              {selectedIds.length} document(s) will be sent to <strong>{app?.email}</strong>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-white gap-1.5"
            onClick={() => app && mutation.mutate({ id: app.id, documentIds: selectedIds, message })}
            disabled={mutation.isPending || selectedIds.length === 0}
          >
            <Send className="w-4 h-4" />
            {mutation.isPending ? "Sending…" : `Send ${selectedIds.length || ""} Document${selectedIds.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Approve Dialog ─────────────────────────────────────────────────────────────

function ApproveDialog({
  app,
  open,
  onClose,
}: {
  app: Application | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/resellers/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      toast({
        title: "Application Approved",
        description: `${app?.companyName} has been approved and can now log in.`,
      });
      queryClient.invalidateQueries({ queryKey: ["reseller-applications"] });
      queryClient.invalidateQueries({ queryKey: ["reseller-applications-count"] });
      onClose();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Approve Application
          </DialogTitle>
          <DialogDescription>
            Approving <strong>{app?.companyName}</strong> will activate their account and allow them to log in as a reseller.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium">{app?.companyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contact</span>
              <span className="font-medium">{app?.contactName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{app?.email}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => app && mutation.mutate(app.id)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Approving…" : "Approve & Activate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Reject Dialog ─────────────────────────────────────────────────────────────

function RejectDialog({
  app,
  open,
  onClose,
}: {
  app: Application | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiFetch(`/api/admin/resellers/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      toast({
        title: "Application Rejected",
        description: reason.trim()
          ? `${app?.companyName}'s application has been rejected and they have been notified by email.`
          : `${app?.companyName}'s application has been rejected.`,
      });
      queryClient.invalidateQueries({ queryKey: ["reseller-applications"] });
      queryClient.invalidateQueries({ queryKey: ["reseller-applications-count"] });
      setReason("");
      onClose();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Reject Application
          </DialogTitle>
          <DialogDescription>
            Rejecting <strong>{app?.companyName}</strong>'s application will prevent them from logging in.
            You can optionally provide a reason — if entered, it will be sent to the applicant by email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm space-y-0.5">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Applicant</p>
            <p className="font-medium">{app?.contactName} &mdash; <span className="text-primary">{app?.email}</span></p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Reason for Rejection <span className="text-muted-foreground font-normal text-xs">(optional — sent by email if provided)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="e.g. We are unable to approve your application at this time as we are not currently operating in your region. Please feel free to reapply in the future."
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-red-400/50 outline-none resize-none"
            />
          </div>
          {reason.trim() && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              A rejection email will be sent to <strong>{app?.email}</strong> with this reason. Requires SMTP to be configured.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => app && mutation.mutate({ id: app.id, reason })}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Rejecting…" : reason.trim() ? "Reject & Send Email" : "Reject Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Inbox className="w-10 h-10 mb-3 opacity-40" />
      <p className="font-medium">{message}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminResellerApplications() {
  const [search, setSearch] = useState("");
  const [viewTarget, setViewTarget] = useState<Application | null>(null);
  const [approveTarget, setApproveTarget] = useState<Application | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);
  const [requestInfoTarget, setRequestInfoTarget] = useState<Application | null>(null);
  const [sendDocsTarget, setSendDocsTarget] = useState<Application | null>(null);

  const { data: applications = [], isLoading, isError } = useQuery<Application[]>({
    queryKey: ["reseller-applications"],
    queryFn: () => apiFetch("/api/admin/reseller-applications"),
    refetchInterval: 30_000,
  });

  const pending = applications.filter((a) => a.status === "pending");
  const infoRequested = applications.filter((a) => a.status === "info_requested");
  const actionable = [...pending, ...infoRequested];
  const rejected = applications.filter((a) => a.status === "rejected");

  const filtered = (list: Application[]) =>
    list.filter(
      (a) =>
        !search ||
        a.companyName.toLowerCase().includes(search.toLowerCase()) ||
        a.contactName.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <AppLayout role="admin" title="Reseller Applications">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Reseller Applications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and action incoming reseller signup requests
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search applicants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Summary banner */}
      {!isLoading && actionable.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {actionable.length} application{actionable.length !== 1 ? "s" : ""} awaiting action
            {infoRequested.length > 0 && ` (${infoRequested.length} info requested)`}
          </p>
        </div>
      )}

      {/* Content */}
      {isError ? (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 py-4 text-destructive">
            <AlertCircle className="w-4 h-4" />
            Failed to load applications. Please refresh.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {pending.length > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="info_requested" className="gap-2">
              Info Requested
              {infoRequested.length > 0 && (
                <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {infoRequested.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              Rejected
              {rejected.length > 0 && (
                <span className="bg-muted text-muted-foreground text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {rejected.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))
            ) : filtered(pending).length === 0 ? (
              <EmptyState
                message={
                  search
                    ? "No pending applications match your search"
                    : "No pending applications — all caught up!"
                }
              />
            ) : (
              filtered(pending).map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onView={setViewTarget}
                  onApprove={setApproveTarget}
                  onReject={setRejectTarget}
                  onRequestInfo={setRequestInfoTarget}
                  onSendDocuments={setSendDocsTarget}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="info_requested" className="space-y-3">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))
            ) : filtered(infoRequested).length === 0 ? (
              <EmptyState
                message={
                  search
                    ? "No applications match your search"
                    : "No applications awaiting information"
                }
              />
            ) : (
              filtered(infoRequested).map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onView={setViewTarget}
                  onApprove={setApproveTarget}
                  onReject={setRejectTarget}
                  onRequestInfo={setRequestInfoTarget}
                  onSendDocuments={setSendDocsTarget}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-3">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))
            ) : filtered(rejected).length === 0 ? (
              <EmptyState
                message={
                  search
                    ? "No rejected applications match your search"
                    : "No rejected applications"
                }
              />
            ) : (
              filtered(rejected).map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onView={setViewTarget}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <ViewDialog
        app={viewTarget}
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        onApprove={setApproveTarget}
        onReject={setRejectTarget}
        onRequestInfo={setRequestInfoTarget}
        onSendDocuments={setSendDocsTarget}
      />
      <RequestInfoDialog
        app={requestInfoTarget}
        open={!!requestInfoTarget}
        onClose={() => setRequestInfoTarget(null)}
      />
      <ApproveDialog
        app={approveTarget}
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
      />
      <RejectDialog
        app={rejectTarget}
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
      />
      <SendDocumentsDialog
        app={sendDocsTarget}
        open={!!sendDocsTarget}
        onClose={() => setSendDocsTarget(null)}
      />
    </AppLayout>
  );
}
