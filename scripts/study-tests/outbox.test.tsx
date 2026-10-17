import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import { StudyProvider, useStudy } from '../../artifacts/yael-arabic-prep/lib/StudyProvider';
import { finishLocalDeletion } from '../../artifacts/yael-arabic-prep/lib/deletionStorage';
import { DEFAULT_STATS } from '../../artifacts/yael-arabic-prep/lib/study';
import { auth, clerk, signIn } from './auth';
import storage, { disk } from './storage';
import { startServer } from './server';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let api: Awaited<ReturnType<typeof startServer>>;
let tree: ReactTestRenderer | undefined;
let client: QueryClient;
let state: ReturnType<typeof useStudy>;
const realFetch = globalThis.fetch;
let offline = false;
let dropAck = false;
let holdAck: ReturnType<typeof deferred> | undefined;
let posts: { user: string | null; body: any }[] = [];
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(r => { resolve = r; });
  return { promise, resolve };
}
const outbox = (user: string) => `yael-study-outbox-v1:${user}`;
const recoveryPrefix = (user: string) => `yael-study-outbox-recovery-v1:${user}:`;
const legacyKey = (user: string) => `yael-study-stats-v1:${user}`;
const decisionKey = (user: string) => `yael-study-migration-v1:${user}`;
const savedQueue = (user: string) => JSON.parse(disk.get(outbox(user)) ?? '[]');
const legacy = { ...DEFAULT_STATS, lessonsCompleted: 1, answeredQuestions: 5,
  correctAnswers: 4, masteredWords: 4, xp: 40, streak: 1,
  lastPracticeDate: new Date().toISOString().slice(0, 10) };
function Probe() { state = useStudy(); return null; }
function view() {
  return <QueryClientProvider client={client}><StudyProvider><Probe /></StudyProvider></QueryClientProvider>;
}
async function until(check: () => void) {
  const deadline = Date.now() + 5000;
  while (true) {
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    try { check(); return; } catch (error) { if (Date.now() > deadline) throw error; }
  }
}
async function mount(user: string | null) {
  signIn(user);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  await act(async () => { tree = create(view()); });
  await until(() => expect(state.loading).toBe(false));
}
async function unmount() {
  await act(async () => { tree?.unmount(); });
  tree = undefined;
  client?.clear();
}
async function switchTo(user: string | null) {
  signIn(user);
  await act(async () => { tree!.update(view()); });
  await until(() => expect(state.loading).toBe(false));
}
async function save(correct: number) { await act(async () => { await state.save(correct); }); }
async function cloud(user: string) { return (await api.request(user)).json(); }

beforeAll(async () => {
  api = await startServer();
  setBaseUrl(api.url);
  // A global token for another account must never override the provider's pinned token.
  setAuthTokenGetter(() => 'unrelated-global-session');
});
beforeEach(() => {
  disk.clear();
  posts = []; offline = false; dropAck = false; holdAck = undefined;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const isWrite = options?.method === 'POST';
    if (isWrite) posts.push({
      user: new Headers(options?.headers).get('Authorization'),
      body: JSON.parse(String(options?.body)),
    });
    if (offline) throw new Error('Simulated offline device');
    const response = await realFetch(input, options);
    if (isWrite && holdAck) await holdAck.promise;
    if (isWrite && dropAck) throw new Error('Connection lost after database commit');
    return response;
  });
});
afterEach(async () => {
  holdAck?.resolve();
  await unmount();
  vi.restoreAllMocks();
  signIn(null);
});
afterAll(async () => { setBaseUrl(null); setAuthTokenGetter(null); await api?.close(); });

