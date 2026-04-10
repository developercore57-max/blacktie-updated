import { pgTable, text, integer, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { adminsTable } from "./admins";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  storedName: text("stored_name").notNull(),
  description: text("description").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdByAdminId: integer("created_by_admin_id").references(() => adminsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Document = typeof documentsTable.$inferSelect;
export type InsertDocument = typeof documentsTable.$inferInsert;
