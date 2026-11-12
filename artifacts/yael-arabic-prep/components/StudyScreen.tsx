import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth, useClerk } from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getStudyCourseLesson, getStudyCourses, useGetStudyCourseLesson, useGetStudyCourses,
  type StudyCourseLesson, type StudyLessonPreview,
} from '@workspace/api-client-react';
import { Creature, CREATURE_NAMES, type CreatureKind } from '@/components/PetTeacher';
import { ChunkyButton, usePlay } from '@/components/Playful';
import { useHebrewSpeech } from '@/hooks/useHebrewSpeech';
import { getStudyAuthOptions } from '@/lib/study-auth';
import { ARABIC_FONT, ARABIC_BOLD_FONT } from '@/constants/typography';

const FONT = ARABIC_FONT;
const BOLD = ARABIC_BOLD_FONT;
const PREMIUM_PRICE = '₪48.90';
type P = ReturnType<typeof usePlay>;

function one(v: string | string[] | undefined) { return Array.isArray(v) ? v[0] : v; }
function statusOf(e: unknown): number | null {
  const s = (e as { status?: unknown } | null)?.status;
  return typeof s === 'number' ? s : null;
}
function teacherTone(p: P, t: string) {
  if (t === 'lumi') return { bg: p.sky, shade: p.skyShade, soft: p.skySoft, ink: p.skyInk };
  if (t === 'nuna') return { bg: p.coral, shade: p.coralShade, soft: p.coralSoft, ink: p.coralInk };
  if (t === 'ghaima') return { bg: p.sun, shade: p.sunShade, soft: p.sunSoft, ink: p.sunInk };
  return { bg: p.brand, shade: p.brandShade, soft: p.brandSoft, ink: p.brandShade };
}
const doneKey = (uid: string) => `yael-study-done:v1:${uid}`;

function useStudyAuth() {
  const { userId, isLoaded } = useAuth();
  const clerk = useClerk();
  const auth = useCallback(() => getStudyAuthOptions(() => clerk.session ?? null, userId ?? null, () => true), [clerk, userId]);
  return { userId: userId ?? null, isLoaded, auth };
}

function useCompleted(userId: string | null) {
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const activeUser = useRef(userId);
  activeUser.current = userId;
  const writes = useRef<Promise<void>>(Promise.resolve());
  const parseIds = (raw: string | null): string[] => {
    if (raw === null) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(id => typeof id === 'string')) throw new Error('Invalid completion data');
    return value;
  };
  useEffect(() => {
    let alive = true;
    setDone([]);
    setError(null);
    if (!userId) return;
    AsyncStorage.getItem(doneKey(userId)).then(raw => {
      if (alive) setDone(parseIds(raw));
    }).catch(() => {
      if (alive) setError('تعذّرت قراءة الدروس المكتملة على هذا الجهاز. لم نحذف المحفوظات؛ يمكنك متابعة الدراسة.');
    });
    return () => { alive = false; };
  }, [userId]);
  const mark = useCallback((id: string) => {
    if (!userId) return;
    writes.current = writes.current.catch(() => undefined).then(async () => {
      const previous = parseIds(await AsyncStorage.getItem(doneKey(userId)));
      const next = [...new Set([...previous, id])];
      await AsyncStorage.setItem(doneKey(userId), JSON.stringify(next));
      if (activeUser.current === userId) { setDone(next); setError(null); }
    }).catch(() => {
      if (activeUser.current === userId) setError('أنهيت الدرس، لكن تعذّر حفظ اكتماله على الجهاز. لم نغيّر المحفوظات السابقة.');
    });
  }, [userId]);
  return { done, mark, error };
}

