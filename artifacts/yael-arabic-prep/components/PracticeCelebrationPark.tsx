import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { usePlay } from '@/components/Playful';
import { PetTeacherReaction, type CreatureKind } from '@/components/PetTeacher';
import { listenForReduceMotionChanges } from '@/lib/pet-teacher-motion';

const native = Platform.OS !== 'web';
const KINDS: CreatureKind[] = ['zizo', 'lumi', 'nuna', 'ghaima', 'rami'];
const STARS = [0, 1, 2, 3, 4, 5];

/** Decorative, non-interactive pet playground. Parent reserves its ~100px footprint. */
export function PracticeCelebrationPark({ correct, animationKey }: { correct: boolean; animationKey: number }) {
  const p = usePlay();
  const [reduceMotion, setReduceMotion] = useState(true);
  const t = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => listenForReduceMotionChanges(AccessibilityInfo, setReduceMotion), []);
  useEffect(() => {
    t.stopAnimation(); sway.stopAnimation();
    if (reduceMotion || animationKey === 0) { t.setValue(1); sway.setValue(0); return; }
    t.setValue(0); sway.setValue(0);
    const anim = Animated.parallel([
      Animated.timing(t, { toValue: 1, duration: correct ? 1100 : 900, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      Animated.loop(Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(sway, { toValue: -1, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]), { iterations: 2 }),
    ]);
    anim.start(({ finished }) => { if (finished) sway.setValue(0); });
    return () => { anim.stop(); };
  }, [animationKey, correct, reduceMotion, t, sway]);

  const kind = KINDS[Math.abs(animationKey) % KINDS.length];
  const ring = correct ? p.sun : p.sky;
  const ringScale = t.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.25] });
  const ringOpacity = t.interpolate({ inputRange: [0, 0.6, 1], outputRange: correct ? [0.9, 0.5, 0] : [0.5, 0.25, 0] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', correct ? '200deg' : '40deg'] });
  const tilt = sway.interpolate({ inputRange: [-1, 1], outputRange: correct ? ['-8deg', '8deg'] : ['-3deg', '3deg'] });

  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={s.wrap}>
      <View style={[s.platform, { backgroundColor: correct ? p.successSoft : p.skySoft, borderColor: correct ? p.success : p.sky }]} />
      <Animated.View style={[s.ring, { borderColor: ring, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
      {correct && <Animated.View style={[s.orbit, { transform: [{ rotate }] }]}>
        {STARS.map(i => {
          const a = (i / STARS.length) * Math.PI * 2;
          const fly = t.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
          return <Animated.View key={i} style={[s.star, {
            backgroundColor: i % 2 ? p.sun : p.coral,
            opacity: t.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, reduceMotion ? 1 : 0.35] }),
            transform: [{ translateX: Animated.multiply(fly, Math.cos(a) * 62) }, { translateY: Animated.multiply(fly, Math.sin(a) * 30) }, { rotate: '45deg' }],
          }]} />;
        })}
      </Animated.View>}
      {!correct && <View style={s.dots}>
        {[0, 1, 2].map(i => <Animated.View key={i} style={[s.dot, { backgroundColor: p.sky,
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }),
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [8, -i * 6] }) }] }]} />)}
      </View>}
      <Animated.View style={[s.pet, { transform: [{ rotate: tilt }] }]}>
        <PetTeacherReaction kind={kind} mood={correct ? 'happy' : 'sad'} jumpKey={correct ? animationKey : 0} size={72} />
      </Animated.View>
    </View>
  );
}

export default PracticeCelebrationPark;

const s = StyleSheet.create({
  wrap: { width: '100%', height: 100, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  platform: { position: 'absolute', bottom: 4, width: 120, height: 16, borderRadius: 60, borderWidth: 2, borderBottomWidth: 4 },
  ring: { position: 'absolute', bottom: 0, width: 150, height: 60, borderRadius: 75, borderWidth: 3 },
  orbit: { position: 'absolute', bottom: 40, width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  star: { position: 'absolute', width: 9, height: 9, borderRadius: 2 },
  dots: { position: 'absolute', top: 10, right: '30%', flexDirection: 'row', gap: 5, alignItems: 'flex-end' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pet: { marginBottom: 10 },
});
