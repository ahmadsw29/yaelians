---
name: Expo native component test boundary
description: Why native React Native screens and components exercise behavior through shared pure helpers instead of Vitest rendering.
---
Keep screen state transitions and animation decisions in pure helpers consumed by React Native components, and test those helpers directly in the scripts Vitest suite.

**Why:** Importing the Expo practice screen or mascot component into this Vitest setup can fail while parsing React Native's Flow-based entry (`Unexpected token 'typeof'`), so renderer tests are not currently a reliable path.

**How to apply:** Test the same exported transition helpers used by the UI. Revisit component rendering only after Vitest can transform the relevant React Native dependencies.
