import { describe, expect, test, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyFlashcardMemory, rateFlashcard, selectFlashcards, validFlashcardMemory } from '../../artifacts/yael-arabic-prep/lib/flashcards';
import { emptyVocabularyReview, recordVocabularyReview, validVocabularyReview, vocabularyReviewOrder } from '../../artifacts/yael-arabic-prep/lib/vocabulary-review';
import { loadVocabularyReview, reserveVocabularyReviewRound, saveVocabularyReviewAnswer } from '../../artifacts/yael-arabic-prep/lib/vocabulary-deck';
import { loadFlashcardMemory, saveFlashcardRating } from '../../artifacts/yael-arabic-prep/lib/flashcard-storage';
import { loadTranslatorVisibility, saveTranslatorVisibility, translatorVisibilityKey } from '../../artifacts/yael-arabic-prep/lib/translator-visibility';
import { accountStorageKeys } from '../../artifacts/yael-arabic-prep/lib/deletionStorage';

const DAY = 86_400_000;
const words = Array.from({ length: 100 }, (_, i) => `bridge-${i}`);
const quizAnswer = (correct: boolean, at: number) =>
  recordVocabularyReview({ ...emptyVocabularyReview(), roundNumber: 1 }, words[0], 1, correct, at);

describe('partial flashcard and vocabulary connection', () => {
  test('a new quiz mistake brings even a future flashcard forward, without mutating either history', () => {
    const cards = rateFlashcard(emptyFlashcardMemory(), words[0], 'easy', 0);
    const quiz = quizAnswer(false, 100);
    const before = JSON.stringify({ cards, quiz });
    expect(selectFlashcards(words, 'learner', cards, 100, 20, quiz)[0]).toBe(words[0]);
    expect(JSON.stringify({ cards, quiz })).toBe(before);
    const rerated = rateFlashcard(cards, words[0], 'easy', 101);
    expect(selectFlashcards([words[0]], 'learner', rerated, 102, 20, quiz)).toEqual([]);
  });
  test('repeated correct quiz answers delay flashcards; one correct answer alone does not', () => {
    const one = quizAnswer(true, 0);
    expect(selectFlashcards([words[0]], 'learner', emptyFlashcardMemory(), 1, 20, one)).toEqual([words[0]]);
    const two = recordVocabularyReview({ ...one, roundNumber: 3 }, words[0], 3, true, 100);
    expect(selectFlashcards([words[0]], 'learner', emptyFlashcardMemory(), 101, 20, two)).toEqual([]);
    expect(selectFlashcards([words[0]], 'learner', emptyFlashcardMemory(), 100 + 4 * DAY, 20, two)).toEqual([words[0]]);
    const forgot = rateFlashcard(emptyFlashcardMemory(), words[0], 'forgot', 200);
    expect(selectFlashcards([words[0]], 'learner', forgot, 600_200, 20, two)).toEqual([words[0]]);
  });
  test('forgotten flashcards re-enter a later quiz and stop overriding newer quiz evidence', () => {
    const quiz = quizAnswer(true, 0);
    const cards = rateFlashcard(emptyFlashcardMemory(), words[0], 'forgot', 100);
    expect(vocabularyReviewOrder(words, 'learner', 2, quiz, cards)).toContain(0);
    const passed = recordVocabularyReview({ ...quiz, roundNumber: 2 }, words[0], 2, true, 200);
    expect(vocabularyReviewOrder(words, 'learner', 3, passed, cards)).not.toContain(0);
  });
  test('Easy and Difficult never manufacture a quiz answer, streak, XP or mastery', () => {
    const quiz = emptyVocabularyReview();
    const before = JSON.stringify(quiz);
    for (const rating of ['easy', 'difficult'] as const) {
      const cards = rateFlashcard(emptyFlashcardMemory(), words[0], rating, 0);
      vocabularyReviewOrder(words, 'learner', 1, quiz, cards);
      expect(JSON.stringify(quiz)).toBe(before);
      expect(cards).not.toHaveProperty('xp');
      expect(cards).not.toHaveProperty('masteredWordIds');
    }
  });
  test('keeps fresh words in both modes even with many linked mistakes, with no duplicates', () => {
    let quiz = { ...emptyVocabularyReview(), roundNumber: 1 };
    let cards = emptyFlashcardMemory();
    for (const word of words.slice(0, 40)) {
      quiz = recordVocabularyReview(quiz, word, 1, false, 0);
      cards = rateFlashcard(cards, word, 'forgot', 1);
    }
    const flash = selectFlashcards(words, 'learner', cards, 600_001, 20, quiz);
    const vocabulary = vocabularyReviewOrder(words, 'learner', 2, quiz, cards);
    expect(flash).toHaveLength(20);
    expect(vocabulary).toHaveLength(20);
    expect(new Set(flash).size).toBe(20);
    expect(new Set(vocabulary).size).toBe(20);
    expect(flash.filter(word => !cards.cards[word]).length).toBeGreaterThanOrEqual(6);
    expect(vocabulary.filter(i => !quiz.items[words[i]]).length).toBeGreaterThanOrEqual(6);
  });
  test('existing histories without timestamps remain valid and are not rewritten as mastery', () => {
    const cards = rateFlashcard(emptyFlashcardMemory(), words[0], 'easy', 0);
    delete cards.cards[words[0]].lastReviewedAt;
    const quiz = quizAnswer(false, 0);
    delete quiz.items[words[0]].answeredAt;
    expect(validFlashcardMemory(cards)).toBe(true);
    expect(validVocabularyReview(quiz)).toBe(true);
    expect(selectFlashcards([words[0]], 'learner', cards, 1, 20, quiz)).toEqual([]);
    expect(validVocabularyReview({ ...quiz, items: { ...quiz.items, bad: { ...quiz.items[words[0]], answeredAt: -1 } } })).toBe(false);
  });
  test('the actual storage-backed quiz reservation reads only the current learner flashcard hints', async () => {
    const first = await reserveVocabularyReviewRound('bridge-account-a', words);
    const missedIndex = words.findIndex((_, i) => !first.order.includes(i));
    await saveFlashcardRating('bridge-account-a', words[missedIndex], 'forgot', 100);
    const next = await reserveVocabularyReviewRound('bridge-account-a', words);
    expect(next.order).toContain(missedIndex);
    expect((await loadVocabularyReview('bridge-account-a')).items).toEqual({});
    expect((await loadFlashcardMemory('bridge-account-b')).cards).toEqual({});
    await saveVocabularyReviewAnswer('bridge-account-a', words[missedIndex], next.number, false);
    const quiz = await loadVocabularyReview('bridge-account-a');
    expect(selectFlashcards(words, 'bridge-account-a', await loadFlashcardMemory('bridge-account-a'), Date.now(), 20, quiz)[0]).toBe(words[missedIndex]);
    expect((await loadVocabularyReview('bridge-account-b')).items).toEqual({});
  });
});

