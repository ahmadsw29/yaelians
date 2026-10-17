export const PRACTICE_CELEBRATION_VARIANTS = [
  'tutor-cheer',
  'spark-burst',
  'badge-pop',
  'page-turn',
  'high-five',
] as const;

export type PracticeCelebrationVariant = typeof PRACTICE_CELEBRATION_VARIANTS[number];
export const RECENT_CELEBRATION_WINDOW = 4;

export function choosePracticeCelebration(
  recent: readonly PracticeCelebrationVariant[],
  random: () => number = Math.random,
): { variant: PracticeCelebrationVariant; recent: PracticeCelebrationVariant[] } {
  const excluded = new Set(recent.slice(0, RECENT_CELEBRATION_WINDOW));
  const available = PRACTICE_CELEBRATION_VARIANTS.filter(variant => !excluded.has(variant));
  const roll = random();
  const safeRoll = Number.isFinite(roll) ? Math.max(0, Math.min(0.999999, roll)) : 0;
  const variant = available[Math.floor(safeRoll * available.length)];

  return {
    variant,
    recent: [variant, ...recent.filter(item => item !== variant)].slice(0, RECENT_CELEBRATION_WINDOW),
  };
}

let recentCelebrations: PracticeCelebrationVariant[] = [];

export function nextPracticeCelebration(): PracticeCelebrationVariant {
  const next = choosePracticeCelebration(recentCelebrations);
  recentCelebrations = next.recent;
  return next.variant;
}
