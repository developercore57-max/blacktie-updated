import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, orderCommentsTable, resellersTable, didsTable, adminsTable, clientsTable } from "@workspace/db";
import { eq, desc, sql, and, inArray } from "@workspace/db";
import { sendOrderEmails } from "../lib/email";

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

function serializeOrder(o: any) {
  const itemCount = o.itemCount;
  return {
    ...o,
    itemCount: itemCount != null ? Number(itemCount) : itemCount,
    totalExclVat: Number(o.totalExclVat ?? 0),
    totalInclVat: Number(o.totalInclVat ?? 0),
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt,
  };
}

function serializeItem(i: any) {
  return {
    ...i,
    unitPriceExclVat: Number(i.unitPriceExclVat ?? 0),
    unitPriceInclVat: Number(i.unitPriceInclVat ?? 0),
    lineTotal: Number(i.lineTotal ?? 0),
    createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : i.createdAt,
  };
}

function serializeComment(c: any) {
  return {
    id: c.id,
    orderId: c.orderId,
    authorRole: c.authorRole,
    kind: c.kind,
    message: c.message,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  };
}

const MONTHLY_ITEM_TYPES = [
  "service", "voip", "did", "hosting", "bundle", "minute-bundle",
  "connectivity", "cybersecurity", "data_security", "web_dev",
];

