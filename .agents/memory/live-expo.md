---
name: Live Expo updates
description: Avoid interrupting learners during parallel edits and slow authentication initialization.
---
Create referenced content and components before adding or registering new route files on the live mobile server.
**Why:** While new exam files were being written in parallel, devices received an incomplete bundle and the user reported the app would not start.
**How to apply:** Stage dependency files first; only expose routes after every import exists.

Always show loading UI while authentication initializes instead of rendering nothing.
**Why:** Browser verification observed approximately twelve seconds of blank startup while authentication loaded, despite no application errors.
**How to apply:** Retain explicit font and authentication loading states; do not mistake a successful bundle for completed UI startup.

Phone-sized web previews do not validate native iOS safe areas or floating-tab clearance.
**Why:** Web checks passed while the user's native screenshot showed progress under the status bar and Next crowded by floating tabs. Adding a full extra tab-bar reservation then left a large unwanted gap beneath Next.
**How to apply:** Distinguish NativeTabs screen-frame space from classic absolute tab overlays; do not add a guessed native bar height on top of already-reserved space. Avoid double automatic/manual scroll insets, and do not describe a web viewport check as native-device verification.

The preview test browser may expose speech synthesis but have no installed voices.
**Why:** Pronunciation checks found an empty real voice list; controlled speech events verified the UI lifecycle but could not verify audible Hebrew.
**How to apply:** Distinguish simulated speech checks from actual audio verification. Do not substitute a non-Hebrew voice or claim phone pronunciation was heard based on a browser simulation.