export default function StudyScreen() {
  const p = usePlay();
  const s = makeStyles(p);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lesson?: string }>();
  const lessonId = one(params.lesson);
  const { userId, isLoaded, auth } = useStudyAuth();
  const completion = useCompleted(userId);
  const [locked, setLocked] = useState<StudyLessonPreview | null>(null);

  const catalog = useGetStudyCourses({
    query: {
      queryKey: ['study-courses', userId],
      enabled: isLoaded && !!userId,
      retry: false,
      staleTime: 0,
      refetchOnMount: 'always',
      queryFn: async ({ signal }) => getStudyCourses({ ...await auth(), signal }),
    },
  });
  const data = catalog.data;

  const top = (Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top) + 12;
  const header = (title: string, back: () => void) => <View style={[s.header, { paddingTop: top }]}>
    <Pressable testID="study-back" accessibilityRole="button" accessibilityLabel="رجوع" hitSlop={12} onPress={back}>
      <Ionicons name="arrow-forward" size={24} color={p.foreground} />
    </Pressable>
    <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
  </View>;

  if (lessonId) {
    const preview = data?.lessons.find(l => l.id === lessonId) ?? null;
    return <View style={s.screen}>
      {header(preview?.title ?? 'درس', () => router.replace('/study'))}
      {completion.error && <Text accessibilityLiveRegion="polite" style={s.caption}>{completion.error}</Text>}
      {!isLoaded || !userId || catalog.isLoading ? <Skeleton p={p} /> : catalog.isError || !data
        ? <ErrorBox p={p} onRetry={() => catalog.refetch()} message="تعذّر تحميل قائمة الدروس." />
        : <LessonView key={`${userId}:${lessonId}`} courseId={data.courseId} lessonId={lessonId} preview={preview}
            userId={userId} auth={auth} onDone={() => completion.mark(lessonId)} />}
    </View>;
  }

  const lessons = data?.lessons ?? [];
  return <View style={s.screen}>
    {header('ركن الدراسة', () => router.canGoBack() ? router.back() : router.replace('/'))}
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 24 }]}>
      <View style={s.hero}>
        <View style={{ flex: 1, minWidth: 160, alignItems: 'flex-end' }}>
          <View style={s.tag}><Text style={s.tagText}>{data ? (data.isPremium ? 'الخطة الكاملة' : 'تجربة مجانية · معاينة') : 'دروس مصوّرة من كتابك'}</Text></View>
          <Text style={s.heroTitle}>{data?.title ?? 'مدرسة المخلوقات'}</Text>
          <Text style={s.heroSub}>{data?.description ?? 'معلّمون من عالم الخيال يشرحون لك القواعد خطوة بخطوة.'}</Text>
        </View>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.heroArt}>
          <View style={s.halo} />
          <Creature kind="nuna" mood="cheer" size={110} />
        </View>
      </View>

      {!isLoaded || !userId || catalog.isLoading ? <Skeleton p={p} /> : catalog.isError ? (
        <ErrorBox p={p} onRetry={() => catalog.refetch()} message="تعذّر تحميل الدروس. تأكّد من الاتصال وحاول مجددًا." />
      ) : lessons.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="library-outline" size={32} color={p.mutedForeground} />
          <Text style={s.title}>لا توجد دروس بعد</Text>
          <Text style={s.caption}>سنضيف الدروس هنا قريبًا.</Text>
        </View>
      ) : <>
        <Text accessibilityLiveRegion="polite" style={s.caption}>{completion.error ?? `${completion.done.filter(id => lessons.some(l => l.id === id)).length} / ${lessons.length} دروس مكتملة • محفوظ على هذا الجهاز فقط`}</Text>
        {lessons.map((l, i) => {
          const t = teacherTone(p, l.teacher);
          const isLocked = l.requiresPremium && !data?.isPremium;
          const finished = completion.done.includes(l.id);
          return <Pressable key={l.id} testID={`study-lesson-${l.id}`} accessibilityRole="button"
            accessibilityLabel={`الدرس ${i + 1}: ${l.title}. ${isLocked ? 'مقفل، ضمن الخطة الكاملة' : finished ? 'مكتمل' : 'متاح'}`}
            onPress={() => isLocked ? setLocked(l) : router.push(`/study?lesson=${encodeURIComponent(l.id)}`)}
            style={({ pressed }) => [s.card, { borderColor: t.bg, backgroundColor: t.soft }, pressed && { transform: [{ translateY: 3 }] }]}>
            <View style={[s.avatar, { backgroundColor: t.bg, borderColor: t.shade }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Creature kind={l.teacher as CreatureKind} mood="happy" size={56} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
              <Text style={[s.cardEyebrow, { color: t.ink }]}>الدرس {i + 1} • مع {CREATURE_NAMES[l.teacher as CreatureKind] ?? l.teacher} • {l.minutes} د</Text>
              <Text style={s.cardTitle}>{l.title}</Text>
              <Text style={s.caption}>{l.summary}</Text>
              <Text style={s.caption}>{l.sourceLabel}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: isLocked ? p.muted : finished ? p.success : t.bg }]}>
              <Ionicons name={isLocked ? 'lock-closed' : finished ? 'checkmark' : 'play'} size={16} color={isLocked ? p.mutedForeground : '#fffdf7'} />
            </View>
          </Pressable>;
        })}
      </>}
    </ScrollView>
    <LockedWindow p={p} lesson={locked} onClose={() => setLocked(null)} onPlans={() => { setLocked(null); router.push('/plans'); }} />
  </View>;
}

