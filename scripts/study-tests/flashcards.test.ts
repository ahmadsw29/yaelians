import { describe, expect, test } from 'vitest';
import { emptyFlashcardMemory, rateFlashcard, selectFlashcards, validFlashcardMemory } from '../../artifacts/yael-arabic-prep/lib/flashcards';
import { loadFlashcardMemory, saveFlashcardRating } from '../../artifacts/yael-arabic-prep/lib/flashcard-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountStorageKeys } from '../../artifacts/yael-arabic-prep/lib/deletionStorage';

describe('flashcard review scheduling', () => {
  const words = Array.from({ length: 40 }, (_, i) => `word-${i}`);
  test('selects distinct learner-shuffled unseen words', () => {
    const first = selectFlashcards(words, 'learner-a', emptyFlashcardMemory(), 0);
    expect(first).toHaveLength(20);
    expect(new Set(first).size).toBe(20);
    expect(selectFlashcards(words, 'learner-a', emptyFlashcardMemory(), 0)).toEqual(first);
    expect(selectFlashcards(words, 'learner-b', emptyFlashcardMemory(), 0)).not.toEqual(first);
  });
  test('forgotten words return sooner, while easy reviews become spaced out', () => {
    const initial = emptyFlashcardMemory();
    const forgot = rateFlashcard(initial, 'a', 'forgot', 0);
    const difficult = rateFlashcard(initial, 'a', 'difficult', 0);
    const easy = rateFlashcard(initial, 'a', 'easy', 0);
    expect(forgot.cards.a.dueAt).toBe(600_000);
    expect(difficult.cards.a.dueAt).toBe(86_400_000);
    expect(easy.cards.a.dueAt).toBe(3 * 86_400_000);
    expect(rateFlashcard(easy, 'a', 'easy', 1).cards.a.intervalDays).toBeGreaterThan(3);
    expect(initial.cards).toEqual({});
  });
  test('prioritizes due cards without repeating future cards to fill a round', () => {
    const memory = rateFlashcard(emptyFlashcardMemory(), 'word-0', 'forgot', 0);
    expect(selectFlashcards(words, 'a', memory, 600_000)[0]).toBe('word-0');
    expect(selectFlashcards(['word-0'], 'a', memory, 1)).toEqual([]);
    expect(selectFlashcards([], 'a', memory, 1)).toEqual([]);
  });
  test('rejects corrupt history and invalid answers', () => {
    expect(validFlashcardMemory(emptyFlashcardMemory())).toBe(true);
    expect(validFlashcardMemory({ version: 1, cards: { a: null } })).toBe(false);
    expect(validFlashcardMemory({ version: 2, cards: {} })).toBe(false);
    expect(validFlashcardMemory({ version: 1, cards: [] })).toBe(false);
    expect(() => rateFlashcard(emptyFlashcardMemory(), '', 'easy', 0)).toThrow();
  });
  test('persists ratings per account and serializes rapid writes', async () => {
    await Promise.all([
      saveFlashcardRating('flashcard-test-a', 'שלום', 'forgot', 0),
      saveFlashcardRating('flashcard-test-a', 'שלום', 'easy', 1),
    ]);
    expect((await loadFlashcardMemory('flashcard-test-a')).cards['שלום'].reviews).toBe(2);
    expect((await loadFlashcardMemory('flashcard-test-b')).cards).toEqual({});
  });
  test('leaves damaged history untouched and supports retry after write failure', async () => {
    const key = 'yael-flashcards-v1:damaged-flashcards';
    await AsyncStorage.setItem(key, 'damaged-original');
    await expect(saveFlashcardRating('damaged-flashcards', 'שלום', 'easy', 0)).rejects.toThrow();
    expect(await AsyncStorage.getItem(key)).toBe('damaged-original');
    await expect(saveFlashcardRating('healthy-flashcards', 'שלום', 'easy', 0)).resolves.toMatchObject({ version: 1 });
  });
  test('includes flashcard reviews in only the deleted account device cleanup', async () => {
    const keys = await accountStorageKeys({ getAllKeys: async () => [
      'yael-flashcards-v1:deleted', 'yael-flashcards-v1:other',
    ] }, 'deleted');
    expect(keys).toContain('yael-flashcards-v1:deleted');
    expect(keys).not.toContain('yael-flashcards-v1:other');
  });
});
