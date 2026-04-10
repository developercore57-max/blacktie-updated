import { pgTable, text, integer, timestamp, numeric, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productCategoriesTable } from "./product_categories";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => productCategoriesTable.id),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku"),
  imageUrl: text("image_url"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  retailPriceExclVat: numeric("retail_price_excl_vat", { precision: 10, scale: 2 }),
  resellerPriceExclVat: numeric("reseller_price_excl_vat", { precision: 10, scale: 2 }),
  resellerPriceInclVat: numeric("reseller_price_incl_vat", { precision: 10, scale: 2 }),
  priceInclVat: numeric("price_incl_vat", { precision: 10, scale: 2 }),
  stockCount: integer("stock_count").notNull().default(0),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