function LessonView({ courseId, lessonId, preview, userId, auth, onDone }: {
  courseId: string; lessonId: string; preview: StudyLessonPreview | null; userId: string;
  auth: () => Promise<{ headers: Record<string, string>; credentials: 'omit' }>; onDone: () => void;
}) {
  const p = usePlay();
  const s = makeStyles(p);
  const router = useRouter();
  const lesson = useGetStudyCourseLesson(courseId, lessonId, {
    query: {
      queryKey: ['study-lesson', userId, courseId, lessonId],
      enabled: !!courseId && !!lessonId,
      retry: false,
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: 'always',
      queryFn: async ({ signal }) => getStudyCourseLesson(courseId, lessonId, { ...await auth(), signal }),
    },
  });
  if (lesson.isLoading) return <Skeleton p={p} />;
  if (lesson.isError) {
    const st = statusOf(lesson.error);
    if (st === 403) return <ScrollView contentContainerStyle={s.content}>
      <LockedPanel p={p} lesson={preview} onPlans={() => router.push('/plans')} onBack={() => router.replace('/study')} />
    </ScrollView>;
    if (st === 404) return <ScrollView contentContainerStyle={s.content}><ErrorBox p={p} message="لم نجد هذا الدرس." onRetry={() => router.replace('/study')} retryLabel="العودة إلى الدروس" /></ScrollView>;
    return <ScrollView contentContainerStyle={s.content}><ErrorBox p={p} message="تعذّر تحميل الدرس." onRetry={() => lesson.refetch()} /></ScrollView>;
  }
  if (!lesson.data) return <Skeleton p={p} />;
  return <LessonFlow data={lesson.data} onDone={onDone} />;
}

function LessonFlow({ data, onDone }: { data: StudyCourseLesson; onDone: () => void }) {
  const p = usePlay();
  const s = makeStyles(p);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = teacherTone(p, data.teacher);
  const kind = data.teacher as CreatureKind;
  const steps = data.sections.length + 1 + (data.quiz.length ? 1 : 0);
  const [step, setStep] = useState(0);
  const isRef = step === data.sections.length;
  const isQuiz = step === data.sections.length + 1;
  const [scroll, setScroll] = useState<ScrollView | null>(null);
  useEffect(() => { scroll?.scrollTo({ y: 0, animated: false }); }, [step, scroll]);

  return <ScrollView ref={setScroll} contentContainerStyle={[s.content, { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 24 }]}>
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`الخطوة ${step + 1} من ${steps}`} testID="study-progress" style={s.progressRow}>
      {Array.from({ length: steps }).map((_, i) => <View key={i} style={[s.progressDot, { backgroundColor: i <= step ? t.bg : p.track }]} />)}
    </View>
    <Text style={s.caption}>الخطوة {step + 1} من {steps} • {data.sourceLabel}</Text>

    {step < data.sections.length ? (() => {
      const sec = data.sections[step];
      return <View style={{ gap: 14 }} testID={`study-section-${step}`}>
        <View style={s.teacherRow}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Creature kind={kind} mood="happy" size={74} /></View>
          <View style={[s.bubble, { backgroundColor: t.soft, borderColor: t.bg }]}>
            <Text style={[s.cardEyebrow, { color: t.ink }]}>{CREATURE_NAMES[kind] ?? ''} يشرح</Text>
            <Text accessibilityRole="header" style={s.title}>{sec.title}</Text>
            <Text selectable style={s.body}>{sec.body}</Text>
          </View>
        </View>
        {sec.examples.length > 0 && <Text style={s.title}>أمثلة</Text>}
        {sec.examples.map((ex, i) => <ExampleRow key={i} p={p} hebrew={ex.hebrew} arabic={ex.arabic} index={i} />)}
      </View>;
    })() : isRef ? <ReferenceView p={p} title={data.referenceTitle} rows={data.referenceRows} /> : isQuiz ? (
      <QuizView p={p} quiz={data.quiz} kind={kind} onFinish={onDone} />
    ) : null}

    <View style={s.nav}>
      <View style={{ flex: 1 }}>
        <ChunkyButton tone="ghost" label="السابق" icon="arrow-forward" testID="study-prev" disabled={step === 0} onPress={() => setStep(x => Math.max(0, x - 1))} />
      </View>
      <View style={{ flex: 1 }}>
        {step < steps - 1
          ? <ChunkyButton tone="brand" label="التالي" icon="arrow-back" testID="study-next" onPress={() => {
              const next = step + 1;
              if (next === steps - 1 && !data.quiz.length) onDone();
              setStep(next);
            }} />
          : <ChunkyButton tone="sun" label="كل الدروس" icon="library" testID="study-to-catalog" onPress={() => router.replace('/study')} />}
      </View>
    </View>
  </ScrollView>;
}

