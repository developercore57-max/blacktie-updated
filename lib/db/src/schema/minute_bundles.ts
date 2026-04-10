import { pgTable, text, integer, numeric, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const minuteBundlesTable = pgTable("minute_bundles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  minutes: integer("minutes").notNull().default(0),
  retailPriceExclVat: numeric("retail_price_excl_vat", { precision: 10, scale: 2 }),
  retailPriceInclVat: numeric("retail_price_incl_vat", { precision: 10, scale: 2 }),
  resellerPriceExclVat: numeric("reseller_price_excl_vat", { precision: 10, scale: 2 }),
  resellerPriceInclVat: numeric("reseller_price_incl_vat", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMinuteBundleSchema = createInsertSchema(minuteBundlesTable).omit({ id: true, createdAt: true });
export type InsertMinuteBundle = z.infer<typeof insertMinuteBundleSchema>;
export type MinuteBundle = typeof minuteBundlesTable.$inferSelect;
