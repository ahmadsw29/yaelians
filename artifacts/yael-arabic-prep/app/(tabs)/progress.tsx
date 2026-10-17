import { useCallback } from 'react';
import { useUser } from '@clerk/expo';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useStudy } from '@/lib/StudyProvider';
import { StudySyncStatus } from '@/components/StudySyncStatus';

const FONT = Platform.OS === 'web' ? 'Inter_400Regular' : undefined;
const BOLD = Platform.OS === 'web' ? 'Inter_700Bold' : undefined;

export default function ProgressScreen() {
  const { user } = useUser();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { stats, refresh } = useStudy();
  useFocusEffect(useCallback(() => { refresh(); }, [user?.id]));

  const accuracy = stats.answeredQuestions
    ? Math.round((stats.correctAnswers / stats.answeredQuestions) * 100)
    : 0;
  const styles = makeStyles(c, insets.top);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <StudySyncStatus />
      <View style={styles.heading}>
        <Text style={styles.kicker}>كل خطوة محسوبة</Text>
        <Text style={styles.title}>تقدّمك</Text>
        <Text style={styles.subtitle}>شوفي كيف عم تكبري بالعبرية يومًا بعد يوم.</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryIcon}><Ionicons name="sparkles" size={19} color="#f2bd75" /></View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryLabel}>رصيدك من الخبرة</Text>
            <Text style={styles.summaryValue}>{stats.xp} <Text style={styles.xpSmall}>نقطة</Text></Text>
          </View>
        </View>
        <View style={styles.progressLine}><View style={[styles.progressLineFill, { width: `${Math.min((stats.xp % 100) || (stats.xp ? 100 : 5), 100)}%` }]} /></View>
        <Text style={styles.nextGoal}>{stats.xp ? `بعد ${100 - (stats.xp % 100 || 0)} نقطة تفتحي مستوى جديد` : 'ابدئي أول درس واجمعي نقاطك'}</Text>
      </View>

      <View style={styles.statGrid}>
        <Metric icon="flame" value={`${stats.streak}`} unit="أيام" label="سلسلة التعلّم" tint="#fce8d7" color="#c86f48" />
        <Metric icon="checkmark-circle" value={`${accuracy}%`} unit="" label="دقّة الإجابات" tint="#e0eee3" color="#438273" />
        <Metric icon="book" value={`${stats.masteredWords}`} unit="" label="كلمات تعلّمتِها" tint="#ebe4f4" color="#8261a0" />
        <Metric icon="albums" value={`${stats.lessonsCompleted}`} unit="" label="دروس مكتملة" tint="#e2ebf5" color="#5d7e9b" />
      </View>

      <Text style={styles.sectionTitle}>عاداتك الجميلة</Text>
      <View style={styles.weekCard}>
        <Text style={styles.weekTitle}>هذا الأسبوع</Text>
        <View style={styles.weekDays}>
          {['أ', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map((day, i) => {
            const today = new Date().getDay();
            const practicedToday = stats.lastPracticeDate === new Date().toISOString().slice(0, 10);
            const active = i === today && practicedToday;
            return (
            <View key={`${day}-${i}`} style={styles.dayColumn}>
              <View style={[styles.dayDot, active && styles.dayDotActive]}>
                {active ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
              <Text style={styles.dayLabel}>{day}</Text>
            </View>
          )})}
        </View>
        <View style={styles.weekNote}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#a56c44" />
          <Text style={styles.weekNoteText}>٥ دقائق كل يوم أفضل من ساعة مرة بالأسبوع.</Text>
        </View>
      </View>

      <View style={styles.encourage}>
        <Text style={styles.encourageTitle}>{stats.lessonsCompleted ? 'كمّلي، أنتِ على الطريق!' : 'ابدئي رحلتك اليوم'}</Text>
        <Text style={styles.encourageText}>{stats.lessonsCompleted ? 'التقدّم الحقيقي يجي من خطوات صغيرة ومستمرّة.' : 'أول درس قصير هو بداية ثقتك بامتحان YAEL.'}</Text>
      </View>
    </ScrollView>
  );
}

