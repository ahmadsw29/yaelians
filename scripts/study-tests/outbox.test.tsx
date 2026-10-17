import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import { StudyProvider, useStudy } from '../../artifacts/yael-arabic-prep/lib/StudyProvider';
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
