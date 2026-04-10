import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";
import { resellersTable } from "./resellers";
import { adminsTable } from "./admins";

export const orderCommentsTable = pgTable("order_comments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  authorRole: text("author_role").notNull(),
  resellerId: integer("reseller_id").references(() => resellersTable.id, { onDelete: "set null" }),
  adminId: integer("admin_id").references(() => adminsTable.id, { onDelete: "set null" }),
  kind: text("kind").notNull().default("comment"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderCommentSchema = createInsertSchema(orderCommentsTable).omit({ id: true, createdAt: true });
export type InsertOrderComment = z.infer<typeof insertOrderCommentSchema>;
export type OrderComment = typeof orderCommentsTable.$inferSelect;
