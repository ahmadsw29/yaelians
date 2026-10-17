import { Router } from "express";
import { isDeepStrictEqual } from "node:util";
import { clerkClient, getAuth } from "@clerk/express";
import { lockAccount } from "./account";
import { db, studyEvents, studyProgress, accountDeletions, accountPlanAccess, planActivityClaims } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  ChooseStudyPlanBody, ClaimStudyActivityBody, ClaimStudyActivityResponse, GetStudyPlanAccessResponse,
  GetStudyStatsResponse, ImportStudyStatsBody, SaveStudyLessonBody, SaveStudyLessonResponse,
} from "@workspace/api-zod";
import { addLesson, addPracticeDay, emptyStats, lessonPracticeTime, seedPracticeRanges, validLegacyStats } from "../lib/study";

const router = Router();
type Activity = "vocabulary" | "timed-section";

function utcDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function planAccessResponse(plan: string | null, date: string, claims: { activity: string; key: string }[]) {
  return GetStudyPlanAccessResponse.parse({
    plan: plan === "free" ? "free" : null,
    usage: {
      date,
      vocabularyRounds: claims.filter(claim => claim.activity === "vocabulary").length,
      timedSections: claims.filter(claim => claim.activity === "timed-section").length,
      timedKeys: claims.filter(claim => claim.activity === "timed-section").map(claim => claim.key),
    },
  });
}

async function readPlanAccess(userId: string, date = utcDate()) {
  const [planRow] = await db.select().from(accountPlanAccess).where(eq(accountPlanAccess.userId, userId));
  const claims = await db.select({ activity: planActivityClaims.activity, key: planActivityClaims.key })
    .from(planActivityClaims)
    .where(and(eq(planActivityClaims.userId, userId), eq(planActivityClaims.activityDate, date)));
  return planAccessResponse(planRow?.plan ?? null, date, claims);
}

router.use("/study", async (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const [deleting] = await db.select().from(accountDeletions).where(eq(accountDeletions.userId, getAuth(req).userId!));
  if (deleting) {
    res.status(403).json({ error: "Account deletion is pending" });
    return;
  }
  next();
});

router.get("/study/stats", async (req, res) => {
  const userId = getAuth(req).userId!;
  const [row] = await db.select().from(studyProgress).where(eq(studyProgress.userId, userId));
  res.json(GetStudyStatsResponse.parse(row?.stats ?? emptyStats));
});

router.get("/study/plan-access", async (req, res) => {
  res.json(await readPlanAccess(getAuth(req).userId!));
});

router.put("/study/plan-access", async (req, res) => {
  const parsed = ChooseStudyPlanBody.strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }
  const userId = getAuth(req).userId!;
  const result = await db.transaction(async tx => {
    await lockAccount(tx, userId);
    const [deleting] = await tx.select().from(accountDeletions).where(eq(accountDeletions.userId, userId));
    if (deleting) return { status: 403 as const, access: planAccessResponse(null, utcDate(), []) };
    await clerkClient.users.getUser(userId);
    await tx.insert(accountPlanAccess).values({ userId, plan: parsed.data.plan })
      .onConflictDoUpdate({ target: accountPlanAccess.userId, set: { plan: parsed.data.plan } });
    const date = utcDate();
    const claims = await tx.select({ activity: planActivityClaims.activity, key: planActivityClaims.key })
      .from(planActivityClaims)
      .where(and(eq(planActivityClaims.userId, userId), eq(planActivityClaims.activityDate, date)));
    return { status: 200 as const, access: planAccessResponse(parsed.data.plan, date, claims) };
  });
  if (result.status === 403) res.status(403).json({ error: "Account deletion is pending" });
  else res.json(result.access);
});

router.post("/study/plan-access/claims", async (req, res) => {
  const parsed = ClaimStudyActivityBody.strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid activity claim" });
    return;
  }
  const userId = getAuth(req).userId!;
  const { activity, key } = parsed.data as { activity: Activity; key: string };
  const result = await db.transaction(async tx => {
    await lockAccount(tx, userId);
    const [deleting] = await tx.select().from(accountDeletions).where(eq(accountDeletions.userId, userId));
    if (deleting) return { status: 403 as const, allowed: false, access: planAccessResponse(null, utcDate(), []) };
    await clerkClient.users.getUser(userId);
    const date = utcDate();
    const [planRow] = await tx.select().from(accountPlanAccess).where(eq(accountPlanAccess.userId, userId)).for("update");
    const [existing] = await tx.select().from(planActivityClaims).where(and(
      eq(planActivityClaims.userId, userId), eq(planActivityClaims.key, key),
    ));
    let allowed = false;
    if (existing) {
      allowed = existing.activity === activity;
    } else if (planRow?.plan === "free") {
      const currentClaims = await tx.select().from(planActivityClaims).where(and(
        eq(planActivityClaims.userId, userId),
        eq(planActivityClaims.activity, activity),
        eq(planActivityClaims.activityDate, date),
      ));
      if (currentClaims.length < 1) {
        await tx.insert(planActivityClaims).values({ userId, key, activity, activityDate: date });
        allowed = true;
      }
    }
    const claims = await tx.select({ activity: planActivityClaims.activity, key: planActivityClaims.key })
      .from(planActivityClaims)
      .where(and(eq(planActivityClaims.userId, userId), eq(planActivityClaims.activityDate, date)));
    return {
      status: 200 as const,
      allowed,
      access: planAccessResponse(planRow?.plan ?? null, date, claims),
    };
  });
  if (result.status === 403) res.status(403).json({ error: "Account deletion is pending" });
  else res.json(ClaimStudyActivityResponse.parse({ allowed: result.allowed, access: result.access }));
});

