---
name: Study progress migration policy
description: Why legacy progress is opt-in and cannot be blindly merged across devices.
---
Keep guest learning progress separate from signed-in progress. Offer legacy account-local import explicitly and only into an empty cloud record, preserving the local original.

**Why:** Legacy counters have no individual lesson identities. Adding multiple device snapshots or guest counters can count the same lessons twice; replacing cloud totals can discard newer work. Neither action is safe to infer.

**How to apply:** Any future merge/recovery flow must explain overlap and obtain an explicit user choice. Never automatically sum old snapshots.

Offline completion dates use UTC, not device-local calendar days. Preserve dates up to 30 days old; allow five minutes of forward clock skew but never credit a future day. Missing or out-of-window timestamps receive sync-day credit.

**Why:** Client clocks cannot be verified offline. Bounded backdating balances offline use with limiting arbitrary historical streak claims; sync-day fallback preserves earned lesson counters rather than permanently blocking the outbox.

**How to apply:** Do not re-date acknowledged event IDs on retry. Existing snapshots only prove their final consecutive run; preserve that run without inventing earlier activity. The streak remains the run ending on the latest practice day, consistent with existing display behavior.
