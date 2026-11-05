import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, test, vi } from 'vitest';
import { DAILY_STUDY_TIPS, getDailyStudyTip, millisecondsUntilNextLocalDay } from '../../artifacts/yael-arabic-prep/lib/daily-study-tips';
import { useDailyStudyTip } from '../../artifacts/yael-arabic-prep/hooks/useDailyStudyTip';

const appState = vi.hoisted(() => ({ listener: null as null | ((state: string) => void), remove: vi.fn() }));
vi.mock('react-native', () => ({
  AppState: { addEventListener: (_event: string, listener: (state: string) => void) => {
    appState.listener = listener;
    return { remove: appState.remove };
  } },
}));

afterEach(() => { vi.useRealTimers(); appState.listener = null; vi.clearAllMocks(); });

test('has 30 distinct Arabic tips and uses one stable tip per local day', () => {
  expect(DAILY_STUDY_TIPS).toHaveLength(30);
  expect(new Set(DAILY_STUDY_TIPS).size).toBe(30);
  for (const tip of DAILY_STUDY_TIPS) {
    expect(tip).toMatch(/[\u0600-\u06ff]/);
    expect(tip).not.toMatch(/[\u0660-\u0669\u06f0-\u06f9]/);
  }
  expect(getDailyStudyTip(new Date(2026, 10, 5, 0))).toEqual(getDailyStudyTip(new Date(2026, 10, 5, 23, 59, 59)));
  expect(() => getDailyStudyTip(new Date(NaN))).toThrow('Invalid study-tip date');
});

test('cycles through all tips across month boundaries and DST-season dates', () => {
  for (const start of [new Date(2026, 0, 25), new Date(2026, 2, 20), new Date(2026, 9, 20), new Date(2026, 11, 20)]) {
    const days = Array.from({ length: 31 }, (_, offset) => getDailyStudyTip(new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset)));
    expect(new Set(days.slice(0, 30).map(tip => tip.text)).size).toBe(30);
    expect(days[30]).toEqual(days[0]);
  }
  expect(millisecondsUntilNextLocalDay(new Date(2026, 10, 5, 23, 59, 59, 500))).toBe(500);
});

test('changes at local midnight and on app resume, then cleans up its timer', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 5, 23, 59, 59, 500));
  let rendered: ReactTestRenderer;
  let displayed = '';
  function Probe() { displayed = useDailyStudyTip().text; return null; }
  await act(async () => { rendered = create(<Probe />); });
  const first = displayed;
  await act(async () => { vi.advanceTimersByTime(500); });
  expect(displayed).not.toBe(first);
  expect(displayed).toBe(getDailyStudyTip().text);
  vi.setSystemTime(new Date(2026, 10, 9, 12));
  await act(async () => { appState.listener?.('active'); });
  expect(displayed).toBe(getDailyStudyTip().text);
  await act(async () => { rendered!.unmount(); });
  expect(appState.remove).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
