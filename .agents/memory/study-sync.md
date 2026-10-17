---
name: Study progress migration policy
description: Why legacy progress is opt-in and cannot be blindly merged across devices.
---
Keep guest learning progress separate from signed-in progress. Offer legacy account-local import explicitly and only into an empty cloud record, preserving the local original.

**Why:** Legacy counters have no individual lesson identities. Adding multiple device snapshots or guest counters can count the same lessons twice; replacing cloud totals can discard newer work. Neither action is safe to infer.

**How to apply:** Any future merge/recovery flow must explain overlap and obtain an explicit user choice. Never automatically sum old snapshots. Offline lessons currently count toward the UTC day when the server receives them; changing that policy requires a deliberate event-date/streak design.
