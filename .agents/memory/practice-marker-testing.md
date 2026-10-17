---
name: Practice marker test boundary
description: Why progress-marker regression tests exercise shared pure logic instead of rendering the Expo screen in Vitest.
---
Keep progress percentage, answer-selection, and mode-reset behavior in pure helpers consumed by the practice screen, and test those helpers directly in the scripts Vitest suite.

**Why:** Importing the Expo practice screen into this Vitest setup fails while parsing React Native's Flow-based entry (`Unexpected token 'typeof'`), so a renderer test is not currently a reliable path.

**How to apply:** When extending progress-marker coverage, assert the same exported geometry and state-transition helpers used by the screen. Revisit a full-screen renderer only after the Vitest environment can transform React Native dependencies.
