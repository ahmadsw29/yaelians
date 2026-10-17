export type AnswerReviewState = 'correct' | 'wrong' | 'unanswered' | 'ungraded';

export function getAnswerReviewState(selected: number | null, expected: number | null): AnswerReviewState {
  if (selected === null) return 'unanswered';
  if (expected === null) return 'ungraded';
  return selected === expected ? 'correct' : 'wrong';
}

export const ANSWER_REVIEW_LABELS: Record<AnswerReviewState, string> = {
  correct: 'إجابة صحيحة',
  wrong: 'إجابة غير صحيحة',
  unanswered: 'بدون إجابة',
  ungraded: 'بحاجة لمراجعة',
};
