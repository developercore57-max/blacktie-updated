import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  serviceCategoriesTable,
  servicesTable,
  productCategoriesTable,
  productsTable,
  webHostingPackagesTable,
  domainTldsTable,
  connectivityCategoriesTable,
  connectivityItemsTable,
  cybersecurityCategoriesTable,
  cybersecurityItemsTable,
  dataSecurityCategoriesTable,
  dataSecurityItemsTable,
  webDevCategoriesTable,
  webDevItemsTable,
  voipCategoriesTable,
  voipItemsTable,
  minuteBundlesTable,
} from "@workspace/db";
import { eq, sql, isNull, gte } from "@workspace/db";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session.userId || session.userRole !== "admin") {
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
}

// ── Service Categories ───────────────────────────────────────────────────────

router.get("/admin/service-categories", requireAdmin, async (_req, res) => {
  try {
    const categories = await db.select().from(serviceCategoriesTable).orderBy(serviceCategoriesTable.sortOrder, serviceCategoriesTable.name);
    const withCounts = await Promise.all(
      categories.map(async (cat) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(servicesTable)
          .where(eq(servicesTable.categoryId, cat.id));
        const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null;
        return {
          ...cat,
          parentName: parent?.name ?? null,
          itemCount: Number(count ?? 0),
          createdAt: cat.createdAt.toISOString(),
        };
      })
    );
    return res.json(withCounts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/service-categories", requireAdmin, async (req, res) => {
  try {
    const { name, description, parentId, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db
      .insert(serviceCategoriesTable)
      .values({ name, description, parentId: parentId || null, sortOrder: sortOrder ?? 0 })
      .returning();
    const [cat] = await db.select().from(serviceCategoriesTable).where(eq(serviceCategoriesTable.id, id));
    if (!cat) return res.status(500).json({ error: "Failed to create service category" });
    return res.status(201).json({ ...cat, parentName: null, itemCount: 0, createdAt: cat.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/service-categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, description, parentId, sortOrder } = req.body;
    const upd: any = {};
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (parentId !== undefined) upd.parentId = parentId || null;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(serviceCategoriesTable).set(upd).where(eq(serviceCategoriesTable.id, id));
    const [cat] = await db.select().from(serviceCategoriesTable).where(eq(serviceCategoriesTable.id, id));
    if (!cat) return res.status(404).json({ error: "Not found" });
    return res.json({ ...cat, parentName: null, itemCount: 0, createdAt: cat.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/service-categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(serviceCategoriesTable).where(eq(serviceCategoriesTable.id, id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Services ─────────────────────────────────────────────────────────────────

function serializeService(s: any, categoryName?: string | null) {
  return {
    ...s,
    price: s.price != null ? Number(s.price) : 0,
    retailPriceExclVat: s.retailPriceExclVat != null ? Number(s.retailPriceExclVat) : null,
    resellerPriceExclVat: s.resellerPriceExclVat != null ? Number(s.resellerPriceExclVat) : null,
    resellerPriceInclVat: s.resellerPriceInclVat != null ? Number(s.resellerPriceInclVat) : null,
    priceInclVat: s.priceInclVat != null ? Number(s.priceInclVat) : null,
    categoryName: categoryName !== undefined ? categoryName : s.categoryName ?? null,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
  };
}

router.get("/admin/services", requireAdmin, async (_req, res) => {
  try {
    const services = await db
      .select({
        id: servicesTable.id,
        categoryId: servicesTable.categoryId,
        categoryName: serviceCategoriesTable.name,
        name: servicesTable.name,
        description: servicesTable.description,
        price: servicesTable.price,
        retailPriceExclVat: servicesTable.retailPriceExclVat,
        resellerPriceExclVat: servicesTable.resellerPriceExclVat,
        resellerPriceInclVat: servicesTable.resellerPriceInclVat,
        priceInclVat: servicesTable.priceInclVat,
        unit: servicesTable.unit,
        status: servicesTable.status,
        sortOrder: servicesTable.sortOrder,
        createdAt: servicesTable.createdAt,
      })
      .from(servicesTable)
      .leftJoin(serviceCategoriesTable, eq(servicesTable.categoryId, serviceCategoriesTable.id))
      .orderBy(servicesTable.sortOrder, servicesTable.name);
    return res.json(services.map((s) => serializeService(s)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/services", requireAdmin, async (req, res) => {
  try {
    const { categoryId, name, description, price, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, unit, status, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db
      .insert(servicesTable)
      .values({
        categoryId: categoryId || null,
        name,
        description,
        price: String(price ?? retailPriceExclVat ?? 0),
        retailPriceExclVat: retailPriceExclVat != null ? String(retailPriceExclVat) : null,
        resellerPriceExclVat: resellerPriceExclVat != null ? String(resellerPriceExclVat) : null,
        resellerPriceInclVat: resellerPriceInclVat != null ? String(resellerPriceInclVat) : null,
        priceInclVat: priceInclVat != null ? String(priceInclVat) : null,
        unit: unit || "month",
        status: status || "active",
        sortOrder: sortOrder ?? 0,
      })
      .returning();
    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, id));
    if (!service) return res.status(500).json({ error: "Failed to create service" });
    return res.status(201).json(serializeService(service, null));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/services/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { categoryId, name, description, price, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, unit, status, sortOrder } = req.body;
    const upd: any = {};
    if (categoryId !== undefined) upd.categoryId = categoryId || null;
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (price !== undefined) upd.price = String(price);
    if (retailPriceExclVat !== undefined) upd.retailPriceExclVat = retailPriceExclVat != null ? String(retailPriceExclVat) : null;
    if (resellerPriceExclVat !== undefined) upd.resellerPriceExclVat = resellerPriceExclVat != null ? String(resellerPriceExclVat) : null;
    if (resellerPriceInclVat !== undefined) upd.resellerPriceInclVat = resellerPriceInclVat != null ? String(resellerPriceInclVat) : null;
    if (priceInclVat !== undefined) upd.priceInclVat = priceInclVat != null ? String(priceInclVat) : null;
    if (unit !== undefined) upd.unit = unit;
    if (status !== undefined) upd.status = status;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(servicesTable).set(upd).where(eq(servicesTable.id, id));
    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, id));
    if (!service) return res.status(404).json({ error: "Not found" });
    return res.json(serializeService(service, null));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/services/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(servicesTable).where(eq(servicesTable.id, id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/services/bulk-import", requireAdmin, async (req, res) => {
  try {
    const { items: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No items provided" });
    let created = 0, skipped = 0; const errors: string[] = [];
    for (const row of rows) {
      if (!row.name?.trim()) { skipped++; continue; }
      try {
        await db.insert(servicesTable).values({
          name: row.name.trim(), description: row.description?.trim() || null,
          categoryId: null,
          price: row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : "0",
          retailPriceExclVat: row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : null,
          resellerPriceExclVat: row.resellerPriceExclVat != null && row.resellerPriceExclVat !== "" ? String(row.resellerPriceExclVat) : null,
          resellerPriceInclVat: row.resellerPriceInclVat != null && row.resellerPriceInclVat !== "" ? String(row.resellerPriceInclVat) : null,
          priceInclVat: row.priceInclVat != null && row.priceInclVat !== "" ? String(row.priceInclVat) : null,
          unit: row.unit || "month", status: row.status === "inactive" ? "inactive" : "active",
          sortOrder: row.sortOrder != null ? Number(row.sortOrder) : 0,
        });
        created++;
      } catch (e: any) { errors.push(`"${row.name}": ${e.message}`); }
    }
    return res.json({ ok: true, created, skipped, errors });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

// ── Product Categories ───────────────────────────────────────────────────────

router.get("/admin/product-categories", requireAdmin, async (_req, res) => {
  try {
    const categories = await db.select().from(productCategoriesTable).orderBy(productCategoriesTable.sortOrder, productCategoriesTable.name);
    const withCounts = await Promise.all(
      categories.map(async (cat) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(productsTable)
          .where(eq(productsTable.categoryId, cat.id));
        const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null;
        return {
          ...cat,
          parentName: parent?.name ?? null,
          itemCount: Number(count ?? 0),
          createdAt: cat.createdAt.toISOString(),
        };
      })
    );
    return res.json(withCounts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/product-categories", requireAdmin, async (req, res) => {
  try {
    const { name, description, parentId, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db
      .insert(productCategoriesTable)
      .values({ name, description, parentId: parentId || null, sortOrder: sortOrder ?? 0 })
      .returning();
    const [cat] = await db.select().from(productCategoriesTable).where(eq(productCategoriesTable.id, id));
    if (!cat) return res.status(500).json({ error: "Failed to create product category" });
    return res.status(201).json({ ...cat, parentName: null, itemCount: 0, createdAt: cat.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/product-categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, description, parentId, sortOrder } = req.body;
    const upd: any = {};
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (parentId !== undefined) upd.parentId = parentId || null;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(productCategoriesTable).set(upd).where(eq(productCategoriesTable.id, id));
    const [cat] = await db.select().from(productCategoriesTable).where(eq(productCategoriesTable.id, id));
    if (!cat) return res.status(404).json({ error: "Not found" });
    return res.json({ ...cat, parentName: null, itemCount: 0, createdAt: cat.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/product-categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(productCategoriesTable).where(eq(productCategoriesTable.id, id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Products ─────────────────────────────────────────────────────────────────

function serializeProduct(p: any, categoryName?: string | null) {
  return {
    ...p,
    price: p.price != null ? Number(p.price) : 0,
    retailPriceExclVat: p.retailPriceExclVat != null ? Number(p.retailPriceExclVat) : null,
    resellerPriceExclVat: p.resellerPriceExclVat != null ? Number(p.resellerPriceExclVat) : null,
    resellerPriceInclVat: p.resellerPriceInclVat != null ? Number(p.resellerPriceInclVat) : null,
    priceInclVat: p.priceInclVat != null ? Number(p.priceInclVat) : null,
    categoryName: categoryName !== undefined ? categoryName : p.categoryName ?? null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

router.get("/admin/products", requireAdmin, async (_req, res) => {
  try {
    const products = await db
      .select({
        id: productsTable.id,
        categoryId: productsTable.categoryId,
        categoryName: productCategoriesTable.name,
        name: productsTable.name,
        description: productsTable.description,
        sku: productsTable.sku,
        imageUrl: productsTable.imageUrl,
        price: productsTable.price,
        retailPriceExclVat: productsTable.retailPriceExclVat,
        resellerPriceExclVat: productsTable.resellerPriceExclVat,
        resellerPriceInclVat: productsTable.resellerPriceInclVat,
        priceInclVat: productsTable.priceInclVat,
        stockCount: productsTable.stockCount,
        status: productsTable.status,
        sortOrder: productsTable.sortOrder,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .leftJoin(productCategoriesTable, eq(productsTable.categoryId, productCategoriesTable.id))
      .orderBy(productsTable.sortOrder, productsTable.name);
    return res.json(products.map((p) => serializeProduct(p)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/products", requireAdmin, async (req, res) => {
  try {
    const { categoryId, name, description, sku, imageUrl, price, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, stockCount, status, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db
      .insert(productsTable)
      .values({
        categoryId: categoryId || null,
        name,
        description,
        sku,
        imageUrl: imageUrl || null,
        price: String(price ?? retailPriceExclVat ?? 0),
        retailPriceExclVat: retailPriceExclVat != null ? String(retailPriceExclVat) : null,
        resellerPriceExclVat: resellerPriceExclVat != null ? String(resellerPriceExclVat) : null,
        resellerPriceInclVat: resellerPriceInclVat != null ? String(resellerPriceInclVat) : null,
        priceInclVat: priceInclVat != null ? String(priceInclVat) : null,
        stockCount: stockCount ?? 0,
        status: status || "active",
        sortOrder: sortOrder ?? 0,
      })
      .returning();
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) return res.status(500).json({ error: "Failed to create product" });
    return res.status(201).json(serializeProduct(product, null));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { categoryId, name, description, sku, imageUrl, price, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, stockCount, status, sortOrder } = req.body;
    const upd: any = {};
    if (categoryId !== undefined) upd.categoryId = categoryId || null;
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (sku !== undefined) upd.sku = sku;
    if (imageUrl !== undefined) upd.imageUrl = imageUrl || null;
    if (price !== undefined) upd.price = String(price);
    if (retailPriceExclVat !== undefined) upd.retailPriceExclVat = retailPriceExclVat != null ? String(retailPriceExclVat) : null;
    if (resellerPriceExclVat !== undefined) upd.resellerPriceExclVat = resellerPriceExclVat != null ? String(resellerPriceExclVat) : null;
    if (resellerPriceInclVat !== undefined) upd.resellerPriceInclVat = resellerPriceInclVat != null ? String(resellerPriceInclVat) : null;
    if (priceInclVat !== undefined) upd.priceInclVat = priceInclVat != null ? String(priceInclVat) : null;
    if (stockCount !== undefined) upd.stockCount = stockCount;
    if (status !== undefined) upd.status = status;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(productsTable).set(upd).where(eq(productsTable.id, id));
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) return res.status(404).json({ error: "Not found" });
    return res.json(serializeProduct(product, null));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(productsTable).where(eq(productsTable.id, id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Products Bulk Import ──────────────────────────────────────────────────────
router.post("/admin/products/bulk-import", requireAdmin, async (req, res) => {
  try {
    const { products: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No products provided" });

    let created = 0, skipped = 0, errors: string[] = [];

    for (const row of rows) {
      if (!row.name?.trim()) { skipped++; continue; }
      try {
        const retailExcl = row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : null;
        const retailIncl = row.priceInclVat != null && row.priceInclVat !== "" ? String(row.priceInclVat) : null;
        const resellerExcl = row.resellerPriceExclVat != null && row.resellerPriceExclVat !== "" ? String(row.resellerPriceExclVat) : null;
        const resellerIncl = row.resellerPriceInclVat != null && row.resellerPriceInclVat !== "" ? String(row.resellerPriceInclVat) : null;
        await db.insert(productsTable).values({
          name: row.name.trim(),
          description: row.description?.trim() || null,
          sku: row.sku?.trim() || null,
          imageUrl: row.imageUrl?.trim() || null,
          price: retailExcl ?? "0",
          retailPriceExclVat: retailExcl,
          priceInclVat: retailIncl,
          resellerPriceExclVat: resellerExcl,
          resellerPriceInclVat: resellerIncl,
          stockCount: row.stockCount != null ? Number(row.stockCount) : 0,
          status: row.status === "inactive" ? "inactive" : "active",
          sortOrder: row.sortOrder != null ? Number(row.sortOrder) : 0,
          categoryId: null,
        });
        created++;
      } catch (e: any) {
        errors.push(`Row "${row.name}": ${e.message}`);
      }
    }

    return res.json({ ok: true, created, skipped, errors });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Web Hosting Packages ──────────────────────────────────────────────────────

function serializeHostingPackage(p: any) {
  return {
    ...p,
    diskSpaceGb: p.diskSpaceGb ?? 1,
    bandwidthGb: p.bandwidthGb ?? 10,
    emailAccounts: p.emailAccounts ?? 5,
    databases: p.databases ?? 1,
    subdomains: p.subdomains ?? 1,
    sslIncluded: p.sslIncluded ?? true,
    retailPriceExclVat: p.retailPriceExclVat != null ? Number(p.retailPriceExclVat) : null,
    resellerPriceExclVat: p.resellerPriceExclVat != null ? Number(p.resellerPriceExclVat) : null,
    resellerPriceInclVat: p.resellerPriceInclVat != null ? Number(p.resellerPriceInclVat) : null,
    priceInclVat: p.priceInclVat != null ? Number(p.priceInclVat) : null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

router.get("/admin/hosting-packages", requireAdmin, async (_req, res) => {
  try {
    const packages = await db.select().from(webHostingPackagesTable).orderBy(webHostingPackagesTable.sortOrder, webHostingPackagesTable.name);
    return res.json(packages.map(serializeHostingPackage));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/hosting-packages", requireAdmin, async (req, res) => {
  try {
    const { name, description, diskSpaceGb, bandwidthGb, emailAccounts, databases, subdomains, sslIncluded, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, status, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db
      .insert(webHostingPackagesTable)
      .values({
        name,
        description: description || null,
        diskSpaceGb: diskSpaceGb ?? 1,
        bandwidthGb: bandwidthGb ?? 10,
        emailAccounts: emailAccounts ?? 5,
        databases: databases ?? 1,
        subdomains: subdomains ?? 1,
        sslIncluded: sslIncluded ?? true,
        retailPriceExclVat: retailPriceExclVat != null ? String(retailPriceExclVat) : null,
        resellerPriceExclVat: resellerPriceExclVat != null ? String(resellerPriceExclVat) : null,
        resellerPriceInclVat: resellerPriceInclVat != null ? String(resellerPriceInclVat) : null,
        priceInclVat: priceInclVat != null ? String(priceInclVat) : null,
        status: status || "active",
        sortOrder: sortOrder ?? 0,
      })
      .returning();
    const [pkg] = await db.select().from(webHostingPackagesTable).where(eq(webHostingPackagesTable.id, id));
    if (!pkg) return res.status(500).json({ error: "Failed to create hosting package" });
    return res.status(201).json(serializeHostingPackage(pkg));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/hosting-packages/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, description, diskSpaceGb, bandwidthGb, emailAccounts, databases, subdomains, sslIncluded, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, status, sortOrder } = req.body;
    const upd: any = {};
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (diskSpaceGb !== undefined) upd.diskSpaceGb = diskSpaceGb;
    if (bandwidthGb !== undefined) upd.bandwidthGb = bandwidthGb;
    if (emailAccounts !== undefined) upd.emailAccounts = emailAccounts;
    if (databases !== undefined) upd.databases = databases;
    if (subdomains !== undefined) upd.subdomains = subdomains;
    if (sslIncluded !== undefined) upd.sslIncluded = sslIncluded;
    if (retailPriceExclVat !== undefined) upd.retailPriceExclVat = retailPriceExclVat != null ? String(retailPriceExclVat) : null;
    if (resellerPriceExclVat !== undefined) upd.resellerPriceExclVat = resellerPriceExclVat != null ? String(resellerPriceExclVat) : null;
    if (resellerPriceInclVat !== undefined) upd.resellerPriceInclVat = resellerPriceInclVat != null ? String(resellerPriceInclVat) : null;
    if (priceInclVat !== undefined) upd.priceInclVat = priceInclVat != null ? String(priceInclVat) : null;
    if (status !== undefined) upd.status = status;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(webHostingPackagesTable).set(upd).where(eq(webHostingPackagesTable.id, id));
    const [pkg] = await db.select().from(webHostingPackagesTable).where(eq(webHostingPackagesTable.id, id));
    if (!pkg) return res.status(404).json({ error: "Not found" });
    return res.json(serializeHostingPackage(pkg));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/hosting-packages/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(webHostingPackagesTable).where(eq(webHostingPackagesTable.id, id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/hosting-packages/bulk-import", requireAdmin, async (req, res) => {
  try {
    const { items: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No items provided" });
    let created = 0, skipped = 0; const errors: string[] = [];
    for (const row of rows) {
      if (!row.name?.trim()) { skipped++; continue; }
      try {
        await db.insert(webHostingPackagesTable).values({
          name: row.name.trim(), description: row.description?.trim() || null,
          diskSpaceGb: row.diskSpaceGb != null ? Number(row.diskSpaceGb) : 1,
          bandwidthGb: row.bandwidthGb != null ? Number(row.bandwidthGb) : 10,
          emailAccounts: row.emailAccounts != null ? Number(row.emailAccounts) : 5,
          databases: row.databases != null ? Number(row.databases) : 1,
          subdomains: row.subdomains != null ? Number(row.subdomains) : 1,
          sslIncluded: row.sslIncluded === false || String(row.sslIncluded).toLowerCase() === "false" ? false : true,
          retailPriceExclVat: row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : null,
          resellerPriceExclVat: row.resellerPriceExclVat != null && row.resellerPriceExclVat !== "" ? String(row.resellerPriceExclVat) : null,
          resellerPriceInclVat: row.resellerPriceInclVat != null && row.resellerPriceInclVat !== "" ? String(row.resellerPriceInclVat) : null,
          priceInclVat: row.priceInclVat != null && row.priceInclVat !== "" ? String(row.priceInclVat) : null,
          status: row.status === "inactive" ? "inactive" : "active",
          sortOrder: row.sortOrder != null ? Number(row.sortOrder) : 0,
        });
        created++;
      } catch (e: any) { errors.push(`"${row.name}": ${e.message}`); }
    }
    return res.json({ ok: true, created, skipped, errors });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

// ── Domain TLDs ───────────────────────────────────────────────────────────────

function serializeDomainTld(t: any) {
  return {
    ...t,
    retailPriceExclVat: t.retailPriceExclVat != null ? Number(t.retailPriceExclVat) : null,
    priceInclVat: t.priceInclVat != null ? Number(t.priceInclVat) : null,
    resellerPriceExclVat: t.resellerPriceExclVat != null ? Number(t.resellerPriceExclVat) : null,
    resellerPriceInclVat: t.resellerPriceInclVat != null ? Number(t.resellerPriceInclVat) : null,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
  };
}

router.get("/admin/domain-tlds", requireAdmin, async (_req, res) => {
  try {
    const tlds = await db.select().from(domainTldsTable).orderBy(domainTldsTable.sortOrder, domainTldsTable.tld);
    return res.json(tlds.map(serializeDomainTld));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/domain-tlds", requireAdmin, async (req, res) => {
  try {
    const { tld, description, registrationYears, retailPriceExclVat, priceInclVat, resellerPriceExclVat, resellerPriceInclVat, status, sortOrder } = req.body;
    if (!tld) return res.status(400).json({ error: "TLD is required" });
    const [{ id }] = await db
      .insert(domainTldsTable)
      .values({
        tld: tld.startsWith(".") ? tld : `.${tld}`,
        description: description || null,
        registrationYears: registrationYears ?? 1,
        retailPriceExclVat: retailPriceExclVat != null ? String(retailPriceExclVat) : null,
        priceInclVat: priceInclVat != null ? String(priceInclVat) : null,
        resellerPriceExclVat: resellerPriceExclVat != null ? String(resellerPriceExclVat) : null,
        resellerPriceInclVat: resellerPriceInclVat != null ? String(resellerPriceInclVat) : null,
        status: status || "active",
        sortOrder: sortOrder ?? 0,
      })
      .returning();
    const [row] = await db.select().from(domainTldsTable).where(eq(domainTldsTable.id, id));
    if (!row) return res.status(500).json({ error: "Failed to create domain TLD" });
    return res.status(201).json(serializeDomainTld(row));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/domain-tlds/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { tld, description, registrationYears, retailPriceExclVat, priceInclVat, resellerPriceExclVat, resellerPriceInclVat, status, sortOrder } = req.body;
    const upd: any = {};
    if (tld !== undefined) upd.tld = tld.startsWith(".") ? tld : `.${tld}`;
    if (description !== undefined) upd.description = description || null;
    if (registrationYears !== undefined) upd.registrationYears = registrationYears;
    if (retailPriceExclVat !== undefined) upd.retailPriceExclVat = retailPriceExclVat != null ? String(retailPriceExclVat) : null;
    if (priceInclVat !== undefined) upd.priceInclVat = priceInclVat != null ? String(priceInclVat) : null;
    if (resellerPriceExclVat !== undefined) upd.resellerPriceExclVat = resellerPriceExclVat != null ? String(resellerPriceExclVat) : null;
    if (resellerPriceInclVat !== undefined) upd.resellerPriceInclVat = resellerPriceInclVat != null ? String(resellerPriceInclVat) : null;
    if (status !== undefined) upd.status = status;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(domainTldsTable).set(upd).where(eq(domainTldsTable.id, id));
    const [row] = await db.select().from(domainTldsTable).where(eq(domainTldsTable.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(serializeDomainTld(row));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/domain-tlds/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(domainTldsTable).where(eq(domainTldsTable.id, id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/domain-tlds/bulk-import", requireAdmin, async (req, res) => {
  try {
    const { items: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No items provided" });
    let created = 0, skipped = 0; const errors: string[] = [];
    for (const row of rows) {
      const rawTld = String(row.tld || row.TLD || "").trim();
      if (!rawTld) { skipped++; continue; }
      const tld = rawTld.startsWith(".") ? rawTld : `.${rawTld}`;
      try {
        await db.insert(domainTldsTable).values({
          tld, description: row.description?.trim() || null,
          registrationYears: row.registrationYears != null ? Number(row.registrationYears) : 1,
          retailPriceExclVat: row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : null,
          priceInclVat: row.priceInclVat != null && row.priceInclVat !== "" ? String(row.priceInclVat) : null,
          resellerPriceExclVat: row.resellerPriceExclVat != null && row.resellerPriceExclVat !== "" ? String(row.resellerPriceExclVat) : null,
          resellerPriceInclVat: row.resellerPriceInclVat != null && row.resellerPriceInclVat !== "" ? String(row.resellerPriceInclVat) : null,
          status: row.status === "inactive" ? "inactive" : "active",
          sortOrder: row.sortOrder != null ? Number(row.sortOrder) : 0,
        });
        created++;
      } catch (e: any) { errors.push(`"${tld}": ${e.message}`); }
    }
    return res.json({ ok: true, created, skipped, errors });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

// ── Connectivity Categories ───────────────────────────────────────────────────

router.get("/admin/connectivity-categories", requireAdmin, async (_req, res) => {
  try {
    const categories = await db.select().from(connectivityCategoriesTable).orderBy(connectivityCategoriesTable.sortOrder, connectivityCategoriesTable.name);
    const withCounts = await Promise.all(
      categories.map(async (cat) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(connectivityItemsTable)
          .where(eq(connectivityItemsTable.categoryId, cat.id));
        const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null;
        return { ...cat, parentName: parent?.name ?? null, itemCount: Number(count ?? 0), createdAt: cat.createdAt.toISOString() };
      })
    );
    return res.json(withCounts);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/connectivity-categories", requireAdmin, async (req, res) => {
  try {
    const { name, description, parentId, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db.insert(connectivityCategoriesTable).values({ name, description, parentId: parentId || null, sortOrder: sortOrder ?? 0 }).returning();
    const [cat] = await db.select().from(connectivityCategoriesTable).where(eq(connectivityCategoriesTable.id, id));
    if (!cat) return res.status(500).json({ error: "Failed to create category" });
    return res.status(201).json({ ...cat, parentName: null, itemCount: 0, createdAt: cat.createdAt.toISOString() });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.put("/admin/connectivity-categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, description, parentId, sortOrder } = req.body;
    const upd: any = {};
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (parentId !== undefined) upd.parentId = parentId || null;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(connectivityCategoriesTable).set(upd).where(eq(connectivityCategoriesTable.id, id));
    const [cat] = await db.select().from(connectivityCategoriesTable).where(eq(connectivityCategoriesTable.id, id));
    if (!cat) return res.status(404).json({ error: "Not found" });
    return res.json({ ...cat, parentName: null, itemCount: 0, createdAt: cat.createdAt.toISOString() });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/connectivity-categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(connectivityCategoriesTable).where(eq(connectivityCategoriesTable.id, id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

// ── Connectivity Items ────────────────────────────────────────────────────────

function serializeConnectivityItem(item: any, categoryName?: string | null) {
  return {
    ...item,
    setupFeeExclVat: item.setupFeeExclVat != null ? Number(item.setupFeeExclVat) : null,
    retailPriceExclVat: item.retailPriceExclVat != null ? Number(item.retailPriceExclVat) : null,
    retailPriceInclVat: item.retailPriceInclVat != null ? Number(item.retailPriceInclVat) : null,
    resellerPriceExclVat: item.resellerPriceExclVat != null ? Number(item.resellerPriceExclVat) : null,
    resellerPriceInclVat: item.resellerPriceInclVat != null ? Number(item.resellerPriceInclVat) : null,
    categoryName: categoryName !== undefined ? categoryName : item.categoryName ?? null,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
  };
}

router.get("/admin/connectivity-items", requireAdmin, async (_req, res) => {
  try {
    const items = await db
      .select({
        id: connectivityItemsTable.id,
        categoryId: connectivityItemsTable.categoryId,
        categoryName: connectivityCategoriesTable.name,
        name: connectivityItemsTable.name,
        description: connectivityItemsTable.description,
        speed: connectivityItemsTable.speed,
        provider: connectivityItemsTable.provider,
        contention: connectivityItemsTable.contention,
        contractMonths: connectivityItemsTable.contractMonths,
        setupFeeExclVat: connectivityItemsTable.setupFeeExclVat,
        retailPriceExclVat: connectivityItemsTable.retailPriceExclVat,
        retailPriceInclVat: connectivityItemsTable.retailPriceInclVat,
        resellerPriceExclVat: connectivityItemsTable.resellerPriceExclVat,
        resellerPriceInclVat: connectivityItemsTable.resellerPriceInclVat,
        status: connectivityItemsTable.status,
        sortOrder: connectivityItemsTable.sortOrder,
        createdAt: connectivityItemsTable.createdAt,
      })
      .from(connectivityItemsTable)
      .leftJoin(connectivityCategoriesTable, eq(connectivityItemsTable.categoryId, connectivityCategoriesTable.id))
      .orderBy(connectivityItemsTable.sortOrder, connectivityItemsTable.name);
    return res.json(items.map((i) => serializeConnectivityItem(i)));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/connectivity-items", requireAdmin, async (req, res) => {
  try {
    const { categoryId, name, description, speed, provider, contention, contractMonths, setupFeeExclVat, retailPriceExclVat, retailPriceInclVat, resellerPriceExclVat, resellerPriceInclVat, status, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db.insert(connectivityItemsTable).values({
      categoryId: categoryId || null,
      name, description,
      speed: speed || null, provider: provider || null, contention: contention || null,
      contractMonths: contractMonths ?? 12,
      setupFeeExclVat: setupFeeExclVat != null ? String(setupFeeExclVat) : null,
      retailPriceExclVat: retailPriceExclVat != null ? String(retailPriceExclVat) : null,
      retailPriceInclVat: retailPriceInclVat != null ? String(retailPriceInclVat) : null,
      resellerPriceExclVat: resellerPriceExclVat != null ? String(resellerPriceExclVat) : null,
      resellerPriceInclVat: resellerPriceInclVat != null ? String(resellerPriceInclVat) : null,
      status: status || "active", sortOrder: sortOrder ?? 0,
    }).returning();
    const [item] = await db.select().from(connectivityItemsTable).where(eq(connectivityItemsTable.id, id));
    if (!item) return res.status(500).json({ error: "Failed to create item" });
    return res.status(201).json(serializeConnectivityItem(item, null));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.put("/admin/connectivity-items/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { categoryId, name, description, speed, provider, contention, contractMonths, setupFeeExclVat, retailPriceExclVat, retailPriceInclVat, resellerPriceExclVat, resellerPriceInclVat, status, sortOrder } = req.body;
    const upd: any = {};
    if (categoryId !== undefined) upd.categoryId = categoryId || null;
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (speed !== undefined) upd.speed = speed;
    if (provider !== undefined) upd.provider = provider;
    if (contention !== undefined) upd.contention = contention;
    if (contractMonths !== undefined) upd.contractMonths = contractMonths;
    if (setupFeeExclVat !== undefined) upd.setupFeeExclVat = setupFeeExclVat != null ? String(setupFeeExclVat) : null;
    if (retailPriceExclVat !== undefined) upd.retailPriceExclVat = retailPriceExclVat != null ? String(retailPriceExclVat) : null;
    if (retailPriceInclVat !== undefined) upd.retailPriceInclVat = retailPriceInclVat != null ? String(retailPriceInclVat) : null;
    if (resellerPriceExclVat !== undefined) upd.resellerPriceExclVat = resellerPriceExclVat != null ? String(resellerPriceExclVat) : null;
    if (resellerPriceInclVat !== undefined) upd.resellerPriceInclVat = resellerPriceInclVat != null ? String(resellerPriceInclVat) : null;
    if (status !== undefined) upd.status = status;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(connectivityItemsTable).set(upd).where(eq(connectivityItemsTable.id, id));
    const [item] = await db.select().from(connectivityItemsTable).where(eq(connectivityItemsTable.id, id));
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(serializeConnectivityItem(item, null));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/connectivity-items/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(connectivityItemsTable).where(eq(connectivityItemsTable.id, id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/connectivity-items/bulk-import", requireAdmin, async (req, res) => {
  try {
    const { items: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No items provided" });
    let created = 0, skipped = 0; const errors: string[] = [];
    for (const row of rows) {
      if (!row.name?.trim()) { skipped++; continue; }
      try {
        await db.insert(connectivityItemsTable).values({
          name: row.name.trim(), description: row.description?.trim() || null,
          categoryId: null,
          speed: row.speed?.trim() || null, provider: row.provider?.trim() || null, contention: row.contention?.trim() || null,
          contractMonths: row.contractMonths != null ? Number(row.contractMonths) : 12,
          setupFeeExclVat: row.setupFeeExclVat != null && row.setupFeeExclVat !== "" ? String(row.setupFeeExclVat) : null,
          retailPriceExclVat: row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : null,
          retailPriceInclVat: row.retailPriceInclVat != null && row.retailPriceInclVat !== "" ? String(row.retailPriceInclVat) : null,
          resellerPriceExclVat: row.resellerPriceExclVat != null && row.resellerPriceExclVat !== "" ? String(row.resellerPriceExclVat) : null,
          resellerPriceInclVat: row.resellerPriceInclVat != null && row.resellerPriceInclVat !== "" ? String(row.resellerPriceInclVat) : null,
          status: row.status === "inactive" ? "inactive" : "active",
          sortOrder: row.sortOrder != null ? Number(row.sortOrder) : 0,
        });
        created++;
      } catch (e: any) { errors.push(`"${row.name}": ${e.message}`); }
    }
    return res.json({ ok: true, created, skipped, errors });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

// ── Catalog (public/reseller read-only) ─────────────────────────────────────

router.get("/catalog/connectivity", async (_req, res) => {
  try {
    const items = await db
      .select({
        id: connectivityItemsTable.id,
        categoryId: connectivityItemsTable.categoryId,
        categoryName: connectivityCategoriesTable.name,
        name: connectivityItemsTable.name,
        description: connectivityItemsTable.description,
        speed: connectivityItemsTable.speed,
        provider: connectivityItemsTable.provider,
        contention: connectivityItemsTable.contention,
        contractMonths: connectivityItemsTable.contractMonths,
        setupFeeExclVat: connectivityItemsTable.setupFeeExclVat,
        retailPriceExclVat: connectivityItemsTable.retailPriceExclVat,
        retailPriceInclVat: connectivityItemsTable.retailPriceInclVat,
        resellerPriceExclVat: connectivityItemsTable.resellerPriceExclVat,
        resellerPriceInclVat: connectivityItemsTable.resellerPriceInclVat,
        status: connectivityItemsTable.status,
        sortOrder: connectivityItemsTable.sortOrder,
        createdAt: connectivityItemsTable.createdAt,
      })
      .from(connectivityItemsTable)
      .leftJoin(connectivityCategoriesTable, eq(connectivityItemsTable.categoryId, connectivityCategoriesTable.id))
      .where(eq(connectivityItemsTable.status, "active"))
      .orderBy(connectivityItemsTable.sortOrder, connectivityItemsTable.name);
    return res.json(items.map((i) => serializeConnectivityItem(i)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/catalog/services", async (_req, res) => {
  try {
    const services = await db
      .select({
        id: servicesTable.id,
        categoryId: servicesTable.categoryId,
        categoryName: serviceCategoriesTable.name,
        name: servicesTable.name,
        description: servicesTable.description,
        price: servicesTable.price,
        retailPriceExclVat: servicesTable.retailPriceExclVat,
        priceInclVat: servicesTable.priceInclVat,
        resellerPriceExclVat: servicesTable.resellerPriceExclVat,
        resellerPriceInclVat: servicesTable.resellerPriceInclVat,
        unit: servicesTable.unit,
        status: servicesTable.status,
        sortOrder: servicesTable.sortOrder,
        createdAt: servicesTable.createdAt,
      })
      .from(servicesTable)
      .leftJoin(serviceCategoriesTable, eq(servicesTable.categoryId, serviceCategoriesTable.id))
      .where(eq(servicesTable.status, "active"))
      .orderBy(servicesTable.sortOrder, servicesTable.name);
    return res.json(services.map((s) => serializeService(s)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/catalog/hosting-packages", async (_req, res) => {
  try {
    const packages = await db
      .select()
      .from(webHostingPackagesTable)
      .where(eq(webHostingPackagesTable.status, "active"))
      .orderBy(webHostingPackagesTable.sortOrder, webHostingPackagesTable.name);
    return res.json(packages.map(serializeHostingPackage));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/catalog/domain-tlds", async (_req, res) => {
  try {
    const tlds = await db
      .select()
      .from(domainTldsTable)
      .where(eq(domainTldsTable.status, "active"))
      .orderBy(domainTldsTable.sortOrder, domainTldsTable.tld);
    return res.json(tlds.map(serializeDomainTld));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/catalog/products", async (_req, res) => {
  try {
    const products = await db
      .select({
        id: productsTable.id,
        categoryId: productsTable.categoryId,
        categoryName: productCategoriesTable.name,
        name: productsTable.name,
        description: productsTable.description,
        sku: productsTable.sku,
        imageUrl: productsTable.imageUrl,
        price: productsTable.price,
        retailPriceExclVat: productsTable.retailPriceExclVat,
        priceInclVat: productsTable.priceInclVat,
        resellerPriceExclVat: productsTable.resellerPriceExclVat,
        resellerPriceInclVat: productsTable.resellerPriceInclVat,
        stockCount: productsTable.stockCount,
        status: productsTable.status,
        sortOrder: productsTable.sortOrder,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .leftJoin(productCategoriesTable, eq(productsTable.categoryId, productCategoriesTable.id))
      .where(eq(productsTable.status, "active"))
      .orderBy(productsTable.sortOrder, productsTable.name);
    return res.json(products.map((p) => serializeProduct(p)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Catalog: new items (last 30 days) ────────────────────────────────────────

router.get("/catalog/new-items", async (_req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const newServices = await db
      .select({ id: servicesTable.id, name: servicesTable.name, type: sql<string>`'service'`, createdAt: servicesTable.createdAt })
      .from(servicesTable)
      .where(eq(servicesTable.status, "active"))
      .orderBy(servicesTable.createdAt);

    const newProducts = await db
      .select({ id: productsTable.id, name: productsTable.name, type: sql<string>`'product'`, createdAt: productsTable.createdAt })
      .from(productsTable)
      .where(eq(productsTable.status, "active"))
      .orderBy(productsTable.createdAt);

    const newHosting = await db
      .select({ id: webHostingPackagesTable.id, name: webHostingPackagesTable.name, type: sql<string>`'hosting'`, createdAt: webHostingPackagesTable.createdAt })
      .from(webHostingPackagesTable)
      .where(eq(webHostingPackagesTable.status, "active"))
      .orderBy(webHostingPackagesTable.createdAt);

    const newTlds = await db
      .select({ id: domainTldsTable.id, name: domainTldsTable.tld, type: sql<string>`'domain'`, createdAt: domainTldsTable.createdAt })
      .from(domainTldsTable)
      .where(eq(domainTldsTable.status, "active"))
      .orderBy(domainTldsTable.createdAt);

    const newConnectivity = await db
      .select({ id: connectivityItemsTable.id, name: connectivityItemsTable.name, type: sql<string>`'connectivity'`, createdAt: connectivityItemsTable.createdAt })
      .from(connectivityItemsTable)
      .where(eq(connectivityItemsTable.status, "active"))
      .orderBy(connectivityItemsTable.createdAt);

    const newCybersecurity = await db
      .select({ id: cybersecurityItemsTable.id, name: cybersecurityItemsTable.name, type: sql<string>`'cybersecurity'`, createdAt: cybersecurityItemsTable.createdAt })
      .from(cybersecurityItemsTable)
      .where(eq(cybersecurityItemsTable.status, "active"))
      .orderBy(cybersecurityItemsTable.createdAt);

    const newDataSecurity = await db
      .select({ id: dataSecurityItemsTable.id, name: dataSecurityItemsTable.name, type: sql<string>`'data-security'`, createdAt: dataSecurityItemsTable.createdAt })
      .from(dataSecurityItemsTable)
      .where(eq(dataSecurityItemsTable.status, "active"))
      .orderBy(dataSecurityItemsTable.createdAt);

    const newWebDev = await db
      .select({ id: webDevItemsTable.id, name: webDevItemsTable.name, type: sql<string>`'web-development'`, createdAt: webDevItemsTable.createdAt })
      .from(webDevItemsTable)
      .where(eq(webDevItemsTable.status, "active"))
      .orderBy(webDevItemsTable.createdAt);

    const newVoipSolutions = await db
      .select({ id: voipItemsTable.id, name: voipItemsTable.name, type: sql<string>`'voip-solutions'`, createdAt: voipItemsTable.createdAt })
      .from(voipItemsTable)
      .where(eq(voipItemsTable.status, "active"))
      .orderBy(voipItemsTable.createdAt);

    const allItems = [
      ...newServices, ...newProducts, ...newHosting, ...newTlds,
      ...newConnectivity, ...newCybersecurity, ...newDataSecurity,
      ...newWebDev, ...newVoipSolutions,
    ]
      .map(i => ({ ...i, createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : i.createdAt }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    const recentItems = allItems.filter(i => new Date(i.createdAt) >= since);

    return res.json({
      recentItems,
      totalServices: newServices.length,
      totalProducts: newProducts.length,
      totalHosting: newHosting.length,
      totalDomains: newTlds.length,
      totalConnectivity: newConnectivity.length,
      totalCybersecurity: newCybersecurity.length,
      totalDataSecurity: newDataSecurity.length,
      totalWebDevelopment: newWebDev.length,
      totalVoipSolutions: newVoipSolutions.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Generic service-like item serializer ────────────────────────────────────

function serializeServiceLikeItem(item: any) {
  const retailExcl = item.retailPriceExclVat != null ? Number(item.retailPriceExclVat) : null;
  const retailIncl = (item.retailPriceInclVat ?? item.priceInclVat) != null ? Number(item.retailPriceInclVat ?? item.priceInclVat) : null;
  return {
    ...item,
    price: item.price != null ? Number(item.price) : (retailExcl ?? 0),
    retailPriceExclVat: retailExcl,
    retailPriceInclVat: retailIncl,
    resellerPriceExclVat: item.resellerPriceExclVat != null ? Number(item.resellerPriceExclVat) : null,
    resellerPriceInclVat: item.resellerPriceInclVat != null ? Number(item.resellerPriceInclVat) : null,
    priceInclVat: retailIncl,
    unit: item.unit ?? "month",
  };
}

// ── Cybersecurity ─────────────────────────────────────────────────────────────

router.get("/admin/cybersecurity-categories", requireAdmin, async (_req, res) => {
  try {
    const cats = await db.select().from(cybersecurityCategoriesTable).orderBy(cybersecurityCategoriesTable.sortOrder, cybersecurityCategoriesTable.name);
    return res.json(cats);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/cybersecurity-categories", requireAdmin, async (req, res) => {
  try {
    const { name, description, parentId, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db.insert(cybersecurityCategoriesTable).values({ name, description, parentId: parentId || null, sortOrder: sortOrder ?? 0 }).returning();
    const [cat] = await db.select().from(cybersecurityCategoriesTable).where(eq(cybersecurityCategoriesTable.id, id));
    if (!cat) return res.status(500).json({ error: "Failed to create category" });
    return res.status(201).json(cat);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.put("/admin/cybersecurity-categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, description, parentId, sortOrder } = req.body;
    const upd: any = {};
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (parentId !== undefined) upd.parentId = parentId || null;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(cybersecurityCategoriesTable).set(upd).where(eq(cybersecurityCategoriesTable.id, id));
    const [cat] = await db.select().from(cybersecurityCategoriesTable).where(eq(cybersecurityCategoriesTable.id, id));
    if (!cat) return res.status(404).json({ error: "Not found" });
    return res.json(cat);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/cybersecurity-categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(cybersecurityCategoriesTable).where(eq(cybersecurityCategoriesTable.id, id));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/admin/cybersecurity-items", requireAdmin, async (_req, res) => {
  try {
    const items = await db.select({ id: cybersecurityItemsTable.id, categoryId: cybersecurityItemsTable.categoryId, categoryName: cybersecurityCategoriesTable.name, name: cybersecurityItemsTable.name, description: cybersecurityItemsTable.description, retailPriceExclVat: cybersecurityItemsTable.retailPriceExclVat, retailPriceInclVat: cybersecurityItemsTable.retailPriceInclVat, resellerPriceExclVat: cybersecurityItemsTable.resellerPriceExclVat, resellerPriceInclVat: cybersecurityItemsTable.resellerPriceInclVat, status: cybersecurityItemsTable.status, sortOrder: cybersecurityItemsTable.sortOrder, createdAt: cybersecurityItemsTable.createdAt })
      .from(cybersecurityItemsTable).leftJoin(cybersecurityCategoriesTable, eq(cybersecurityItemsTable.categoryId, cybersecurityCategoriesTable.id)).orderBy(cybersecurityItemsTable.sortOrder, cybersecurityItemsTable.name);
    return res.json(items.map(serializeServiceLikeItem));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/cybersecurity-items", requireAdmin, async (req, res) => {
  try {
    const { categoryId, name, description, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, unit, status, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db.insert(cybersecurityItemsTable).values({ categoryId: categoryId || null, name, description, price: String(retailPriceExclVat ?? 0), retailPriceExclVat: retailPriceExclVat != null ? String(retailPriceExclVat) : null, resellerPriceExclVat: resellerPriceExclVat != null ? String(resellerPriceExclVat) : null, resellerPriceInclVat: resellerPriceInclVat != null ? String(resellerPriceInclVat) : null, priceInclVat: priceInclVat != null ? String(priceInclVat) : null, unit: unit || "month", status: status || "active", sortOrder: sortOrder ?? 0 }).returning();
    const [item] = await db.select().from(cybersecurityItemsTable).where(eq(cybersecurityItemsTable.id, id));
    if (!item) return res.status(500).json({ error: "Failed to create item" });
    return res.status(201).json(serializeServiceLikeItem(item));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.put("/admin/cybersecurity-items/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { categoryId, name, description, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, unit, status, sortOrder } = req.body;
    const upd: any = {};
    if (categoryId !== undefined) upd.categoryId = categoryId || null;
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (retailPriceExclVat !== undefined) upd.retailPriceExclVat = retailPriceExclVat != null ? String(retailPriceExclVat) : null;
    if (resellerPriceExclVat !== undefined) upd.resellerPriceExclVat = resellerPriceExclVat != null ? String(resellerPriceExclVat) : null;
    if (resellerPriceInclVat !== undefined) upd.resellerPriceInclVat = resellerPriceInclVat != null ? String(resellerPriceInclVat) : null;
    if (priceInclVat !== undefined) upd.priceInclVat = priceInclVat != null ? String(priceInclVat) : null;
    if (retailPriceExclVat !== undefined) upd.price = retailPriceExclVat != null ? String(retailPriceExclVat) : "0";
    if (unit !== undefined) upd.unit = unit;
    if (status !== undefined) upd.status = status;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(cybersecurityItemsTable).set(upd).where(eq(cybersecurityItemsTable.id, id));
    const [item] = await db.select().from(cybersecurityItemsTable).where(eq(cybersecurityItemsTable.id, id));
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(serializeServiceLikeItem(item));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/cybersecurity-items/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(cybersecurityItemsTable).where(eq(cybersecurityItemsTable.id, id));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/cybersecurity-items/bulk-import", requireAdmin, async (req, res) => {
  try {
    const { items: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No items provided" });
    let created = 0, skipped = 0; const errors: string[] = [];
    for (const row of rows) {
      if (!row.name?.trim()) { skipped++; continue; }
      try {
        await db.insert(cybersecurityItemsTable).values({
          name: row.name.trim(), description: row.description?.trim() || null, categoryId: null,
          price: row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : "0",
          retailPriceExclVat: row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : null,
          resellerPriceExclVat: row.resellerPriceExclVat != null && row.resellerPriceExclVat !== "" ? String(row.resellerPriceExclVat) : null,
          resellerPriceInclVat: row.resellerPriceInclVat != null && row.resellerPriceInclVat !== "" ? String(row.resellerPriceInclVat) : null,
          priceInclVat: row.priceInclVat != null && row.priceInclVat !== "" ? String(row.priceInclVat) : null,
          unit: row.unit || "month", status: row.status === "inactive" ? "inactive" : "active",
          sortOrder: row.sortOrder != null ? Number(row.sortOrder) : 0,
        });
        created++;
      } catch (e: any) { errors.push(`"${row.name}": ${e.message}`); }
    }
    return res.json({ ok: true, created, skipped, errors });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/catalog/cybersecurity", async (_req, res) => {
  try {
    const items = await db.select({ id: cybersecurityItemsTable.id, categoryId: cybersecurityItemsTable.categoryId, categoryName: cybersecurityCategoriesTable.name, name: cybersecurityItemsTable.name, description: cybersecurityItemsTable.description, retailPriceExclVat: cybersecurityItemsTable.retailPriceExclVat, retailPriceInclVat: cybersecurityItemsTable.retailPriceInclVat, resellerPriceExclVat: cybersecurityItemsTable.resellerPriceExclVat, resellerPriceInclVat: cybersecurityItemsTable.resellerPriceInclVat, status: cybersecurityItemsTable.status, sortOrder: cybersecurityItemsTable.sortOrder, createdAt: cybersecurityItemsTable.createdAt })
      .from(cybersecurityItemsTable).leftJoin(cybersecurityCategoriesTable, eq(cybersecurityItemsTable.categoryId, cybersecurityCategoriesTable.id)).where(eq(cybersecurityItemsTable.status, "active")).orderBy(cybersecurityItemsTable.sortOrder, cybersecurityItemsTable.name);
    return res.json(items.map(serializeServiceLikeItem));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

// ── Data Security ─────────────────────────────────────────────────────────────

router.get("/admin/data-security-categories", requireAdmin, async (_req, res) => {
  try {
    const cats = await db.select().from(dataSecurityCategoriesTable).orderBy(dataSecurityCategoriesTable.sortOrder, dataSecurityCategoriesTable.name);
    return res.json(cats);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/data-security-categories", requireAdmin, async (req, res) => {
  try {
    const { name, description, parentId, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db.insert(dataSecurityCategoriesTable).values({ name, description, parentId: parentId || null, sortOrder: sortOrder ?? 0 }).returning();
    const [cat] = await db.select().from(dataSecurityCategoriesTable).where(eq(dataSecurityCategoriesTable.id, id));
    if (!cat) return res.status(500).json({ error: "Failed to create category" });
    return res.status(201).json(cat);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.put("/admin/data-security-categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, description, parentId, sortOrder } = req.body;
    const upd: any = {};
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (parentId !== undefined) upd.parentId = parentId || null;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(dataSecurityCategoriesTable).set(upd).where(eq(dataSecurityCategoriesTable.id, id));
    const [cat] = await db.select().from(dataSecurityCategoriesTable).where(eq(dataSecurityCategoriesTable.id, id));
    if (!cat) return res.status(404).json({ error: "Not found" });
    return res.json(cat);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/data-security-categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(dataSecurityCategoriesTable).where(eq(dataSecurityCategoriesTable.id, id));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/admin/data-security-items", requireAdmin, async (_req, res) => {
  try {
    const items = await db.select({ id: dataSecurityItemsTable.id, categoryId: dataSecurityItemsTable.categoryId, categoryName: dataSecurityCategoriesTable.name, name: dataSecurityItemsTable.name, description: dataSecurityItemsTable.description, retailPriceExclVat: dataSecurityItemsTable.retailPriceExclVat, retailPriceInclVat: dataSecurityItemsTable.retailPriceInclVat, resellerPriceExclVat: dataSecurityItemsTable.resellerPriceExclVat, resellerPriceInclVat: dataSecurityItemsTable.resellerPriceInclVat, status: dataSecurityItemsTable.status, sortOrder: dataSecurityItemsTable.sortOrder, createdAt: dataSecurityItemsTable.createdAt })
      .from(dataSecurityItemsTable).leftJoin(dataSecurityCategoriesTable, eq(dataSecurityItemsTable.categoryId, dataSecurityCategoriesTable.id)).orderBy(dataSecurityItemsTable.sortOrder, dataSecurityItemsTable.name);
    return res.json(items.map(serializeServiceLikeItem));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/data-security-items", requireAdmin, async (req, res) => {
  try {
    const { categoryId, name, description, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, unit, status, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db.insert(dataSecurityItemsTable).values({ categoryId: categoryId || null, name, description, price: String(retailPriceExclVat ?? 0), retailPriceExclVat: retailPriceExclVat != null ? String(retailPriceExclVat) : null, resellerPriceExclVat: resellerPriceExclVat != null ? String(resellerPriceExclVat) : null, resellerPriceInclVat: resellerPriceInclVat != null ? String(resellerPriceInclVat) : null, priceInclVat: priceInclVat != null ? String(priceInclVat) : null, unit: unit || "month", status: status || "active", sortOrder: sortOrder ?? 0 }).returning();
    const [item] = await db.select().from(dataSecurityItemsTable).where(eq(dataSecurityItemsTable.id, id));
    if (!item) return res.status(500).json({ error: "Failed to create item" });
    return res.status(201).json(serializeServiceLikeItem(item));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.put("/admin/data-security-items/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { categoryId, name, description, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, unit, status, sortOrder } = req.body;
    const upd: any = {};
    if (categoryId !== undefined) upd.categoryId = categoryId || null;
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (retailPriceExclVat !== undefined) upd.retailPriceExclVat = retailPriceExclVat != null ? String(retailPriceExclVat) : null;
    if (resellerPriceExclVat !== undefined) upd.resellerPriceExclVat = resellerPriceExclVat != null ? String(resellerPriceExclVat) : null;
    if (resellerPriceInclVat !== undefined) upd.resellerPriceInclVat = resellerPriceInclVat != null ? String(resellerPriceInclVat) : null;
    if (priceInclVat !== undefined) upd.priceInclVat = priceInclVat != null ? String(priceInclVat) : null;
    if (retailPriceExclVat !== undefined) upd.price = retailPriceExclVat != null ? String(retailPriceExclVat) : "0";
    if (unit !== undefined) upd.unit = unit;
    if (status !== undefined) upd.status = status;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(dataSecurityItemsTable).set(upd).where(eq(dataSecurityItemsTable.id, id));
    const [item] = await db.select().from(dataSecurityItemsTable).where(eq(dataSecurityItemsTable.id, id));
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(serializeServiceLikeItem(item));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/data-security-items/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(dataSecurityItemsTable).where(eq(dataSecurityItemsTable.id, id));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/data-security-items/bulk-import", requireAdmin, async (req, res) => {
  try {
    const { items: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No items provided" });
    let created = 0, skipped = 0; const errors: string[] = [];
    for (const row of rows) {
      if (!row.name?.trim()) { skipped++; continue; }
      try {
        await db.insert(dataSecurityItemsTable).values({
          name: row.name.trim(), description: row.description?.trim() || null, categoryId: null,
          price: row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : "0",
          retailPriceExclVat: row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : null,
          resellerPriceExclVat: row.resellerPriceExclVat != null && row.resellerPriceExclVat !== "" ? String(row.resellerPriceExclVat) : null,
          resellerPriceInclVat: row.resellerPriceInclVat != null && row.resellerPriceInclVat !== "" ? String(row.resellerPriceInclVat) : null,
          priceInclVat: row.priceInclVat != null && row.priceInclVat !== "" ? String(row.priceInclVat) : null,
          unit: row.unit || "month", status: row.status === "inactive" ? "inactive" : "active",
          sortOrder: row.sortOrder != null ? Number(row.sortOrder) : 0,
        });
        created++;
      } catch (e: any) { errors.push(`"${row.name}": ${e.message}`); }
    }
    return res.json({ ok: true, created, skipped, errors });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/catalog/data-security", async (_req, res) => {
  try {
    const items = await db.select({ id: dataSecurityItemsTable.id, categoryId: dataSecurityItemsTable.categoryId, categoryName: dataSecurityCategoriesTable.name, name: dataSecurityItemsTable.name, description: dataSecurityItemsTable.description, retailPriceExclVat: dataSecurityItemsTable.retailPriceExclVat, retailPriceInclVat: dataSecurityItemsTable.retailPriceInclVat, resellerPriceExclVat: dataSecurityItemsTable.resellerPriceExclVat, resellerPriceInclVat: dataSecurityItemsTable.resellerPriceInclVat, status: dataSecurityItemsTable.status, sortOrder: dataSecurityItemsTable.sortOrder, createdAt: dataSecurityItemsTable.createdAt })
      .from(dataSecurityItemsTable).leftJoin(dataSecurityCategoriesTable, eq(dataSecurityItemsTable.categoryId, dataSecurityCategoriesTable.id)).where(eq(dataSecurityItemsTable.status, "active")).orderBy(dataSecurityItemsTable.sortOrder, dataSecurityItemsTable.name);
    return res.json(items.map(serializeServiceLikeItem));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

// ── Web Development ───────────────────────────────────────────────────────────

router.get("/admin/web-dev-categories", requireAdmin, async (_req, res) => {
  try {
    const cats = await db.select().from(webDevCategoriesTable).orderBy(webDevCategoriesTable.sortOrder, webDevCategoriesTable.name);
    return res.json(cats);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/web-dev-categories", requireAdmin, async (req, res) => {
  try {
    const { name, description, parentId, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db.insert(webDevCategoriesTable).values({ name, description, parentId: parentId || null, sortOrder: sortOrder ?? 0 }).returning();
    const [cat] = await db.select().from(webDevCategoriesTable).where(eq(webDevCategoriesTable.id, id));
    if (!cat) return res.status(500).json({ error: "Failed to create category" });
    return res.status(201).json(cat);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.put("/admin/web-dev-categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, description, parentId, sortOrder } = req.body;
    const upd: any = {};
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (parentId !== undefined) upd.parentId = parentId || null;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(webDevCategoriesTable).set(upd).where(eq(webDevCategoriesTable.id, id));
    const [cat] = await db.select().from(webDevCategoriesTable).where(eq(webDevCategoriesTable.id, id));
    if (!cat) return res.status(404).json({ error: "Not found" });
    return res.json(cat);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/web-dev-categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(webDevCategoriesTable).where(eq(webDevCategoriesTable.id, id));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/admin/web-dev-items", requireAdmin, async (_req, res) => {
  try {
    const items = await db.select({ id: webDevItemsTable.id, categoryId: webDevItemsTable.categoryId, categoryName: webDevCategoriesTable.name, name: webDevItemsTable.name, description: webDevItemsTable.description, retailPriceExclVat: webDevItemsTable.retailPriceExclVat, retailPriceInclVat: webDevItemsTable.retailPriceInclVat, resellerPriceExclVat: webDevItemsTable.resellerPriceExclVat, resellerPriceInclVat: webDevItemsTable.resellerPriceInclVat, status: webDevItemsTable.status, sortOrder: webDevItemsTable.sortOrder, createdAt: webDevItemsTable.createdAt })
      .from(webDevItemsTable).leftJoin(webDevCategoriesTable, eq(webDevItemsTable.categoryId, webDevCategoriesTable.id)).orderBy(webDevItemsTable.sortOrder, webDevItemsTable.name);
    return res.json(items.map(serializeServiceLikeItem));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/web-dev-items", requireAdmin, async (req, res) => {
  try {
    const { categoryId, name, description, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, unit, status, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db.insert(webDevItemsTable).values({ categoryId: categoryId || null, name, description, price: String(retailPriceExclVat ?? 0), retailPriceExclVat: retailPriceExclVat != null ? String(retailPriceExclVat) : null, resellerPriceExclVat: resellerPriceExclVat != null ? String(resellerPriceExclVat) : null, resellerPriceInclVat: resellerPriceInclVat != null ? String(resellerPriceInclVat) : null, priceInclVat: priceInclVat != null ? String(priceInclVat) : null, unit: unit || "month", status: status || "active", sortOrder: sortOrder ?? 0 }).returning();
    const [item] = await db.select().from(webDevItemsTable).where(eq(webDevItemsTable.id, id));
    if (!item) return res.status(500).json({ error: "Failed to create item" });
    return res.status(201).json(serializeServiceLikeItem(item));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.put("/admin/web-dev-items/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { categoryId, name, description, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, unit, status, sortOrder } = req.body;
    const upd: any = {};
    if (categoryId !== undefined) upd.categoryId = categoryId || null;
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (retailPriceExclVat !== undefined) upd.retailPriceExclVat = retailPriceExclVat != null ? String(retailPriceExclVat) : null;
    if (resellerPriceExclVat !== undefined) upd.resellerPriceExclVat = resellerPriceExclVat != null ? String(resellerPriceExclVat) : null;
    if (resellerPriceInclVat !== undefined) upd.resellerPriceInclVat = resellerPriceInclVat != null ? String(resellerPriceInclVat) : null;
    if (priceInclVat !== undefined) upd.priceInclVat = priceInclVat != null ? String(priceInclVat) : null;
    if (retailPriceExclVat !== undefined) upd.price = retailPriceExclVat != null ? String(retailPriceExclVat) : "0";
    if (unit !== undefined) upd.unit = unit;
    if (status !== undefined) upd.status = status;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(webDevItemsTable).set(upd).where(eq(webDevItemsTable.id, id));
    const [item] = await db.select().from(webDevItemsTable).where(eq(webDevItemsTable.id, id));
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(serializeServiceLikeItem(item));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/web-dev-items/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(webDevItemsTable).where(eq(webDevItemsTable.id, id));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/web-dev-items/bulk-import", requireAdmin, async (req, res) => {
  try {
    const { items: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No items provided" });
    let created = 0, skipped = 0; const errors: string[] = [];
    for (const row of rows) {
      if (!row.name?.trim()) { skipped++; continue; }
      try {
        await db.insert(webDevItemsTable).values({
          name: row.name.trim(), description: row.description?.trim() || null, categoryId: null,
          price: row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : "0",
          retailPriceExclVat: row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : null,
          resellerPriceExclVat: row.resellerPriceExclVat != null && row.resellerPriceExclVat !== "" ? String(row.resellerPriceExclVat) : null,
          resellerPriceInclVat: row.resellerPriceInclVat != null && row.resellerPriceInclVat !== "" ? String(row.resellerPriceInclVat) : null,
          priceInclVat: row.priceInclVat != null && row.priceInclVat !== "" ? String(row.priceInclVat) : null,
          unit: row.unit || "month", status: row.status === "inactive" ? "inactive" : "active",
          sortOrder: row.sortOrder != null ? Number(row.sortOrder) : 0,
        });
        created++;
      } catch (e: any) { errors.push(`"${row.name}": ${e.message}`); }
    }
    return res.json({ ok: true, created, skipped, errors });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/catalog/web-development", async (_req, res) => {
  try {
    const items = await db.select({ id: webDevItemsTable.id, categoryId: webDevItemsTable.categoryId, categoryName: webDevCategoriesTable.name, name: webDevItemsTable.name, description: webDevItemsTable.description, retailPriceExclVat: webDevItemsTable.retailPriceExclVat, retailPriceInclVat: webDevItemsTable.retailPriceInclVat, resellerPriceExclVat: webDevItemsTable.resellerPriceExclVat, resellerPriceInclVat: webDevItemsTable.resellerPriceInclVat, status: webDevItemsTable.status, sortOrder: webDevItemsTable.sortOrder, createdAt: webDevItemsTable.createdAt })
      .from(webDevItemsTable).leftJoin(webDevCategoriesTable, eq(webDevItemsTable.categoryId, webDevCategoriesTable.id)).where(eq(webDevItemsTable.status, "active")).orderBy(webDevItemsTable.sortOrder, webDevItemsTable.name);
    return res.json(items.map(serializeServiceLikeItem));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

// ── VoIP Solutions ────────────────────────────────────────────────────────────

router.get("/admin/voip-categories", requireAdmin, async (_req, res) => {
  try {
    const cats = await db.select().from(voipCategoriesTable).orderBy(voipCategoriesTable.sortOrder, voipCategoriesTable.name);
    return res.json(cats);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/voip-categories", requireAdmin, async (req, res) => {
  try {
    const { name, description, parentId, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db.insert(voipCategoriesTable).values({ name, description, parentId: parentId || null, sortOrder: sortOrder ?? 0 }).returning();
    const [cat] = await db.select().from(voipCategoriesTable).where(eq(voipCategoriesTable.id, id));
    if (!cat) return res.status(500).json({ error: "Failed to create category" });
    return res.status(201).json(cat);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.put("/admin/voip-categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, description, parentId, sortOrder } = req.body;
    const upd: any = {};
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (parentId !== undefined) upd.parentId = parentId || null;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(voipCategoriesTable).set(upd).where(eq(voipCategoriesTable.id, id));
    const [cat] = await db.select().from(voipCategoriesTable).where(eq(voipCategoriesTable.id, id));
    if (!cat) return res.status(404).json({ error: "Not found" });
    return res.json(cat);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/voip-categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(voipCategoriesTable).where(eq(voipCategoriesTable.id, id));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/admin/voip-items", requireAdmin, async (_req, res) => {
  try {
    const items = await db.select({ id: voipItemsTable.id, categoryId: voipItemsTable.categoryId, categoryName: voipCategoriesTable.name, name: voipItemsTable.name, description: voipItemsTable.description, price: voipItemsTable.price, retailPriceExclVat: voipItemsTable.retailPriceExclVat, resellerPriceExclVat: voipItemsTable.resellerPriceExclVat, resellerPriceInclVat: voipItemsTable.resellerPriceInclVat, priceInclVat: voipItemsTable.priceInclVat, unit: voipItemsTable.unit, status: voipItemsTable.status, sortOrder: voipItemsTable.sortOrder, createdAt: voipItemsTable.createdAt })
      .from(voipItemsTable).leftJoin(voipCategoriesTable, eq(voipItemsTable.categoryId, voipCategoriesTable.id)).orderBy(voipItemsTable.sortOrder, voipItemsTable.name);
    return res.json(items.map(serializeServiceLikeItem));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/voip-items", requireAdmin, async (req, res) => {
  try {
    const { categoryId, name, description, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, unit, status, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [{ id }] = await db.insert(voipItemsTable).values({ categoryId: categoryId || null, name, description, price: String(retailPriceExclVat ?? 0), retailPriceExclVat: retailPriceExclVat != null ? String(retailPriceExclVat) : null, resellerPriceExclVat: resellerPriceExclVat != null ? String(resellerPriceExclVat) : null, resellerPriceInclVat: resellerPriceInclVat != null ? String(resellerPriceInclVat) : null, priceInclVat: priceInclVat != null ? String(priceInclVat) : null, unit: unit || "month", status: status || "active", sortOrder: sortOrder ?? 0 }).returning();
    const [item] = await db.select().from(voipItemsTable).where(eq(voipItemsTable.id, id));
    if (!item) return res.status(500).json({ error: "Failed to create item" });
    return res.status(201).json(serializeServiceLikeItem(item));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.put("/admin/voip-items/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { categoryId, name, description, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, unit, status, sortOrder } = req.body;
    const upd: any = {};
    if (categoryId !== undefined) upd.categoryId = categoryId || null;
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description;
    if (retailPriceExclVat !== undefined) upd.retailPriceExclVat = retailPriceExclVat != null ? String(retailPriceExclVat) : null;
    if (resellerPriceExclVat !== undefined) upd.resellerPriceExclVat = resellerPriceExclVat != null ? String(resellerPriceExclVat) : null;
    if (resellerPriceInclVat !== undefined) upd.resellerPriceInclVat = resellerPriceInclVat != null ? String(resellerPriceInclVat) : null;
    if (priceInclVat !== undefined) upd.priceInclVat = priceInclVat != null ? String(priceInclVat) : null;
    if (retailPriceExclVat !== undefined) upd.price = retailPriceExclVat != null ? String(retailPriceExclVat) : "0";
    if (unit !== undefined) upd.unit = unit;
    if (status !== undefined) upd.status = status;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;
    await db.update(voipItemsTable).set(upd).where(eq(voipItemsTable.id, id));
    const [item] = await db.select().from(voipItemsTable).where(eq(voipItemsTable.id, id));
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(serializeServiceLikeItem(item));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/voip-items/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(voipItemsTable).where(eq(voipItemsTable.id, id));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/voip-items/bulk-import", requireAdmin, async (req, res) => {
  try {
    const { items: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No items provided" });
    let created = 0, skipped = 0; const errors: string[] = [];
    for (const row of rows) {
      if (!row.name?.trim()) { skipped++; continue; }
      try {
        await db.insert(voipItemsTable).values({
          name: row.name.trim(), description: row.description?.trim() || null, categoryId: null,
          price: row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : "0",
          retailPriceExclVat: row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : null,
          resellerPriceExclVat: row.resellerPriceExclVat != null && row.resellerPriceExclVat !== "" ? String(row.resellerPriceExclVat) : null,
          resellerPriceInclVat: row.resellerPriceInclVat != null && row.resellerPriceInclVat !== "" ? String(row.resellerPriceInclVat) : null,
          priceInclVat: row.priceInclVat != null && row.priceInclVat !== "" ? String(row.priceInclVat) : null,
          unit: row.unit || "month", status: row.status === "inactive" ? "inactive" : "active",
          sortOrder: row.sortOrder != null ? Number(row.sortOrder) : 0,
        });
        created++;
      } catch (e: any) { errors.push(`"${row.name}": ${e.message}`); }
    }
    return res.json({ ok: true, created, skipped, errors });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/admin/voip-items/reorder", requireAdmin, async (req, res) => {
  try {
    const items: { id: number; sortOrder: number }[] = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "Expected array" });
    await Promise.all(items.map(({ id, sortOrder }) => db.update(voipItemsTable).set({ sortOrder }).where(eq(voipItemsTable.id, id))));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/admin/services/reorder", requireAdmin, async (req, res) => {
  try {
    const items: { id: number; sortOrder: number }[] = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "Expected array" });
    await Promise.all(items.map(({ id, sortOrder }) => db.update(servicesTable).set({ sortOrder }).where(eq(servicesTable.id, id))));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/admin/products/reorder", requireAdmin, async (req, res) => {
  try {
    const items: { id: number; sortOrder: number }[] = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "Expected array" });
    await Promise.all(items.map(({ id, sortOrder }) => db.update(productsTable).set({ sortOrder }).where(eq(productsTable.id, id))));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/admin/connectivity-items/reorder", requireAdmin, async (req, res) => {
  try {
    const items: { id: number; sortOrder: number }[] = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "Expected array" });
    await Promise.all(items.map(({ id, sortOrder }) => db.update(connectivityItemsTable).set({ sortOrder }).where(eq(connectivityItemsTable.id, id))));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/admin/cybersecurity-items/reorder", requireAdmin, async (req, res) => {
  try {
    const items: { id: number; sortOrder: number }[] = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "Expected array" });
    await Promise.all(items.map(({ id, sortOrder }) => db.update(cybersecurityItemsTable).set({ sortOrder }).where(eq(cybersecurityItemsTable.id, id))));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/admin/data-security-items/reorder", requireAdmin, async (req, res) => {
  try {
    const items: { id: number; sortOrder: number }[] = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "Expected array" });
    await Promise.all(items.map(({ id, sortOrder }) => db.update(dataSecurityItemsTable).set({ sortOrder }).where(eq(dataSecurityItemsTable.id, id))));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/admin/web-dev-items/reorder", requireAdmin, async (req, res) => {
  try {
    const items: { id: number; sortOrder: number }[] = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "Expected array" });
    await Promise.all(items.map(({ id, sortOrder }) => db.update(webDevItemsTable).set({ sortOrder }).where(eq(webDevItemsTable.id, id))));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/catalog/voip-solutions", async (_req, res) => {
  try {
    const items = await db.select({ id: voipItemsTable.id, categoryId: voipItemsTable.categoryId, categoryName: voipCategoriesTable.name, name: voipItemsTable.name, description: voipItemsTable.description, price: voipItemsTable.price, retailPriceExclVat: voipItemsTable.retailPriceExclVat, resellerPriceExclVat: voipItemsTable.resellerPriceExclVat, resellerPriceInclVat: voipItemsTable.resellerPriceInclVat, priceInclVat: voipItemsTable.priceInclVat, unit: voipItemsTable.unit, status: voipItemsTable.status, sortOrder: voipItemsTable.sortOrder, createdAt: voipItemsTable.createdAt })
      .from(voipItemsTable).leftJoin(voipCategoriesTable, eq(voipItemsTable.categoryId, voipCategoriesTable.id)).where(eq(voipItemsTable.status, "active")).orderBy(voipItemsTable.sortOrder, voipItemsTable.name);
    return res.json(items.map(serializeServiceLikeItem));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

function serializeMinuteBundle(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    minutes: Number(row.minutes ?? 0),
    retailPriceExclVat: row.retailPriceExclVat != null ? Number(row.retailPriceExclVat) : null,
    resellerPriceExclVat: row.resellerPriceExclVat != null ? Number(row.resellerPriceExclVat) : null,
    resellerPriceInclVat: row.resellerPriceInclVat != null ? Number(row.resellerPriceInclVat) : null,
    priceInclVat: row.retailPriceInclVat != null ? Number(row.retailPriceInclVat) : null,
    status: row.status,
    sortOrder: Number(row.sortOrder ?? 0),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

router.get("/catalog/minute-bundles", async (_req, res) => {
  try {
    const bundles = await db
      .select()
      .from(minuteBundlesTable)
      .where(eq(minuteBundlesTable.status, "active"))
      .orderBy(minuteBundlesTable.sortOrder, minuteBundlesTable.name);
    return res.json(bundles.map(serializeMinuteBundle));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/minute-bundles", requireAdmin, async (_req, res) => {
  try {
    const bundles = await db
      .select()
      .from(minuteBundlesTable)
      .orderBy(minuteBundlesTable.sortOrder, minuteBundlesTable.name);
    return res.json(bundles.map(serializeMinuteBundle));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/minute-bundles", requireAdmin, async (req, res) => {
  try {
    const { name, description, minutes, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, status, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const parsedMinutes = Number(minutes);
    if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
      return res.status(400).json({ error: "Minutes must be a positive number" });
    }

    const [{ id }] = await db
      .insert(minuteBundlesTable)
      .values({
        name,
        description: description || null,
        minutes: Math.floor(parsedMinutes),
        retailPriceExclVat: retailPriceExclVat != null ? String(retailPriceExclVat) : null,
        resellerPriceExclVat: resellerPriceExclVat != null ? String(resellerPriceExclVat) : null,
        resellerPriceInclVat: resellerPriceInclVat != null ? String(resellerPriceInclVat) : null,
        priceInclVat: priceInclVat != null ? String(priceInclVat) : null,
        status: status || "active",
        sortOrder: sortOrder ?? 0,
      })
      .returning();

    const [row] = await db.select().from(minuteBundlesTable).where(eq(minuteBundlesTable.id, id));
    if (!row) return res.status(500).json({ error: "Failed to create minute bundle" });
    return res.status(201).json(serializeMinuteBundle(row));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/minute-bundles/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, description, minutes, retailPriceExclVat, resellerPriceExclVat, resellerPriceInclVat, priceInclVat, status, sortOrder } = req.body;
    const upd: any = {};
    if (name !== undefined) upd.name = name;
    if (description !== undefined) upd.description = description || null;
    if (minutes !== undefined) {
      const parsed = Number(minutes);
      if (!Number.isFinite(parsed) || parsed <= 0) return res.status(400).json({ error: "Minutes must be a positive number" });
      upd.minutes = Math.floor(parsed);
    }
    if (retailPriceExclVat !== undefined) upd.retailPriceExclVat = retailPriceExclVat != null ? String(retailPriceExclVat) : null;
    if (resellerPriceExclVat !== undefined) upd.resellerPriceExclVat = resellerPriceExclVat != null ? String(resellerPriceExclVat) : null;
    if (resellerPriceInclVat !== undefined) upd.resellerPriceInclVat = resellerPriceInclVat != null ? String(resellerPriceInclVat) : null;
    if (priceInclVat !== undefined) upd.priceInclVat = priceInclVat != null ? String(priceInclVat) : null;
    if (status !== undefined) upd.status = status;
    if (sortOrder !== undefined) upd.sortOrder = sortOrder;

    await db.update(minuteBundlesTable).set(upd).where(eq(minuteBundlesTable.id, id));
    const [row] = await db.select().from(minuteBundlesTable).where(eq(minuteBundlesTable.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(serializeMinuteBundle(row));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/minute-bundles/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(minuteBundlesTable).where(eq(minuteBundlesTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/minute-bundles/bulk-import", requireAdmin, async (req, res) => {
  try {
    const { items: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No items provided" });
    let created = 0, skipped = 0; const errors: string[] = [];
    for (const row of rows) {
      if (!row.name?.trim()) { skipped++; continue; }
      const minutes = Number(row.minutes);
      if (!Number.isFinite(minutes) || minutes <= 0) { errors.push(`"${row.name}": minutes must be a positive number`); continue; }
      try {
        await db.insert(minuteBundlesTable).values({
          name: row.name.trim(), description: row.description?.trim() || null,
          minutes: Math.floor(minutes),
          retailPriceExclVat: row.retailPriceExclVat != null && row.retailPriceExclVat !== "" ? String(row.retailPriceExclVat) : null,
          resellerPriceExclVat: row.resellerPriceExclVat != null && row.resellerPriceExclVat !== "" ? String(row.resellerPriceExclVat) : null,
          resellerPriceInclVat: row.resellerPriceInclVat != null && row.resellerPriceInclVat !== "" ? String(row.resellerPriceInclVat) : null,
          priceInclVat: row.priceInclVat != null && row.priceInclVat !== "" ? String(row.priceInclVat) : null,
          status: row.status === "inactive" ? "inactive" : "active",
          sortOrder: row.sortOrder != null ? Number(row.sortOrder) : 0,
        });
        created++;
      } catch (e: any) { errors.push(`"${row.name}": ${e.message}`); }
    }
    return res.json({ ok: true, created, skipped, errors });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

export default router;
