import { pgTable, text, integer, numeric, timestamp, serial } from "drizzle-orm/pg-core";
import { voipCategoriesTable } from "./voip_categories";

export const voipItemsTable = pgTable("voip_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => voipCategoriesTable.id),
  name: text("name").notNull(),
  description: text("description"),
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

export type VoipItem = typeof voipItemsTable.$inferSelect;
