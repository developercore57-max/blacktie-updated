import { Storage } from "@google-cloud/storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const gcsClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

/**
 * Returns the GCS bucket name and private object prefix from PRIVATE_OBJECT_DIR.
 * PRIVATE_OBJECT_DIR format: /<bucketId>/<prefix>
 * e.g. /replit-objstore-abc123/.private → bucket=replit-objstore-abc123, prefix=.private
 */
function getStorageConfig(): { bucketId: string; prefix: string } {
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR env var not set");
  const parts = dir.replace(/^\//, "").split("/");
  const bucketId = parts[0];
  const prefix = parts.slice(1).join("/");
  if (!bucketId) throw new Error("PRIVATE_OBJECT_DIR has no bucket component");
  return { bucketId, prefix };
}

/** Build the full GCS object name for a given relative path. */
function objectName(relPath: string): string {
  const { prefix } = getStorageConfig();
  return prefix ? `${prefix}/${relPath}` : relPath;
}

export async function uploadBuffer(
  relPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const { bucketId } = getStorageConfig();
  const bucket = gcsClient.bucket(bucketId);
  const file = bucket.file(objectName(relPath));
  await file.save(buffer, { contentType, resumable: false });
}

export async function downloadBuffer(relPath: string): Promise<Buffer> {
  const { bucketId } = getStorageConfig();
  const bucket = gcsClient.bucket(bucketId);
  const file = bucket.file(objectName(relPath));
  const [contents] = await file.download();
  return contents;
}

export async function deleteObject(relPath: string): Promise<void> {
  try {
    const { bucketId } = getStorageConfig();
    const bucket = gcsClient.bucket(bucketId);
    const file = bucket.file(objectName(relPath));
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
    }
  } catch (err) {
    console.warn("Failed to delete GCS object:", relPath, err);
  }
}

export async function streamToResponse(
  relPath: string,
  res: import("express").Response,
  fileName: string,
  mimeType?: string | null,
): Promise<void> {
  const { bucketId } = getStorageConfig();
  const bucket = gcsClient.bucket(bucketId);
  const file = bucket.file(objectName(relPath));

  const [exists] = await file.exists();
  if (!exists) {
    res.status(404).json({ error: "Document file not found" });
    return;
  }

  if (mimeType) {
    res.setHeader("Content-Type", mimeType);
  }
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);

  await new Promise<void>((resolve, reject) => {
    file
      .createReadStream()
      .on("error", (err) => {
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to download document" });
        }
        reject(err);
      })
      .on("end", resolve)
      .pipe(res);
  });
}
