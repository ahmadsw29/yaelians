import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ChunkyButton, usePlay } from '@/components/Playful';
import { Creature } from '@/components/PetTeacher';
import { ARABIC_BOLD_FONT } from '@/constants/typography';

/** Third home practice card: dedicated reading comprehension. */
export default function HomeReadingEntry() {
  const router = useRouter();
  const p = usePlay();
  return (
    <View style={[s.card, { backgroundColor: p.card, borderColor: p.border }]}>
      <View style={[s.sky, { backgroundColor: p.skySoft }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width="100%" height="100%" viewBox="0 0 320 96" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
          <Circle cx="48" cy="26" r="14" fill={p.sun} opacity={0.85} />
          <Path d="M90 30c6-10 22-10 26 0 10-2 16 8 10 14H86c-8-2-6-14 4-14Z" fill={p.card} opacity={0.9} />
          <Path d="M210 22c5-8 18-8 21 0 8-1 13 6 8 11h-32c-6-2-5-11 3-11Z" fill={p.card} opacity={0.75} />
          <Path d="M140 18l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z" fill={p.sun} />
          <Path d="M268 46l1.5 3.5 3.5.5-2.5 2.5.5 3.5-3-2-3 2 .5-3.5-2.5-2.5 3.5-.5Z" fill={p.coral} />
          <Path d="M30 96c40-22 90-26 130-14s90 10 160-10v24Z" fill={p.sky} opacity={0.35} />
          <Rect x="150" y="62" width="44" height="28" rx="4" fill={p.sunSoft} stroke={p.skyShade} strokeWidth={2} />
          <Path d="M172 62v28" stroke={p.skyShade} strokeWidth={2} />
          <Path d="M156 70h11M156 76h11M156 82h8M177 70h11M177 76h11M177 82h8" stroke={p.skyInk} strokeWidth={1.6} strokeLinecap="round" />
          <Path d="M172 58c-6-14 4-26 0-40M172 58c8-12 20-10 28-22" stroke={p.sun} strokeWidth={1.6} strokeDasharray="2 4" fill="none" />
        </Svg>
        <View style={s.creature}><Creature kind="nuna" mood="hype" size={84} /></View>
      </View>
      <View style={s.body}>
        <View style={[s.chip, { backgroundColor: p.skySoft }]}><Text style={[s.chipText, { color: p.skyInk }]}>قصص قصيرة</Text></View>
        <Text style={[s.title, { color: p.foreground }]}>فهم المقروء</Text>
        <Text style={[s.text, { color: p.mutedForeground }]}>نصوص عبرية قصيرة مع أسئلة موجّهة بالعربية</Text>
        <ChunkyButton label="افتح القصة" icon="book" tone="ghost" testID="start-reading" onPress={() => router.push('/reading' as never)} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  sky: { height: 96, justifyContent: 'flex-end' },
  creature: { position: 'absolute', right: 14, bottom: -6 },
  body: { padding: 16, gap: 8 },
  chip: { alignSelf: 'flex-end', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 12, lineHeight: 20, writingDirection: 'rtl' },
  title: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 21, lineHeight: 34, textAlign: 'right', writingDirection: 'rtl' },
  text: { fontSize: 14, lineHeight: 23, textAlign: 'right', writingDirection: 'rtl', marginBottom: 4 },
});
