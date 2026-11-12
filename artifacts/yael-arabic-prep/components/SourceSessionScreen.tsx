import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ARABIC_BOLD_FONT, ARABIC_FONT } from '@/constants/typography';
import SectionLearningNotes from '@/components/SectionLearningNotes';
import { timedDailyGoalEvents, type DailyGoalEvent } from '@/lib/daily-goal-events';
import { trackDailyActivity } from '@/lib/daily-goals';
import { ActivityIndicator, Animated, AppState, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useUser } from '@clerk/expo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import PetTeacher from '@/components/PetTeacher';
import { QuestionPrompt } from '@/components/Playful';
import PracticeCelebration from '@/components/PracticeCelebration';
import { completionFeedback } from '@/lib/completion-feedback';
import { nextPracticeCelebration, type PracticeCelebrationVariant } from '@/lib/practice-celebrations';
import { useColors } from '@/hooks/useColors';
import { usePlanAccess } from '@/lib/PlanAccess';
import { IMPORTED_EXAMS } from '@/lib/solved-exams';
import type { ImportedExam } from '@/lib/solved-exams';
import { restatementExam, restatementSessionKey } from '@/lib/restatement-practice';
import { ANSWER_REVIEW_LABELS, getAnswerReviewState, type AnswerReviewState } from '@/lib/answer-review';
import { play } from '@/constants/colors';
import { useQuestionTransition } from '@/hooks/useQuestionTransition';
import { Enter } from '@/components/EntranceMotion';
import {
  SourceMode, SourceSession, TYPE_LABEL, advance, catchUp, isDone, isEssayStage, loadSourceSession,
  newSourceSession, parseSourceSession, saveSourceSession, stageCount, storageKey,
} from '@/lib/source-session';

const FONT = ARABIC_FONT;
const BOLD = ARABIC_BOLD_FONT;
type Confirmation = { kind: 'submit'; stage: number } | { kind: 'reset' };

function one(v: string | string[] | undefined) { return Array.isArray(v) ? v[0] : v; }

export default function SourceSessionScreen() {
  const { user, isLoaded } = useUser();
  const { ready: accessReady, plan, isPremium, claimActivity } = usePlanAccess();
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ exam?: string; mode?: string; section?: string; focus?: string }>();
  // The home practice entry uses a neutral URL; identifiers remain internal so
  // its existing saved-attempt key and daily allowance do not change.
  const defaultTraining = params.exam === undefined && params.mode === undefined
    && params.section === undefined && params.focus === undefined;
  const examId = defaultTraining ? 'b17' : one(params.exam);
  const mode = defaultTraining ? 'training' : one(params.mode);
  const sectionRaw = defaultTraining ? '0' : one(params.section);
  const focusRaw = one(params.focus);
  const focused = focusRaw === 'restatement';
  useEffect(() => {
    if (!defaultTraining && examId === 'b17' && mode === 'training' && sectionRaw === '0' && focusRaw === undefined) {
      router.replace('/source-session');
    }
  }, [defaultTraining, examId, mode, sectionRaw, focusRaw, router]);
  const sourceExam = (Array.isArray(IMPORTED_EXAMS) ? IMPORTED_EXAMS : []).find(e => e.id === examId);
  const exam = useMemo(() => sourceExam && focused ? restatementExam(sourceExam) : sourceExam, [sourceExam, focused]);
  const section = sectionRaw !== undefined && /^\d+$/.test(sectionRaw) ? Number(sectionRaw) : null;
  let problem = '';
  if (focusRaw !== undefined && !focused) problem = 'نوع التركيز غير معروف.';
  else if (!exam) problem = 'لم نجد أسئلة هذه الجلسة.';
  else if (mode !== 'training' && mode !== 'full') problem = 'نوع الجلسة غير معروف.';
  else if (mode === 'training' && (section === null || section >= exam.sections.length)) problem = 'اختيار جلسة التدريب غير صالح.';
  else if (focused && mode !== 'training') problem = 'تدريب إعادة الصياغة متاح لقسم واحد فقط.';
  else if (focused && exam.sections[section ?? 0].length === 0) problem = 'لا توجد أسئلة إعادة صياغة في هذا القسم.';
  else if (exam.sections.length === 0 || (!focused && exam.sections.some(s => s.length === 0))) problem = 'محتوى هذه الجلسة غير مكتمل.';

  const [access, setAccess] = useState<'checking' | 'allowed' | 'blocked'>('checking');
  useEffect(() => {
    if (!isLoaded || !accessReady || problem || !exam || !plan) return;
    if (isPremium) { setAccess('allowed'); return; }
    if (exam.id !== 'b17' || mode !== 'training') {
      setAccess('blocked');
      router.replace('/plans?reason=premium-exam');
      return;
    }
    // Eligibility only. Claim the allowance after an explicit Start/Resume.
    setAccess('allowed');
  }, [accessReady, exam, isLoaded, isPremium, mode, plan, problem, router]);

  if (!isLoaded || !accessReady || access === 'checking') return <View style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center' }}><ActivityIndicator color={c.primary} /></View>;
  if (problem || !exam) return <InvalidScreen message={problem} />;
  if (!plan || (access !== 'allowed' && (exam.id !== 'b17' || mode !== 'training'))) return <View style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center' }}><ActivityIndicator color={c.primary} /></View>;
  const m = mode as SourceMode;
  const sec = m === 'training' ? section : null;
  return <Session key={`${user?.id ?? 'guest'}:${exam.id}:${m}:${sec}:${focused ? 'restatement' : 'mixed'}`} userId={user?.id} exam={exam} mode={m} section={sec} focused={focused} canPractice={access === 'allowed'}
    requestPractice={key => isPremium ? Promise.resolve(true) : claimActivity('timed-section', key)} />;
}