function ExampleRow({ p, hebrew, arabic, index }: { p: P; hebrew: string; arabic: string; index: number }) {
  const s = makeStyles(p);
  const speech = useHebrewSpeech(hebrew);
  return <View style={s.example}>
    <Pressable testID={`study-speak-${index}`} accessibilityRole="button" accessibilityLabel={`استمع إلى ${hebrew}`} hitSlop={8}
      onPress={speech.toggle} style={[s.speak, { backgroundColor: p.skySoft }]}>
      <Ionicons name={speech.status === 'speaking' ? 'stop' : 'volume-high'} size={18} color={p.skyInk} />
    </Pressable>
    <View style={{ flex: 1, gap: 2 }}>
      <Text selectable style={s.hebrew}>{hebrew}</Text>
      <Text selectable style={s.body}>{arabic}</Text>
    </View>
  </View>;
}

function ReferenceView({ p, title, rows }: { p: P; title: string; rows: { term: string; meaning: string }[] }) {
  const s = makeStyles(p);
  const [cards, setCards] = useState(false);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const row = rows[i];
  return <View style={{ gap: 12 }} testID="study-reference">
    <Text accessibilityRole="header" style={s.title}>{title}</Text>
    {rows.length === 0 ? <Text style={s.caption}>لا يوجد جدول مرجعي لهذا الدرس.</Text> : <>
      <View style={s.toggleRow}>
        {[['جدول', false], ['بطاقات', true]].map(([label, v]) => <Pressable key={String(label)} testID={`study-ref-${v ? 'cards' : 'table'}`}
          accessibilityRole="button" accessibilityState={{ selected: cards === v }} onPress={() => { setCards(v as boolean); setFlip(false); }}
          style={[s.toggle, cards === v && { backgroundColor: p.brand, borderColor: p.brandShade }]}>
          <Text style={[s.toggleText, cards === v && { color: p.onBrand }]}>{label as string}</Text>
        </Pressable>)}
      </View>
      {!cards ? <View style={s.table} accessibilityLabel={`${title}، ${rows.length} صفًا`}>
        {rows.map((r, k) => <View key={k} accessible accessibilityLabel={`${r.term}: ${r.meaning}`} style={[s.tableRow, k % 2 === 1 && { backgroundColor: p.muted }]}>
          <Text selectable style={[s.hebrewSmall, { flex: 1 }]}>{r.term}</Text>
          <Text selectable style={[s.body, { flex: 1 }]}>{r.meaning}</Text>
        </View>)}
      </View> : <>
        <Pressable testID="study-flashcard" accessibilityRole="button" accessibilityLabel={flip ? `${row.term}: ${row.meaning}` : `${row.term}. اضغط لإظهار المعنى`}
          onPress={() => setFlip(f => !f)} style={[s.flash, { backgroundColor: flip ? p.sunSoft : p.card, borderColor: flip ? p.sun : p.border }]}>
          <Text selectable style={s.hebrew}>{row.term}</Text>
          {flip ? <Text selectable style={[s.body, { textAlign: 'center' }]}>{row.meaning}</Text> : <Text style={s.caption}>اضغط لإظهار المعنى</Text>}
        </Pressable>
        <View style={s.nav}>
          <View style={{ flex: 1 }}><ChunkyButton tone="ghost" label="السابقة" testID="study-flash-prev" disabled={i === 0} onPress={() => { setI(x => x - 1); setFlip(false); }} /></View>
          <Text style={[s.caption, { alignSelf: 'center' }]}>{i + 1} / {rows.length}</Text>
          <View style={{ flex: 1 }}><ChunkyButton tone="ghost" label="التالية" testID="study-flash-next" disabled={i === rows.length - 1} onPress={() => { setI(x => x + 1); setFlip(false); }} /></View>
        </View>
      </>}
    </>}
  </View>;
}

