import { afterAll, beforeAll, expect, test } from 'vitest';
import { startServer } from './server';
import { db, pool, studyEvents, studyProgress, planActivityClaims, accountPlanAccess } from '@workspace/db';
import { emptyStats } from '../../artifacts/api-server/src/lib/study';

let api: Awaited<ReturnType<typeof startServer>>;
beforeAll(async () => { api = await startServer(); });
afterAll(async () => { await api?.close(); });
const lesson = (eventId: string, correct = 3) => ({
  eventId: `integration-${eventId}`, correct, total: 5, completedAt: new Date().toISOString(),
});
const legacy = { ...emptyStats, xp: 40, correctAnswers: 4, answeredQuestions: 5,
  lessonsCompleted: 1, masteredWords: 4, masteredWordIds: undefined, streak: 1, lastPracticeDate: new Date().toISOString().slice(0, 10) };

test('a free vocabulary claim has one non-resettable five-minute window and no replay after completion', async () => {
  const user = 'five-minute-free';
  const key = 'vocabulary-five-minute-first';
  await api.request(user, 'plan-access', { plan: 'free' }, 'PUT');
  const first = await (await api.request(user, 'plan-access/claims', { activity: 'vocabulary', key })).json();
  expect(first).toMatchObject({ allowed: true, vocabularyRound: { number: 1 } });
  const time = Date.parse(first.vocabularyRound.expiresAt) - Date.parse(first.vocabularyRound.serverNow);
  expect(time).toBeGreaterThan(298_000);
  expect(time).toBeLessThanOrEqual(300_000);
  const retry = await (await api.request(user, 'plan-access/claims', { activity: 'vocabulary', key })).json();
  expect(retry.vocabularyRound.expiresAt).toBe(first.vocabularyRound.expiresAt);
  const attempts = await Promise.all(['second', 'third', 'fourth'].map(suffix =>
    api.request(user, 'plan-access/claims', { activity: 'vocabulary', key: `vocabulary-five-minute-${suffix}` }).then(res => res.json())));
  expect(attempts.every(value => !value.allowed)).toBe(true);
  await api.request(user, 'lessons', { ...lesson('finished-five-minute'), activityKey: key });
  expect(await (await api.request(user, 'plan-access/claims', { activity: 'vocabulary', key })).json()).toMatchObject({ allowed: false });
  await api.request('expired-five-minute', 'plan-access', { plan: 'free' }, 'PUT');
  await api.request('expired-five-minute', 'plan-access/claims', { activity: 'vocabulary', key });
  await pool.query('UPDATE plan_activity_claims SET started_at = $1 WHERE user_id = $2 AND activity_key = $3',
    [new Date(Date.now() - 301_000), 'expired-five-minute', key]);
  expect(await (await api.request('expired-five-minute', 'plan-access/claims', { activity: 'vocabulary', key })).json()).toMatchObject({ allowed: false, vocabularyRound: null });
});

test('server-granted premium has unlimited claims and cannot be self-assigned or overwritten', async () => {
  await db.insert(accountPlanAccess).values({ userId: 'premium-owner', plan: 'premium' });
  expect(await (await api.request('premium-owner', 'plan-access')).json()).toMatchObject({ plan: 'premium' });
  for (const activity of ['vocabulary', 'timed-section']) {
    for (let i = 0; i < 3; i++) {
      const response = await api.request('premium-owner', 'plan-access/claims', { activity, key: `premium-${activity}-${i}` });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ allowed: true, access: { plan: 'premium' } });
    }
  }
  expect(await (await api.request('premium-owner', 'plan-access', { plan: 'free' }, 'PUT')).json())
    .toMatchObject({ plan: 'premium' });
  expect(await (await api.request('premium-owner', 'lessons', lesson('premium-unlimited-round'))).json())
    .toMatchObject({ progressCredited: true, stats: { lessonsCompleted: 1, xp: 30 } });
  expect((await api.request('unprivileged', 'plan-access', { plan: 'premium' }, 'PUT')).status).toBe(400);
  expect((await api.request(null, 'plan-access')).status).toBe(401);
  expect(await (await api.request('unprivileged', 'plan-access')).json()).toMatchObject({ plan: null });
  expect((await api.request('unprivileged', 'plan-access', { plan: 'free' }, 'PUT')).status).toBe(200);
  expect(await (await api.request('unprivileged', 'plan-access/claims', { activity: 'vocabulary', key: 'free-first-round-0001' })).json())
    .toMatchObject({ allowed: true, access: { plan: 'free' } });
  expect(await (await api.request('unprivileged', 'plan-access/claims', { activity: 'vocabulary', key: 'free-second-round-0002' })).json())
    .toMatchObject({ allowed: false, access: { plan: 'free' } });
});

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
  expect(await (await api.request('legacy-race')).json()).toEqual({
    ...winner.stats, masteredWords: 0, masteredWordIds: [],
  });
  expect((await api.request('legacy-race', 'import', winner)).status).toBe(200);
  await api.request('legacy-race', 'lessons', lesson('new-work'));
  expect((await api.request('legacy-race', 'import', { ...winner, eventId: 'integration-another-import' })).status).toBe(409);
  expect(await (await api.request('legacy-race')).json()).toMatchObject({
    lessonsCompleted: 2, xp: winner.stats.xp + 30,
  });
});

