import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { resellersTable } from "./resellers";
import { clientsTable } from "./clients";

export const coverageCheckRequestsTable = pgTable("coverage_check_requests", {
  id: serial("id").primaryKey(),
  resellerId: integer("reseller_id").notNull().references(() => resellersTable.id),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  serviceType: text("service_type").default("fibre"),
  address: text("address").notNull(),
  unitStreetNumber: text("unit_street_number"),
  buildingComplex: text("building_complex"),
  streetName: text("street_name"),
  address2: text("address2"),
  suburb: text("suburb"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  result: text("result"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCoverageCheckRequestSchema = createInsertSchema(coverageCheckRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCoverageCheckRequest = z.infer<typeof insertCoverageCheckRequestSchema>;
export type CoverageCheckRequest = typeof coverageCheckRequestsTable.$inferSelect;
