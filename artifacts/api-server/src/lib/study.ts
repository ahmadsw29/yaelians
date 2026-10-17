import type { StudyStats } from "@workspace/api-zod";

export const emptyStats: StudyStats = {
  xp: 0, streak: 0, correctAnswers: 0, answeredQuestions: 0,
  lessonsCompleted: 0, masteredWords: 0, lastPracticeDate: null,
};

export function addLesson(previous: StudyStats, correct: number, total: number, now = new Date()): StudyStats {
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  return {
    xp: previous.xp + correct * 10,
    streak: previous.lastPracticeDate === today ? previous.streak
      : previous.lastPracticeDate === yesterday ? previous.streak + 1 : 1,
    correctAnswers: previous.correctAnswers + correct,
    answeredQuestions: previous.answeredQuestions + total,
    lessonsCompleted: previous.lessonsCompleted + 1,
    masteredWords: previous.masteredWords + correct,
    lastPracticeDate: today,
  };
}

export function validLegacyStats(stats: StudyStats) {
  const day = stats.lastPracticeDate;
  return stats.correctAnswers <= stats.answeredQuestions
    && stats.xp === stats.correctAnswers * 10
    && stats.masteredWords === stats.correctAnswers
    && stats.answeredQuestions === stats.lessonsCompleted * 5
    && stats.streak <= stats.lessonsCompleted
    && (stats.lessonsCompleted === 0
      ? day === null && stats.streak === 0
      : day !== null && stats.streak > 0
        && !Number.isNaN(Date.parse(day))
        && new Date(day).toISOString().slice(0, 10) === day
        && day <= new Date().toISOString().slice(0, 10));
}
