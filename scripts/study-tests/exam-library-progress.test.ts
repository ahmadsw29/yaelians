import { expect, test } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadExamLibraryProgress, summarizeExamProgress } from '../../artifacts/yael-arabic-prep/lib/exam-library-progress';
import { newSourceSession, saveSourceSession, storageKey } from '../../artifacts/yael-arabic-prep/lib/source-session';

const exam = {
  id: 'library-progress-test', essayPrompt: 'Write a short essay',
  sections: Array.from({ length: 3 }, () => Array.from({ length: 2 }, () => ({ options: ['a', 'b'] }))),
};

test('green completion requires a finished full attempt with all tasks done, not just an expired clock', () => {
  const full = newSourceSession(exam, 'full', null);
  expect(summarizeExamProgress(exam, full).completed).toBe(false);
  full.stage = 4; full.deadline = null;
  expect(summarizeExamProgress(exam, full).completed).toBe(false);
  full.answers = full.answers.map(row => row.map(() => 0));
  expect(summarizeExamProgress(exam, full).completed).toBe(false);
  full.essay = 'טיוטה';
  expect(summarizeExamProgress(exam, full).completed).toBe(true);
  full.stage = 3; full.deadline = Date.now() + 10000;
  expect(summarizeExamProgress(exam, full).completed).toBe(false);
  full.stage = 4; full.deadline = null; full.essay = '';
  expect(summarizeExamProgress({ ...exam, essayPrompt: null }, full).completed).toBe(true);
});

test('counts answered questions, never sums training answers into a different full attempt', () => {
  const training = exam.sections.map((_, index) => newSourceSession(exam, 'training', index));
  training[0].answers[0] = [0, 1];
  training[1].answers[0] = [null, 0];
  expect(summarizeExamProgress(exam, null, training).sections).toEqual([
    { answered: 2, total: 2 }, { answered: 1, total: 2 }, { answered: 0, total: 2 },
  ]);
  expect(summarizeExamProgress(exam, null, training).completed).toBe(false);
  const full = newSourceSession(exam, 'full', null);
  full.answers[0][0] = 1;
  expect(summarizeExamProgress(exam, full, training).sections[0].answered).toBe(1);
});

test('reads pending autosaves with account isolation, refreshes counts and preserves malformed data', async () => {
  const a = 'library-user-a'; const b = 'library-user-b';
  const key = storageKey(a, exam.id, 'training', 0);
  const training = newSourceSession(exam, 'training', 0);
  training.answers[0][0] = 0;
  const pending = saveSourceSession(key, training);
  const first = await loadExamLibraryProgress(a, exam);
  await pending;
  expect(first).toMatchObject({ state: 'ready', summary: { sections: [{ answered: 1, total: 2 }, { answered: 0, total: 2 }, { answered: 0, total: 2 }] } });
  expect(await loadExamLibraryProgress(b, exam)).toMatchObject({ state: 'ready', summary: { started: false } });
  training.answers[0][1] = 1;
  await saveSourceSession(key, training);
  expect(await loadExamLibraryProgress(a, exam)).toMatchObject({ state: 'ready', summary: { sections: [{ answered: 2, total: 2 }, { answered: 0, total: 2 }, { answered: 0, total: 2 }] } });
  const damaged = storageKey(a, exam.id, 'full', null);
  await AsyncStorage.setItem(damaged, '{broken');
  expect(await loadExamLibraryProgress(a, exam)).toEqual({ state: 'error' });
  expect(await AsyncStorage.getItem(damaged)).toBe('{broken');
});
