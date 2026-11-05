import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IMPORTED_EXAMS } from '../../artifacts/yael-arabic-prep/lib/solved-exams';
import { restatementExam, restatementSessionKey } from '../../artifacts/yael-arabic-prep/lib/restatement-practice';
import {
  SECTION_MS, ESSAY_MS, advance, catchUp, isDone, loadSourceSession,
  newSourceSession, parseSourceSession, saveSourceSession, storageKey,
} from '../../artifacts/yael-arabic-prep/lib/source-session';
import { accountStorageKeys } from '../../artifacts/yael-arabic-prep/lib/deletionStorage';

test('timed training keeps source metadata out of its entry and presentation', () => {
  // Structural guard alongside browser checks of intro, questions, and review.
  // Internal model IDs must remain unchanged for saved attempts and access rules.
  const screen = readFileSync(new URL('../../artifacts/yael-arabic-prep/components/SourceSessionScreen.tsx', import.meta.url), 'utf8');
  const entry = readFileSync(new URL('../../artifacts/yael-arabic-prep/components/ExamShortcuts.tsx', import.meta.url), 'utf8');
  expect(screen).not.toContain('sourceFilename');
  expect(screen.match(/\bexam\.title\b/g)).toHaveLength(1);
  expect(screen).toContain("const modelTitle = mode === 'full' ? exam.title : null;");
  for (const line of screen.split('\n').filter(line => /q(?:q)?\.sourcePage/.test(line))) {
    expect(line).toContain("mode === 'full'");
  }
  expect(entry).not.toMatch(/B-17|sourceFilename/);
  expect(entry).toContain("router.push('/source-session')");
  expect(screen).toContain("const examId = defaultTraining ? 'b17' : one(params.exam);");
  expect(screen).toContain('حلول مولّدة بالذكاء الاصطناعي وليست مفتاحًا رسميًا');
});

test('restored training and full sessions keep answers, essay, results, and original deadlines', () => {
  const exam = IMPORTED_EXAMS[0];
  for (const mode of ['training', 'full'] as const) {
    const session = newSourceSession(exam, mode, mode === 'training' ? 0 : null);
    session.answers[0][0] = 2;
    session.essay = 'טיוטה';
    const raw = JSON.stringify(session);
    const recovered = parseSourceSession(raw, exam, mode, mode === 'training' ? 0 : null);
    expect(recovered).toEqual(session);
    expect(catchUp(recovered, session.deadline! - 1)).toEqual(session);
    const expired = catchUp(recovered, session.deadline! + SECTION_MS * exam.sections.length + ESSAY_MS);
    expect(isDone(expired)).toBe(true);
    expect(expired.answers).toEqual(session.answers);
    expect(expired.essay).toBe(session.essay);
    expect(expired.deadline).toBeNull();
    expect(parseSourceSession(JSON.stringify(expired), exam, mode, mode === 'training' ? 0 : null)).toEqual(expired);
  }
});

test('recovery rejects another exam, mode, focus shape, or invalid answers before replacing local data', () => {
  const exam = IMPORTED_EXAMS[0];
  const session = newSourceSession(exam, 'training', 0);
  const raw = JSON.stringify(session);
  expect(() => parseSourceSession(raw, IMPORTED_EXAMS[1], 'training', 0)).toThrow();
  expect(() => parseSourceSession(raw, exam, 'full', null)).toThrow();
  expect(() => parseSourceSession(raw, restatementExam(exam), 'training', 0)).toThrow();
  expect(() => parseSourceSession('{', exam, 'training', 0)).toThrow();
  expect(() => parseSourceSession(JSON.stringify({ ...session, answers: [[99]] }), exam, 'training', 0)).toThrow();
});

test('guest, account, exam, mode and focus copies stay isolated and writes are serialized', async () => {
  const exam = IMPORTED_EXAMS[0];
  const session = newSourceSession(exam, 'training', 0);
  const guestKey = storageKey(undefined, exam.id, 'training', 0);
  const accountKey = storageKey('timed-local-owner', exam.id, 'training', 0);
  await saveSourceSession(guestKey, session);
  expect(await loadSourceSession(accountKey)).toBeNull();
  const guestRaw = await loadSourceSession(guestKey);
  // Merely signing in or reading the guest record never transfers it.
  expect(await loadSourceSession(accountKey)).toBeNull();
  await saveSourceSession(accountKey, parseSourceSession(guestRaw!, exam, 'training', 0));
  expect(await loadSourceSession(guestKey)).toBe(guestRaw);
  const done = advance(session, Date.now());
  const first = saveSourceSession(accountKey, session);
  const second = saveSourceSession(accountKey, done);
  await Promise.all([first, second]);
  expect(JSON.parse((await loadSourceSession(accountKey))!)).toEqual(done);
  expect(await loadSourceSession(restatementSessionKey(accountKey, true))).toBeNull();
  await saveSourceSession(accountKey, null);
  expect(await loadSourceSession(accountKey)).toBeNull();
  expect(await loadSourceSession(guestKey)).toBe(guestRaw);
});

test('account deletion clears restored source copies, never guest or other accounts', async () => {
  await AsyncStorage.setItem('yael-source:v1:deleting-owner:b17:training:0:restatement', '{}');
  await AsyncStorage.setItem('yael-source:v1:guest:b17:training:0', '{}');
  await AsyncStorage.setItem('yael-source:v1:other-owner:b17:training:0', '{}');
  const keys = await accountStorageKeys(AsyncStorage, 'deleting-owner');
  expect(keys).toContain('yael-source:v1:deleting-owner:b17:training:0:restatement');
  expect(keys.some(key => key.includes(':guest:') || key.includes(':other-owner:'))).toBe(false);
});
