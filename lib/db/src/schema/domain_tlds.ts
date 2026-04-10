import { pgTable, varchar, numeric, integer, timestamp, serial } from "drizzle-orm/pg-core";

export const domainTldsTable = pgTable("domain_tlds", {
  id: serial("id").primaryKey(),
  tld: varchar("tld", { length: 50 }).notNull(),
  description: varchar("description", { length: 255 }),
  registrationYears: integer("registration_years").notNull().default(1),
  retailPriceExclVat: numeric("retail_price_excl_vat", { precision: 10, scale: 2 }),
  priceInclVat: numeric("price_incl_vat", { precision: 10, scale: 2 }),
  resellerPriceExclVat: numeric("reseller_price_excl_vat", { precision: 10, scale: 2 }),
  resellerPriceInclVat: numeric("reseller_price_incl_vat", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
