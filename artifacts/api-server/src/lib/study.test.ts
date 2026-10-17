import { test } from "node:test";
import assert from "node:assert/strict";
// Node 24 runs this regression test directly using its TypeScript loader.
// @ts-ignore -- runtime .ts import is required by Node's native loader.
import { addLesson, emptyStats, validLegacyStats } from "./study.ts";

test("lesson counters accumulate without mutating defaults", () => {
  const next = addLesson(emptyStats, 3, 5, new Date("2026-10-01T12:00:00Z"));
  assert.deepEqual(next, { xp: 30, streak: 1, correctAnswers: 3, answeredQuestions: 5,
    lessonsCompleted: 1, masteredWords: 3, lastPracticeDate: "2026-10-01" });
  assert.equal(emptyStats.xp, 0);
});

test("streak increments only on consecutive UTC days and resets after a gap", () => {
  const first = addLesson(emptyStats, 0, 5, new Date("2026-10-01T12:00:00Z"));
  const same = addLesson(first, 1, 5, new Date("2026-10-01T23:59:00Z"));
  const next = addLesson(same, 5, 5, new Date("2026-10-02T00:01:00Z"));
  assert.equal(same.streak, 1);
  assert.equal(next.streak, 2);
  assert.equal(addLesson(next, 4, 5, new Date("2026-10-04T00:00:00Z")).streak, 1);
  assert.equal(next.xp, 60);
});

test("legacy imports must be internally consistent", () => {
  const valid = addLesson(emptyStats, 3, 5, new Date("2026-01-01T00:00:00Z"));
  assert.equal(validLegacyStats(valid), true);
  assert.equal(validLegacyStats(emptyStats), true);
  for (const change of [
    { correctAnswers: 6 }, { xp: 31 }, { masteredWords: 4 },
    { lessonsCompleted: 2 }, { streak: 2 }, { lastPracticeDate: null },
    { lastPracticeDate: "2026-02-30" }, { lastPracticeDate: "2999-01-01" },
  ]) assert.equal(validLegacyStats({ ...valid, ...change }), false);
});
