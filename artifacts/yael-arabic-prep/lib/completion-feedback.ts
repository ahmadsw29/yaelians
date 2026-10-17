export type CompletionFeedback = 'empty' | 'review' | 'steady' | 'celebrate';

/** Empty submissions and weak scores are review opportunities, not achievements. */
export function completionFeedback(correct: number, answered: number, total: number): CompletionFeedback {
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(answered) || answered <= 0) return 'empty';
  if (!Number.isFinite(correct) || correct < 0 || correct > answered || answered > total) return 'review';
  if (answered >= 3 && correct / total >= 0.8) return 'celebrate';
  return correct / answered >= 0.5 ? 'steady' : 'review';
}
