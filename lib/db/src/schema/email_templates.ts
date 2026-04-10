import { pgTable, text, integer, timestamp, boolean, serial } from "drizzle-orm/pg-core";

export const emailTemplatesTable = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  notificationRecipients: text("notification_recipients"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EmailTemplate = typeof emailTemplatesTable.$inferSelect;
