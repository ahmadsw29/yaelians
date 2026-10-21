import { vocabularyDeckOrder } from './vocabulary-selection';

export type FlashcardRating = 'forgot' | 'difficult' | 'easy';
export type FlashcardReview = {
  dueAt: number;
  intervalDays: number;
  reviews: number;
  lastRating: FlashcardRating;
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
    && ['forgot', 'difficult', 'easy'].includes(review.lastRating));
}

/** Due reviews come first; unseen words use a stable, learner-specific shuffle.
 * Never pull future reviews forward just to fill a round.
 */
export function selectFlashcards(words: string[], userId: string, memory: FlashcardMemory, now: number, limit = 20): string[] {
  const order = vocabularyDeckOrder(words.length, userId).map(index => words[index]);
  const due = order.filter(word => memory.cards[word]?.dueAt <= now)
    .sort((a, b) => memory.cards[a].dueAt - memory.cards[b].dueAt);
  const unseen = order.filter(word => !Object.hasOwn(memory.cards, word));
  return [...due, ...unseen].slice(0, limit);
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
      },
    },
  };
}
