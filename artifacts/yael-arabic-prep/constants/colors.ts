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
