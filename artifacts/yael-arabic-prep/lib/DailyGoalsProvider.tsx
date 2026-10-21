import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  dailyGoalCounts, dailyGoalsError, emptyDailyCounts, localGoalDate, readDailyGoals,
  recordDailyActivity, retryDailyGoals, saveDailyTargets, subscribeDailyGoals,
  type DailyMetric, type DailyTargets,
} from './daily-goals';

type GoalsContext = {
  date: string; targets: DailyTargets | null; counts: DailyTargets; ready: boolean; error: string | null;
  busy: boolean; editorOpen: boolean; openEditor(): void; closeEditor(): void;
  saveTargets(targets: DailyTargets): Promise<boolean>;
  recordActivity(metric: DailyMetric, key: string, at?: number): Promise<void>; retry(): void;
};
const Context = createContext<GoalsContext | null>(null);
export function DailyGoalsProvider({ userId, children }: { userId: string | null | undefined; children: React.ReactNode }) {
  const [date, setDate] = useState(localGoalDate);
  const [targets, setTargets] = useState<DailyTargets | null>(null);
  const [counts, setCounts] = useState(emptyDailyCounts);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const active = useRef(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++generation.current;
    if (!userId) { setReady(false); return; }
    try {
      const memory = await readDailyGoals(userId);
      if (!active.current || id !== generation.current) return;
      const today = localGoalDate();
      setDate(today); setTargets(memory.days[today]?.targets ?? null); setCounts(dailyGoalCounts(memory.days[today]));
      setError(dailyGoalsError(userId)); setReady(true);
    } catch {
      if (active.current && id === generation.current) {
        setDate(localGoalDate()); setTargets(null); setCounts(emptyDailyCounts());
        setError('تعذّر قراءة أهداف اليوم. لم نحذف بياناتك. أعد المحاولة.');
        setReady(true);
      }
    }
  }, [userId]);
  useEffect(() => {
    active.current = true;
    void refresh();
    const unsubscribe = userId ? subscribeDailyGoals(userId, () => { void refresh(); }) : () => {};
    const sub = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    const timer = setInterval(() => { void refresh(); }, 60_000);
    return () => { active.current = false; generation.current++; unsubscribe(); sub.remove(); clearInterval(timer); };
  }, [refresh, userId]);
  const saveTargets = useCallback(async (next: DailyTargets) => {
    if (!userId || busy) return false;
    setBusy(true);
    try {
      await saveDailyTargets(userId, next);
      await refresh();
      if (active.current) setEditorOpen(false);
      return true;
    } catch {
      if (active.current) setError('تعذّر حفظ أهدافك الآن. حاول مجددًا.');
      return false;
    } finally { if (active.current) setBusy(false); }
  }, [busy, refresh, userId]);
  const recordActivity = useCallback(async (metric: DailyMetric, key: string, at?: number) => {
    if (!userId) return;
    try { await recordDailyActivity(userId, metric, key, at); } catch { /* subscription exposes failed writes */ }
  }, [userId]);
  const retry = useCallback(() => {
    if (!userId) return;
    void retryDailyGoals(userId).catch(() => {}).then(refresh);
  }, [refresh, userId]);
  return <Context.Provider value={{ date, targets, counts, ready, error, busy, editorOpen,
    openEditor: () => setEditorOpen(true), closeEditor: () => { if (!busy) setEditorOpen(false); },
    saveTargets, recordActivity, retry }}>{children}</Context.Provider>;
}
export function useDailyGoals() {
  const context = useContext(Context);
  if (!context) throw new Error('DailyGoalsProvider is required');
  return context;
}