function QuizView({ p, quiz, kind, onFinish }: { p: P; quiz: StudyCourseLesson['quiz']; kind: CreatureKind; onFinish: () => void }) {
  const s = makeStyles(p);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const q = quiz[qi];
  useEffect(() => { if (picked !== null) AccessibilityInfo.announceForAccessibility?.(picked === q?.correctIndex ? 'إجابة صحيحة' : 'إجابة غير صحيحة'); }, [picked, q]);

  if (finished) return <View style={[s.bubble, { alignItems: 'center', backgroundColor: p.successSoft, borderColor: p.success }]} testID="study-quiz-done">
    <Creature kind={kind} mood="cheer" size={90} />
    <Text accessibilityLiveRegion="polite" style={s.title}>أنهيت الدرس</Text>
    <Text style={s.body}>{score} من {quiz.length} إجابات صحيحة في الاختبار القصير.</Text>
    <Text style={s.caption}>سُجّل إكمال الدرس على هذا الجهاز فقط.</Text>
    <ChunkyButton tone="sun" label="أعد الاختبار" icon="refresh" testID="study-quiz-replay" onPress={() => { setQi(0); setPicked(null); setScore(0); setFinished(false); }} />
  </View>;
  if (!q) return <Text style={s.caption}>لا يوجد اختبار لهذا الدرس.</Text>;
  return <View style={{ gap: 12 }} testID="study-quiz">
    <Text style={s.cardEyebrow}>اختبار قصير • السؤال {qi + 1} من {quiz.length}</Text>
    <Text selectable style={s.title}>{q.prompt}</Text>
    {q.options.map((o, oi) => {
      const answered = picked !== null;
      const isRight = oi === q.correctIndex;
      const isPick = picked === oi;
      const st = answered && isRight ? 'right' : answered && isPick ? 'wrong' : null;
      return <Pressable key={oi} testID={`study-quiz-option-${oi}`} accessibilityRole="radio" disabled={answered}
        accessibilityState={{ checked: isPick, disabled: answered }}
        accessibilityLabel={`${o}${st === 'right' ? '، الإجابة الصحيحة' : st === 'wrong' ? '، اختيارك غير صحيح' : ''}`}
        onPress={() => { setPicked(oi); if (isRight) setScore(x => x + 1); }}
        style={[s.option, st === 'right' && { borderColor: p.success, backgroundColor: p.successSoft }, st === 'wrong' && { borderColor: p.destructive, backgroundColor: p.coralSoft }]}>
        {st && <Ionicons name={st === 'right' ? 'checkmark-circle' : 'close-circle'} size={20} color={st === 'right' ? p.successInk : p.coralInk} />}
        <Text selectable style={s.optionText}>{o}</Text>
        <Text style={s.caption}>{oi + 1}</Text>
      </Pressable>;
    })}
    {picked !== null && <View style={[s.bubble, { backgroundColor: picked === q.correctIndex ? p.successSoft : p.coralSoft, borderColor: picked === q.correctIndex ? p.success : p.coral }]}>
      <Text accessibilityLiveRegion="polite" style={[s.title, { color: picked === q.correctIndex ? p.successInk : p.coralInk }]}>{picked === q.correctIndex ? 'أحسنت، إجابة صحيحة' : 'ليست هذه، انظر الإجابة الصحيحة'}</Text>
      <Text selectable style={s.body}>{q.explanation}</Text>
      <ChunkyButton tone="brand" testID="study-quiz-next" label={qi < quiz.length - 1 ? 'السؤال التالي' : 'إنهاء الدرس'} icon="arrow-back"
        onPress={() => { if (qi < quiz.length - 1) { setQi(qi + 1); setPicked(null); } else { setFinished(true); onFinish(); } }} />
    </View>}
  </View>;
}

