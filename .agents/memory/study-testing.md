---
name: Study sync testing boundaries
description: Why progress regression tests need a real database and controlled identity adapters.
---
Keep concurrency regression checks on real PostgreSQL, with disposable storage and fake identities rather than live accounts.

**Why:** Progress correctness depends on PostgreSQL transaction/advisory locks and JSONB semantics. An in-memory repository mock can pass while production loses updates. Live identities are unnecessary for this boundary and risk touching user data.

**How to apply:** Preserve the database isolation when extending sync tests. Test authentication-provider behavior separately; mocked identity checks do not prove token verification.

Keep real-Clerk checks in a separate opt-in lane with uniquely tagged development users created for that run, an isolated database, and cleanup limited to the run's own user/session IDs. Compare token claims and server-verified identity rather than JWT strings; Clerk can mint a different token for the same session on each retrieval.

**Why:** Provider adapters prove account-switch logic but cannot prove Clerk token issuance or middleware verification. JWT revocation can also leave an already-issued token valid briefly, so session-boundary tests must distinguish provider dispatch prevention from the server's principal mapping.

**How to apply:** Require development keys before creating users, never target pre-existing user IDs, and verify any still-valid old token remains bound to its original user rather than the newly signed-in user.
