import { pgTable, text, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const areaCodesTable = pgTable("area_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  region: text("region").notNull(),
  province: text("province").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAreaCodeSchema = createInsertSchema(areaCodesTable).omit({ id: true, createdAt: true });
export type InsertAreaCode = z.infer<typeof insertAreaCodeSchema>;
export type AreaCode = typeof areaCodesTable.$inferSelect;
