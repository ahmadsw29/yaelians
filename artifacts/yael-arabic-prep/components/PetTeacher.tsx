import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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
