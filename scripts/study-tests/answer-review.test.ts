import { expect, test } from 'vitest';
import { getAnswerReviewState } from '../../artifacts/yael-arabic-prep/lib/answer-review';

test('review distinguishes wrong, correct, unanswered and ungraded, including option zero', () => {
  expect(getAnswerReviewState(0, 0)).toBe('correct');
  expect(getAnswerReviewState(0, 1)).toBe('wrong');
  expect(getAnswerReviewState(1, 0)).toBe('wrong');
  expect(getAnswerReviewState(null, 0)).toBe('unanswered');
  expect(getAnswerReviewState(null, null)).toBe('unanswered');
  expect(getAnswerReviewState(0, null)).toBe('ungraded');
});