function Metric({ icon, value, unit, label, tint, color }: { icon: keyof typeof Ionicons.glyphMap; value: string; unit: string; label: string; tint: string; color: string }) {
  const c = useColors();
  return (
    <View style={[metricStyles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[metricStyles.icon, { backgroundColor: tint }]}><Ionicons name={icon} size={19} color={color} /></View>
      <Text style={[metricStyles.value, { color: c.foreground }]}>{value} <Text style={[metricStyles.unit, { color: c.mutedForeground }]}>{unit}</Text></Text>
      <Text style={[metricStyles.label, { color: c.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>, topInset: number) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 21, paddingTop: Platform.OS === 'web' ? Math.max(67, topInset) : 18, paddingBottom: Platform.OS === 'web' ? 118 : 32, maxWidth: 600, width: '100%', alignSelf: 'center' },
    heading: { alignItems: 'flex-end', marginBottom: 20 },
    kicker: { color: c.primary, fontFamily: BOLD, fontSize: 13 },
    title: { color: c.foreground, fontFamily: BOLD, fontSize: 29, marginTop: 4 },
    subtitle: { color: c.mutedForeground, fontFamily: FONT, fontSize: 13, textAlign: 'right', marginTop: 5 },
    summary: { backgroundColor: '#17665c', borderRadius: 24, padding: 19, marginBottom: 17 },
    summaryTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    summaryIcon: { width: 39, height: 39, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
    summaryCopy: { alignItems: 'flex-end', flex: 1 },
    summaryLabel: { color: '#d4e7df', fontFamily: FONT, fontSize: 12 },
    summaryValue: { color: '#fffdf8', fontFamily: BOLD, fontSize: 25, marginTop: 2 },
    xpSmall: { fontSize: 12, color: '#d4e7df', fontFamily: FONT },
    progressLine: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginTop: 16, overflow: 'hidden' },
    progressLineFill: { height: '100%', backgroundColor: '#f0bd72', borderRadius: 4 },
    nextGoal: { color: '#d4e7df', fontFamily: FONT, fontSize: 11, textAlign: 'right', marginTop: 8 },
    statGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    sectionTitle: { color: c.foreground, fontFamily: BOLD, fontSize: 17, textAlign: 'right', marginBottom: 11 },
    weekCard: { borderRadius: 22, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, padding: 17, marginBottom: 17 },
    weekTitle: { color: c.foreground, fontFamily: BOLD, fontSize: 14, textAlign: 'right' },
    weekDays: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 16, marginBottom: 15 },
    dayColumn: { alignItems: 'center', gap: 6 },
    dayDot: { height: 28, width: 28, borderRadius: 10, backgroundColor: '#eeece4', alignItems: 'center', justifyContent: 'center' },
    dayDotActive: { backgroundColor: '#e88c67' },
    dayLabel: { color: c.mutedForeground, fontSize: 10, fontFamily: FONT },
    weekNote: { backgroundColor: '#fbf1e5', borderRadius: 13, padding: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    weekNoteText: { color: '#866141', fontFamily: FONT, fontSize: 11, flex: 1, textAlign: 'right' },
    encourage: { backgroundColor: '#fae9db', borderRadius: 20, padding: 16, alignItems: 'flex-end' },
    encourageTitle: { color: '#8e4e36', fontFamily: BOLD, fontSize: 14 },
    encourageText: { color: '#805f50', fontFamily: FONT, fontSize: 12, lineHeight: 18, textAlign: 'right', marginTop: 4 },
  });
}

const metricStyles = StyleSheet.create({
  card: { width: '48%', flexGrow: 1, minHeight: 121, borderRadius: 19, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#e8e3d8', padding: 13, alignItems: 'flex-end', justifyContent: 'space-between' },
  icon: { width: 33, height: 33, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  value: { color: '#17332f', fontFamily: BOLD, fontSize: 22, marginTop: 6 },
  unit: { fontSize: 12, fontFamily: FONT, color: '#74817a' },
  label: { color: '#74817a', fontFamily: FONT, fontSize: 11, textAlign: 'right' },
});
