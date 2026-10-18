import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod/v4";

// Independent of study_progress: timed attempts never grant learning counters.
export const timedSessionBackups = pgTable("timed_session_backups", {
  userId: text("user_id").notNull(),
  slot: text("slot").notNull(),
  session: text("session").notNull(),
  revision: integer("revision").notNull(),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.userId, t.slot] })]);

export const insertTimedSessionBackupSchema = createInsertSchema(timedSessionBackups);
export type InsertTimedSessionBackup = z.infer<typeof insertTimedSessionBackupSchema>;
export type TimedSessionBackupRow = typeof timedSessionBackups.$inferSelect;
