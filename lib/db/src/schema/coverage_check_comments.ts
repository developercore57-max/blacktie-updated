import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coverageCheckRequestsTable } from "./coverage_check_requests";
import { resellersTable } from "./resellers";
import { adminsTable } from "./admins";

export const coverageCheckCommentsTable = pgTable("coverage_check_comments", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => coverageCheckRequestsTable.id, { onDelete: "cascade" }),
  authorRole: text("author_role").notNull(),
  resellerId: integer("reseller_id").references(() => resellersTable.id, { onDelete: "set null" }),
  adminId: integer("admin_id").references(() => adminsTable.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCoverageCheckCommentSchema = createInsertSchema(coverageCheckCommentsTable).omit({ id: true, createdAt: true });
export type InsertCoverageCheckComment = z.infer<typeof insertCoverageCheckCommentSchema>;
export type CoverageCheckComment = typeof coverageCheckCommentsTable.$inferSelect;
