import { Router } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db, studyProgress, accountDeletions } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// Shared with study writes, including requests from another device.
export async function lockAccount(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], userId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
}

let running = false;
export async function processAccountDeletions() {
  if (running) return;
  running = true;
  try {
    const jobs = await db.select().from(accountDeletions).limit(100);
    for (const job of jobs) {
      try {
        await db.transaction(async tx => {
          await lockAccount(tx, job.userId);
          const [pending] = await tx.select().from(accountDeletions).where(eq(accountDeletions.userId, job.userId));
          if (!pending) return;
          try { await clerkClient.users.deleteUser(job.userId); }
          catch (error) {
            if (!(typeof error === "object" && error !== null && "status" in error && error.status === 404)) throw error;
          }
          await tx.delete(studyProgress).where(eq(studyProgress.userId, job.userId));
          await tx.delete(accountDeletions).where(eq(accountDeletions.userId, job.userId));
        });
      } catch {
        // The committed job survives a crash, provider outage, or failed DB
        // commit after identity deletion. A 404 on the next pass is success.
        logger.warn("Account deletion remains queued for retry");
      }
    }
  } catch {
    logger.error("Could not load pending account deletions");
  } finally { running = false; }
}

router.delete("/account", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const auth = getAuth(req);
  if (!auth.userId) return void res.status(401).json({ error: "Authentication required" });
  if (!auth.has({ reverification: "strict_mfa" })) {
    return void res.status(403).json({ error: "Recent verification required" });
  }
  try {
    await db.transaction(async tx => {
      await lockAccount(tx, auth.userId!);
      await tx.insert(accountDeletions).values({ userId: auth.userId! }).onConflictDoNothing();
    });
    // Acknowledge the durable request before revoking the client's session.
    res.on("finish", () => { void processAccountDeletions(); });
    res.status(202).end();
  } catch {
    res.status(503).json({ error: "Deletion could not be completed. Retry before signing out." });
  }
});

export default router;