for (const kind of ["lessons", "import"] as const) {
  router.post(`/study/${kind}`, async (req, res) => {
    const userId = getAuth(req).userId!;
    const parsed = (kind === "lessons" ? SaveStudyLessonBody.strict() : ImportStudyStatsBody.strict()).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid study data" });
      return;
    }
    const data = parsed.data;
    const receivedAt = new Date();
    let practiceTime = receivedAt;
    try {
      if ("correct" in data) practiceTime = lessonPracticeTime(data.completedAt, receivedAt);
    } catch {
      res.status(400).json({ error: "Invalid completion timestamp" });
      return;
    }
    if (("stats" in data && !validLegacyStats(data.stats))
      || ("correct" in data && data.correct > data.total)) {
      res.status(400).json({ error: "Inconsistent study data" });
      return;
    }
    const payload = { kind, ...data };
    const result = await db.transaction(async (tx) => {
      await lockAccount(tx, userId);
      const [deleting] = await tx.select().from(accountDeletions).where(eq(accountDeletions.userId, userId));
      if (deleting) return { status: 403, stats: emptyStats, progressCredited: false };
      // A still-unexpired JWT must not recreate data for a deleted identity.
      await clerkClient.users.getUser(userId);
      await tx.insert(studyProgress).values({ userId, stats: emptyStats }).onConflictDoNothing();
      // Lock the account row: different devices and imports cannot overwrite each other.
      const [row] = await tx.select().from(studyProgress).where(eq(studyProgress.userId, userId)).for("update");
      const previous = GetStudyStatsResponse.parse(row.stats);
      const [event] = await tx.select().from(studyEvents).where(and(
        eq(studyEvents.userId, userId), eq(studyEvents.eventId, data.eventId),
      ));
      if (event) {
        // JSONB property order is not stable.
        const same = isDeepStrictEqual(event.payload, payload);
        return { status: same ? 200 : 409, stats: previous, progressCredited: same && event.progressCredited };
      }
      if ("stats" in data && previous.lessonsCompleted !== 0) return { status: 409, stats: previous };
      let progressCredited = true;
      if ("correct" in data) {
        const [planRow] = await tx.select().from(accountPlanAccess).where(eq(accountPlanAccess.userId, userId));
        if (planRow?.plan === "free") {
          const [claim] = data.activityKey ? await tx.select().from(planActivityClaims).where(and(
            eq(planActivityClaims.userId, userId),
            eq(planActivityClaims.key, data.activityKey),
            eq(planActivityClaims.activity, "vocabulary"),
          )) : [];
          progressCredited = !!claim && (!claim.lessonEventId || claim.lessonEventId === data.eventId);
          if (progressCredited && claim && !claim.lessonEventId) {
            await tx.update(planActivityClaims).set({ lessonEventId: data.eventId }).where(and(
              eq(planActivityClaims.userId, userId), eq(planActivityClaims.key, claim.key),
            ));
          }
        }
      }
      const practiceRanges = "stats" in data ? seedPracticeRanges(data.stats)
        : progressCredited ? addPracticeDay(row.practiceRanges ?? seedPracticeRanges(previous), practiceTime)
          : (row.practiceRanges ?? seedPracticeRanges(previous));
      const next = "stats" in data ? data.stats
        : progressCredited ? addLesson(previous, data.correct, data.total, practiceTime, practiceRanges)
          : previous;
      GetStudyStatsResponse.parse(next);
      await tx.insert(studyEvents).values({
        userId, eventId: data.eventId, payload,
        practiceDate: "stats" in data || !progressCredited ? null : practiceTime.toISOString().slice(0, 10),
        progressCredited,
      });
      if (progressCredited) {
        await tx.update(studyProgress).set({ stats: next, practiceRanges }).where(eq(studyProgress.userId, userId));
      }
      return { status: 200, stats: next, progressCredited };
    });
    if (result.status === 403) {
      res.status(403).json({ error: "Account deletion is pending" });
    } else if (result.status === 409) {
      res.status(409).json({ error: "Cloud progress exists or event ID conflicts. Local progress has not been replaced." });
    } else if (kind === "lessons") {
      res.json(SaveStudyLessonResponse.parse({ stats: result.stats, progressCredited: result.progressCredited }));
    } else res.json(result.stats);
  });
}

export default router;
