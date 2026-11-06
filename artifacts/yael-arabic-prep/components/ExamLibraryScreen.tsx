import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PetTeacher from '@/components/PetTeacher';
import { useColors } from '@/hooks/useColors';
import { IMPORTED_EXAMS } from '@/lib/solved-exams';
import { usePlanAccess } from '@/lib/PlanAccess';
import { loadExamLibraryProgress, type ExamLibraryProgress } from '@/lib/exam-library-progress';
import { Enter } from '@/components/EntranceMotion';

const FONT = Platform.OS === 'web' ? 'Inter_400Regular' : undefined;
const BOLD = Platform.OS === 'web' ? 'Inter_700Bold' : undefined;

export default function ExamLibraryScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPremium } = usePlanAccess();
  const { userId } = useAuth();
  const s = makeStyles(c);
  const [open, setOpen] = useState<string | null>(null);
  const exams = useMemo(() => (Array.isArray(IMPORTED_EXAMS) ? IMPORTED_EXAMS : []).filter(exam => isPremium || exam.id === 'b17'), [isPremium]);
  const owner = userId ?? 'guest';
  const [retry, setRetry] = useState(0);
  const [progress, setProgress] = useState<{ owner: string; data: Record<string, ExamLibraryProgress> }>({ owner: '', data: {} });
  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all(exams.map(async exam =>
      [exam.id, await loadExamLibraryProgress(userId ?? undefined, exam)] as const,
    )).then(entries => {
      if (active) setProgress({ owner, data: Object.fromEntries(entries) });
    });
    return () => { active = false; };
  }, [exams, owner, userId, retry]));

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: (Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top) + 12 }]}>
        <Pressable testID="library-back" accessibilityRole="button" accessibilityLabel="رجوع" hitSlop={12}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-forward" color={c.foreground} size={24} />
        </Pressable>
        <Text style={[s.title, { flex: 1 }]}>مكتبة نماذج التدريب</Text>
      </View>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: (Platform.OS === 'web' ? Math.max(34, insets.bottom) : insets.bottom) + 24 }]}>
        <Text style={s.eyebrow}>{isPremium ? exams.length : 'نموذج مجاني واحد'} • نماذج تدريب</Text>
        <Text style={s.hero}>اختر نموذجًا،{'\n'}وابدأ بإيقاعك.</Text>
        <View style={s.notice}>
          <Text style={s.label}>نماذجك، بطريقتين للتدرّب</Text>
          <Text style={s.body}>تدرّب على قسم واحد أو أكمل النموذج كله. الأسئلة من ملفاتك المرفوعة وبترتيبها الأصلي؛ هذا تدريب على محتواها وليس واجهة امتحان YAELNET الفعلي.</Text>
          <Text style={s.caption}>بعد التسليم: تصحيح وشروحات بالعربية بحلول أعدّها التطبيق، وليست مفتاحًا رسميًا. الأسئلة التي تحتاج مراجعة لا تدخل في النتيجة.</Text>
          <Text style={s.caption}>التقدّم من محاولاتك المحفوظة على هذا الجهاز. علامة الإكمال تعني إنهاء النموذج، وليست علامة نجاح رسمية.</Text>
        </View>
        <PetTeacher quiet />
        {exams.length === 0 && <View style={s.card}>
          <Ionicons name="document-text-outline" size={28} color={c.mutedForeground} style={{ alignSelf: 'flex-end' }} />
          <Text style={s.label}>لا توجد نماذج متاحة بعد</Text>
          <Text style={s.body}>لم تُحمَّل النماذج المستوردة. حاول لاحقًا.</Text>
        </View>}
        {exams.map(exam => {
          const expanded = open === exam.id;
          const total = exam.sections.reduce((n, sec) => n + sec.length, 0);
          const saved = progress.owner === owner ? progress.data[exam.id] : undefined;
          const summary = saved?.state === 'ready' ? saved.summary : null;
          return <View key={exam.id} style={[s.card, expanded && { borderColor: c.primary }, summary?.completed && { borderColor: c.isDark ? '#4cc97f' : '#237848' }]}>
            <Pressable testID={`library-open-${exam.id}`} accessibilityRole="button" accessibilityState={{ expanded }}
              accessibilityLabel={`نموذج ${exam.title}${summary?.completed ? '، مكتمل' : ''}`} onPress={() => setOpen(expanded ? null : exam.id)} style={s.examRow}>
              <View style={s.badge}><Text style={s.badgeText}>{exam.title}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>نموذج {exam.title}</Text>
                <Text style={s.caption}>{exam.sections.length} أقسام • {total} سؤالًا • {exam.essayPrompt ? 'مع موضوع تعبير' : 'دون موضوع تعبير'}</Text>
              </View>
              {summary?.completed && <Ionicons testID={`library-complete-${exam.id}`} name="checkmark-circle" size={28} color={c.isDark ? '#4cc97f' : '#237848'} />}
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={c.mutedForeground} />
            </Pressable>
            {!saved ? <Text style={s.caption}>جارٍ قراءة تقدّمك…</Text>
              : saved.state === 'error' ? <View style={{ gap: 6 }}>
                <Text accessibilityRole="alert" style={s.caption}>تعذّر قراءة تقدّم هذا النموذج. محاولتك المحفوظة لم تتغيّر.</Text>
                <Pressable testID={`library-progress-retry-${exam.id}`} accessibilityRole="button" onPress={() => setRetry(value => value + 1)}>
                  <Text style={[s.label, { color: c.primary }]}>إعادة قراءة التقدّم</Text>
                </Pressable>
              </View> : <Enter from="up" style={s.progressBox}>
                <Text testID={`library-status-${exam.id}`} style={[s.progressStatus, summary?.completed && { color: c.isDark ? '#4cc97f' : '#237848' }]}>
                  {summary?.completed ? 'مكتمل' : summary?.started ? 'غير مكتمل' : 'لم تبدأ بعد'}
                </Text>
                <Text style={s.caption}>{summary?.mode === 'full' ? 'تقدّم محاولتك الكاملة • أسئلة أُجيب عنها' : 'تقدّم الأقسام • أسئلة أُجيب عنها'}</Text>
                {summary?.sections.map((section, index) => <View key={index} testID={`library-progress-${exam.id}-${index}`} style={s.progressRow}>
                  <Text style={s.caption}>القسم {index + 1}</Text>
                  <Text style={[s.progressCount, { color: c.foreground }]}>{section.answered} / {section.total}</Text>
                  <View style={[s.progressTrack, { backgroundColor: c.secondary }]}>
                    <View style={{ height: '100%', width: `${section.total ? section.answered / section.total * 100 : 0}%`, backgroundColor: c.primary, borderRadius: 4, alignSelf: 'flex-end' }} />
                  </View>
                </View>)}
                {summary?.essay && <Text style={s.caption}>{summary.essay === 'submitted' ? 'التعبير: تمّ تسليم المسوّدة' : summary.essay === 'draft' ? 'التعبير: مسوّدة محفوظة' : 'التعبير: لم يُكتب بعد'}</Text>}
              </Enter>}
            {expanded && <View style={{ gap: 10 }}>
              <Text style={s.caption}>الملف: {exam.sourceFilename}</Text>
              {exam.sections.map((sec, i) => <Pressable key={i} testID={`library-train-${exam.id}-${i}`} accessibilityRole="button"
                onPress={() => router.push(`/source-session?exam=${exam.id}&mode=training&section=${i}`)}
                style={({ pressed }) => [s.option, pressed && { opacity: 0.7 }]}>
                <Ionicons name="time-outline" size={18} color={c.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>تدريب القسم {i + 1}</Text>
                  <Text style={s.caption}>{sec.length} سؤالًا • 20 دقيقة • دون تعبير</Text>
                </View>
              </Pressable>)}
              <Pressable testID={`library-full-${exam.id}`} accessibilityRole="button"
                onPress={() => router.push(`/source-session?exam=${exam.id}&mode=full`)}
                style={({ pressed }) => [s.primary, pressed && { opacity: 0.8 }]}>
                <Text style={s.primaryText}>النموذج كاملًا • {exam.sections.length} أقسام × 20 دقيقة + تعبير 15 دقيقة</Text>
              </Pressable>
            </View>}
          </View>;
        })}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, gap: 14 },
    eyebrow: { fontFamily: BOLD, fontSize: 13, color: c.primary, textAlign: 'right' },
    hero: { fontFamily: BOLD, fontSize: 30, lineHeight: 42, color: c.foreground, textAlign: 'right', writingDirection: 'rtl' },
    title: { fontFamily: BOLD, fontSize: 18, color: c.foreground, textAlign: 'right' },
    label: { fontFamily: BOLD, fontSize: 15, lineHeight: 24, color: c.foreground, textAlign: 'right', writingDirection: 'rtl' },
    body: { fontFamily: FONT, fontSize: 14, lineHeight: 24, color: c.foreground, textAlign: 'right', writingDirection: 'rtl' },
    caption: { fontFamily: FONT, fontSize: 12, lineHeight: 20, color: c.mutedForeground, textAlign: 'right', writingDirection: 'rtl' },
    notice: { padding: 16, gap: 8, borderRadius: c.radius, backgroundColor: c.secondary },
    card: { padding: 16, gap: 12, borderRadius: c.radius, backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
    examRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    progressBox: { gap: 8 },
    progressStatus: { fontFamily: BOLD, fontSize: 13, lineHeight: 22, textAlign: 'right', color: c.mutedForeground, writingDirection: 'rtl' },
    progressRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    progressTrack: { flex: 1, height: 6, borderRadius: 4, overflow: 'hidden' },
    progressCount: { minWidth: 58, fontSize: 13, lineHeight: 22, fontWeight: '700', textAlign: 'left', writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
    badge: { minWidth: 56, height: 44, borderRadius: 14, backgroundColor: c.secondary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    badgeText: { fontFamily: BOLD, fontSize: 13, color: c.primary },
    option: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 12, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, backgroundColor: c.background },
    primary: { minHeight: 50, padding: 13, borderRadius: c.radius, backgroundColor: c.primary, justifyContent: 'center' },
    primaryText: { fontFamily: BOLD, fontSize: 14, lineHeight: 22, color: c.primaryForeground, textAlign: 'center' },
  });
}
