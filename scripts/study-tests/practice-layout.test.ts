import { describe, expect, it } from 'vitest';
import { getPracticeScreenSpacing } from '../../artifacts/yael-arabic-prep/lib/practice-layout';

describe('practice safe areas', () => {
  it('keeps the progress header below the iPhone status area', () => {
    expect(getPracticeScreenSpacing('ios', 62, 34, true).paddingTop).toBe(62);
  });

  it('does not reserve the floating native tab area a second time', () => {
    const spacing = getPracticeScreenSpacing('ios', 62, 34, true);
    expect(spacing.paddingBottom).toBe(8);
    expect(getPracticeScreenSpacing('ios', 62, 0, true).paddingBottom).toBe(8);
  });

  it('keeps classic tabs and Android navigation clear of Next', () => {
    expect(getPracticeScreenSpacing('ios', 47, 34, false).paddingBottom).toBe(95);
    expect(getPracticeScreenSpacing('android', 24, 24, false)).toEqual({
      paddingTop: 24,
      paddingBottom: 85,
    });
  });

  it('reserves the actual 84px web tabbar without native inset duplication', () => {
    expect(getPracticeScreenSpacing('web', 0, 0, false)).toEqual({
      paddingTop: 0,
      paddingBottom: 84,
    });
  });
});
