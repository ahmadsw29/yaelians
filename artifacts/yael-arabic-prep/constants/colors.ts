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
  darkBackground: '#0b1220',
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#0b1220',
    tint: '#2a66d4',
    background: '#f4f7fc',
    foreground: '#0b1220',
    card: '#fbfcfe',
    cardForeground: '#0b1220',
    primary: '#2a66d4',
    primaryForeground: '#f7f9fd',
    secondary: '#e4edfc',
    secondaryForeground: '#162235',
    muted: '#e9eef6',
    mutedForeground: '#5b6a82',
    accent: '#dcf3f0',
    accentForeground: '#0b5a53',
    destructive: '#d63a3a',
    destructiveForeground: '#f4f7fc',
    border: '#dbe3ef',
    input: '#c9d5e6',
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
    track: '#e1e8f2', shade: '#cfd9e8',
  },
  dark: {
    brand: '#2a66d4', brandShade: '#1f56c2', brandSoft: '#15284a', brandInk: '#9fc2ff', onBrand: '#f7f9fd',
    sun: '#f0b44f', sunShade: '#a87a1c', sunSoft: '#2a2414', sunInk: '#f5d396', sunFill: '#f0b44f', onSun: '#2b1c00',
    coral: '#f08a70', coralShade: '#b4553e', coralSoft: '#2e1d1c', coralInk: '#f6b9a7', onCoral: '#2b1410',
    sky: '#2cc1b2', skyShade: '#0f7f75', skySoft: '#10302f', skyInk: '#8fe3d9',
    success: '#4cc483', successShade: '#2e9560', successSoft: '#14302a', successInk: '#9fe3bd',
    track: '#22324a', shade: '#070c16',
  },
};
