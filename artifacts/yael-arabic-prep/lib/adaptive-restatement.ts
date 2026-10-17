import { SEMI_MASTER_XP } from './learner-ranks';

export type AdaptiveReason = 'new' | 'retry' | 'review';
export type AdaptiveItem = {
  attempts: number; wrong: number; streak: number; lastRound: number;
  dueRound: number; lastCorrect: boolean;
};
export type AdaptiveRound = {
  id: string; number: number; questionIds: string[]; reasons: Record<string, AdaptiveReason>;
  answers: Record<string, number>; index: number; startedAt: number; deadline: number; finished: boolean;
};
export type AdaptiveMemory = {
  version: 1; roundNumber: number; items: Record<string, AdaptiveItem>; active: AdaptiveRound | null;
};
export const ADAPTIVE_ROUND_MS = 390_000;
export const SEMI_MASTER_ROUND_MS = 360_000;
export function adaptiveRoundDuration(xp: number): number {
  return Number.isFinite(xp) && xp >= SEMI_MASTER_XP ? SEMI_MASTER_ROUND_MS : ADAPTIVE_ROUND_MS;
}
export function emptyAdaptiveMemory(): AdaptiveMemory {
  return { version: 1, roundNumber: 0, items: {}, active: null };
}
function shuffled<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.min(index, Math.max(0, Math.floor(rng() * (index + 1))));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/** Mix due mistakes, spaced successful reviews, and new material without same-round duplicates. */
export function planAdaptiveRound(
  memory: AdaptiveMemory, pool: Array<{ id: string }>, roundId: string,
  now = Date.now(), rng: () => number = Math.random, xp = 0,
): AdaptiveMemory {
  if (memory.active && !memory.active.finished) return memory;
  const unique = [...new Map(pool.map(question => [question.id, question])).values()];
  if (!unique.length) throw new Error('No eligible restatement questions');
  const number = memory.roundNumber + 1;
  const target = Math.min(6, unique.length);
  const unseen = shuffled(unique.filter(q => !memory.items[q.id]), rng);
  const due = unique.filter(q => memory.items[q.id]?.dueRound <= number);
  const mistakes = shuffled(due.filter(q => !memory.items[q.id].lastCorrect), rng)
    .sort((a, b) => memory.items[a.id].dueRound - memory.items[b.id].dueRound
      || memory.items[b.id].wrong - memory.items[a.id].wrong);
  const reviews = shuffled(due.filter(q => memory.items[q.id].lastCorrect), rng)
    .sort((a, b) => memory.items[a.id].dueRound - memory.items[b.id].dueRound);
  const selected: Array<{ id: string }> = [];
  const take = (items: Array<{ id: string }>, amount: number) => {
    for (const item of items) {
      if (amount <= 0 || selected.length >= target) break;
      if (!selected.some(q => q.id === item.id)) { selected.push(item); amount--; }
    }
  };
  take(mistakes, Math.ceil(target * 0.5));
  take(reviews, Math.max(1, Math.floor(target * 0.2)));
  take(unseen, target - selected.length);
  take(mistakes, target - selected.length);
  take(reviews, target - selected.length);
  // Fill short rounds with the nearest upcoming reviews, never duplicate a question.
  if (selected.length < target) {
    const upcoming = shuffled(unique.filter(q => memory.items[q.id]), rng)
      .sort((a, b) => memory.items[a.id].dueRound - memory.items[b.id].dueRound);
    take(upcoming, target - selected.length);
  }
  const questions = shuffled(selected, rng);
  const reasons = Object.fromEntries(questions.map(q => [
    q.id, !memory.items[q.id] ? 'new' : memory.items[q.id].lastCorrect ? 'review' : 'retry',
  ])) as Record<string, AdaptiveReason>;
  return {
    ...memory, roundNumber: number,
    active: {
      id: roundId, number, questionIds: questions.map(q => q.id), reasons,
      answers: {}, index: 0, startedAt: now, deadline: now + adaptiveRoundDuration(xp), finished: false,
    },
  };
}

export function recordAdaptiveAnswer(
  memory: AdaptiveMemory, questionId: string, selected: number, correctIndex: number, now = Date.now(),
): AdaptiveMemory {
  const round = memory.active;
  if (!round || round.finished || round.questionIds[round.index] !== questionId
    || Object.hasOwn(round.answers, questionId)) return memory;
  if (now >= round.deadline) return finishAdaptiveRound(memory);
  if (!Number.isSafeInteger(selected) || selected < 0 || selected > 3
    || !Number.isSafeInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    throw new Error('Invalid answer');
  }
  const previous = memory.items[questionId];
  const correct = selected === correctIndex;
  const streak = correct ? (previous?.streak ?? 0) + 1 : 0;
  const interval = correct ? Math.min(16, 2 ** Math.min(4, streak)) : 1;
  return {
    ...memory,
    items: {
      ...memory.items,
      [questionId]: {
        attempts: (previous?.attempts ?? 0) + 1, wrong: (previous?.wrong ?? 0) + (correct ? 0 : 1),
        streak, lastRound: round.number, dueRound: round.number + interval, lastCorrect: correct,
      },
    },
    active: { ...round, answers: { ...round.answers, [questionId]: selected } },
  };
}
export function advanceAdaptiveQuestion(memory: AdaptiveMemory, now = Date.now()): AdaptiveMemory {
  const round = memory.active;
  if (!round || round.finished) return memory;
  if (now >= round.deadline) return finishAdaptiveRound(memory);
  return {
    ...memory,
    active: round.index + 1 >= round.questionIds.length
      ? { ...round, finished: true }
      : { ...round, index: round.index + 1 },
  };
}
export function finishAdaptiveRound(memory: AdaptiveMemory): AdaptiveMemory {
  return memory.active ? { ...memory, active: { ...memory.active, finished: true } } : memory;
}
export function adaptiveReasonTip(reason: AdaptiveReason): string {
  return reason === 'retry' ? 'فرصة تثبيت: هذا سؤال أخطأت فيه سابقًا.'
    : reason === 'review' ? 'مراجعة متباعدة: خلّينا نتأكد إن المعنى ثبت.'
      : 'معنى جديد: ركّز على الفكرة، مش تشابه الكلمات فقط.';
}
