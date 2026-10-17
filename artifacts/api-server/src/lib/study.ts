import type { StudyStats } from "@workspace/api-zod";

export const emptyStats: StudyStats = {
  xp: 0, streak: 0, correctAnswers: 0, answeredQuestions: 0,
  lessonsCompleted: 0, masteredWords: 0, lastPracticeDate: null,
};

const DAY_MS = 86400000;
export type PracticeRange = [number, number];

// Timestamp bounds are checked only for new event IDs, never again on retries.
export function lessonPracticeTime(completedAt: string | undefined, now = new Date()): Date {
  if (completedAt === undefined) return now;
  const time = new Date(completedAt);
  if (!Number.isFinite(time.getTime()) || time.toISOString() !== completedAt) {
    throw new Error("Invalid completion timestamp");
  }
  const age = now.getTime() - time.getTime();
  if (age > 30 * DAY_MS || age < -5 * 60 * 1000) return now;
  return new Date(Math.min(time.getTime(), now.getTime()));
}

export function seedPracticeRanges(stats: StudyStats): PracticeRange[] {
  if (!stats.lastPracticeDate || !stats.streak) return [];
  // Old snapshots/imports only prove their final contiguous run, not older history.
  const end = Math.floor(Date.parse(stats.lastPracticeDate) / DAY_MS);
  return [[end - stats.streak + 1, end]];
}

export function addPracticeDay(ranges: PracticeRange[], time: Date): PracticeRange[] {
  const day = Math.floor(time.getTime() / DAY_MS);
  const sorted = [...ranges, [day, day] as PracticeRange].sort((a, b) => a[0] - b[0]);
  const merged: PracticeRange[] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

export function addLesson(previous: StudyStats, correct: number, total: number, now = new Date(),
  ranges = addPracticeDay(seedPracticeRanges(previous), now)): StudyStats {
  const [start, end] = ranges[ranges.length - 1];
  return {
    xp: previous.xp + correct * 10,
    streak: end - start + 1,
    correctAnswers: previous.correctAnswers + correct,
    answeredQuestions: previous.answeredQuestions + total,
    lessonsCompleted: previous.lessonsCompleted + 1,
    masteredWords: previous.masteredWords + correct,
    lastPracticeDate: new Date(end * DAY_MS).toISOString().slice(0, 10),
  };
}

export function validLegacyStats(stats: StudyStats) {
  const day = stats.lastPracticeDate;
  return stats.correctAnswers <= stats.answeredQuestions
    && stats.xp === stats.correctAnswers * 10
    && stats.masteredWords === stats.correctAnswers
    && stats.answeredQuestions >= stats.lessonsCompleted
    && stats.streak <= stats.lessonsCompleted
    && (stats.lessonsCompleted === 0
      ? day === null && stats.streak === 0
      : day !== null && stats.streak > 0
        && !Number.isNaN(Date.parse(day))
        && new Date(day).toISOString().slice(0, 10) === day
        && day <= new Date().toISOString().slice(0, 10));
}
