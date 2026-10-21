import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyFlashcardMemory, rateFlashcard, validFlashcardMemory, type FlashcardMemory, type FlashcardRating } from './flashcards';

let pending: Promise<unknown> = Promise.resolve();
const keyFor = (userId: string) => {
  if (!userId) throw new Error('A signed-in learner is required');
  return `yael-flashcards-v1:${userId}`;
};

export async function loadFlashcardMemory(userId: string): Promise<FlashcardMemory> {
  const raw = await AsyncStorage.getItem(keyFor(userId));
  if (raw === null) return emptyFlashcardMemory();
  const value: unknown = JSON.parse(raw);
  // Keep the original data untouched on corruption; never reset silently.
  if (!validFlashcardMemory(value)) throw new Error('Invalid saved flashcard reviews');
  return value;
}

export function saveFlashcardRating(userId: string, word: string, rating: FlashcardRating, now = Date.now()) {
  const write = pending.catch(() => undefined).then(async () => {
    const memory = await loadFlashcardMemory(userId);
    const next = rateFlashcard(memory, word, rating, now);
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
    return next;
  });
  pending = write;
  return write;
}
