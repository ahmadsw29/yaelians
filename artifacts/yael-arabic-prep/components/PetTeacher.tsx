import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Path, Ellipse, Rect, Text as SvgText } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { PROGRESS_MAX_HOP } from '@/lib/progress-marker';
import { listenForReduceMotionChanges, updatePetTeacherMotion } from '@/lib/pet-teacher-motion';

const tips = [
  'أنا رامي، مدرّبك. نصل إلى هدفك خطوة بخطوة.',
  'اقرأ الجملة كاملة قبل اختيار الإجابة.',
  'الخطأ فرصة للتعلّم، وليس سببًا للتوقّف.',
  'ابحث عن دليل في النص، ولا تعتمد على التخمين وحده.',
];
// Fixed illustration pigments, independent of the app's light/dark surfaces.
const tutorInk = { skin: '#c78b67', shadow: '#b87955', hair: '#263431', jacket: '#344e49', shirt: '#f6e6c8', gold: '#e7a15e', mouth: '#704337' };

export function YoungTutorArt({ mood = 'happy', size, full = false }: { mood?: 'happy' | 'sad'; size: number; full?: boolean }) {
  const happy = mood === 'happy';
  return (
    <Svg width={size} height={size} viewBox={full ? '0 0 190 218' : '51 23 99 139'}>
      <Ellipse cx="99" cy="202" rx="66" ry="9" fill={tutorInk.hair} opacity=".12" />
      <Path d="M40 210c4-46 24-67 58-67s57 21 60 67H40Z" fill={tutorInk.gold} />
      <Path d="M54 211c3-35 15-57 45-62l12 18 13-18c19 6 30 25 34 62H54Z" fill={tutorInk.jacket} />
      <Path d="m84 149 15 20 14-20 9 9-13 24H91l-15-24 8-9Z" fill={tutorInk.shirt} />
      <Path d="M77 105h43v43c-6 11-14 16-22 16-9 0-16-6-21-16v-43Z" fill={tutorInk.shadow} />
      <Path d="M67 77c0-27 13-43 33-43 23 0 37 16 37 44v19c0 29-17 46-37 46-19 0-33-18-33-46V77Z" fill={tutorInk.skin} />
      <Path d="M66 86c-7-29 8-55 32-58 17-3 36 5 42 25 6 18-1 34-2 40-4-7-7-15-7-25-14 7-35 9-57 5-1 11-2 20-5 27-3-3-3-8-3-14Z" fill={tutorInk.hair} />
      <Path d="M74 73c7-12 18-19 34-21 11-1 21 2 28 8-3-18-17-28-35-27-20 1-31 16-27 40Z" fill={tutorInk.hair} />
      <Path d={happy ? 'M78 91c4-3 10-3 14 0m20 0c4-3 10-3 14 0' : 'M78 92l14-3m20 0 14 3'} fill="none" stroke={tutorInk.mouth} strokeWidth="3" strokeLinecap="round" />
      <Path d={happy ? 'M83 99c2 2 6 2 8 0m21 0c2 2 6 2 8 0' : 'M83 100h7m23 0h7'} fill="none" stroke={tutorInk.hair} strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M102 98c-1 8-4 13-2 15 2 2 5 2 8 0" fill="none" stroke={tutorInk.shadow} strokeWidth="2" strokeLinecap="round" />
      <Path d={happy ? 'M91 126c6 6 16 6 22 0' : 'M93 129q9-4 18 0'} fill="none" stroke={tutorInk.mouth} strokeWidth="2.7" strokeLinecap="round" />
      {full && <>
        <Path d="M128 161c14-6 25-16 29-30" fill="none" stroke={tutorInk.skin} strokeWidth="10" strokeLinecap="round" />
        <Path d="M155 131c3-8 9-10 15-6l3 4-5 11-10 1" fill={tutorInk.skin} />
        <Rect x="126" y="86" width="48" height="39" rx="8" fill={tutorInk.shirt} stroke={tutorInk.gold} strokeWidth="1.5" transform="rotate(7 126 86)" />
        <SvgText x="150" y="106" textAnchor="middle" fontSize="11" fontWeight="700" fill={tutorInk.jacket}>יעל</SvgText>
        <Path d="M139 113h24" stroke={tutorInk.gold} strokeWidth="2.5" strokeLinecap="round" />
      </>}
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
  const previousJumpKey = useRef(jumpKey);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    return listenForReduceMotionChanges(AccessibilityInfo, setReduceMotion);
  }, []);
  useEffect(() => {
    if (!updatePetTeacherMotion(mood, jumpKey, reduceMotion, previousJumpKey, jump, squash)) return;
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(jump, { toValue: -PROGRESS_MAX_HOP, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(squash, { toValue: 1.12, duration: 130, useNativeDriver: Platform.OS !== 'web' }),
      ]),
      Animated.parallel([
        Animated.timing(jump, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(squash, { toValue: 1, damping: 6, stiffness: 220, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [mood, jumpKey, jump, squash, reduceMotion]);
  return (
    <Animated.View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      testID={testID}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: jump }, { scale: squash }] }}>
      <YoungTutorArt mood={mood} size={size} />
    </Animated.View>
  );
}

export default function StudyTutor({ quiet = false }: { quiet?: boolean }) {
  const c = useColors();
  const [tip, setTip] = useState(0);
  const [hidden, setHidden] = useState(false);
  if (hidden) return (
    <Pressable accessibilityRole="button" accessibilityLabel="إظهار المدرّب رامي" onPress={() => setHidden(false)} style={{ padding: 10 }}>
      <Text style={{ color: c.primary, textAlign: 'right' }}>إظهار رامي</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18, backgroundColor: c.secondary, marginVertical: 10 }}>
      <Pressable testID="pet-teacher" accessibilityRole="button" accessibilityLabel={quiet ? 'المدرّب رامي في وضع هادئ' : 'نصيحة جديدة من رامي'} onPress={() => { if (!quiet) setTip((tip + 1) % tips.length); }}>
        <YoungTutorArt size={68} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.secondaryForeground, fontSize: 12, lineHeight: 21, textAlign: 'right' }}>{quiet ? 'رامي معك. خذ وقتك في قراءة السؤال، ثم اختر بثقة.' : tips[tip]}</Text>
        <Pressable onPress={() => setHidden(true)} accessibilityRole="button" accessibilityLabel="إخفاء المدرّب رامي" style={{ alignSelf: 'flex-end', paddingVertical: 5 }}>
          <Text style={{ color: c.mutedForeground, fontSize: 11 }}>إخفاء</Text>
        </Pressable>
      </View>
    </View>
  );
}
