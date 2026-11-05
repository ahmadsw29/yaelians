import { useCallback, useRef, useState } from 'react';
import { useUser } from '@clerk/expo';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Creature } from '@/components/PetTeacher';
import { ChunkyButton, usePlay } from '@/components/Playful';
import { useStudy } from '@/lib/StudyProvider';
import { StudySyncStatus } from '@/components/StudySyncStatus';
import { getProfileNames } from '@/lib/profile';
import ExamShortcuts from '@/components/ExamShortcuts';
import HomeFlashcardsEntry from '@/components/HomeFlashcardsEntry';
import HomeReadingEntry from '@/components/HomeReadingEntry';
import { DailyGoalsSection } from '@/components/DailyGoals';
import { ARABIC_BOLD_FONT } from '@/constants/typography';
import { WEB_TAB_BAR_HEIGHT } from '@/constants/navigation';
import { useDailyStudyTip } from '@/hooks/useDailyStudyTip';
import { HomeMotionProvider, NATIVE_DRIVER, Reveal, RevealGroup, ScrollSway, useReduceMotion } from '@/components/HomeMotion';

const FONT = Platform.OS === 'web' ? 'Inter_400Regular' : undefined;
const BOLD = ARABIC_BOLD_FONT;

export default function HomeScreen() {
  const { user } = useUser();
  const { firstName } = getProfileNames(user);
  const p = usePlay();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tip = useDailyStudyTip();
  const { stats, loading, refresh } = useStudy();
  useFocusEffect(useCallback(() => { refresh(); }, [user?.id]));

  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useRef(Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: NATIVE_DRIVER })).current;
  const { height: windowHeight } = useWindowDimensions();
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const viewport = measuredHeight || windowHeight;
  const reduce = useReduceMotion();
  const styles = makeStyles(p, insets.top, insets.bottom);
  const accuracy = stats.answeredQuestions
    ? Math.round((stats.correctAnswers / stats.answeredQuestions) * 100)
    : 0;

  return (
    <Animated.ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onLayout={event => setMeasuredHeight(event.nativeEvent.layout.height)}
      onContentSizeChange={(_width, height) => setContentHeight(height)}
    >
      <HomeMotionProvider scrollY={scrollY} viewport={viewport} contentHeight={contentHeight || undefined} reduce={reduce}>
      <StudySyncStatus />
      <View style={styles.topLine}>
        <View style={styles.brandMark}>
          <MaterialCommunityIcons name="book-open-page-variant" size={19} color={p.onBrand} />
        </View>
        <Text style={styles.brand}>كَلِمَة</Text>
        <View style={styles.streakPill}>
          <Ionicons name="flame" size={17} color={p.coral} />
          <Text style={styles.streakText}>{stats.streak} أيام</Text>
        </View>
        <Pressable testID="home-menu-open" accessibilityRole="button" accessibilityLabel="فتح القائمة" hitSlop={6}
          onPress={() => router.push('/menu')}
          style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.7 }]}>
          <Ionicons name="grid-outline" size={19} color={p.brandShade} />
        </Pressable>
      </View>

      <View style={styles.greeting}>
        <Text style={styles.eyebrow}>رحلتك نحو علامة أفضل</Text>
        <Text style={styles.title}>أهلًا{firstName ? ` ${firstName}` : ''}،{"\n"}نبدأ درس اليوم؟</Text>
        <Text style={styles.subtitle}>خطوة صغيرة بالعبرية، فرق كبير بالـ YAEL.</Text>
      </View>
      <RevealGroup style={styles.sections}>
      <Reveal testID="home-reveal-goals"><DailyGoalsSection /></Reveal>

      <Reveal testID="home-reveal-vocabulary"><View style={styles.hero}>
        <View style={styles.heroCopy}>
          <View style={styles.lessonTag}><Text style={styles.lessonTagText}>جولة اليوم · 20 كلمة</Text></View>
          <Text style={styles.heroTitle}>كلمات تفتح{"\n"}لك المعنى</Text>
          <Text style={styles.heroSub}>تدرّب على 20 مفردة من نماذج YAEL</Text>
        </View>
        <View style={styles.heroArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.heroHalo} />
          <ScrollSway testID="home-sway-vocabulary"><Creature kind="zizo" mood="hype" size={128} /></ScrollSway>
          <View style={styles.wordChip}><Text style={styles.wordChipText}>מילה</Text></View>
        </View>
        <ChunkyButton tone="sun" icon="arrow-back" label="يلا نبدأ" testID="start-practice" onPress={() => router.push('/practice')} style={{ alignSelf: 'stretch', marginTop: 4 }} />
      </View></Reveal>

      <Reveal testID="home-reveal-restatement"><View style={styles.rHero}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>قلها{"\n"}بطريقة أخرى</Text>
          <Text style={styles.heroSub}>تدرّب على إعادة الصياغة فقط، قسمًا بقسم</Text>
        </View>
        <View style={styles.heroArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.heroHalo} />
          <ScrollSway><Creature kind="rami" mood="hype" size={124} /></ScrollSway>
          <View style={styles.wordChip}><Text style={styles.wordChipText}>במילים אחרות</Text></View>
        </View>
        <ChunkyButton tone="sun" icon="arrow-back" label="إعادة صياغة" testID="start-restatement" onPress={() => router.push('/restatement')} style={{ alignSelf: 'stretch', marginTop: 4 }} />
      </View></Reveal>
      <Reveal testID="home-reveal-reading"><HomeReadingEntry /></Reveal>

      <Reveal testID="home-reveal-study"><Pressable testID="home-study" accessibilityRole="button" accessibilityLabel="ركن الدراسة، دروس مع معلّمين من عالم الخيال" onPress={() => router.push('/study')} style={({ pressed }) => [styles.studyCard, pressed && { transform: [{ translateY: 3 }] }]}>
        <View style={styles.studyArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><ScrollSway amount={8} tilt={10}><Creature kind="ghaima" mood="happy" size={64} /></ScrollSway></View>
        <View style={styles.tipCopy}>
          <Text style={styles.studyTitle}>ركن الدراسة</Text>
          <Text style={styles.studyBody}>دروس من كتابك يشرحها لك معلّمون من عالم الخيال</Text>
        </View>
        <Ionicons name="chevron-back" size={20} color={p.skyInk} />
      </Pressable></Reveal>

      <Reveal testID="home-reveal-flashcards"><HomeFlashcardsEntry /></Reveal>

      <Reveal testID="home-reveal-models"><ExamShortcuts /></Reveal>
      </RevealGroup>

      <Reveal testID="home-reveal-stats"><View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>إنجازك</Text>
        <Pressable onPress={() => router.push('/progress')} accessibilityRole="button">
          <Text style={styles.seeAll}>كل التقدّم ←</Text>
        </Pressable>
      </View>
      <View style={styles.statsRow}>
        <StatCard icon="star" value={loading ? '—' : `${stats.xp}`} label="نقطة خبرة" color={p.sunShade} />
        <StatCard icon="checkmark-circle" value={loading ? '—' : `${accuracy}%`} label="إجابات صحيحة" color={p.success} />
        <StatCard icon="book" value={loading ? '—' : `${stats.masteredWords}`} label="كلمة تعلّمتها" color={p.sky} />
      </View></Reveal>

      <Reveal testID="home-reveal-tip"><View style={styles.tipCard} testID="daily-study-tip">
        <View style={styles.tipIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><ScrollSway amount={5} tilt={9}><Creature kind="lumi" size={58} /></ScrollSway></View>
        <View style={styles.tipCopy}>
          <Text style={styles.tipTitle}>نصيحة اليوم</Text>
          <Text style={styles.tipBody} testID="daily-study-tip-text">{tip.text}</Text>
        </View>
      </View></Reveal>
      <Text style={styles.footer}>تعلّم على مهلك، وأنت قادر على التقدّم.</Text>
      </HomeMotionProvider>
    </Animated.ScrollView>
  );
}

