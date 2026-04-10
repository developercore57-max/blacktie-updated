import { pgTable, text, integer, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { adminsTable } from "./admins";

export const noticesTable = pgTable("notices", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("info"),
  priority: integer("priority").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdByAdminId: integer("created_by_admin_id").references(() => adminsTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Notice = typeof noticesTable.$inferSelect;
export type InsertNotice = typeof noticesTable.$inferInsert;
