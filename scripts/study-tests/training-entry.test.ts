import { expect, test } from 'vitest';
import { trainingEntry } from '../../artifacts/yael-arabic-prep/lib/training-entry';
import {
  emptyAdaptiveMemory, planAdaptiveRound, recordAdaptiveAnswer, finishAdaptiveRound,
} from '../../artifacts/yael-arabic-prep/lib/adaptive-restatement';
import { SECTION_LEARNING } from '../../artifacts/yael-arabic-prep/lib/section-learning-content';

test('entry distinguishes fresh, resumable and previous attempts without starting a clock', () => {
  expect(trainingEntry(null, 100)).toBe('new');
  expect(trainingEntry({ deadline: null }, 100)).toBe('resume');
  expect(trainingEntry({ deadline: 101 }, 100)).toBe('resume');
  expect(trainingEntry({ deadline: 100 }, 100)).toBe('previous');
  expect(trainingEntry({ deadline: 90 }, 100)).toBe('previous');
  expect(trainingEntry({ deadline: 200, finished: true }, 100)).toBe('previous');
});

test('an expired saved round stays intact on entry; explicit new round retains learning memory', () => {
  const pool = Array.from({ length: 12 }, (_, i) => ({ id: `question-${i}` }));
  let memory = planAdaptiveRound(emptyAdaptiveMemory(), pool, 'old', 100, () => 0.5);
  const id = memory.active!.questionIds[0];
  memory = recordAdaptiveAnswer(memory, id, 0, 1, 200);
  const before = structuredClone(memory);
  expect(trainingEntry(memory.active, 400_000)).toBe('previous');
  expect(memory).toEqual(before);
  const next = planAdaptiveRound(finishAdaptiveRound(memory), pool, 'new', 400_000, () => 0.5);
  expect(next.active!.finished).toBe(false);
  expect(next.active!.answers).toEqual({});
  expect(next.active!.deadline).toBe(790_000);
  expect(next.items).toEqual(before.items);
  expect(next.items[id].wrong).toBe(1);
});

test('every learning section has substantive authored lessons and contextual examples', () => {
  for (const section of ['restatement', 'reading', 'flashcards', 'exam'] as const) {
    const lessons = SECTION_LEARNING[section].lessons;
    expect(lessons.length).toBeGreaterThanOrEqual(3);
    expect(new Set(lessons.map(lesson => lesson.id)).size).toBe(lessons.length);
    for (const lesson of lessons) {
      expect(lesson.points.length).toBeGreaterThanOrEqual(2);
      expect(lesson.examples.length).toBeGreaterThanOrEqual(1);
    }
  }
});
