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
