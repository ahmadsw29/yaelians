import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import Svg, { Path, Ellipse, Circle } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

const tips = [
  'أنا مِشمِش، رفيقك في التعلّم. خطوة صغيرة كل مرة!',
  'اقرأ الجملة كاملة قبل اختيار الإجابة.',
  'الخطأ فرصة للتعلّم، وليس سببًا للتوقّف.',
  'ابحث عن دليل في النص، ولا تعتمد على التخمين وحده.',
];
const kittenInk = { fur: '#f4b66f', inner: '#e98f91', outline: '#9d6848', face: '#493a30', cream: '#fff0d9', scarf: '#4c9a88' };

function MashmashArt({ mood, size }: { mood: 'happy' | 'sad'; size: number }) {
  const happy = mood === 'happy';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M72 71 Q94 76 91 57 Q90 49 82 50" fill="none" stroke={kittenInk.fur} strokeWidth="8" strokeLinecap="round" />
      <Path d="M29 72 Q28 60 33 57 L67 57 Q72 62 71 76 L68 91 Q61 96 54 91 L49 89 Q43 96 34 91Z" fill={kittenInk.fur} stroke={kittenInk.outline} strokeWidth="2.5" strokeLinejoin="round" />
      <Ellipse cx="50" cy="80" rx="14" ry="13" fill={kittenInk.cream} />
      <Path d="M25 42 L22 12 Q22 7 27 11 L45 27 Q51 25 56 27 L74 11 Q79 7 78 13 L75 44" fill={kittenInk.fur} stroke={kittenInk.outline} strokeWidth="2.5" strokeLinejoin="round" />
      <Path d="M29 31 L27 18 L40 29 M61 29 L74 18 L72 33" fill={kittenInk.inner} />
      <Ellipse cx="50" cy="49" rx="35" ry="31" fill={kittenInk.fur} stroke={kittenInk.outline} strokeWidth="2.5" />
      <Path d="M44 25 Q50 31 56 25 M47 23L50 27L53 23" fill="none" stroke="#da9958" strokeWidth="2.4" strokeLinecap="round" />
      <Ellipse cx="37" cy="51" rx="8.5" ry="10.5" fill={kittenInk.cream} />
      <Ellipse cx="63" cy="51" rx="8.5" ry="10.5" fill={kittenInk.cream} />
      <Ellipse cx="38" cy={happy ? 53 : 55} rx="4.8" ry="6.7" fill={kittenInk.face} />
      <Ellipse cx="62" cy={happy ? 53 : 55} rx="4.8" ry="6.7" fill={kittenInk.face} />
      <Circle cx="39.5" cy={happy ? 50 : 52} r="2" fill="#fff" />
      <Circle cx="63.5" cy={happy ? 50 : 52} r="2" fill="#fff" />
      {!happy && <Path d="M29 43 Q37 40 44 46 M56 46 Q63 40 71 43" fill="none" stroke={kittenInk.outline} strokeWidth="2.2" strokeLinecap="round" />}
      <Ellipse cx="27" cy="63" rx="6" ry="3.2" fill={kittenInk.inner} opacity=".7" />
      <Ellipse cx="73" cy="63" rx="6" ry="3.2" fill={kittenInk.inner} opacity=".7" />
      <Path d="M47 61 Q50 58 53 61 L50 64Z" fill={kittenInk.inner} />
      {happy
        ? <Path d="M50 64 Q47 69 44 66 M50 64 Q53 69 56 66" fill="none" stroke={kittenInk.face} strokeWidth="2.2" strokeLinecap="round" />
        : <Path d="M45 68 Q50 63 55 68" fill="none" stroke={kittenInk.face} strokeWidth="2.2" strokeLinecap="round" />}
      <Path d="M18 61 L9 59 M19 66 L10 68 M82 61 L91 59 M81 66 L90 68" fill="none" stroke={kittenInk.outline} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M31 76 Q50 86 69 76 L65 84 Q50 91 35 84Z" fill={kittenInk.scarf} stroke="#377669" strokeWidth="1.5" />
      <Path d="M61 83 L70 87 L63 92Z" fill="#ed8c75" />
      <Ellipse cx="38" cy="90" rx="8" ry="4" fill={kittenInk.fur} stroke={kittenInk.outline} strokeWidth="1.5" />
      <Ellipse cx="63" cy="90" rx="8" ry="4" fill={kittenInk.fur} stroke={kittenInk.outline} strokeWidth="1.5" />
    </Svg>
  );
}

export function PetTeacherReaction({
  mood,
  size = 64,
  jumpKey = 0,
  testID,
}: {
  mood: 'happy' | 'sad';
  size?: number;
  jumpKey?: number;
  testID?: string;
}) {
  const jump = useRef(new Animated.Value(0)).current;
  const squash = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (mood !== 'happy' || jumpKey === 0) {
      jump.stopAnimation();
      squash.stopAnimation();
      jump.setValue(0);
      squash.setValue(1);
      return;
    }
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(jump, { toValue: -13, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(squash, { toValue: 1.12, duration: 130, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(jump, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.spring(squash, { toValue: 1, damping: 6, stiffness: 220, useNativeDriver: true }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [mood, jumpKey, jump, squash]);
  return (
    <Animated.View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      testID={testID}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: jump }, { scale: squash }] }}>
      <MashmashArt mood={mood} size={size} />
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
        <MashmashArt mood="happy" size={68} />
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
