import { useCallback } from 'react';
import { useUser } from '@clerk/expo';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useStudy } from '@/lib/StudyProvider';
import { getStudyStatsDisplay } from '@/lib/study-stats-display';
import { StudySyncStatus } from '@/components/StudySyncStatus';

import { ARABIC_FONT, ARABIC_BOLD_FONT } from '@/constants/typography';
const FONT = ARABIC_FONT;
const BOLD = ARABIC_BOLD_FONT;

export default function ProgressScreen() {
  const { user } = useUser();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { stats, loading, statsUnavailable, refresh } = useStudy();
  useFocusEffect(useCallback(() => { refresh(); }, [user?.id]));

  const hiddenStats = loading || statsUnavailable;
  const displayedStats = getStudyStatsDisplay(stats, hiddenStats);
  const styles = makeStyles(c, insets.top, insets.bottom);
  const today = new Date();
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay(), 12);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });
  const practicedToday = !hiddenStats && stats.lastPracticeDate === today.toISOString().slice(0, 10);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <StudySyncStatus />
      <View style={styles.heading}>
        <Text style={styles.kicker}>كل خطوة محسوبة</Text>
        <Text style={styles.title}>تقدّمك</Text>
        <Text style={styles.subtitle}>تابع تقدّمك في العبرية يومًا بعد يوم.</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryIcon}><Ionicons name="sparkles" size={19} color="#f2bd75" /></View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryLabel}>رصيدك من الخبرة</Text>
            <Text style={styles.summaryValue}>{displayedStats.xp} <Text style={styles.xpSmall}>نقطة</Text></Text>
          </View>
        </View>
        <View style={styles.progressLine}><View style={[styles.progressLineFill, { width: hiddenStats ? '0%' : `${Math.min((stats.xp % 100) || (stats.xp ? 100 : 5), 100)}%` }]} /></View>
        <Text style={styles.nextGoal}>{hiddenStats ? 'تعذّر تحميل التقدّم. أعد المحاولة للتحقق من الأرقام.' : stats.xp ? `بعد ${100 - (stats.xp % 100 || 0)} نقطة تفتح مستوى جديد` : 'ابدأ أول درس واجمع نقاطك'}</Text>
      </View>

      <View style={styles.statGrid}>
        <Metric icon="flame" value={displayedStats.streak} unit="أيام" label="سلسلة التعلّم" tint="#fce8d7" color="#c86f48" />
        <Metric icon="checkmark-circle" value={displayedStats.accuracy} unit="" label="دقّة الإجابات" tint="#e0eee3" color="#438273" />
        <Metric icon="book" value={displayedStats.masteredWords} unit="" label="كلمات تعلّمتها" tint="#ebe4f4" color="#8261a0" />
        <Metric icon="albums" value={displayedStats.lessonsCompleted} unit="" label="دروس مكتملة" tint="#e2ebf5" color="#5d7e9b" />
      </View>

      <Text style={styles.sectionTitle}>عاداتك الجميلة</Text>
      <View style={styles.weekCard}>
        <Text style={styles.weekTitle}>هذا الأسبوع</Text>
        <Text style={styles.weekRange}>
          {week[0].toLocaleDateString('ar', { day: 'numeric', month: 'short', numberingSystem: 'latn' })} – {week[6].toLocaleDateString('ar', { day: 'numeric', month: 'short', numberingSystem: 'latn' })}
        </Text>
        <View style={styles.weekDays}>
          {['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'].map((day, i) => {
            const isToday = i === today.getDay();
            const active = isToday && practicedToday;
            return (
            <View key={`${day}-${i}`} style={styles.dayColumn} accessible
              accessibilityLabel={`${week[i].toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long', numberingSystem: 'latn' })}${isToday ? '، اليوم' : ''}${active ? '، تدرّبت اليوم' : ''}`}>
              <View style={[styles.dayDot, isToday && styles.dayDotToday, active && styles.dayDotActive]}>
                <Text style={[styles.dayNumber, active && { color: c.primaryForeground }]}>{week[i].getDate()}</Text>
                {active && <View style={styles.dayCheck}><Ionicons name="checkmark" size={11} color={c.primaryForeground} /></View>}
              </View>
              <Text style={[styles.dayLabel, isToday && { color: c.primary }]}>{day}</Text>
            </View>
          )})}
        </View>
        <View style={styles.weekNote}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#a56c44" />
          <Text style={styles.weekNoteText}>5 دقائق كل يوم أفضل من ساعة مرة بالأسبوع.</Text>
        </View>
      </View>

      <View style={styles.encourage}>
        <Text style={styles.encourageTitle}>{hiddenStats ? 'إحصاءاتك غير متاحة الآن' : stats.lessonsCompleted ? 'واصل، أنت على الطريق!' : 'ابدأ رحلتك اليوم'}</Text>
        <Text style={styles.encourageText}>{hiddenStats ? 'أعد المحاولة لعرض آخر تقدّم محفوظ.' : stats.lessonsCompleted ? 'التقدّم الحقيقي يجي من خطوات صغيرة ومستمرّة.' : 'أول درس قصير هو بداية ثقتك بامتحان YAEL.'}</Text>
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

