import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, accountDeletions, accountPlanAccess } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetBillingCatalogResponse, GetBillingStatusResponse } from "@workspace/api-zod";
import { billingCatalog, cancelWebSubscription, webBillingStatus } from "../lib/web-billing";
import { trustedReturnOrigin } from "../lib/web-billing-policy";

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
router.post("/billing/checkout", (_req, res) => {
  res.status(503).json({ error: "New purchases are currently unavailable" });
});
router.post("/billing/cancel", async (req, res) => {
  try { res.json(GetBillingStatusResponse.parse({ ...await cancelWebSubscription(getAuth(req).userId!), complimentary: false })); }
  catch { res.status(503).json({ error: "Cancellation was not confirmed. Please retry before signing out." }); }
});
export default router;
