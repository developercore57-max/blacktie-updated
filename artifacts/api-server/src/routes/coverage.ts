import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  coverageCheckRequestsTable,
  coverageCheckCommentsTable,
  resellersTable,
  clientsTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "@workspace/db";

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

function serializeRequest(r: any) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

function serializeComment(c: any) {
  return {
    id: c.id,
    requestId: c.requestId,
    authorRole: c.authorRole,
    message: c.message,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  };
}

// ── Reseller: list requests ───────────────────────────────────────────────────

router.get("/coverage/requests", requireReseller, async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const rows = await db
      .select()
      .from(coverageCheckRequestsTable)
      .where(eq(coverageCheckRequestsTable.resellerId, resellerId))
      .orderBy(desc(coverageCheckRequestsTable.createdAt));
    return res.json(rows.map(serializeRequest));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/coverage/requests", requireReseller, async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const {
      clientId,
      serviceType,
      address,
      unitStreetNumber,
      buildingComplex,
      streetName,
      address2,
      suburb,
      city,
      province,
      contactName,
      contactEmail,
      contactPhone,
      notes,
    } = req.body ?? {};

    let finalAddress = typeof address === "string" ? address.trim() : "";
    if (!finalAddress) {
      const parts = [unitStreetNumber, buildingComplex, streetName].filter((v) => v && String(v).trim().length > 0).map(String);
      finalAddress = parts.join(", ");
    }
    if (!finalAddress) return res.status(400).json({ error: "Address is required" });

    let parsedClientId: number | null = null;
    if (clientId != null && String(clientId).trim() !== "") {
      parsedClientId = Number(clientId);
      if (!Number.isFinite(parsedClientId) || parsedClientId <= 0) {
        return res.status(400).json({ error: "clientId must be a positive number" });
      }
      const [client] = await db
        .select({ id: clientsTable.id })
        .from(clientsTable)
        .where(and(eq(clientsTable.id, parsedClientId), eq(clientsTable.resellerId, resellerId)));
      if (!client) return res.status(400).json({ error: "Client not found for this reseller" });
    }

    const [{ id }] = await db
      .insert(coverageCheckRequestsTable)
      .values({
        resellerId,
        clientId: parsedClientId,
        serviceType: serviceType || "fibre",
        address: finalAddress,
        unitStreetNumber: unitStreetNumber || null,
        buildingComplex: buildingComplex || null,
        streetName: streetName || null,
        address2: address2 || null,
        suburb: suburb || null,
        city: city || null,
        province: province || null,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        notes: notes || null,
        status: "pending",
        updatedAt: new Date(),
      })
      .returning();

    const [created] = await db.select().from(coverageCheckRequestsTable).where(eq(coverageCheckRequestsTable.id, id));
    if (!created) return res.status(500).json({ error: "Failed to create request" });
    return res.status(201).json(serializeRequest(created));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/coverage/requests/:id", requireReseller, async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const id = parseInt(String(req.params.id), 10);
    const [row] = await db.select().from(coverageCheckRequestsTable).where(eq(coverageCheckRequestsTable.id, id));
    if (!row || row.resellerId !== resellerId) return res.status(404).json({ error: "Not found" });

    const comments = await db
      .select()
      .from(coverageCheckCommentsTable)
      .where(eq(coverageCheckCommentsTable.requestId, id))
      .orderBy(desc(coverageCheckCommentsTable.createdAt));

    return res.json({ ...serializeRequest(row), comments: comments.map(serializeComment) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/coverage/requests/:id/comments", requireReseller, async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const id = parseInt(String(req.params.id), 10);
    const [row] = await db.select().from(coverageCheckRequestsTable).where(eq(coverageCheckRequestsTable.id, id));
    if (!row || row.resellerId !== resellerId) return res.status(404).json({ error: "Not found" });

    const comments = await db
      .select()
      .from(coverageCheckCommentsTable)
      .where(eq(coverageCheckCommentsTable.requestId, id))
      .orderBy(desc(coverageCheckCommentsTable.createdAt));
    return res.json(comments.map(serializeComment));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/coverage/requests/:id/comments", requireReseller, async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const id = parseInt(String(req.params.id), 10);
    const { message } = req.body ?? {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const [row] = await db.select().from(coverageCheckRequestsTable).where(eq(coverageCheckRequestsTable.id, id));
    if (!row || row.resellerId !== resellerId) return res.status(404).json({ error: "Not found" });

    const [{ id: commentId }] = await db
      .insert(coverageCheckCommentsTable)
      .values({ requestId: id, authorRole: "reseller", resellerId, adminId: null, message: message.trim() })
      .returning();
    const [created] = await db.select().from(coverageCheckCommentsTable).where(eq(coverageCheckCommentsTable.id, commentId));
    if (!created) return res.status(500).json({ error: "Failed to create comment" });
    return res.status(201).json(serializeComment(created));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: list requests ──────────────────────────────────────────────────────

router.get("/admin/coverage/requests/count", requireAdmin, async (_req, res) => {
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(coverageCheckRequestsTable)
      .where(eq(coverageCheckRequestsTable.status, "pending"));
    return res.json({ count: Number(row?.count ?? 0) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/coverage/requests", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(coverageCheckRequestsTable)
      .orderBy(desc(coverageCheckRequestsTable.createdAt));
    return res.json(rows.map(serializeRequest));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/coverage/requests/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [row] = await db.select().from(coverageCheckRequestsTable).where(eq(coverageCheckRequestsTable.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });

    const comments = await db
      .select()
      .from(coverageCheckCommentsTable)
      .where(eq(coverageCheckCommentsTable.requestId, id))
      .orderBy(desc(coverageCheckCommentsTable.createdAt));

    return res.json({ ...serializeRequest(row), comments: comments.map(serializeComment) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/coverage/requests/:id/comments", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const comments = await db
      .select()
      .from(coverageCheckCommentsTable)
      .where(eq(coverageCheckCommentsTable.requestId, id))
      .orderBy(desc(coverageCheckCommentsTable.createdAt));
    return res.json(comments.map(serializeComment));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/coverage/requests/:id/comments", requireAdmin, async (req, res) => {
  try {
    const adminId = (req.session as any).userId;
    const id = parseInt(String(req.params.id), 10);
    const { message } = req.body ?? {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const [row] = await db.select().from(coverageCheckRequestsTable).where(eq(coverageCheckRequestsTable.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });

    const [{ id: commentId }] = await db
      .insert(coverageCheckCommentsTable)
      .values({ requestId: id, authorRole: "admin", resellerId: null, adminId, message: message.trim() })
      .returning();
    const [created] = await db.select().from(coverageCheckCommentsTable).where(eq(coverageCheckCommentsTable.id, commentId));
    if (!created) return res.status(500).json({ error: "Failed to create comment" });
    return res.status(201).json(serializeComment(created));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/coverage/requests/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [row] = await db.select({ id: coverageCheckRequestsTable.id }).from(coverageCheckRequestsTable).where(eq(coverageCheckRequestsTable.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });
    await db.delete(coverageCheckCommentsTable).where(eq(coverageCheckCommentsTable.requestId, id));
    await db.delete(coverageCheckRequestsTable).where(eq(coverageCheckRequestsTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/coverage/requests/:id/status", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { status } = req.body ?? {};
    if (!status || typeof status !== "string") return res.status(400).json({ error: "Status is required" });

    await db
      .update(coverageCheckRequestsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(coverageCheckRequestsTable.id, id));
    const [updated] = await db.select().from(coverageCheckRequestsTable).where(eq(coverageCheckRequestsTable.id, id));
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(serializeRequest(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
