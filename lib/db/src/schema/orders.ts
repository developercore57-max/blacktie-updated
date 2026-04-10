import { pgTable, text, integer, timestamp, numeric, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { resellersTable } from "./resellers";
import { clientsTable } from "./clients";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  resellerId: integer("reseller_id").notNull().references(() => resellersTable.id),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  totalExclVat: numeric("total_excl_vat", { precision: 12, scale: 2 }).notNull().default("0"),
  totalInclVat: numeric("total_incl_vat", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
