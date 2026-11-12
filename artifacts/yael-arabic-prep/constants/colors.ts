/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  darkBackground: '#14112b',
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#1d1840',
    tint: '#6b3cf0',

    // Core surfaces
    background: '#f6f1ff',
    foreground: '#1d1840',

    // Cards / elevated surfaces
    card: '#fffcf6',
    cardForeground: '#1d1840',

    // Primary action color (buttons, links, active states)
    primary: '#6b3cf0',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#e6f8f1',
    secondaryForeground: '#0b6b52',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#ece6fb',
    mutedForeground: '#6a6390',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#ffe3d6',
    accentForeground: '#c2410c',

    // Destructive actions (delete, error states)
    destructive: '#d7263d',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#e1d7fb',
    input: '#cdbff5',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 20,
  // Deep end of the primary gradient used by buttons.
  primaryDeepLight: '#4a1fc7',
  primaryDeepDark: '#9b6bff',
};

export default colors;

/**
 * Playful layer: chunky, tactile Kalima tokens (light + dark).
 * Consumed through `usePlay()` in components/Playful.tsx.
 */
export const play = {
  light: {
    brand: '#12b886', brandShade: '#0b8a63', brandSoft: '#d6f7ea', onBrand: '#fffdf7',
    sun: '#ffbf3c', sunShade: '#d9921a', sunSoft: '#fff1d1', sunInk: '#7a4b00',
    coral: '#ff7a59', coralShade: '#d9573a', coralSoft: '#ffebe3', coralInk: '#a63e26',
    sky: '#3a9be0', skyShade: '#2678b5', skySoft: '#e2f1fb', skyInk: '#1d5e8e',
    success: '#2fae66', successShade: '#22884f', successSoft: '#e3f7e9', successInk: '#1d6e41',
    track: '#e6defa', shade: '#d6cbf3',
  },
  dark: {
    brand: '#3cc79c', brandShade: '#22926f', brandSoft: '#163a3a', onBrand: '#0f241e',
    sun: '#ffc94f', sunShade: '#b9801a', sunSoft: '#3a3020', sunInk: '#ffd88a',
    coral: '#ff8f72', coralShade: '#b9543b', coralSoft: '#3d2723', coralInk: '#ffb7a3',
    sky: '#5cb2ef', skyShade: '#2f78ad', skySoft: '#1d3142', skyInk: '#a8d6f7',
    success: '#4cc97f', successShade: '#2f9a5c', successSoft: '#1c3a2a', successInk: '#9be6b7',
    track: '#2f2958', shade: '#0b0920',
  },
};
