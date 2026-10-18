---
name: Expo native component test boundary
description: Boundaries between pure behavior tests, mocked native prop tests, browser layout checks, and actual device verification.
---
Keep screen state transitions and animation decisions in pure helpers consumed by React Native components. Use mocked native host components for prop/style wiring checks only.

**Why:** Importing the Expo practice screen or mascot without a complete native boundary can fail while parsing React Native's Flow-based entry (`Unexpected token 'typeof'`). A successful mocked render does not measure native text or layout.

**How to apply:** Test the same exported transition helpers used by the UI. If rendering a small component with host mocks, label the evidence as prop checks rather than device rendering.

Do not treat a browser font-scale simulation as native Dynamic Type verification.

**Why:** React Native Web does not automatically enlarge its Text when only the reported native fontScale changes; OS font metrics and RTL layout also differ.

**How to apply:** Browser checks must enlarge the actual text as well as exercise responsive policies. Record this as an approximation, and require iOS/Android system-text checks before claiming native certification.