function LockedPanel({ p, lesson, onPlans, onBack }: { p: P; lesson: StudyLessonPreview | null; onPlans: () => void; onBack?: () => void }) {
  const s = makeStyles(p);
  return <View testID="study-locked" style={s.lockCard} accessibilityViewIsModal>
    <View style={s.lockIcon}><Ionicons name="lock-closed" size={22} color={p.sunInk} /></View>
    <Creature kind={(lesson?.teacher as CreatureKind) ?? 'lumi'} mood="happy" size={86} />
    <Text accessibilityRole="header" style={[s.title, { textAlign: 'center' }]}>{lesson ? lesson.title : 'هذا الدرس مقفل'}</Text>
    {!!lesson && <Text style={[s.body, { textAlign: 'center' }]}>{lesson.summary}</Text>}
    <Text style={[s.body, { textAlign: 'center' }]}>دروس ركن الدراسة جزء من الخطة الكاملة. في تجربة مجانية ترى عناوين الدروس فقط، مع حصص يومية محدودة من التدريب.</Text>
    <Text style={[s.caption, { textAlign: 'center' }]}>الخطة الكاملة {PREMIUM_PRICE} شهريًا. الدفع داخل التطبيق غير متاح بعد، ولن نغيّر خطتك تلقائيًا.</Text>
    <ChunkyButton tone="sun" label="عرض الخطط" icon="arrow-back" testID="study-locked-plans" onPress={onPlans} style={{ alignSelf: 'stretch' }} />
    {onBack && <ChunkyButton tone="ghost" label="العودة إلى الدروس" testID="study-locked-back" onPress={onBack} style={{ alignSelf: 'stretch' }} />}
  </View>;
}

function LockedWindow({ p, lesson, onClose, onPlans }: { p: P; lesson: StudyLessonPreview | null; onClose: () => void; onPlans: () => void }) {
  const s = makeStyles(p);
  return <Modal visible={!!lesson} transparent animationType="fade" onRequestClose={onClose}>
    <View style={[s.backdrop, { backgroundColor: p.isDark ? 'rgba(4,10,9,0.6)' : 'rgba(20,32,28,0.35)' }]}>
      <View style={{ width: '100%', maxWidth: 380, gap: 10 }}>
        <LockedPanel p={p} lesson={lesson} onPlans={onPlans} />
        <ChunkyButton tone="ghost" label="ليس الآن" testID="study-locked-close" onPress={onClose} />
      </View>
    </View>
  </Modal>;
}

function Skeleton({ p }: { p: P }) {
  const s = makeStyles(p);
  return <View style={s.content} testID="study-loading">
    {[110, 96, 96].map((h, i) => <View key={i} style={[s.skeleton, { height: h }]} />)}
    <ActivityIndicator color={p.brand} accessibilityLabel="جارٍ التحميل" />
  </View>;
}

function ErrorBox({ p, message, onRetry, retryLabel = 'حاول مجددًا' }: { p: P; message: string; onRetry: () => void; retryLabel?: string }) {
  const s = makeStyles(p);
  return <View style={s.errorBox} testID="study-error">
    <Ionicons name="cloud-offline-outline" size={28} color={p.destructive} />
    <Text accessibilityRole="alert" style={[s.body, { textAlign: 'center' }]}>{message}</Text>
    <ChunkyButton tone="brand" label={retryLabel} icon="refresh" testID="study-retry" onPress={onRetry} style={{ alignSelf: 'stretch' }} />
  </View>;
}

