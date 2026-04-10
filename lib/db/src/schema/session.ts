import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const sessionsTable = pgTable("session", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: text("sess"),
  expire: timestamp("expire"),
});

export type Session = typeof sessionsTable.$inferSelect;
