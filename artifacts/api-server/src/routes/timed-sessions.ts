import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, timedSessionBackups, accountDeletions } from "@workspace/db";
import { GetTimedSessionParams, GetTimedSessionResponse, SaveTimedSessionBody } from "@workspace/api-zod";
import { lockAccount } from "./account";

// Bounded, versioned snapshots. Question/content compatibility is also checked
// against the installed exam before the learner can restore on the client.
const sessionSchema = z.object({
  version: z.literal(1),
  attemptId: z.string().min(1).max(120).optional(),
  examId: z.string().min(1).max(80),
  mode: z.enum(["training", "full"]),
  sections: z.array(z.number().int().min(0).max(99)).min(1).max(20),
  stage: z.number().int().min(0).max(21),
  deadline: z.number().positive().finite().nullable(),
  question: z.number().int().min(0).max(499),
  answers: z.array(z.array(z.number().int().min(0).max(19).nullable()).min(1).max(500)).min(1).max(20),
  essay: z.string().max(20000),
}).strict();

const router = Router();
router.get("/timed-sessions/:slot", async (req, res): Promise<void> => {
  const params = GetTimedSessionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid practice slot" }); return; }
  const [row] = await db.select().from(timedSessionBackups).where(and(
    eq(timedSessionBackups.userId, getAuth(req).userId!),
    eq(timedSessionBackups.slot, params.data.slot),
  ));
  res.json(GetTimedSessionResponse.parse({
    revision: row?.revision ?? 0, savedAt: row?.savedAt.toISOString() ?? null, session: row?.session ?? null,
  }));
});

router.put("/timed-sessions/:slot", async (req, res): Promise<void> => {
  const params = GetTimedSessionParams.safeParse(req.params);
  const body = SaveTimedSessionBody.strict().safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid backup" }); return; }
  let value: unknown;
  try { value = JSON.parse(body.data.session); }
  catch { res.status(400).json({ error: "Invalid session JSON" }); return; }
  const parsed = sessionSchema.safeParse(value);
  if (!parsed.success) { res.status(400).json({ error: "Invalid session" }); return; }
  const s = parsed.data;
  const [exam, mode, section, focus] = params.data.slot.split(":");
  const stages = s.sections.length + (s.mode === "full" ? 1 : 0);
  if (s.examId !== exam || s.mode !== mode || s.stage > stages
    || s.answers.length !== s.sections.length
    || (s.stage === stages ? s.deadline !== null : s.deadline === null)
    || (mode === "training" && (s.sections.length !== 1 || s.sections[0] !== Number(section)))
    || (mode === "full" && (focus !== "mixed" || !s.sections.every((v, i) => v === i)))) {
    res.status(400).json({ error: "Session does not match practice slot" }); return;
  }
  const userId = getAuth(req).userId!;
  const result = await db.transaction(async tx => {
    await lockAccount(tx, userId);
    const [deleting] = await tx.select().from(accountDeletions).where(eq(accountDeletions.userId, userId));
    if (deleting) return { status: 403 as const };
    await clerkClient.users.getUser(userId);
    const where = and(eq(timedSessionBackups.userId, userId), eq(timedSessionBackups.slot, params.data.slot));
    const [existing] = await tx.select().from(timedSessionBackups).where(where);
    if ((existing?.revision ?? 0) !== body.data.revision) return { status: 409 as const };
    const values = { session: body.data.session, revision: body.data.revision + 1, savedAt: new Date() };
    const [saved] = await tx.insert(timedSessionBackups).values({ userId, slot: params.data.slot, ...values })
      .onConflictDoUpdate({ target: [timedSessionBackups.userId, timedSessionBackups.slot], set: values }).returning();
    return { status: 200 as const, saved };
  });
  if (result.status !== 200) {
    res.status(result.status).json({ error: result.status === 409 ? "Backup changed on another device" : "Account deletion pending" });
    return;
  }
  res.json(GetTimedSessionResponse.parse({
    session: result.saved.session, revision: result.saved.revision, savedAt: result.saved.savedAt.toISOString(),
  }));
});
export default router;
