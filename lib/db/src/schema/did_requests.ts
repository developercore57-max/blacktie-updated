import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { resellersTable } from "./resellers";
import { areaCodesTable } from "./area_codes";

export const didRequestsTable = pgTable("did_requests", {
  id: serial("id").primaryKey(),
  resellerId: integer("reseller_id").notNull().references(() => resellersTable.id),
  areaCodeId: integer("area_code_id").references(() => areaCodesTable.id),
  requestedNumber: text("requested_number"),
  quantity: integer("quantity").notNull().default(1),
  didIds: text("did_ids"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDidRequestSchema = createInsertSchema(didRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDidRequest = z.infer<typeof insertDidRequestSchema>;
export type DidRequest = typeof didRequestsTable.$inferSelect;