async function syncClientMonthlyFee(clientId: number) {
  const result = await db
    .select({
      total: sql<string>`COALESCE(
        SUM(CAST(${orderItemsTable.unitPriceInclVat} AS NUMERIC) * ${orderItemsTable.quantity}),
        0
      )`,
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(and(
      eq(ordersTable.clientId, clientId),
      eq(ordersTable.status, "completed"),
      inArray(orderItemsTable.itemType, MONTHLY_ITEM_TYPES),
    ));
  const monthly = result[0]?.total ?? "0";
  await db.update(clientsTable).set({ monthlyFee: monthly })
    .where(eq(clientsTable.id, clientId));
}

// ── Admin: pending orders count ────────────────────────────────────────────────

router.get("/admin/orders/count", requireAdmin, async (_req, res) => {
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(eq(ordersTable.status, "pending"));
    return res.json({ count: Number(row?.count ?? 0) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: list all orders ────────────────────────────────────────────────────

router.get("/admin/orders", requireAdmin, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { status } = req.query;
    const rows = await db
      .select({
        id: ordersTable.id,
        resellerId: ordersTable.resellerId,
        resellerName: resellersTable.companyName,
        resellerEmail: resellersTable.email,
        status: ordersTable.status,
        notes: ordersTable.notes,
        adminNotes: ordersTable.adminNotes,
        totalExclVat: ordersTable.totalExclVat,
        totalInclVat: ordersTable.totalInclVat,
        itemCount: sql<number>`(select count(*) from order_items where order_id = ${ordersTable.id})`,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .leftJoin(resellersTable, eq(ordersTable.resellerId, resellersTable.id))
      .where(status ? eq(ordersTable.status, String(status)) : undefined)
      .orderBy(desc(ordersTable.createdAt));
    return res.json(rows.map(serializeOrder));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: create order for reseller ──────────────────────────────────────────

router.post("/admin/orders", requireAdmin, async (req, res) => {
  try {
    const { resellerId, clientId, notes, adminNotes, items } = req.body ?? {};
    const parsedResellerId = Number(resellerId);

    if (!Number.isFinite(parsedResellerId) || parsedResellerId <= 0) {
      return res.status(400).json({ error: "Valid resellerId is required" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order must have at least one item" });
    }

    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, parsedResellerId));
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    let parsedClientId: number | null = null;
    if (clientId != null && String(clientId).trim() !== "") {
      parsedClientId = Number(clientId);
      if (!Number.isFinite(parsedClientId) || parsedClientId <= 0) {
        return res.status(400).json({ error: "clientId must be a positive number" });
      }
      const [client] = await db
        .select({ id: clientsTable.id })
        .from(clientsTable)
        .where(and(eq(clientsTable.id, parsedClientId), eq(clientsTable.resellerId, parsedResellerId)));
      if (!client) return res.status(400).json({ error: "Client not found for this reseller" });
    }

    let totalExclVat = 0;
    let totalInclVat = 0;
    for (const item of items) {
      const qty = Number(item.quantity ?? 1);
      const excl = Number(item.unitPriceExclVat ?? 0);
      const incl = Number(item.unitPriceInclVat ?? excl * 1.15);
      if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: "Item quantity must be > 0" });
      if (!Number.isFinite(excl) || excl < 0) return res.status(400).json({ error: "Item unitPriceExclVat must be >= 0" });
      if (!Number.isFinite(incl) || incl < 0) return res.status(400).json({ error: "Item unitPriceInclVat must be >= 0" });
      totalExclVat += excl * qty;
      totalInclVat += incl * qty;
    }

    const [{ id: orderId }] = await db
      .insert(ordersTable)
      .values({
        resellerId: parsedResellerId,
        clientId: parsedClientId,
        status: "pending",
        notes: notes || null,
        adminNotes: adminNotes || null,
        totalExclVat: totalExclVat.toFixed(2),
        totalInclVat: totalInclVat.toFixed(2),
      })
      .returning();

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) return res.status(500).json({ error: "Failed to create order" });

    const itemRows = items.map((item: any) => {
      const qty = Number(item.quantity ?? 1);
      const excl = Number(item.unitPriceExclVat ?? 0);
      const incl = Number(item.unitPriceInclVat ?? excl * 1.15);
      return {
        orderId: order.id,
        itemType: item.itemType || "product",
        referenceId: item.referenceId || null,
        name: item.name,
        sku: item.sku || null,
        quantity: qty,
        unitPriceExclVat: excl.toFixed(2),
        unitPriceInclVat: incl.toFixed(2),
        lineTotal: (incl * qty).toFixed(2),
      };
    });

    await db.insert(orderItemsTable).values(itemRows);
    const savedItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));

    const didItems = savedItems.filter((item: any) => item.itemType === "did" && item.referenceId);
    for (const didItem of didItems) {
      const reserved = await db
        .update(didsTable)
        .set({ status: "reserved", reservedByOrderId: order.id })
        .where(and(eq(didsTable.id, didItem.referenceId!), eq(didsTable.status, "available")))
        .returning({ id: didsTable.id });
      if (reserved.length === 0) {
        await db.delete(ordersTable).where(eq(ordersTable.id, order.id));
        return res.status(409).json({ error: `DID ${didItem.name} is no longer available` });
      }
    }

    try {
      const adminRows = await db.select({ email: adminsTable.email }).from(adminsTable).where(eq(adminsTable.isActive, true));
      const adminEmails = adminRows.map((r) => r.email).filter(Boolean) as string[];
      await sendOrderEmails(
        {
          orderId: order.id,
          resellerName: reseller.companyName ?? "Reseller",
          resellerEmail: reseller.email ?? "",
          notes: order.notes,
          items: savedItems.map((i: any) => ({
            name: i.name,
            itemType: i.itemType,
            quantity: i.quantity,
            unitPriceExclVat: Number(i.unitPriceExclVat),
            unitPriceInclVat: Number(i.unitPriceInclVat),
            lineTotal: Number(i.lineTotal),
          })),
          totalExclVat: totalExclVat,
          totalInclVat: totalInclVat,
        },
        adminEmails,
      );
    } catch (emailErr) {
      console.error("[email] Failed to send order emails:", emailErr);
    }

    return res.status(201).json({
      ...serializeOrder(order),
      resellerName: reseller.companyName,
      resellerEmail: reseller.email,
      items: savedItems.map(serializeItem),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: get order detail with items ───────────────────────────────────────

router.get("/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [order] = await db
      .select({
        id: ordersTable.id,
        resellerId: ordersTable.resellerId,
        resellerName: resellersTable.companyName,
        resellerEmail: resellersTable.email,
        status: ordersTable.status,
        notes: ordersTable.notes,
        adminNotes: ordersTable.adminNotes,
        totalExclVat: ordersTable.totalExclVat,
        totalInclVat: ordersTable.totalInclVat,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .leftJoin(resellersTable, eq(ordersTable.resellerId, resellersTable.id))
      .where(eq(ordersTable.id, id));
    if (!order) return res.status(404).json({ error: "Order not found" });
    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, id));
    const comments = await db
      .select()
      .from(orderCommentsTable)
      .where(eq(orderCommentsTable.orderId, id))
      .orderBy(desc(orderCommentsTable.createdAt));
    return res.json({ ...serializeOrder(order), items: items.map(serializeItem), comments: comments.map(serializeComment) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/orders/:id/comments", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const comments = await db
      .select()
      .from(orderCommentsTable)
      .where(eq(orderCommentsTable.orderId, id))
      .orderBy(desc(orderCommentsTable.createdAt));
    return res.json(comments.map(serializeComment));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/orders/:id/comments", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const session = req.session as any;
    const { message, kind } = req.body ?? {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const [order] = await db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) return res.status(404).json({ error: "Order not found" });

    const [{ id: commentId }] = await db
      .insert(orderCommentsTable)
      .values({
        orderId: id,
        authorRole: "admin",
        adminId: session.userId,
        resellerId: null,
        kind: kind || "comment",
        message: message.trim(),
      })
      .returning();

    const [created] = await db.select().from(orderCommentsTable).where(eq(orderCommentsTable.id, commentId));
    if (!created) return res.status(500).json({ error: "Failed to create comment" });
    return res.status(201).json(serializeComment(created));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: update order status ────────────────────────────────────────────────

router.put("/admin/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { status, adminNotes } = req.body;
    const allowed = ["pending", "processing", "completed", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Fetch current order + DID items before updating
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) return res.status(404).json({ error: "Order not found" });

    const didItems = await db
      .select()
      .from(orderItemsTable)
      .where(and(eq(orderItemsTable.orderId, id), eq(orderItemsTable.itemType, "did")));

    if (status === "cancelled") {
      // Release any reserved DIDs back to available
      for (const item of didItems) {
        if (item.referenceId) {
          await db
            .update(didsTable)
            .set({ status: "available", reservedByOrderId: null })
            .where(and(eq(didsTable.id, item.referenceId), eq(didsTable.status, "reserved")));
        }
      }
    } else if (status === "completed") {
      // Assign reserved DIDs to the reseller
      for (const item of didItems) {
        if (item.referenceId) {
          await db
            .update(didsTable)
            .set({
              status: "assigned",
              resellerId: order.resellerId,
              assignedAt: new Date(),
              reservedByOrderId: null,
            })
            .where(eq(didsTable.id, item.referenceId));
        }
      }
    }

    const upd: any = { status, updatedAt: new Date() };
    if (adminNotes !== undefined) upd.adminNotes = adminNotes;
    await db.update(ordersTable).set(upd).where(eq(ordersTable.id, id));

    // Sync client monthly fee whenever a client-linked order changes status.
    // This covers completion, cancellation, and re-opening so the fee stays accurate.
    // TODO (Task #14): also call syncClientMonthlyFee after reseller activates an order
    // (sets clientId) in POST /api/orders/:id/activate.
    if (order.clientId) {
      await syncClientMonthlyFee(order.clientId);
    }

    const [updated] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!updated) return res.status(404).json({ error: "Order not found" });
    return res.json(serializeOrder(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: delete order ───────────────────────────────────────────────────────

router.delete("/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Release any reserved DIDs back to available
    const didItems = await db
      .select()
      .from(orderItemsTable)
      .where(and(eq(orderItemsTable.orderId, id), eq(orderItemsTable.itemType, "did")));

    for (const item of didItems) {
      if (item.referenceId) {
        await db
          .update(didsTable)
          .set({ status: "available", reservedByOrderId: null })
          .where(and(eq(didsTable.id, item.referenceId), eq(didsTable.status, "reserved")));
      }
    }

    // Delete comments, items, then the order
    await db.delete(orderCommentsTable).where(eq(orderCommentsTable.orderId, id));
    await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    await db.delete(ordersTable).where(eq(ordersTable.id, id));

    return res.json({ success: true });
  } catch (err) {
    console.error("Delete order error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller: list my orders ──────────────────────────────────────────────────

router.get("/orders", requireReseller, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const session = req.session as any;
    const rows = await db
      .select({
        id: ordersTable.id,
        resellerId: ordersTable.resellerId,
        clientId: ordersTable.clientId,
        clientName: clientsTable.companyName,
        status: ordersTable.status,
        notes: ordersTable.notes,
        adminNotes: ordersTable.adminNotes,
        totalExclVat: ordersTable.totalExclVat,
        totalInclVat: ordersTable.totalInclVat,
        itemCount: sql<number>`(select count(*) from order_items where order_id = ${ordersTable.id})`,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .leftJoin(clientsTable, eq(ordersTable.clientId, clientsTable.id))
      .where(eq(ordersTable.resellerId, session.userId))
      .orderBy(desc(ordersTable.createdAt));
    return res.json(rows.map(serializeOrder));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller: get order detail ────────────────────────────────────────────────

router.get("/orders/:id", requireReseller, async (req, res) => {
  try {
    const session = req.session as any;
    const id = parseInt(String(req.params.id), 10);
    const [row] = await db
      .select({
        id: ordersTable.id,
        resellerId: ordersTable.resellerId,
        clientId: ordersTable.clientId,
        clientName: clientsTable.companyName,
        status: ordersTable.status,
        notes: ordersTable.notes,
        adminNotes: ordersTable.adminNotes,
        totalExclVat: ordersTable.totalExclVat,
        totalInclVat: ordersTable.totalInclVat,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .leftJoin(clientsTable, eq(ordersTable.clientId, clientsTable.id))
      .where(eq(ordersTable.id, id));
    if (!row || row.resellerId !== session.userId) {
      return res.status(404).json({ error: "Order not found" });
    }
    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, id));
    const comments = await db
      .select()
      .from(orderCommentsTable)
      .where(eq(orderCommentsTable.orderId, id))
      .orderBy(desc(orderCommentsTable.createdAt));
    return res.json({ ...serializeOrder(row), items: items.map(serializeItem), comments: comments.map(serializeComment) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/:id/comments", requireReseller, async (req, res) => {
  try {
    const session = req.session as any;
    const id = parseInt(String(req.params.id), 10);
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order || order.resellerId !== session.userId) {
      return res.status(404).json({ error: "Order not found" });
    }

    const comments = await db
      .select()
      .from(orderCommentsTable)
      .where(eq(orderCommentsTable.orderId, id))
      .orderBy(desc(orderCommentsTable.createdAt));
    return res.json(comments.map(serializeComment));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders/:id/comments", requireReseller, async (req, res) => {
  try {
    const session = req.session as any;
    const id = parseInt(String(req.params.id), 10);
    const { message } = req.body ?? {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order || order.resellerId !== session.userId) {
      return res.status(404).json({ error: "Order not found" });
    }

    const [{ id: commentId }] = await db
      .insert(orderCommentsTable)
      .values({
        orderId: id,
        authorRole: "reseller",
        resellerId: session.userId,
        adminId: null,
        kind: "request",
        message: message.trim(),
      })
      .returning();

    const [created] = await db.select().from(orderCommentsTable).where(eq(orderCommentsTable.id, commentId));
    if (!created) return res.status(500).json({ error: "Failed to create comment" });
    return res.status(201).json(serializeComment(created));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller: activate order (link to a client) ──────────────────────────────

router.post("/orders/:id/activate", requireReseller, async (req, res) => {
  try {
    const session = req.session as any;
    const id = parseInt(String(req.params.id), 10);
    const { clientId } = req.body ?? {};

    if (!clientId || isNaN(parseInt(clientId, 10))) {
      return res.status(400).json({ error: "clientId is required" });
    }
    const parsedClientId = parseInt(clientId, 10);

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order || order.resellerId !== session.userId) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (order.status !== "completed") {
      return res.status(400).json({ error: "Only completed orders can be activated" });
    }

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.id, parsedClientId), eq(clientsTable.resellerId, session.userId)));
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    await db.update(ordersTable)
      .set({ clientId: parsedClientId, updatedAt: new Date() })
      .where(eq(ordersTable.id, id));

    // Sync client monthly fee now that this order is linked
    await syncClientMonthlyFee(parsedClientId);

    const [updated] = await db
      .select({
        id: ordersTable.id,
        resellerId: ordersTable.resellerId,
        clientId: ordersTable.clientId,
        clientName: clientsTable.companyName,
        status: ordersTable.status,
        notes: ordersTable.notes,
        adminNotes: ordersTable.adminNotes,
        totalExclVat: ordersTable.totalExclVat,
        totalInclVat: ordersTable.totalInclVat,
        itemCount: sql<number>`(select count(*) from order_items where order_id = ${ordersTable.id})`,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .leftJoin(clientsTable, eq(ordersTable.clientId, clientsTable.id))
      .where(eq(ordersTable.id, id));

    if (!updated) return res.status(404).json({ error: "Order not found" });
    return res.json(serializeOrder(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller: update order (pending/new only) ─────────────────────────────────

router.put("/orders/:id", requireReseller, async (req, res) => {
  try {
    const session = req.session as any;
    const id = parseInt(String(req.params.id), 10);

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order || order.resellerId !== session.userId) {
      return res.status(404).json({ error: "Order not found" });
    }
    const editable = ["pending", "new"];
    if (!editable.includes(order.status)) {
      return res.status(400).json({ error: "Only pending or new orders can be edited" });
    }

    const { clientId, notes, items } = req.body ?? {};
    const upd: any = { updatedAt: new Date() };
    if (clientId !== undefined) upd.clientId = clientId ? parseInt(clientId, 10) : null;
    if (notes !== undefined) upd.notes = notes ?? null;

    // If items are provided, replace them and recalculate totals
    if (items && Array.isArray(items) && items.length > 0) {
      // Release existing DID reservations
      const oldDidItems = await db
        .select()
        .from(orderItemsTable)
        .where(and(eq(orderItemsTable.orderId, id), eq(orderItemsTable.itemType, "did")));
      for (const item of oldDidItems) {
        if (item.referenceId) {
          await db
            .update(didsTable)
            .set({ status: "available", reservedByOrderId: null })
            .where(and(eq(didsTable.id, item.referenceId), eq(didsTable.status, "reserved")));
        }
      }

      // Delete old items and insert new ones
      await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, id));

      let totalExclVat = 0;
      let totalInclVat = 0;
      const itemRows = items.map((item: any) => {
        const qty = item.quantity || 1;
        const excl = Number(item.unitPriceExclVat || 0);
        const incl = Number(item.unitPriceInclVat || excl * 1.15);
        totalExclVat += excl * qty;
        totalInclVat += incl * qty;
        return {
          orderId: id,
          itemType: item.itemType || "product",
          referenceId: item.referenceId || null,
          name: item.name,
          sku: item.sku || null,
          quantity: qty,
          unitPriceExclVat: excl.toFixed(2),
          unitPriceInclVat: incl.toFixed(2),
          lineTotal: (incl * qty).toFixed(2),
        };
      });
      await db.insert(orderItemsTable).values(itemRows);

      // Reserve any new DID items
      const savedItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
      for (const item of savedItems.filter((i: any) => i.itemType === "did" && i.referenceId)) {
        const reserved = await db
          .update(didsTable)
          .set({ status: "reserved", reservedByOrderId: id })
          .where(and(eq(didsTable.id, item.referenceId!), eq(didsTable.status, "available")))
          .returning({ id: didsTable.id });
        if (reserved.length === 0) {
          // DID no longer available — rollback items and restore order
          await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, id));
          return res.status(409).json({ error: `DID ${item.name} is no longer available` });
        }
      }

      upd.totalExclVat = totalExclVat.toFixed(2);
      upd.totalInclVat = totalInclVat.toFixed(2);
    }

    await db.update(ordersTable).set(upd).where(eq(ordersTable.id, id));

    const [updated] = await db
      .select({
        id: ordersTable.id,
        resellerId: ordersTable.resellerId,
        clientId: ordersTable.clientId,
        clientName: clientsTable.companyName,
        status: ordersTable.status,
        notes: ordersTable.notes,
        adminNotes: ordersTable.adminNotes,
        totalExclVat: ordersTable.totalExclVat,
        totalInclVat: ordersTable.totalInclVat,
        itemCount: sql<number>`(select count(*) from order_items where order_id = ${ordersTable.id})`,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .leftJoin(clientsTable, eq(ordersTable.clientId, clientsTable.id))
      .where(eq(ordersTable.id, id));

    if (!updated) return res.status(404).json({ error: "Order not found" });
    return res.json(serializeOrder(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller: cancel order ────────────────────────────────────────────────────

router.post("/orders/:id/cancel", requireReseller, async (req, res) => {
  try {
    const session = req.session as any;
    const id = parseInt(String(req.params.id), 10);

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order || order.resellerId !== session.userId) {
      return res.status(404).json({ error: "Order not found" });
    }
    const cancellable = ["pending", "new"];
    if (!cancellable.includes(order.status)) {
      return res.status(400).json({ error: "Only pending or new orders can be cancelled by the reseller" });
    }

    // Release any reserved DIDs back to available
    const didItems = await db
      .select()
      .from(orderItemsTable)
      .where(and(eq(orderItemsTable.orderId, id), eq(orderItemsTable.itemType, "did")));
    for (const item of didItems) {
      if (item.referenceId) {
        await db
          .update(didsTable)
          .set({ status: "available", reservedByOrderId: null })
          .where(and(eq(didsTable.id, item.referenceId), eq(didsTable.status, "reserved")));
      }
    }

    await db.update(ordersTable).set({ status: "cancelled", updatedAt: new Date() }).where(eq(ordersTable.id, id));

    const [updated] = await db
      .select({
        id: ordersTable.id,
        resellerId: ordersTable.resellerId,
        clientId: ordersTable.clientId,
        clientName: clientsTable.companyName,
        status: ordersTable.status,
        notes: ordersTable.notes,
        adminNotes: ordersTable.adminNotes,
        totalExclVat: ordersTable.totalExclVat,
        totalInclVat: ordersTable.totalInclVat,
        itemCount: sql<number>`(select count(*) from order_items where order_id = ${ordersTable.id})`,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .leftJoin(clientsTable, eq(ordersTable.clientId, clientsTable.id))
      .where(eq(ordersTable.id, id));

    if (!updated) return res.status(404).json({ error: "Order not found" });
    return res.json(serializeOrder(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller: place new order ─────────────────────────────────────────────────

router.post("/orders", requireReseller, async (req, res) => {
  try {
    const session = req.session as any;
    const { notes, items, clientId } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order must have at least one item" });
    }
    const hasDomain = items.some((i: any) => i?.itemType === "domain");
    const hasHosting = items.some((i: any) => i?.itemType === "hosting");
    if (hasDomain && !hasHosting) {
      return res.status(400).json({ error: "Hosting is required when ordering a domain" });
    }

    let totalExclVat = 0;
    let totalInclVat = 0;
    for (const item of items) {
      const qty = item.quantity || 1;
      const excl = Number(item.unitPriceExclVat || 0);
      const incl = Number(item.unitPriceInclVat || excl * 1.15);
      totalExclVat += excl * qty;
      totalInclVat += incl * qty;
    }

    const [{ id: orderId }] = await db
      .insert(ordersTable)
      .values({
        resellerId: session.userId,
        clientId: clientId ? parseInt(clientId) : null,
        status: "pending",
        notes: notes || null,
        totalExclVat: totalExclVat.toFixed(2),
        totalInclVat: totalInclVat.toFixed(2),
      })
      .returning();

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) return res.status(500).json({ error: "Failed to create order" });

    const itemRows = items.map((item: any) => {
      const qty = item.quantity || 1;
      const excl = Number(item.unitPriceExclVat || 0);
      const incl = Number(item.unitPriceInclVat || excl * 1.15);
      return {
        orderId: order.id,
        itemType: item.itemType || "product",
        referenceId: item.referenceId || null,
        name: item.name,
        sku: item.sku || null,
        quantity: qty,
        unitPriceExclVat: excl.toFixed(2),
        unitPriceInclVat: incl.toFixed(2),
        lineTotal: (incl * qty).toFixed(2),
      };
    });

    await db.insert(orderItemsTable).values(itemRows);
    const savedItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));

    // Reserve any DIDs included in this order
    const didItems = savedItems.filter((item: any) => item.itemType === "did" && item.referenceId);
    for (const didItem of didItems) {
      const reserved = await db
        .update(didsTable)
        .set({ status: "reserved", reservedByOrderId: order.id })
        .where(and(eq(didsTable.id, didItem.referenceId!), eq(didsTable.status, "available")))
        .returning({ id: didsTable.id });
      if (reserved.length === 0) {
        // DID was not available — rollback by deleting the order
        await db.delete(ordersTable).where(eq(ordersTable.id, order.id));
        return res.status(409).json({ error: `DID ${didItem.name} is no longer available` });
      }
    }

    // Send order notification emails (non-blocking)
    try {
      const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, session.userId));
      const adminRows = await db.select({ email: adminsTable.email }).from(adminsTable).where(eq(adminsTable.isActive, true));
      const adminEmails = adminRows.map(r => r.email).filter(Boolean) as string[];

      await sendOrderEmails(
        {
          orderId: order.id,
          resellerName: reseller?.companyName ?? "Reseller",
          resellerEmail: reseller?.email ?? "",
          notes: order.notes,
          items: savedItems.map((i: any) => ({
            name: i.name,
            itemType: i.itemType,
            quantity: i.quantity,
            unitPriceExclVat: Number(i.unitPriceExclVat),
            unitPriceInclVat: Number(i.unitPriceInclVat),
            lineTotal: Number(i.lineTotal),
          })),
          totalExclVat: totalExclVat,
          totalInclVat: totalInclVat,
        },
        adminEmails,
      );
    } catch (emailErr) {
      console.error("[email] Failed to send order emails:", emailErr);
    }

    return res.status(201).json({
      ...serializeOrder(order),
      items: savedItems.map(serializeItem),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller: get active services for a specific client ───────────────────────

router.get("/clients/:clientId/services", requireReseller, async (req, res) => {
  try {
    const session = req.session as any;
    const clientId = parseInt(String(req.params.clientId), 10);

    // Verify the client belongs to this reseller
    const [client] = await db
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.id, clientId), eq(clientsTable.resellerId, session.userId)));
    if (!client) return res.status(404).json({ error: "Client not found" });

    // Get all completed orders for this client
    const completedOrders = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(and(
        eq(ordersTable.clientId, clientId),
        eq(ordersTable.resellerId, session.userId),
        eq(ordersTable.status, "completed"),
      ));

    if (completedOrders.length === 0) return res.json([]);

    const orderIds = completedOrders.map(o => o.id);
    const items = await db
      .select({
        id: orderItemsTable.id,
        orderId: orderItemsTable.orderId,
        itemType: orderItemsTable.itemType,
        referenceId: orderItemsTable.referenceId,
        name: orderItemsTable.name,
        sku: orderItemsTable.sku,
        quantity: orderItemsTable.quantity,
        unitPriceExclVat: orderItemsTable.unitPriceExclVat,
        unitPriceInclVat: orderItemsTable.unitPriceInclVat,
        lineTotal: orderItemsTable.lineTotal,
        createdAt: orderItemsTable.createdAt,
      })
      .from(orderItemsTable)
      .where(inArray(orderItemsTable.orderId, orderIds))
      .orderBy(orderItemsTable.itemType, orderItemsTable.name);

    return res.json(items.map(serializeItem));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: Service Credentials per order item ─────────────────────────────────

router.get("/admin/order-items/:itemId/credentials", requireAdmin, async (req, res) => {
  try {
    const itemId = parseInt(String(req.params.itemId), 10);
    const rows = await db.execute(sql`
      SELECT sc.*, oi.name AS item_name, oi.item_type
      FROM service_credentials sc
      JOIN order_items oi ON oi.id = sc.order_item_id
      WHERE sc.order_item_id = ${itemId}
      LIMIT 1
    `);
    if (!rows.rows.length) {
      return res.json(null);
    }
    const r: any = rows.rows[0];
    return res.json({
      id: Number(r.id),
      orderItemId: Number(r.order_item_id),
      orderId: Number(r.order_id),
      resellerId: Number(r.reseller_id),
      clientId: r.client_id ? Number(r.client_id) : null,
      serviceName: r.service_name,
      username: r.username,
      password: r.password,
      host: r.host,
      port: r.port,
      extraNotes: r.extra_notes,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/order-items/:itemId/credentials", requireAdmin, async (req, res) => {
  try {
    const itemId = parseInt(String(req.params.itemId), 10);
    const { serviceName, username, password, host, port, extraNotes } = req.body ?? {};

    // Look up the order item to get orderId, resellerId, clientId
    const itemRows = await db.execute(sql`
      SELECT oi.id, oi.order_id, oi.name, o.reseller_id, o.client_id
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = ${itemId}
      LIMIT 1
    `);
    if (!itemRows.rows.length) {
      return res.status(404).json({ error: "Order item not found" });
    }
    const item: any = itemRows.rows[0];

    await db.execute(sql`
      INSERT INTO service_credentials
        (order_item_id, order_id, reseller_id, client_id, service_name, username, password, host, port, extra_notes, updated_at)
      VALUES
        (${itemId}, ${Number(item.order_id)}, ${Number(item.reseller_id)}, ${item.client_id ? Number(item.client_id) : null},
         ${serviceName ?? null}, ${username ?? null}, ${password ?? null}, ${host ?? null}, ${port ?? null}, ${extraNotes ?? null}, NOW())
      ON CONFLICT (order_item_id)
      DO UPDATE SET
        service_name  = EXCLUDED.service_name,
        username      = EXCLUDED.username,
        password      = EXCLUDED.password,
        host          = EXCLUDED.host,
        port          = EXCLUDED.port,
        extra_notes   = EXCLUDED.extra_notes,
        updated_at    = NOW()
    `);

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
