import { expect, test } from 'vitest';
import {
  emptyVocabularyReview, recordVocabularyReview, vocabularyReviewOrder,
} from '../../artifacts/yael-arabic-prep/lib/vocabulary-review';

test('mistakes return next round, correct words yield to unseen words, and repeated answers are idempotent', () => {
  const words = Array.from({ length: 66 }, (_, index) => `word-${index}`);
  let memory = { ...emptyVocabularyReview(), roundNumber: 1 };
  const first = vocabularyReviewOrder(words, 'learner', 1, memory);
  const wrong = words[first[0]];
  for (const index of first) memory = recordVocabularyReview(memory, words[index], 1, words[index] !== wrong);
  const unchanged = recordVocabularyReview(memory, wrong, 1, true);
  expect(unchanged).toBe(memory);
  memory = { ...memory, roundNumber: 2 };
  const second = vocabularyReviewOrder(words, 'learner', 2, memory);
  expect(second).toHaveLength(20);
  expect(new Set(second).size).toBe(20);
  expect(second.map(index => words[index])).toContain(wrong);
  expect(second.filter(index => first.includes(index))).toEqual([first[0]]);
  memory = recordVocabularyReview(memory, wrong, 2, true);
  expect(memory.items[wrong].dueRound).toBe(4);
  memory = { ...memory, roundNumber: 4 };
  memory = recordVocabularyReview(memory, wrong, 4, true);
  expect(memory.items[wrong].dueRound).toBe(8);
});

test('extra review never favors just-correct words over a full batch of older words', () => {
  const words = Array.from({ length: 66 }, (_, index) => `word-${index}`);
  const memory = { ...emptyVocabularyReview(), roundNumber: 10 };
  for (let index = 0; index < words.length; index++) {
    memory.items[words[index]] = {
      attempts: 4, wrong: 0, streak: 4, lastRound: index < 20 ? 9 : 6,
      dueRound: index < 20 ? 11 : 22, lastCorrect: true,
    };
  }
  const order = vocabularyReviewOrder(words, 'learner', 10, memory);
  expect(order).toHaveLength(20);
  expect(order.every(index => index >= 20)).toBe(true);
});
