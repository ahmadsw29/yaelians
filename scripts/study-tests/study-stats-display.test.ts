import { expect, test } from 'vitest';
import { DEFAULT_STATS } from '../../artifacts/yael-arabic-prep/lib/study';
import { getStudyStatsDisplay } from '../../artifacts/yael-arabic-prep/lib/study-stats-display';

test('account and progress stats share values and accuracy formatting', () => {
  const stats = {
    ...DEFAULT_STATS,
    xp: 80,
    streak: 3,
    correctAnswers: 7,
    answeredQuestions: 9,
    masteredWords: 3,
    lessonsCompleted: 2,
  };
  const accountSummary = getStudyStatsDisplay(stats);
  const progressSummary = getStudyStatsDisplay(stats);

  expect(accountSummary).toEqual(progressSummary);
  expect(accountSummary).toEqual({
    xp: '80',
    streak: '3',
    accuracy: '78%',
    masteredWords: '3',
    lessonsCompleted: '2',
  });
});

test('stats display placeholders while loading or after a failed refresh', () => {
  const staleStats = {
    ...DEFAULT_STATS,
    xp: 80,
    streak: 3,
    correctAnswers: 7,
    answeredQuestions: 9,
    masteredWords: 7,
    lessonsCompleted: 2,
  };
  const placeholders = {
    xp: '—',
    streak: '—',
    accuracy: '—',
    masteredWords: '—',
    lessonsCompleted: '—',
  };

  expect(getStudyStatsDisplay(staleStats, true)).toEqual(placeholders);
  expect(getStudyStatsDisplay(DEFAULT_STATS).accuracy).toBe('—');
});
