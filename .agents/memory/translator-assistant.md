---
name: Translator companion scope
description: The user's persistent translator pet request and privacy/access boundaries.
---
The user wants a small, distinct translator pet visible throughout the signed-in app, opening a cloud for Hebrew-to-Arabic and Arabic-to-Hebrew translation.
**Why:** The user explicitly requested a character that “appears all the time when using the app.” An earlier assistant suggestion to disable translation in timed practice was not a user-approved restriction.
**How to apply:** Preserve visibility across study and practice screens; do not silently remove it from exams. Keep the pet movable so learners can clear controls.

Translation input and output should remain ephemeral rather than becoming stored learning history by default.
**Why:** A utility translator can receive arbitrary personal text; saving every request would create unnecessary retained data unrelated to learning progress.
**How to apply:** Do not log translation bodies or automatically persist them. Any later save-as-flashcard action must be explicit and must not imply that AI output is official exam content.
