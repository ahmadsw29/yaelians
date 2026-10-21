import { vocabularyDeckOrder } from './vocabulary-selection';

/** Keep the real answer and one distractor; never reorder or remove a row. */
export function vocabularyHintExclusions(options: readonly string[], correctAnswer: string, seed: string): string[] {
  if (!options.includes(correctAnswer) || new Set(options).size !== options.length) return [];
  const wrong = options.filter(option => option !== correctAnswer);
  if (wrong.length < 2) return [];
  const retained = vocabularyDeckOrder(wrong.length, seed)[0];
  return wrong.filter((_, index) => index !== retained).slice(0, 2);
}
