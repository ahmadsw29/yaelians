import AsyncStorage from '@react-native-async-storage/async-storage';
import { vocabularyRoundOrder } from './vocabulary-selection';
import { emptyVocabularyReview, recordVocabularyReview, validVocabularyReview, vocabularyReviewOrder } from './vocabulary-review';
import type { VocabularyReviewMemory } from './vocabulary-review';

let pending: Promise<unknown> = Promise.resolve();
export function reserveVocabularyRound(userId: string, size: number, serverRound?: number) {
  const reservation = pending.catch(() => undefined).then(async () => {
    const key = `yael-vocabulary-deck-v1:${userId}`;
    const raw = await AsyncStorage.getItem(key);
    const previous = raw === null ? 0 : Number(raw);
    if (!Number.isSafeInteger(previous) || previous < 0) throw new Error('Invalid vocabulary history');
    const next = Math.max(previous + 1, serverRound ?? 1);
    await AsyncStorage.setItem(key, String(next));
    return vocabularyRoundOrder(size, userId, next);
  });
  pending = reservation;
  return reservation;
}

const reviewKey = (userId: string) => `yael-vocabulary-review-v1:${userId}`;
async function readReview(userId: string): Promise<VocabularyReviewMemory> {
  const raw = await AsyncStorage.getItem(reviewKey(userId));
  if (raw === null) return emptyVocabularyReview();
  const parsed: unknown = JSON.parse(raw);
  if (!validVocabularyReview(parsed)) throw new Error('Invalid vocabulary review history');
  return parsed;
}
export function reserveVocabularyReviewRound(userId: string, words: string[], serverRound?: number) {
  const reservation = pending.catch(() => undefined).then(async () => {
    const memory = await readReview(userId);
    const legacy = await AsyncStorage.getItem(`yael-vocabulary-deck-v1:${userId}`);
    const previous = legacy === null ? 0 : Number(legacy);
    if (!Number.isSafeInteger(previous) || previous < 0) throw new Error('Invalid vocabulary history');
    const number = Math.max(memory.roundNumber + 1, previous + 1, serverRound ?? 1);
    const order = vocabularyReviewOrder(words, userId, number, memory);
    await AsyncStorage.setItem(reviewKey(userId), JSON.stringify({ ...memory, roundNumber: number }));
    return { order, number };
  });
  pending = reservation;
  return reservation;
}
export function saveVocabularyReviewAnswer(userId: string, word: string, round: number, correct: boolean) {
  const write = pending.catch(() => undefined).then(async () => {
    const memory = await readReview(userId);
    const next = recordVocabularyReview(memory, word, round, correct);
    if (next !== memory) await AsyncStorage.setItem(reviewKey(userId), JSON.stringify(next));
  });
  pending = write;
  return write;
}
