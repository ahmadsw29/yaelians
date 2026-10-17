import { pgTable, text, jsonb, primaryKey, date } from "drizzle-orm/pg-core";

export const studyProgress = pgTable("study_progress", {
  userId: text("user_id").primaryKey(),
  stats: jsonb("stats").notNull(),
  // Inclusive UTC epoch-day ranges; null means an existing snapshot needs seeding.
  practiceRanges: jsonb("practice_ranges").$type<[number, number][]>(),
});

export const studyEvents = pgTable("study_events", {
  userId: text("user_id").notNull().references(() => studyProgress.userId, { onDelete: "cascade" }),
  eventId: text("event_id").notNull(),
  payload: jsonb("payload").notNull(),
  practiceDate: date("practice_date", { mode: "string" }),
}, (t) => [primaryKey({ columns: [t.userId, t.eventId] })]);
