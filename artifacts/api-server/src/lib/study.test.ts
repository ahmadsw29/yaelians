import { test } from "node:test";
import assert from "node:assert/strict";
// Node 24 runs this regression test directly using its TypeScript loader.
// @ts-ignore -- runtime .ts import is required by Node's native loader.
import { addLesson, addPracticeDay, emptyStats, lessonPracticeTime, seedPracticeRanges, validLegacyStats, type PracticeRange } from "./study.ts";

test("lesson counters accumulate without mutating defaults", () => {
  const next = addLesson(emptyStats, 3, 5, new Date("2026-10-01T12:00:00Z"));
  assert.deepEqual(next, { xp: 30, streak: 1, correctAnswers: 3, answeredQuestions: 5,
    lessonsCompleted: 1, masteredWords: 0, masteredWordIds: [], lastPracticeDate: "2026-10-01" });
  assert.equal(emptyStats.xp, 0);
});

test("canonical vocabulary identities count once, even across differently ordered Unicode", () => {
  const first = addLesson(emptyStats, 3, 5, new Date("2026-10-01"), undefined, [" שָׁלוֹם ", "שָׁלוֹם", "ספר"]);
  const again = addLesson(first, 2, 5, new Date("2026-10-02"), undefined, ["שָׁלוֹם".normalize("NFD"), "ספר"]);
  assert.equal(first.masteredWords, 2);
  assert.equal(again.masteredWords, 2);
  assert.equal(again.correctAnswers, 5);
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
  const variableLength = addLesson(addLesson(emptyStats, 3, 10, new Date("2026-01-01T00:00:00Z")),
    4, 20, new Date("2026-01-02T00:00:00Z"));
  assert.equal(validLegacyStats(variableLength), true);
  for (const change of [
    { correctAnswers: 6 }, { xp: 31 }, { masteredWords: 4 },
    { lessonsCompleted: 2, answeredQuestions: 1 }, { streak: 2 }, { lastPracticeDate: null },
    { lastPracticeDate: "2026-02-30" }, { lastPracticeDate: "2999-01-01" },
  ]) assert.equal(validLegacyStats({ ...valid, ...change }), false);
});

test("completion instants are bounded, with receipt-day compatibility for older clients", () => {
  const now = new Date("2026-10-17T00:02:00.000Z");
  for (const value of [undefined, "2026-09-16T00:02:00.000Z", "2026-10-17T00:07:00.001Z"]) {
    assert.equal(lessonPracticeTime(value, now).toISOString(), now.toISOString());
  }
  for (const value of ["2026-09-17T00:02:00.000Z", "2026-10-16T23:59:59.999Z"]) {
    assert.equal(lessonPracticeTime(value, now).toISOString(), value);
  }
  // Even tolerated clock skew cannot earn tomorrow's activity.
  const midnight = new Date("2026-10-17T23:59:00.000Z");
  assert.equal(lessonPracticeTime("2026-10-18T00:04:00.000Z", midnight).toISOString(), midnight.toISOString());
  assert.equal(lessonPracticeTime("2026-09-17T00:01:59.999Z", now).toISOString(), now.toISOString());
  for (const value of ["garbage", "2026-02-30T00:00:00.000Z", "2026-10-17", "2026-10-17T25:00:00.000Z"]) {
    assert.throws(() => lessonPracticeTime(value, now), /Invalid completion timestamp/);
  }
});

function replay(days: number[], initial = emptyStats) {
  let stats = initial;
  let ranges = seedPracticeRanges(initial);
  for (const day of days) {
    const time = new Date(`2026-10-${String(day).padStart(2, "0")}T12:00:00.000Z`);
    const original = JSON.stringify(ranges);
    const nextRanges = addPracticeDay(ranges, time);
    assert.equal(JSON.stringify(ranges), original, "do not mutate stored ranges");
    ranges = nextRanges;
    stats = addLesson(stats, 3, 5, time, ranges);
  }
  return { stats, ranges };
}

test("late days bridge separate streaks regardless of event order", () => {
  const expected = replay([10, 11, 12, 13, 14]);
  for (const days of [[14, 10, 12, 11, 13], [10, 14, 13, 12, 11], [14, 13, 12, 11, 10]]) {
    assert.deepEqual(replay(days), expected);
  }
  assert.equal(expected.stats.streak, 5);
  assert.equal(expected.stats.lastPracticeDate, "2026-10-14");
  assert.equal(expected.ranges.length, 1);
});

test("older disconnected lessons and same-day lessons never move the last day backward", () => {
  const { stats, ranges } = replay([10, 11, 14, 14, 8]);
  assert.equal(stats.streak, 1);
  assert.equal(stats.lastPracticeDate, "2026-10-14");
  assert.equal(stats.lessonsCompleted, 5);
  assert.equal(stats.xp, 150);
  assert.equal(ranges.length, 3);
});

test("nullable pre-upgrade history and imports preserve their known contiguous run", () => {
  const legacy = { ...emptyStats, streak: 3, lastPracticeDate: "2026-10-10",
    xp: 90, correctAnswers: 9, masteredWords: 9, lessonsCompleted: 3, answeredQuestions: 15 };
  const { stats } = replay([12, 11, 9], legacy);
  assert.equal(stats.streak, 5);
  assert.equal(stats.lessonsCompleted, 6);
  assert.equal(stats.lastPracticeDate, "2026-10-12");
  assert.deepEqual(seedPracticeRanges(emptyStats), []);
});

test("practice history survives JSON persistence and a year boundary", () => {
  let ranges: PracticeRange[] = [];
  for (const date of ["2027-01-01", "2026-12-30", "2026-12-31"]) {
    ranges = addPracticeDay(JSON.parse(JSON.stringify(ranges)), new Date(date));
  }
  const stats = addLesson(emptyStats, 1, 5, new Date("2026-12-31"), ranges);
  assert.equal(stats.streak, 3);
  assert.equal(stats.lastPracticeDate, "2027-01-01");
});
