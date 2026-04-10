import { pgTable, text, integer, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adminsTable = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("staff"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminSchema = createInsertSchema(adminsTable).omit({ id: true, createdAt: true });
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof adminsTable.$inferSelect;

export const companySettingsTable = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("Black Tie VoIP"),
  email: text("email"),
  phone: text("phone"),
  unitStreetNumber: text("unit_street_number"),
  buildingComplex: text("building_complex"),
  streetName: text("street_name"),
  address: text("address"),
  address2: text("address2"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  country: text("country").notNull().default("South Africa"),
  vatNumber: text("vat_number"),
  website: text("website"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#4BA3E3"),
  smtpHost: text("smtp_host"),
  smtpPort: text("smtp_port").default("587"),
  smtpUser: text("smtp_user"),
  smtpPass: text("smtp_pass"),
  smtpFrom: text("smtp_from"),
  smtpSecure: boolean("smtp_secure").default(false),
  bankName: text("bank_name"),
  bankAccountHolder: text("bank_account_holder"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountType: text("bank_account_type"),
  bankBranchCode: text("bank_branch_code"),
  bankSwiftCode: text("bank_swift_code"),
  bankReference: text("bank_reference"),
  didResellerPriceExclVat: text("did_reseller_price_excl_vat"),
  didResellerPriceInclVat: text("did_reseller_price_incl_vat"),
  didSheetUrl: text("did_sheet_url"),
  didSheetEnabled: boolean("did_sheet_enabled").default(false),
  didSheetLastRunAt: timestamp("did_sheet_last_run_at"),
  didSheetLastRunResult: text("did_sheet_last_run_result"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  apiSecrets: text("api_secrets"),
  notificationEmails: text("notification_emails"),
});

export type CompanySettings = typeof companySettingsTable.$inferSelect;
