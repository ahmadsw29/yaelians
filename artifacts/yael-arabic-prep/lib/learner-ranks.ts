// At 10 XP per correct answer, 27–57 correct answers/day reach Master in ~22–45 days.
// These are progression targets, not calendar locks; earned XP is never reset.
export const SEMI_MASTER_XP = 8000;
export const MASTER_XP = 12000;
export const LEARNER_RANKS = [
  { id: 'rookie', title: 'Rookie', minXp: 0 },
  { id: 'beginner', title: 'Beginner', minXp: 500 },
  { id: 'amateur', title: 'Amateur', minXp: 2000 },
  { id: 'real-student', title: 'Real Student', minXp: 4500 },
  { id: 'semi-master', title: 'Semi-Master', minXp: SEMI_MASTER_XP },
  { id: 'master', title: 'Master of YAEL', minXp: MASTER_XP },
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
