import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { chatThreadsTable, chatMessagesTable, resellersTable } from "@workspace/db";
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

function serializeThread(t: any) {
  return {
    id: t.id,
    resellerId: t.resellerId,
    subject: t.subject,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
  };
}

function serializeMessage(m: any) {
  return {
    id: m.id,
    threadId: m.threadId,
    authorRole: m.authorRole,
    message: m.message,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  };
}

async function ensureThreadForReseller(resellerId: number) {
  await db
    .insert(chatThreadsTable)
    .values({ resellerId, subject: "Support chat", updatedAt: new Date() })
    .onConflictDoNothing();
  const [thread] = await db.select().from(chatThreadsTable).where(eq(chatThreadsTable.resellerId, resellerId));
  return thread!;
}

// ── Reseller ─────────────────────────────────────────────────────────────────

router.get("/chat/thread", requireReseller, async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const thread = await ensureThreadForReseller(resellerId);
    return res.json(serializeThread(thread));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/chat/messages", requireReseller, async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const thread = await ensureThreadForReseller(resellerId);
    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.threadId, thread.id))
      .orderBy(desc(chatMessagesTable.createdAt));
    return res.json(messages.map(serializeMessage));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/chat/unread-count", requireReseller, async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const thread = await ensureThreadForReseller(resellerId);
    // Unread = latest message in thread is from admin (admin replied, reseller hasn't replied back)
    const result = await db.execute(sql`
      SELECT author_role FROM chat_messages
      WHERE thread_id = ${thread.id}
      ORDER BY id DESC
      LIMIT 1
    `);
    const lastAuthor = (result.rows[0] as any)?.author_role ?? null;
    return res.json({ count: lastAuthor === "admin" ? 1 : 0 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/chat/messages", requireReseller, async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const { message } = req.body ?? {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const thread = await ensureThreadForReseller(resellerId);
    const [{ id }] = await db
      .insert(chatMessagesTable)
      .values({ threadId: thread.id, authorRole: "reseller", resellerId, adminId: null, message: message.trim() })
      .returning();
    await db.update(chatThreadsTable).set({ updatedAt: new Date() }).where(eq(chatThreadsTable.id, thread.id));

    const [created] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, id));
    if (!created) return res.status(500).json({ error: "Failed to create message" });
    return res.status(201).json(serializeMessage(created));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin ────────────────────────────────────────────────────────────────────

router.get("/admin/chat/unread-count", requireAdmin, async (_req, res) => {
  try {
    // Count threads where the most recent message is from a reseller (not admin)
    const result = await db.execute(sql`
      SELECT COUNT(*) AS count FROM chat_threads t
      WHERE EXISTS (
        SELECT 1 FROM chat_messages m
        WHERE m.thread_id = t.id
          AND m.author_role = 'reseller'
          AND m.id = (SELECT MAX(m2.id) FROM chat_messages m2 WHERE m2.thread_id = t.id)
      )
    `);
    const row = result.rows[0];
    return res.json({ count: Number((row as any)?.count ?? 0) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/chat/threads", requireAdmin, async (_req, res) => {
  try {
    // Ensure every active reseller has a thread so admin can initiate chats
    const activeResellers = await db
      .select({ id: resellersTable.id })
      .from(resellersTable)
      .where(eq(resellersTable.status, "active"));

    if (activeResellers.length > 0) {
      // Use epoch date so empty threads sort below threads with real messages
      await db
        .insert(chatThreadsTable)
        .values(activeResellers.map((r) => ({ resellerId: r.id, subject: "Support chat", updatedAt: new Date(0) })))
        .onConflictDoNothing();
    }

    const rows = await db
      .select({
        id: chatThreadsTable.id,
        resellerId: chatThreadsTable.resellerId,
        subject: chatThreadsTable.subject,
        createdAt: chatThreadsTable.createdAt,
        updatedAt: chatThreadsTable.updatedAt,
        resellerCompanyName: resellersTable.companyName,
      })
      .from(chatThreadsTable)
      .leftJoin(resellersTable, eq(chatThreadsTable.resellerId, resellersTable.id))
      .orderBy(desc(chatThreadsTable.updatedAt));

    const threadIds = rows.map((r) => r.id);

    let lastMessages: { threadId: number; authorRole: string; message: string }[] = [];
    if (threadIds.length > 0) {
      const result = await db.execute(sql`
        SELECT DISTINCT ON (thread_id) thread_id, author_role, message
        FROM chat_messages
        WHERE thread_id = ANY(${sql.raw(`ARRAY[${threadIds.join(",")}]`)})
        ORDER BY thread_id, id DESC
      `);
      lastMessages = (result.rows as any[]).map((r) => ({
        threadId: Number(r.thread_id),
        authorRole: String(r.author_role),
        message: String(r.message),
      }));
    }

    const lastMessageByThread = Object.fromEntries(lastMessages.map((m) => [m.threadId, m]));

    return res.json(
      rows.map((r) => ({
        ...serializeThread(r),
        resellerCompanyName: r.resellerCompanyName ?? null,
        lastMessageAuthor: lastMessageByThread[r.id]?.authorRole ?? null,
        lastMessagePreview: lastMessageByThread[r.id]?.message?.slice(0, 80) ?? null,
      })),
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/chat/threads/:id/messages", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [thread] = await db.select().from(chatThreadsTable).where(eq(chatThreadsTable.id, id));
    if (!thread) return res.status(404).json({ error: "Not found" });

    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.threadId, id))
      .orderBy(desc(chatMessagesTable.createdAt));
    return res.json(messages.map(serializeMessage));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/chat/threads/:id/messages", requireAdmin, async (req, res) => {
  try {
    const adminId = (req.session as any).userId;
    const id = parseInt(String(req.params.id), 10);
    const { message } = req.body ?? {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const [thread] = await db.select().from(chatThreadsTable).where(eq(chatThreadsTable.id, id));
    if (!thread) return res.status(404).json({ error: "Not found" });

    const [{ id: msgId }] = await db
      .insert(chatMessagesTable)
      .values({ threadId: id, authorRole: "admin", resellerId: null, adminId, message: message.trim() })
      .returning();
    await db.update(chatThreadsTable).set({ updatedAt: new Date() }).where(eq(chatThreadsTable.id, id));

    const [created] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, msgId));
    if (!created) return res.status(500).json({ error: "Failed to create message" });
    return res.status(201).json(serializeMessage(created));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/chat/threads", requireAdmin, async (req, res) => {
  try {
    const { resellerId } = req.body ?? {};
    const id = Number(resellerId);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "resellerId is required" });
    const thread = await ensureThreadForReseller(id);
    return res.status(201).json(serializeThread(thread));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

