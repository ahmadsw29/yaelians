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
