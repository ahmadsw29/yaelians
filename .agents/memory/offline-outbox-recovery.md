---
name: Offline outbox recovery
description: Safe handling of malformed queued study lessons without silently losing local progress.
---
Never replace malformed offline lesson data with a filtered queue until the user chooses recovery. Save the exact original stored value to a separate recovery copy first, then sync only individually validated lessons; invalid JSON or non-array data requires an explicit continue-without-recovered-lessons choice. Keep local event validation aligned with the API contract; lesson totals can vary with practice-session length.

**Why:** Filtering on load can silently erase valid progress mixed with damaged events, and a write failure during repair must not destroy the only original copy. Fixed five-question totals also reject legitimate sessions after practice lengths vary.

**How to apply:** For any future outbox repair, keep sync and new writes paused while damage is unresolved, preserve raw storage before changing the active queue, and leave the original intact if archiving fails. If lesson event fields change, update the OpenAPI contract and regenerate the client and validator together.
