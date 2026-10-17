import { pgTable, text, date, primaryKey } from "drizzle-orm/pg-core";

export const accountPlanAccess = pgTable("account_plan_access", {
  userId: text("user_id").primaryKey(),
  plan: text("plan").notNull(),
});

export const planActivityClaims = pgTable("plan_activity_claims", {
  userId: text("user_id").notNull().references(() => accountPlanAccess.userId, { onDelete: "cascade" }),
  key: text("activity_key").notNull(),
  activity: text("activity").notNull(),
  activityDate: date("activity_date", { mode: "string" }).notNull(),
  lessonEventId: text("lesson_event_id"),
}, (t) => [primaryKey({ columns: [t.userId, t.key] })]);