test('pending lessons survive provider/process-state restart and drain exactly once', async () => {
  offline = true;
  await mount('restart');
  await save(3);
  await save(4);
  await until(() => { expect(state.pending).toBe(2); expect(state.busy).toBe(false); });
  const durable = savedQueue('restart');
  expect(durable).toHaveLength(2);
  expect(new Set(durable.map((e: any) => e.eventId)).size).toBe(2);
  expect(durable.every((e: any) => e.completedAt && e.total === 5)).toBe(true);
  await unmount(); // all React refs, queue and query cache are discarded; disk survives
  offline = false;
  posts = [];
  await mount('restart');
  await until(() => { expect(state.pending).toBe(0); expect(state.stats.lessonsCompleted).toBe(2); });
  expect(posts.map(p => p.body)).toEqual(durable);
  expect(savedQueue('restart')).toEqual([]);
  expect(await cloud('restart')).toMatchObject({ lessonsCompleted: 2, xp: 70, answeredQuestions: 10 });
});

test('malformed outbox JSON is preserved until the user archives it and chooses to continue', async () => {
  const raw = '[{"eventId":';
  disk.set(outbox('malformed-json'), raw);
  await mount('malformed-json');
  expect(state.recovery).toMatchObject({ validCount: 0, problem: 'invalid-json' });
  expect(disk.get(outbox('malformed-json'))).toBe(raw);
  expect(posts).toEqual([]);

  await act(async () => { state.recoverOutbox(); });
  await until(() => expect(state.recovery).toBeNull());
  expect(disk.get(outbox('malformed-json'))).toBe('[]');
  expect([...disk.entries()].find(([key]) => key.startsWith(recoveryPrefix('malformed-json')))?.[1]).toBe(raw);

  await save(4);
  await until(() => expect(state.stats.xp).toBe(40));
  expect(posts).toHaveLength(1);
});

test('empty stored text is treated as damaged JSON rather than a missing queue', async () => {
  disk.set(outbox('empty-string'), '');
  await mount('empty-string');
  expect(state.recovery).toMatchObject({ validCount: 0, problem: 'invalid-json' });
  expect(disk.get(outbox('empty-string'))).toBe('');

  await act(async () => { state.recoverOutbox(); });
  await until(() => expect(state.recovery).toBeNull());
  expect([...disk.entries()].find(([key]) => key.startsWith(recoveryPrefix('empty-string')))?.[1]).toBe('');
  expect(disk.get(outbox('empty-string'))).toBe('[]');
});

test('invalid queued lessons stay in an exact recovery copy while valid lessons sync after confirmation', async () => {
  const valid = [
    { eventId: 'recovered-lesson-0001', correct: 2, total: 5, completedAt: '2026-10-17T10:00:00.000Z' },
    { eventId: 'recovered-lesson-0002', correct: 4, total: 5 },
  ];
  const invalid = { eventId: 'bad-lesson-0000001', correct: 6, total: 5 };
  const raw = JSON.stringify([valid[0], invalid, valid[1]]);
  disk.set(outbox('invalid-events'), raw);
  await mount('invalid-events');
  expect(state.recovery).toMatchObject({ validCount: 2, invalidCount: 1, problem: 'invalid-events' });
  expect(state.pending).toBe(2);
  expect(posts).toEqual([]);
  expect(disk.get(outbox('invalid-events'))).toBe(raw);

  await act(async () => { state.recoverOutbox(); });
  await until(() => { expect(state.recovery).toBeNull(); expect(state.pending).toBe(0); });
  expect([...disk.entries()].find(([key]) => key.startsWith(recoveryPrefix('invalid-events')))?.[1]).toBe(raw);
  expect(posts.map(post => post.body)).toEqual(valid);
  expect(disk.get(outbox('invalid-events'))).toBe('[]');
  expect(await cloud('invalid-events')).toMatchObject({ lessonsCompleted: 2, xp: 60 });
});

