import { expect, test } from 'vitest';
import { scoreExamSections } from '../../artifacts/yael-arabic-prep/lib/exam-results';

test('section results distinguish correct, wrong and skipped without grading writing', () => {
  const sections = [
    [{ answer: 0 }, { answer: 2 }, { answer: 1 }],
    [{ answer: 3 }, { answer: 0 }],
    [{ answer: 1 }],
  ];
  expect(scoreExamSections(sections, [[0, 1, null], [3, 0], []])).toEqual([
    { correct: 1, wrong: 1, skipped: 1, total: 3, percent: 33 },
    { correct: 2, wrong: 0, skipped: 0, total: 2, percent: 100 },
    { correct: 0, wrong: 0, skipped: 1, total: 1, percent: 0 },
  ]);
  expect(scoreExamSections([[]], [])).toEqual([
    { correct: 0, wrong: 0, skipped: 0, total: 0, percent: 0 },
  ]);
});
