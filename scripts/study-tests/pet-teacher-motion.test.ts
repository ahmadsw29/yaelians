import { describe, expect, it } from 'vitest';
import {
  PROGRESS_MAX_HOP,
  getPracticeAnswerState,
  getProgressMarkerPosition,
  selectPracticeAnswer,
} from '../../artifacts/yael-arabic-prep/lib/progress-marker';
import {
  listenForReduceMotionChanges,
  updatePetTeacherMotion,
  type MotionPreferenceSource,
} from '../../artifacts/yael-arabic-prep/lib/pet-teacher-motion';

class TestMotionValue {
  stopCount = 0;

  constructor(public value: number) {}

  stopAnimation() {
    this.stopCount += 1;
  }

  setValue(value: number) {
    this.value = value;
  }
}

function accessibilitySource(initialPreference: boolean) {
  let preference = initialPreference;
  let listener: ((enabled: boolean) => void) | undefined;
  let subscribedEvent = '';
  const source: MotionPreferenceSource = {
    isReduceMotionEnabled: async () => preference,
    addEventListener(event, callback) {
      subscribedEvent = event;
      listener = callback;
      return { remove: () => { listener = undefined; } };
    },
  };
  return {
    source,
    get subscribedEvent() { return subscribedEvent; },
    changePreference(enabled: boolean) {
      preference = enabled;
      listener?.(enabled);
    },
    get hasListener() { return listener !== undefined; },
  };
}

const platforms = ['iOS', 'Android'] as const;

describe.each(platforms)('%s reduce-motion preference changes', platform => {
  it('resets an active jump when reduced motion is enabled', async () => {
    const accessibility = accessibilitySource(false);
    let reduceMotion = false;
    const unsubscribe = listenForReduceMotionChanges(accessibility.source, enabled => { reduceMotion = enabled; });
    await Promise.resolve();
    expect(accessibility.subscribedEvent).toBe('reduceMotionChanged');
    expect(accessibility.hasListener).toBe(true);

    const previousJumpKey = { current: 0 };
    const jump = new TestMotionValue(0);
    const squash = new TestMotionValue(1);
    expect(updatePetTeacherMotion('happy', 1, reduceMotion, previousJumpKey, jump, squash)).toBe(true);
    jump.setValue(-PROGRESS_MAX_HOP);
    squash.setValue(1.12);

    accessibility.changePreference(true);
    expect(reduceMotion).toBe(true);
    expect(updatePetTeacherMotion('happy', 1, reduceMotion, previousJumpKey, jump, squash)).toBe(false);
    expect(jump.stopCount).toBeGreaterThan(0);
    expect(squash.stopCount).toBeGreaterThan(0);
    expect(jump.value).toBe(0);
    expect(squash.value).toBe(1);

    unsubscribe();
    expect(accessibility.hasListener).toBe(false);
  });

  it('only allows a later correct answer to animate after reduced motion is disabled', async () => {
    const accessibility = accessibilitySource(true);
    let reduceMotion = true;
    const unsubscribe = listenForReduceMotionChanges(accessibility.source, enabled => { reduceMotion = enabled; });
    await Promise.resolve();

    const previousJumpKey = { current: 0 };
    const jump = new TestMotionValue(0);
    const squash = new TestMotionValue(1);
    expect(updatePetTeacherMotion('happy', 1, reduceMotion, previousJumpKey, jump, squash)).toBe(false);

    accessibility.changePreference(false);
    expect(reduceMotion).toBe(false);
    expect(updatePetTeacherMotion('happy', 1, reduceMotion, previousJumpKey, jump, squash)).toBe(false);
    expect(updatePetTeacherMotion('happy', 2, reduceMotion, previousJumpKey, jump, squash)).toBe(true);

    unsubscribe();
  });

  it('keeps feedback, correct counts, and progress while the mascot stays still', () => {
    const initial = { choice: null, correct: 0, celebrationKey: 0 };
    const correct = selectPracticeAnswer(initial, 'right', 'right');
    expect(correct).not.toBeNull();
    expect(getPracticeAnswerState(correct!.choice, 'right', 'right')).toBe('correct');
    expect(correct!.correct).toBe(1);
    expect(getProgressMarkerPosition(1, 4).percent).toBe(50);

    const wrong = selectPracticeAnswer(initial, 'wrong', 'right');
    expect(wrong).not.toBeNull();
    expect(getPracticeAnswerState(wrong!.choice, 'wrong', 'right')).toBe('wrong');
    expect(getPracticeAnswerState(wrong!.choice, 'right', 'right')).toBe('correct');
    expect(wrong!.correct).toBe(0);

    const previousJumpKey = { current: 0 };
    const jump = new TestMotionValue(-PROGRESS_MAX_HOP);
    const squash = new TestMotionValue(1.12);
    expect(updatePetTeacherMotion('happy', correct!.celebrationKey, true, previousJumpKey, jump, squash)).toBe(false);
    expect(jump.value).toBe(0);
    expect(squash.value).toBe(1);
  });
});
