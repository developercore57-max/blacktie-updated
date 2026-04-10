export interface PortalDocument {
  id: number;
  fileName: string;
  storedName: string;
  description: string;
  mimeType: string | null;
  fileSize: number;
  isActive: boolean;
  createdByAdminId: number | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Returns true if the document's file exists in persistent GCS storage.
 * Documents uploaded before the GCS migration have bare UUID storedNames
 * (e.g. "e3bdddb1-...pdf") — their files are gone and cannot be recovered.
 * Post-migration documents use prefixed paths like "documents/uuid.pdf".
 */
export function isDocumentInStorage(doc: { storedName: string }): boolean {
  return doc.storedName.startsWith("documents/");
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `HTTP ${response.status}`;

  try {
    const data = await response.json();
    if (typeof data?.error === "string" && data.error.trim()) {
      return data.error;
    }
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", ...options });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json() as Promise<T>;
}

export async function uploadAdminDocument(formData: FormData): Promise<PortalDocument> {
  const response = await fetch("/api/admin/documents", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json() as Promise<PortalDocument>;
}

export async function updateAdminDocument(
  id: number,
  data: { description: string; isActive: boolean },
): Promise<PortalDocument> {
  return apiFetch<PortalDocument>(`/api/admin/documents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteAdminDocument(id: number): Promise<void> {
  await apiFetch(`/api/admin/documents/${id}`, { method: "DELETE" });
}

export function getAdminDocumentDownloadUrl(id: number): string {
  return `/api/admin/documents/${id}/download`;
}

export function getResellerDocumentDownloadUrl(id: number): string {
  return `/api/reseller/documents/${id}/download`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}