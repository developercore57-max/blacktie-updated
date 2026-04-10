import { pgTable, text, integer, timestamp, numeric, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull().default("product"),
  referenceId: integer("reference_id"),
  name: text("name").notNull(),
  sku: text("sku"),
  quantity: integer("quantity").notNull().default(1),
  unitPriceExclVat: numeric("unit_price_excl_vat", { precision: 10, scale: 2 }).notNull().default("0"),
  unitPriceInclVat: numeric("unit_price_incl_vat", { precision: 10, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true, createdAt: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItemsTable.$inferSelect;
