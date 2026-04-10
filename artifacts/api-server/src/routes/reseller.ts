import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { resellersTable, clientsTable, didsTable, companySettingsTable } from "@workspace/db";
import { eq, sql } from "@workspace/db";
import { promises as dnsPromises } from "dns";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

function requireReseller(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session.userId || session.userRole !== "reseller") {
    return res.status(401).json({ error: "Reseller access required" });
  }
  next();
}

router.use(requireReseller);

router.get("/stats", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;

    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, resellerId));
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    const [counts] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
        revenue: sql<string>`coalesce(sum(monthly_fee), 0)`,
        totalExtensions: sql<number>`coalesce(sum(sip_extensions), 0)`,
      })
      .from(clientsTable)
      .where(eq(clientsTable.resellerId, resellerId));

    const monthlyRevenue = Number(counts.revenue || 0);

    const [{ didCount }] = await db
      .select({ didCount: sql<number>`count(*)` })
      .from(didsTable)
      .where(eq(didsTable.resellerId, resellerId));

    return res.json({
      totalClients: Number(counts.total ?? 0),
      activeClients: Number(counts.active ?? 0),
      monthlyRevenue,
      totalSipExtensions: Number(counts.totalExtensions ?? 0),
      assignedDids: Number(didCount ?? 0),
    });
  } catch (err) {
    console.error("Reseller stats error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/profile", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, resellerId));
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    const [counts] = await db
      .select({
        total: sql<number>`count(*)`,
        revenue: sql<string>`coalesce(sum(monthly_fee), 0)`,
      })
      .from(clientsTable)
      .where(eq(clientsTable.resellerId, resellerId));

    return res.json({
      id: reseller.id,
      companyName: reseller.companyName,
      contactName: reseller.contactName,
      email: reseller.email,
      phone: reseller.phone,
      unitStreetNumber: reseller.unitStreetNumber,
      buildingComplex: reseller.buildingComplex,
      streetName: reseller.streetName,
      address: reseller.address,
      address2: reseller.address2,
      city: reseller.city,
      province: reseller.province,
      status: reseller.status,
      totalClients: Number(counts.total ?? 0),
      monthlyRevenue: Number(counts.revenue ?? 0),
      createdAt: reseller.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Reseller profile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const { companyName, contactName, email, phone, unitStreetNumber, buildingComplex, streetName, address, address2, city, province } = req.body;

    const updateData: any = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (unitStreetNumber !== undefined) updateData.unitStreetNumber = unitStreetNumber;
    if (buildingComplex !== undefined) updateData.buildingComplex = buildingComplex;
    if (streetName !== undefined) updateData.streetName = streetName;
    if (address !== undefined) updateData.address = address;
    if (address2 !== undefined) updateData.address2 = address2;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province;

    await db.update(resellersTable).set(updateData).where(eq(resellersTable.id, resellerId));
    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, resellerId));
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    const [counts] = await db
      .select({
        total: sql<number>`count(*)`,
        revenue: sql<string>`coalesce(sum(monthly_fee), 0)`,
      })
      .from(clientsTable)
      .where(eq(clientsTable.resellerId, resellerId));

    return res.json({
      id: reseller.id,
      companyName: reseller.companyName,
      contactName: reseller.contactName,
      email: reseller.email,
      phone: reseller.phone,
      unitStreetNumber: reseller.unitStreetNumber,
      buildingComplex: reseller.buildingComplex,
      streetName: reseller.streetName,
      address: reseller.address,
      address2: reseller.address2,
      city: reseller.city,
      province: reseller.province,
      status: reseller.status,
      totalClients: Number(counts.total ?? 0),
      monthlyRevenue: Number(counts.revenue ?? 0),
      createdAt: reseller.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Reseller update profile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/profile/change-password", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const { currentPassword, newPassword } = req.body ?? {};

    if (!currentPassword || typeof currentPassword !== "string") {
      return res.status(400).json({ error: "Current password is required" });
    }
    if (!newPassword || typeof newPassword !== "string") {
      return res.status(400).json({ error: "New password is required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }

    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, resellerId));
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    const ok = await bcrypt.compare(currentPassword, (reseller as any).passwordHash);
    if (!ok) return res.status(400).json({ error: "Current password is incorrect" });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(resellersTable).set({ passwordHash }).where(eq(resellersTable.id, resellerId));

    return res.json({ success: true });
  } catch (err) {
    console.error("Reseller change password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/clients", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const clients = await db.select().from(clientsTable).where(eq(clientsTable.resellerId, resellerId));

    return res.json(
      clients.map((c) => ({
        id: c.id,
        resellerId: c.resellerId,
        resellerName: null,
        companyName: c.companyName,
        contactName: c.contactName,
        email: c.email,
        phone: c.phone,
        unitStreetNumber: c.unitStreetNumber,
        buildingComplex: c.buildingComplex,
        streetName: c.streetName,
        address: c.address,
        address2: c.address2,
        city: c.city,
        province: c.province,
        sipExtensions: c.sipExtensions,
        monthlyFee: Number(c.monthlyFee),
        status: c.status,
        notes: c.notes,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("Reseller get clients error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/clients", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const { companyName, contactName, email, phone, unitStreetNumber, buildingComplex, streetName, address, address2, city, province, sipExtensions, monthlyFee, notes } = req.body;

    if (!companyName || !contactName || !email) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const [{ id: clientId }] = await db
      .insert(clientsTable)
      .values({
        resellerId,
        companyName,
        contactName,
        email,
        phone,
        unitStreetNumber,
        buildingComplex,
        streetName,
        address,
        address2,
        city,
        province,
        sipExtensions: sipExtensions || 1,
        monthlyFee: String(monthlyFee || 0),
        notes,
        status: "active",
      })
      .returning();

    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
    if (!client) return res.status(500).json({ error: "Failed to create client" });

    return res.status(201).json({
      id: client.id,
      resellerId: client.resellerId,
      resellerName: null,
      companyName: client.companyName,
      contactName: client.contactName,
      email: client.email,
      phone: client.phone,
      unitStreetNumber: client.unitStreetNumber,
      buildingComplex: client.buildingComplex,
      streetName: client.streetName,
      address: client.address,
      address2: client.address2,
      city: client.city,
      province: client.province,
      sipExtensions: client.sipExtensions,
      monthlyFee: Number(client.monthlyFee),
      status: client.status,
      notes: client.notes,
      createdAt: client.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Create client error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/clients/:id", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const id = parseInt(String(req.params.id), 10);

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, id));

    if (!client || client.resellerId !== resellerId) {
      return res.status(404).json({ error: "Client not found" });
    }

    return res.json({
      id: client.id,
      resellerId: client.resellerId,
      resellerName: null,
      companyName: client.companyName,
      contactName: client.contactName,
      email: client.email,
      phone: client.phone,
      unitStreetNumber: client.unitStreetNumber,
      buildingComplex: client.buildingComplex,
      streetName: client.streetName,
      address: client.address,
      address2: client.address2,
      city: client.city,
      province: client.province,
      sipExtensions: client.sipExtensions,
      monthlyFee: Number(client.monthlyFee),
      status: client.status,
      notes: client.notes,
      createdAt: client.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Get client error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/clients/:id", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const id = parseInt(String(req.params.id), 10);

    const [existing] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
    if (!existing || existing.resellerId !== resellerId) {
      return res.status(404).json({ error: "Client not found" });
    }

    const { companyName, contactName, email, phone, unitStreetNumber, buildingComplex, streetName, address, address2, city, province, sipExtensions, monthlyFee, status, notes } = req.body;
    const updateData: any = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (unitStreetNumber !== undefined) updateData.unitStreetNumber = unitStreetNumber;
    if (buildingComplex !== undefined) updateData.buildingComplex = buildingComplex;
    if (streetName !== undefined) updateData.streetName = streetName;
    if (address !== undefined) updateData.address = address;
    if (address2 !== undefined) updateData.address2 = address2;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province;
    if (sipExtensions !== undefined) updateData.sipExtensions = sipExtensions;
    if (monthlyFee !== undefined) updateData.monthlyFee = String(monthlyFee);
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    await db.update(clientsTable).set(updateData).where(eq(clientsTable.id, id));
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
    if (!client) return res.status(404).json({ error: "Client not found" });

    return res.json({
      id: client.id,
      resellerId: client.resellerId,
      resellerName: null,
      companyName: client.companyName,
      contactName: client.contactName,
      email: client.email,
      phone: client.phone,
      unitStreetNumber: client.unitStreetNumber,
      buildingComplex: client.buildingComplex,
      streetName: client.streetName,
      address: client.address,
      address2: client.address2,
      city: client.city,
      province: client.province,
      sipExtensions: client.sipExtensions,
      monthlyFee: Number(client.monthlyFee),
      status: client.status,
      notes: client.notes,
      createdAt: client.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Update client error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/clients/:id", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const id = parseInt(String(req.params.id), 10);

    const [existing] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
    if (!existing || existing.resellerId !== resellerId) {
      return res.status(404).json({ error: "Client not found" });
    }

    await db.delete(clientsTable).where(eq(clientsTable.id, id));
    return res.json({ success: true, message: "Client deleted" });
  } catch (err) {
    console.error("Delete client error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Client Orders ─────────────────────────────────────────────────────────────

router.get("/clients/:id/orders", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const clientId = parseInt(String(req.params.id), 10);

    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
    if (!client || client.resellerId !== resellerId) {
      return res.status(404).json({ error: "Client not found" });
    }

    const rows = await db.execute(sql`
      SELECT
        o.id,
        o.status,
        o.total_excl_vat,
        o.total_incl_vat,
        o.notes,
        o.admin_notes,
        o.created_at,
        o.updated_at,
        (SELECT count(*) FROM order_items WHERE order_id = o.id) AS item_count
      FROM orders o
      WHERE o.client_id = ${clientId}
        AND o.reseller_id = ${resellerId}
      ORDER BY o.created_at DESC
    `);

    return res.json(
      (rows.rows as any[]).map((o: any) => ({
        id: Number(o.id),
        status: o.status,
        totalExclVat: Number(o.total_excl_vat ?? 0),
        totalInclVat: Number(o.total_incl_vat ?? 0),
        itemCount: Number(o.item_count ?? 0),
        notes: o.notes,
        adminNotes: o.admin_notes,
        createdAt: o.created_at instanceof Date ? o.created_at.toISOString() : o.created_at,
        updatedAt: o.updated_at instanceof Date ? o.updated_at.toISOString() : o.updated_at,
      }))
    );
  } catch (err) {
    console.error("Client orders error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Client Active Services ─────────────────────────────────────────────────────

router.get("/clients/:id/services", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const clientId = parseInt(String(req.params.id), 10);

    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
    if (!client || client.resellerId !== resellerId) {
      return res.status(404).json({ error: "Client not found" });
    }

    const rows = await db.execute(sql`
      SELECT
        oi.id,
        oi.order_id,
        oi.item_type,
        oi.reference_id,
        oi.name,
        oi.sku,
        oi.quantity,
        oi.unit_price_excl_vat,
        oi.unit_price_incl_vat,
        oi.line_total,
        oi.created_at,
        sc.username,
        sc.password,
        sc.host,
        sc.port,
        sc.extra_notes,
        sc.service_name,
        CASE WHEN sc.id IS NOT NULL THEN true ELSE false END AS has_credentials
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      LEFT JOIN service_credentials sc ON sc.order_item_id = oi.id
      WHERE o.client_id = ${clientId}
        AND o.reseller_id = ${resellerId}
        AND o.status = 'completed'
        AND oi.is_activated = true
      ORDER BY oi.created_at DESC
    `);

    return res.json(
      (rows.rows as any[]).map((i: any) => ({
        id: Number(i.id),
        orderId: Number(i.order_id),
        itemType: i.item_type,
        referenceId: i.reference_id ? Number(i.reference_id) : null,
        name: i.name,
        sku: i.sku,
        quantity: Number(i.quantity ?? 1),
        unitPriceExclVat: Number(i.unit_price_excl_vat ?? 0),
        unitPriceInclVat: Number(i.unit_price_incl_vat ?? 0),
        lineTotal: Number(i.line_total ?? 0),
        createdAt: i.created_at instanceof Date ? i.created_at.toISOString() : i.created_at,
        hasCredentials: Boolean(i.has_credentials),
        credentials: Boolean(i.has_credentials) ? {
          username: i.username,
          password: i.password,
          host: i.host,
          port: i.port,
          extraNotes: i.extra_notes,
          serviceName: i.service_name,
        } : null,
      }))
    );
  } catch (err) {
    console.error("Client services error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Order Items (for activation panel) ───────────────────────────────────────

router.get("/orders/:orderId/items", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const orderId = parseInt(String(req.params.orderId), 10);

    const rows = await db.execute(sql`
      SELECT
        oi.id,
        oi.order_id,
        oi.item_type,
        oi.name,
        oi.sku,
        oi.quantity,
        oi.unit_price_incl_vat,
        oi.is_activated
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE oi.order_id = ${orderId}
        AND o.reseller_id = ${resellerId}
        AND o.status = 'completed'
      ORDER BY oi.id ASC
    `);

    return res.json(
      (rows.rows as any[]).map((i: any) => ({
        id: Number(i.id),
        orderId: Number(i.order_id),
        itemType: i.item_type,
        name: i.name,
        sku: i.sku,
        quantity: Number(i.quantity ?? 1),
        unitPriceInclVat: Number(i.unit_price_incl_vat ?? 0),
        isActivated: Boolean(i.is_activated),
      }))
    );
  } catch (err) {
    console.error("Order items error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/order-items/:itemId/activate", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const itemId = parseInt(String(req.params.itemId), 10);

    const rows = await db.execute(sql`
      SELECT oi.id, oi.is_activated
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = ${itemId}
        AND o.reseller_id = ${resellerId}
        AND o.status = 'completed'
    `);

    if (!rows.rows.length) {
      return res.status(404).json({ error: "Item not found or order not completed" });
    }

    const current = Boolean((rows.rows[0] as any).is_activated);
    const next = !current;

    await db.execute(sql`
      UPDATE order_items SET is_activated = ${next} WHERE id = ${itemId}
    `);

    return res.json({ id: itemId, isActivated: next });
  } catch (err) {
    console.error("Activate order item error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DID Pricing ───────────────────────────────────────────────────────────────

router.get("/did-pricing", async (_req, res) => {
  try {
    const rows = await db.select({
      didResellerPriceExclVat: companySettingsTable.didResellerPriceExclVat,
      didResellerPriceInclVat: companySettingsTable.didResellerPriceInclVat,
    }).from(companySettingsTable).limit(1);
    const row = rows[0] ?? {};
    return res.json({
      exclVat: row.didResellerPriceExclVat != null ? Number(row.didResellerPriceExclVat) : null,
      inclVat: row.didResellerPriceInclVat != null ? Number(row.didResellerPriceInclVat) : null,
    });
  } catch (err) {
    console.error("DID pricing error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Domain Availability Check ────────────────────────────────────────────────

router.get("/check-domain", async (req, res) => {
  const domainValue = req.query.domain;
  const domain = (Array.isArray(domainValue) ? domainValue[0] : domainValue ?? "").toString().trim().toLowerCase();
  if (!domain || !/^[a-z0-9][a-z0-9\-.]{1,61}[a-z0-9]\.[a-z]{2,}$/.test(domain)) {
    return res.status(400).json({ error: "Invalid domain name" });
  }
  try {
    // DNS NS record lookup: if nameservers exist the domain is registered;
    // ENOTFOUND / ENODATA means it is available. This works for all TLDs
    // including South African ccTLDs (.co.za, .org.za, etc.) and needs no
    // external API key or network service that may be unreachable.
    const nameservers = await dnsPromises.resolveNs(domain);
    return res.json({
      domain,
      available: false,
      status: "registered",
      nameservers: nameservers.slice(0, 4),
    });
  } catch (err: any) {
    if (err?.code === "ENOTFOUND" || err?.code === "ENODATA" || err?.code === "ESERVFAIL") {
      return res.json({ domain, available: true, status: "available" });
    }
    console.error("Domain check error:", err);
    return res.status(500).json({ error: "Domain check failed" });
  }
});

export default router;
