import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@clerk/expo';

export type SelectedPlan = 'free' | null;
type Activity = 'vocabulary' | 'timed-section';
type DailyUse = { date: string; vocabularyRounds: number; timedSections: number; timedKeys: string[] };
type StoredAccess = { plan: SelectedPlan; usage: DailyUse };
type AccessContextValue = {
  ready: boolean;
  plan: SelectedPlan;
  isPremium: false;
  usage: DailyUse;
  chooseFree: () => Promise<void>;
  claimActivity: (activity: Activity, key?: string) => Promise<boolean>;
};

const emptyUsage = (): DailyUse => ({ date: localDate(), vocabularyRounds: 0, timedSections: 0, timedKeys: [] });
const AccessContext = createContext<AccessContextValue | null>(null);
const STORAGE_PREFIX = 'yael-plan-access-v1:';

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function parseStored(value: string | null): StoredAccess {
  const empty = { plan: null as SelectedPlan, usage: emptyUsage() };
  if (!value) return empty;
  try {
    const parsed = JSON.parse(value) as Partial<StoredAccess>;
    const usage = parsed.usage;
    if (!usage || usage.date !== localDate()) return { ...empty, plan: parsed.plan === 'free' ? 'free' : null };
    return {
      plan: parsed.plan === 'free' ? 'free' : null,
      usage: {
        date: usage.date,
        vocabularyRounds: Number.isInteger(usage.vocabularyRounds) && usage.vocabularyRounds >= 0 ? usage.vocabularyRounds : 0,
        timedSections: Number.isInteger(usage.timedSections) && usage.timedSections >= 0 ? usage.timedSections : 0,
        timedKeys: Array.isArray(usage.timedKeys) ? usage.timedKeys.filter((key): key is string => typeof key === 'string') : [],
      },
    };
  } catch {
    return empty;
  }
}

export function PlanAccessProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const [stored, setStored] = useState<StoredAccess>({ plan: null, usage: emptyUsage() });
  const [ready, setReady] = useState(false);
  const activeKey = userId ? `${STORAGE_PREFIX}${userId}` : null;
  const serial = useRef<Promise<void>>(Promise.resolve());
  const storedRef = useRef(stored);
  storedRef.current = stored;

  useEffect(() => {
    let active = true;
    setReady(false);
    if (!isLoaded || !activeKey) {
      setStored({ plan: null, usage: emptyUsage() });
      setReady(isLoaded);
      return () => { active = false; };
    }
    void AsyncStorage.getItem(activeKey).then(value => {
      if (active) {
        setStored(parseStored(value));
        setReady(true);
      }
    }).catch(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, [activeKey, isLoaded]);

  const persist = useCallback((next: StoredAccess) => {
    if (!activeKey) return Promise.reject(new Error('Sign in before saving a plan.'));
    serial.current = serial.current.then(() => AsyncStorage.setItem(activeKey, JSON.stringify(next)));
    setStored(next);
    return serial.current;
  }, [activeKey]);

  const chooseFree = useCallback(async () => {
    const currentStored = storedRef.current;
    const current = currentStored.usage.date === localDate() ? currentStored.usage : emptyUsage();
    await persist({ plan: 'free', usage: current });
  }, [persist]);

  const claimActivity = useCallback(async (activity: Activity, key?: string) => {
    const currentStored = storedRef.current;
    if (!userId || currentStored.plan !== 'free') return false;
    const current = currentStored.usage.date === localDate() ? currentStored.usage : emptyUsage();
    if (activity === 'vocabulary') {
      if (current.vocabularyRounds >= 1) return false;
      await persist({ plan: currentStored.plan, usage: { ...current, vocabularyRounds: current.vocabularyRounds + 1 } });
      return true;
    }
    const identity = key ?? 'timed-section';
    if (current.timedKeys.includes(identity)) return true;
    if (current.timedSections >= 1) return false;
    await persist({
      plan: currentStored.plan,
      usage: { ...current, timedSections: current.timedSections + 1, timedKeys: [...current.timedKeys, identity] },
    });
    return true;
  }, [persist, userId]);

  const value = useMemo<AccessContextValue>(() => ({
    ready, plan: stored.plan, isPremium: false, usage: stored.usage, chooseFree, claimActivity,
  }), [ready, stored, chooseFree, claimActivity]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function usePlanAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error('PlanAccessProvider missing');
  return value;
}
