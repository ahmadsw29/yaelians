import { vocabularyDeckOrder, VOCABULARY_ROUND_SIZE } from './vocabulary-selection';
import type { FlashcardMemory } from './flashcards';

export type VocabularyReviewItem = {
  attempts: number; wrong: number; streak: number; lastRound: number; dueRound: number; lastCorrect: boolean;
  answeredAt?: number;
};
export type VocabularyReviewMemory = {
  version: 1; roundNumber: number; items: Record<string, VocabularyReviewItem>;
};
export function emptyVocabularyReview(): VocabularyReviewMemory {
  return { version: 1, roundNumber: 0, items: {} };
}
/** Prioritize mistakes and unseen words; successful words get exponentially longer review gaps. */
export function vocabularyReviewOrder(words: string[], userId: string, round: number, memory: VocabularyReviewMemory, flashcards?: FlashcardMemory) {
  const deck = vocabularyDeckOrder(words.length, userId);
  const offset = ((round - 1) * VOCABULARY_ROUND_SIZE) % Math.max(1, deck.length);
  const rotated = [...deck.slice(offset), ...deck.slice(0, offset)];
  const target = Math.min(words.length, VOCABULARY_ROUND_SIZE);
  const selected: number[] = [];
  const item = (index: number) => memory.items[words[index]];
  const take = (indices: number[], count: number) => {
    for (const index of indices) {
      if (count <= 0 || selected.length >= target) break;
      if (!selected.includes(index)) { selected.push(index); count--; }
    }
  };
  const due = rotated.filter(index => item(index)?.dueRound <= round);
  const mistakes = due.filter(index => !item(index).lastCorrect)
    .sort((a, b) => item(a).dueRound - item(b).dueRound || item(b).wrong - item(a).wrong);
  const reviews = due.filter(index => item(index).lastCorrect)
    .sort((a, b) => item(a).dueRound - item(b).dueRound);
  const forgotten = rotated.filter(index => {
    const card = flashcards?.cards[words[index]];
    return card?.lastRating === 'forgot' && card.lastReviewedAt !== undefined
      && card.lastReviewedAt > (item(index)?.answeredAt ?? -1);
  }).sort((a, b) => flashcards!.cards[words[b]].lastReviewedAt! - flashcards!.cards[words[a]].lastReviewedAt!);
  const unseen = rotated.filter(index => !item(index));
  const freshSlots = Math.min(unseen.length, Math.ceil(target * 0.3));
  const reviewBudget = target - freshSlots;
  take(mistakes, Math.min(Math.ceil(target / 2), reviewBudget));
  take(forgotten, Math.min(Math.ceil(target / 5), reviewBudget - selected.length));
  take(reviews, Math.min(Math.floor(target / 5), reviewBudget - selected.length));
  take(unseen, target - selected.length);
  take(mistakes, target - selected.length);
  take(reviews, target - selected.length);
  // When the whole finite bank is familiar, use the oldest nearest reviews, never consecutive duplicates.
  const upcoming = rotated.filter(index => item(index)).sort((a, b) =>
    item(a).lastRound - item(b).lastRound || item(a).dueRound - item(b).dueRound);
  take(upcoming, target - selected.length);
  // Mix review and new cards instead of presenting a block of mistakes.
  return [...selected].sort((a, b) => rotated.indexOf(a) - rotated.indexOf(b));
}
export function recordVocabularyReview(
  memory: VocabularyReviewMemory, word: string, round: number, correct: boolean, now = Date.now(),
): VocabularyReviewMemory {
  if (!word || !Number.isSafeInteger(round) || round < 1 || round > memory.roundNumber || !Number.isFinite(now) || now < 0) throw new Error('Invalid vocabulary answer');
  const previous = memory.items[word];
  if (previous && previous.lastRound >= round) return memory;
  const streak = correct ? (previous?.streak ?? 0) + 1 : 0;
  const interval = correct ? Math.min(16, 2 ** Math.min(4, streak)) : 1;
  return {
    ...memory,
    items: {
      ...memory.items,
      [word]: {
        attempts: (previous?.attempts ?? 0) + 1, wrong: (previous?.wrong ?? 0) + (correct ? 0 : 1),
        streak, lastRound: round, dueRound: memory.roundNumber + interval, lastCorrect: correct, answeredAt: now,
      },
    },
  };
}
export function validVocabularyReview(value: unknown): value is VocabularyReviewMemory {
  if (!value || typeof value !== 'object') return false;
  const v = value as VocabularyReviewMemory;
  if (v.version !== 1 || !Number.isSafeInteger(v.roundNumber) || v.roundNumber < 0
    || !v.items || typeof v.items !== 'object' || Array.isArray(v.items)) return false;
  return Object.values(v.items).every(item => item && typeof item === 'object'
    && ['attempts', 'wrong', 'streak', 'lastRound', 'dueRound'].every(field =>
      Number.isSafeInteger(item[field as keyof VocabularyReviewItem]) && Number(item[field as keyof VocabularyReviewItem]) >= 0)
    && item.attempts > 0 && item.wrong <= item.attempts && item.streak <= item.attempts
    && (item.answeredAt === undefined || (Number.isFinite(item.answeredAt) && item.answeredAt >= 0))
    && item.lastRound <= v.roundNumber && item.dueRound > item.lastRound && typeof item.lastCorrect === 'boolean');
}
