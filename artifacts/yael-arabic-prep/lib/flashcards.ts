import { vocabularyDeckOrder } from './vocabulary-selection';
import type { VocabularyReviewMemory } from './vocabulary-review';

export type FlashcardRating = 'forgot' | 'difficult' | 'easy';
export type FlashcardReview = {
  dueAt: number;
  intervalDays: number;
  reviews: number;
  lastRating: FlashcardRating;
  lastReviewedAt?: number;
};
export type FlashcardMemory = { version: 1; cards: Record<string, FlashcardReview> };
export const emptyFlashcardMemory = (): FlashcardMemory => ({ version: 1, cards: {} });
const DAY = 86_400_000;

export function validFlashcardMemory(value: unknown): value is FlashcardMemory {
  if (!value || typeof value !== 'object') return false;
  const memory = value as FlashcardMemory;
  if (memory.version !== 1 || !memory.cards || typeof memory.cards !== 'object' || Array.isArray(memory.cards)) return false;
  return Object.entries(memory.cards).every(([word, review]) =>
    word.length > 0 && review !== null && typeof review === 'object'
    && Number.isFinite(review.dueAt) && review.dueAt >= 0
    && Number.isFinite(review.intervalDays) && review.intervalDays >= 0 && review.intervalDays <= 60
    && Number.isSafeInteger(review.reviews) && review.reviews > 0
    && (review.lastReviewedAt === undefined || (Number.isFinite(review.lastReviewedAt) && review.lastReviewedAt >= 0))
    && ['forgot', 'difficult', 'easy'].includes(review.lastRating));
}

/** Due reviews come first; unseen words use a stable, learner-specific shuffle.
 * Never pull future reviews forward just to fill a round.
 */
export function selectFlashcards(words: string[], userId: string, memory: FlashcardMemory, now: number, limit = 20, vocabulary?: VocabularyReviewMemory): string[] {
  const order = vocabularyDeckOrder(words.length, userId).map(index => words[index]);
  const schedule = (word: string) => {
    const card = memory.cards[word];
    const quiz = vocabulary?.items[word];
    // Only NEW evidence crosses modes. Old mistakes must not override a later review.
    const newerQuiz = quiz?.answeredAt !== undefined && quiz.answeredAt > (card?.lastReviewedAt ?? -1);
    if (newerQuiz && (!quiz.lastCorrect || quiz.lastAssisted)) return { dueAt: quiz.answeredAt!, mistake: true };
    if (newerQuiz && quiz.lastCorrect && quiz.streak >= 2) {
      const gap = Math.min(16, 2 ** Math.min(4, quiz.streak)) * DAY;
      return { dueAt: Math.max(card?.dueAt ?? 0, quiz.answeredAt! + gap), mistake: false };
    }
    return { dueAt: card?.dueAt ?? null, mistake: false };
  };
  const schedules = new Map(order.map(word => [word, schedule(word)]));
  const due = order.filter(word => schedules.get(word)!.dueAt !== null && schedules.get(word)!.dueAt! <= now)
    .sort((a, b) => Number(schedules.get(b)!.mistake) - Number(schedules.get(a)!.mistake)
      || schedules.get(a)!.dueAt! - schedules.get(b)!.dueAt!);
  const unseen = order.filter(word => schedules.get(word)!.dueAt === null);
  // Keep a fresh-word share when possible, rather than making one mode a copy of the other.
  const freshSlots = Math.min(unseen.length, Math.ceil(limit * 0.3));
  const reviews = due.slice(0, Math.max(0, limit - freshSlots));
  const fresh = unseen.slice(0, limit - reviews.length);
  return [...reviews, ...fresh, ...due.slice(reviews.length)].slice(0, limit);
}

export function rateFlashcard(memory: FlashcardMemory, word: string, rating: FlashcardRating, now: number): FlashcardMemory {
  if (!word || !['forgot', 'difficult', 'easy'].includes(rating) || !Number.isFinite(now) || now < 0) {
    throw new Error('Invalid flashcard review');
  }
  const previous = memory.cards[word];
  const intervalDays = rating === 'forgot' ? 0 : rating === 'difficult' ? 1
    : Math.min(60, Math.max(3, Math.round((previous?.intervalDays ?? 0) * 2.3)));
  return {
    version: 1,
    cards: {
      ...memory.cards,
      [word]: {
        dueAt: now + (rating === 'forgot' ? 10 * 60_000 : intervalDays * DAY),
        intervalDays,
        reviews: (previous?.reviews ?? 0) + 1,
        lastRating: rating,
        lastReviewedAt: now,
      },
    },
  };
}
