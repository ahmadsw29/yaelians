/**
 * NativeTabs already reserves its own bar/home-indicator area in the screen
 * frame. Classic absolute tabs do not. Do not reserve the native bar twice.
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
    paddingBottom: platform === 'web' ? 84 : liquidGlass ? 8 : 61 + Math.max(0, bottomInset),
  };
}
