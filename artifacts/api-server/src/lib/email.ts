import nodemailer from "nodemailer";
import { db } from "@workspace/db";
import { companySettingsTable, emailTemplatesTable } from "@workspace/db";
import { eq } from "@workspace/db";

function formatZar(amount: number): string {
  return `R ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

async function getTransporter() {
  // First try DB settings, fall back to environment variables
  let host: string | null | undefined;
  let port: number;
  let user: string | null | undefined;
  let pass: string | null | undefined;
  let from: string | null | undefined;
  let secure: boolean;

  try {
    const rows = await db.select().from(companySettingsTable).limit(1);
    const cfg = rows[0];
    host = cfg?.smtpHost || process.env.SMTP_HOST;
    port = parseInt(cfg?.smtpPort || process.env.SMTP_PORT || "587");
    user = cfg?.smtpUser || process.env.SMTP_USER;
    pass = cfg?.smtpPass || process.env.SMTP_PASS;
    from = cfg?.smtpFrom || cfg?.smtpUser || process.env.SMTP_FROM || process.env.SMTP_USER;
    secure = cfg?.smtpSecure ?? process.env.SMTP_SECURE === "true";
  } catch {
    host = process.env.SMTP_HOST;
    port = parseInt(process.env.SMTP_PORT || "587");
    user = process.env.SMTP_USER;
    pass = process.env.SMTP_PASS;
    from = process.env.SMTP_FROM || process.env.SMTP_USER;
    secure = process.env.SMTP_SECURE === "true";
  }

  if (!host || !user || !pass) return null;
  return {
    from: from ?? user,
    transporter: nodemailer.createTransport({ host, port, secure, auth: { user, pass } }),
  };
}

export interface OrderEmailData {
  orderId: number;
  resellerName: string;
  resellerEmail: string;
  notes?: string | null;
  items: Array<{
    name: string;
    itemType: string;
    quantity: number;
    unitPriceExclVat: number;
    unitPriceInclVat: number;
    lineTotal: number;
  }>;
  totalExclVat: number;
  totalInclVat: number;
}

function buildOrderEmailHtml(data: OrderEmailData, recipientType: "reseller" | "admin"): string {
  const recurringItems = data.items.filter(i => i.itemType === "service" || i.itemType === "hosting");
  const onceOffItems = data.items.filter(i => i.itemType !== "service" && i.itemType !== "hosting");

  const recurringExcl = recurringItems.reduce((s, i) => s + i.unitPriceExclVat * i.quantity, 0);
  const recurringIncl = recurringItems.reduce((s, i) => s + i.unitPriceInclVat * i.quantity, 0);
  const onceOffExcl = onceOffItems.reduce((s, i) => s + i.unitPriceExclVat * i.quantity, 0);
  const onceOffIncl = onceOffItems.reduce((s, i) => s + i.unitPriceInclVat * i.quantity, 0);

  const itemTypeLabel: Record<string, string> = {
    service: "Service",
    product: "Product",
    did: "DID Number",
    hosting: "Web Hosting",
    domain: "Domain",
  };

  const renderItems = (items: typeof data.items) =>
    items.map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#333;">${item.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;color:#666;text-align:center;">${itemTypeLabel[item.itemType] ?? item.itemType}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right;">${formatZar(item.unitPriceInclVat)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;font-weight:600;text-align:right;">${formatZar(item.lineTotal)}</td>
      </tr>`
    ).join("");

  const tableHeader = `
    <tr style="background:#f7f9fc;">
      <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;font-weight:600;text-transform:uppercase;">Item</th>
      <th style="padding:10px 12px;text-align:center;font-size:12px;color:#666;font-weight:600;text-transform:uppercase;">Type</th>
      <th style="padding:10px 12px;text-align:center;font-size:12px;color:#666;font-weight:600;text-transform:uppercase;">Qty</th>
      <th style="padding:10px 12px;text-align:right;font-size:12px;color:#666;font-weight:600;text-transform:uppercase;">Unit (incl VAT)</th>
      <th style="padding:10px 12px;text-align:right;font-size:12px;color:#666;font-weight:600;text-transform:uppercase;">Total</th>
    </tr>`;

  const recurringSection = recurringItems.length > 0 ? `
    <h3 style="margin:24px 0 8px;font-size:14px;color:#4BA3E3;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">
      Monthly Recurring
    </h3>
    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden;">
      ${tableHeader}
      ${renderItems(recurringItems)}
      <tr style="background:#EBF5FD;">
        <td colspan="4" style="padding:10px 12px;font-weight:700;font-size:13px;color:#4BA3E3;">Monthly Total (incl VAT)</td>
        <td style="padding:10px 12px;font-weight:700;font-size:14px;color:#4BA3E3;text-align:right;">${formatZar(recurringIncl)}</td>
      </tr>
      <tr style="background:#f7f9fc;">
        <td colspan="4" style="padding:6px 12px;font-size:12px;color:#999;">Excl VAT</td>
        <td style="padding:6px 12px;font-size:12px;color:#999;text-align:right;">${formatZar(recurringExcl)}</td>
      </tr>
    </table>` : "";

  const onceOffSection = onceOffItems.length > 0 ? `
    <h3 style="margin:24px 0 8px;font-size:14px;color:#374151;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">
      Once-Off / Due Now
    </h3>
    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden;">
      ${tableHeader}
      ${renderItems(onceOffItems)}
      <tr style="background:#f7f9fc;">
        <td colspan="4" style="padding:10px 12px;font-weight:700;font-size:13px;color:#374151;">Total Due Now (incl VAT)</td>
        <td style="padding:10px 12px;font-weight:700;font-size:14px;color:#374151;text-align:right;">${formatZar(onceOffIncl)}</td>
      </tr>
      <tr style="background:#f7f9fc;">
        <td colspan="4" style="padding:6px 12px;font-size:12px;color:#999;">Excl VAT</td>
        <td style="padding:6px 12px;font-size:12px;color:#999;text-align:right;">${formatZar(onceOffExcl)}</td>
      </tr>
    </table>` : "";

  const grandTotal = recurringItems.length > 0 && onceOffItems.length > 0 ? `
    <div style="margin-top:16px;padding:12px 16px;background:#f0f7ff;border:1px solid #4BA3E3;border-radius:8px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="font-size:14px;font-weight:700;color:#1e3a5f;">Grand Total (first month)</td>
          <td style="text-align:right;font-size:16px;font-weight:800;color:#4BA3E3;">${formatZar(recurringIncl + onceOffIncl)}</td>
        </tr>
      </table>
    </div>` : "";

  const intro = recipientType === "reseller"
    ? `<p style="color:#555;font-size:14px;margin:0 0 8px;">Thank you for your order. Your request has been received and is <strong>pending review</strong> by Black Tie VoIP. You will be notified once it has been processed.</p>`
    : `<p style="color:#555;font-size:14px;margin:0 0 8px;">A new order has been submitted by <strong>${data.resellerName}</strong> (${data.resellerEmail}) and is <strong>pending your review</strong>.</p>`;

  const notesBlock = data.notes ? `
    <div style="margin-top:20px;padding:12px 16px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px;">
      <p style="margin:0;font-size:13px;font-weight:600;color:#92400e;">Order Notes:</p>
      <p style="margin:4px 0 0;font-size:13px;color:#78350f;">${data.notes}</p>
    </div>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:640px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:#4BA3E3;padding:24px 32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Black Tie VoIP</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Reseller Management Portal</p>
    </div>

    <div style="padding:28px 32px;">
      <div style="margin-bottom:20px;">
        <h2 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#1e3a5f;">
          ${recipientType === "admin" ? "New Order Received" : "Order Confirmed"}
        </h2>
        <p style="margin:0 0 12px;font-size:13px;color:#4BA3E3;font-weight:600;">Order #${data.orderId}</p>
        ${intro}
      </div>

      ${recipientType === "admin" ? `
      <div style="margin-bottom:20px;padding:12px 16px;background:#f7f9fc;border-radius:8px;border:1px solid #eee;">
        <p style="margin:0;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;">Reseller</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#333;">${data.resellerName}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#666;">${data.resellerEmail}</p>
      </div>` : ""}

      ${recurringSection}
      ${onceOffSection}
      ${grandTotal}
      ${notesBlock}

      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #eee;text-align:center;">
        <p style="margin:0;font-size:12px;color:#aaa;">This is an automated message from the Black Tie VoIP Reseller Portal.</p>
        <p style="margin:4px 0 0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} Black Tie VoIP. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function getNotificationEmails(): Promise<string[]> {
  try {
    const [cfg] = await db.select({ notificationEmails: companySettingsTable.notificationEmails }).from(companySettingsTable).limit(1);
    if (!cfg?.notificationEmails) return [];
    return cfg.notificationEmails.split(",").map(e => e.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function sendOrderEmails(data: OrderEmailData, adminEmails: string[]): Promise<void> {
  const cfg = await getTransporter();
  if (!cfg) {
    console.log("[email] SMTP not configured — skipping order notification emails. Set SMTP credentials in Company Settings or environment variables.");
    return;
  }

  const { transporter, from } = cfg;
  const subject = `Order #${data.orderId} — Black Tie VoIP`;

  const notifEmails = await getNotificationEmails();
  const allAdminEmails = [...new Set([...adminEmails, ...notifEmails])];

  const sends: Promise<void>[] = [];

  if (data.resellerEmail) {
    sends.push(
      transporter.sendMail({
        from: `"Black Tie VoIP" <${from}>`,
        to: data.resellerEmail,
        subject,
        html: buildOrderEmailHtml(data, "reseller"),
      }).then(() => {
        console.log(`[email] Order confirmation sent to reseller: ${data.resellerEmail}`);
      }).catch((err: Error) => {
        console.error(`[email] Failed to send to reseller ${data.resellerEmail}:`, err.message);
      })
    );
  }

  for (const adminEmail of allAdminEmails) {
    sends.push(
      transporter.sendMail({
        from: `"Black Tie VoIP Portal" <${from}>`,
        to: adminEmail,
        subject: `[NEW ORDER #${data.orderId}] ${data.resellerName} — Black Tie VoIP`,
        html: buildOrderEmailHtml(data, "admin"),
      }).then(() => {
        console.log(`[email] Order notification sent to: ${adminEmail}`);
      }).catch((err: Error) => {
        console.error(`[email] Failed to send to ${adminEmail}:`, err.message);
      })
    );
  }

  await Promise.all(sends);
}

