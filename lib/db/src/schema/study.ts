import { pgTable, text, jsonb, primaryKey } from "drizzle-orm/pg-core";

export const studyProgress = pgTable("study_progress", {
  userId: text("user_id").primaryKey(),
  stats: jsonb("stats").notNull(),
});

export const studyEvents = pgTable("study_events", {
  userId: text("user_id").notNull().references(() => studyProgress.userId, { onDelete: "cascade" }),
  eventId: text("event_id").notNull(),
  payload: jsonb("payload").notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.eventId] })]);
