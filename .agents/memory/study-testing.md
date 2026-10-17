---
name: Study sync testing boundaries
description: Why progress regression tests need a real database and controlled identity adapters.
---
Keep concurrency regression checks on real PostgreSQL, with disposable storage and fake identities rather than live accounts.

**Why:** Progress correctness depends on PostgreSQL transaction/advisory locks and JSONB semantics. An in-memory repository mock can pass while production loses updates. Live identities are unnecessary for this boundary and risk touching user data.

**How to apply:** Preserve the database isolation when extending sync tests. Test authentication-provider behavior separately; mocked identity checks do not prove token verification.
