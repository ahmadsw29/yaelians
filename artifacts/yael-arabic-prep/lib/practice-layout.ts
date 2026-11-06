/** Reflow the question and feedback instead of reducing accessible text sizes. */
export function usesExpandedQuestionLayout(fontScale: number) {
  return fontScale >= 1.5;
}

/**
 * Keep fixed controls above the floating native bar and the home indicator.
 * Reserve one bar area, not a second full bar plus another safe-area margin.
 * Standalone routes have no dock; keep only their real safe-area inset.
 */
export function getPracticeScreenSpacing(
  platform: string,
  topInset: number,
  bottomInset: number,
  liquidGlass: boolean,
  hasDock = true,
) {
  const native = platform !== 'web';
  return {
    paddingTop: native ? Math.max(0, topInset) : 0,
    paddingBottom: !hasDock ? Math.max(0, bottomInset)
      : platform === 'web' ? 84 : liquidGlass ? Math.max(84, bottomInset + 50) : 61 + Math.max(0, bottomInset),
  };
}
