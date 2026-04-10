import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { noticesTable, adminsTable } from "@workspace/db";
import { eq, desc, and, or, isNull, gte, sql } from "@workspace/db";

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

function serializeNotice(n: any) {
  return {
    ...n,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
    updatedAt: n.updatedAt instanceof Date ? n.updatedAt.toISOString() : n.updatedAt,
    expiresAt: n.expiresAt instanceof Date ? n.expiresAt.toISOString() : (n.expiresAt ?? null),
  };
}

// ── Admin: list all notices ───────────────────────────────────────────────────

router.get("/admin/notices", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: noticesTable.id,
        title: noticesTable.title,
        content: noticesTable.content,
        type: noticesTable.type,
        priority: noticesTable.priority,
        isActive: noticesTable.isActive,
        expiresAt: noticesTable.expiresAt,
        createdByAdminId: noticesTable.createdByAdminId,
        createdByName: adminsTable.name,
        createdAt: noticesTable.createdAt,
        updatedAt: noticesTable.updatedAt,
      })
      .from(noticesTable)
      .leftJoin(adminsTable, eq(noticesTable.createdByAdminId, adminsTable.id))
      .orderBy(desc(noticesTable.priority), desc(noticesTable.createdAt));
    return res.json(rows.map(serializeNotice));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: create notice ──────────────────────────────────────────────────────

router.post("/admin/notices", requireAdmin, async (req, res) => {
  try {
    const session = req.session as any;
    const { title, content, type, priority, isActive, expiresAt } = req.body;
    if (!title || !content) return res.status(400).json({ error: "Title and content are required" });
    const [{ id }] = await db
      .insert(noticesTable)
      .values({
        title,
        content,
        type: type || "info",
        priority: priority ?? 0,
        isActive: isActive !== false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdByAdminId: session.userId,
      })
      .returning();
    const [row] = await db.select().from(noticesTable).where(eq(noticesTable.id, id));
    if (!row) return res.status(500).json({ error: "Failed to create notice" });
    return res.status(201).json(serializeNotice(row));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: update notice ──────────────────────────────────────────────────────

router.put("/admin/notices/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { title, content, type, priority, isActive, expiresAt } = req.body;
    const upd: any = { updatedAt: new Date() };
    if (title !== undefined) upd.title = title;
    if (content !== undefined) upd.content = content;
    if (type !== undefined) upd.type = type;
    if (priority !== undefined) upd.priority = priority;
    if (isActive !== undefined) upd.isActive = isActive;
    if (expiresAt !== undefined) upd.expiresAt = expiresAt ? new Date(expiresAt) : null;
    await db.update(noticesTable).set(upd).where(eq(noticesTable.id, id));
    const [row] = await db.select().from(noticesTable).where(eq(noticesTable.id, id));
    if (!row) return res.status(404).json({ error: "Notice not found" });
    return res.json(serializeNotice(row));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: delete notice ──────────────────────────────────────────────────────

router.delete("/admin/notices/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(noticesTable).where(eq(noticesTable.id, id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller: get active notices ──────────────────────────────────────────────

router.get("/notices", requireReseller, async (_req, res) => {
  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(noticesTable)
      .where(
        and(
          eq(noticesTable.isActive, true),
          or(isNull(noticesTable.expiresAt), gte(noticesTable.expiresAt, now))
        )
      )
      .orderBy(desc(noticesTable.priority), desc(noticesTable.createdAt));
    return res.json(rows.map(serializeNotice));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