test('mastery is a per-account union across rounds, retries and concurrent devices, not a score', async () => {
  const first = { ...lesson('mastery-first', 3), masteredWordIds: ['שלום', 'שלום', ' ספר '] };
  expect((await api.request('word-mastery', 'lessons', first)).status).toBe(200);
  expect((await api.request('word-mastery', 'lessons', first)).status).toBe(200);
  const responses = await Promise.all(Array.from({ length: 8 }, (_, i) =>
    api.request('word-mastery', 'lessons', {
      ...lesson(`mastery-device-${i}`, 2), masteredWordIds: ['ספר', 'בית'],
    })));
  expect(responses.every(r => r.status === 200)).toBe(true);
  expect(await (await api.request('word-mastery')).json()).toMatchObject({
    masteredWords: 3, masteredWordIds: ['שלום', 'ספר', 'בית'],
    lessonsCompleted: 9, correctAnswers: 19, xp: 190,
  });
  // Reading answers and older clients still earn XP, but cannot prove new vocabulary.
  await api.request('word-mastery', 'lessons', { ...lesson('mastery-reading'), masteredWordIds: [] });
  await api.request('word-mastery', 'lessons', lesson('mastery-old-client'));
  expect(await (await api.request('word-mastery')).json()).toMatchObject({ masteredWords: 3, xp: 250 });
  await api.request('word-mastery-other', 'lessons', first);
  expect(await (await api.request('word-mastery-other')).json()).toMatchObject({ masteredWords: 2 });
});

test('mastery identities are validated before writing and cannot bypass a free-plan claim', async () => {
  for (const ids of [[''], ['   '], ['a'.repeat(101)], ['a', 'b', 'c', 'd'], [42]]) {
    expect((await api.request('bad-word-ids', 'lessons', {
      ...lesson('mastery-invalid'), masteredWordIds: ids,
    })).status).toBe(400);
  }
  await api.request('mastery-free', 'plan-access', { plan: 'free' }, 'PUT');
  expect(await (await api.request('mastery-free', 'lessons', {
    ...lesson('mastery-unclaimed'), masteredWordIds: ['שלום'],
  })).json()).toMatchObject({ progressCredited: false, stats: { masteredWords: 0, masteredWordIds: [] } });
});

test('legacy counters are not treated as known words; lessons and XP survive normalization', async () => {
  await db.insert(studyProgress).values({ userId: 'pre-mastery', stats: legacy });
  expect(await (await api.request('pre-mastery')).json()).toMatchObject({
    masteredWords: 0, masteredWordIds: [], xp: 40, lessonsCompleted: 1,
  });
  await api.request('pre-mastery', 'lessons', { ...lesson('mastery-after-upgrade'), masteredWordIds: ['שלום'] });
  expect(await (await api.request('pre-mastery')).json()).toMatchObject({
    masteredWords: 1, masteredWordIds: ['שלום'], xp: 70, lessonsCompleted: 2,
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
