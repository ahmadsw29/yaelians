import { Router } from "express";
import { getAuth } from "@clerk/express";
import { TranslateStudyTextBody, TranslateStudyTextResponse } from "@workspace/api-zod";
import { TranslationLimiter, translateStudyInput } from "../lib/translation";

const router = Router();
const limiter = new TranslationLimiter();

// Mounted under the study router's authenticated, deletion-safe boundary.
router.post("/translate", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const userId = getAuth(req).userId;
  if (!userId) { res.status(401).json({ error: "Sign in required" }); return; }
  const parsed = TranslateStudyTextBody.strict().safeParse(req.body);
  if (!parsed.success || !parsed.data.text.trim()) {
    res.status(400).json({ error: "Enter between 1 and 1000 characters and choose a translation direction" });
    return;
  }
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    res.status(503).json({ error: "Translator is temporarily unavailable" });
    return;
  }
  const permit = limiter.acquire(userId);
  if (!permit.allowed) {
    res.setHeader("Retry-After", permit.retryAfter);
    res.status(429).json({ error: "Too many translations. Try again shortly." });
    return;
  }
  const controller = new AbortController();
  const onClose = () => { if (!res.writableEnded) controller.abort(); };
  res.once("close", onClose);
  try {
    const output = await translateStudyInput({ text: parsed.data.text.trim(), direction: parsed.data.direction }, undefined, controller.signal);
    if (controller.signal.aborted) return;
    res.json(TranslateStudyTextResponse.parse(output));
  } catch (error) {
    if (controller.signal.aborted) return;
    // Do not log input, output, provider errors, headers or credentials.
    const timedOut = error instanceof Error && (error.name === "APIConnectionTimeoutError" || error.name === "AbortError");
    req.log.warn({ event: "translation_failed", timedOut }, "Translation did not complete");
    res.status(timedOut ? 504 : 502).json({ error: "Translation did not complete. Please try again." });
  } finally {
    res.off("close", onClose);
    permit.release();
  }
});

export default router;