function makeStyles(p: P) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: p.background },
    header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: p.border },
    headerTitle: { flex: 1, fontFamily: BOLD, fontWeight: '800', fontSize: 17, color: p.foreground, textAlign: 'right' },
    content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 14 },
    hero: { backgroundColor: p.sky, borderRadius: 26, borderBottomWidth: 7, borderColor: p.skyShade, padding: 18, flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'center', overflow: 'hidden' },
    tag: { backgroundColor: 'rgba(255,253,247,0.25)', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, marginBottom: 9 },
    tagText: { color: '#fffdf7', fontSize: 11, fontFamily: BOLD, fontWeight: '800' },
    heroTitle: { color: '#fffdf7', fontSize: 24, lineHeight: 32, textAlign: 'right', fontFamily: BOLD, fontWeight: '800' },
    heroSub: { color: '#fffdf7', opacity: 0.9, fontSize: 13, lineHeight: 21, textAlign: 'right', marginTop: 5, fontFamily: FONT, writingDirection: 'rtl' },
    heroArt: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
    halo: { position: 'absolute', width: 106, height: 106, borderRadius: 53, backgroundColor: 'rgba(255,253,247,0.2)' },
    title: { color: p.foreground, fontFamily: BOLD, fontWeight: '800', fontSize: 17, lineHeight: 27, textAlign: 'right', writingDirection: 'rtl' },
    body: { color: p.foreground, fontFamily: FONT, fontSize: 15, lineHeight: 25, textAlign: 'right', writingDirection: 'rtl' },
    caption: { color: p.mutedForeground, fontFamily: FONT, fontSize: 12, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
    hebrew: { color: p.foreground, fontSize: 20, lineHeight: 32, textAlign: 'right', writingDirection: 'rtl', fontWeight: '700' },
    hebrewSmall: { color: p.foreground, fontSize: 16, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl', fontWeight: '700' },
    card: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, borderWidth: 2, borderBottomWidth: 6 },
    avatar: { width: 68, height: 68, borderRadius: 34, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    cardEyebrow: { fontFamily: BOLD, fontWeight: '800', fontSize: 12, color: p.brandShade, textAlign: 'right' },
    cardTitle: { color: p.foreground, fontFamily: BOLD, fontWeight: '800', fontSize: 16, lineHeight: 24, textAlign: 'right' },
    badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', gap: 8, padding: 24, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: p.border },
    skeleton: { borderRadius: 20, backgroundColor: p.muted, opacity: 0.7 },
    errorBox: { alignItems: 'center', gap: 10, padding: 20, borderRadius: 20, borderWidth: 2, borderColor: p.destructive, backgroundColor: p.card },
    progressRow: { flexDirection: 'row-reverse', gap: 6 },
    progressDot: { flex: 1, height: 10, borderRadius: 5 },
    teacherRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8 },
    bubble: { flex: 1, gap: 8, padding: 16, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5 },
    example: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 2, borderColor: p.border, backgroundColor: p.card },
    speak: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    toggleRow: { flexDirection: 'row-reverse', gap: 8 },
    toggle: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, borderWidth: 2, borderBottomWidth: 4, borderColor: p.border, backgroundColor: p.card },
    toggleText: { fontFamily: BOLD, fontWeight: '800', fontSize: 13, color: p.foreground },
    table: { borderRadius: 16, borderWidth: 2, borderColor: p.border, overflow: 'hidden', backgroundColor: p.card },
    tableRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
    flash: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, borderRadius: 24, borderWidth: 2, borderBottomWidth: 6 },
    nav: { flexDirection: 'row-reverse', gap: 10, marginTop: 6 },
    option: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, padding: 14, borderRadius: 18, borderWidth: 2, borderBottomWidth: 5, borderColor: p.border, backgroundColor: p.card },
    optionText: { flex: 1, color: p.foreground, fontSize: 16, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl' },
    lockCard: { alignItems: 'center', gap: 10, padding: 20, borderRadius: 26, borderWidth: 2, borderBottomWidth: 7, borderColor: p.sun, backgroundColor: p.card },
    lockIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: p.sunSoft, alignItems: 'center', justifyContent: 'center' },
    backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  });
}
