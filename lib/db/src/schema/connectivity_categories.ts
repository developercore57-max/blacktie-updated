import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const connectivityCategoriesTable = pgTable("connectivity_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConnectivityCategorySchema = createInsertSchema(connectivityCategoriesTable).omit({ id: true, createdAt: true });
export type InsertConnectivityCategory = z.infer<typeof insertConnectivityCategorySchema>;
export type ConnectivityCategory = typeof connectivityCategoriesTable.$inferSelect;
