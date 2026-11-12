import React, { useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlay } from '@/components/Playful';
import { Creature, type CreatureKind } from '@/components/PetTeacher';
import { GlassPressable } from '@/components/Glass';
import { Enter } from '@/components/EntranceMotion';
import { HomeMotionProvider, Reveal, ScrollSway, useReduceMotion, NATIVE_DRIVER } from '@/components/HomeMotion';
import { ARABIC_FONT, ARABIC_BOLD_FONT } from '@/constants/typography';
import { WEB_TAB_BAR_HEIGHT } from '@/constants/navigation';

const FONT = ARABIC_FONT;
type Tone = 'brand' | 'sky' | 'sun' | 'coral';
type Item = { key: string; testID: string; href: string; title: string; tag: string; caption: string; icon: string; tone: Tone; pet: CreatureKind };

const CORE: Item[] = [
  { key: 'vocabulary', testID: 'training-vocabulary', href: '/practice?section=vocabulary', title: 'المفردات', tag: 'كلمة بكلمة', caption: 'اختر معنى الكلمة العبرية وابنِ مخزونك', icon: 'type', tone: 'brand', pet: 'zizo' },
  { key: 'restatement', testID: 'training-restatement', href: '/restatement', title: 'إعادة الصياغة', tag: 'نفس المعنى', caption: 'جد الجملة التي تقول الشيء نفسه بكلمات أخرى', icon: 'repeat', tone: 'sky', pet: 'lumi' },
  { key: 'reading', testID: 'training-reading', href: '/reading', title: 'فهم المقروء', tag: 'نص وأسئلة', caption: 'اقرأ قطعة كاملة وأجب عن أسئلتها', icon: 'book-open', tone: 'sun', pet: 'nuna' },
  { key: 'flashcards', testID: 'training-flashcards', href: '/flashcards', title: 'البطاقات', tag: 'اقلب وتذكّر', caption: 'راجع الكلمات بسرعة بقلب البطاقة', icon: 'layers', tone: 'coral', pet: 'rami' },
];
const BIG: Item[] = [
  { key: 'timed', testID: 'training-timed', href: '/source-session', title: 'جلسة بتوقيت', tag: 'تحدٍّ حقيقي', caption: 'تدرّب تحت ضغط الوقت كأنك في الامتحان', icon: 'clock', tone: 'coral', pet: 'ghaima' },
  { key: 'exams', testID: 'training-exams', href: '/exam-library', title: 'نماذج كاملة', tag: 'امتحان كامل', caption: 'افتح نموذجًا كاملًا من مكتبة الامتحانات', icon: 'archive', tone: 'brand', pet: 'zizo' },
  { key: 'study', testID: 'training-study', href: '/study', title: 'الدراسة', tag: 'افهم القاعدة', caption: 'شروحات ودروس قبل أن تتدرّب', icon: 'compass', tone: 'sky', pet: 'lumi' },
];

