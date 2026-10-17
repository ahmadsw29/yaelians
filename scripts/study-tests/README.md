# Study sync regression suite

Run `pnpm test:study` from the repository root. Requires Node 24+, pnpm,
and PostgreSQL's `initdb`, `pg_ctl` and `postgres` on PATH (available in this workspace).

The runner creates a temporary PostgreSQL cluster with a private Unix socket,
replaces DATABASE_URL only in its child environment, applies the **current Drizzle
schema**, and removes the cluster on success or failure. It never connects to the
application database or real Clerk accounts. Run as a non-root user.

Coverage:
- Real Express study routes, Zod validation, PostgreSQL transactions, account
  locks and event uniqueness under concurrent requests and conflicting imports.
- The actual StudyProvider, generated API client and React Query, with test-only
  adapters for Clerk identity, AppState and AsyncStorage.
- Lost acknowledgments, delayed responses/token acquisition across account
  switches, guest isolation, storage errors, damaged-outbox recovery and explicit
  migration decisions. Recovery tests verify the exact original is archived and
  preserved when archive or queue replacement writes fail.
- Restart recovery in two **independent Node processes**, sharing only a temporary
  device-storage file and the temporary database. Original event IDs survive.
- Existing counter/date/streak unit tests.

This is not a Clerk authentication or native OS storage test. Test bearer strings
represent already-authenticated identities; identity adapters are only wired by
the test config. No production code is modified for testing.

## Authenticated Clerk transition check

Run `pnpm test:study:clerk` separately. It requires the configured Clerk
development keys plus the same local PostgreSQL tools as the deterministic
suite. The command rejects production keys before starting and creates its own
temporary PostgreSQL cluster; it never reads or writes the application's
database.

This lane creates two uniquely tagged, temporary Clerk development users and
real sessions using the Clerk Backend SDK. It checks the production
`StudyProvider` request-auth helper, generated API client headers, and the
unmocked Express/Clerk middleware across sign-out, revocation, and sign-in as
the second user. It revokes/deletes only sessions/users created by that run.
If the process is forcibly terminated before cleanup, remove only the
`study-clerk-auth` test users bearing that run's private metadata in the Clerk
Development environment. A revoked Clerk session's already-issued JWT may remain
valid until expiry; the test verifies that such a token stays bound to its
original user, while the provider refuses to dispatch work after its session
changes. This test does not cover account deletion.
