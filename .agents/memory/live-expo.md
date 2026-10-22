---
name: Live Expo updates
description: Avoid interrupting learners during parallel edits and slow authentication initialization.
---
Create referenced content and components before adding or registering new route files on the live mobile server.
**Why:** While new exam files were being written in parallel, devices received an incomplete bundle and the user reported the app would not start.
**How to apply:** Stage dependency files first; only expose routes after every import exists.

After bringing in new Expo routes from another branch, restart the managed Expo workflow before diagnosing typed-route failures.
**Why:** Expo's generated route types can still describe the previous branch, rejecting valid routes until Metro regenerates them.
**How to apply:** If navigation type errors name newly added routes that exist on disk, regenerate through the workflow and rerun the mobile typecheck before changing navigation code.

Always show loading UI while authentication initializes instead of rendering nothing.
**Why:** Browser verification observed approximately twelve seconds of blank startup while authentication loaded, despite no application errors.
**How to apply:** Retain explicit font and authentication loading states; do not mistake a successful bundle for completed UI startup.

On the web, load optional custom fonts alongside authentication instead of blocking the entire app on their downloads.
**Why:** Serial font loading delays the first usable screen on mobile connections. Native splash behavior remains separate.
**How to apply:** Render browser text with system fallbacks while fonts load; never skip session or entitlement verification to make startup appear faster.

Keep one redirect owner for the initial index route, and distinguish it from the tab group's home route even though both can have pathname `/`.
**Why:** Competing index/layout redirects mixed native plan destinations with web subscription destinations and could leave a spinner during startup.
**How to apply:** Let the index decide its initial destination; retain the layout's authorization guard for tab screens and protected deep links.

Phone-sized web previews do not validate native iOS safe areas or floating-tab clearance.
**Why:** Web checks passed while the user's native screenshot showed progress under the status bar and Next crowded by floating tabs. Excessive clearance left a large unwanted gap; removing native clearance let the bar cover Next again.
**How to apply:** In this practice screen, the floating iOS bar can overlay the fixed footer. Retain one bottom clearance above it, without stacking duplicate bar and safe-area reservations. Avoid double automatic/manual scroll insets, and do not describe a web viewport check as native-device verification.

The preview test browser may expose speech synthesis but have no installed voices.
**Why:** Pronunciation checks found an empty real voice list; controlled speech events verified the UI lifecycle but could not verify audible Hebrew.
**How to apply:** Distinguish simulated speech checks from actual audio verification. Do not substitute a non-Hebrew voice or claim phone pronunciation was heard based on a browser simulation.

API code generation can briefly remove generated modules while Metro is watching and leave a stale module-resolution failure.
**Why:** Clean code generation temporarily deletes its output directory; Metro can observe that intermediate state even though the final generated client exists.
**How to apply:** Finish generation and confirm the files exist, then restart Metro once if it retains the missing-module error. Do not replace correct shared-client imports with ad hoc fetches.

Do not insert a transient progress-loading row above the practice question.
**Why:** The user reported that “جاري تحميل التقدم” moved every question element downward and asked for a loading screen instead when waiting is necessary.
**How to apply:** Keep cached background progress refreshes silent and question geometry stable. Use one full-screen loader for genuinely blocking initial loading, without hiding actionable errors or saved-lesson recovery notices.