describe('translator visibility preference', () => {
  test('persists hide and restore in tap order without crossing accounts', async () => {
    expect(await loadTranslatorVisibility('visibility-new')).toBe('visible');
    await Promise.all([
      saveTranslatorVisibility('visibility-a', 'hidden'),
      saveTranslatorVisibility('visibility-a', 'visible'),
      saveTranslatorVisibility('visibility-a', 'hidden'),
    ]);
    expect(await loadTranslatorVisibility('visibility-a')).toBe('hidden');
    expect(await loadTranslatorVisibility('visibility-b')).toBe('visible');
    await saveTranslatorVisibility('visibility-a', 'visible');
    expect(await loadTranslatorVisibility('visibility-a')).toBe('visible');
  });
  test('reports storage failures and keeps a damaged preference untouched', async () => {
    const key = translatorVisibilityKey('visibility-damaged');
    await AsyncStorage.setItem(key, 'original-damaged');
    await expect(loadTranslatorVisibility('visibility-damaged')).rejects.toThrow();
    expect(await AsyncStorage.getItem(key)).toBe('original-damaged');
    const spy = vi.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await expect(saveTranslatorVisibility('visibility-fail', 'hidden')).rejects.toThrow('disk full');
    await expect(saveTranslatorVisibility('visibility-fail', 'visible')).resolves.toBeUndefined();
    spy.mockRestore();
    await expect(loadTranslatorVisibility('')).rejects.toThrow();
  });
  test('account cleanup includes only that learner preference and linked review histories', async () => {
    const keys = await accountStorageKeys({ getAllKeys: async () => [] }, 'visibility-a');
    expect(keys).toContain(translatorVisibilityKey('visibility-a'));
    expect(keys).toContain('yael-vocabulary-review-v1:visibility-a');
    expect(keys).not.toContain(translatorVisibilityKey('visibility-b'));
  });
});
