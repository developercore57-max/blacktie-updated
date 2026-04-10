import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, resellersTable } from "@workspace/db";
import { sql, desc, eq, and, gte, lte } from "@workspace/db";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.userId || req.session?.userRole !== "admin") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── Summary stats ─────────────────────────────────────────────────────────────
router.get("/admin/reports/summary", requireAdmin, async (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [totals] = await db
    .select({
      totalOrders: sql<number>`count(*)`,
      totalRevenue: sql<string>`coalesce(sum(case when status = 'completed' then total_incl_vat else 0 end), 0)`,
      pendingCount: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
      processingCount: sql<number>`sum(case when status = 'processing' then 1 else 0 end)`,
      completedCount: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
      cancelledCount: sql<number>`sum(case when status = 'cancelled' then 1 else 0 end)`,
    })
    .from(ordersTable);

  const [thisMonth] = await db
    .select({
      orderCount: sql<number>`count(*)`,
      revenue: sql<string>`coalesce(sum(total_incl_vat), 0)`,
      completedRevenue: sql<string>`coalesce(sum(case when status = 'completed' then total_incl_vat else 0 end), 0)`,
    })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, startOfMonth));

  const [lastMonth] = await db
    .select({
      orderCount: sql<number>`count(*)`,
      revenue: sql<string>`coalesce(sum(total_incl_vat), 0)`,
    })
    .from(ordersTable)
    .where(
      and(
        gte(ordersTable.createdAt, startOfLastMonth),
        lte(ordersTable.createdAt, endOfLastMonth),
      ),
    );

  const [resellerCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(resellersTable)
    .where(eq(resellersTable.status, "active"));

  res.json({
    totalOrders: Number(totals.totalOrders ?? 0),
    totalRevenue: totals.totalRevenue,
    pendingCount: Number(totals.pendingCount ?? 0),
    processingCount: Number(totals.processingCount ?? 0),
    completedCount: Number(totals.completedCount ?? 0),
    cancelledCount: Number(totals.cancelledCount ?? 0),
    thisMonth: {
      orderCount: Number(thisMonth.orderCount ?? 0),
      revenue: thisMonth.revenue,
      completedRevenue: thisMonth.completedRevenue,
    },
    lastMonth: {
      orderCount: Number(lastMonth.orderCount ?? 0),
      revenue: lastMonth.revenue,
    },
    activeResellers: Number(resellerCount.count ?? 0),
  });
});

// ── Monthly breakdown (last 12 months) ────────────────────────────────────────
router.get("/admin/reports/monthly", requireAdmin, async (_req, res) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const rows = await db
      .select({
        month: sql<string>`to_char(${ordersTable.createdAt}, 'YYYY-MM')`,
        monthLabel: sql<string>`to_char(min(${ordersTable.createdAt}), 'Mon YYYY')`,
        orderCount: sql<number>`count(*)`,
        totalRevenue: sql<string>`coalesce(sum(total_incl_vat), 0)`,
        completedRevenue: sql<string>`coalesce(sum(case when status = 'completed' then total_incl_vat else 0 end), 0)`,
        pendingCount: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
        completedCount: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
        cancelledCount: sql<number>`sum(case when status = 'cancelled' then 1 else 0 end)`,
      })
      .from(ordersTable)
      .where(gte(ordersTable.createdAt, twelveMonthsAgo))
      .groupBy(sql`to_char(${ordersTable.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${ordersTable.createdAt}, 'YYYY-MM')`);

    return res.json(rows);
  } catch (err) {
    console.error("Monthly reports error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Orders by status ──────────────────────────────────────────────────────────
router.get("/admin/reports/orders-by-status", requireAdmin, async (_req, res) => {
  const rows = await db
    .select({
      status: ordersTable.status,
      count: sql<number>`count(*)`,
      total: sql<string>`coalesce(sum(total_incl_vat), 0)`,
    })
    .from(ordersTable)
    .groupBy(ordersTable.status)
    .orderBy(desc(sql`count(*)`));

  res.json(rows);
});

// ── Reseller performance ──────────────────────────────────────────────────────
router.get("/admin/reports/resellers", requireAdmin, async (_req, res) => {
  const rows = await db
    .select({
      id: resellersTable.id,
      companyName: resellersTable.companyName,
      contactName: resellersTable.contactName,
      email: resellersTable.email,
      status: resellersTable.status,
      createdAt: resellersTable.createdAt,
      totalOrders: sql<number>`count(${ordersTable.id})`,
      completedOrders: sql<number>`sum(case when ${ordersTable.status} = 'completed' then 1 else 0 end)`,
      pendingOrders: sql<number>`sum(case when ${ordersTable.status} = 'pending' then 1 else 0 end)`,
      totalRevenue: sql<string>`coalesce(sum(${ordersTable.totalInclVat}), 0)`,
      completedRevenue: sql<string>`coalesce(sum(case when ${ordersTable.status} = 'completed' then ${ordersTable.totalInclVat} else 0 end), 0)`,
    })
    .from(resellersTable)
    .leftJoin(ordersTable, eq(ordersTable.resellerId, resellersTable.id))
    .groupBy(
      resellersTable.id,
      resellersTable.companyName,
      resellersTable.contactName,
      resellersTable.email,
      resellersTable.status,
      resellersTable.createdAt,
    )
    .orderBy(desc(sql`coalesce(sum(${ordersTable.totalInclVat}), 0)`));

  res.json(
    rows.map((r) => ({
      ...r,
      totalOrders: Number(r.totalOrders ?? 0),
      completedOrders: Number(r.completedOrders ?? 0),
      pendingOrders: Number(r.pendingOrders ?? 0),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    })),
  );
});

export default router;
