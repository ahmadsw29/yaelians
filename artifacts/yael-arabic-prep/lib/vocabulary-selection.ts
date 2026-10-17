export const VOCABULARY_ROUND_SIZE = 20;
export const FREE_VOCABULARY_SECONDS = 300;

function hash(value: string) {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
}

export function vocabularyDeckOrder(size: number, userId: string) {
  if (size <= 0) return [];
  const order = Array.from({ length: size }, (_, index) => index);
  let state = hash(userId) || 1;
  for (let i = size - 1; i > 0; i--) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    const j = (state >>> 0) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** A user-specific shuffled deck, consumed in consecutive batches before reuse. */
export function vocabularyRoundOrder(size: number, userId: string, round: number) {
  const order = vocabularyDeckOrder(size, userId);
  if (!order.length) return [];
  const offset = (Math.max(1, round) - 1) * Math.min(size, VOCABULARY_ROUND_SIZE);
  return Array.from({ length: Math.min(size, VOCABULARY_ROUND_SIZE) }, (_, index) => order[(offset + index) % size]);
}

export function vocabularySecondsLeft(deadline: number, now: number) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function formatVocabularyTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
