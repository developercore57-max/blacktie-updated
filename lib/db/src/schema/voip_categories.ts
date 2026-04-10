import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";

export const voipCategoriesTable = pgTable("voip_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type VoipCategory = typeof voipCategoriesTable.$inferSelect;
