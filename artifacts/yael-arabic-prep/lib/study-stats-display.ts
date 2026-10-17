import type { StudyStats } from './study';

export function getStudyStatsDisplay(stats: StudyStats, hidden = false) {
  if (hidden) {
    return {
      xp: '—',
      streak: '—',
      accuracy: '—',
      masteredWords: '—',
      lessonsCompleted: '—',
    };
  }

  const accuracy = stats.answeredQuestions
    ? `${Math.round((stats.correctAnswers / stats.answeredQuestions) * 100)}%`
    : '—';

  return {
    xp: `${stats.xp}`,
    streak: `${stats.streak}`,
    accuracy,
    masteredWords: `${stats.masteredWords}`,
    lessonsCompleted: `${stats.lessonsCompleted}`,
  };
}
