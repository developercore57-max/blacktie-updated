import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminsTable, resellersTable, companySettingsTable } from "@workspace/db";
import { eq } from "@workspace/db";
import { sendTemplateEmail, getNotificationEmails } from "../lib/email";

const router: IRouter = Router();
const sessionCookieName = process.env.SESSION_COOKIE_NAME || "connect.sid";
const isProduction = process.env.NODE_ENV === "production";

// Prevent caching of all auth responses (LiteSpeed/browser can cache GET /me)
router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Email, password and role are required" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    if (role === "admin") {
      const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, normalizedEmail));
      if (!admin) return res.status(401).json({ error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      await new Promise<void>((resolve, reject) =>
        req.session.regenerate((err) => {
          if (err) return reject(err);
          (req.session as any).userId = admin.id;
          (req.session as any).userRole = "admin";
          req.session.save((err2) => (err2 ? reject(err2) : resolve()));
        })
      );

      return res.json({
        success: true,
        role: "admin",
        user: { id: admin.id, email: admin.email, name: admin.name, role: "admin" },
      });
    } else if (role === "reseller") {
      const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.email, normalizedEmail));
      if (!reseller) return res.status(401).json({ error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, reseller.passwordHash);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      if (reseller.status === "pending") {
        return res.status(403).json({ error: "Your application is pending admin approval. You will be notified once approved." });
      }
      if (reseller.status === "info_requested") {
        return res.status(403).json({ error: "Additional information has been requested for your application. Please check your email and reply with the requested details." });
      }
      if (reseller.status === "rejected") {
        return res.status(403).json({ error: "Your application was not approved. Please contact us for more information." });
      }
      if (reseller.status === "suspended") {
        return res.status(403).json({ error: "Account suspended. Contact admin." });
      }

      await new Promise<void>((resolve, reject) =>
        req.session.regenerate((err) => {
          if (err) return reject(err);
          (req.session as any).userId = reseller.id;
          (req.session as any).userRole = "reseller";
          req.session.save((err2) => (err2 ? reject(err2) : resolve()));
        })
      );

      return res.json({
        success: true,
        role: "reseller",
        user: { id: reseller.id, email: reseller.email, name: reseller.contactName, role: "reseller" },
      });
    } else {
      return res.status(400).json({ error: "Invalid role" });
    }
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { companyName, contactName, email, password, phone } = req.body;
    if (!companyName || !contactName || !email || !password) {
      return res.status(400).json({ error: "Company name, contact name, email and password are required" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const [existing] = await db.select({ id: resellersTable.id }).from(resellersTable).where(eq(resellersTable.email, normalizedEmail));
    if (existing) {
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
    await db.insert(resellersTable).values({
      companyName,
      contactName,
      email: normalizedEmail,
      passwordHash,
      phone: normalizedPhone,
      status: "pending",
    });

    // Send template emails (fire-and-forget)
    const [settings] = await db.select().from(companySettingsTable).limit(1);
    const compName = settings?.companyName || "Black Tie VoIP";
    const tplVars = {
      companyName: compName,
      contactName,
      resellerCompanyName: companyName,
      resellerEmail: normalizedEmail,
      year: String(new Date().getFullYear()),
    };

    // Confirmation to reseller
    sendTemplateEmail(normalizedEmail, "reseller_signup_confirmation", tplVars).catch(() => {});

    // Notification to admins + notification email list
    const adminRows = await db.select({ email: adminsTable.email }).from(adminsTable);
    const notifEmails = await getNotificationEmails();
    const allNotifRecipients = [...new Set([...adminRows.map(a => a.email), ...notifEmails])];
    for (const email of allNotifRecipients) {
      sendTemplateEmail(email, "reseller_signup_notification", tplVars).catch(() => {});
    }

    return res.json({ success: true, message: "Registration submitted. Your account is pending admin approval." });
  } catch (err: any) {
    if (err?.code === "23505") {
      if (err?.constraint?.includes("phone")) {
        return res.status(409).json({ error: "An account with this phone number already exists" });
      }
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    console.error("Register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie(sessionCookieName, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
  });

  if (!req.session) {
    return res.json({ success: true, message: "Logged out" });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout session destroy error:", err);
    }
    return res.json({ success: true, message: "Logged out" });
  });
});

router.get("/me", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session.userId || !session.userRole) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (session.userRole === "admin") {
      const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, session.userId));
      if (!admin) return res.status(401).json({ error: "Not authenticated" });
      return res.json({ id: admin.id, email: admin.email, name: admin.name, role: "admin" });
    } else {
      const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, session.userId));
      if (!reseller) return res.status(401).json({ error: "Not authenticated" });
      return res.json({ id: reseller.id, email: reseller.email, name: reseller.contactName, role: "reseller" });
    }
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