function StatCard({ icon, value, label, color }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; color: string }) {
  const c = useColors();
  return (
    <View style={[statStyles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Ionicons name={icon} size={17} color={color} />
      <Text style={[statStyles.value, { color: c.foreground }]}>{value}</Text>
      <Text style={[statStyles.label, { color: c.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function makeStyles(p: ReturnType<typeof usePlay>, topInset: number, bottomInset: number) {
  const c = p;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? Math.max(67, topInset) : 12, paddingBottom: 28 + (Platform.OS === 'web' ? WEB_TAB_BAR_HEIGHT : 56 + bottomInset), maxWidth: 600, width: '100%', alignSelf: 'center' },
    topLine: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, marginBottom: 22 },
    brandMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: p.brand, borderBottomWidth: 3, borderColor: p.brandShade, alignItems: 'center', justifyContent: 'center' },
    brand: { color: c.foreground, fontFamily: BOLD, fontWeight: '800', fontSize: 19, flex: 1, textAlign: 'right' },
    streakPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: p.coralSoft, borderRadius: 14, borderWidth: 2, borderColor: p.coral, paddingHorizontal: 10, paddingVertical: 5 },
    streakText: { color: p.coralInk, fontFamily: BOLD, fontWeight: '800', fontSize: 13 },
    menuBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: p.card, borderWidth: StyleSheet.hairlineWidth, borderColor: p.border },
    greeting: { alignItems: 'flex-end', marginBottom: 16 },
    eyebrow: { color: p.brandShade, fontFamily: BOLD, fontWeight: '800', fontSize: 13, marginBottom: 6 },
    title: { color: c.foreground, fontFamily: BOLD, fontWeight: '800', textAlign: 'right', fontSize: 28, lineHeight: 38 },
    subtitle: { color: c.mutedForeground, fontFamily: FONT, fontSize: 14, textAlign: 'right', marginTop: 6 },
    sections: { gap: 24, marginBottom: 24 },
    hero: { backgroundColor: p.brand, borderRadius: 26, borderBottomWidth: 7, borderColor: p.brandShade, padding: 18, overflow: 'hidden', flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'center' },
    rHero: { backgroundColor: p.coral, borderRadius: 26, borderBottomWidth: 7, borderColor: p.coralShade, padding: 18, overflow: 'hidden', flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'center' },
    heroCopy: { flex: 1, minWidth: 150, alignItems: 'flex-end' },
    lessonTag: { backgroundColor: 'rgba(255,253,247,0.22)', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, marginBottom: 9 },
    lessonTagText: { color: p.onBrand, fontSize: 11, fontFamily: BOLD, fontWeight: '800' },
    heroTitle: { color: p.onBrand, fontSize: 26, lineHeight: 33, textAlign: 'right', fontFamily: BOLD, fontWeight: '800' },
    heroSub: { color: p.onBrand, opacity: 0.85, fontSize: 13, lineHeight: 20, textAlign: 'right', marginTop: 5, fontFamily: FONT },
    heroArt: { width: 132, height: 138, alignItems: 'center', justifyContent: 'center' },
    heroHalo: { position: 'absolute', width: 118, height: 118, borderRadius: 59, backgroundColor: 'rgba(255,253,247,0.18)' },
    wordChip: { position: 'absolute', bottom: 6, left: -2, backgroundColor: p.card, borderRadius: 12, borderBottomWidth: 3, borderColor: p.border, paddingHorizontal: 9, paddingVertical: 3, transform: [{ rotate: '-8deg' }] },
    wordChipText: { color: c.foreground, fontSize: 16, fontWeight: '800' },
    sectionHeading: { flexDirection: 'row-reverse', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 },
    sectionTitle: { color: c.foreground, fontSize: 19, fontFamily: BOLD, fontWeight: '800' },
    sectionCaption: { color: c.mutedForeground, fontSize: 11, fontFamily: FONT },
    seeAll: { color: p.skyShade, fontSize: 13, fontFamily: BOLD, fontWeight: '800' },
    path: { marginBottom: 20, paddingHorizontal: 4 },
    statsRow: { flexDirection: 'row', gap: 9, marginBottom: 17 },
    studyCard: { backgroundColor: p.skySoft, borderRadius: 22, borderWidth: 2, borderBottomWidth: 6, borderColor: p.sky, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    studyArt: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
    studyTitle: { color: p.skyInk, fontFamily: BOLD, fontWeight: '800', fontSize: 16 },
    studyBody: { color: p.skyInk, fontFamily: FONT, textAlign: 'right', fontSize: 13, lineHeight: 20 },
    tipCard: { backgroundColor: p.sunSoft, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, borderColor: p.sun, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    tipIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
    tipCopy: { flex: 1, alignItems: 'flex-end' },
    tipTitle: { color: p.sunInk, fontFamily: BOLD, fontWeight: '800', fontSize: 14, marginBottom: 3 },
    tipBody: { color: p.sunInk, fontFamily: FONT, textAlign: 'right', fontSize: 13, lineHeight: 20 },
    footer: { textAlign: 'center', color: c.mutedForeground, fontSize: 11, marginTop: 18, fontFamily: FONT },
  });
}

const statStyles = StyleSheet.create({
  card: { flex: 1, minHeight: 92, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 2, borderBottomWidth: 5, gap: 4, paddingHorizontal: 4 },
  value: { fontSize: 19, fontFamily: BOLD, fontWeight: '800' },
  label: { fontSize: 11, fontFamily: FONT, textAlign: 'center' },
});
