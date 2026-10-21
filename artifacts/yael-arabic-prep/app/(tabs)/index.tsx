import { useCallback } from 'react';
import { useUser } from '@clerk/expo';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
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

const FONT = Platform.OS === 'web' ? 'Inter_400Regular' : undefined;
const BOLD = ARABIC_BOLD_FONT;

export default function HomeScreen() {
  const { user } = useUser();
  const { firstName } = getProfileNames(user);
  const p = usePlay();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { stats, loading, refresh } = useStudy();
  useFocusEffect(useCallback(() => { refresh(); }, [user?.id]));

  const styles = makeStyles(p, insets.top);
  const accuracy = stats.answeredQuestions
    ? Math.round((stats.correctAnswers / stats.answeredQuestions) * 100)
    : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
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
      </View>

      <View style={styles.greeting}>
        <Text style={styles.eyebrow}>رحلتك نحو علامة أفضل</Text>
        <Text style={styles.title}>أهلًا{firstName ? ` ${firstName}` : ''}،{"\n"}نبدأ درس اليوم؟</Text>
        <Text style={styles.subtitle}>خطوة صغيرة بالعبرية، فرق كبير بالـ YAEL.</Text>
      </View>
      <DailyGoalsSection />

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <View style={styles.lessonTag}><Text style={styles.lessonTagText}>جولة اليوم · ٢٠ كلمة</Text></View>
          <Text style={styles.heroTitle}>كلمات تفتح{"\n"}لك المعنى</Text>
          <Text style={styles.heroSub}>تدرّب على ٢٠ مفردة من نماذج YAEL</Text>
        </View>
        <View style={styles.heroArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.heroHalo} />
          <Creature kind="zizo" mood="hype" size={128} />
          <View style={styles.wordChip}><Text style={styles.wordChipText}>מילה</Text></View>
        </View>
        <ChunkyButton tone="sun" icon="arrow-back" label="يلا نبدأ" testID="start-practice" onPress={() => router.push('/practice')} style={{ alignSelf: 'stretch', marginTop: 4 }} />
      </View>

      <View style={styles.rHero}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>قلها{"\n"}بطريقة أخرى</Text>
          <Text style={styles.heroSub}>تدرّب على إعادة الصياغة فقط، قسمًا بقسم</Text>
        </View>
        <View style={styles.heroArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.heroHalo} />
          <Creature kind="rami" mood="hype" size={124} />
          <View style={styles.wordChip}><Text style={styles.wordChipText}>במילים אחרות</Text></View>
        </View>
        <ChunkyButton tone="sun" icon="arrow-back" label="إعادة صياغة" testID="start-restatement" onPress={() => router.push('/restatement')} style={{ alignSelf: 'stretch', marginTop: 4 }} />
      </View>
      <HomeReadingEntry />

      <Pressable testID="home-study" accessibilityRole="button" accessibilityLabel="ركن الدراسة، دروس مع معلّمين من عالم الخيال" onPress={() => router.push('/study')} style={({ pressed }) => [styles.studyCard, pressed && { transform: [{ translateY: 3 }] }]}>
        <View style={styles.studyArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Creature kind="ghaima" mood="happy" size={64} /></View>
        <View style={styles.tipCopy}>
          <Text style={styles.studyTitle}>ركن الدراسة</Text>
          <Text style={styles.studyBody}>دروس من كتابك يشرحها لك معلّمون من عالم الخيال</Text>
        </View>
        <Ionicons name="chevron-back" size={20} color={p.skyInk} />
      </Pressable>

      <HomeFlashcardsEntry />

      <ExamShortcuts />

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>إنجازك</Text>
        <Pressable onPress={() => router.push('/progress')} accessibilityRole="button">
          <Text style={styles.seeAll}>كل التقدّم ←</Text>
        </Pressable>
      </View>
      <View style={styles.statsRow}>
        <StatCard icon="star" value={loading ? '—' : `${stats.xp}`} label="نقطة خبرة" color={p.sunShade} />
        <StatCard icon="checkmark-circle" value={loading ? '—' : `${accuracy}%`} label="إجابات صحيحة" color={p.success} />
        <StatCard icon="book" value={loading ? '—' : `${stats.masteredWords}`} label="كلمة تعلّمتها" color={p.sky} />
      </View>

      <View style={styles.tipCard}>
        <View style={styles.tipIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Creature kind="lumi" size={58} /></View>
        <View style={styles.tipCopy}>
          <Text style={styles.tipTitle}>نصيحة اليوم</Text>
          <Text style={styles.tipBody}>انظر إلى الكلمات المحيطة بالكلمة الجديدة — غالبًا ستساعدك على فهم معناها.</Text>
        </View>
      </View>
      <Text style={styles.footer}>تعلّم على مهلك، وأنت قادر على التقدّم.</Text>
    </ScrollView>
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

function makeStyles(p: ReturnType<typeof usePlay>, topInset: number) {
  const c = p;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? Math.max(67, topInset) : 12, paddingBottom: 28, maxWidth: 600, width: '100%', alignSelf: 'center' },
    topLine: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, marginBottom: 22 },
    brandMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: p.brand, borderBottomWidth: 3, borderColor: p.brandShade, alignItems: 'center', justifyContent: 'center' },
    brand: { color: c.foreground, fontFamily: BOLD, fontWeight: '800', fontSize: 19, flex: 1, textAlign: 'right' },
    streakPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: p.coralSoft, borderRadius: 14, borderWidth: 2, borderColor: p.coral, paddingHorizontal: 10, paddingVertical: 5 },
    streakText: { color: p.coralInk, fontFamily: BOLD, fontWeight: '800', fontSize: 13 },
    greeting: { alignItems: 'flex-end', marginBottom: 16 },
    eyebrow: { color: p.brandShade, fontFamily: BOLD, fontWeight: '800', fontSize: 13, marginBottom: 6 },
    title: { color: c.foreground, fontFamily: BOLD, fontWeight: '800', textAlign: 'right', fontSize: 28, lineHeight: 38 },
    subtitle: { color: c.mutedForeground, fontFamily: FONT, fontSize: 14, textAlign: 'right', marginTop: 6 },
    hero: { backgroundColor: p.brand, borderRadius: 26, borderBottomWidth: 7, borderColor: p.brandShade, padding: 18, marginBottom: 22, overflow: 'hidden', flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'center' },
    rHero: { backgroundColor: p.coral, borderRadius: 26, borderBottomWidth: 7, borderColor: p.coralShade, padding: 18, marginBottom: 22, overflow: 'hidden', flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'center' },
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
    studyCard: { backgroundColor: p.skySoft, borderRadius: 22, borderWidth: 2, borderBottomWidth: 6, borderColor: p.sky, padding: 12, marginBottom: 22, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
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
