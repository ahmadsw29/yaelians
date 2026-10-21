import { Router } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db, accountDeletions, accountPlanAccess, webBillingAccounts } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetBillingCatalogResponse, GetBillingStatusResponse } from "@workspace/api-zod";
import { billingCatalog, billingConfiguration, cancelWebSubscription, invalidateWebBilling, webBillingStatus } from "../lib/web-billing";
import { replacementCheckoutAllowed, trustedReturnOrigin } from "../lib/web-billing-policy";
import { getWhopClient } from "../lib/whopClient";
import { lockAccount } from "./account";

const router = Router();
const limits = new Map<string, { until: number; requests: number }>();
router.use("/billing", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/billing/catalog", async (_req, res) => {
  try { res.json(GetBillingCatalogResponse.parse(await billingCatalog())); }
  catch { res.status(503).json({ error: "Pricing is temporarily unavailable" }); }
});
router.use("/billing", async (req, res, next) => {
  const userId = getAuth(req).userId;
  if (!userId) return void res.status(401).json({ error: "Sign in required" });
  const [deleting] = await db.select().from(accountDeletions).where(eq(accountDeletions.userId, userId));
  if (deleting) return void res.status(403).json({ error: "Account deletion is pending" });
  const key = `${userId}:${req.method}:${req.path}`;
  if (limits.size > 2000) for (const [id, entry] of limits) if (entry.until < Date.now()) limits.delete(id);
  const limit = limits.get(key);
  if (limit && limit.until > Date.now()) {
    if (++limit.requests > (req.method === "GET" ? 30 : 5)) {
      res.set("Retry-After", "60");
      return void res.status(429).json({ error: "Please wait before retrying" });
    }
  } else limits.set(key, { until: Date.now() + 60_000, requests: 1 });
  if (req.method === "POST" && req.get("origin")) {
    try {
      trustedReturnOrigin(req.get("origin"), process.env.APP_PUBLIC_URL!, process.env.NODE_ENV === "development"
        ? [process.env.REPLIT_EXPO_DEV_DOMAIN, process.env.REPLIT_DEV_DOMAIN].filter(Boolean).map(host => `https://${host}`) : []);
    } catch { return void res.status(403).json({ error: "Untrusted request origin" }); }
  }
  next();
});
router.get("/billing/status", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const [grant] = await db.select().from(accountPlanAccess).where(eq(accountPlanAccess.userId, userId));
    const status = await webBillingStatus(userId, true);
    const complimentary = grant?.plan === "premium" && status.state !== "active";
    res.json(GetBillingStatusResponse.parse({ ...status, state: complimentary ? "active" : status.state, complimentary }));
  }
  catch { res.status(503).json({ error: "Subscription verification unavailable. Access was not changed." }); }
});
router.post("/billing/checkout", async (req, res) => {
  const userId = getAuth(req).userId!;
  try {
    const catalog = await billingCatalog();
    if (!catalog.checkoutEnabled) return void res.status(503).json({ error: "Checkout is not enabled yet" });
    const development = process.env.NODE_ENV === "development" ? [
      process.env.REPLIT_EXPO_DEV_DOMAIN, process.env.REPLIT_DEV_DOMAIN,
    ].filter(Boolean).map(host => `https://${host}`) : [];
    const origin = trustedReturnOrigin(req.get("origin"), process.env.APP_PUBLIC_URL!, development);
    const config = billingConfiguration();
    const client = await getWhopClient();
    const result = await db.transaction(async tx => {
      await lockAccount(tx, userId);
      const [deleting] = await tx.select().from(accountDeletions).where(eq(accountDeletions.userId, userId));
      if (deleting) throw new Error("Account deletion is pending");
      await clerkClient.users.getUser(userId);
      const [grant] = await tx.select().from(accountPlanAccess).where(eq(accountPlanAccess.userId, userId));
      if (grant?.plan === "premium") return null;
      const current = await webBillingStatus(userId, true);
      if (current.state === "active") return null;
      if (current.state === "pending") throw new Error("A payment is still processing");
      const [old] = await tx.select().from(webBillingAccounts).where(eq(webBillingAccounts.userId, userId));
      if (old?.membershipId) {
        const previous = await client.memberships.retrieve(old.membershipId);
        if (!replacementCheckoutAllowed(previous, config)) throw new Error("Resolve the existing subscription before purchasing again");
      } else if (old?.checkoutId) {
        try {
          const checkout = await client.checkoutConfigurations.retrieve(old.checkoutId);
          if (checkout.purchase_url) return checkout.purchase_url;
        } catch (error) {
          if (!(error && typeof error === "object" && "status" in error && error.status === 404)) throw error;
        }
      }
      const checkout = await client.checkoutConfigurations.create({
        plan_id: config.planId, redirect_url: `${origin}/billing-return`,
        metadata: { learner_id: userId },
      });
      if (!checkout.purchase_url) throw new Error("Checkout URL is unavailable");
      await tx.insert(webBillingAccounts).values({
        userId, checkoutId: checkout.id, checkoutCreatedAt: new Date(),
      }).onConflictDoUpdate({
        target: webBillingAccounts.userId,
        set: { checkoutId: checkout.id, checkoutCreatedAt: new Date(), membershipId: null },
      });
      return checkout.purchase_url;
    });
    if (!result) return void res.status(409).json({ error: "You already have active access" });
    invalidateWebBilling(userId);
    res.json({ purchaseUrl: result });
  } catch { res.status(503).json({ error: "Checkout could not be opened. No access was granted." }); }
});
router.post("/billing/cancel", async (req, res) => {
  try { res.json(GetBillingStatusResponse.parse({ ...await cancelWebSubscription(getAuth(req).userId!), complimentary: false })); }
  catch { res.status(503).json({ error: "Cancellation was not confirmed. Please retry before signing out." }); }
});
export default router;