function makeStyles(c: ReturnType<typeof useColors>, topInset: number, bottomInset: number) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 21, paddingTop: Platform.OS === 'web' ? Math.max(67, topInset) : 18, paddingBottom: Platform.OS === 'web' ? 118 : 88 + bottomInset, maxWidth: 600, width: '100%', alignSelf: 'center' },
    heading: { alignItems: 'flex-end', marginBottom: 20 },
    kicker: { color: c.primary, fontFamily: BOLD, fontWeight: '700', fontSize: 13 },
    title: { color: c.foreground, fontFamily: BOLD, fontWeight: '700', fontSize: 29, marginTop: 4 },
    subtitle: { color: c.mutedForeground, fontFamily: FONT, fontSize: 13, textAlign: 'right', marginTop: 5 },
    summary: { backgroundColor: '#17665c', borderRadius: 24, padding: 19, marginBottom: 17 },
    summaryTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    summaryIcon: { width: 39, height: 39, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
    summaryCopy: { alignItems: 'flex-end', flex: 1 },
    summaryLabel: { color: '#d4e7df', fontFamily: FONT, fontSize: 12 },
    summaryValue: { color: '#fffdf8', fontFamily: BOLD, fontWeight: '700', fontSize: 25, marginTop: 2 },
    xpSmall: { fontSize: 12, color: '#d4e7df', fontFamily: FONT },
    progressLine: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginTop: 16, overflow: 'hidden' },
    progressLineFill: { height: '100%', backgroundColor: '#f0bd72', borderRadius: 4 },
    nextGoal: { color: '#d4e7df', fontFamily: FONT, fontSize: 11, textAlign: 'right', marginTop: 8 },
    statGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    sectionTitle: { color: c.foreground, fontFamily: BOLD, fontWeight: '700', fontSize: 17, textAlign: 'right', marginBottom: 11 },
    weekCard: { borderRadius: 22, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, padding: 17, marginBottom: 17 },
    weekTitle: { color: c.foreground, fontFamily: BOLD, fontWeight: '700', fontSize: 14, textAlign: 'right' },
    weekRange: { color: c.mutedForeground, fontFamily: FONT, fontSize: 12, textAlign: 'right', writingDirection: 'rtl', marginTop: 6 },
    weekDays: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 16, marginBottom: 15 },
    dayColumn: { flex: 1, minWidth: 0, alignItems: 'center', gap: 7 },
    dayDot: { height: 36, width: 30, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.muted, alignItems: 'center', justifyContent: 'center' },
    dayDotToday: { borderColor: c.primary, borderWidth: 2 },
    dayDotActive: { backgroundColor: c.primary },
    dayNumber: { color: c.foreground, fontFamily: BOLD, fontWeight: '700', fontSize: 15, fontVariant: ['tabular-nums'] },
    dayCheck: { position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: 8, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.card },
    dayLabel: { color: c.foreground, fontSize: 10, fontFamily: FONT },
    weekNote: { backgroundColor: '#fbf1e5', borderRadius: 13, padding: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    weekNoteText: { color: '#866141', fontFamily: FONT, fontSize: 11, flex: 1, textAlign: 'right' },
    encourage: { backgroundColor: '#fae9db', borderRadius: 20, padding: 16, alignItems: 'flex-end' },
    encourageTitle: { color: '#8e4e36', fontFamily: BOLD, fontWeight: '700', fontSize: 14 },
    encourageText: { color: '#805f50', fontFamily: FONT, fontSize: 12, lineHeight: 18, textAlign: 'right', marginTop: 4 },
  });
}

const metricStyles = StyleSheet.create({
  card: { width: '48%', flexGrow: 1, minHeight: 121, borderRadius: 19, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#e8e3d8', padding: 13, alignItems: 'flex-end', justifyContent: 'space-between' },
  icon: { width: 33, height: 33, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  value: { color: '#17332f', fontFamily: BOLD, fontWeight: '700', fontSize: 22, marginTop: 6 },
  unit: { fontSize: 12, fontFamily: FONT, color: '#74817a' },
  label: { color: '#74817a', fontFamily: FONT, fontSize: 11, textAlign: 'right' },
});
