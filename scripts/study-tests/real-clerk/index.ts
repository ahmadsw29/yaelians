import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { createClerkClient } from '@clerk/backend';
import { getStudyStats, saveStudyLesson, setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { getStudyAuthOptions, type StudyAuthSession } from '../../../artifacts/yael-arabic-prep/lib/study-auth';

const secretKey = process.env.CLERK_SECRET_KEY;
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
if (!secretKey?.startsWith('sk_test_') || !publishableKey?.startsWith('pk_test_')) {
  throw new Error('Real Clerk verification requires development keys only.');
}
if (process.env.STUDY_TEST_DATABASE !== 'isolated'
  || !process.env.DATABASE_URL?.includes('/tmp/yael-study-clerk-tests.')) {
  throw new Error('Run pnpm test:study:clerk; the application database is not allowed.');
}

const clerk = createClerkClient({ secretKey, publishableKey });
const runId = randomUUID();
const ownedUserIds: string[] = [];
const ownedSessionIds: string[] = [];
const originalFetch = globalThis.fetch;
let apiServer: Server | undefined;

function sessionView(userId: string, sessionId: string): StudyAuthSession {
  return {
    id: sessionId,
    user: { id: userId },
    getToken: async () => (await clerk.sessions.getToken(sessionId)).jwt,
  };
}

function tokenClaims(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  assert.ok(payload, 'Clerk returned a malformed JWT');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
}

function assertSessionHeader(header: string, userId: string, sessionId: string) {
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const claims = token ? tokenClaims(token) : {};
  assert.ok(
    claims.sub === userId && claims.sid === sessionId,
    'generated API request did not carry the expected Clerk user and session',
  );
}

async function expectApiStatus(work: () => Promise<unknown>, status: number) {
  try {
    await work();
  } catch (error) {
    assert.equal((error as { status?: number }).status, status);
    return;
  }
  assert.fail(`Expected the authenticated API to return ${status}`);
}

async function getStatsWithRevokedSession(headers: HeadersInit) {
  try {
    return await getStudyStats({ headers, credentials: 'omit' });
  } catch (error) {
    assert.ok(
      (error as { status?: number }).status === 401,
      'a revoked-session request may only succeed or fail as unauthenticated',
    );
    return null;
  }
}

async function listen(server: Server): Promise<number> {
  if (!server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.once('listening', () => resolve());
    });
  }
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return address.port;
}

