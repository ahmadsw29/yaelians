import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlay } from '@/components/Playful';
import { ARABIC_BOLD_FONT } from '@/constants/typography';
import { listenForReduceMotionChanges } from '@/lib/pet-teacher-motion';

const ND = Platform.OS !== 'web';

function useReduceMotion() {
  const [reduce, setReduce] = useState(true);
  useEffect(() => listenForReduceMotionChanges(AccessibilityInfo, setReduce), []);
  return reduce;
}

const SPARKS = [0, 1, 2, 3, 4, 5];

export function VocabularyHintButton({ used, disabled, onPress }: { used: boolean; disabled: boolean; onPress: () => void }) {
  const p = usePlay();
  const reduce = useReduceMotion();
  const enter = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const bulb = useRef(new Animated.Value(1)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const prevUsed = useRef(used);
  const all = [enter, glow, bulb, tilt, burst, press];

  // entrance
  useEffect(() => {
    if (reduce) { enter.stopAnimation(); enter.setValue(1); return; }
    const a = Animated.spring(enter, { toValue: 1, friction: 7, tension: 70, useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [reduce, enter]);

  // breathing glow while available
  useEffect(() => {
    if (reduce || used || disabled) { glow.stopAnimation(); glow.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]));
    loop.start();
    return () => { loop.stop(); glow.setValue(0); };
  }, [reduce, used, disabled, glow]);

  // use celebration
  useEffect(() => {
    const became = used && !prevUsed.current;
    prevUsed.current = used;
    if (!became) return;
    if (reduce) { bulb.setValue(1); tilt.setValue(0); burst.setValue(1); return; }
    bulb.setValue(0.6); tilt.setValue(0); burst.setValue(0);
    const a = Animated.parallel([
      Animated.spring(bulb, { toValue: 1, friction: 3, tension: 140, useNativeDriver: ND }),
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 110, useNativeDriver: ND }),
        Animated.timing(tilt, { toValue: -1, duration: 160, useNativeDriver: ND }),
        Animated.spring(tilt, { toValue: 0, friction: 4, useNativeDriver: ND }),
      ]),
      Animated.timing(burst, { toValue: 1, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
    ]);
    a.start();
    return () => a.stop();
  }, [used, reduce, bulb, tilt, burst]);

  // snap everything if reduce motion turns on mid-animation
  useEffect(() => {
    if (!reduce) return;
    all.forEach(v => v.stopAnimation());
    enter.setValue(1); glow.setValue(0); bulb.setValue(1); tilt.setValue(0); burst.setValue(1); press.setValue(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  useEffect(() => () => all.forEach(v => v.stopAnimation()), // eslint-disable-line react-hooks/exhaustive-deps
    []);

  const pressTo = (v: number) => {
    if (reduce || used || disabled) return;
    Animated.spring(press, { toValue: v, friction: 6, tension: 200, useNativeDriver: ND }).start();
  };

  const inactive = used || disabled;
  const bg = used ? p.sunSoft : disabled ? p.muted : p.sun;
  const border = used ? p.sun : disabled ? p.track : p.sunShade;
  const fg = used ? p.sunInk : disabled ? p.mutedForeground : p.sunInk;
  const label = used ? 'بمساعدة' : 'تلميح';

  return (
    <Animated.View style={{ opacity: enter, transform: [{ scale: Animated.multiply(enter.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }), press) }] }}>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        <Animated.View style={[st.halo, { backgroundColor: p.sun, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }), transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }]} />
        <Animated.View style={[st.halo, { borderWidth: 2, borderColor: p.sun, opacity: burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.7, 0] }), transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] }) }] }]} />
      </View>
      <Pressable testID="vocabulary-hint" onPress={onPress} disabled={inactive}
        onPressIn={() => pressTo(0.94)} onPressOut={() => pressTo(1)}
        accessibilityRole="button"
        accessibilityLabel={used ? 'تم استخدام التلميح. الإجابة بمساعدة لا تُحسب إتقاناً للكلمة' : 'تلميح: يحذف خيارين خاطئين. الإجابة بمساعدة لا تُحسب إتقاناً للكلمة'}
        accessibilityState={{ disabled: inactive, selected: used }}
        style={[st.btn, { backgroundColor: bg, borderColor: border }]}>
        <Text style={[st.label, { color: fg }]}>{label}</Text>
        <View style={st.iconBox}>
          <Animated.View style={{ transform: [{ scale: bulb }, { rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] }) }] }}>
            <Ionicons name={used ? 'bulb' : 'bulb-outline'} size={20} color={fg} />
          </Animated.View>
          {!used && !disabled && <Ionicons name="sparkles" size={10} color={fg} style={st.sparkle} />}
          <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {SPARKS.map(i => {
              const ang = (i / SPARKS.length) * Math.PI * 2 - Math.PI / 2;
              return (
                <Animated.View key={i} style={[st.spark, {
                  opacity: burst.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 0.6, 0] }),
                  transform: [
                    { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(ang) * 20] }) },
                    { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(ang) * 20] }) },
                    { scale: burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1, 0.4] }) },
                  ],
                }]}>
                  <Ionicons name="star" size={8} color={i % 2 ? p.coral : p.sunShade} />
                </Animated.View>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function HintedVocabularyOption({ eliminated, highlighted, children }: { eliminated: boolean; highlighted: boolean; children: React.ReactNode }) {
  const p = usePlay();
  const reduce = useReduceMotion();
  const fade = useRef(new Animated.Value(eliminated ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fade.stopAnimation();
    if (reduce) { fade.setValue(eliminated ? 1 : 0); return; }
    const a = Animated.timing(fade, { toValue: eliminated ? 1 : 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [eliminated, reduce, fade]);

  useEffect(() => {
    pulse.stopAnimation();
    if (reduce || !highlighted) { pulse.setValue(0); return; }
    const a = Animated.sequence([
      Animated.delay(180),
      Animated.timing(pulse, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.timing(pulse, { toValue: 0, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: ND }),
      Animated.timing(pulse, { toValue: 0.7, duration: 320, useNativeDriver: ND }),
      Animated.timing(pulse, { toValue: 0, duration: 620, useNativeDriver: ND }),
    ]);
    a.start();
    return () => a.stop();
  }, [highlighted, reduce, pulse]);

  return (
    <Animated.View style={{
      opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0.38] }),
      transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) }],
    }}>
      {children}
      <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[st.optGlow, { borderColor: p.sun, opacity: pulse, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] }) }] }]} />
    </Animated.View>
  );
}

const st = StyleSheet.create({
  btn: { minHeight: 44, minWidth: 44, borderRadius: 14, borderWidth: 2, borderBottomWidth: 4, paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 14, lineHeight: 24, writingDirection: 'rtl', includeFontPadding: true },
  iconBox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute', top: -3, right: -4 },
  spark: { position: 'absolute', left: 8, top: 8 },
  halo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16 },
  optGlow: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 18, borderWidth: 3 },
});
