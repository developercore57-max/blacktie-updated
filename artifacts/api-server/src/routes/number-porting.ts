import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { db, numberPortingRequestsTable, resellersTable, clientsTable } from "@workspace/db";
import { eq, desc, and, sql } from "@workspace/db";
import { uploadBuffer, deleteObject, streamToResponse } from "../lib/gcsStorage";

const router: IRouter = Router();

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt", ".png", ".jpg", ".jpeg", ".zip",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error("Unsupported file type"));
      return;
    }
    cb(null, true);
  },
});

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

function serializeRequest(r: any) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

// ── Reseller: list own porting requests ─────────────────────────────────────

router.get("/reseller/number-porting", requireReseller, async (req, res) => {
  try {
    const session = req.session as any;
    const rows = await db
      .select({
        id: numberPortingRequestsTable.id,
        resellerId: numberPortingRequestsTable.resellerId,
        clientId: numberPortingRequestsTable.clientId,
        portingNumbers: numberPortingRequestsTable.portingNumbers,
        currentProvider: numberPortingRequestsTable.currentProvider,
        accountNumber: numberPortingRequestsTable.accountNumber,
        contactName: numberPortingRequestsTable.contactName,
        contactEmail: numberPortingRequestsTable.contactEmail,
        contactPhone: numberPortingRequestsTable.contactPhone,
        portingDate: numberPortingRequestsTable.portingDate,
        notes: numberPortingRequestsTable.notes,
        attachments: numberPortingRequestsTable.attachments,
        status: numberPortingRequestsTable.status,
        createdAt: numberPortingRequestsTable.createdAt,
        updatedAt: numberPortingRequestsTable.updatedAt,
      })
      .from(numberPortingRequestsTable)
      .where(eq(numberPortingRequestsTable.resellerId, session.userId))
      .orderBy(desc(numberPortingRequestsTable.createdAt));
    return res.json(rows.map(serializeRequest));
  } catch (err) {
    console.error("List reseller porting requests error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller: create porting request ────────────────────────────────────────

async function runMultiUpload(req: Request, res: Response): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    upload.array("files", 5)(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

router.post("/reseller/number-porting", requireReseller, async (req, res) => {
  try {
    await runMultiUpload(req, res);
    const session = req.session as any;
    const { clientId, portingNumbers, currentProvider, accountNumber, contactName, contactEmail, contactPhone, portingDate, notes } = req.body ?? {};

    if (!portingNumbers || !String(portingNumbers).trim()) {
      return res.status(400).json({ error: "At least one porting number is required" });
    }
    if (!currentProvider || !String(currentProvider).trim()) {
      return res.status(400).json({ error: "Current provider is required" });
    }
    if (!contactName || !String(contactName).trim()) {
      return res.status(400).json({ error: "Contact name is required" });
    }

    let parsedClientId: number | null = null;
    if (clientId != null && String(clientId).trim() !== "") {
      parsedClientId = Number(clientId);
      if (!Number.isFinite(parsedClientId) || parsedClientId <= 0) {
        return res.status(400).json({ error: "clientId must be a positive number" });
      }
      const [client] = await db
        .select({ id: clientsTable.id })
        .from(clientsTable)
        .where(and(eq(clientsTable.id, parsedClientId), eq(clientsTable.resellerId, session.userId)));
      if (!client) return res.status(400).json({ error: "Client not found for this reseller" });
    }

    const files = (req.files as Express.Multer.File[]) || [];

    const uploadedPaths: string[] = [];
    const attachments: Array<{ storedName: string; originalName: string; mimeType: string; size: number }> = [];
    for (const f of files) {
      const ext = path.extname(f.originalname).toLowerCase() || ".bin";
      const storedName = `${randomUUID()}${ext}`;
      const gcsPath = `porting/${storedName}`;
      await uploadBuffer(gcsPath, f.buffer, f.mimetype || "application/octet-stream");
      uploadedPaths.push(gcsPath);
      attachments.push({
        storedName,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
      });
    }

    let created;
    try {
      const [{ id }] = await db
        .insert(numberPortingRequestsTable)
        .values({
          resellerId: session.userId,
          clientId: parsedClientId,
          portingNumbers: String(portingNumbers).trim(),
          currentProvider: String(currentProvider).trim(),
          accountNumber: accountNumber ? String(accountNumber).trim() : null,
          contactName: String(contactName).trim(),
          contactEmail: contactEmail ? String(contactEmail).trim() : null,
          contactPhone: contactPhone ? String(contactPhone).trim() : null,
          portingDate: portingDate ? String(portingDate).trim() : null,
          notes: notes ? String(notes).trim() : null,
          attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
          status: "pending",
        })
        .returning();

      [created] = await db
        .select()
        .from(numberPortingRequestsTable)
        .where(eq(numberPortingRequestsTable.id, id));
    } catch (dbErr) {
      await Promise.all(uploadedPaths.map((p) => deleteObject(p)));
      throw dbErr;
    }

    return res.status(201).json(serializeRequest(created));
  } catch (err) {
    console.error("Create porting request error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: pending porting requests count ───────────────────────────────────

router.get("/admin/number-porting/count", requireAdmin, async (_req, res) => {
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(numberPortingRequestsTable)
      .where(eq(numberPortingRequestsTable.status, "pending"));
    return res.json({ count: Number(row?.count ?? 0) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: list all porting requests ────────────────────────────────────────

router.get("/admin/number-porting", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const rows = await db
      .select({
        id: numberPortingRequestsTable.id,
        resellerId: numberPortingRequestsTable.resellerId,
        resellerName: resellersTable.companyName,
        resellerEmail: resellersTable.email,
        clientId: numberPortingRequestsTable.clientId,
        portingNumbers: numberPortingRequestsTable.portingNumbers,
        currentProvider: numberPortingRequestsTable.currentProvider,
        accountNumber: numberPortingRequestsTable.accountNumber,
        contactName: numberPortingRequestsTable.contactName,
        contactEmail: numberPortingRequestsTable.contactEmail,
        contactPhone: numberPortingRequestsTable.contactPhone,
        portingDate: numberPortingRequestsTable.portingDate,
        notes: numberPortingRequestsTable.notes,
        adminNotes: numberPortingRequestsTable.adminNotes,
        attachments: numberPortingRequestsTable.attachments,
        status: numberPortingRequestsTable.status,
        createdAt: numberPortingRequestsTable.createdAt,
        updatedAt: numberPortingRequestsTable.updatedAt,
      })
      .from(numberPortingRequestsTable)
      .leftJoin(resellersTable, eq(numberPortingRequestsTable.resellerId, resellersTable.id))
      .where(status ? eq(numberPortingRequestsTable.status, String(status)) : undefined)
      .orderBy(desc(numberPortingRequestsTable.createdAt));
    return res.json(rows.map(serializeRequest));
  } catch (err) {
    console.error("List admin porting requests error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: update porting request status / notes ────────────────────────────

router.put("/admin/number-porting/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid request ID" });
    }

    const [existing] = await db
      .select()
      .from(numberPortingRequestsTable)
      .where(eq(numberPortingRequestsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Porting request not found" });

    const { status, adminNotes } = req.body ?? {};
    const updates: Record<string, any> = {};

    if (status !== undefined) {
      const allowed = ["pending", "in_progress", "approved", "completed", "rejected"];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${allowed.join(", ")}` });
      }
      updates.status = status;
    }
    if (adminNotes !== undefined) {
      updates.adminNotes = adminNotes || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    await db
      .update(numberPortingRequestsTable)
      .set(updates)
      .where(eq(numberPortingRequestsTable.id, id));

    const [updated] = await db
      .select()
      .from(numberPortingRequestsTable)
      .where(eq(numberPortingRequestsTable.id, id));

    return res.json(serializeRequest(updated));
  } catch (err) {
    console.error("Update porting request error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Download porting attachment ─────────────────────────────────────────────

router.get("/number-porting/attachments/:storedName", async (req, res) => {
  const session = req.session as any;
  if (!session.userId) return res.status(401).json({ error: "Not authenticated" });

  const storedName = path.basename(String(req.params.storedName));
  const gcsPath = `porting/${storedName}`;

  try {
    await streamToResponse(gcsPath, res, storedName);
  } catch (err) {
    console.error("Download porting attachment error:", err);
    if (!res.headersSent) {
      return res.status(404).json({ error: "File not found" });
    }
  }
});

export default router;
