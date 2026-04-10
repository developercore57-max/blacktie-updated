import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Download, Eye, FileText, User } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Modal } from "@/components/ui/modal";
import {
  apiFetch,
  formatFileSize,
  getResellerDocumentDownloadUrl,
  type PortalDocument,
} from "@/lib/documents";

export default function ResellerDocuments() {
  const [selectedDocument, setSelectedDocument] = useState<PortalDocument | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["reseller-documents"],
    queryFn: () => apiFetch<PortalDocument[]>("/api/reseller/documents"),
  });

  return (
    <AppLayout role="reseller" title="Documents">
      <div className="mb-6">
        <h2 className="text-xl font-display font-bold text-foreground">Shared Documents</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Access the latest admin-shared forms, reference files, and reseller documentation.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-card border border-border rounded-2xl">
          <FileText className="w-12 h-12 opacity-20 mb-3" />
          <p className="font-medium">No documents available yet</p>
          <p className="text-sm opacity-60 mt-1">Documents marked available by admin will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {documents.map((document) => (
            <div key={document.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{document.fileName}</h3>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{document.description}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span>{formatFileSize(document.fileSize)}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Updated {new Date(document.updatedAt).toLocaleDateString("en-ZA")}
                    </span>
                    {document.createdByName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {document.createdByName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => setSelectedDocument(document)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-black/5 transition-colors"
                    >
                      <Eye className="w-4 h-4" /> View
                    </button>
                    <a
                      href={getResellerDocumentDownloadUrl(document.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selectedDocument}
        onClose={() => setSelectedDocument(null)}
        title={selectedDocument?.fileName ?? "Document"}
        maxWidth="max-w-2xl"
      >
        {selectedDocument ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedDocument.description}</p>
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground space-y-1">
              <p>File size: {formatFileSize(selectedDocument.fileSize)}</p>
              <p>Last updated: {new Date(selectedDocument.updatedAt).toLocaleString("en-ZA")}</p>
              {selectedDocument.createdByName && <p>Shared by: {selectedDocument.createdByName}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setSelectedDocument(null)}
                className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5 transition-colors"
              >
                Close
              </button>
              <a
                href={getResellerDocumentDownloadUrl(selectedDocument.id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            </div>
          </div>
        ) : null}
      </Modal>
    </AppLayout>
  );
}