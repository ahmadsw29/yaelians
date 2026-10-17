import { expect, test } from 'vitest';
import { getLearnerRank, LEARNER_RANKS, MASTER_XP } from '../../artifacts/yael-arabic-prep/lib/learner-ranks';

test('every XP boundary awards the correct title without changing earned XP', () => {
  for (let i = 0; i < LEARNER_RANKS.length; i++) {
    const rank = LEARNER_RANKS[i];
    expect(getLearnerRank(rank.minXp).rank).toEqual(rank);
    if (i > 0) expect(getLearnerRank(rank.minXp - 1).rank).toEqual(LEARNER_RANKS[i - 1]);
  }
  expect(getLearnerRank(50)).toMatchObject({ rank: { title: 'Rookie' }, remainingXp: 950, progress: 0.05 });
  expect(getLearnerRank(100_000)).toMatchObject({ rank: { title: 'Master of YAEL' }, nextRank: null, remainingXp: 0, progress: 1 });
  expect(getLearnerRank(-1).rank.title).toBe('Rookie');
});

test('thresholds are doubled without calendar locks or XP deductions', () => {
  const slowerDailyXp = 27 * 10;
  const fasterDailyXp = 57 * 10;
  expect(LEARNER_RANKS.map(rank => rank.minXp)).toEqual([0, 1000, 4000, 9000, 16000, 24000]);
  expect(Math.ceil(MASTER_XP / fasterDailyXp)).toBe(43);
  expect(Math.ceil(MASTER_XP / slowerDailyXp)).toBe(89);
  const gaps = LEARNER_RANKS.slice(1).map((rank, index) => rank.minXp - LEARNER_RANKS[index].minXp);
  expect(gaps.every((gap, index) => index === 0 || gap >= gaps[index - 1])).toBe(true);
  expect(getLearnerRank(6000).rank.id).toBe('amateur');
  expect(getLearnerRank(MASTER_XP).rank.id).toBe('master');
});
