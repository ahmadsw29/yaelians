import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, useClerk } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import {
  getStudyStats, saveStudyLesson, importStudyStats, useGetStudyStats,
  useSaveStudyLesson, useImportStudyStats, type StudyLessonInput,
} from '@workspace/api-client-react';
import { DEFAULT_STATS, readStudyStats, recordLesson, type StudyStats } from './study';
import { getStudyAuthOptions } from './study-auth';

type StudyContext = {
  stats: StudyStats; loading: boolean; statsUnavailable: boolean; message: string; pending: number;
  recovery: { validCount: number; invalidCount: number; problem: 'invalid-json' | 'not-array' | 'invalid-events' } | null;
  legacy: StudyStats | null; busy: boolean;
  refresh: () => void; save: (correct: number, total?: number, activityKey?: string) => Promise<void>;
  recoverOutbox: () => void;
  migrate: () => void; keepCloud: () => void;
  pauseForDeletion: () => Promise<() => void>;
};

type PendingStudyLesson = StudyLessonInput & { completedAt?: string };

type OutboxRecovery = {
  raw: string;
  validEvents: PendingStudyLesson[];
  invalidCount: number;
  problem: 'invalid-json' | 'not-array' | 'invalid-events';
};

function isStudyLessonInput(value: unknown): value is PendingStudyLesson {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const event = value as Record<string, unknown>;
  const allowedKeys = new Set(['eventId', 'correct', 'total', 'completedAt', 'activityKey']);
  if (Object.keys(event).some(key => !allowedKeys.has(key))) return false;
  if (typeof event.eventId !== 'string' || event.eventId.length < 16 || event.eventId.length > 100
    || !/^[a-zA-Z0-9-]+$/.test(event.eventId)) return false;
  if (typeof event.correct !== 'number' || !Number.isInteger(event.correct) || event.correct < 0 || event.correct > 20) return false;
  if (typeof event.total !== 'number' || !Number.isInteger(event.total) || event.total < 1 || event.total > 20
    || event.correct > event.total) return false;
  if (event.completedAt !== undefined) {
    if (typeof event.completedAt !== 'string' || event.completedAt.length > 24
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(event.completedAt)) return false;
    try {
      if (new Date(event.completedAt).toISOString() !== event.completedAt) return false;
    } catch {
      return false;
    }
  }
  if (event.activityKey !== undefined
    && (typeof event.activityKey !== 'string' || event.activityKey.length < 16
      || event.activityKey.length > 100 || !/^[a-zA-Z0-9-]+$/.test(event.activityKey))) return false;
  return true;
}

function inspectOutbox(raw: string): { events: PendingStudyLesson[]; recovery: OutboxRecovery | null } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { events: [], recovery: { raw, validEvents: [], invalidCount: 0, problem: 'invalid-json' } };
  }
  if (!Array.isArray(parsed)) {
    return { events: [], recovery: { raw, validEvents: [], invalidCount: 0, problem: 'not-array' } };
  }
  const events = parsed.filter(isStudyLessonInput);
  const invalidCount = parsed.length - events.length;
  return {
    events,
    recovery: invalidCount
      ? { raw, validEvents: events, invalidCount, problem: 'invalid-events' }
      : null,
  };
}

const Context = createContext<StudyContext | null>(null);
export function useStudy() {
  const value = useContext(Context);
  if (!value) throw new Error('StudyProvider missing');
  return value;
}

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth();
  if (!isLoaded) return null;
  return <AccountStudy key={userId ?? 'guest'} userId={userId ?? null}>{children}</AccountStudy>;
}