test('a failed recovery archive write leaves the damaged outbox and recovery choice intact', async () => {
  const raw = JSON.stringify([{ eventId: 'damaged-event-00001', correct: 2, total: 5 }, null]);
  disk.set(outbox('archive-failure'), raw);
  await mount('archive-failure');
  vi.spyOn(storage, 'setItem').mockRejectedValueOnce(new Error('Disk full'));
  await act(async () => { state.recoverOutbox(); });
  await until(() => expect(state.message).not.toBe(''));
  expect(state.recovery).toMatchObject({ validCount: 1, invalidCount: 1 });
  expect(disk.get(outbox('archive-failure'))).toBe(raw);
  expect([...disk.keys()].some(key => key.startsWith(recoveryPrefix('archive-failure')))).toBe(false);
  expect(posts).toEqual([]);
});

test('a failed active-queue replacement keeps both the original and its archived copy', async () => {
  const raw = JSON.stringify([{ eventId: 'preserve-event-00001', correct: 3, total: 5 }, null]);
  disk.set(outbox('replace-failure'), raw);
  await mount('replace-failure');
  const setItem = storage.setItem.bind(storage);
  vi.spyOn(storage, 'setItem').mockImplementation(async (key, value) => {
    if (key === outbox('replace-failure')) throw new Error('Disk full');
    await setItem(key, value);
  });
  await act(async () => { state.recoverOutbox(); });
  await until(() => expect(state.message).not.toBe(''));
  expect(state.recovery).toMatchObject({ validCount: 1, invalidCount: 1 });
  expect(disk.get(outbox('replace-failure'))).toBe(raw);
  expect([...disk.entries()].find(([key]) => key.startsWith(recoveryPrefix('replace-failure')))?.[1]).toBe(raw);
  expect(posts).toEqual([]);
});

test('account deletion also removes that account’s archived damaged outboxes only', async () => {
  const deletedArchive = 'yael-study-outbox-recovery-v1:deleted-user:1';
  const otherArchive = 'yael-study-outbox-recovery-v1:other-user:1';
  const disk = new Map([
    [deletedArchive, '[damaged]'],
    [otherArchive, '[other account]'],
    ['yael-study-outbox-v1:deleted-user', '[]'],
  ]);
  const storage = {
    getAllKeys: async () => [...disk.keys()],
    getItem: async (key: string) => disk.get(key) ?? null,
    setItem: async (key: string, value: string) => { disk.set(key, value); },
    removeItem: async (key: string) => { disk.delete(key); },
    multiRemove: async (keys: string[]) => { keys.forEach(key => disk.delete(key)); },
  };
  await finishLocalDeletion(storage, {
    userId: 'deleted-user', sessionId: 'deleted-session', status: 'accepted',
  }, async () => {});
  expect(disk.has(deletedArchive)).toBe(false);
  expect(disk.has('yael-study-outbox-v1:deleted-user')).toBe(false);
  expect(disk.get(otherArchive)).toBe('[other account]');
});

test('lost server acknowledgment leaves the original event durable and restart retries it safely', async () => {
  await mount('ack-loss');
  dropAck = true;
  await save(5);
  await until(() => { expect(state.message).not.toBe(''); expect(state.busy).toBe(false); });
  const [original] = savedQueue('ack-loss');
  expect(await cloud('ack-loss')).toMatchObject({ lessonsCompleted: 1, xp: 50 });
  await unmount();
  dropAck = false;
  await mount('ack-loss');
  await until(() => { expect(state.pending).toBe(0); expect(state.stats.xp).toBe(50); });
  expect(posts.map(p => p.body)).toEqual([original, original]);
  expect(await cloud('ack-loss')).toMatchObject({ lessonsCompleted: 1, xp: 50 });
});

