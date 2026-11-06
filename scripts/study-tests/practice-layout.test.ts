import { describe, expect, it } from 'vitest';
import { getPracticeScreenSpacing } from '../../artifacts/yael-arabic-prep/lib/practice-layout';

describe('practice safe areas', () => {
  it('reserves only the home-indicator inset for standalone reading with no dock', () => {
    expect(getPracticeScreenSpacing('ios', 62, 34, true, false)).toEqual({ paddingTop: 62, paddingBottom: 34 });
    expect(getPracticeScreenSpacing('ios', 47, 34, false, false).paddingBottom).toBe(34);
    expect(getPracticeScreenSpacing('android', 24, 24, false, false).paddingBottom).toBe(24);
    expect(getPracticeScreenSpacing('web', 0, 0, false, false).paddingBottom).toBe(0);
    expect(getPracticeScreenSpacing('web', 44, 34, false, false).paddingBottom).toBe(34);
  });
  it('keeps the progress header below the iPhone status area', () => {
    expect(getPracticeScreenSpacing('ios', 62, 34, true).paddingTop).toBe(62);
  });

  it('keeps Next above the floating native tab bar without the oversized old gap', () => {
    const spacing = getPracticeScreenSpacing('ios', 62, 34, true);
    expect(spacing.paddingBottom).toBe(84);
    expect(getPracticeScreenSpacing('ios', 62, 0, true).paddingBottom).toBe(84);
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
