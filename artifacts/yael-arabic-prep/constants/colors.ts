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
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#17332f',
    tint: '#17665c',

    // Core surfaces
    background: '#f7f4ed',
    foreground: '#17332f',

    // Cards / elevated surfaces
    card: '#fffdf8',
    cardForeground: '#17332f',

    // Primary action color (buttons, links, active states)
    primary: '#17665c',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#e8eee7',
    secondaryForeground: '#244b43',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#eeece4',
    mutedForeground: '#74817a',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#fae4d7',
    accentForeground: '#a64e3b',

    // Destructive actions (delete, error states)
    destructive: '#c84d43',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#e8e3d8',
    input: '#ddd8cc',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 20,
};

export default colors;

/**
 * Playful layer: chunky, tactile Kalima tokens (light + dark).
 * Consumed through `usePlay()` in components/Playful.tsx.
 */
export const play = {
  light: {
    brand: '#16a37f', brandShade: '#0f7a5f', brandSoft: '#dcf4ea', onBrand: '#fffdf7',
    sun: '#ffbf3c', sunShade: '#d9921a', sunSoft: '#fff1d1', sunInk: '#7a4b00',
    coral: '#ff7a59', coralShade: '#d9573a', coralSoft: '#ffebe3', coralInk: '#a63e26',
    sky: '#3a9be0', skyShade: '#2678b5', skySoft: '#e2f1fb', skyInk: '#1d5e8e',
    success: '#2fae66', successShade: '#22884f', successSoft: '#e3f7e9', successInk: '#1d6e41',
    track: '#e7e3d6', shade: '#ddd7c8',
  },
  dark: {
    brand: '#3cc79c', brandShade: '#22926f', brandSoft: '#1d3a31', onBrand: '#0f241e',
    sun: '#ffc94f', sunShade: '#b9801a', sunSoft: '#3a3020', sunInk: '#ffd88a',
    coral: '#ff8f72', coralShade: '#b9543b', coralSoft: '#3d2723', coralInk: '#ffb7a3',
    sky: '#5cb2ef', skyShade: '#2f78ad', skySoft: '#1d3142', skyInk: '#a8d6f7',
    success: '#4cc97f', successShade: '#2f9a5c', successSoft: '#1c3a2a', successInk: '#9be6b7',
    track: '#2e403a', shade: '#0c1614',
  },
};