test('switching accounts while token lookup is pending never sends the old lesson under the new identity', async () => {
  await mount('token-old');
  const gate = deferred();
  let requested = false;
  clerk.session!.getToken = async () => { requested = true; await gate.promise; return 'token-old'; };
  await save(2);
  await until(() => expect(requested).toBe(true));
  await switchTo('token-new');
  gate.resolve();
  await until(() => expect(client.getQueryData(['study', 'token-old'])).toBeUndefined());
  await save(4);
  await until(() => expect(state.stats.xp).toBe(40));
  expect(posts.map(p => p.user)).toEqual(['Bearer token-new']);
  expect(savedQueue('token-old')).toHaveLength(1);
  expect(await cloud('token-old')).toEqual(DEFAULT_STATS);
  await switchTo('token-old');
  await until(() => expect(state.stats.xp).toBe(20));
  expect(savedQueue('token-old')).toEqual([]);
  expect(await cloud('token-new')).toMatchObject({ xp: 40, lessonsCompleted: 1 });
});

test('late response after account switch cannot populate the new account or resurrect the old cache', async () => {
  await mount('response-old');
  holdAck = deferred();
  await save(3);
  await until(() => expect(posts).toHaveLength(1));
  await switchTo('response-new');
  expect(state.stats).toEqual(DEFAULT_STATS);
  holdAck.resolve();
  await until(() => expect(savedQueue('response-old')).toEqual([]));
  expect(client.getQueryData(['study', 'response-old'])).toBeUndefined();
  expect(state.stats).toEqual(DEFAULT_STATS);
  expect(await cloud('response-old')).toMatchObject({ xp: 30, lessonsCompleted: 1 });
  expect(await cloud('response-new')).toEqual(DEFAULT_STATS);
});

test('guest progress stays local through sign-in, account changes and sign-out', async () => {
  await mount(null);
  await save(2);
  expect(state.stats.xp).toBe(20);
  const guestSnapshot = disk.get('yael-study-stats-v1');
  expect(posts).toEqual([]);
  await switchTo('guest-boundary');
  expect(state.stats).toEqual(DEFAULT_STATS);
  expect(state.legacy).toBeNull();
  await save(5);
  await until(() => expect(state.stats.xp).toBe(50));
  expect(disk.get('yael-study-stats-v1')).toBe(guestSnapshot);
  await switchTo(null);
  expect(state.stats.xp).toBe(20);
  expect(posts.map(p => p.user)).toEqual(['Bearer guest-boundary']);
  expect(auth.userId).toBeNull();
});

test('conflicting legacy import preserves the snapshot and holds pending lessons until explicit keep-cloud', async () => {
  expect((await api.request('migration', 'lessons', { eventId: 'integration-another-device', correct: 2, total: 5 })).status).toBe(200);
  posts = [];
  disk.set(legacyKey('migration'), JSON.stringify(legacy));
  await mount('migration');
  await save(3);
  expect(state.legacy).toEqual(legacy);
  expect(posts).toEqual([]);
  await act(async () => { state.migrate(); });
  await until(() => { expect(state.message).not.toBe(''); expect(state.busy).toBe(false); });
  expect(state.legacy).toEqual(legacy);
  expect(savedQueue('migration')).toHaveLength(1);
  expect(disk.has(decisionKey('migration'))).toBe(false);
  expect(await cloud('migration')).toMatchObject({ xp: 20, lessonsCompleted: 1 });
  await act(async () => { state.keepCloud(); });
  await until(() => { expect(state.pending).toBe(0); expect(state.stats.xp).toBe(50); });
  expect(disk.get(legacyKey('migration'))).toBe(JSON.stringify(legacy));
  expect(disk.get(decisionKey('migration'))).toBe('keep-cloud');
  expect(state.legacy).toBeNull();
});

test('storage failure never reports a lesson as durably saved or sends it to the server', async () => {
  await mount('disk-failure');
  vi.spyOn(storage, 'setItem').mockRejectedValueOnce(new Error('Disk full'));
  await act(async () => { await expect(state.save(3)).rejects.toThrow('Disk full'); });
  expect(posts).toEqual([]);
  expect(savedQueue('disk-failure')).toEqual([]);
  expect(state.pending).toBe(0);
});
