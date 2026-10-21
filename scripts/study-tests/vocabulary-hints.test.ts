import { describe, expect, test } from 'vitest';
import { vocabularyHintExclusions } from '../../artifacts/yael-arabic-prep/lib/vocabulary-hints';
import { emptyVocabularyReview, recordVocabularyReview, validVocabularyReview, vocabularyReviewOrder } from '../../artifacts/yael-arabic-prep/lib/vocabulary-review';
import { emptyFlashcardMemory, rateFlashcard, selectFlashcards } from '../../artifacts/yael-arabic-prep/lib/flashcards';
import { VOCABULARY_BANK } from '../../artifacts/yael-arabic-prep/lib/vocabulary-bank';
import { loadVocabularyReview, reserveVocabularyReviewRound, saveVocabularyReviewAnswer } from '../../artifacts/yael-arabic-prep/lib/vocabulary-deck';

describe('vocabulary hints', () => {
  test('keeps the correct answer and one distractor in every actual bank question', () => {
    for (const question of VOCABULARY_BANK) {
      const original = [...question.options];
      const excluded = vocabularyHintExclusions(question.options, question.correctAnswer, question.word ?? '');
      expect(excluded).toHaveLength(2);
      expect(new Set(excluded).size).toBe(2);
      expect(excluded).not.toContain(question.correctAnswer);
      expect(question.options.filter(option => !excluded.includes(option))).toHaveLength(2);
      expect(question.options).toEqual(original);
    }
  });
  test('is deterministic within a question and fails safely for malformed choices', () => {
    const options = ['a', 'b', 'c', 'd'];
    expect(vocabularyHintExclusions(options, 'a', 'word-1')).toEqual(vocabularyHintExclusions(options, 'a', 'word-1'));
    expect(vocabularyHintExclusions(options, 'absent', 'word')).toEqual([]);
    expect(vocabularyHintExclusions(['a', 'a', 'b', 'c'], 'a', 'word')).toEqual([]);
    expect(vocabularyHintExclusions(['a', 'b'], 'a', 'word')).toEqual([]);
  });
  test('assisted success is correct, but not an independent streak and is due next round', () => {
    const memory = { ...emptyVocabularyReview(), roundNumber: 1 };
    const next = recordVocabularyReview(memory, 'שלום', 1, true, 100, true);
    expect(next.items['שלום']).toMatchObject({ attempts: 1, wrong: 0, streak: 0, dueRound: 2, lastCorrect: true, lastAssisted: true });
    expect(validVocabularyReview(next)).toBe(true);
    expect(recordVocabularyReview(next, 'שלום', 1, true, 200, false)).toBe(next);
    const independent = recordVocabularyReview({ ...next, roundNumber: 2 }, 'שלום', 2, true, 200);
    expect(independent.items['שלום']).toMatchObject({ streak: 1, dueRound: 4, lastAssisted: false });
  });
  test('assisted words return in vocabulary and flashcards without erasing past wrong answers', () => {
    const words = Array.from({ length: 80 }, (_, i) => `hint-${i}`);
    let memory = recordVocabularyReview({ ...emptyVocabularyReview(), roundNumber: 1 }, words[0], 1, false, 0);
    memory = recordVocabularyReview({ ...memory, roundNumber: 2 }, words[0], 2, true, 100, true);
    expect(memory.items[words[0]].wrong).toBe(1);
    expect(vocabularyReviewOrder(words, 'learner', 3, memory)).toContain(0);
    const cards = rateFlashcard(emptyFlashcardMemory(), words[0], 'easy', 0);
    expect(selectFlashcards(words, 'learner', cards, 100, 20, memory)[0]).toBe(words[0]);
    expect(validVocabularyReview({ ...memory, items: { [words[0]]: { ...memory.items[words[0]], lastAssisted: 'yes' } } })).toBe(false);
  });
  test('storage preserves assistance per learner without creating extra quiz answers', async () => {
    const { number } = await reserveVocabularyReviewRound('hint-learner', ['שלום']);
    await saveVocabularyReviewAnswer('hint-learner', 'שלום', number, true, true);
    expect((await loadVocabularyReview('hint-learner')).items['שלום']).toMatchObject({ attempts: 1, lastAssisted: true, streak: 0 });
    expect((await loadVocabularyReview('another-hint-learner')).items).toEqual({});
  });
});
