export interface MotionPreferenceSource {
  isReduceMotionEnabled(): Promise<boolean>;
  addEventListener(
    event: 'reduceMotionChanged',
    listener: (enabled: boolean) => void,
  ): { remove(): void };
}

interface MotionValue {
  stopAnimation(): void;
  setValue(value: number): void;
}

export function listenForReduceMotionChanges(
  source: MotionPreferenceSource,
  onChange: (enabled: boolean) => void,
) {
  let active = true;
  source.isReduceMotionEnabled()
    .then(enabled => { if (active) onChange(enabled); })
    .catch(() => { if (active) onChange(true); });
  const subscription = source.addEventListener('reduceMotionChanged', onChange);
  return () => {
    active = false;
    subscription.remove();
  };
}

export function updatePetTeacherMotion(
  mood: 'happy' | 'sad',
  jumpKey: number,
  reduceMotion: boolean,
  previousJumpKey: { current: number },
  jump: MotionValue,
  squash: MotionValue,
) {
  if (mood !== 'happy' || jumpKey === 0 || reduceMotion) {
    previousJumpKey.current = jumpKey;
    jump.stopAnimation();
    squash.stopAnimation();
    jump.setValue(0);
    squash.setValue(1);
    return false;
  }
  if (previousJumpKey.current === jumpKey) return false;
  previousJumpKey.current = jumpKey;
  return true;
}
