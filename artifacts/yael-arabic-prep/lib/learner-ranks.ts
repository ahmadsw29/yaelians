export const SEMI_MASTER_XP = 3000;
export const LEARNER_RANKS = [
  { id: 'rookie', title: 'Rookie', minXp: 0 },
  { id: 'beginner', title: 'Beginner', minXp: 100 },
  { id: 'amateur', title: 'Amateur', minXp: 500 },
  { id: 'real-student', title: 'Real Student', minXp: 1500 },
  { id: 'semi-master', title: 'Semi-Master', minXp: SEMI_MASTER_XP },
  { id: 'master', title: 'Master of YAEL', minXp: 6000 },
] as const;

export function getLearnerRank(value: number) {
  const xp = Number.isFinite(value) ? Math.max(0, value) : 0;
  let index = 0;
  while (index + 1 < LEARNER_RANKS.length && xp >= LEARNER_RANKS[index + 1].minXp) index++;
  const rank = LEARNER_RANKS[index];
  const nextRank = LEARNER_RANKS[index + 1] ?? null;
  return {
    rank,
    nextRank,
    remainingXp: nextRank ? Math.max(0, nextRank.minXp - xp) : 0,
    progress: nextRank ? Math.min(1, (xp - rank.minXp) / (nextRank.minXp - rank.minXp)) : 1,
  };
}
