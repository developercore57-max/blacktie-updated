import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { promises as dnsPromises } from "dns";
import { db } from "@workspace/db";
import { downloadBuffer } from "../lib/gcsStorage";
import { adminsTable, resellersTable, clientsTable, companySettingsTable, documentsTable, ordersTable, orderItemsTable } from "@workspace/db";
import { eq, sql, ne, inArray, and } from "@workspace/db";
import { sendTemplateEmail } from "../lib/email";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session.userId || session.userRole !== "admin") {
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
}

router.use(requireAdmin);

router.get("/stats", async (_req, res) => {
  try {
    const [resellerCounts] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
      })
      .from(resellersTable);

    const [clientCounts] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
        totalRevenue: sql<string>`coalesce(sum(monthly_fee), 0)`,
      })
      .from(clientsTable);

    const totalRevenue = Number(clientCounts.totalRevenue || 0);

    return res.json({
      totalResellers: Number(resellerCounts.total ?? 0),
      activeResellers: Number(resellerCounts.active ?? 0),
      totalClients: Number(clientCounts.total ?? 0),
      activeClients: Number(clientCounts.active ?? 0),
      totalMonthlyRevenue: totalRevenue,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/resellers", async (_req, res) => {
  try {
    const resellers = await db
      .select()
      .from(resellersTable)
      .where(ne(resellersTable.status, "pending"));

    const result = await Promise.all(
      resellers.map(async (r) => {
        const [counts] = await db
          .select({
            total: sql<number>`count(*)`,
            revenue: sql<string>`coalesce(sum(monthly_fee), 0)`,
          })
          .from(clientsTable)
          .where(eq(clientsTable.resellerId, r.id));

        return {
          id: r.id,
          companyName: r.companyName,
          contactName: r.contactName,
          email: r.email,
          phone: r.phone,
          unitStreetNumber: r.unitStreetNumber,
          buildingComplex: r.buildingComplex,
          streetName: r.streetName,
          address: r.address,
          address2: r.address2,
          city: r.city,
          province: r.province,
          status: r.status,
          totalClients: Number(counts.total ?? 0),
          monthlyRevenue: Number(counts.revenue ?? 0),
          createdAt: r.createdAt.toISOString(),
        };
      })
    );

    return res.json(result);
  } catch (err) {
    console.error("Get resellers error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/resellers", async (req, res) => {
  try {
    const { companyName, contactName, email, password, phone, unitStreetNumber, buildingComplex, streetName, address, address2, city, province } = req.body;
    if (!companyName || !contactName || !email || !password) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [existingEmail] = await db.select({ id: resellersTable.id }).from(resellersTable).where(eq(resellersTable.email, normalizedEmail));
    if (existingEmail) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const trimmedPhone = phone !== undefined ? String(phone).trim() : "";
    const normalizedPhone = trimmedPhone === "" ? null : trimmedPhone;
    if (normalizedPhone) {
      const [existingPhone] = await db.select({ id: resellersTable.id }).from(resellersTable).where(eq(resellersTable.phone, normalizedPhone));
      if (existingPhone) {
        return res.status(409).json({ error: "An account with this phone number already exists" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [{ id }] = await db
      .insert(resellersTable)
      .values({
        companyName,
        contactName,
        email: normalizedEmail,
        passwordHash,
        phone: normalizedPhone,
        unitStreetNumber,
        buildingComplex,
        streetName,
        address,
        address2,
        city,
        province,
        status: "active",
      })
      .returning();

    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, id));
    if (!reseller) return res.status(500).json({ error: "Failed to create reseller" });

    return res.status(201).json({
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
      totalClients: 0,
      monthlyRevenue: 0,
      createdAt: reseller.createdAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      if (err?.constraint?.includes("phone")) {
        return res.status(409).json({ error: "An account with this phone number already exists" });
      }
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    console.error("Create reseller error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/resellers/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, id));
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    const [counts] = await db
      .select({
        total: sql<number>`count(*)`,
        revenue: sql<string>`coalesce(sum(monthly_fee), 0)`,
      })
      .from(clientsTable)
      .where(eq(clientsTable.resellerId, id));

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
    console.error("Get reseller error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/resellers/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { companyName, contactName, email, phone, unitStreetNumber, buildingComplex, streetName, address, address2, city, province, status } = req.body;

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const [clash] = await db
        .select({ id: resellersTable.id })
        .from(resellersTable)
        .where(eq(resellersTable.email, normalizedEmail));
      if (clash && clash.id !== id) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
    }

    const normalizedPhone = phone !== undefined
      ? (String(phone).trim() === "" ? null : String(phone).trim())
      : undefined;
    if (normalizedPhone) {
      const [clash] = await db
        .select({ id: resellersTable.id })
        .from(resellersTable)
        .where(eq(resellersTable.phone, normalizedPhone));
      if (clash && clash.id !== id) {
        return res.status(409).json({ error: "An account with this phone number already exists" });
      }
    }

    const updateData: any = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (email !== undefined) updateData.email = String(email).trim().toLowerCase();
    if (normalizedPhone !== undefined) updateData.phone = normalizedPhone;
    if (unitStreetNumber !== undefined) updateData.unitStreetNumber = unitStreetNumber;
    if (buildingComplex !== undefined) updateData.buildingComplex = buildingComplex;
    if (streetName !== undefined) updateData.streetName = streetName;
    if (address !== undefined) updateData.address = address;
    if (address2 !== undefined) updateData.address2 = address2;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province;
    if (status !== undefined) updateData.status = status;

    await db.update(resellersTable).set(updateData).where(eq(resellersTable.id, id));
    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, id));
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    const [counts] = await db
      .select({
        total: sql<number>`count(*)`,
        revenue: sql<string>`coalesce(sum(monthly_fee), 0)`,
      })
      .from(clientsTable)
      .where(eq(clientsTable.resellerId, id));

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
  } catch (err: any) {
    if (err?.code === "23505") {
      if (err?.constraint?.includes("phone")) {
        return res.status(409).json({ error: "An account with this phone number already exists" });
      }
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    console.error("Update reseller error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/resellers/:id/reset-password", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { password } = req.body ?? {};

    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Password is required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const [existing] = await db.select({ id: resellersTable.id }).from(resellersTable).where(eq(resellersTable.id, id));
    if (!existing) return res.status(404).json({ error: "Reseller not found" });

    const passwordHash = await bcrypt.hash(password, 10);
    await db.update(resellersTable).set({ passwordHash }).where(eq(resellersTable.id, id));

    return res.json({ success: true });
  } catch (err) {
    console.error("Reset reseller password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/resellers/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(clientsTable).where(eq(clientsTable.resellerId, id));
    await db.delete(resellersTable).where(eq(resellersTable.id, id));
    return res.json({ success: true, message: "Reseller deleted" });
  } catch (err) {
    console.error("Delete reseller error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller Applications ──────────────────────────────────────────────────────

router.get("/reseller-applications", async (_req, res) => {
  try {
    const applications = await db
      .select({
        id: resellersTable.id,
        companyName: resellersTable.companyName,
        contactName: resellersTable.contactName,
        email: resellersTable.email,
        phone: resellersTable.phone,
        status: resellersTable.status,
        createdAt: resellersTable.createdAt,
      })
      .from(resellersTable)
      .where(inArray(resellersTable.status, ["pending", "info_requested", "rejected"]));

    return res.json(
      applications.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
    );
  } catch (err) {
    console.error("Get applications error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reseller-applications/count", async (_req, res) => {
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(resellersTable)
      .where(inArray(resellersTable.status, ["pending", "info_requested"]));
    return res.json({ count: Number(row.count ?? 0) });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/resellers/:id/request-info", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    await db.update(resellersTable).set({ status: "info_requested" }).where(eq(resellersTable.id, id));
    const [reloaded] = await db.select().from(resellersTable).where(eq(resellersTable.id, id));
    if (!reloaded) return res.status(404).json({ error: "Reseller not found" });

    // Send email via SMTP if configured
    const [settings] = await db.select().from(companySettingsTable).limit(1);
    if (settings) {
      const host = settings.smtpHost || process.env.SMTP_HOST;
      const port = parseInt(settings.smtpPort || process.env.SMTP_PORT || "587");
      const user = settings.smtpUser || process.env.SMTP_USER;
      const pass = settings.smtpPass || process.env.SMTP_PASS;
      const from = settings.smtpFrom || settings.smtpUser || process.env.SMTP_FROM || process.env.SMTP_USER;
      const secure = settings.smtpSecure ?? process.env.SMTP_SECURE === "true";
      const companyName = settings.companyName || "Black Tie VoIP";

      if (host && user && pass) {
        const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
        await transporter.sendMail({
          from: `"${companyName}" <${from}>`,
          to: reloaded.email,
          subject: `Additional Information Required — ${companyName} Reseller Application`,
          html: `
            <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;">
              <div style="background:#4BA3E3;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
                <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">${companyName}</h1>
                <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Reseller Portal</p>
              </div>
              <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 8px;">Hi ${reloaded.contactName},</h2>
              <p style="color:#555;font-size:14px;margin:0 0 16px;">
                Thank you for your reseller application. We need a little more information before we can proceed with your review.
              </p>
              <div style="background:#f7f9fc;border-left:4px solid #4BA3E3;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
                <p style="color:#333;font-size:14px;margin:0;white-space:pre-line;">${message.trim()}</p>
              </div>
              <p style="color:#555;font-size:14px;margin:0 0 8px;">
                Please reply to this email with the requested information and we will continue with your application.
              </p>
              <p style="color:#aaa;font-size:11px;margin:24px 0 0;text-align:center;">© ${new Date().getFullYear()} ${companyName}. This is an automated notification.</p>
            </div>
          `,
        });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Request info error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Send Documents to Applicant ────────────────────────────────────────────────

router.post("/resellers/:id/send-documents", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { documentIds, message } = req.body ?? {};

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: "At least one document must be selected" });
    }

    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, id));
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    // Fetch selected documents
    const parsedIds = documentIds.map((d: any) => Number(d)).filter((n: number) => Number.isFinite(n) && n > 0);
    if (parsedIds.length === 0) {
      return res.status(400).json({ error: "Invalid document IDs" });
    }

    const documents = await db.select().from(documentsTable).where(inArray(documentsTable.id, parsedIds));
    if (documents.length === 0) {
      return res.status(404).json({ error: "No documents found" });
    }

    // Get SMTP config
    const [settings] = await db.select().from(companySettingsTable).limit(1);
    const host = settings?.smtpHost || process.env.SMTP_HOST;
    const port = parseInt(settings?.smtpPort || process.env.SMTP_PORT || "587");
    const user = settings?.smtpUser || process.env.SMTP_USER;
    const pass = settings?.smtpPass || process.env.SMTP_PASS;
    const from = settings?.smtpFrom || settings?.smtpUser || process.env.SMTP_FROM || process.env.SMTP_USER;
    const secure = settings?.smtpSecure ?? process.env.SMTP_SECURE === "true";
    const companyName = settings?.companyName || "Black Tie VoIP";

    if (!host || !user || !pass) {
      return res.status(400).json({ error: "SMTP is not configured. Please set up SMTP in Company Settings first." });
    }

    // Build attachments by downloading from persistent object storage
    const attachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];
    const missingFiles: string[] = [];

    for (const doc of documents) {
      try {
        const content = await downloadBuffer(doc.storedName);
        attachments.push({
          filename: doc.fileName,
          content,
          contentType: doc.mimeType || undefined,
        });
      } catch {
        missingFiles.push(doc.fileName);
      }
    }

    if (attachments.length === 0) {
      return res.status(400).json({ error: "None of the selected document files could be retrieved from storage" });
    }

    // Build document list HTML
    const docListHtml = documents
      .map((d) => `<li style="margin:4px 0;font-size:14px;color:#333;">${d.fileName}${d.description ? ` — <span style="color:#666;font-size:13px;">${d.description}</span>` : ""}</li>`)
      .join("");

    const customMessage = message?.trim()
      ? `<div style="background:#f7f9fc;border-left:4px solid #4BA3E3;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
          <p style="color:#333;font-size:14px;margin:0;white-space:pre-line;">${message.trim()}</p>
        </div>`
      : "";

    const html = `
      <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;">
        <div style="background:#4BA3E3;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">${companyName}</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Reseller Portal</p>
        </div>
        <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 8px;">Hi ${reseller.contactName},</h2>
        <p style="color:#555;font-size:14px;margin:0 0 16px;">
          As part of your reseller application with ${companyName}, please find the following document(s) attached for your completion and review.
        </p>
        ${customMessage}
        <div style="background:#f7f9fc;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em;">Attached Documents</p>
          <ul style="margin:0;padding:0 0 0 20px;">
            ${docListHtml}
          </ul>
        </div>
        <p style="color:#555;font-size:14px;margin:0 0 8px;">
          Please complete the required documents and return them by replying to this email.
        </p>
        ${missingFiles.length > 0 ? `<p style="color:#ef4444;font-size:12px;margin:8px 0;">Note: ${missingFiles.length} file(s) could not be attached (${missingFiles.join(", ")})</p>` : ""}
        <p style="color:#aaa;font-size:11px;margin:24px 0 0;text-align:center;">© ${new Date().getFullYear()} ${companyName}. This is an automated notification.</p>
      </div>
    `;

    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    await transporter.sendMail({
      from: `"${companyName}" <${from}>`,
      to: reseller.email,
      subject: `Documents for Your Reseller Application — ${companyName}`,
      html,
      attachments,
    });

    return res.json({
      success: true,
      message: `${attachments.length} document(s) sent to ${reseller.email}`,
      sent: attachments.length,
      missing: missingFiles,
    });
  } catch (err) {
    console.error("Send documents error:", err);
    return res.status(500).json({ error: "Failed to send documents. Check SMTP configuration." });
  }
});

router.patch("/resellers/:id/approve", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.update(resellersTable).set({ status: "active" }).where(eq(resellersTable.id, id));
    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, id));
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    // Send welcome email via template
    const [settings] = await db.select().from(companySettingsTable).limit(1);
    const companyName = settings?.companyName || "Black Tie VoIP";
    sendTemplateEmail(reseller.email, "reseller_welcome", {
      companyName,
      contactName: reseller.contactName,
      resellerCompanyName: reseller.companyName,
      resellerEmail: reseller.email,
      year: String(new Date().getFullYear()),
    }).catch(() => {}); // fire-and-forget

    return res.json({ success: true, reseller: { id: reseller.id, status: reseller.status } });
  } catch (err) {
    console.error("Approve reseller error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/resellers/:id/reject", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { reason } = req.body;

    await db.update(resellersTable).set({ status: "rejected" }).where(eq(resellersTable.id, id));
    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, id));
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    // Send rejection email if reason provided and SMTP is configured
    if (reason?.trim()) {
      const [settings] = await db.select().from(companySettingsTable).limit(1);
      if (settings) {
        const host = settings.smtpHost || process.env.SMTP_HOST;
        const port = parseInt(settings.smtpPort || process.env.SMTP_PORT || "587");
        const user = settings.smtpUser || process.env.SMTP_USER;
        const pass = settings.smtpPass || process.env.SMTP_PASS;
        const from = settings.smtpFrom || settings.smtpUser || process.env.SMTP_FROM || process.env.SMTP_USER;
        const secure = settings.smtpSecure ?? process.env.SMTP_SECURE === "true";
        const companyName = settings.companyName || "Black Tie VoIP";

        if (host && user && pass) {
          const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
          await transporter.sendMail({
            from: `"${companyName}" <${from}>`,
            to: reseller.email,
            subject: `Reseller Application Outcome — ${companyName}`,
            html: `
              <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;">
                <div style="background:#4BA3E3;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
                  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">${companyName}</h1>
                  <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Reseller Portal</p>
                </div>
                <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 8px;">Hi ${reseller.contactName},</h2>
                <p style="color:#555;font-size:14px;margin:0 0 16px;">
                  Thank you for your interest in becoming a reseller with ${companyName}.
                  After reviewing your application, we are unfortunately unable to proceed at this time.
                </p>
                <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
                  <p style="color:#7f1d1d;font-size:13px;font-weight:600;margin:0 0 6px;">Reason for Rejection</p>
                  <p style="color:#333;font-size:14px;margin:0;white-space:pre-line;">${reason.trim()}</p>
                </div>
                <p style="color:#555;font-size:14px;margin:0 0 8px;">
                  If you have any questions or believe this decision was made in error, please feel free to contact us by replying to this email.
                </p>
                <p style="color:#aaa;font-size:11px;margin:24px 0 0;text-align:center;">© ${new Date().getFullYear()} ${companyName}. This is an automated notification.</p>
              </div>
            `,
          });
        }
      }
    }

    return res.json({ success: true, reseller: { id: reseller.id, status: reseller.status } });
  } catch (err) {
    console.error("Reject reseller error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/clients", async (_req, res) => {
  try {
    const clients = await db
      .select({
        id: clientsTable.id,
        resellerId: clientsTable.resellerId,
        resellerName: resellersTable.companyName,
        companyName: clientsTable.companyName,
        contactName: clientsTable.contactName,
        email: clientsTable.email,
        phone: clientsTable.phone,
        unitStreetNumber: clientsTable.unitStreetNumber,
        buildingComplex: clientsTable.buildingComplex,
        streetName: clientsTable.streetName,
        address: clientsTable.address,
        address2: clientsTable.address2,
        city: clientsTable.city,
        province: clientsTable.province,
        sipExtensions: clientsTable.sipExtensions,
        monthlyFee: clientsTable.monthlyFee,
        status: clientsTable.status,
        notes: clientsTable.notes,
        createdAt: clientsTable.createdAt,
      })
      .from(clientsTable)
      .leftJoin(resellersTable, eq(clientsTable.resellerId, resellersTable.id));

    return res.json(
      clients.map((c) => ({
        ...c,
        monthlyFee: Number(c.monthlyFee),
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("Admin get clients error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: check domain availability ─────────────────────────────────────────
// Mirrors /api/reseller/check-domain exactly but requires admin session.
router.get("/check-domain", async (req, res) => {
  const domainValue = req.query.domain;
  const domain = (Array.isArray(domainValue) ? domainValue[0] : domainValue ?? "")
    .toString()
    .trim()
    .toLowerCase();
  if (!domain || !/^[a-z0-9][a-z0-9\-.]{1,61}[a-z0-9]\.[a-z]{2,}$/.test(domain)) {
    return res.status(400).json({ error: "Invalid domain name" });
  }
  try {
    const nameservers = await dnsPromises.resolveNs(domain);
    return res.json({
      domain,
      available: false,
      status: "registered",
      nameservers: nameservers.slice(0, 4),
    });
  } catch (err: any) {
    if (err?.code === "ENOTFOUND" || err?.code === "ENODATA" || err?.code === "ESERVFAIL") {
      return res.json({ domain, available: true, status: "available", nameservers: [] });
    }
    console.error("Admin domain check error:", err);
    return res.status(500).json({ error: "Domain check failed" });
  }
});

// ── Admin: clients for a specific reseller (with embedded services) ────────────

router.get("/resellers/:id/clients", async (req, res) => {
  try {
    const resellerId = parseInt(String(req.params.id), 10);
    if (isNaN(resellerId)) return res.status(400).json({ error: "Invalid reseller ID" });

    const clients = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.resellerId, resellerId));

    if (clients.length === 0) return res.json([]);

    // For each client, fetch services from completed orders
    const clientIds = clients.map(c => c.id);

    const completedOrders = await db
      .select({ id: ordersTable.id, clientId: ordersTable.clientId })
      .from(ordersTable)
      .where(
        and(
          inArray(ordersTable.clientId, clientIds),
          eq(ordersTable.status, "completed"),
        )
      );

    const orderIds = completedOrders.map(o => o.id);

    const allItems = orderIds.length > 0
      ? await db
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
          .orderBy(orderItemsTable.itemType, orderItemsTable.name)
      : [];

    // Build a map: clientId -> service items
    const orderClientMap = new Map<number, number>();
    for (const o of completedOrders) {
      if (o.clientId !== null) orderClientMap.set(o.id, o.clientId);
    }

    const clientServicesMap = new Map<number, typeof allItems>();
    for (const item of allItems) {
      const clientId = orderClientMap.get(item.orderId);
      if (clientId === undefined) continue;
      const existing = clientServicesMap.get(clientId) ?? [];
      existing.push(item);
      clientServicesMap.set(clientId, existing);
    }

    return res.json(
      clients.map(c => ({
        id: c.id,
        resellerId: c.resellerId,
        companyName: c.companyName,
        contactName: c.contactName,
        email: c.email,
        phone: c.phone,
        sipExtensions: c.sipExtensions,
        monthlyFee: Number(c.monthlyFee),
        status: c.status,
        notes: c.notes,
        createdAt: c.createdAt.toISOString(),
        services: (clientServicesMap.get(c.id) ?? []).map(item => ({
          id: item.id,
          orderId: item.orderId,
          itemType: item.itemType,
          referenceId: item.referenceId,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPriceExclVat: String(item.unitPriceExclVat),
          unitPriceInclVat: String(item.unitPriceInclVat),
          lineTotal: String(item.lineTotal),
          createdAt: item.createdAt.toISOString(),
        })),
      }))
    );
  } catch (err) {
    console.error("Admin reseller clients error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: single client detail ──────────────────────────────────────────────

router.get("/clients/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid client ID" });

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, id));

    if (!client) return res.status(404).json({ error: "Client not found" });

    const [reseller] = await db
      .select({ companyName: resellersTable.companyName })
      .from(resellersTable)
      .where(eq(resellersTable.id, client.resellerId));

    return res.json({
      id: client.id,
      resellerId: client.resellerId,
      resellerName: reseller?.companyName ?? null,
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
    console.error("Admin get client error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: services for a specific client ────────────────────────────────────

router.get("/clients/:id/services", async (req, res) => {
  try {
    const clientId = parseInt(String(req.params.id), 10);
    if (isNaN(clientId)) return res.status(400).json({ error: "Invalid client ID" });

    const [client] = await db
      .select({ id: clientsTable.id })
      .from(clientsTable)
      .where(eq(clientsTable.id, clientId));
    if (!client) return res.status(404).json({ error: "Client not found" });

    const completedOrders = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.clientId, clientId),
          eq(ordersTable.status, "completed"),
        )
      );

    if (completedOrders.length === 0) return res.json([]);

    const orderIds = completedOrders.map(o => o.id);
    const rows = await db.execute(sql`
      SELECT
        oi.id, oi.order_id, oi.item_type, oi.reference_id, oi.name, oi.sku,
        oi.quantity, oi.unit_price_excl_vat, oi.unit_price_incl_vat, oi.line_total, oi.created_at,
        CASE WHEN sc.id IS NOT NULL THEN true ELSE false END AS has_credentials
      FROM order_items oi
      LEFT JOIN service_credentials sc ON sc.order_item_id = oi.id
      WHERE oi.order_id = ANY(ARRAY[${sql.raw(orderIds.join(","))}]::int[])
      ORDER BY oi.item_type, oi.name
    `);

    return res.json(
      rows.rows.map((item: any) => ({
        id: Number(item.id),
        orderId: Number(item.order_id),
        itemType: item.item_type,
        referenceId: item.reference_id ? Number(item.reference_id) : null,
        name: item.name,
        sku: item.sku ?? null,
        quantity: Number(item.quantity),
        unitPriceExclVat: String(item.unit_price_excl_vat),
        unitPriceInclVat: String(item.unit_price_incl_vat),
        lineTotal: String(item.line_total),
        createdAt: item.created_at instanceof Date ? item.created_at.toISOString() : item.created_at,
        hasCredentials: Boolean(item.has_credentials),
      }))
    );
  } catch (err) {
    console.error("Admin get client services error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
