import { afterAll, beforeAll, expect, test } from 'vitest';
import { startServer } from './server';
import { db, studyEvents, studyProgress, planActivityClaims } from '@workspace/db';
import { emptyStats } from '../../artifacts/api-server/src/lib/study';

let api: Awaited<ReturnType<typeof startServer>>;
beforeAll(async () => { api = await startServer(); });
afterAll(async () => { await api?.close(); });
const lesson = (eventId: string, correct = 3) => ({
  eventId: `integration-${eventId}`, correct, total: 5, completedAt: new Date().toISOString(),
});
const legacy = { ...emptyStats, xp: 40, correctAnswers: 4, answeredQuestions: 5,
  lessonsCompleted: 1, masteredWords: 4, streak: 1, lastPracticeDate: new Date().toISOString().slice(0, 10) };

test('concurrent devices serialize distinct lessons without losing increments', async () => {
  const responses = await Promise.all(Array.from({ length: 16 }, (_, i) =>
    api.request('concurrent', 'lessons', lesson(`device-${i}`, i % 5))));
  expect(responses.map(r => r.status)).toEqual(Array(16).fill(200));
  expect(await (await api.request('concurrent')).json()).toMatchObject({
    lessonsCompleted: 16, answeredQuestions: 80, correctAnswers: 30, xp: 300, streak: 1,
  });
});

test('lost acknowledgment and simultaneous retries apply an event exactly once', async () => {
  const event = lesson('lost-ack');
  expect((await api.request('retry', 'lessons', event)).status).toBe(200); // discard reply
  const responses = await Promise.all(Array.from({ length: 8 }, () => api.request('retry', 'lessons', event)));
  expect(responses.every(r => r.status === 200)).toBe(true);
  expect(await (await api.request('retry')).json()).toMatchObject({ lessonsCompleted: 1, xp: 30 });
  expect((await api.request('retry', 'lessons', { ...event, correct: 4 })).status).toBe(409);
  // Event IDs are scoped to accounts, not globally.
  expect((await api.request('other-account', 'lessons', event)).status).toBe(200);
  const events = await db.select().from(studyEvents);
  expect(events.filter(e => e.userId === 'retry')).toHaveLength(1);
  expect(events.find(e => e.userId === 'retry')?.practiceDate).toBe(event.completedAt.slice(0, 10));
});

test('variable-size lessons record their actual question totals and reject inconsistent scores', async () => {
  const event = {
    eventId: 'variable-total-lesson-0001',
    correct: 12,
    total: 20,
    completedAt: new Date().toISOString(),
  };
  expect((await api.request('variable-total', 'lessons', event)).status).toBe(200);
  expect(await (await api.request('variable-total')).json()).toMatchObject({
    lessonsCompleted: 1, answeredQuestions: 20, correctAnswers: 12, xp: 120,
  });
  expect((await api.request('invalid-total', 'lessons', { ...event, eventId: 'invalid-total-lesson-0001', total: 0 })).status).toBe(400);
  expect((await api.request('invalid-score', 'lessons', { ...event, eventId: 'invalid-score-lesson-0001', correct: 22 })).status).toBe(400);
});

test('guest reads/writes and forged owner fields cannot touch account progress', async () => {
  const before = await db.select().from(studyProgress);
  expect((await api.request(null)).status).toBe(401);
  expect((await api.request(null, 'lessons', lesson('guest'))).status).toBe(401);
  expect((await api.request(null, 'import', { eventId: 'guest-import', stats: legacy })).status).toBe(401);
  expect((await api.request('attacker', 'lessons', { ...lesson('forged'), userId: 'retry' })).status).toBe(400);
  expect(await db.select().from(studyProgress)).toEqual(before);
});

test('conflicting legacy imports have one winner and cannot replace newer lessons', async () => {
  const imports = [
    { eventId: 'legacy-import-v1', stats: legacy },
    { eventId: 'legacy-import-v1', stats: { ...legacy, xp: 20, correctAnswers: 2, masteredWords: 2 } },
  ];
  const results = await Promise.all(imports.map(data => api.request('legacy-race', 'import', data)));
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
  const winner = imports[results.findIndex(r => r.status === 200)];
  expect(await (await api.request('legacy-race')).json()).toEqual(winner.stats);
  expect((await api.request('legacy-race', 'import', winner)).status).toBe(200);
  await api.request('legacy-race', 'lessons', lesson('new-work'));
  expect((await api.request('legacy-race', 'import', { ...winner, eventId: 'integration-another-import' })).status).toBe(409);
  expect(await (await api.request('legacy-race')).json()).toMatchObject({
    lessonsCompleted: 2, xp: winner.stats.xp + 30,
  });
});

