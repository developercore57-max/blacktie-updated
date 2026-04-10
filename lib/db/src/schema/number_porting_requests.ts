import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { resellersTable } from "./resellers";
import { clientsTable } from "./clients";

export const numberPortingRequestsTable = pgTable("number_porting_requests", {
  id: serial("id").primaryKey(),
  resellerId: integer("reseller_id").notNull().references(() => resellersTable.id),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  portingNumbers: text("porting_numbers").notNull(),
  currentProvider: text("current_provider"),
  accountNumber: text("account_number"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  portingDate: text("porting_date"),
  notes: text("notes"),
  attachments: text("attachments"),
  documentPath: text("document_path"),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNumberPortingRequestSchema = createInsertSchema(numberPortingRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNumberPortingRequest = z.infer<typeof insertNumberPortingRequestSchema>;
export type NumberPortingRequest = typeof numberPortingRequestsTable.$inferSelect;
