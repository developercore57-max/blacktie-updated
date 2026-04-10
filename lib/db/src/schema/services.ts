import { pgTable, text, integer, timestamp, numeric, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { serviceCategoriesTable } from "./service_categories";

export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => serviceCategoriesTable.id),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  retailPriceExclVat: numeric("retail_price_excl_vat", { precision: 10, scale: 2 }),
  resellerPriceExclVat: numeric("reseller_price_excl_vat", { precision: 10, scale: 2 }),
  resellerPriceInclVat: numeric("reseller_price_incl_vat", { precision: 10, scale: 2 }),
  priceInclVat: numeric("price_incl_vat", { precision: 10, scale: 2 }),
  unit: text("unit").notNull().default("month"),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServiceSchema = createInsertSchema(servicesTable).omit({ id: true, createdAt: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof servicesTable.$inferSelect;
