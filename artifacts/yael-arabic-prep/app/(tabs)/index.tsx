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
import { useStudy } from '@/lib/StudyProvider';
import { StudySyncStatus } from '@/components/StudySyncStatus';
import { getProfileNames } from '@/lib/profile';
import ExamShortcuts from '@/components/ExamShortcuts';

const FONT = Platform.OS === 'web' ? 'Inter_400Regular' : undefined;
const BOLD = Platform.OS === 'web' ? 'Inter_700Bold' : undefined;

export default function HomeScreen() {
  const { user } = useUser();
  const { firstName } = getProfileNames(user);
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { stats, loading, refresh } = useStudy();
  useFocusEffect(useCallback(() => { refresh(); }, [user?.id]));

  const styles = makeStyles(colors, insets.top);
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
          <MaterialCommunityIcons name="book-open-page-variant" size={19} color={colors.primary} />
        </View>
        <Text style={styles.brand}>كَلِمَة</Text>
        <View style={styles.streakPill}>
          <Ionicons name="flame" size={16} color="#d76b43" />
          <Text style={styles.streakText}>{stats.streak} أيام</Text>
        </View>
      </View>

      <View style={styles.greeting}>
        <Text style={styles.eyebrow}>رحلتك نحو علامة أفضل</Text>
        <Text style={styles.title}>أهلًا{firstName ? ` ${firstName}` : ''}،{"\n"}نبدأ درس اليوم؟</Text>
        <Text style={styles.subtitle}>خطوة صغيرة بالعبرية، فرق كبير بالـ YAEL.</Text>
      </View>

      <ExamShortcuts />
      <Pressable
        accessibilityRole="button"
        testID="start-practice"
        onPress={() => router.push('/practice')}
        style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
      >
        <View style={styles.heroText}>
          <View style={styles.lessonTag}>
            <Text style={styles.lessonTagText}>درس اليوم · ٥ دقائق</Text>
          </View>
          <Text style={styles.heroTitle}>كلمات تفتح{"\n"}لك المعنى</Text>
          <Text style={styles.heroSub}>تدرّبي على مفردات تظهر كثيرًا في امتحان YAEL</Text>
          <View style={styles.startButton}>
            <Text style={styles.startButtonText}>يلا نبدأ</Text>
            <Ionicons name="arrow-back" size={18} color="#fffdf8" />
          </View>
        </View>
        <View style={styles.heroArt}>
          <View style={styles.orbit} />
          <View style={styles.hebrewTile}>
            <Text style={styles.hebrewWord}>מילה</Text>
          </View>
          <View style={styles.sparkleOne}><Ionicons name="sparkles" size={17} color="#ffd8a6" /></View>
          <View style={styles.sparkleTwo}><Ionicons name="star" size={12} color="#f8a189" /></View>
        </View>
      </Pressable>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>مسارك اليوم</Text>
        <Text style={styles.sectionCaption}>كل تدريب يقرّبك من هدفك</Text>
      </View>
      <View style={styles.pathCard}>
        <PathItem icon="text-box-check-outline" label="مفردات" detail="اختاري المعنى الصحيح" color="#dff0e8" iconColor="#17665c" />
        <View style={styles.pathConnector} />
        <PathItem icon="book-open-variant" label="فهم المقروء" detail="اقرئي واكتشفي الفكرة" color="#fae8d9" iconColor="#c86f48" />
        <View style={styles.pathConnector} />
        <PathItem icon="trophy-outline" label="علامة أعلى" detail="تدرّبي بثقة وهدوء" color="#ece6f6" iconColor="#7860a5" />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>إنجازك</Text>
        <Pressable onPress={() => router.push('/progress')} accessibilityRole="button">
          <Text style={styles.seeAll}>كل التقدّم ←</Text>
        </Pressable>
      </View>
      <View style={styles.statsRow}>
        <StatCard icon="star" value={loading ? '—' : `${stats.xp}`} label="نقطة خبرة" color="#d78a34" />
        <StatCard icon="checkmark-circle" value={loading ? '—' : `${accuracy}%`} label="إجابات صحيحة" color="#418879" />
        <StatCard icon="book" value={loading ? '—' : `${stats.masteredWords}`} label="كلمة تعلّمتِها" color="#a46fbd" />
      </View>

      <View style={styles.tipCard}>
        <View style={styles.tipIcon}><Ionicons name="bulb-outline" size={20} color="#a65c42" /></View>
        <View style={styles.tipCopy}>
          <Text style={styles.tipTitle}>نصيحة اليوم</Text>
          <Text style={styles.tipBody}>انظري إلى الكلمات المحيطة بالكلمة الجديدة — غالبًا ستساعدك على فهم معناها.</Text>
        </View>
      </View>
      <Text style={styles.footer}>تعلّمي على مهلك. أنتِ قادرة.</Text>
    </ScrollView>
  );
}