function AccountStudy({ userId, children }: { userId: string | null; children: React.ReactNode }) {
  const clerk = useClerk();
  const client = useQueryClient();
  const key = ['study', userId];
  const storageKey = `yael-study-outbox-v1:${userId}`;
  const decisionKey = `yael-study-migration-v1:${userId}`;
  const alive = useRef(true);
  const deleting = useRef(false);
  const queue = useRef<StudyLessonInput[]>([]);
  const serial = useRef<Promise<unknown>>(Promise.resolve());
  const ready = useRef(false);
  const migrationNeeded = useRef(false);
  const recoveryRef = useRef<OutboxRecovery | null>(null);
  const [guest, setGuest] = useState(DEFAULT_STATS);
  const [legacy, setLegacy] = useState<StudyStats | null>(null);
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState('');
  const [recovery, setRecovery] = useState<StudyContext['recovery']>(null);
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);

  // Pin each request to this provider's account, never the global token getter.
  const authOptions = () => getStudyAuthOptions(
    () => clerk.session ?? null,
    userId,
    () => !deleting.current && alive.current,
  );
  const query = useGetStudyStats({
    query: {
      queryKey: key, enabled: !!userId, retry: false, refetchInterval: 30000,
      queryFn: async ({ signal }) => getStudyStats({ ...await authOptions(), signal }),
    },
  });
  const lessonMutation = useSaveStudyLesson({ mutation: {
    mutationFn: async ({ data }) => saveStudyLesson(data, await authOptions()),
  } });
  const importMutation = useImportStudyStats({ mutation: {
    mutationFn: async ({ data }) => importStudyStats(data, await authOptions()),
  } });
  const run = <T,>(work: () => Promise<T>): Promise<T> => {
    const next = serial.current.then(work);
    serial.current = next.catch(() => {});
    return next;
  };
  const flush = async () => {
    if (deleting.current || !userId || !ready.current || migrationNeeded.current || recoveryRef.current || !alive.current) return;
    setBusy(true);
    let uncreditedLessons = 0;
    try {
      while (queue.current.length && alive.current) {
        const event = queue.current[0];
        const result = await lessonMutation.mutateAsync({ data: event });
        if (!result.progressCredited) uncreditedLessons += 1;
        const remaining = queue.current.slice(1);
        // Persist removal only after server acknowledgment; event IDs make retries safe.
        await AsyncStorage.setItem(storageKey, JSON.stringify(remaining));
        queue.current = remaining;
        if (alive.current) {
          setPending(remaining.length);
          await client.cancelQueries({ queryKey: key, exact: true });
        }
        if (alive.current) {
          client.setQueryData(key, result.stats);
        }
      }
      if (alive.current) setMessage(uncreditedLessons
        ? 'تمت مزامنة بعض الجولات دون إضافة تقدّم يومي؛ لم يتوفر لها تصريح الخطة.'
        : '');
    } catch {
      if (alive.current) setMessage('تعذّرت المزامنة. الدروس محفوظة على هذا الجهاز لهذا الحساب وسنحاول مجددًا. يُحسب النشاط بتاريخ إكمال الدرس بتوقيت UTC خلال آخر 30 يومًا؛ الدروس الأقدم أو ذات وقت جهاز غير صحيح تُحسب يوم المزامنة.');
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const refresh = () => {
    if (deleting.current) return;
    if (userId) {
      void query.refetch();
      void run(flush);
    } else void readStudyStats().then(value => { if (alive.current) setGuest(value); });
  };
  useEffect(() => {
    alive.current = true;
    void run(async () => {
      try {
        if (userId) {
          const [outbox, old, decision] = await Promise.all([
            AsyncStorage.getItem(storageKey),
            AsyncStorage.getItem(`yael-study-stats-v1:${userId}`),
            AsyncStorage.getItem(decisionKey),
          ]);
          const inspected = outbox !== null ? inspectOutbox(outbox) : { events: [], recovery: null };
          queue.current = inspected.events;
          recoveryRef.current = inspected.recovery;
          const previous = old ? JSON.parse(old) as StudyStats : null;
          migrationNeeded.current = !decision && !!previous?.lessonsCompleted;
          if (alive.current) {
            setPending(inspected.events.length);
            setRecovery(inspected.recovery ? {
              validCount: inspected.recovery.validEvents.length,
              invalidCount: inspected.recovery.invalidCount,
              problem: inspected.recovery.problem,
            } : null);
            setLegacy(migrationNeeded.current ? previous : null);
          }
        } else {
          const stats = await readStudyStats();
          if (alive.current) setGuest(stats);
        }
        ready.current = true;
        if (alive.current) setInitialized(true);
        await flush();
      } catch {
        if (alive.current) setMessage('تعذّرت قراءة البيانات المحلية. أعد فتح التطبيق؛ لم يتم حذف أي بيانات.');
      }
    });
    return () => {
      alive.current = false;
      void client.cancelQueries({ queryKey: key, exact: true });
      client.removeQueries({ queryKey: key, exact: true });
    };
  }, []);
  useEffect(() => {
    const timer = setInterval(refresh, 30000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  });

  const save = (correct: number, total = 5, activityKey?: string) => {
    // Capture at completion, before waiting behind an in-flight sync operation.
    const completedAt = new Date().toISOString();
    return run(async () => {
    if (deleting.current || !ready.current || !alive.current || recoveryRef.current) throw new Error('Resolve the saved lesson recovery notice before saving progress');
    if (!Number.isInteger(correct) || !Number.isInteger(total) || correct < 0 || total < 1 || total > 20 || correct > total) {
      throw new Error('Invalid lesson score');
    }
    if (!userId) {
      const stats = await recordLesson(correct, total);
      if (alive.current) setGuest(stats);
      return;
    }
    const event: PendingStudyLesson = {
      eventId: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
      correct, total, completedAt, ...(activityKey ? { activityKey } : {}),
    };
    const next = [...queue.current, event];
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    queue.current = next;
    if (alive.current) setPending(next.length);
    // Completion means durable on-device storage, not an unconfirmed cloud save.
    void run(flush);
    });
  };
  const recoverOutbox = () => {
    void run(async () => {
      const damaged = recoveryRef.current;
      if (deleting.current || !alive.current || !userId || !ready.current || !damaged) return;
      setBusy(true);
      try {
        const archivePrefix = `yael-study-outbox-recovery-v1:${userId}:`;
        let archiveKey = `${archivePrefix}${Date.now()}`;
        let suffix = 0;
        while ((await AsyncStorage.getItem(archiveKey)) !== null) {
          suffix += 1;
          archiveKey = `${archivePrefix}${Date.now()}-${suffix}`;
        }
        // Keep the exact original bytes before changing the active queue.
        await AsyncStorage.setItem(archiveKey, damaged.raw);
        await AsyncStorage.setItem(storageKey, JSON.stringify(damaged.validEvents));
        queue.current = damaged.validEvents;
        recoveryRef.current = null;
        if (alive.current) {
          setRecovery(null);
          setPending(damaged.validEvents.length);
          setMessage('');
        }
        await flush();
      } catch {
        if (alive.current) setMessage('تعذّر حفظ نسخة الاستعادة. بقيت البيانات الأصلية كما هي؛ تحقّق من مساحة الجهاز ثم أعد المحاولة.');
      } finally {
        if (alive.current) setBusy(false);
      }
    });
  };
  const decide = (importLocal: boolean) => {
    void run(async () => {
      if (deleting.current || !alive.current || !userId || !ready.current) return;
      setBusy(true);
      try {
        if (importLocal && legacy) {
          const stats = await importMutation.mutateAsync({ data: { eventId: 'legacy-import-v1', stats: legacy } });
          await client.cancelQueries({ queryKey: key, exact: true });
          if (alive.current) client.setQueryData(key, stats);
        }
        await AsyncStorage.setItem(decisionKey, importLocal ? 'imported' : 'keep-cloud');
        migrationNeeded.current = false;
        if (alive.current) { setLegacy(null); setMessage(''); }
        await flush();
      } catch {
        if (alive.current) setMessage('تعذّر الاستيراد. قد يوجد تقدّم سحابي بالفعل أو انقطع الاتصال. نسختك المحلية محفوظة ولم تُستبدل.');
      } finally {
        if (alive.current) setBusy(false);
      }
    });
  };
  return <Context.Provider value={{
    stats: userId ? query.data ?? DEFAULT_STATS : guest,
    loading: !initialized || (!!userId && query.isFetching),
    statsUnavailable: !!userId && query.isError,
    message: message || (query.isError ? 'تعذّر تحميل التقدّم السحابي. الأرقام قد لا تكون محدّثة. حاول مجددًا.' : ''),
    pending, legacy, busy, refresh, save, recovery, recoverOutbox,
    migrate: () => decide(true), keepCloud: () => decide(false),
    pauseForDeletion: async () => {
      deleting.current = true;
      await serial.current;
      await client.cancelQueries({ queryKey: key, exact: true });
      return () => { deleting.current = false; };
    },
  }}>{children}</Context.Provider>;
}
