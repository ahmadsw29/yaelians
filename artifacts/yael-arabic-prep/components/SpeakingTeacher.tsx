import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';
import { Creature, type CreatureKind } from '@/components/PetTeacher';
import { listenForReduceMotionChanges } from '@/lib/pet-teacher-motion';

/** Gestures and mouth movement last only as long as the speech engine is speaking. */
export function SpeakingTeacher({ kind, speaking, size = 82 }: { kind: CreatureKind; speaking: boolean; size?: number }) {
  const [reduceMotion, setReduceMotion] = useState(true);
  const [mouthOpen, setMouthOpen] = useState(false);
  const gesture = useRef(new Animated.Value(0)).current;
  useEffect(() => listenForReduceMotionChanges(AccessibilityInfo, setReduceMotion), []);
  useEffect(() => {
    if (!speaking || reduceMotion) {
      gesture.stopAnimation();
      gesture.setValue(0);
      setMouthOpen(false);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(gesture, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(gesture, { toValue: -1, duration: 260, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(gesture, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    animation.start();
    setMouthOpen(true);
    const mouth = setInterval(() => setMouthOpen(open => !open), 170);
    return () => {
      clearInterval(mouth);
      animation.stop();
      gesture.setValue(0);
    };
  }, [speaking, reduceMotion, gesture]);
  return <Animated.View testID="speaking-teacher" style={{ transform: [
    { translateY: gesture.interpolate({ inputRange: [-1, 0, 1], outputRange: [-2, 0, -4] }) },
    { rotate: gesture.interpolate({ inputRange: [-1, 1], outputRange: ['-3deg', '3deg'] }) },
  ] }}>
    <Creature kind={kind} size={size} mood={speaking ? 'hype' : 'happy'} mouthOpen={speaking && !reduceMotion && mouthOpen} />
  </Animated.View>;
}
