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

Never preserve a score-derived legacy mastered-word total as an offset to unique vocabulary mastery. Preserve the other learning counters, but count mastery only where vocabulary identities are known.

**Why:** Old scores cannot identify distinct words. Retaining their total as a baseline would count an unknown overlap again when those words are practiced, recreating the inflated vocabulary total.

**How to apply:** Old snapshots, legacy imports, and pending lessons without word identities retain points and lesson history but cannot establish vocabulary mastery. Reading answers are not evidence of vocabulary mastery either.

Timed practice results must remain separate from account learning statistics unless a later feature deliberately includes them.

**Why:** The requested recovery feature is for moving attempts between devices, not granting additional XP, mastery, streaks, or completed lessons. Restoring the same result repeatedly must not count as new learning.

**How to apply:** Backup, restore, and explicit guest transfer must not submit lesson events or merge result-derived counters into account learning stats.

Do not show the manual cross-device backup, restore, and guest-transfer panel on the timed-practice screen.
**Why:** The user explicitly asked to delete that panel from the practice experience.
**How to apply:** Keep local autosave and saved attempts intact. Removing these controls is not permission to erase cloud backups, transfer guest data automatically, or reintroduce the panel during recovery work.
