/**
 * Keep fixed controls above the floating native bar and the home indicator.
 * Reserve one bar area, not a second full bar plus another safe-area margin.
 */
export function getPracticeScreenSpacing(
  platform: string,
  topInset: number,
  bottomInset: number,
  liquidGlass: boolean,
) {
  const native = platform !== 'web';
  return {
    paddingTop: native ? Math.max(0, topInset) : 0,
    paddingBottom: platform === 'web' ? 84 : liquidGlass ? Math.max(84, bottomInset + 50) : 61 + Math.max(0, bottomInset),
  };
}
