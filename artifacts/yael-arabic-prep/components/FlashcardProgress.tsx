import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { usePlay } from '@/components/Playful';
import { useReduceMotion } from '@/components/HomeMotion';

/** Decorative feedback only: never delays flipping, saving, or the next card. */
export default function FlashcardProgress({ completed, total }: { completed: number; total: number }) {
  const p = usePlay();
  const reduce = useReduceMotion();
  const count = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const done = Math.max(0, Math.min(count, Math.floor(Number.isFinite(completed) ? completed : 0)));
  const fraction = count ? done / count : 0;
  const fill = useRef(new Animated.Value(fraction)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const gleam = useRef(new Animated.Value(0)).current;
  const previous = useRef(fraction);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const grew = fraction > previous.current;
    previous.current = fraction;
    pulse.setValue(0);
    gleam.setValue(0);
    if (reduce || !grew) {
      fill.setValue(fraction);
      return;
    }
    // Width is a layout property: use the JS driver on native as well as web.
    const animation = Animated.parallel([
      Animated.spring(fill, {
        toValue: fraction, damping: 17, stiffness: 135, mass: 0.85, useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
      Animated.timing(gleam, {
        toValue: 1, duration: 780, easing: Easing.out(Easing.quad), useNativeDriver: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [fraction, reduce, fill, pulse, gleam]);

  return (
    <View testID="flashcards-round-progress" style={s.row} accessible accessibilityRole="progressbar"
      accessibilityLabel="تقدّم مراجعة البطاقات"
      aria-valuemin={0} aria-valuemax={Math.max(1, count)} aria-valuenow={done}
      aria-valuetext={`راجعت ${done} من ${count} بطاقة`}
      accessibilityValue={{ min: 0, max: Math.max(1, count), now: done, text: `راجعت ${done} من ${count} بطاقة` }}>
      <Animated.Text testID="flashcards-progress-count" style={[s.count, {
        color: p.mutedForeground,
        transform: [
          { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) },
          { translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
        ],
      }]}>{`${Math.min(count, done + 1)} / ${count}`}</Animated.Text>
      <View style={s.barSpace} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
        <Animated.View pointerEvents="none" testID="flashcards-progress-glow" style={[s.glow, {
          borderColor: p.brand,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.8] }),
          transform: [{ scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
        }]} />
        <Animated.View testID="flashcards-progress-pulse" style={{
          transform: [{ scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) }],
        }}>
          <View style={[s.track, { backgroundColor: p.track }]}>
            <Animated.View testID="flashcards-progress-fill" style={[s.fill, {
              backgroundColor: p.brand,
              width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }),
            }]}>
              <View style={s.highlight} />
              <Animated.View pointerEvents="none" testID="flashcards-progress-glint" style={[s.glint, {
                opacity: pulse,
                transform: [{ translateX: gleam.interpolate({ inputRange: [0, 1], outputRange: [-72, width + 72] }) }, { skewX: '-20deg' }],
              }]} />
              {done > 0 && <Animated.View pointerEvents="none" style={[s.tip, {
                opacity: pulse,
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.5] }) }],
              }]} />}
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  count: { minWidth: 42, flexShrink: 0, fontWeight: '800', fontSize: 13, writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
  barSpace: { flex: 1, minWidth: 0 },
  track: { height: 16, borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8, alignSelf: 'flex-end', overflow: 'hidden' },
  highlight: { position: 'absolute', top: 3, left: 6, right: 6, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.38)' },
  glow: { position: 'absolute', left: -4, right: -4, top: -4, bottom: -4, borderRadius: 12, borderWidth: 2 },
  glint: { position: 'absolute', width: 58, left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)' },
  tip: { position: 'absolute', width: 8, height: 8, borderRadius: 4, left: 2, top: 4, backgroundColor: '#ffffff' },
});