test('import racing a new lesson preserves the lesson whichever wins the lock', async () => {
  const [imported, saved] = await Promise.all([
    api.request('mixed-race', 'import', { eventId: 'legacy-import-v1', stats: legacy }),
    api.request('mixed-race', 'lessons', lesson('new-lesson')),
  ]);
  expect(saved.status).toBe(200);
  expect([200, 409]).toContain(imported.status);
  expect(await (await api.request('mixed-race')).json()).toMatchObject({
    lessonsCompleted: imported.status === 200 ? 2 : 1,
    xp: imported.status === 200 ? 70 : 30,
  });
});

test('free plan and daily limits persist account-wide and only a claimed vocabulary round earns progress', async () => {
  const choose = await api.request('plan-sync', 'plan-access', { plan: 'free' }, 'PUT');
  expect(choose.status).toBe(200);
  expect(await (await api.request('plan-sync', 'plan-access')).json()).toMatchObject({
    plan: 'free', usage: { vocabularyRounds: 0, timedSections: 0 },
  });

  const vocabKeys = Array.from({ length: 8 }, (_, i) => `vocabulary-claim-${i.toString().padStart(3, '0')}`);
  const vocabClaims = await Promise.all(vocabKeys.map(key =>
    api.request('plan-sync', 'plan-access/claims', { activity: 'vocabulary', key })));
  const vocabResults = await Promise.all(vocabClaims.map(response => response.json() as Promise<{ allowed: boolean }>));
  expect(vocabResults.filter(result => result.allowed)).toHaveLength(1);
  const allowedVocabKey = vocabKeys[vocabResults.findIndex(result => result.allowed)];
  expect((await (await api.request('plan-sync', 'plan-access')).json()).usage.vocabularyRounds).toBe(1);
  expect((await api.request('plan-sync', 'plan-access/claims', { activity: 'vocabulary', key: allowedVocabKey })).status).toBe(200);

  const timedKeys = ['timed-claim-section-one-0001', 'timed-claim-section-two-0002'];
  const timedResults = await Promise.all(timedKeys.map(async key =>
    (await api.request('plan-sync', 'plan-access/claims', { activity: 'timed-section', key })).json() as Promise<{ allowed: boolean }>));
  expect(timedResults.filter(result => result.allowed)).toHaveLength(1);
  const usage = await (await api.request('plan-sync', 'plan-access')).json();
  expect(usage.usage).toMatchObject({ vocabularyRounds: 1, timedSections: 1 });
  expect(usage.usage.timedKeys).toHaveLength(1);

  const credited = {
    ...lesson('plan-credit'),
    activityKey: allowedVocabKey,
  };
  const first = await (await api.request('plan-sync', 'lessons', credited)).json();
  expect(first.progressCredited).toBe(true);
  expect(first.stats.lessonsCompleted).toBe(1);
  expect((await (await api.request('plan-sync', 'lessons', credited)).json()).progressCredited).toBe(true);

  const reusingClaim = {
    ...lesson('plan-credit-reuse'),
    activityKey: allowedVocabKey,
  };
  const reused = await (await api.request('plan-sync', 'lessons', reusingClaim)).json();
  expect(reused.progressCredited).toBe(false);
  expect(reused.stats.lessonsCompleted).toBe(1);

  const bypass = await (await api.request('plan-sync', 'lessons', lesson('plan-credit-bypass'))).json();
  expect(bypass.progressCredited).toBe(false);
  expect(bypass.stats.lessonsCompleted).toBe(1);
  expect((await api.request('plan-sync', 'plan-access', { plan: 'free' }, 'PUT')).status).toBe(200);
  expect(await (await api.request('plan-sync', 'plan-access')).json()).toMatchObject({
    plan: 'free', usage: { vocabularyRounds: 1, timedSections: 1 },
  });
  expect(await db.select().from(planActivityClaims).then(rows => rows.filter(row => row.userId === 'plan-sync'))).toHaveLength(2);
});
