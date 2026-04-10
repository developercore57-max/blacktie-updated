import { pgTable, integer, text, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { chatThreadsTable } from "./chat_threads";
import { resellersTable } from "./resellers";
import { adminsTable } from "./admins";

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => chatThreadsTable.id, { onDelete: "cascade" }),
  authorRole: text("author_role").notNull(),
  resellerId: integer("reseller_id").references(() => resellersTable.id, { onDelete: "set null" }),
  adminId: integer("admin_id").references(() => adminsTable.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessagesTable).omit({ id: true, createdAt: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
