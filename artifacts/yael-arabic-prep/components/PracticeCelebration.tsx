import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Creature } from '@/components/PetTeacher';
import { usePlay } from '@/components/Playful';
import { listenForReduceMotionChanges } from '@/lib/pet-teacher-motion';
import type { PracticeCelebrationVariant } from '@/lib/practice-celebrations';

const scenes = {
  'tutor-cheer': { title: 'أنهيتَ الجولة بثبات', detail: 'خطوة أخرى نحو هدفك.', icon: 'flame' },
  'spark-burst': { title: 'تدريب جديد، تقدّم جديد', detail: 'استمرّ في بناء ثقتك.', icon: 'sparkles' },
  'badge-pop': { title: 'إنجاز يستحق الاحتفال', detail: 'أنهيتَ ما بدأتَه اليوم.', icon: 'ribbon' },
  'page-turn': { title: 'صفحة جديدة في تعلّمك', detail: 'كل جولة تزيدك خبرة.', icon: 'book' },
  'high-five': { title: 'أحسنتَ، اكتملت الجلسة', detail: 'خذ نفسًا، ثم واصل بطريقتك.', icon: 'hand-left' },
} as const;

export default function PracticeCelebration({ variant }: { variant: PracticeCelebrationVariant }) {
  const c = useColors();
  const p = usePlay();
  const scene = scenes[variant];
  const [reduceMotion, setReduceMotion] = useState(true);
  const lift = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const badge = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(1)).current;
  const played = useRef(false);

  useEffect(() => listenForReduceMotionChanges(AccessibilityInfo, setReduceMotion), []);
  useEffect(() => {
    if (reduceMotion) {
      lift.stopAnimation(); tilt.stopAnimation(); badge.stopAnimation(); burst.stopAnimation();
      lift.setValue(0); tilt.setValue(0); badge.setValue(1); burst.setValue(1);
      return;
    }
    if (played.current) return;
    played.current = true;
    badge.setValue(0.65);
    burst.setValue(0);
    const timing = (value: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(value, { toValue, duration, easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    const gestures: Record<PracticeCelebrationVariant, Animated.CompositeAnimation> = {
      'tutor-cheer': Animated.sequence([timing(lift, -23, 210), timing(lift, 0, 280), timing(lift, -8, 150), timing(lift, 0, 180)]),
      'spark-burst': Animated.sequence([timing(tilt, -5, 180), timing(tilt, 5, 240), timing(tilt, 0, 220)]),
      'badge-pop': Animated.sequence([timing(lift, -7, 230), timing(lift, 0, 310)]),
      'page-turn': Animated.sequence([timing(tilt, 8, 250), timing(tilt, -3, 250), timing(tilt, 0, 220)]),
      'high-five': Animated.sequence([Animated.parallel([timing(lift, -12, 210), timing(tilt, -8, 210)]), timing(tilt, 6, 180), Animated.parallel([timing(lift, 0, 260), timing(tilt, 0, 260)])]),
    };
    const animation = Animated.parallel([
      gestures[variant],
      Animated.sequence([
        Animated.delay(variant === 'badge-pop' ? 240 : 100),
        Animated.spring(badge, { toValue: variant === 'badge-pop' ? 1.18 : 1.05, damping: 7, stiffness: 180, useNativeDriver: Platform.OS !== 'web' }),
        timing(badge, 1, 200),
      ]),
      Animated.sequence([timing(burst, 1.35, variant === 'spark-burst' ? 400 : 600), timing(burst, 1, 300)]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, variant, lift, tilt, badge, burst]);

  return (
    <View testID="practice-celebration" style={[styles.card, { backgroundColor: p.sunSoft, borderColor: p.sun }]}>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: p.sunInk }]}>اكتملت الجلسة</Text>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[styles.title, { color: c.foreground }]}>{scene.title}</Text>
        <Text style={[styles.detail, { color: c.mutedForeground }]}>{scene.detail}</Text>
      </View>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.stage}>
        <Animated.View style={[styles.decorations, { opacity: burst.interpolate({ inputRange: [0, 1, 1.35], outputRange: [0, 0.7, 1] }), transform: [{ scale: burst }] }]}>
          <Ionicons name="sparkles" size={22} color={p.coral} style={styles.sparkle} />
          <View style={[styles.dot, { backgroundColor: p.brand }]} />
          <View style={[styles.smallDot, { backgroundColor: p.sky }]} />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: lift }, { rotate: tilt.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] }) }] }}>
          <Creature kind="zizo" mood="hype" size={132} />
        </Animated.View>
        <Animated.View style={[styles.badge, { backgroundColor: p.sun, borderColor: p.sunShade, transform: [{ scale: badge }] }]}>
          <Ionicons name={scene.icon} size={23} color={p.sunInk} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 620, flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 2, borderBottomWidth: 5, borderRadius: 24, padding: 16, minHeight: 174, marginVertical: 10 },
  copy: { flex: 1, alignItems: 'flex-end', gap: 6 },
  eyebrow: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  title: { fontSize: 21, lineHeight: 30, fontWeight: '800', textAlign: 'right' },
  detail: { fontSize: 12, lineHeight: 20, textAlign: 'right' },
  stage: { width: 126, height: 148, alignItems: 'center', justifyContent: 'flex-end' },
  decorations: { position: 'absolute', top: 4, left: 0, right: 0, bottom: 0 },
  sparkle: { position: 'absolute', top: 5, left: 8 },
  dot: { position: 'absolute', top: 26, right: 10, width: 6, height: 6, borderRadius: 3 },
  smallDot: { position: 'absolute', bottom: 25, left: 5, width: 4, height: 9, borderRadius: 2, transform: [{ rotate: '25deg' }] },
  badge: { position: 'absolute', left: 2, bottom: 5, width: 42, height: 42, borderRadius: 15, borderWidth: 0, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' },
});
