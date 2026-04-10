import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { areaCodesTable } from "./area_codes";
import { resellersTable } from "./resellers";
import { clientsTable } from "./clients";

export const didsTable = pgTable("dids", {
  id: serial("id").primaryKey(),
  areaCodeId: integer("area_code_id").notNull().references(() => areaCodesTable.id),
  number: text("number").notNull().unique(),
  status: text("status").notNull().default("available"),
  resellerId: integer("reseller_id").references(() => resellersTable.id),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at"),
  reservedByOrderId: integer("reserved_by_order_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDidSchema = createInsertSchema(didsTable).omit({ id: true, createdAt: true });
export type InsertDid = z.infer<typeof insertDidSchema>;
export type Did = typeof didsTable.$inferSelect;
