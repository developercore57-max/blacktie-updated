import { pgTable, text, integer, timestamp, numeric, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const webHostingPackagesTable = pgTable("web_hosting_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  diskSpaceGb: integer("disk_space_gb").notNull().default(1),
  bandwidthGb: integer("bandwidth_gb").notNull().default(10),
  emailAccounts: integer("email_accounts").notNull().default(5),
  databases: integer("databases").notNull().default(1),
  subdomains: integer("subdomains").notNull().default(1),
  sslIncluded: boolean("ssl_included").notNull().default(true),
  retailPriceExclVat: numeric("retail_price_excl_vat", { precision: 10, scale: 2 }),
  resellerPriceExclVat: numeric("reseller_price_excl_vat", { precision: 10, scale: 2 }),
  resellerPriceInclVat: numeric("reseller_price_incl_vat", { precision: 10, scale: 2 }),
  priceInclVat: numeric("price_incl_vat", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWebHostingPackageSchema = createInsertSchema(webHostingPackagesTable).omit({ id: true, createdAt: true });
export type InsertWebHostingPackage = z.infer<typeof insertWebHostingPackageSchema>;
export type WebHostingPackage = typeof webHostingPackagesTable.$inferSelect;
