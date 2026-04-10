import { pgTable, text, timestamp, numeric, integer, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { resellersTable } from "./resellers";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  resellerId: integer("reseller_id").notNull().references(() => resellersTable.id),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  unitStreetNumber: text("unit_street_number"),
  buildingComplex: text("building_complex"),
  streetName: text("street_name"),
  address: text("address"),
  address2: text("address2"),
  city: text("city"),
  province: text("province"),
  sipExtensions: integer("sip_extensions").notNull().default(1),
  monthlyFee: numeric("monthly_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  proofOfIdentity: text("proof_of_identity"),
  proofOfResidence: text("proof_of_residence"),
  registrationDocument: text("registration_document"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
