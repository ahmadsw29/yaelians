import { expect, test } from 'vitest';
import {
  adaptiveRoundDuration, advanceAdaptiveQuestion, emptyAdaptiveMemory, finishAdaptiveRound,
  planAdaptiveRound, recordAdaptiveAnswer,
} from '../../artifacts/yael-arabic-prep/lib/adaptive-restatement';
import { completionFeedback } from '../../artifacts/yael-arabic-prep/lib/completion-feedback';

test('a wrong answer returns next round while correct answers are spaced and remain eligible later', () => {
  const pool = Array.from({ length: 30 }, (_, index) => ({ id: `q-${index}` }));
  let memory = planAdaptiveRound(emptyAdaptiveMemory(), pool, 'round-1', 1000, () => 0.4);
  const ids = memory.active!.questionIds;
  expect(new Set(ids).size).toBe(6);
  const wrongId = ids[0];
  memory = recordAdaptiveAnswer(memory, wrongId, 1, 0, 1001);
  const afterWrong = memory;
  expect(recordAdaptiveAnswer(memory, wrongId, 0, 0, 1002)).toBe(afterWrong);
  memory = advanceAdaptiveQuestion(memory, 1002);
  const correctId = ids[1];
  memory = recordAdaptiveAnswer(memory, correctId, 0, 0, 1003);
  memory = finishAdaptiveRound(memory);
  const next = planAdaptiveRound(memory, pool, 'round-2', 2000, () => 0.7);
  expect(next.active!.questionIds).toContain(wrongId);
  expect(next.active!.reasons[wrongId]).toBe('retry');
  expect(next.active!.questionIds).not.toContain(correctId);
  const later = planAdaptiveRound(finishAdaptiveRound(next), pool, 'round-3', 3000, () => 0.5);
  expect(later.active!.questionIds).toContain(correctId);
  expect(later.active!.reasons[correctId]).toBe('review');
  expect(memory.items[wrongId].wrong).toBe(1);
});

test('resuming an unfinished round does not reshuffle or extend its deadline', () => {
  const memory = planAdaptiveRound(emptyAdaptiveMemory(), [{ id: 'one' }], 'resume', 1000);
  expect(planAdaptiveRound(memory, [{ id: 'other' }], 'new', 3000)).toBe(memory);
  const expired = recordAdaptiveAnswer(memory, 'one', 0, 0, memory.active!.deadline);
  expect(expired.active!.finished).toBe(true);
  expect(expired.items).toEqual({});
});

test('six-question rounds use 6:30 below Semi-Master and exactly 6:00 from that rank onward', () => {
  expect(adaptiveRoundDuration(2999)).toBe(390000);
  expect(adaptiveRoundDuration(3000)).toBe(360000);
  expect(adaptiveRoundDuration(6000)).toBe(360000);
  const pool = Array.from({ length: 18 }, (_, i) => ({ id: `question-${i}` }));
  const beginner = planAdaptiveRound(emptyAdaptiveMemory(), pool, 'beginner', 1000, () => 0.5, 2999);
  const advanced = planAdaptiveRound(emptyAdaptiveMemory(), pool, 'advanced', 1000, () => 0.5, 3000);
  expect(beginner.active!.questionIds).toHaveLength(6);
  expect(advanced.active!.questionIds).toHaveLength(6);
  expect(beginner.active!.deadline - beginner.active!.startedAt).toBe(390000);
  expect(advanced.active!.deadline - advanced.active!.startedAt).toBe(360000);
  expect(planAdaptiveRound(beginner, pool, 'same-round', 2000, () => 0.5, 3000)).toBe(beginner);
});

test('celebrations require enough real correct work, not empty submission or weak scores', () => {
  expect(completionFeedback(0, 0, 6)).toBe('empty');
  expect(completionFeedback(0, 6, 6)).toBe('review');
  expect(completionFeedback(1, 1, 6)).not.toBe('celebrate');
  expect(completionFeedback(3, 6, 6)).toBe('steady');
  expect(completionFeedback(5, 6, 6)).toBe('celebrate');
  expect(completionFeedback(1, 1, 1)).not.toBe('celebrate');
});
