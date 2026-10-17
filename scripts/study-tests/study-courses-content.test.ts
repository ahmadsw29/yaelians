import { expect, test } from 'vitest';
import { teachingCatalog, TEACHING_LESSONS } from '../../artifacts/api-server/src/lib/study-courses';

test('trial catalog exposes only previews, never premium lesson bodies or answer keys', () => {
  const catalog = teachingCatalog(false);
  expect(catalog.isPremium).toBe(false);
  expect(catalog.lessons).toHaveLength(9);
  for (const lesson of catalog.lessons) {
    expect(lesson.requiresPremium).toBe(true);
    for (const key of ['sections', 'referenceRows', 'quiz']) expect(lesson).not.toHaveProperty(key);
  }
});

test('all nine photographed pages have teaching content and valid distinct challenges', () => {
  expect(new Set(TEACHING_LESSONS.map(lesson => lesson.id)).size).toBe(9);
  expect(TEACHING_LESSONS.filter(lesson => lesson.id.startsWith('plurals'))
    .reduce((count, lesson) => count + lesson.referenceRows.length, 0)).toBe(82);
  for (const lesson of TEACHING_LESSONS) {
    expect(lesson.sections.length).toBeGreaterThan(0);
    expect(lesson.quiz).toHaveLength(3);
    for (const question of lesson.quiz) {
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(question.options.length);
      expect(new Set(question.options).size).toBe(question.options.length);
      expect(question.explanation.length).toBeGreaterThan(0);
    }
  }
});
