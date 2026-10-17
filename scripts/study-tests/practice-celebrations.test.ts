import { describe, expect, it } from 'vitest';
import {
  choosePracticeCelebration,
  PRACTICE_CELEBRATION_VARIANTS,
  RECENT_CELEBRATION_WINDOW,
  type PracticeCelebrationVariant,
} from '../../artifacts/yael-arabic-prep/lib/practice-celebrations';

describe('practice celebration rotation', () => {
  it('avoids the previous four animation styles before reusing one', () => {
    let recent: PracticeCelebrationVariant[] = [];
    const selected: PracticeCelebrationVariant[] = [];

    for (let index = 0; index < 15; index += 1) {
      const next = choosePracticeCelebration(recent, () => (index % 3) / 3);
      expect(recent.slice(0, RECENT_CELEBRATION_WINDOW)).not.toContain(next.variant);
      selected.push(next.variant);
      recent = next.recent;
    }

    expect(new Set(selected).size).toBe(PRACTICE_CELEBRATION_VARIANTS.length);
  });

  it('keeps the returned recent history capped at the no-repeat window', () => {
    const history = [...PRACTICE_CELEBRATION_VARIANTS];
    const next = choosePracticeCelebration(history, () => 0);
    expect(next.recent).toHaveLength(RECENT_CELEBRATION_WINDOW);
    expect(next.recent[0]).toBe(next.variant);
    expect(new Set(next.recent).size).toBe(next.recent.length);
  });
});