export default function TrainingHub() {
  const p = usePlay();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const { height, width } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [contentH, setContentH] = useState<number | undefined>();
  const tones: Record<Tone, [string, string, string]> = {
    brand: [p.brandSoft, p.isDark ? p.brand : p.brandShade, p.brand], sky: [p.skySoft, p.skyInk, p.sky],
    sun: [p.sunSoft, p.sunInk, p.sun], coral: [p.coralSoft, p.coralInk, p.coral],
  };
  const narrow = width < 360;
  const go = (href: string) => {
    if (href === '/practice?section=vocabulary') router.setParams({ section: 'vocabulary' });
    else router.push(href as any);
  };

  const card = (it: Item, i: number, wide: boolean) => {
    const [bg, ink, accent] = tones[it.tone];
    return (
      <Enter key={it.key} delay={180 + i * 70} from={wide ? 'side' : 'pop'} style={wide || narrow ? s.full : s.half}>
        <GlassPressable dark={p.isDark} testID={it.testID} accessibilityRole="button"
          accessibilityLabel={`${it.title}، ${it.caption}`} onPress={() => go(it.href)} radius={24}
          fill={[bg, bg]} solid={bg} style={[s.cardOuter, { borderColor: accent }]}
          contentStyle={wide ? s.wideContent : s.tileContent}>
          <View style={[s.petBubble, { backgroundColor: p.card }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <ScrollSway amount={6} tilt={8}><Creature kind={it.pet} mood="hype" size={wide ? 52 : 58} /></ScrollSway>
          </View>
          <View style={wide ? s.wideCopy : s.tileCopy}>
            <View style={[s.tag, { backgroundColor: p.card }]}>
              <Feather name={it.icon as any} size={13} color={ink} />
              <Text style={[s.tagText, { color: ink }]}>{it.tag}</Text>
            </View>
            <Text style={[s.cardTitle, { color: p.foreground }]}>{it.title}</Text>
            <Text style={[s.caption, { color: p.mutedForeground }]}>{it.caption}</Text>
          </View>
          <View style={[s.go, { backgroundColor: accent }]}><Feather name="chevron-left" size={18} color={p.onBrand} /></View>
        </GlassPressable>
      </Enter>
    );
  };

  return (
    <Animated.ScrollView testID="training-hub" style={{ flex: 1, backgroundColor: p.background }}
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: NATIVE_DRIVER })}
      onContentSizeChange={(_, h) => setContentH(h)}
      contentContainerStyle={[s.content, {
        paddingTop: Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top + 12,
        paddingBottom: 36 + (Platform.OS === 'web' ? WEB_TAB_BAR_HEIGHT : 56 + insets.bottom),
      }]}>
      <HomeMotionProvider scrollY={scrollY} viewport={height} contentHeight={contentH} reduce={reduce}>
        <Enter from="up">
          <View style={[s.hero, { backgroundColor: p.card, borderColor: p.border }]}>
            <View style={s.heroCopy}>
              <Text style={[s.eyebrow, { color: p.isDark ? p.brand : p.brandShade }]}>ساحة التدريب</Text>
              <Text style={[s.title, { color: p.foreground }]}>ماذا ستتمرّن اليوم؟</Text>
              <Text style={[s.sub, { color: p.mutedForeground }]}>فريقك جاهز. اختر تدريبك وخذ خطوة جديدة.</Text>
            </View>
            <Enter from="pop" delay={120} style={[s.heroPet, { backgroundColor: p.sunSoft }]}>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Creature kind="zizo" mood="cheer" size={72} /></View>
            </Enter>
          </View>
        </Enter>

        <Text style={[s.section, { color: p.mutedForeground }]}>أقسام الامتحان الأساسية</Text>
        <View style={s.grid}>{CORE.map((it, i) => card(it, i, false))}</View>

        <Reveal lift={36}>
          <Text style={[s.section, { color: p.mutedForeground }]}>جاهز لما هو أكبر</Text>
          <View style={s.list}>{BIG.map((it, i) => card(it, i + 4, true))}</View>
        </Reveal>
      </HomeMotionProvider>
    </Animated.ScrollView>
  );
}

const rtl = { textAlign: 'right' as const, writingDirection: 'rtl' as const };
const s = StyleSheet.create({
  content: { paddingHorizontal: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  heroCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  heroPet: { width: 88, height: 88, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...rtl, fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 13 },
  title: { ...rtl, fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 26, lineHeight: 40 },
  sub: { ...rtl, fontFamily: FONT, fontSize: 14, lineHeight: 22 },
  section: { ...rtl, fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 13, marginTop: 22, marginBottom: 10, marginRight: 4 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  list: { gap: 10 },
  half: { flexBasis: '46%', flexGrow: 1 },
  full: { width: '100%' },
  cardOuter: { borderWidth: 1.5, borderBottomWidth: 4 },
  tileContent: { flexDirection: 'column', minHeight: 232, padding: 14, alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  wideContent: { minHeight: 88, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  petBubble: { width: 66, height: 66, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tileCopy: { alignSelf: 'stretch', alignItems: 'flex-end', gap: 3 },
  wideCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end', gap: 3 },
  tag: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, maxWidth: '100%' },
  tagText: { ...rtl, flexShrink: 1, fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 11, lineHeight: 18 },
  cardTitle: { ...rtl, alignSelf: 'stretch', fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 18, lineHeight: 30 },
  caption: { ...rtl, alignSelf: 'stretch', fontFamily: FONT, fontSize: 12.5, lineHeight: 20 },
  go: { position: 'absolute', left: 12, top: 12, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
