import { describe, expect, test, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyDailyGoalCommand, dailyGoalCounts, dailyGoalsError, dailyGoalsKey, emptyDailyGoals,
  isValidDailyTargets, localGoalDate, readDailyGoals, recordDailyActivity, retryDailyGoals,
  saveDailyTargets, stopDailyGoalsForDeletion, subscribeDailyGoals, validDailyGoals,
} from '../../artifacts/yael-arabic-prep/lib/daily-goals';
import { timedDailyGoalEvents } from '../../artifacts/yael-arabic-prep/lib/daily-goal-events';
import { accountStorageKeys } from '../../artifacts/yael-arabic-prep/lib/deletionStorage';

const targets = { words: 20, restatement: 6, reading: 6, models: 1 };
const today = '2026-10-21';
const at = new Date(2026, 9, 21, 12).getTime();
describe('daily goals', () => {
  test('uses the device calendar across midnight and validates numeric limits', () => {
    expect(localGoalDate(new Date(2026, 9, 21, 23, 59, 59).getTime())).toBe(today);
    expect(localGoalDate(new Date(2026, 9, 22, 0, 0, 0).getTime())).toBe('2026-10-22');
    expect(isValidDailyTargets(targets)).toBe(true);
    expect(isValidDailyTargets({ words: 0, restatement: 0, reading: 0, models: 0 })).toBe(false);
    for (const words of [-1, 1.5, NaN, Infinity, 301]) expect(isValidDailyTargets({ ...targets, words })).toBe(false);
    expect(isValidDailyTargets({ ...targets, models: 6 })).toBe(false);
    expect(isValidDailyTargets({ ...targets, xp: 5 })).toBe(false);
  });
  test('targets never manufacture activity and editing them preserves actual counts', () => {
    let m = applyDailyGoalCommand(emptyDailyGoals(), { type: 'targets', date: today, targets });
    expect(dailyGoalCounts(m.days[today])).toEqual({ words: 0, restatement: 0, reading: 0, models: 0 });
    m = applyDailyGoalCommand(m, { type: 'activity', date: today, metric: 'words', id: 'שלום' });
    const edited = applyDailyGoalCommand(m, { type: 'targets', date: today, targets: { ...targets, words: 1 } });
    expect(dailyGoalCounts(edited.days[today]).words).toBe(1);
    expect(m.days[today].targets?.words).toBe(20);
  });
  test('deduplicates a word across modes and keeps question categories separate', () => {
    let m = emptyDailyGoals();
    for (const id of ['שלום', ' שלום ', 'שלום']) m = applyDailyGoalCommand(m, { type: 'activity', date: today, metric: 'words', id });
    for (const metric of ['reading', 'restatement'] as const) {
      m = applyDailyGoalCommand(m, { type: 'activity', date: today, metric, id: 'round:q1' });
      m = applyDailyGoalCommand(m, { type: 'activity', date: today, metric, id: 'round:q1' });
    }
    expect(dailyGoalCounts(m.days[today])).toEqual({ words: 1, restatement: 1, reading: 1, models: 0 });
  });
  test('new days have fresh targets and counters without erasing yesterday', () => {
    let m = applyDailyGoalCommand(emptyDailyGoals(), { type: 'targets', date: today, targets });
    m = applyDailyGoalCommand(m, { type: 'activity', date: today, metric: 'words', id: 'שלום' });
    m = applyDailyGoalCommand(m, { type: 'activity', date: '2026-10-22', metric: 'words', id: 'שלום' });
    expect(m.days['2026-10-22'].targets).toBeNull();
    expect(dailyGoalCounts(m.days['2026-10-22']).words).toBe(1);
    expect(m.days[today].targets).toEqual(targets);
    expect(dailyGoalCounts(m.days[today]).words).toBe(1);
    expect(validDailyGoals(m)).toBe(true);
  });
  test('retains at most a month of activity', () => {
    let m = emptyDailyGoals();
    for (let i = 0; i < 45; i++) {
      m = applyDailyGoalCommand(m, { type: 'activity', date: localGoalDate(new Date(2026, 8, 1 + i).getTime()), metric: 'reading', id: 'q' });
    }
    expect(Object.keys(m.days)).toHaveLength(31);
    expect(validDailyGoals(m)).toBe(true);
  });
  test('serializes concurrent records and target edits, isolated by learner', async () => {
    await Promise.all([
      saveDailyTargets('goals-a', targets, today),
      ...Array.from({ length: 15 }, (_, i) => recordDailyActivity('goals-a', 'words', `word-${i % 10}`, at)),
      recordDailyActivity('goals-b', 'reading', 'own-question', at),
    ]);
    const a = await readDailyGoals('goals-a');
    const b = await readDailyGoals('goals-b');
    expect(dailyGoalCounts(a.days[today])).toEqual({ words: 10, restatement: 0, reading: 0, models: 0 });
    expect(a.days[today].targets).toEqual(targets);
    expect(dailyGoalCounts(b.days[today]).reading).toBe(1);
    expect(b.days[today].targets).toBeNull();
  });
  test('retains failed writes for an explicit retry and notifies only that learner', async () => {
    const listener = vi.fn(); const other = vi.fn();
    const off = subscribeDailyGoals('goals-retry', listener);
    const offOther = subscribeDailyGoals('goals-other', other);
    const write = vi.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Disk unavailable'));
    await expect(recordDailyActivity('goals-retry', 'words', 'שלום', at)).rejects.toThrow();
    write.mockRestore();
    expect(dailyGoalsError('goals-retry')).toBeTruthy();
    await retryDailyGoals('goals-retry');
    expect(dailyGoalCounts((await readDailyGoals('goals-retry')).days[today]).words).toBe(1);
    expect(dailyGoalsError('goals-retry')).toBeNull();
    expect(listener).toHaveBeenCalled(); expect(other).not.toHaveBeenCalled();
    off(); offOther();
  });
  test('preserves damaged storage rather than replacing it with empty goals', async () => {
    const raw = '{"version":1,"days":"damaged"}';
    await AsyncStorage.setItem(dailyGoalsKey('goals-damaged'), raw);
    await expect(readDailyGoals('goals-damaged')).rejects.toThrow();
    await expect(recordDailyActivity('goals-damaged', 'models', 'attempt', at)).rejects.toThrow();
    expect(await AsyncStorage.getItem(dailyGoalsKey('goals-damaged'))).toBe(raw);
  });
  test('account deletion includes the ledger and stops late writes recreating it', async () => {
    await recordDailyActivity('goals-delete', 'words', 'שלום', at);
    expect(await accountStorageKeys(AsyncStorage, 'goals-delete')).toContain(dailyGoalsKey('goals-delete'));
    await stopDailyGoalsForDeletion('goals-delete');
    await AsyncStorage.removeItem(dailyGoalsKey('goals-delete'));
    await expect(recordDailyActivity('goals-delete', 'words', 'אור', at)).rejects.toThrow();
    expect(await AsyncStorage.getItem(dailyGoalsKey('goals-delete'))).toBeNull();
  });
});

