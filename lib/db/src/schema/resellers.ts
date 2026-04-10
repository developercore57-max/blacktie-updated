import { pgTable, text, timestamp, serial, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resellersTable = pgTable("resellers", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  unitStreetNumber: text("unit_street_number"),
  buildingComplex: text("building_complex"),
  streetName: text("street_name"),
  address: text("address"),
  address2: text("address2"),
  city: text("city"),
  province: text("province"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("resellers_phone_unique")
    .on(table.phone)
    .where(sql`${table.phone} IS NOT NULL`),
]);

export const insertResellerSchema = createInsertSchema(resellersTable).omit({ id: true, createdAt: true });
export type InsertReseller = z.infer<typeof insertResellerSchema>;
export type Reseller = typeof resellersTable.$inferSelect;
