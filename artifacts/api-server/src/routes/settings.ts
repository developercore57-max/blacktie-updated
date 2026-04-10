import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { db } from "@workspace/db";
import {
  adminsTable, companySettingsTable, emailTemplatesTable,
  resellersTable, clientsTable, areaCodesTable, didsTable,
  ordersTable, orderItemsTable, orderCommentsTable,
  serviceCategoriesTable, servicesTable,
  productCategoriesTable, productsTable,
  webHostingPackagesTable, domainTldsTable,
  noticesTable, documentsTable,
  chatThreadsTable, chatMessagesTable,
  coverageCheckRequestsTable, coverageCheckCommentsTable,
  numberPortingRequestsTable, didRequestsTable,
  minuteBundlesTable,
  connectivityCategoriesTable, connectivityItemsTable,
  cybersecurityCategoriesTable, cybersecurityItemsTable,
  dataSecurityCategoriesTable, dataSecurityItemsTable,
  webDevCategoriesTable, webDevItemsTable,
  voipCategoriesTable, voipItemsTable,
} from "@workspace/db";
import { eq, ne } from "@workspace/db";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session.userId || session.userRole !== "admin") {
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
}

router.use(requireAdmin);

// ── Staff ─────────────────────────────────────────────────────────────────────

function formatStaff(a: typeof adminsTable.$inferSelect) {
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    phone: a.phone ?? null,
    role: a.role,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/staff", async (_req, res) => {
  try {
    const staff = await db.select().from(adminsTable).orderBy(adminsTable.createdAt);
    return res.json(staff.map(formatStaff));
  } catch (err) {
    console.error("Get staff error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/staff", async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [{ id }] = await db
      .insert(adminsTable)
      .values({ name, email, passwordHash, phone: phone || null, role: role || "staff", isActive: true })
      .returning();
    const [staff] = await db.select().from(adminsTable).where(eq(adminsTable.id, id));
    if (!staff) return res.status(500).json({ error: "Failed to create staff member" });
    return res.status(201).json(formatStaff(staff));
  } catch (err: any) {
    console.error("Create staff error:", err);
    if (err?.code === "ER_DUP_ENTRY" || err?.errno === 1062) return res.status(400).json({ error: "Email already exists" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/staff/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, email, phone, role, isActive } = req.body;
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    if (phone !== undefined) update.phone = phone;
    if (role !== undefined) update.role = role;
    if (isActive !== undefined) update.isActive = isActive;

    await db.update(adminsTable).set(update).where(eq(adminsTable.id, id));
    const [staff] = await db.select().from(adminsTable).where(eq(adminsTable.id, id));
    if (!staff) return res.status(404).json({ error: "Staff member not found" });
    return res.json(formatStaff(staff));
  } catch (err: any) {
    console.error("Update staff error:", err);
    if (err?.code === "ER_DUP_ENTRY" || err?.errno === 1062) return res.status(400).json({ error: "Email already exists" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/staff/:id/reset-password", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await db.update(adminsTable).set({ passwordHash }).where(eq(adminsTable.id, id));
    const [staff] = await db.select().from(adminsTable).where(eq(adminsTable.id, id));
    if (!staff) return res.status(404).json({ error: "Staff member not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/staff/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const session = req.session as any;
    if (session.userId === id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }
    const remaining = await db
      .select()
      .from(adminsTable)
      .where(ne(adminsTable.id, id));
    if (remaining.length === 0) {
      return res.status(400).json({ error: "Cannot delete the only admin account" });
    }
    await db.delete(adminsTable).where(eq(adminsTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete staff error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Company Settings ───────────────────────────────────────────────────────────

async function ensureSettings() {
  const rows = await db.select().from(companySettingsTable).limit(1);
  if (rows.length === 0) {
    const [{ id }] = await db.insert(companySettingsTable).values({}).returning();
    const [row] = await db.select().from(companySettingsTable).where(eq(companySettingsTable.id, id));
    if (!row) throw new Error("Failed to create company settings");
    return row;
  }
  return rows[0];
}

router.get("/company-settings", async (_req, res) => {
  try {
    const settings = await ensureSettings();
    return res.json(settings);
  } catch (err) {
    console.error("Get company settings error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/company-settings", async (req, res) => {
  try {
    const settings = await ensureSettings();
    const {
      companyName, email, phone, unitStreetNumber, buildingComplex, streetName, address, address2,
      city, province, postalCode, country, vatNumber, website, logoUrl, primaryColor,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure,
      notificationEmails,
      bankName, bankAccountHolder, bankAccountNumber, bankAccountType,
      bankBranchCode, bankSwiftCode, bankReference,
      didResellerPriceExclVat, didResellerPriceInclVat,
    } = req.body;

    const update: any = { updatedAt: new Date() };
    if (companyName !== undefined) update.companyName = companyName;
    if (email !== undefined) update.email = email;
    if (phone !== undefined) update.phone = phone;
    if (unitStreetNumber !== undefined) update.unitStreetNumber = unitStreetNumber;
    if (buildingComplex !== undefined) update.buildingComplex = buildingComplex;
    if (streetName !== undefined) update.streetName = streetName;
    if (address !== undefined) update.address = address;
    if (address2 !== undefined) update.address2 = address2;
    if (city !== undefined) update.city = city;
    if (province !== undefined) update.province = province;
    if (postalCode !== undefined) update.postalCode = postalCode;
    if (country !== undefined) update.country = country;
    if (vatNumber !== undefined) update.vatNumber = vatNumber;
    if (website !== undefined) update.website = website;
    if (logoUrl !== undefined) update.logoUrl = logoUrl;
    if (primaryColor !== undefined) update.primaryColor = primaryColor;
    if (smtpHost !== undefined) update.smtpHost = smtpHost || null;
    if (smtpPort !== undefined) update.smtpPort = smtpPort || "587";
    if (smtpUser !== undefined) update.smtpUser = smtpUser || null;
    if (smtpPass !== undefined) update.smtpPass = smtpPass || null;
    if (smtpFrom !== undefined) update.smtpFrom = smtpFrom || null;
    if (smtpSecure !== undefined) update.smtpSecure = Boolean(smtpSecure);
    if (notificationEmails !== undefined) update.notificationEmails = notificationEmails || null;
    if (bankName !== undefined) update.bankName = bankName || null;
    if (bankAccountHolder !== undefined) update.bankAccountHolder = bankAccountHolder || null;
    if (bankAccountNumber !== undefined) update.bankAccountNumber = bankAccountNumber || null;
    if (bankAccountType !== undefined) update.bankAccountType = bankAccountType || null;
    if (bankBranchCode !== undefined) update.bankBranchCode = bankBranchCode || null;
    if (bankSwiftCode !== undefined) update.bankSwiftCode = bankSwiftCode || null;
    if (bankReference !== undefined) update.bankReference = bankReference || null;
    if (didResellerPriceExclVat !== undefined) update.didResellerPriceExclVat = didResellerPriceExclVat != null && didResellerPriceExclVat !== "" ? String(didResellerPriceExclVat) : null;
    if (didResellerPriceInclVat !== undefined) update.didResellerPriceInclVat = didResellerPriceInclVat != null && didResellerPriceInclVat !== "" ? String(didResellerPriceInclVat) : null;

    await db.update(companySettingsTable).set(update).where(eq(companySettingsTable.id, settings.id));
    const [updated] = await db.select().from(companySettingsTable).where(eq(companySettingsTable.id, settings.id));
    return res.json(updated ?? settings);
  } catch (err) {
    console.error("Update company settings error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Test SMTP ────────────────────────────────────────────────────────────────

router.post("/company-settings/test-smtp", async (req, res) => {
  try {
    const settings = await ensureSettings();

    const host = settings.smtpHost || process.env.SMTP_HOST;
    const port = parseInt(settings.smtpPort || process.env.SMTP_PORT || "587");
    const user = settings.smtpUser || process.env.SMTP_USER;
    const pass = settings.smtpPass || process.env.SMTP_PASS;
    const from = settings.smtpFrom || settings.smtpUser || process.env.SMTP_FROM || process.env.SMTP_USER;
    const secure = settings.smtpSecure ?? process.env.SMTP_SECURE === "true";

    if (!host || !user || !pass) {
      return res.status(400).json({ error: "SMTP is not fully configured. Please fill in Host, Username and Password." });
    }

    const toEmail = req.body.toEmail || settings.email || user;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.verify();
    await transporter.sendMail({
      from: `"Black Tie VoIP" <${from}>`,
      to: toEmail,
      subject: "✅ SMTP Test — Black Tie VoIP Portal",
      html: `
        <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <div style="background:#4BA3E3;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">Black Tie VoIP</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Reseller Portal</p>
          </div>
          <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 12px;">SMTP Test Successful ✅</h2>
          <p style="color:#555;font-size:14px;margin:0 0 16px;">Your SMTP settings are working correctly. Order notification emails will be delivered to resellers and staff.</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #eee;border-radius:8px;overflow:hidden;">
            <tr style="background:#f7f9fc;"><td style="padding:8px 12px;color:#888;font-weight:600;">Host</td><td style="padding:8px 12px;color:#333;">${host}</td></tr>
            <tr><td style="padding:8px 12px;color:#888;font-weight:600;">Port</td><td style="padding:8px 12px;color:#333;">${port}</td></tr>
            <tr style="background:#f7f9fc;"><td style="padding:8px 12px;color:#888;font-weight:600;">From</td><td style="padding:8px 12px;color:#333;">${from}</td></tr>
            <tr><td style="padding:8px 12px;color:#888;font-weight:600;">Secure (TLS)</td><td style="padding:8px 12px;color:#333;">${secure ? "Yes" : "No"}</td></tr>
          </table>
          <p style="color:#aaa;font-size:11px;margin:24px 0 0;text-align:center;">© ${new Date().getFullYear()} Black Tie VoIP. This is an automated test email.</p>
        </div>
      `,
    });

    return res.json({ success: true, message: `Test email sent to ${toEmail}` });
  } catch (err: any) {
    console.error("SMTP test error:", err);
    return res.status(400).json({ error: err.message ?? "SMTP test failed" });
  }
});

// ── Change Password ──────────────────────────────────────────────────────────

router.post("/change-password", async (req: Request, res: Response) => {
  try {
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

    const adminId = (req.session as any).userId;
    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, adminId));
    if (!admin) return res.status(401).json({ error: "Admin not found" });

    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) return res.status(403).json({ error: "Current password is incorrect" });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(adminsTable).set({ passwordHash }).where(eq(adminsTable.id, adminId));

    return res.json({ success: true });
  } catch (err) {
    console.error("Admin change password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Email Templates ──────────────────────────────────────────────────────────

// ── API Keys (password-protected) ────────────────────────────────────────────

router.post("/api-keys/reveal", async (req: Request, res: Response) => {
  try {
    const { password } = req.body ?? {};
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Password is required to reveal API keys" });
    }
    const adminId = (req.session as any).userId;
    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, adminId));
    if (!admin) return res.status(401).json({ error: "Admin not found" });

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return res.status(403).json({ error: "Incorrect password" });

    const settings = await ensureSettings();
    let keys: Record<string, string> = {};
    try { keys = settings.apiSecrets ? JSON.parse(settings.apiSecrets) : {}; } catch { keys = {}; }
    return res.json({ keys });
  } catch (err) {
    console.error("Reveal API keys error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api-keys", async (_req: Request, res: Response) => {
  try {
    const settings = await ensureSettings();
    let keys: Record<string, string> = {};
    try { keys = settings.apiSecrets ? JSON.parse(settings.apiSecrets) : {}; } catch { keys = {}; }
    const masked: Record<string, string> = {};
    for (const [k, v] of Object.entries(keys)) masked[k] = v ? "••••••••" + v.slice(-4) : "";
    return res.json({ keys: masked });
  } catch (err) {
    console.error("Get API keys error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/api-keys", async (req: Request, res: Response) => {
  try {
    const { password, keys } = req.body ?? {};
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Password is required to update API keys" });
    }
    if (!keys || typeof keys !== "object") {
      return res.status(400).json({ error: "Keys object is required" });
    }

    const adminId = (req.session as any).userId;
    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, adminId));
    if (!admin) return res.status(401).json({ error: "Admin not found" });

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return res.status(403).json({ error: "Incorrect password" });

    const settings = await ensureSettings();
    let existing: Record<string, string> = {};
    try { existing = settings.apiSecrets ? JSON.parse(settings.apiSecrets) : {}; } catch { existing = {}; }
    const merged = { ...existing };
    for (const [k, v] of Object.entries(keys)) { if (typeof v === "string") merged[k] = v; }
    await db.update(companySettingsTable).set({ apiSecrets: JSON.stringify(merged), updatedAt: new Date() }).where(eq(companySettingsTable.id, settings.id));
    const masked: Record<string, string> = {};
    for (const [k, v] of Object.entries(merged)) masked[k] = v ? "••••••••" + v.slice(-4) : "";
    return res.json({ success: true, keys: masked });
  } catch (err) {
    console.error("Update API keys error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Email Templates ──────────────────────────────────────────────────────────

router.get("/email-templates", async (_req, res) => {
  try {
    const templates = await db.select().from(emailTemplatesTable).orderBy(emailTemplatesTable.name);
    return res.json(templates);
  } catch (err) {
    console.error("Get email templates error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/email-templates/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [template] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.id, id));
    if (!template) return res.status(404).json({ error: "Template not found" });
    return res.json(template);
  } catch (err) {
    console.error("Get email template error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/email-templates", async (req, res) => {
  try {
    const { name, slug, subject, body, description, isActive, notificationRecipients } = req.body;
    if (!name || !slug || !subject || !body) {
      return res.status(400).json({ error: "Name, slug, subject and body are required" });
    }
    const safeSlug = String(slug).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const [{ id }] = await db.insert(emailTemplatesTable).values({
      name,
      slug: safeSlug,
      subject,
      body,
      description: description || null,
      isActive: isActive !== false,
      notificationRecipients: notificationRecipients || null,
    }).returning();
    const [template] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.id, id));
    return res.status(201).json(template);
  } catch (err: any) {
    console.error("Create email template error:", err);
    if (err?.code === "ER_DUP_ENTRY" || err?.errno === 1062) {
      return res.status(400).json({ error: "A template with this slug already exists" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/email-templates/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, slug, subject, body, description, isActive, notificationRecipients } = req.body;
    const update: any = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (slug !== undefined) update.slug = String(slug).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (subject !== undefined) update.subject = subject;
    if (body !== undefined) update.body = body;
    if (description !== undefined) update.description = description || null;
    if (isActive !== undefined) update.isActive = Boolean(isActive);
    if (notificationRecipients !== undefined) update.notificationRecipients = notificationRecipients || null;

    await db.update(emailTemplatesTable).set(update).where(eq(emailTemplatesTable.id, id));
    const [template] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.id, id));
    if (!template) return res.status(404).json({ error: "Template not found" });
    return res.json(template);
  } catch (err: any) {
    console.error("Update email template error:", err);
    if (err?.code === "ER_DUP_ENTRY" || err?.errno === 1062) {
      return res.status(400).json({ error: "A template with this slug already exists" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/email-templates/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(emailTemplatesTable).where(eq(emailTemplatesTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete email template error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Database Backup ──────────────────────────────────────────────────────────

const BACKUP_TABLES: { name: string; table: any }[] = [
  { name: "admins", table: adminsTable },
  { name: "company_settings", table: companySettingsTable },
  { name: "resellers", table: resellersTable },
  { name: "clients", table: clientsTable },
  { name: "area_codes", table: areaCodesTable },
  { name: "dids", table: didsTable },
  { name: "orders", table: ordersTable },
  { name: "order_items", table: orderItemsTable },
  { name: "order_comments", table: orderCommentsTable },
  { name: "service_categories", table: serviceCategoriesTable },
  { name: "services", table: servicesTable },
  { name: "product_categories", table: productCategoriesTable },
  { name: "products", table: productsTable },
  { name: "web_hosting_packages", table: webHostingPackagesTable },
  { name: "domain_tlds", table: domainTldsTable },
  { name: "notices", table: noticesTable },
  { name: "documents", table: documentsTable },
  { name: "chat_threads", table: chatThreadsTable },
  { name: "chat_messages", table: chatMessagesTable },
  { name: "coverage_check_requests", table: coverageCheckRequestsTable },
  { name: "coverage_check_comments", table: coverageCheckCommentsTable },
  { name: "number_porting_requests", table: numberPortingRequestsTable },
  { name: "did_requests", table: didRequestsTable },
  { name: "minute_bundles", table: minuteBundlesTable },
  { name: "email_templates", table: emailTemplatesTable },
  { name: "connectivity_categories", table: connectivityCategoriesTable },
  { name: "connectivity_items", table: connectivityItemsTable },
  { name: "cybersecurity_categories", table: cybersecurityCategoriesTable },
  { name: "cybersecurity_items", table: cybersecurityItemsTable },
  { name: "data_security_categories", table: dataSecurityCategoriesTable },
  { name: "data_security_items", table: dataSecurityItemsTable },
  { name: "web_dev_categories", table: webDevCategoriesTable },
  { name: "web_dev_items", table: webDevItemsTable },
  { name: "voip_categories", table: voipCategoriesTable },
  { name: "voip_items", table: voipItemsTable },
];

router.get("/database/backup", async (_req: Request, res: Response) => {
  try {
    const backup: Record<string, unknown[]> = {};
    const meta: Record<string, number> = {};

    for (const { name, table } of BACKUP_TABLES) {
      try {
        const rows = await db.select().from(table);
        backup[name] = rows;
        meta[name] = rows.length;
      } catch (tableErr) {
        console.error(`Backup: failed to export table "${name}":`, tableErr);
        backup[name] = [];
        meta[name] = 0;
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const payload = {
      _meta: {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        tables: meta,
        totalTables: BACKUP_TABLES.length,
        totalRows: Object.values(meta).reduce((a, b) => a + b, 0),
      },
      data: backup,
    };

    const filename = `blacktievoip-backup-${timestamp}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.json(payload);
  } catch (err) {
    console.error("Database backup error:", err);
    return res.status(500).json({ error: "Failed to generate database backup" });
  }
});

router.get("/database/stats", async (_req: Request, res: Response) => {
  try {
    const stats: Record<string, number> = {};
    for (const { name, table } of BACKUP_TABLES) {
      try {
        const rows = await db.select().from(table);
        stats[name] = rows.length;
      } catch {
        stats[name] = 0;
      }
    }
    return res.json({ tables: stats, totalTables: BACKUP_TABLES.length });
  } catch (err) {
    console.error("Database stats error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
