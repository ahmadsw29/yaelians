---
name: Native header legibility
description: iPhone scroll-edge effects can blur custom training controls independently of web CSS.
---
Keep fixed training controls opaque and sharp rather than applying frosted-glass effects to their text.
**Why:** The user reported a fuzzy reading timer, counter, and close button while the passage remained sharp. No application CSS blur was present; the installed iOS 26 native navigator also has automatic scroll-edge effects, which need separate consideration from web styling.
**How to apply:** Check native navigator edge effects as well as contrast and background opacity. Keep changes local to the affected screen; preserve the accepted glass navigation elsewhere. A browser screenshot verifies the web layout, not whether an iPhone system blur has disappeared.
