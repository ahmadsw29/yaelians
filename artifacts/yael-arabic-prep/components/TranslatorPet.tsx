import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, View } from 'react-native';
import { listenForReduceMotionChanges } from '@/lib/pet-teacher-motion';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { usePlay } from '@/components/Playful';

/**
 * "Tarjem" — a small parrot interpreter with a bow tie and two speech
 * bubbles (Arabic ع / Hebrew א). Purely decorative: callers own the label.
 */
export function TranslatorPet({ size = 64, idle = true }: { size?: number; idle?: boolean }) {
  const p = usePlay();
  const bob = useRef(new Animated.Value(0)).current;

  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => listenForReduceMotionChanges(AccessibilityInfo, setReduceMotion), []);

  useEffect(() => {
    if (reduceMotion || !idle) { bob.stopAnimation(); bob.setValue(0); return; }
    const native = Platform.OS !== 'web';
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    loop.start();
    return () => { loop.stop(); bob.setValue(0); };
  }, [bob, idle, reduceMotion]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });

  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: size, height: size, transform: [{ translateY }] }}
    >
      <View pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 64 64">
          {/* bubbles */}
          <G>
            <Path d="M2 8 a6 6 0 0 1 6-6 h10 a6 6 0 0 1 6 6 v4 a6 6 0 0 1-6 6 h-6 l-4 4 v-4 a6 6 0 0 1-6-6z" fill={p.sun} stroke={p.sunShade} strokeWidth={1.5} />
            <SvgText x={13} y={14.5} fontSize={10} fontWeight="bold" fill={p.sunInk} textAnchor="middle">ع</SvgText>
            <Path d="M40 8 a6 6 0 0 1 6-6 h10 a6 6 0 0 1 6 6 v4 a6 6 0 0 1-6 6 v4 l-4-4 h-6 a6 6 0 0 1-6-6z" fill={p.sky} stroke={p.skyShade} strokeWidth={1.5} />
            <SvgText x={51} y={14.5} fontSize={10} fontWeight="bold" fill={p.onBrand} textAnchor="middle">א</SvgText>
          </G>
          {/* tail + body */}
          <Path d="M26 56 l-4 7 l8-3z M38 56 l4 7 l-8-3z" fill={p.coralShade} />
          <Ellipse cx={32} cy={42} rx={15} ry={16} fill={p.brand} stroke={p.brandShade} strokeWidth={2} />
          <Ellipse cx={32} cy={47} rx={9} ry={9} fill={p.brandSoft} />
          {/* wings */}
          <Path d="M17 40 q-5 8 2 14 q3-7 1-14z" fill={p.brandShade} />
          <Path d="M47 40 q5 8-2 14 q-3-7-1-14z" fill={p.brandShade} />
          {/* crest */}
          <Path d="M28 27 q2-7 6-6 q-1 3 1 5 q3-3 6-1 q-4 1-5 4z" fill={p.coral} />
          {/* eyes */}
          <Circle cx={26.5} cy={36} r={4} fill={p.onBrand} />
          <Circle cx={37.5} cy={36} r={4} fill={p.onBrand} />
          <Circle cx={27.3} cy={36.4} r={2} fill="#1d2b28" />
          <Circle cx={38.3} cy={36.4} r={2} fill="#1d2b28" />
          {/* glasses bridge */}
          <Path d="M30.5 36 h3" stroke={p.sunShade} strokeWidth={1.4} />
          <Circle cx={26.5} cy={36} r={4.8} fill="none" stroke={p.sunShade} strokeWidth={1.2} />
          <Circle cx={37.5} cy={36} r={4.8} fill="none" stroke={p.sunShade} strokeWidth={1.2} />
          {/* beak */}
          <Path d="M29 41 q3-2 6 0 q-1 5-3 6 q-2-1-3-6z" fill={p.sun} stroke={p.sunShade} strokeWidth={1} />
          {/* bow tie */}
          <Path d="M27 52 l5 2 l-5 2z M37 52 l-5 2 l5 2z" fill={p.coral} />
          <Rect x={30.8} y={52.8} width={2.4} height={2.4} rx={1} fill={p.coralShade} />
        </Svg>
      </View>
    </Animated.View>
  );
}
