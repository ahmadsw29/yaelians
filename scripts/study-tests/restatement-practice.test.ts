import { expect, test } from 'vitest';
import { IMPORTED_EXAMS } from '../../artifacts/yael-arabic-prep/lib/solved-exams';
import { restatementExam, restatementSessionKey } from '../../artifacts/yael-arabic-prep/lib/restatement-practice';

test('every uploaded model offers original restatement questions, without shortening or changing answers', () => {
  expect(IMPORTED_EXAMS).toHaveLength(14);
  for (const source of IMPORTED_EXAMS) {
    const focused = restatementExam(source);
    expect(focused.id).toBe(source.id);
    expect(focused.sections).toHaveLength(source.sections.length);
    focused.sections.forEach((section, index) => {
      expect(section.length).toBeGreaterThan(0);
      expect(section).toEqual(source.sections[index].filter(q => q.type === 'restatement'));
      for (const question of section) {
        expect(question).toBe(source.sections[index].find(q => q.id === question.id));
        expect(question.options).toHaveLength(4);
        expect(question.sourcePage).toBeGreaterThan(0);
        expect(question.explanation.trim().length).toBeGreaterThan(0);
      }
    });
  }
});

test('focused training cannot overwrite a saved full-section attempt', () => {
  expect(restatementSessionKey('saved-account-b17-section0', true)).not.toBe(restatementSessionKey('saved-account-b17-section0', false));
  expect(restatementSessionKey('saved-account-b17-section0', false)).toBe('saved-account-b17-section0');
});