function Header({ title, caption, clock }: { title: string; caption: string; clock?: React.ReactNode }) {
  const c = useColors();
  const s = makeStyles(c);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return <View style={[s.header, { paddingTop: (Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top) + 12 }]}>
    <Pressable testID="source-back" accessibilityRole="button" accessibilityLabel="رجوع؛ الوقت يستمر" hitSlop={12}
      onPress={() => router.canGoBack() ? router.back() : router.replace('/exam-library')}>
      <Ionicons name="arrow-forward" color={c.foreground} size={24} />
    </Pressable>
    <View style={{ flex: 1 }}>
      <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
      <Text style={s.caption} numberOfLines={1}>{caption}</Text>
    </View>
    {clock}
  </View>;
}

function InvalidScreen({ message }: { message: string }) {
  const c = useColors();
  const s = makeStyles(c);
  const router = useRouter();
  return <View style={s.screen}>
    <Header title="جلسة تدريب" caption="استعدادك لامتحان YAEL" />
    <View style={s.content}>
      <View style={s.error}>
        <Text style={s.title}>تعذّر فتح الجلسة</Text>
        <Text style={s.body}>{message} اختر نموذجًا وقسمًا من المكتبة.</Text>
        <Pressable testID="source-to-library" accessibilityRole="button" onPress={() => router.replace('/exam-library')} style={s.button}>
          <Text style={s.buttonText}>الذهاب إلى المكتبة</Text>
        </Pressable>
      </View>
    </View>
  </View>;
}

