import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { adminsTable, db, documentsTable } from "@workspace/db";
import { desc, eq } from "@workspace/db";
import { uploadBuffer, downloadBuffer, deleteObject, streamToResponse } from "../lib/gcsStorage";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session.userId || session.userRole !== "admin") {
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
}

function requireReseller(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session.userId || session.userRole !== "reseller") {
    return res.status(401).json({ error: "Reseller access required" });
  }
  next();
}

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
  ".ppt",
  ".pptx",
  ".zip",
  ".png",
  ".jpg",
  ".jpeg",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error("Unsupported file type"));
      return;
    }
    cb(null, true);
  },
});

function normalizeFileName(rawName: string): string {
  const cleaned = path
    .basename(rawName)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "document";
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function serializeDocument(document: any) {
  return {
    ...document,
    fileSize: Number(document.fileSize ?? 0),
    isActive: Boolean(document.isActive),
    createdAt: document.createdAt instanceof Date ? document.createdAt.toISOString() : document.createdAt,
    updatedAt: document.updatedAt instanceof Date ? document.updatedAt.toISOString() : document.updatedAt,
  };
}

async function runUpload(req: Request, res: Response): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    upload.single("file")(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function getDocumentWithUploader(id: number) {
  const [document] = await db
    .select({
      id: documentsTable.id,
      fileName: documentsTable.fileName,
      storedName: documentsTable.storedName,
      description: documentsTable.description,
      mimeType: documentsTable.mimeType,
      fileSize: documentsTable.fileSize,
      isActive: documentsTable.isActive,
      createdByAdminId: documentsTable.createdByAdminId,
      createdByName: adminsTable.name,
      createdAt: documentsTable.createdAt,
      updatedAt: documentsTable.updatedAt,
    })
    .from(documentsTable)
    .leftJoin(adminsTable, eq(documentsTable.createdByAdminId, adminsTable.id))
    .where(eq(documentsTable.id, id));

  return document ? serializeDocument(document) : null;
}

router.get("/admin/documents", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: documentsTable.id,
        fileName: documentsTable.fileName,
        storedName: documentsTable.storedName,
        description: documentsTable.description,
        mimeType: documentsTable.mimeType,
        fileSize: documentsTable.fileSize,
        isActive: documentsTable.isActive,
        createdByAdminId: documentsTable.createdByAdminId,
        createdByName: adminsTable.name,
        createdAt: documentsTable.createdAt,
        updatedAt: documentsTable.updatedAt,
      })
      .from(documentsTable)
      .leftJoin(adminsTable, eq(documentsTable.createdByAdminId, adminsTable.id))
      .orderBy(desc(documentsTable.createdAt));

    return res.json(rows.map(serializeDocument));
  } catch (error) {
    console.error("List admin documents error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/documents", requireAdmin, async (req, res) => {
  let gcsPath: string | null = null;
  try {
    await runUpload(req, res);

    const file = req.file;
    const description = String(req.body.description ?? "").trim();
    const isActive = parseBoolean(req.body.isActive, true);

    if (!file) {
      return res.status(400).json({ error: "Document file is required" });
    }

    if (!description) {
      return res.status(400).json({ error: "Description is required" });
    }

    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    gcsPath = `documents/${randomUUID()}${ext}`;

    await uploadBuffer(gcsPath, file.buffer, file.mimetype || "application/octet-stream");

    const session = req.session as any;
    const [{ id }] = await db
      .insert(documentsTable)
      .values({
        fileName: normalizeFileName(file.originalname),
        storedName: gcsPath,
        description,
        mimeType: file.mimetype || null,
        fileSize: file.size,
        isActive,
        createdByAdminId: session.userId,
      })
      .returning();

    const document = await getDocumentWithUploader(id);
    if (!document) {
      await deleteObject(gcsPath);
      gcsPath = null;
      return res.status(500).json({ error: "Failed to create document" });
    }

    gcsPath = null;
    return res.status(201).json(document);
  } catch (error) {
    if (gcsPath) {
      await deleteObject(gcsPath);
    }
    console.error("Create document error:", error);
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "Unsupported file type") {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/documents/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [existing] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
    if (!existing) {
      return res.status(404).json({ error: "Document not found" });
    }

    const updateData: any = { updatedAt: new Date() };
    if (req.body.description !== undefined) {
      const description = String(req.body.description).trim();
      if (!description) {
        return res.status(400).json({ error: "Description is required" });
      }
      updateData.description = description;
    }
    if (req.body.isActive !== undefined) {
      updateData.isActive = parseBoolean(req.body.isActive, Boolean(existing.isActive));
    }

    await db.update(documentsTable).set(updateData).where(eq(documentsTable.id, id));
    const document = await getDocumentWithUploader(id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    return res.json(document);
  } catch (error) {
    console.error("Update document error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/documents/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [existing] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
    if (!existing) {
      return res.status(404).json({ error: "Document not found" });
    }

    await db.delete(documentsTable).where(eq(documentsTable.id, id));
    await deleteObject(existing.storedName);
    return res.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/documents/:id/download", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [document] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    await streamToResponse(document.storedName, res, document.fileName, document.mimeType);
  } catch (error) {
    console.error("Admin download document error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
});

router.get("/reseller/documents", requireReseller, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: documentsTable.id,
        fileName: documentsTable.fileName,
        storedName: documentsTable.storedName,
        description: documentsTable.description,
        mimeType: documentsTable.mimeType,
        fileSize: documentsTable.fileSize,
        isActive: documentsTable.isActive,
        createdByAdminId: documentsTable.createdByAdminId,
        createdByName: adminsTable.name,
        createdAt: documentsTable.createdAt,
        updatedAt: documentsTable.updatedAt,
      })
      .from(documentsTable)
      .leftJoin(adminsTable, eq(documentsTable.createdByAdminId, adminsTable.id))
      .where(eq(documentsTable.isActive, true))
      .orderBy(desc(documentsTable.createdAt));

    return res.json(rows.map(serializeDocument));
  } catch (error) {
    console.error("List reseller documents error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reseller/documents/:id/download", requireReseller, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [document] = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, id));

    if (!document || !document.isActive) {
      return res.status(404).json({ error: "Document not found" });
    }

    await streamToResponse(document.storedName, res, document.fileName, document.mimeType);
  } catch (error) {
    console.error("Reseller download document error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;
