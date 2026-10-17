import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Durable, explicit deletion requests; removed once both stores are cleaned up.
export const accountDeletions = pgTable("account_deletions", {
  userId: text("user_id").primaryKey(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
});
