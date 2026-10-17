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

type StudyContext = {
  stats: StudyStats; loading: boolean; message: string; pending: number;
  legacy: StudyStats | null; busy: boolean;
  refresh: () => void; save: (correct: number) => Promise<void>;
  migrate: () => void; keepCloud: () => void;
  pauseForDeletion: () => Promise<() => void>;
};
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
  const [guest, setGuest] = useState(DEFAULT_STATS);
  const [legacy, setLegacy] = useState<StudyStats | null>(null);
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);

  // Pin each request to this provider's account, never the global token getter.
  const authOptions = async () => {
    const session = clerk.session;
    if (deleting.current || !alive.current || !userId || session?.user.id !== userId) throw new Error('Account changed');
    const token = await session.getToken();
    if (!token || !alive.current || clerk.session?.id !== session.id) throw new Error('Sign in again');
    return { headers: { Authorization: `Bearer ${token}` }, credentials: 'omit' as const };
  };
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
    if (deleting.current || !userId || !ready.current || migrationNeeded.current || !alive.current) return;
    setBusy(true);
    try {
      while (queue.current.length && alive.current) {
        const event = queue.current[0];
        const stats = await lessonMutation.mutateAsync({ data: event });
        const remaining = queue.current.slice(1);
        // Persist removal only after server acknowledgment; event IDs make retries safe.
        await AsyncStorage.setItem(storageKey, JSON.stringify(remaining));
        queue.current = remaining;
        if (alive.current) {
          setPending(remaining.length);
          await client.cancelQueries({ queryKey: key, exact: true });
        }
        if (alive.current) {
          client.setQueryData(key, stats);
        }
      }
      if (alive.current) setMessage('');
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
          const parsed = outbox ? JSON.parse(outbox) : [];
          if (!Array.isArray(parsed)) throw new Error('Invalid outbox');
          queue.current = parsed;
          const previous = old ? JSON.parse(old) as StudyStats : null;
          migrationNeeded.current = !decision && !!previous?.lessonsCompleted;
          if (alive.current) {
            setPending(parsed.length);
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

  const save = (correct: number) => {
    // Capture at completion, before waiting behind an in-flight sync operation.
    const completedAt = new Date().toISOString();
    return run(async () => {
    if (deleting.current || !ready.current || !alive.current) throw new Error('Progress is not ready');
    if (!userId) {
      const stats = await recordLesson(correct, 5);
      if (alive.current) setGuest(stats);
      return;
    }
    const event: StudyLessonInput = { eventId: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`, correct, total: 5, completedAt };
    const next = [...queue.current, event];
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    queue.current = next;
    if (alive.current) setPending(next.length);
    // Completion means durable on-device storage, not an unconfirmed cloud save.
    void run(flush);
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
    loading: !initialized || (!!userId && query.isLoading),
    message: message || (query.isError ? 'تعذّر تحميل التقدّم السحابي. الأرقام قد لا تكون محدّثة. حاول مجددًا.' : ''),
    pending, legacy, busy, refresh, save,
    migrate: () => decide(true), keepCloud: () => decide(false),
    pauseForDeletion: async () => {
      deleting.current = true;
      await serial.current;
      await client.cancelQueries({ queryKey: key, exact: true });
      return () => { deleting.current = false; };
    },
  }}>{children}</Context.Provider>;
}
