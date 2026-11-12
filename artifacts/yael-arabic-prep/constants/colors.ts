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
  darkBackground: '#141416',
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#1d1d1f',
    tint: '#2a66d4',
    background: '#f6f5f2',
    foreground: '#1d1d1f',
    card: '#fdfcfa',
    cardForeground: '#1d1d1f',
    primary: '#2a66d4',
    primaryForeground: '#f7f9fd',
    secondary: '#eeece8',
    secondaryForeground: '#2c2b29',
    muted: '#efede9',
    mutedForeground: '#66635e',
    accent: '#dcf3f0',
    accentForeground: '#0b5a53',
    destructive: '#d63a3a',
    destructiveForeground: '#fdfcfa',
    border: '#e4e1db',
    input: '#d4d0c8',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 20,
  // Deep end of the primary gradient used by buttons.
  primaryDeepLight: '#1d55c4',
  primaryDeepDark: '#2a6ad8',
};

export default colors;

/**
 * Playful layer: chunky, tactile Kalima tokens (light + dark).
 * Consumed through `usePlay()` in components/Playful.tsx.
 */
export const play = {
  // brand = blue, sky = companion teal, sun = warm amber (sparing), coral = streak/errors only.
  // *Ink = text on the matching *Soft surface. onBrand = text on brand/brandShade/skyShade fills.
  light: {
    brand: '#2a66d4', brandShade: '#1d55c4', brandSoft: '#e4edfc', brandInk: '#1a4aa8', onBrand: '#f7f9fd',
    sun: '#e9a23b', sunShade: '#b97814', sunSoft: '#fbf1e0', sunInk: '#6e4508', sunFill: '#f6c56f', onSun: '#4a2f00',
    coral: '#e0654a', coralShade: '#b84a33', coralSoft: '#fbe9e4', coralInk: '#8f3420', onCoral: '#2b1410',
    sky: '#14a397', skyShade: '#0d7a70', skySoft: '#dcf3f0', skyInk: '#0b5a53',
    success: '#2f9e63', successShade: '#22784a', successSoft: '#e2f4ea', successInk: '#1b6340',
    track: '#e8e5df', shade: '#d8d4cc',
  },
  dark: {
    brand: '#2a66d4', brandShade: '#1f56c2', brandSoft: '#1a2538', brandInk: '#9fc2ff', onBrand: '#f7f9fd',
    sun: '#f0b44f', sunShade: '#a87a1c', sunSoft: '#2b261b', sunInk: '#f5d396', sunFill: '#f0b44f', onSun: '#2b1c00',
    coral: '#f08a70', coralShade: '#b4553e', coralSoft: '#2e1d1c', coralInk: '#f6b9a7', onCoral: '#2b1410',
    sky: '#2cc1b2', skyShade: '#0f7f75', skySoft: '#172b2a', skyInk: '#8fe3d9',
    success: '#4cc483', successShade: '#2e9560', successSoft: '#14302a', successInk: '#9fe3bd',
    track: '#2e2e32', shade: '#0b0b0c',
  },
};
