import { type ChangeEvent, type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  Plus,
  Trash2,
  Upload,
  Calendar,
  User,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Switch } from "@/components/ui/switch";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import {
  apiFetch,
  deleteAdminDocument,
  formatFileSize,
  getAdminDocumentDownloadUrl,
  isDocumentInStorage,
  type PortalDocument,
  updateAdminDocument,
  uploadAdminDocument,
} from "@/lib/documents";

const ACCEPTED_DOCUMENTS = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.zip,.png,.jpg,.jpeg";

const emptyForm = {
  description: "",
  isActive: true,
};

export default function AdminDocuments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<PortalDocument | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["admin-documents"],
    queryFn: () => apiFetch<PortalDocument[]>("/api/admin/documents"),
  });

  const createMutation = useMutation({
    mutationFn: uploadAdminDocument,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-documents"] }),
        queryClient.invalidateQueries({ queryKey: ["reseller-documents"] }),
      ]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { description: string; isActive: boolean } }) =>
      updateAdminDocument(id, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-documents"] }),
        queryClient.invalidateQueries({ queryKey: ["reseller-documents"] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminDocument,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-documents"] }),
        queryClient.invalidateQueries({ queryKey: ["reseller-documents"] }),
      ]);
    },
  });

  const resetForm = () => {
    setEditingDocument(null);
    setSelectedFile(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (document: PortalDocument) => {
    setEditingDocument(document);
    setSelectedFile(null);
    setForm({
      description: document.description,
      isActive: document.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (editingDocument) {
        await updateMutation.mutateAsync({
          id: editingDocument.id,
          data: {
            description: form.description.trim(),
            isActive: form.isActive,
          },
        });
        toast({ title: "Document updated" });
      } else {
        if (!selectedFile) {
          toast({ title: "Select a document to upload", variant: "destructive" });
          return;
        }

        const payload = new FormData();
        payload.append("file", selectedFile);
        payload.append("description", form.description.trim());
        payload.append("isActive", String(form.isActive));
        await createMutation.mutateAsync(payload);
        toast({ title: "Document uploaded" });
      }

      closeModal();
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Document action failed",
        variant: "destructive",
      });
    }
  };

  const handleToggleAvailability = async (document: PortalDocument) => {
    try {
      await updateMutation.mutateAsync({
        id: document.id,
        data: {
          description: document.description,
          isActive: !document.isActive,
        },
      });
      toast({ title: document.isActive ? "Document hidden from resellers" : "Document available to resellers" });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to update document",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (document: PortalDocument) => {
    if (!confirm(`Delete ${document.fileName}?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(document.id);
      toast({ title: "Document deleted" });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout role="admin" title="Documents">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Document Manager</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload reference files, add context, and control which documents resellers can access.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-card border border-border rounded-2xl">
          <FileText className="w-12 h-12 opacity-20 mb-3" />
          <p className="font-medium">No documents uploaded yet</p>
          <p className="text-sm opacity-60 mt-1">Upload a document to make resources available to your resellers.</p>
          <button
            onClick={openCreate}
            className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Upload First Document
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => (
            <div key={document.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{document.fileName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${document.isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-300/30" : "bg-muted/30 text-muted-foreground border-border/50"}`}>
                        {document.isActive ? "Available" : "Hidden"}
                      </span>
                      {!isDocumentInStorage(document) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-400/30">
                          Re-upload required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{document.description}</p>
                    {!isDocumentInStorage(document) && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                        This file was stored locally and can no longer be retrieved. Delete this record and re-upload the file.
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span>{formatFileSize(document.fileSize)}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Uploaded {new Date(document.createdAt).toLocaleDateString("en-ZA")}
                      </span>
                      {document.createdByName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {document.createdByName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={getAdminDocumentDownloadUrl(document.id)}
                    className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => openEdit(document)}
                    className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleAvailability(document)}
                    className={`p-2 rounded-lg transition-colors ${document.isActive ? "hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500" : "hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500"}`}
                    title={document.isActive ? "Hide from resellers" : "Make available to resellers"}
                  >
                    {document.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(document)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDocument ? "Edit Document" : "Upload Document"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingDocument && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">File *</label>
              <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-muted/10 px-6 py-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-colors">
                <Upload className="w-6 h-6 text-primary/70" />
                <div>
                  <p className="text-sm font-medium text-foreground/80">{selectedFile ? selectedFile.name : "Choose a document to upload"}</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, Office files, text, zip, PNG and JPG up to 25MB</p>
                </div>
                <input type="file" accept={ACCEPTED_DOCUMENTS} className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          )}

          {editingDocument && (
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Editing <span className="font-semibold text-foreground">{editingDocument.fileName}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Description *</label>
            <textarea
              required
              rows={5}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Describe what the document is for and when resellers should use it."
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Available to resellers</p>
              <p className="text-xs text-muted-foreground">When off, the document stays in admin but disappears from reseller view.</p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={closeModal}
              className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50"
            >
              {editingDocument ? "Save Changes" : "Upload Document"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}