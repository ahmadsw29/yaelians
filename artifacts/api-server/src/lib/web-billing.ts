import { db, webBillingAccounts } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getWhopClient } from "./whopClient";
import { membershipGrantsAccess } from "./web-billing-policy";
import { z } from "zod";

export type WebBillingStatus = { state: "active" | "inactive" | "pending"; cancelAtPeriodEnd: boolean; periodEnd: string | null };
const inactive: WebBillingStatus = { state: "inactive", cancelAtPeriodEnd: false, periodEnd: null };
const cache = new Map<string, { until: number; status: WebBillingStatus }>();
const checking = new Map<string, Promise<WebBillingStatus>>();
let catalogCache: { until: number; priceLabel: string; checkoutEnabled: boolean } | undefined;

export function billingConfiguration() {
  const companyId = process.env.WHOP_COMPANY_ID;
  const productId = process.env.WHOP_PRODUCT_ID;
  const planId = process.env.WHOP_PLAN_ID;
  if (!companyId || !productId || !planId) throw new Error("Billing is not configured");
  return { companyId, productId, planId };
}

export async function billingCatalog() {
  if (catalogCache && catalogCache.until > Date.now()) return catalogCache;
  const config = billingConfiguration();
  // Validate fields returned by the API that the pinned SDK marks as unknown.
  const plan = z.object({
    company: z.object({ id: z.string() }), product: z.object({ id: z.string() }),
    currency: z.string(), billing_period: z.number(), plan_type: z.string(),
    initial_price: z.number(), renewal_price: z.number(),
    adaptive_pricing_enabled: z.boolean(), trial_period_days: z.number().nullish(),
  }).parse(await (await getWhopClient()).plans.retrieve(config.planId));
  if (plan.company.id !== config.companyId || plan.product.id !== config.productId
    || plan.currency !== "ils" || plan.billing_period !== 30 || plan.plan_type !== "renewal"
    || plan.initial_price !== 0 || plan.renewal_price !== 48.9
    || plan.adaptive_pricing_enabled || (plan.trial_period_days ?? 0) > 0) {
    throw new Error("The subscription price requires review");
  }
  catalogCache = {
    until: Date.now() + 30_000,
    priceLabel: new Intl.NumberFormat("en-IL", { style: "currency", currency: plan.currency.toUpperCase() }).format(plan.renewal_price),
    checkoutEnabled: !!process.env.APP_PUBLIC_URL && process.env.WHOP_CHECKOUT_ENABLED === "true",
  };
  return catalogCache;
}

export function invalidateWebBilling(userId: string) { cache.delete(userId); }

async function fetchStatus(userId: string): Promise<WebBillingStatus> {
  const [link] = await db.select().from(webBillingAccounts).where(eq(webBillingAccounts.userId, userId));
  if (!link) return inactive;
  const config = billingConfiguration();
  const client = await getWhopClient();
  let membershipId = link.membershipId;
  let pending = false;
  if (link.checkoutId) {
    const payments = await client.payments.list({
      company_id: config.companyId, checkout_configuration_ids: [link.checkoutId], first: 100,
    });
    // Query filtering is not a security boundary: check each returned payment too.
    for await (const payment of payments) {
      if (payment.checkout_configuration_id !== link.checkoutId || payment.company?.id !== config.companyId) continue;
      if (payment.status === "pending") pending = true;
      if (payment.status !== "paid" || !payment.membership?.id) continue;
      const membership = await client.memberships.retrieve(payment.membership.id);
      if (membership.checkout_configuration_id !== link.checkoutId) continue;
      if (!membershipGrantsAccess(membership, config)) continue;
      membershipId = membership.id;
      await db.insert(webBillingAccounts).values({ userId, membershipId }).onConflictDoUpdate({
        target: webBillingAccounts.userId, set: { membershipId },
      });
      break;
    }
  }
  if (membershipId) {
    const membership = await client.memberships.retrieve(membershipId);
    if (membershipGrantsAccess(membership, config)) return {
      state: "active", cancelAtPeriodEnd: membership.cancel_at_period_end, periodEnd: membership.renewal_period_end,
    };
  }
  return pending ? { ...inactive, state: "pending" } : inactive;
}

export async function webBillingStatus(userId: string, fresh = false): Promise<WebBillingStatus> {
  // A forced check after cancellation must not reuse a pre-cancellation read.
  if (fresh && checking.has(userId)) await checking.get(userId)!.catch(() => undefined);
  const cached = cache.get(userId);
  if (!fresh && cached && cached.until > Date.now()) return cached.status;
  const existing = checking.get(userId);
  if (existing) return existing;
  const request = fetchStatus(userId).then(status => {
    if (cache.size > 1000) cache.clear();
    cache.set(userId, { until: Math.min(Date.now() + 15_000, status.periodEnd ? Date.parse(status.periodEnd) : Infinity), status });
    return status;
  }).finally(() => checking.delete(userId));
  checking.set(userId, request);
  return request;
}

// Never persist a subscription as a permanent complimentary premium grant.
export async function effectiveStudyPlan(userId: string, stored: string | null | undefined) {
  if (stored === "premium") return "premium";
  return (await webBillingStatus(userId)).state === "active" ? "premium" : stored ?? null;
}

export async function cancelWebSubscription(userId: string) {
  const [link] = await db.select().from(webBillingAccounts).where(eq(webBillingAccounts.userId, userId));
  if (!link?.membershipId) throw new Error("No linked subscription");
  const client = await getWhopClient();
  const membership = await client.memberships.retrieve(link.membershipId);
  const config = billingConfiguration();
  if (membership.company.id !== config.companyId || membership.product.id !== config.productId
    || membership.plan.id !== config.planId) throw new Error("Subscription mismatch");
  if (membershipGrantsAccess(membership, config) && !membership.cancel_at_period_end) {
    const cancelled = await client.memberships.cancel(membership.id, { cancellation_mode: "at_period_end" });
    if (!cancelled.cancel_at_period_end) throw new Error("Cancellation was not confirmed");
  }
  invalidateWebBilling(userId);
  return webBillingStatus(userId, true);
}

export async function closeWebBillingForDeletion(userId: string) {
  const [link] = await db.select().from(webBillingAccounts).where(eq(webBillingAccounts.userId, userId));
  if (!link) return;
  const client = await getWhopClient();
  // Close the outstanding checkout before removing the identity. An outage must
  // leave deletion queued, rather than leave an unmanageable recurring charge.
  if (link.checkoutId) {
    try { await client.delete(`/checkout_configurations/${encodeURIComponent(link.checkoutId)}`); }
    catch (error) { if (!(typeof error === "object" && error && "status" in error && error.status === 404)) throw error; }
  }
  const status = await webBillingStatus(userId, true);
  if (status.state === "pending") throw new Error("Payment is still settling");
  const [updated] = await db.select().from(webBillingAccounts).where(eq(webBillingAccounts.userId, userId));
  if (updated?.membershipId) await cancelWebSubscription(userId);
  await db.delete(webBillingAccounts).where(eq(webBillingAccounts.userId, userId));
  invalidateWebBilling(userId);
}
