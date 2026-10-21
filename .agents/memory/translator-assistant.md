---
name: Translator companion scope
description: The user's persistent translator pet request and privacy/access boundaries.
---
The user wants a small, distinct translator pet available throughout the signed-in app, opening a cloud for Hebrew-to-Arabic and Arabic-to-Hebrew translation. He subsequently asked for a simple way to hide and show it.
**Why:** The original “appears all the time” request means persistent access, not forcing a large character to stay visible after the user asks to hide it. An earlier assistant suggestion to disable translation in timed practice was not a user-approved restriction.
**How to apply:** Preserve access across study and practice screens, including exams. Allow one-tap collapse to a small edge tab and one-tap restore/open; remember that choice per learner. Keep the pet movable and do not automatically reveal it when navigating.

Translation input and output should remain ephemeral rather than becoming stored learning history by default.
**Why:** A utility translator can receive arbitrary personal text; saving every request would create unnecessary retained data unrelated to learning progress.
**How to apply:** Do not log translation bodies or automatically persist them. Any later save-as-flashcard action must be explicit and must not imply that AI output is official exam content.
