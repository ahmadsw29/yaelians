// At 10 XP per correct answer, 27–57 correct answers/day reach Master in ~43–89 days.
// These are progression targets, not calendar locks; earned XP is never reset.
export const SEMI_MASTER_XP = 16000;
export const MASTER_XP = 24000;
export const LEARNER_RANKS = [
  { id: 'rookie', title: 'Rookie', minXp: 0 },
  { id: 'beginner', title: 'Beginner', minXp: 1000 },
  { id: 'amateur', title: 'Amateur', minXp: 4000 },
  { id: 'real-student', title: 'Real Student', minXp: 9000 },
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

/** Suggestions only: rank never grants access or starts an exam clock. */
export function getRankTrainingRecommendation(value: number) {
  const { rank } = getLearnerRank(value);
  const amateur = LEARNER_RANKS.find(r => r.id === 'amateur')!;
  const realStudent = LEARNER_RANKS.find(r => r.id === 'real-student')!;
  if (rank.minXp < amateur.minXp) return null;
  if (rank.minXp < realStudent.minXp) return {
    kind: 'section' as const, href: '/source-session' as const,
    rankTitle: rank.title,
    title: 'جاهز لتحدّي 20 دقيقة؟',
    description: 'وصلت إلى Amateur! جرّب قسمًا كاملًا يجمَع مهاراتك.',
    timing: ['20 دقيقة'],
    detail: '22 سؤالًا متنوعًا، ثم نتيجتك ومراجعة إجاباتك عند إنهاء القسم.',
    buttonLabel: 'جرّب قسمًا كاملًا',
  };
  return {
    kind: 'full' as const, href: '/exam' as const,
    rankTitle: rank.title,
    title: 'جاهز لتجربة الامتحان كاملًا؟',
    description: 'من Real Student وما بعده، جرّب محاكاة كاملة بإيقاع الامتحان.',
    timing: ['3 × 20 دقيقة', '15 دقيقة كتابة', '75 دقيقة بالمجموع'],
    detail: '3 أقسام، ثم موضوع بالعبرية. بعد إنهاء المحاكاة تظهر نتيجتك لكل قسم والنتيجة الإجمالية؛ مسوّدة الكتابة للمراجعة دون علامة آلية.',
    buttonLabel: 'جرّب محاكاة كاملة',
  };
}
