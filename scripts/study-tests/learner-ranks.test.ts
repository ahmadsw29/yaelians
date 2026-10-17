import { expect, test } from 'vitest';
import { getLearnerRank, LEARNER_RANKS, MASTER_XP } from '../../artifacts/yael-arabic-prep/lib/learner-ranks';

test('every XP boundary awards the correct title without changing earned XP', () => {
  for (let i = 0; i < LEARNER_RANKS.length; i++) {
    const rank = LEARNER_RANKS[i];
    expect(getLearnerRank(rank.minXp).rank).toEqual(rank);
    if (i > 0) expect(getLearnerRank(rank.minXp - 1).rank).toEqual(LEARNER_RANKS[i - 1]);
  }
  expect(getLearnerRank(50)).toMatchObject({ rank: { title: 'Rookie' }, remainingXp: 450, progress: 0.1 });
  expect(getLearnerRank(100_000)).toMatchObject({ rank: { title: 'Master of YAEL' }, nextRank: null, remainingXp: 0, progress: 1 });
  expect(getLearnerRank(-1).rank.title).toBe('Rookie');
});

test('regular practice targets three to six weeks without calendar locks or XP deductions', () => {
  const slowerDailyXp = 27 * 10;
  const fasterDailyXp = 57 * 10;
  expect(Math.ceil(MASTER_XP / fasterDailyXp)).toBeGreaterThanOrEqual(21);
  expect(Math.ceil(MASTER_XP / slowerDailyXp)).toBeLessThanOrEqual(45);
  const gaps = LEARNER_RANKS.slice(1).map((rank, index) => rank.minXp - LEARNER_RANKS[index].minXp);
  expect(gaps.every((gap, index) => index === 0 || gap >= gaps[index - 1])).toBe(true);
  expect(getLearnerRank(6000).rank.id).toBe('real-student');
  expect(getLearnerRank(MASTER_XP).rank.id).toBe('master');
});