// ── Template helpers ─────────────────────────────────────────────────────────

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function getTemplateBySlug(slug: string) {
  const [tpl] = await db
    .select()
    .from(emailTemplatesTable)
    .where(eq(emailTemplatesTable.slug, slug));
  return tpl && tpl.isActive ? tpl : null;
}

export async function sendTemplateEmail(
  to: string,
  slug: string,
  vars: Record<string, string>,
): Promise<boolean> {
  const cfg = await getTransporter();
  if (!cfg) {
    console.log(`[email] SMTP not configured — skipping template email (${slug}).`);
    return false;
  }

  const tpl = await getTemplateBySlug(slug);
  if (!tpl) {
    console.log(`[email] Template "${slug}" not found or inactive — skipping.`);
    return false;
  }

  const subject = renderTemplate(tpl.subject, vars);
  const html = renderTemplate(tpl.body, vars);
  const fromName = vars.companyName || "Black Tie VoIP";

  // Send to the primary recipient
  let success = false;
  try {
    await cfg.transporter.sendMail({
      from: `"${fromName}" <${cfg.from}>`,
      to,
      subject,
      html,
    });
    console.log(`[email] Template "${slug}" sent to ${to}`);
    success = true;
  } catch (err: any) {
    console.error(`[email] Failed to send template "${slug}" to ${to}:`, err.message);
  }

  // Send CC copies to notification recipients configured on this template
  if (tpl.notificationRecipients) {
    const extras = tpl.notificationRecipients.split(",").map(e => e.trim()).filter(Boolean);
    const unique = extras.filter(e => e.toLowerCase() !== to.toLowerCase());
    for (const extra of unique) {
      cfg.transporter.sendMail({
        from: `"${fromName}" <${cfg.from}>`,
        to: extra,
        subject: `[COPY] ${subject}`,
        html,
      }).then(() => {
        console.log(`[email] Template "${slug}" notification copy sent to ${extra}`);
      }).catch((err: any) => {
        console.error(`[email] Failed to send template "${slug}" notification copy to ${extra}:`, err.message);
      });
    }
  }

  return success;
}