describe('completed activity, not opened screens', () => {
  const sections = [[{ id: 'r', type: 'reading' }, { id: 's', type: 'restatement' }, { id: 'c', type: 'completion' }]];
  const before = { attemptId: 'attempt', mode: 'full' as const, stage: 0, answers: [[null, null, null]], essay: '' };
  test('only newly answered reading/restatement questions count, including legacy resumes', () => {
    const answered = { ...before, answers: [[0, 1, 2]] };
    expect(timedDailyGoalEvents(before, answered, sections, 2).map(e => e.metric)).toEqual(['reading', 'restatement']);
    expect(timedDailyGoalEvents(answered, { ...answered, answers: [[1, 2, 2]] }, sections, 2)).toEqual([]);
    const legacy = { ...answered, attemptId: undefined };
    expect(timedDailyGoalEvents(legacy, { ...answered, essay: 'draft' }, sections, 2)).toEqual([]);
  });
  test('counts a full model only once after all answers and essay are submitted', () => {
    const essayStage = { ...before, stage: 1, answers: [[0, 1, 2]], essay: 'כתבתי חיבור' };
    const done = { ...essayStage, stage: 2 };
    expect(timedDailyGoalEvents(essayStage, done, sections, 2)).toEqual([{ metric: 'models', id: 'attempt' }]);
    expect(timedDailyGoalEvents(done, done, sections, 2)).toEqual([]);
    expect(timedDailyGoalEvents(essayStage, { ...done, essay: '' }, sections, 2)).toEqual([]);
    expect(timedDailyGoalEvents({ ...essayStage, answers: [[null, 1, 2]] }, { ...done, answers: [[null, 1, 2]] }, sections, 2)).toEqual([]);
    expect(timedDailyGoalEvents({ ...essayStage, mode: 'training' }, { ...done, mode: 'training' }, sections, 2)).toEqual([]);
    expect(timedDailyGoalEvents(before, { ...before, stage: 2 }, sections, 2)).toEqual([]);
  });
});