async function main() {
  const tag = `yael-study-auth-${runId.slice(0, 12)}`;
  const createdUsers = [];
  for (const suffix of ['a', 'b']) {
    const user = await clerk.users.createUser({
      externalId: `${tag}-${suffix}`,
      emailAddress: [`${tag}-${suffix}@example.com`],
      password: randomBytes(32).toString('hex'),
      skipPasswordChecks: true,
      username: `yael_${runId.replaceAll('-', '').slice(0, 12)}_${suffix}`,
      privateMetadata: { integrationTest: 'study-clerk-auth', runId },
    });
    ownedUserIds.push(user.id);
    createdUsers.push(user);
  }

  const userA = createdUsers[0];
  const userB = createdUsers[1];
  assert.ok(userA && userB);
  const sessionA = await clerk.sessions.createSession({ userId: userA.id });
  ownedSessionIds.push(sessionA.id);
  const sessionB = await clerk.sessions.createSession({ userId: userB.id });
  ownedSessionIds.push(sessionB.id);
  const sessionAView = sessionView(userA.id, sessionA.id);
  const sessionBView = sessionView(userB.id, sessionB.id);
  const tokenA = await sessionAView.getToken();
  const tokenB = await sessionBView.getToken();
  assert.ok(tokenA);
  assert.ok(tokenB);
  assert.equal(tokenClaims(tokenA).sub, userA.id, 'session A token subject matches its Clerk user');
  assert.equal(tokenClaims(tokenA).sid, sessionA.id, 'session A token is tied to the live Clerk session');
  assert.equal(tokenClaims(tokenB).sub, userB.id, 'session B token subject matches its Clerk user');
  assert.equal(tokenClaims(tokenB).sid, sessionB.id, 'session B token is tied to its own Clerk session');

  const app = (await import('../../../artifacts/api-server/src/app')).default;
  const server = app.listen(0, '127.0.0.1');
  apiServer = server;
  const port = await listen(server);
  setBaseUrl(`http://127.0.0.1:${port}`);

  const requestHeaders: string[] = [];
  globalThis.fetch = async (input, init) => {
    const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (requestUrl.includes('/api/study/')) {
      requestHeaders.push(new Headers(init?.headers).get('Authorization') ?? '');
    }
    return originalFetch(input, init);
  };

  let activeSession: StudyAuthSession | null = null;
  let providerActive = false;

  // An absent provider session must not fall through to the app-wide token getter.
  setAuthTokenGetter(null);
  await expectApiStatus(() => getStudyStats(), 401);
  await assert.rejects(
    getStudyAuthOptions(() => activeSession, null, () => providerActive),
    /Account changed/,
  );

  activeSession = sessionAView;
  providerActive = true;
  // The app configures a global getter too. Explicit provider headers must win
  // even when it currently points at a different, valid Clerk user.
  setAuthTokenGetter(() => tokenB);
  const optionsA = await getStudyAuthOptions(() => activeSession, userA.id, () => providerActive);
  assertSessionHeader(new Headers(optionsA.headers).get('Authorization') ?? '', userA.id, sessionA.id);
  const initialA = await getStudyStats(optionsA);
  assert.equal(initialA.lessonsCompleted, 0);
  const lesson = {
    eventId: `real-clerk-${runId}`,
    correct: 4,
    total: 5,
    completedAt: new Date().toISOString(),
  };
  const savedA = await saveStudyLesson(lesson, optionsA);
  assert.equal(savedA.lessonsCompleted, 1);
  assert.equal(savedA.xp, 40);
  assert.ok(
    requestHeaders.slice(-2).every(header => {
      const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
      const claims = token ? tokenClaims(token) : {};
      return claims.sub === userA.id && claims.sid === sessionA.id;
    }),
    'both generated A requests carried session A, not the global session B token',
  );

  // Start an actual Clerk token lookup, then transition the provider out of
  // session A before it resolves. The old provider must not submit its lesson.
  let resolveToken!: () => void;
  const tokenGate = new Promise<void>(resolve => { resolveToken = resolve; });
  const delayedSessionA: StudyAuthSession = {
    ...sessionAView,
    getToken: async () => {
      await tokenGate;
      return tokenA;
    },
  };
  activeSession = delayedSessionA;
  const requestCountBeforeTransition = requestHeaders.length;
  const lateOptions = getStudyAuthOptions(() => activeSession, userA.id, () => providerActive);
  activeSession = null;
  providerActive = false;
  resolveToken();
  await assert.rejects(lateOptions, /Sign in again/);
  assert.equal(requestHeaders.length, requestCountBeforeTransition, 'stale session made no API request');

  await clerk.sessions.revokeSession(sessionA.id);

  // Switching to B's distinct real Clerk session must attach B's token and
  // must not reveal A's progress.
  activeSession = sessionBView;
  providerActive = true;
  const optionsB = await getStudyAuthOptions(() => activeSession, userB.id, () => providerActive);
  assertSessionHeader(new Headers(optionsB.headers).get('Authorization') ?? '', userB.id, sessionB.id);
  const initialB = await getStudyStats(optionsB);
  assert.equal(initialB.lessonsCompleted, 0, 'account B cannot read account A progress');
  const savedB = await saveStudyLesson({ ...lesson, eventId: `real-clerk-b-${runId}`, correct: 2 }, optionsB);
  assert.equal(savedB.lessonsCompleted, 1);
  assert.equal(savedB.xp, 20);
  assertSessionHeader(requestHeaders.at(-1) ?? '', userB.id, sessionB.id);

  // If a captured JWT remains valid until its short expiry, middleware must
  // still identify it as A; it must never resolve to the newly signed-in B.
  // Some Clerk configurations invalidate it immediately and return 401.
  const oldSessionResult = await getStatsWithRevokedSession({
    Authorization: `Bearer ${tokenA}`,
  });
  assertSessionHeader(requestHeaders.at(-1) ?? '', userA.id, sessionA.id);
  if (oldSessionResult) {
    assert.equal(oldSessionResult.lessonsCompleted, 1);
    assert.equal(oldSessionResult.xp, 40);
  }
  const refreshedB = await getStudyStats(optionsB);
  assert.equal(refreshedB.lessonsCompleted, 1);
  assert.equal(refreshedB.xp, 20, 'a captured A token did not read or alter B progress');

  console.log(`Real Clerk study-auth checks passed (${tag}); only tagged test users were created.`);
}

async function cleanup() {
  const cleanupFailures: string[] = [];
  for (const sessionId of ownedSessionIds.reverse()) {
    try {
      await clerk.sessions.revokeSession(sessionId);
    } catch {
      // The session may already have been revoked during the sign-out check.
    }
  }
  for (const userId of ownedUserIds.reverse()) {
    try {
      await clerk.users.deleteUser(userId);
    } catch {
      cleanupFailures.push('A test-created Clerk user could not be removed.');
    }
  }
  if (apiServer) {
    await new Promise<void>(resolve => apiServer!.close(() => resolve()));
  }
  setBaseUrl(null);
  setAuthTokenGetter(null);
  globalThis.fetch = originalFetch;
  try {
    const { pool } = await import('@workspace/db');
    await pool.end();
  } catch {
    // A failed app import can occur before the database pool is initialized.
  }
  if (cleanupFailures.length) {
    throw new Error(`${cleanupFailures.join(' ')} Check Clerk development users tagged with the test run ID.`);
  }
}

try {
  await main();
} finally {
  await cleanup();
}