function Session({ userId, exam, mode, section, focused, canPractice, requestPractice }: { userId?: string; exam: ImportedExam; mode: SourceMode; section: number | null; focused: boolean; canPractice: boolean; requestPractice: (key: string) => Promise<boolean> }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);
  const key = restatementSessionKey(storageKey(userId, exam.id, mode, section), focused);
  const pl = c.isDark ? play.dark : play.light;
  const [filter, setFilter] = useState<AnswerReviewState | 'all'>('all');
  const current = useRef<SourceSession | null>(null);
  const mounted = useRef(true);
  const revision = useRef(0);
  const [session, setSession] = useState<SourceSession | null>(null);
  const [completionCelebration, setCompletionCelebration] = useState<PracticeCelebrationVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [now, setNow] = useState(Date.now());
  const [attempt, setAttempt] = useState(0);
  const [entered, setEntered] = useState(false);
  const enteredRef = useRef(false);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const newAttemptKey = useRef(`source-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const goalEvents = useRef(new Map<string, DailyGoalEvent>());
  useFocusEffect(useCallback(() => {
    enteredRef.current = false; setEntered(false);
    return () => { enteredRef.current = false; };
  }, []));

  async function enterSaved() {
    if (!current.current || startingRef.current) return;
    startingRef.current = true; setStarting(true);
    try {
      const old = current.current;
      const resumed = catchUp(old, Date.now());
      if (!isDone(resumed) && (!canPractice || !await requestPractice(old.attemptId ?? newAttemptKey.current))) {
        setNotice('لا تتوفر حصة تدريب الآن. محاولتك محفوظة ووقتها الأصلي لم يتغيّر.'); return;
      }
      if (!mounted.current) return;
      current.current = resumed; setSession(resumed);
      if (resumed !== old) persist(resumed);
      enteredRef.current = true; setEntered(true); setNow(Date.now());
    } catch { if (mounted.current) setNotice('تعذّر فتح المحاولة. لم نغيّر محفوظاتك؛ حاول مجددًا.'); }
    finally { startingRef.current = false; if (mounted.current) setStarting(false); }
  }

  async function startFresh() {
    if (!canPractice || startingRef.current) return;
    startingRef.current = true; setStarting(true);
    try {
      const id = newAttemptKey.current;
      if (!await requestPractice(id)) { setNotice('استخدمت القسم الموقوت المتاح اليوم. محفوظاتك باقية؛ ارجع غدًا أو راجع خطتك.'); return; }
      if (!mounted.current) return;
      setNotice(''); setNow(Date.now());
      enteredRef.current = true; setEntered(true);
      commit({ ...newSourceSession(exam, mode, section), attemptId: id });
      newAttemptKey.current = `source-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    } catch { if (mounted.current) setNotice('تعذّر بدء التدريب. لم يبدأ مؤقّت جديد؛ حاول مجددًا.'); }
    finally { startingRef.current = false; if (mounted.current) setStarting(false); }
  }

  function persist(next: SourceSession | null) {
    const r = ++revision.current;
    const batch = [...goalEvents.current.values()];
    setSaving(true);
    void saveSourceSession(key, next).then(() => {
      for (const event of batch) {
        trackDailyActivity(userId, event.metric, event.id);
        goalEvents.current.delete(`${event.metric}:${event.id}`);
      }
      if (mounted.current && r === revision.current) { setSaveError(false); setSaving(false); }
    }).catch(() => {
      if (mounted.current && r === revision.current) { setSaveError(true); setSaving(false); }
    });
  }
  function commit(next: SourceSession | null) {
    if (next && !next.attemptId) next = { ...next, attemptId: current.current?.attemptId ?? `source-${Date.now()}-${Math.random().toString(36).slice(2)}` };
    for (const event of timedDailyGoalEvents(current.current, next, exam.sections, next ? next.sections.length + (next.mode === 'full' ? 1 : 0) : 0)) {
      goalEvents.current.set(`${event.metric}:${event.id}`, event);
    }
    const old = current.current?.stage;
    if (current.current && !isDone(current.current) && next && isDone(next)) {
      setCompletionCelebration(nextPracticeCelebration());
    } else if (!next) {
      setCompletionCelebration(null);
    }
    current.current = next;
    setSession(next);
    if (old !== next?.stage) { setConfirmation(null); setNow(Date.now()); }
    persist(next);
  }

  useEffect(() => {
    mounted.current = true;
    let active = true;
    setCompletionCelebration(null);
    setLoading(true); setLoadError(false);
    void (async () => {
      try {
        const raw = await loadSourceSession(key);
        if (!active) return;
        const saved = raw ? parseSourceSession(raw, exam, mode, section) : null;
        const resumed = saved ? catchUp(saved, Date.now()) : null;
        current.current = resumed;
        setSession(resumed);
        if (resumed !== saved) persist(resumed);
        if (saved && resumed) setNotice(resumed.stage !== saved.stage
          ? 'انتهى الوقت أثناء غيابك؛ انتقلنا تلقائيًا حسب المواعيد الأصلية.'
          : isDone(saved) ? 'استُعيدت مراجعة محاولتك السابقة.' : 'استُعيدت محاولتك المحفوظة. الوقت يستمر حتى عند المغادرة.');
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; mounted.current = false; };
  }, [key, attempt]);

  useEffect(() => {
    function tick() {
      if (!enteredRef.current) return;
      const t = Date.now();
      setNow(t);
      const prev = current.current;
      if (!prev) return;
      const next = catchUp(prev, t);
      if (next !== prev) { setNotice('انتهى الوقت؛ سُلّمت المرحلة تلقائيًا ولا يمكن العودة إليها.'); commit(next); }
    }
    const timer = setInterval(tick, 500);
    const sub = AppState.addEventListener('change', st => { if (st === 'active') tick(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, []);

  function edit(update: (x: SourceSession) => SourceSession): boolean {
    if (!canPractice) return false;
    const prev = current.current;
    if (!prev || isDone(prev) || prev.stage !== session?.stage) return false;
    const next = catchUp(prev, Date.now());
    if (next !== prev) { setNotice('انتهى الوقت؛ لم يُطبّق التغيير بعد الموعد.'); commit(next); return false; }
    commit(update(next));
    return true;
  }

  function confirmAction() {
    if (confirmation?.kind === 'reset') {
      setConfirmation(null); setNotice(''); setLoadError(false); commit(null);
    } else if (confirmation?.kind === 'submit') {
      const st = confirmation.stage;
      setConfirmation(null);
      if (edit(x => x.stage === st ? advance(x, Date.now()) : x)) setNotice('تم التسليم. لا يمكن تعديل إجابات هذه المرحلة الآن.');
    }
  }

  const sectionLabel = focused ? 'تدريب إعادة صياغة' : mode === 'training' ? 'تدريب متنوع' : 'النموذج كاملًا';
  const done = session ? isDone(session) : false;
  const essayStage = session ? isEssayStage(session) : false;
  const active = !!session && !done;
  const srcSection = session && !done && !essayStage ? session.sections[session.stage] : null;
  const questions = srcSection !== null ? exam.sections[srcSection] : [];
  const q = session && srcSection !== null ? questions[session.question] : null;
  const answers = session && srcSection !== null ? session.answers[session.stage] : [];
  const unanswered = answers.filter(a => a === null).length;
  const seconds = Math.max(0, Math.ceil(((session?.deadline ?? now) - now) / 1000));
  const timerLabel = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const allAnswers = session ? session.answers.flat() : [];
  const skipped = allAnswers.filter(a => a === null).length;
  const totalQ = allAnswers.length;
  const review = session ? session.sections.flatMap((sectionIndex, si) =>
    exam.sections[sectionIndex].map((question, qi) => ({ question, selected: session.answers[si][qi] }))) : [];
  const graded = review.filter(({ question }) => question.answer !== null);
  const correct = graded.filter(({ question, selected }) => selected !== null && selected === question.answer).length;
  const reviewCounts = review.reduce((acc, { question, selected }) => {
    const st = getAnswerReviewState(selected, question.answer);
    acc[st] += 1; return acc;
  }, { correct: 0, wrong: 0, unanswered: 0, ungraded: 0 } as Record<AnswerReviewState, number>);
  const tone: Record<AnswerReviewState, { fg: string; bg: string; border: string; icon: keyof typeof Ionicons.glyphMap }> = {
    correct: { fg: pl.successInk, bg: pl.successSoft, border: pl.success, icon: 'checkmark-circle' },
    wrong: { fg: pl.coralInk, bg: pl.coralSoft, border: c.destructive, icon: 'close-circle' },
    unanswered: { fg: c.mutedForeground, bg: c.muted, border: c.mutedForeground, icon: 'remove-circle-outline' },
    ungraded: { fg: pl.sunInk, bg: pl.sunSoft, border: pl.sunShade, icon: 'help-circle' },
  };
  const ungraded = review.length - graded.length;
  const srcAnswered = review.filter(r => r.selected !== null).length;
  const srcFeedbackRaw = completionFeedback(correct, srcAnswered, review.length);
  const srcFeedback = srcFeedbackRaw === 'celebrate' && graded.length === 0 ? 'steady' : srcFeedbackRaw;
  const lastQ = questions.length - 1;
  const motion = useQuestionTransition(entered && active && !!q && canPractice);
  const go = (target: (x: SourceSession) => number) => motion.advance(() => edit(x => ({ ...x, question: target(x) })));
  const isLastStage = session ? session.stage === stageCount(session) - 1 : false;

  function button(label: string, onPress: () => void, testID: string, secondary = false, disabled = false) {
    return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} testID={testID} onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.button, secondary && s.secondaryButton, (pressed || disabled) && { opacity: 0.5 }]}>
      <Text style={[s.buttonText, secondary && { color: c.foreground }]}>{label}</Text>
    </Pressable>;
  }

  // Model identity is for the full-exam library only, never timed training.
  const modelTitle = mode === 'full' ? exam.title : null;
  const headerTitle = mode === 'training' ? (focused ? 'إعادة صياغة' : 'تدريب 20 دقيقة')
    : active ? (essayStage ? `${modelTitle} • التعبير الكتابي` : `${modelTitle} • القسم ${(srcSection ?? 0) + 1}`) : `نموذج ${modelTitle}`;
  const clock = active ? <View accessible accessibilityLabel={`الوقت المتبقي ${Math.floor(seconds / 60)} دقيقة و${seconds % 60} ثانية`}
    style={[s.clock, seconds <= 60 && { borderColor: c.destructive }]}>
    <Ionicons name="time-outline" color={seconds <= 60 ? c.destructive : c.primary} size={18} />
    <Text style={[s.clockText, seconds <= 60 && { color: c.destructive }]}>{timerLabel}</Text>
  </View> : undefined;

  return (
    <View style={s.screen}>
      <Header title={headerTitle} caption={mode === 'training' ? `${sectionLabel} • 20 دقيقة` : `${sectionLabel} • من نماذجك المرفوعة`} clock={entered ? clock : undefined} />
      <KeyboardAwareScrollViewCompat key={`${session?.stage ?? 'intro'}:${session?.question ?? 0}`} bottomOffset={24} keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, { paddingBottom: (Platform.OS === 'web' ? Math.max(34, insets.bottom) : insets.bottom) + 24 }]}>
        {loading ? <View style={{ gap: 12 }}>
          {[120, 64, 64, 64].map((h, i) => <View key={i} style={[s.skeleton, { height: h }]} />)}
          <Text style={s.caption}>جارٍ استعادة محاولتك…</Text>
        </View> : loadError ? (
          <View style={s.error}>
            <Text style={s.title}>تعذّر استعادة المحاولة</Text>
            <Text style={s.body}>لم نتمكن من قراءة الحفظ المحلي أو أن بياناته غير صالحة. لن نستبدله دون موافقتك.</Text>
            {button('إعادة محاولة الاستعادة', () => setAttempt(n => n + 1), 'source-retry-load')}
            {button('حذف المحاولة المحلية', () => setConfirmation({ kind: 'reset' }), 'source-clear-corrupt', true)}
          </View>
        ) : <>
          {!!notice && <View style={s.notice}><Text accessibilityLiveRegion="polite" style={s.body}>{notice}</Text></View>}
          {saveError ? <View style={s.error}>
            <Text accessibilityRole="alert" style={s.body}>تعذّر حفظ آخر التغييرات على هذا الجهاز. لا تغادر قبل إعادة الحفظ.</Text>
            {button('إعادة الحفظ', () => persist(current.current), 'source-retry-save', true)}
          </View> : session && <Text style={s.caption}>{saving ? 'جارٍ الحفظ على هذا الجهاز…' : 'محفوظ على هذا الجهاز'}</Text>}

          {session && !entered ? <Enter from="pop"><View style={s.card} testID="source-saved-entry">
            <Text style={s.title}>محاولة سابقة محفوظة</Text>
            <Text style={s.body}>هذه ليست جولة جديدة. يمكنك فتح محاولتك السابقة؛ وقتها الأصلي لا يبدأ من جديد.</Text>
            {button(isDone(session) ? 'عرض المحاولة السابقة' : 'فتح المحاولة المحفوظة', () => void enterSaved(), 'source-open-saved', false, starting)}
            <SectionLearningNotes section="exam" />
          </View></Enter> : !session ? <>
            {!canPractice && <Text style={s.body}>التدريب غير متاح الآن: ربما استُخدم القسم اليومي أو تعذّر التحقق من الاتصال. يمكنك استعادة نتيجتك ومراجعتها؛ لا تبدأ محاولة جديدة.</Text>}
            <Enter from="pop"><PetTeacher /></Enter>
            {focused && <Text style={s.eyebrow}>تدريب إعادة صياغة</Text>}
            <Enter delay={90}><Text style={s.hero}>{mode === 'training' ? (focused ? `إعادة صياغة،\n20 دقيقة.` : `قسم واحد،\n20 دقيقة.`) : `النموذج كاملًا،\nبإيقاعه الحقيقي.`}</Text></Enter>
            <Enter delay={170}><View style={s.card}>
              <Text style={s.title}>قبل أن تبدأ</Text>
              {mode === 'training'
                ? <Text style={s.body}>{focused ? `${exam.sections[section ?? 0].length} سؤال إعادة صياغة خلال 20 دقيقة. دون تعبير كتابي.` : `${exam.sections[section ?? 0].length} سؤالًا متنوعًا خلال 20 دقيقة، دون تعبير كتابي.`}</Text>
                : <Text style={s.body}>{exam.sections.length} أقسام بالترتيب الأصلي، 20 دقيقة لكل قسم، ثم 15 دقيقة لموضوع التعبير.</Text>}
              <Text style={s.body}>يمكنك التنقّل وتغيير اختيارك داخل القسم الحالي. التسليم أو انتهاء الوقت يغلق القسم نهائيًا.</Text>
              <Text style={s.body}>الوقت يستمر في الخلفية وبعد إغلاق الصفحة. الحفظ تلقائي على الجهاز فقط؛ يمكنك نسخ المحاولة إلى حسابك واستعادتها يدويًا على جهاز آخر.</Text>
            </View></Enter>
            <Enter delay={250}><View style={s.notice}>
              <Text style={s.title}>عن هذا التدريب</Text>
              <Text style={s.body}>هذا تدريب للاستعداد للامتحان، وليس واجهة امتحان YAELNET الفعلي. أعددنا حلولًا وشروحات بالعربية للتصحيح بعد التسليم؛ هي حلول مولّدة بالذكاء الاصطناعي وليست مفتاحًا رسميًا وقد تحتاج مراجعة معلّم.</Text>
              <Text style={s.caption}>لا تدخل الأسئلة المعلّمة «تحتاج مراجعة» في النتيجة. لا تُمنح علامة آلية للتعبير.</Text>
            </View></Enter>
            <Enter delay={330} from="pop">{button(starting ? 'جارٍ تجهيز المحاولة…' : 'ابدأ • يبدأ الوقت الآن', () => void startFresh(), 'source-start', false, !canPractice || starting)}</Enter>
            <SectionLearningNotes section="exam" />
          </> : active && !canPractice ? <View style={s.card}>
            <Text style={s.title}>محاولتك محفوظة</Text>
            <Text style={s.body}>التدريب غير متاح الآن. الوقت الأصلي يستمر؛ يمكنك حفظ النسخة أو استعادة النتائج دون بدء تدريب إضافي. حاول لاحقًا أو راجع خطتك.</Text>
          </View> : active ? <>
            {q ? <>
              <View style={s.row}>
                <Text style={s.caption}>{questions.length - unanswered} / {questions.length} إجابة</Text>
                <Text style={s.eyebrow}>السؤال {session.question + 1} • {TYPE_LABEL[q.type] ?? q.type}{mode === 'full' ? ` • صفحة ${q.sourcePage}` : ''}</Text>
              </View>
              <View style={s.progressTrack}><View style={[s.progressFill, { width: `${((questions.length - unanswered) / questions.length) * 100}%` }]} /></View>
              <Enter trigger={session.stage} from="side"><Animated.View style={[{ gap: 16 }, motion.promptStyle]}>
              {!!q.passage && <View style={s.card}>
                <Text style={s.caption}>النص • اقرأ ثم أجب</Text>
                <Text selectable style={s.hebrew}>{q.passage}</Text>
              </View>}
              <QuestionPrompt index={session.stage * 100 + session.question} hebrew text={`${q.number}. ${q.prompt}`} />
              </Animated.View></Enter>
              <View style={{ gap: 10 }} accessibilityRole="radiogroup">{q.options.map((option, index) => {
                const selected = answers[session.question] === index;
                return <Enter key={index} trigger={session.stage} delay={90 + index * 70}><Animated.View style={motion.answerStyle(Math.min(index, 3))}><Pressable testID={`source-option-${index}`} accessibilityRole="radio"
                  accessibilityState={{ checked: selected }} accessibilityLabel={`${index + 1}. ${option}`}
                  disabled={motion.busy}
                  onPress={() => edit(x => {
                    const a = x.answers.map(r => [...r]);
                    a[x.stage][x.question] = index;
                    return { ...x, answers: a };
                  })}
                  style={[s.option, selected && { borderColor: c.primary, backgroundColor: c.secondary }]}>
                  <Text style={s.optionText}>{option}</Text>
                  <View style={[s.optionNumber, selected && { backgroundColor: c.primary }]}>
                    <Text style={[s.numberText, selected && { color: c.primaryForeground }]}>{index + 1}</Text>
                  </View>
                </Pressable></Animated.View></Enter>;
              })}</View>
              <Text style={s.caption}>يمكنك تغيير اختيارك في أي وقت قبل التسليم.</Text>
              <View style={s.navigation}>
                <View style={{ flex: 1 }}>{button('السابق', () => go(x => Math.max(0, x.question - 1)), 'source-previous', true, session.question === 0 || motion.busy)}</View>
                <View style={{ flex: 1 }}>{button('التالي', () => go(x => Math.min(lastQ, x.question + 1)), 'source-next', true, session.question === lastQ || motion.busy)}</View>
              </View>
              <Text style={s.title}>خريطة القسم</Text>
              <Text style={s.caption}>الإطار = السؤال الحالي • التظليل = أُجيب عنه، وليس تصحيحًا</Text>
              <View style={s.grid}>{answers.map((a, i) =>
                <Pressable key={i} testID={`source-question-${i + 1}`} accessibilityRole="button"
                  accessibilityLabel={`السؤال ${i + 1}، ${a === null ? 'بلا إجابة' : 'أُجيب عنه'}`}
                  accessibilityState={{ selected: session.question === i }}
                  disabled={motion.busy}
                  onPress={() => { if (i !== session.question) go(() => i); }}
                  style={[s.chip, a !== null && { backgroundColor: c.secondary }, session.question === i && { borderColor: c.primary, borderWidth: 2 }]}>
                  <Text style={s.chipText}>{i + 1}</Text>
                </Pressable>)}</View>
              {button(isLastStage ? 'تسليم وإنهاء التدريب' : 'تسليم القسم والانتقال', () => setConfirmation({ kind: 'submit', stage: session.stage }), 'source-submit')}
            </> : essayStage ? <>
              <Enter from="side"><Text style={s.title}>اكتب موضوعًا باللغة العبرية</Text></Enter>
              <Enter delay={100}><View style={s.card}><Text selectable style={s.hebrew}>{exam.essayPrompt}</Text></View></Enter>
              <Text style={s.body}>نظّم أفكارك إلى مقدمة وعرض وخاتمة. لا علامة آلية للتعبير.</Text>
              <TextInput testID="source-essay" accessibilityLabel="مسوّدة التعبير بالعبرية" multiline textAlignVertical="top"
                value={session.essay} onChangeText={essay => edit(x => ({ ...x, essay }))}
                placeholder="כתבו כאן את החיבור שלכם..." placeholderTextColor={c.mutedForeground} style={s.essayInput} autoCorrect={false} />
              <Text style={s.caption}>{session.essay.trim() ? session.essay.trim().split(/\s+/).length : 0} كلمة تقريبًا</Text>
              {button('تسليم التعبير وإنهاء النموذج', () => setConfirmation({ kind: 'submit', stage: session.stage }), 'source-submit')}
            </> : null}
          </> : <>
            <Text style={s.eyebrow}>{focused ? 'انتهى تدريب إعادة صياغة' : mode === 'training' ? 'انتهى تدريب 20 دقيقة' : `انتهت الجلسة • ${modelTitle}`}</Text>
            {completionCelebration && srcFeedback === 'celebrate' && <PracticeCelebration variant={completionCelebration} />}
            <Enter from="pop"><Text style={s.hero}>{srcFeedback === 'celebrate' ? `أنهيت التدريب.\nوقت المراجعة.` : srcFeedback === 'empty' ? 'ابدأ بمحاولة فعلية بدل التسليم بدون إجابات' : srcFeedback === 'review' ? 'جولة للمراجعة: راجع الأسئلة التي أخطأت فيها ثم حاول مجددًا' : 'تقدّم ثابت. راجع الأخطاء القليلة وواصل'}</Text></Enter>
            <Enter delay={120}><View style={s.card}>
              <Text style={s.title}>نتيجتك التدريبية</Text>
              <Text testID="source-score" style={s.score}>{correct} / {graded.length}</Text>
              <Text style={s.body}>{graded.length ? `${Math.round(correct / graded.length * 100)}٪ من الأسئلة القابلة للتصحيح` : 'لا توجد أسئلة قابلة للتصحيح في هذه الجلسة.'}</Text>
              <View style={s.statRow}>
                <View style={s.stat}><Text style={s.score}>{totalQ - skipped}</Text><Text style={s.caption}>أُجيب عنه</Text></View>
                <View style={s.stat}><Text style={s.score}>{skipped}</Text><Text style={s.caption}>متروك</Text></View>
                <View style={s.stat}><Text style={s.score}>{totalQ}</Text><Text style={s.caption}>المجموع</Text></View>
              </View>
              {!!ungraded && <Text style={s.body}>{ungraded} سؤالًا يحتاج مراجعة، مستبعد من النتيجة.</Text>}
              <Text style={s.body}>تصحيح بحلول مولّدة بالذكاء الاصطناعي مع شرح بالعربية، وليست مفتاحًا رسميًا. هذه نسبة تدريبية، وليست علامة YAEL أو YAELNET ولا تقديرًا لها.</Text>
            </View></Enter>
            {button(focused ? 'محاولة مرة أخرى' : 'محاولة جديدة', () => setConfirmation({ kind: 'reset' }), 'source-retake')}
            <View style={s.card}>
              <Text style={s.title}>تفاصيل المراجعة</Text>
              <Text style={s.caption}>اضغط على حالة لعرض أسئلتها فقط. اللون يرافقه دائمًا رمز ونص.</Text>
              <View style={s.filterRow}>
                {(['all', 'correct', 'wrong', 'unanswered', 'ungraded'] as const).map(k => {
                  const on = filter === k;
                  const t = k === 'all' ? null : tone[k];
                  const n = k === 'all' ? review.length : reviewCounts[k];
                  return <Pressable key={k} testID={`source-filter-${k}`} accessibilityRole="button" accessibilityState={{ selected: on }}
                    accessibilityLabel={`${k === 'all' ? 'الكل' : ANSWER_REVIEW_LABELS[k]}: ${n}`} onPress={() => setFilter(k)}
                    style={[s.filterChip, { borderColor: t ? t.border : c.border, backgroundColor: t ? t.bg : c.card }, on && { borderWidth: 3 }]}>
                    <Ionicons name={t ? t.icon : 'list'} size={16} color={t ? t.fg : c.foreground} />
                    <Text style={[s.filterText, { color: t ? t.fg : c.foreground }]}>{k === 'all' ? 'الكل' : ANSWER_REVIEW_LABELS[k]} · {n}</Text>
                  </Pressable>;
                })}
              </View>
            </View>
            {session.sections.map((secIdx, si) => <View key={secIdx} style={{ gap: 12 }}>
              <Text style={s.title}>{mode === 'training' ? 'مراجعة اختياراتك' : `القسم ${secIdx + 1} • مراجعة اختياراتك`}</Text>
              {exam.sections[secIdx].map((qq, qi) => {
                const sel = session.answers[si][qi];
                const st: AnswerReviewState = getAnswerReviewState(sel, qq.answer);
                const t = tone[st];
                if (filter !== 'all' && filter !== st) return null;
                return <View key={qq.id} testID={`source-review-${st}`} style={[s.card, { borderWidth: 2, borderRightWidth: 6, borderColor: t.border }]}>
                  <View style={[s.statusPill, { backgroundColor: t.bg, borderColor: t.border }]} accessible accessibilityLabel={ANSWER_REVIEW_LABELS[st]}>
                    <Ionicons name={t.icon} size={18} color={t.fg} />
                    <Text style={[s.statusText, { color: t.fg }]}>{ANSWER_REVIEW_LABELS[st]}</Text>
                  </View>
                  <Text style={s.eyebrow}>السؤال {qi + 1}{mode === 'full' ? ` • صفحة ${qq.sourcePage} • ${modelTitle}` : ''}</Text>
                  {!!qq.passage && qi > 0 && exam.sections[secIdx][qi - 1].passage === qq.passage ? null : !!qq.passage && <Text selectable style={s.hebrewSmall}>{qq.passage}</Text>}
                  <Text selectable style={s.hebrew}>{qq.number}. {qq.prompt}</Text>
                  {qq.options.map((o, oi) => {
                    const isKey = qq.answer !== null && qq.answer === oi;
                    const isWrongPick = sel === oi && !isKey && qq.answer !== null;
                    const ot = isKey ? tone.correct : isWrongPick ? tone.wrong : sel === oi ? tone.ungraded : null;
                    const tag = isKey ? (sel === oi ? 'اختيارك • الإجابة الصحيحة' : 'الإجابة الصحيحة') : sel === oi ? 'اختيارك' : '';
                    return <View key={oi} accessible accessibilityLabel={`${oi + 1}. ${o}${tag ? `، ${tag}` : ''}`}
                      style={[s.reviewOption, ot && { borderColor: ot.border, backgroundColor: ot.bg, borderWidth: 2 }]}>
                      {ot ? <Ionicons name={ot.icon} size={18} color={ot.fg} /> : null}
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.optionTextSmall}>{o}</Text>
                        {!!tag && <Text style={[s.statusText, { color: ot ? ot.fg : c.foreground, textAlign: 'right' }]}>{tag}</Text>}
                      </View>
                      <Text style={s.numberText}>{oi + 1}</Text>
                    </View>;
                  })}
                  <Text style={s.caption}>{sel === null ? 'لم تختر إجابة.' : `اختيارك: ${sel + 1}`}</Text>
                  {qq.answer !== null && <Text style={s.title}>الإجابة وفق الحل: {qq.answer + 1} — {qq.options[qq.answer]}</Text>}
                  <Text style={s.body}>{qq.explanation}</Text>
                  {qq.answer === null && <Text style={s.caption}>لم نحتسب هذا السؤال في النتيجة؛ راجعه مع معلّم.</Text>}
                </View>;
              })}
            </View>)}
            {mode === 'full' && <View style={s.card}>
              <Text style={s.title}>مسوّدة التعبير • مراجعة ذاتية</Text>
              {!!exam.essayPrompt && <Text selectable style={s.hebrew}>{exam.essayPrompt}</Text>}
              <Text selectable style={session.essay ? s.hebrew : s.body}>{session.essay || 'لم تُكتب مسوّدة في هذه المحاولة.'}</Text>
              <Text style={s.body}>لا علامة للتعبير. راجع:{'\n'}- هل أجبت عن الموضوع بموقف واضح؟{'\n'}- هل دعمت أفكارك بأمثلة؟{'\n'}- هل رتّبت المقدمة والفقرات والخاتمة؟{'\n'}- هل راجعت القواعد والإملاء؟</Text>
            </View>}
            <Text style={s.caption}>المحاولة الجديدة تمسح اختياراتك المحفوظة لهذه الجلسة فقط.</Text>
          </>}
        </>}
        {confirmation && <View style={s.confirmation} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={s.title}>{confirmation.kind === 'reset' ? 'حذف المحاولة والبدء من جديد؟' : 'هل تريد التسليم الآن؟'}</Text>
          <Text style={s.body}>{confirmation.kind === 'reset'
            ? 'ستُحذف الاختيارات والمسوّدة المحفوظة لهذه الجلسة على هذا الجهاز. لا يمكن التراجع.'
            : essayStage ? `${session?.essay.trim() ? 'ستُحفظ مسوّدتك كما هي.' : 'مسوّدتك فارغة.'} سينتهي النموذج.`
              : `تبقّى ${unanswered} سؤالًا بلا إجابة. لن تتمكن من العودة بعد التسليم.`}</Text>
          {confirmation.kind === 'submit' && <Text style={s.caption}>يستمر الوقت أثناء التأكيد.</Text>}
          {button(confirmation.kind === 'reset' ? 'نعم، حذف المحاولة' : 'تأكيد التسليم', confirmAction, 'source-confirm')}
          {button('إلغاء', () => setConfirmation(null), 'source-cancel', true)}
        </View>}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    headerTitle: { fontFamily: BOLD, fontSize: 17, color: c.foreground, textAlign: 'right' },
    content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, gap: 16 },
    eyebrow: { fontFamily: BOLD, fontSize: 13, color: c.primary, textAlign: 'right', writingDirection: 'rtl' },
    hero: { fontFamily: BOLD, fontSize: 32, lineHeight: 44, color: c.foreground, textAlign: 'right', writingDirection: 'rtl' },
    title: { fontFamily: BOLD, fontSize: 18, lineHeight: 28, color: c.foreground, textAlign: 'right', writingDirection: 'rtl' },
    body: { fontFamily: FONT, fontSize: 15, lineHeight: 26, color: c.foreground, textAlign: 'right', writingDirection: 'rtl' },
    caption: { fontFamily: FONT, fontSize: 12, lineHeight: 20, color: c.mutedForeground, textAlign: 'right', writingDirection: 'rtl' },
    hebrew: { fontSize: 19, lineHeight: 33, color: c.foreground, textAlign: 'right', writingDirection: 'rtl' },
    hebrewSmall: { fontSize: 16, lineHeight: 28, color: c.foreground, textAlign: 'right', writingDirection: 'rtl' },
    card: { padding: 18, gap: 12, borderRadius: c.radius, backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
    notice: { padding: 16, gap: 10, borderRadius: c.radius, backgroundColor: c.secondary },
    error: { padding: 16, gap: 12, borderRadius: c.radius, backgroundColor: c.card, borderWidth: 1, borderColor: c.destructive },
    skeleton: { borderRadius: c.radius, backgroundColor: c.muted, opacity: 0.7 },
    button: { minHeight: 50, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13, borderRadius: 16, borderBottomWidth: 5, borderColor: c.isDark ? c.background : c.text, backgroundColor: c.primary },
    secondaryButton: { backgroundColor: c.card, borderWidth: 2, borderBottomWidth: 5, borderColor: c.border },
    buttonText: { fontFamily: BOLD, fontSize: 15, lineHeight: 24, textAlign: 'center', color: c.primaryForeground },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
    clock: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 9 },
    clockText: { fontFamily: BOLD, fontSize: 19, color: c.primary, fontVariant: ['tabular-nums'], writingDirection: 'ltr' },
    progressTrack: { height: 14, borderRadius: 7, backgroundColor: c.border, overflow: 'hidden' },
    progressFill: { height: 14, borderRadius: 7, alignSelf: 'flex-end', backgroundColor: c.primary },
    option: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: c.radius, borderWidth: 2, borderBottomWidth: 5, borderColor: c.border, backgroundColor: c.card },
    optionText: { flex: 1, fontSize: 18, lineHeight: 29, textAlign: 'right', writingDirection: 'rtl', color: c.foreground },
    optionTextSmall: { flex: 1, fontSize: 16, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl', color: c.foreground },
    reviewOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: c.border },
    optionNumber: { minWidth: 30, minHeight: 30, flexShrink: 0, padding: 2, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: c.muted },
    numberText: { fontFamily: BOLD, color: c.foreground, fontSize: 13 },
    navigation: { flexDirection: 'row-reverse', gap: 12 },
    grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    chip: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderBottomWidth: 4, borderColor: c.border, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
    chipText: { fontFamily: BOLD, fontSize: 14, color: c.foreground },
    essayInput: { minHeight: 320, padding: 18, borderRadius: c.radius, borderWidth: 1, borderColor: c.input, backgroundColor: c.card, color: c.foreground, fontSize: 19, lineHeight: 32, textAlign: 'right', writingDirection: 'rtl' },
    filterRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    filterChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 2 },
    filterText: { fontFamily: BOLD, fontSize: 13 },
    statusPill: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1.5 },
    statusText: { fontFamily: BOLD, fontSize: 13, writingDirection: 'rtl' },
    statRow: { flexDirection: 'row-reverse', gap: 10 },
    stat: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 14, backgroundColor: c.secondary },
    score: { fontFamily: BOLD, fontSize: 30, color: c.primary },
    confirmation: { gap: 14, padding: 20, borderRadius: c.radius, borderWidth: 2, borderColor: c.primary, backgroundColor: c.card },
  });
}
