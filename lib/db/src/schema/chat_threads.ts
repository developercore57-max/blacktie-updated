import { pgTable, integer, text, timestamp, uniqueIndex, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { resellersTable } from "./resellers";

export const chatThreadsTable = pgTable("chat_threads", {
  id: serial("id").primaryKey(),
  resellerId: integer("reseller_id").notNull().references(() => resellersTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull().default("Support chat"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_chat_threads_reseller").on(table.resellerId),
]);

export const insertChatThreadSchema = createInsertSchema(chatThreadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChatThread = z.infer<typeof insertChatThreadSchema>;
export type ChatThread = typeof chatThreadsTable.$inferSelect;
