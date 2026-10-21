import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// References only. Whop remains the source of truth for payment and membership state.
export const webBillingAccounts = pgTable("web_billing_accounts", {
  userId: text("user_id").primaryKey(),
  checkoutId: text("checkout_id").unique(),
  membershipId: text("membership_id").unique(),
  checkoutCreatedAt: timestamp("checkout_created_at", { withTimezone: true }),
});
