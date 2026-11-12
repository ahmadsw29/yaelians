import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlay } from '@/components/Playful';
import { Creature } from '@/components/PetTeacher';
import { ARABIC_BOLD_FONT } from '@/constants/typography';

/** Homepage entry shaped like a fanned deck of flashcards. */
export default function HomeFlashcardsEntry() {
  const p = usePlay();
  const router = useRouter();
  return (
    <Pressable testID="home-flashcards" accessibilityRole="button"
      accessibilityLabel="بطاقات الكلمات، اقلب البطاقة واسمع النطق وقيّم تذكّرك"
      onPress={() => router.push('/flashcards')}
      style={({ pressed }) => [s.wrap, pressed && { transform: [{ translateY: 3 }] }]}>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        <View style={[s.layer, s.layerBack, { backgroundColor: p.brandSoft, borderColor: p.border }]} />
        <View style={[s.layer, s.layerMid, { backgroundColor: p.secondary, borderColor: p.border }]} />
      </View>
      <View style={[s.front, { backgroundColor: p.card, borderColor: p.border }]}>
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.corner, { backgroundColor: p.brandSoft, borderColor: p.border }]}>
          <Ionicons name="sync" size={14} color={p.brandInk} />
        </View>
        <View style={s.row}>
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.art, { backgroundColor: p.sunSoft }]}>
            <Creature kind="lumi" mood="happy" size={62} />
          </View>
          <View style={s.copy}>
            <Text style={[s.kicker, { color: p.brandInk }]}>بطاقة بعد بطاقة</Text>
            <Text style={[s.title, { color: p.foreground }]}>بطاقات الكلمات</Text>
            <Text style={[s.body, { color: p.mutedForeground }]}>اقلب البطاقة، اسمع النطق، وقيّم تذكّرك</Text>
          </View>
        </View>
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.footer, { borderTopColor: p.border }]}>
          <Text style={[s.hebrew, { color: p.foreground }]}>הישג</Text>
          <Ionicons name="swap-horizontal" size={16} color={p.mutedForeground} />
          <Text style={[s.meaning, { color: p.mutedForeground }]}>إنجاز</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-back" size={20} color={p.mutedForeground} />
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: 14, paddingHorizontal: 6 },
  layer: { position: 'absolute', borderRadius: 22, borderWidth: 1 },
  layerBack: { top: 0, bottom: 14, left: 22, right: 22, transform: [{ rotate: '-3deg' }] },
  layerMid: { top: 6, bottom: 8, left: 12, right: 12, transform: [{ rotate: '2deg' }] },
  front: { borderRadius: 22, borderWidth: 1, padding: 14, gap: 10 },
  corner: { position: 'absolute', top: -1, left: -1, width: 34, height: 34, borderTopLeftRadius: 22, borderBottomRightRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  art: { width: 72, height: 76, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  kicker: { fontSize: 11, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl', opacity: 0.85 },
  title: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 18, lineHeight: 30, textAlign: 'right', writingDirection: 'rtl' },
  body: { fontSize: 13, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
  footer: { flexDirection: 'row-reverse', alignItems: 'center', flexWrap: 'wrap', gap: 8, borderTopWidth: 2, borderStyle: 'dashed', paddingTop: 8 },
  hebrew: { fontSize: 20, fontWeight: '800', writingDirection: 'rtl' },
  meaning: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 14, writingDirection: 'rtl' },
});
