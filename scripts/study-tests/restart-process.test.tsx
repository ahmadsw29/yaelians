import React from 'react';
import { act, create } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { setBaseUrl } from '@workspace/api-client-react';
import { StudyProvider, useStudy } from '../../artifacts/yael-arabic-prep/lib/StudyProvider';
import { disk } from './storage';
import { signIn } from './auth';
import { startServer } from './server';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
test(`independent process ${process.env.STUDY_RESTART_PHASE} restart preserves pending lessons`, async () => {
  const api = await startServer();
  const before = process.env.STUDY_RESTART_PHASE === 'before';
  const key = 'yael-study-outbox-v1:process-restart';
  const persisted = JSON.parse(disk.get(key) ?? '[]');
  expect(persisted).toHaveLength(before ? 0 : 2);
  setBaseUrl(api.url);
  signIn('process-restart');
  if (before) vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  let state!: ReturnType<typeof useStudy>;
  function Probe() { state = useStudy(); return null; }
  let tree!: ReturnType<typeof create>;
  async function until(check: () => void) {
    const deadline = Date.now() + 5000;
    while (true) {
      await act(async () => { await new Promise(r => setTimeout(r, 10)); });
      try { check(); return; } catch (e) { if (Date.now() > deadline) throw e; }
    }
  }
  try {
    await act(async () => {
      tree = create(<QueryClientProvider client={client}><StudyProvider><Probe /></StudyProvider></QueryClientProvider>);
    });
    await until(() => expect(state.loading).toBe(false));
    if (before) {
      await act(async () => { await state.save(2); await state.save(5); });
      await until(() => { expect(state.pending).toBe(2); expect(state.busy).toBe(false); });
      expect(JSON.parse(disk.get(key)!)).toHaveLength(2);
    } else {
      await until(() => { expect(state.pending).toBe(0); expect(state.stats.xp).toBe(70); });
      expect(state.stats).toMatchObject({ lessonsCompleted: 2, answeredQuestions: 10 });
      expect(JSON.parse(disk.get(key)!)).toEqual([]);
      const { db, studyEvents } = await import('@workspace/db');
      const events = (await db.select().from(studyEvents)).filter(e => e.userId === 'process-restart');
      expect(events.map(e => e.eventId).sort()).toEqual(persisted.map((e: { eventId: string }) => e.eventId).sort());
    }
  } finally {
    await act(async () => { tree?.unmount(); });
    client.clear();
    vi.restoreAllMocks();
    setBaseUrl(null);
    await api.close();
  }
});