function PathItem({ icon, label, detail, color, iconColor }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; detail: string; color: string; iconColor: string }) {
  const c = useColors();
  return (
    <View style={pathStyles.row}>
      <View style={[pathStyles.icon, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={21} color={iconColor} />
      </View>
      <View style={pathStyles.copy}>
        <Text style={[pathStyles.label, { color: c.foreground }]}>{label}</Text>
        <Text style={[pathStyles.detail, { color: c.mutedForeground }]}>{detail}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={20} color="#d6ddd4" />
    </View>
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

function makeStyles(c: ReturnType<typeof useColors>, topInset: number) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 21, paddingTop: Platform.OS === 'web' ? Math.max(67, topInset) : 12, paddingBottom: 28, maxWidth: 600, width: '100%', alignSelf: 'center' },
    topLine: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, marginBottom: 28 },
    brandMark: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#e4eee7', alignItems: 'center', justifyContent: 'center' },
    brand: { color: c.foreground, fontFamily: BOLD, fontSize: 17, flex: 1, textAlign: 'right' },
    streakPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff0e5', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7 },
    streakText: { color: '#9b5238', fontFamily: BOLD, fontSize: 12 },
    greeting: { alignItems: 'flex-end', marginBottom: 19 },
    eyebrow: { color: c.primary, fontFamily: BOLD, fontSize: 13, marginBottom: 6 },
    title: { color: c.foreground, fontFamily: BOLD, textAlign: 'right', fontSize: 29, lineHeight: 39 },
    subtitle: { color: c.mutedForeground, fontFamily: FONT, fontSize: 14, textAlign: 'right', marginTop: 7 },
    hero: { backgroundColor: '#17665c', borderRadius: 27, padding: 20, minHeight: 210, flexDirection: 'row', overflow: 'hidden', alignItems: 'center', marginBottom: 26 },
    pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
    heroText: { flex: 1, alignItems: 'flex-end', zIndex: 1 },
    lessonTag: { backgroundColor: 'rgba(255,253,248,0.17)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, marginBottom: 10 },
    lessonTagText: { color: '#f4e6c9', fontSize: 11, fontFamily: BOLD },
    heroTitle: { color: '#fffdf8', fontSize: 25, lineHeight: 32, textAlign: 'right', fontFamily: BOLD },
    heroSub: { color: '#d6e7df', fontSize: 12, lineHeight: 19, textAlign: 'right', marginTop: 5, maxWidth: 210, fontFamily: FONT },
    startButton: { marginTop: 13, borderRadius: 15, backgroundColor: '#e88c67', paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', flexDirection: 'row', gap: 7 },
    startButtonText: { color: '#fffdf8', fontFamily: BOLD, fontSize: 13 },
    heroArt: { width: 96, height: 130, justifyContent: 'center', alignItems: 'center', marginLeft: -2 },
    orbit: { width: 91, height: 91, borderRadius: 46, backgroundColor: 'rgba(243,224,192,0.16)', position: 'absolute' },
    hebrewTile: { width: 72, height: 63, backgroundColor: '#fff5df', borderRadius: 18, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
    hebrewWord: { color: '#17665c', fontSize: 23, fontFamily: BOLD },
    sparkleOne: { position: 'absolute', top: 19, right: 0 },
    sparkleTwo: { position: 'absolute', bottom: 22, left: 4 },
    sectionHeading: { flexDirection: 'row-reverse', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { color: c.foreground, fontSize: 18, fontFamily: BOLD },
    sectionCaption: { color: c.mutedForeground, fontSize: 11, fontFamily: FONT },
    seeAll: { color: c.primary, fontSize: 12, fontFamily: BOLD },
    pathCard: { backgroundColor: c.card, borderRadius: 23, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 3, marginBottom: 25 },
    pathConnector: { height: 1, backgroundColor: c.border, marginRight: 47, marginLeft: 5 },
    statsRow: { flexDirection: 'row', gap: 9, marginBottom: 17 },
    tipCard: { backgroundColor: '#fae9db', borderRadius: 21, padding: 15, flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 11 },
    tipIcon: { width: 35, height: 35, borderRadius: 13, backgroundColor: '#ffdcc8', alignItems: 'center', justifyContent: 'center' },
    tipCopy: { flex: 1, alignItems: 'flex-end' },
    tipTitle: { color: '#8e4e36', fontFamily: BOLD, fontSize: 13, marginBottom: 3 },
    tipBody: { color: '#805f50', fontFamily: FONT, textAlign: 'right', fontSize: 12, lineHeight: 18 },
    footer: { textAlign: 'center', color: c.mutedForeground, fontSize: 11, marginTop: 18, fontFamily: FONT },
  });
}

const pathStyles = StyleSheet.create({
  row: { minHeight: 65, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  icon: { height: 39, width: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, alignItems: 'flex-end' },
  label: { color: '#17332f', fontSize: 13, fontFamily: BOLD },
  detail: { color: '#74817a', fontSize: 11, marginTop: 3, fontFamily: FONT },
});

const statStyles = StyleSheet.create({
  card: { flex: 1, minHeight: 90, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffdf8', borderRadius: 19, borderWidth: 1, borderColor: '#e8e3d8', gap: 4, paddingHorizontal: 4 },
  value: { color: '#17332f', fontSize: 17, fontFamily: BOLD },
  label: { color: '#74817a', fontSize: 10, fontFamily: FONT, textAlign: 'center' },
});
