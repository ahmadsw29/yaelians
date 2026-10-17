import { expect, test } from 'vitest';
import { getLearnerRank, LEARNER_RANKS } from '../../artifacts/yael-arabic-prep/lib/learner-ranks';

test('every XP boundary awards the correct title without changing earned XP', () => {
  for (let i = 0; i < LEARNER_RANKS.length; i++) {
    const rank = LEARNER_RANKS[i];
    expect(getLearnerRank(rank.minXp).rank).toEqual(rank);
    if (i > 0) expect(getLearnerRank(rank.minXp - 1).rank).toEqual(LEARNER_RANKS[i - 1]);
  }
  expect(getLearnerRank(50)).toMatchObject({ rank: { title: 'Rookie' }, remainingXp: 50, progress: 0.5 });
  expect(getLearnerRank(100_000)).toMatchObject({ rank: { title: 'Master of YAEL' }, nextRank: null, remainingXp: 0, progress: 1 });
  expect(getLearnerRank(-1).rank.title).toBe('Rookie');
});
