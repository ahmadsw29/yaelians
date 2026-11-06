import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { NATIVE_DRIVER, useReduceMotion } from '@/components/HomeMotion';

/** Changes the question only after departure; locks synchronously against repeated taps. */
export function useQuestionTransition(enabled: boolean, enterOnMount = false) {
  const reduce = useReduceMotion();
  const initialEntry = enabled && enterOnMount;
  const prompt = useRef(new Animated.Value(initialEntry ? 0 : 1)).current;
  const answers = useRef(Array.from({ length: 4 }, () => new Animated.Value(initialEntry ? 0 : 1))).current;
  const [stage, setStage] = useState<'idle' | 'exit' | 'enter'>(initialEntry ? 'enter' : 'idle');
  const locked = useRef(initialEntry);
  const mounted = useRef(true);
  const active = useRef(enabled);
  active.current = enabled;
  const focused = useRef(false);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  type Change = () => void | boolean | Promise<void | boolean>;
  const pending = useRef<Change | null>(null);
  const generation = useRef(0);
  const settle = useCallback(() => {
    generation.current++;
    pending.current = null;
    animation.current?.stop();
    prompt.setValue(1);
    answers.forEach(value => value.setValue(1));
    locked.current = false;
    if (mounted.current) setStage('idle');
  }, [prompt, answers]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; settle(); };
  }, [settle]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; settle(); };
  }, [settle]));

  useEffect(() => {
    if (stage !== 'enter' || reduce || !enabled) return;
    const token = generation.current;
    const spring = (value: Animated.Value) => Animated.spring(value, {
      toValue: 1, damping: 15, stiffness: 190, mass: 0.8, useNativeDriver: NATIVE_DRIVER,
    });
    const entrance = Animated.parallel([
      spring(prompt),
      Animated.stagger(65, answers.map(spring)),
    ]);
    animation.current = entrance;
    entrance.start(({ finished }) => {
      if (finished && mounted.current && token === generation.current) {
        locked.current = false; setStage('idle');
      }
    });
    return () => entrance.stop();
  }, [stage, reduce, enabled, prompt, answers]);

  const applyChange = useCallback(async (change: Change, token: number, animate: boolean) => {
    try {
      const accepted = await change();
      if (!mounted.current || token !== generation.current) return;
      if (accepted === false || !animate) settle();
      else setStage('enter');
    } catch (error) {
      if (mounted.current && token === generation.current) settle();
      // Callers own the actionable save-error UI; never leave a failed update invisible.
      console.error('Question update failed', error);
    }
  }, [settle]);
  const advance = useCallback((change: Change) => {
    if (!mounted.current || !active.current || !focused.current || locked.current) return;
    locked.current = true;
    setStage('exit');
    const token = ++generation.current;
    if (reduce) {
      void applyChange(change, token, false);
      return;
    }
    pending.current = change;
    const departure = Animated.parallel([prompt, ...answers].map(value =>
      Animated.timing(value, { toValue: 0, duration: 170, useNativeDriver: NATIVE_DRIVER })));
    animation.current = departure;
    departure.start(({ finished }) => {
      if (!finished || !mounted.current || token !== generation.current) return;
      const update = pending.current;
      pending.current = null;
      if (update) void applyChange(update, token, true);
    });
  }, [enabled, reduce, applyChange, prompt, answers]);
  useEffect(() => {
    if (!enabled || reduce) {
      const change = enabled ? pending.current : null;
      settle();
      if (change) advance(change);
    }
  }, [enabled, reduce, settle, advance]);
  const style = (value: Animated.Value, distance: number) => ({
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [
      { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [stage === 'exit' ? -42 : distance, 0] }) },
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [stage === 'exit' ? 0.98 : 0.94, 1] }) },
    ],
  });
  return {
    advance, busy: stage !== 'idle', departing: stage === 'exit',
    promptStyle: style(prompt, 62),
    answerStyle: (index: number) => style(answers[index], 40),
  };
}
