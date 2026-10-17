import { Router } from "express";
import { isDeepStrictEqual } from "node:util";
import { getAuth } from "@clerk/express";
import { db, studyEvents, studyProgress } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { GetStudyStatsResponse, ImportStudyStatsBody, SaveStudyLessonBody } from "@workspace/api-zod";
import { addLesson, emptyStats, validLegacyStats } from "../lib/study";

const router = Router();
router.use("/study", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
});

router.get("/study/stats", async (req, res) => {
  const userId = getAuth(req).userId!;
  const [row] = await db.select().from(studyProgress).where(eq(studyProgress.userId, userId));
  res.json(GetStudyStatsResponse.parse(row?.stats ?? emptyStats));
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
    if (("stats" in data && !validLegacyStats(data.stats))
      || ("correct" in data && data.correct > data.total)) {
      res.status(400).json({ error: "Inconsistent study data" });
      return;
    }
    const payload = { kind, ...data };
    const result = await db.transaction(async (tx) => {
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
        return { status: same ? 200 : 409, stats: previous };
      }
      if ("stats" in data && previous.lessonsCompleted !== 0) return { status: 409, stats: previous };
      const next = "stats" in data ? data.stats : addLesson(previous, data.correct, data.total);
      GetStudyStatsResponse.parse(next);
      await tx.insert(studyEvents).values({ userId, eventId: data.eventId, payload });
      await tx.update(studyProgress).set({ stats: next }).where(eq(studyProgress.userId, userId));
      return { status: 200, stats: next };
    });
    if (result.status === 409) {
      res.status(409).json({ error: "Cloud progress exists or event ID conflicts. Local progress has not been replaced." });
    } else res.json(result.stats);
  });
}

export default router;
