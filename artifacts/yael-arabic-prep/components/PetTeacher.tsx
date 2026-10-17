import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import Svg, { Path, Ellipse, Circle, Rect } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

const tips = [
  'أنا مِشمِش، رفيقك في التعلّم. خطوة صغيرة كل مرة!',
  'اقرأ الجملة كاملة قبل اختيار الإجابة.',
  'الخطأ فرصة للتعلّم، وليس سببًا للتوقّف.',
  'ابحث عن دليل في النص، ولا تعتمد على التخمين وحده.',
];
// Illustration pigments remain warm in both themes.
const ink = { fur: '#efb879', inner: '#e29383', outline: '#493a30', paper: '#fff3da' };

export function PetTeacherReaction({ mood }: { mood: 'happy' | 'sad' }) {
  const jump = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (mood !== 'happy') { jump.stopAnimation(); jump.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(jump, { toValue: -8, duration: 180, useNativeDriver: true }),
      Animated.timing(jump, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.delay(260),
    ]));
    animation.start();
    return () => animation.stop();
  }, [mood, jump]);
  return (
    <Animated.View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: 64, height: 68, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: jump }] }}>
      <Svg width={60} height={66} viewBox="0 0 100 110">
        <Path d="M78 84 Q102 60 89 55" fill="none" stroke={ink.fur} strokeWidth="9" strokeLinecap="round" />
        <Ellipse cx="49" cy="82" rx="27" ry="23" fill={ink.fur} />
        <Path d="M18 48 L15 13 L39 27 Q51 22 65 27 L87 13 L83 49Z" fill={ink.fur} />
        <Path d="M23 31 L22 22 L34 30 M70 31 L81 22 L79 35" fill={ink.inner} />
        <Ellipse cx="50" cy="50" rx="35" ry="27" fill={ink.fur} />
        {mood === 'happy' ? <>
          <Path d="M29 47 Q36 39 43 47 M57 47 Q64 39 72 47" stroke={ink.outline} strokeWidth="3" fill="none" strokeLinecap="round" />
          <Path d="M44 60 Q50 70 58 60Z" fill={ink.outline} />
          <Ellipse cx="52" cy="67" rx="4" ry="3" fill={ink.inner} />
          <Path d="M15 51L8 45 M85 51L92 45 M18 60L11 61 M82 60L89 61" stroke={ink.paper} strokeWidth="3" strokeLinecap="round" />
        </> : <>
          <Path d="M28 45 Q36 51 44 45 M56 45 Q64 51 72 45" stroke={ink.outline} strokeWidth="3" fill="none" strokeLinecap="round" />
          <Path d="M44 68 Q50 59 58 68" stroke={ink.outline} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <Path d="M29 56 Q36 59 41 56 M60 56 Q66 59 71 56" stroke={ink.inner} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>}
        <Path d="M47 54L54 54L50 58Z" fill={ink.inner} />
        <Rect x="28" y="78" width="44" height="23" rx="4" fill="#17665c" />
        <Path d="M50 81V99 M33 84H45 M55 84H67" stroke={ink.paper} strokeWidth="2" />
      </Svg>
    </Animated.View>
  );
}

export default function PetTeacher({ quiet = false }: { quiet?: boolean }) {
  const c = useColors();
  const [tip, setTip] = useState(0);
  const [hidden, setHidden] = useState(false);
  if (hidden) return (
    <Pressable accessibilityRole="button" accessibilityLabel="إظهار المعلم مشمش" onPress={() => setHidden(false)} style={{ padding: 10 }}>
      <Text style={{ color: c.primary, textAlign: 'right' }}>إظهار مشمش</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18, backgroundColor: c.secondary, marginVertical: 10 }}>
      <Pressable testID="pet-teacher" accessibilityRole="button" accessibilityLabel={quiet ? 'المعلم مشمش في وضع هادئ' : 'نصيحة جديدة من مشمش'} onPress={() => { if (!quiet) setTip((tip + 1) % tips.length); }}>
        <Svg width={68} height={76} viewBox="0 0 100 110">
          <Path d="M78 84 Q102 60 89 55" fill="none" stroke={ink.fur} strokeWidth="9" strokeLinecap="round" />
          <Ellipse cx="49" cy="82" rx="27" ry="23" fill={ink.fur} />
          <Path d="M18 48 L15 13 L39 27 Q51 22 65 27 L87 13 L83 49Z" fill={ink.fur} />
          <Path d="M23 31 L22 22 L34 30 M70 31 L81 22 L79 35" fill={ink.inner} />
          <Ellipse cx="50" cy="50" rx="35" ry="27" fill={ink.fur} />
          <Circle cx="36" cy="48" r="10" stroke={ink.outline} strokeWidth="2" fill="none" />
          <Circle cx="65" cy="48" r="10" stroke={ink.outline} strokeWidth="2" fill="none" />
          <Path d="M46 47 Q51 44 55 47" stroke={ink.outline} strokeWidth="2" fill="none" />
          <Circle cx="36" cy="48" r="3" fill={ink.outline} /><Circle cx="65" cy="48" r="3" fill={ink.outline} />
          <Path d="M47 57 L54 57 L50 61Z" fill={ink.inner} />
          <Path d="M43 63 Q50 70 58 63" fill="none" stroke={ink.outline} strokeWidth="2" strokeLinecap="round" />
          <Rect x="25" y="78" width="50" height="24" rx="4" fill={c.primary} />
          <Path d="M50 81V99 M30 84H44 M56 84H70" stroke={ink.paper} strokeWidth="2" />
        </Svg>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.secondaryForeground, fontSize: 12, lineHeight: 21, textAlign: 'right' }}>{quiet ? 'مشمش يرافقك بهدوء. ركّز، أنت قادر!' : tips[tip]}</Text>
        <Pressable onPress={() => setHidden(true)} accessibilityRole="button" accessibilityLabel="إخفاء المعلم مشمش" style={{ alignSelf: 'flex-end', paddingVertical: 5 }}>
          <Text style={{ color: c.mutedForeground, fontSize: 11 }}>إخفاء</Text>
        </Pressable>
      </View>
    </View>
  );
}
