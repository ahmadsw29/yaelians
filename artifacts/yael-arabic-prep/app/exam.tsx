import React, { useEffect, useRef, useState } from 'react';
import { timedDailyGoalEvents, type DailyGoalEvent } from '@/lib/daily-goal-events';
import { trackDailyActivity } from '@/lib/daily-goals';
import { ActivityIndicator, AppState, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import PetTeacher from '@/components/PetTeacher';
import { QuestionPrompt } from '@/components/Playful';
import PracticeCelebration from '@/components/PracticeCelebration';
import { completionFeedback } from '@/lib/completion-feedback';
import { nextPracticeCelebration, type PracticeCelebrationVariant } from '@/lib/practice-celebrations';
import { useColors } from '@/hooks/useColors';
import { EXAM_SECTIONS, ESSAY_PROMPT } from '@/lib/exam-content';
import { scoreExamSections } from '@/lib/exam-results';
import SourceSessionBackup from '@/components/SourceSessionBackup';
import type { SourceSession } from '@/lib/source-session';

const BACKUP_EXAM = { id: 'builtin', sections: EXAM_SECTIONS };
function forBackup(session: Session): SourceSession {
  return { ...session, examId: BACKUP_EXAM.id, mode: 'full', sections: EXAM_SECTIONS.map((_, i) => i) };
}
async function loadGuestBackup() {
  const key = 'yael-exam:v1:guest';
  await storageQueues.get(key)?.catch(() => {});
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.stringify(forBackup(parseSession(raw))) : null;
}

const SECTION_MS = 20 * 60 * 1000;
const ESSAY_MS = 15 * 60 * 1000;
const SOURCE = 'https://www.nite.org.il/other-tests/yael/format?lang=en';
import { ARABIC_FONT, ARABIC_BOLD_FONT } from '@/constants/typography';
const FONT = ARABIC_FONT;
const BOLD = ARABIC_BOLD_FONT;

type Session = {
  version: 1;
  attemptId?: string;
  stage: number; // 0–2: multiple choice; 3: essay; 4: results.
  deadline: number | null;
  question: number;
  answers: (number | null)[][];
  essay: string;
};
type Confirmation = { kind: 'submit'; stage: number } | { kind: 'reset' };

// Serialize writes across renders AND route remounts. A new reader waits for
// pending writes, so an older draft cannot overwrite a newer answer or retake.
const storageQueues = new Map<string, Promise<void>>();
function saveSession(key: string, session: Session | null): Promise<void> {
  const prior = storageQueues.get(key) ?? Promise.resolve();
  const next = prior.catch(() => {}).then(() => session
    ? AsyncStorage.setItem(key, JSON.stringify(session))
    : AsyncStorage.removeItem(key));
  storageQueues.set(key, next);
  void next.finally(() => {
    if (storageQueues.get(key) === next) storageQueues.delete(key);
  }).catch(() => {});
  return next;
}

function newSession(): Session {
  return {
    version: 1, attemptId: `exam-${Date.now()}-${Math.random().toString(36).slice(2)}`, stage: 0, question: 0, deadline: Date.now() + SECTION_MS,
    answers: EXAM_SECTIONS.map(section => section.map(() => null)), essay: '',
  };
}

function advance(session: Session, from: number): Session {
  const stage = session.stage + 1;
  return {
    ...session, stage, question: 0,
    deadline: stage === 4 ? null : from + (stage === 3 ? ESSAY_MS : SECTION_MS),
  };
}

function catchUp(session: Session, now: number): Session {
  let next = session;
  // Carry deadlines forward from their ORIGINAL timestamps, not resume time.
  while (next.stage < 4 && next.deadline !== null && now >= next.deadline) {
    next = advance(next, next.deadline);
  }
  return next;
}

function parseSession(raw: string): Session {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Invalid session');
  const s = value as Session;
  if (s.version !== 1 || !Number.isInteger(s.stage) || s.stage < 0 || s.stage > 4
    || (s.attemptId !== undefined && (typeof s.attemptId !== 'string' || !s.attemptId || s.attemptId.length > 120))
    || !Number.isInteger(s.question) || s.question < 0 || s.question > 21
    || typeof s.essay !== 'string'
    || (s.stage < 4 ? typeof s.deadline !== 'number' || !Number.isFinite(s.deadline) || s.deadline <= 0 : s.deadline !== null)
    || !Array.isArray(s.answers) || s.answers.length !== 3
    || !s.answers.every((section, i) => Array.isArray(section) && section.length === 22
      && section.every((answer, j) => answer === null || (Number.isInteger(answer)
        && answer >= 0 && answer < EXAM_SECTIONS[i][j].options.length)))) {
    throw new Error('Invalid session');
  }
  return s;
}

export default function ExamScreen() {
  const { user, isLoaded } = useUser();
  const c = useColors();
  if (!isLoaded) return <View style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center' }}><ActivityIndicator color={c.primary} /></View>;
  return <ExamSession key={user?.id ?? 'guest'} userId={user?.id} />;
}

function ExamSession({ userId }: { userId?: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = makeStyles(c);
  const key = `yael-exam:v1:${userId ?? 'guest'}`;
  const current = useRef<Session | null>(null);
  const mounted = useRef(true);
  const writeRevision = useRef(0);
  const restoring = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [completionCelebration, setCompletionCelebration] = useState<PracticeCelebrationVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loadAttempt, setLoadAttempt] = useState(0);
  const validContent = EXAM_SECTIONS.length === 3 && EXAM_SECTIONS.every(section => section.length === 22);

  const goalEvents = useRef(new Map<string, DailyGoalEvent>());
  function persist(next: Session | null) {
    const batch = [...goalEvents.current.values()];
    const revision = ++writeRevision.current;
    setSaving(true);
    void saveSession(key, next).then(() => {
      for (const event of batch) {
        trackDailyActivity(userId, event.metric, event.id);
        goalEvents.current.delete(`${event.metric}:${event.id}`);
      }
      if (mounted.current && revision === writeRevision.current) {
        setSaveError(false);
        setSaving(false);
      }
    }).catch(() => {
      if (mounted.current && revision === writeRevision.current) {
        setSaveError(true);
        setSaving(false);
      }
    });
  }

  function commit(next: Session | null) {
    if (restoring.current) return;
    if (next && !next.attemptId) next = { ...next, attemptId: current.current?.attemptId ?? `exam-${Date.now()}-${Math.random().toString(36).slice(2)}` };
    for (const event of timedDailyGoalEvents(current.current, next, EXAM_SECTIONS, 4)) {
      goalEvents.current.set(`${event.metric}:${event.id}`, event);
    }
    const oldStage = current.current?.stage;
    if (next?.stage === 4 && oldStage !== undefined && oldStage < 4) {
      setCompletionCelebration(nextPracticeCelebration());
    } else if (!next) {
      setCompletionCelebration(null);
    }
    current.current = next;
    setSession(next);
    if (oldStage !== next?.stage) {
      setConfirmation(null);
      setNow(Date.now());
    }
    persist(next);
  }

  async function restoreBackup(next: SourceSession) {
    const restored = parseSession(JSON.stringify(next));
    restoring.current = true;
    try {
      await saveSession(key, restored);
      if (!mounted.current) return;
      current.current = restored;
      setSession(restored);
      setCompletionCelebration(null);
      setConfirmation(null);
      setNow(Date.now());
      setNotice('');
      setSaveError(false);
      setLoadError(false);
    } finally { restoring.current = false; }
  }

  useEffect(() => {
    mounted.current = true;
    let active = true;
    setCompletionCelebration(null);
    setLoading(true);
    setLoadError(false);
    void (async () => {
      try {
        await storageQueues.get(key)?.catch(() => {});
        const raw = await AsyncStorage.getItem(key);
        if (!active) return;
        const saved = raw ? parseSession(raw) : null;
        const resumed = saved ? catchUp(saved, Date.now()) : null;
        current.current = resumed;
        setSession(resumed);
        if (resumed !== saved) persist(resumed);
        if (saved) setNotice(resumed?.stage !== saved.stage
          ? 'انتهى وقت مرحلة أو أكثر أثناء غيابك؛ انتقلنا تلقائيًا حسب المواعيد الأصلية.'
          : saved.stage === 4 ? 'استُعيدت نتيجة محاولتك ومسوّدة التعبير المحفوظة.'
            : 'استُعيدت محاولتك المحفوظة. الوقت يستمر حتى عند مغادرة التطبيق.');
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; mounted.current = false; };
  }, [key, loadAttempt]);

  useEffect(() => {
    function tick() {
      if (restoring.current) return;
      const time = Date.now();
      setNow(time);
      const previous = current.current;
      if (!previous) return;
      const next = catchUp(previous, time);
      if (next !== previous) {
        setNotice('انتهى الوقت؛ تم تسليم المرحلة والانتقال تلقائيًا. لا يمكن العودة إليها.');
        commit(next);
      }
    }
    const timer = setInterval(tick, 500);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') tick(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);

  // Every user action rechecks the deadline synchronously, before applying input.
  function edit(update: (s: Session) => Session): boolean {
    if (restoring.current) return false;
    const previous = current.current;
    if (!previous || previous.stage === 4 || previous.stage !== session?.stage) return false;
    const next = catchUp(previous, Date.now());
    if (next !== previous) {
      setNotice('انتهى وقت المرحلة السابقة؛ لم يُطبّق التغيير بعد الموعد.');
      commit(next);
      return false;
    }
    commit(update(next));
    return true;
  }

  function confirmAction() {
    if (confirmation?.kind === 'reset') {
      setConfirmation(null);
      setNotice('');
      setLoadError(false);
      commit(null);
    } else if (confirmation?.kind === 'submit') {
      const stage = confirmation.stage;
      setConfirmation(null);
      if (edit(s => s.stage === stage ? advance(s, Date.now()) : s)) {
        setNotice('تم تسليم المرحلة. لا يمكن تعديل إجاباتها الآن.');
      }
    }
  }

  const stage = session?.stage ?? 0;
  const activeExam = session !== null && stage < 4;
  const question = session && stage < 3 ? EXAM_SECTIONS[stage][session.question] : null;
  const unanswered = session && stage < 3 ? session.answers[stage].filter(answer => answer === null).length : 0;
  const seconds = Math.max(0, Math.ceil(((session?.deadline ?? now) - now) / 1000));
  const timerLabel = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const correct = session ? EXAM_SECTIONS.reduce((total, section, i) =>
    total + section.filter((q, j) => session.answers[i][j] === q.answer).length, 0) : 0;
  const skipped = session ? session.answers.flat().filter(answer => answer === null).length : 0;
  const examFeedback = completionFeedback(correct, 66 - skipped, 66);
  const mistakes = session ? EXAM_SECTIONS.flatMap((section, i) => section.map((q, j) =>
    ({ q, section: i, index: j, selected: session.answers[i][j] })))
    .filter(item => item.selected !== item.q.answer) : [];

  function button(label: string, onPress: () => void, testID: string, secondary = false, disabled = false) {
    return <Pressable accessibilityRole="button" accessibilityLabel={label} testID={testID} onPress={onPress} disabled={disabled}
      style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, (pressed || disabled) && { opacity: 0.55 }]}>
      <Text style={[styles.buttonText, secondary && { color: c.foreground }]}>{label}</Text>
    </Pressable>;
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: (Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top) + 12 }]}>
        <Pressable testID="exam-back" accessibilityRole="button" accessibilityLabel="رجوع؛ الوقت يستمر" hitSlop={12}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-forward" color={c.foreground} size={24} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{activeExam ? (stage < 3 ? `القسم ${stage + 1} من 3` : 'مهمة التعبير الكتابي') : 'محاكاة ياعيل الورقي'}</Text>
          <Text style={styles.caption}>{activeExam ? 'تدريب مستقل • الوقت لا يتوقف' : 'تدريب أصلي غير رسمي'}</Text>
        </View>
        {activeExam && <View accessible accessibilityLabel={`الوقت المتبقي ${Math.floor(seconds / 60)} دقيقة و${seconds % 60} ثانية`}
          style={[styles.clock, seconds <= 60 && { borderColor: c.destructive }]}>
          <Ionicons name="time-outline" color={seconds <= 60 ? c.destructive : c.primary} size={18} />
          <Text style={[styles.clockText, seconds <= 60 && { color: c.destructive }]}>{timerLabel}</Text>
        </View>}
      </View>

      <KeyboardAwareScrollViewCompat bottomOffset={24} keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: (Platform.OS === 'web' ? Math.max(34, insets.bottom) : insets.bottom) + 24 }]}>
        {!loading && validContent && <SourceSessionBackup userId={userId} exam={BACKUP_EXAM} mode="full" section={null} focused={false}
          session={session ? forBackup(session) : null} onRestore={restoreBackup} loadGuest={loadGuestBackup} />}
        {loading ? <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} /> : !validContent ? (
          <View style={styles.card}><Text style={styles.title}>تعذّر تحميل أسئلة المحاكاة</Text><Text style={styles.body}>يجب توفير ثلاثة أقسام، في كل منها 22 سؤالًا. ارجع وحاول لاحقًا.</Text></View>
        ) : loadError ? (
          <View style={styles.card}>
            <Text style={styles.title}>تعذّر استعادة المحاولة</Text>
            <Text style={styles.body}>لم نتمكن من قراءة الحفظ المحلي أو أن بياناته غير صالحة. لن نستبدله دون موافقتك.</Text>
            {button('إعادة محاولة الاستعادة', () => setLoadAttempt(n => n + 1), 'exam-retry-load')}
            {button('حذف المحاولة المحلية', () => setConfirmation({ kind: 'reset' }), 'exam-clear-corrupt', true)}
          </View>
        ) : <>
          {!!notice && <View style={styles.notice}><Text accessibilityLiveRegion="polite" style={styles.body}>{notice}</Text></View>}
          {saveError ? <View style={styles.error}>
            <Text accessibilityRole="alert" style={styles.body}>تعذّر حفظ آخر التغييرات على هذا الجهاز. إجاباتك الحالية باقية هنا فقط؛ لا تغادر قبل إعادة الحفظ.</Text>
            {button('إعادة الحفظ', () => persist(current.current), 'exam-retry-save', true)}
          </View> : session && <Text style={styles.caption}>{saving ? 'جارٍ الحفظ على هذا الجهاز…' : 'محفوظ محليًا • استخدم النسخ إلى الحساب لحفظه على أجهزتك الأخرى'}</Text>}

          {!session ? <>
            <PetTeacher />
            <Text style={styles.eyebrow}>75 دقيقة • مساحة للتركيز</Text>
            <Text style={styles.hero}>جرّب الامتحان،{'\n'}بإيقاعه الحقيقي.</Text>
            <Text style={styles.body}>محاكاة أصلية غير رسمية للتدرّب على ياعيل الورقي (YAEL). الأسئلة مؤلَّفة للتدريب، وليست أسئلة رسمية أو منقولة عن المركز القطري.</Text>
            <View style={styles.card}>
              <Text style={styles.title}>قبل أن تبدأ</Text>
              <Text style={styles.body}>3 أقسام اختيار من متعدد: 22 سؤالًا لكل قسم، و20 دقيقة لكل قسم. بعدها 15 دقيقة لكتابة موضوع باللغة العبرية.</Text>
              <Text style={styles.body}>يمكنك التنقّل وتغيير إجاباتك داخل القسم الحالي فقط. التسليم أو انتهاء الوقت يغلق القسم نهائيًا؛ لا تُعرض الحلول حتى نهاية المحاولة.</Text>
              <Text style={styles.body}>الوقت يستمر في الخلفية وبعد إغلاق الصفحة، وننتقل وفق المواعيد الأصلية. الحفظ التلقائي محلي؛ استخدم «نسخ إلى الحساب» ثم «استعادة من الحساب» لنقل المحاولة بين أجهزتك.</Text>
            </View>
            <View style={styles.notice}>
              <Text style={styles.title}>YAEL ليس YAELNET</Text>
              <Text style={styles.body}>هذه المحاكاة لبنية ياعيل الورقي فقط. ياعيل نت (YAELNET) هو الامتحان المحوسب، وله تعليمات وإجراءات منفصلة؛ لا تعتمد على هذه المحاكاة لوصفه.</Text>
              <Pressable accessibilityRole="link" testID="exam-official-source" onPress={() => {
                void Linking.openURL(SOURCE).catch(() => setNotice('تعذّر فتح المصدر. يمكنك زيارة nite.org.il والبحث عن بنية امتحان YAEL.'));
              }}><Text style={styles.link}>المصدر: بنية YAEL على موقع المركز القطري ↗</Text></Pressable>
            </View>
            {button('ابدأ المحاكاة • يبدأ الوقت الآن', () => { setNotice(''); setNow(Date.now()); commit(newSession()); }, 'exam-start')}
          </> : activeExam ? <>
            {question ? <>
              <View style={styles.row}>
                <Text style={styles.caption}>{22 - unanswered} / 22 إجابة</Text>
                <Text style={styles.eyebrow}>السؤال {session.question + 1} • {question.type === 'completion' ? 'إكمال جمل' : question.type === 'restatement' ? 'إعادة صياغة' : 'فهم المقروء'}</Text>
              </View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((22 - unanswered) / 22) * 100}%` }]} /></View>
              {question.passage && <View style={styles.card}><Text style={styles.caption}>النص • اقرأ ثم أجب</Text><Text selectable style={styles.hebrew}>{question.passage}</Text></View>}
              <QuestionPrompt index={stage * 22 + session.question} hebrew text={question.prompt} />
              <View style={{ gap: 10 }}>{question.options.map((option, index) => {
                const selected = session.answers[stage][session.question] === index;
                return <Pressable key={`${question.id}-${index}`} testID={`exam-option-${index}`} accessibilityRole="radio"
                  accessibilityState={{ checked: selected }} accessibilityLabel={`${index + 1}. ${option}`}
                  onPress={() => edit(s => {
                    const answers = s.answers.map(row => [...row]);
                    answers[s.stage][s.question] = index;
                    return { ...s, answers };
                  })}
                  style={[styles.option, selected && { borderColor: c.primary, backgroundColor: c.secondary }]}>
                  <Text style={styles.optionText}>{option}</Text>
                  <View style={[styles.optionNumber, selected && { backgroundColor: c.primary }]}>
                    <Text style={[styles.numberText, selected && { color: c.primaryForeground }]}>{index + 1}</Text>
                  </View>
                </Pressable>;
              })}</View>
              <View style={styles.navigation}>
                <View style={{ flex: 1 }}>{button('السابق', () => edit(s => ({ ...s, question: s.question - 1 })), 'exam-previous', true, session.question === 0)}</View>
                <View style={{ flex: 1 }}>{button('التالي', () => edit(s => ({ ...s, question: s.question + 1 })), 'exam-next', true, session.question === 21)}</View>
              </View>
              <Text style={styles.title}>خريطة القسم الحالي</Text>
              <Text style={styles.caption}>الإطار = السؤال الحالي • التظليل = أُجيب عنه، وليس تصحيحًا</Text>
              <View style={styles.questionGrid}>{session.answers[stage].map((answer, index) =>
                <Pressable key={index} testID={`exam-question-${index + 1}`} accessibilityRole="button"
                  accessibilityLabel={`السؤال ${index + 1}، ${answer === null ? 'بلا إجابة' : 'أُجيب عنه'}`}
                  accessibilityState={{ selected: session.question === index }}
                  onPress={() => edit(s => ({ ...s, question: index }))}
                  style={[styles.questionChip, answer !== null && { backgroundColor: c.secondary }, session.question === index && { borderColor: c.primary, borderWidth: 2 }]}>
                  <Text style={styles.chipText}>{index + 1}</Text>
                </Pressable>)}</View>
              {button('تسليم القسم والانتقال', () => setConfirmation({ kind: 'submit', stage }), 'exam-submit-section')}
            </> : <>
              <Text style={styles.title}>اكتب موضوعًا باللغة العبرية</Text>
              <View style={styles.card}><Text selectable style={styles.hebrew}>{ESSAY_PROMPT}</Text></View>
              <Text style={styles.body}>نظّم أفكارك إلى مقدمة وعرض وخاتمة. تُحفظ المسوّدة مع المحاولة، ولا تُمنح علامة آلية أو علامة رسمية لها.</Text>
              <TextInput testID="exam-essay" accessibilityLabel="مسوّدة التعبير بالعبرية" multiline textAlignVertical="top"
                value={session.essay} onChangeText={essay => edit(s => ({ ...s, essay }))}
                placeholder="כתבו כאן את החיבור שלכם..." placeholderTextColor={c.mutedForeground}
                style={styles.essayInput} autoCorrect={false} />
              <Text style={styles.caption}>{session.essay.trim() ? session.essay.trim().split(/\s+/).length : 0} كلمة تقريبًا • مسوّدة محفوظة محليًا</Text>
              {button('تسليم التعبير وإنهاء المحاكاة', () => setConfirmation({ kind: 'submit', stage }), 'exam-submit-essay')}
            </>}
          </> : <>
            <Text style={styles.eyebrow}>اكتملت المحاكاة</Text>
            {completionCelebration && examFeedback === 'celebrate' && <PracticeCelebration variant={completionCelebration} />}
            <Text style={styles.hero}>{examFeedback === 'celebrate' ? `خطوة أوضح\nنحو استعدادك.` : examFeedback === 'empty' ? 'ابدأ بمحاولة فعلية بدل التسليم بدون إجابات' : examFeedback === 'review' ? 'جولة للمراجعة: راجع الأسئلة التي أخطأت فيها ثم حاول مجددًا' : 'تقدّم ثابت. راجع الأخطاء القليلة وواصل'}</Text>
            <View style={styles.card}>
              <Text style={styles.caption}>نتيجة الاختيار من متعدد في هذا التدريب</Text>
              <Text style={styles.score}>{correct} / 66</Text>
              <Text style={styles.title}>{Math.round(correct / 66 * 100)}٪ إجابات صحيحة</Text>
              <Text style={styles.body}>{66 - correct - skipped} إجابات غير صحيحة • {skipped} أسئلة بلا إجابة</Text>
              <Text style={styles.body}>هذه نسبة تدريبية لجميع الأقسام الثلاثة، وليست علامة YAEL رسمية ولا تقديرًا لها. في الامتحان الحقيقي يُحتسب قسمان من الاختيار من متعدد، ويقيّم مصحّحون التعبير الكتابي؛ لا نحاكي معادلة العلامة.</Text>
            </View>
            {scoreExamSections(EXAM_SECTIONS, session.answers).map((score, index) => (
              <View key={index} testID={`exam-section-score-${index + 1}`} style={styles.card}>
                <Text style={styles.title}>نتيجة القسم {index + 1}</Text>
                <Text style={[styles.title, { writingDirection: 'ltr' }]}>{score.correct} / {score.total} • {score.percent}%</Text>
                <Text style={styles.body}>{score.wrong} إجابات غير صحيحة • {score.skipped} أسئلة بلا إجابة</Text>
              </View>
            ))}
            <Text style={styles.title}>راجع الأخطاء والأسئلة المتروكة ({mistakes.length})</Text>
            {mistakes.length === 0 && <Text style={styles.body}>أجبت عن جميع أسئلة الاختيار من متعدد بصورة صحيحة في هذه المحاولة.</Text>}
            {mistakes.map(({ q, section, index, selected }) => <View key={q.id} style={styles.card}>
              <Text style={styles.eyebrow}>القسم {section + 1} • السؤال {index + 1} • {selected === null ? 'بلا إجابة' : 'إجابة غير صحيحة'}</Text>
              {q.passage && <Text selectable style={styles.hebrew}>{q.passage}</Text>}
              <Text selectable style={styles.hebrew}>{q.prompt}</Text>
              <Text style={styles.body}>إجابتك: {selected === null ? 'لم تجب' : q.options[selected]}</Text>
              <Text style={styles.answer}>الإجابة الصحيحة: {q.options[q.answer]}</Text>
              <Text style={styles.body}>{q.explanation}</Text>
            </View>)}
            <View style={styles.card}>
              <Text style={styles.title}>مسوّدة التعبير • مراجعة ذاتية</Text>
              <Text selectable style={styles.hebrew}>{ESSAY_PROMPT}</Text>
              <Text selectable style={session.essay ? styles.hebrew : styles.body}>{session.essay || 'لم تُكتب مسوّدة في هذه المحاولة.'}</Text>
              <Text style={styles.body}>لا توجد علامة للتعبير. راجع مسوّدتك بنفسك أو مع معلّم:</Text>
              <Text style={styles.body}>□ هل أجبت عن الموضوع وعبّرت عن موقف واضح؟{'\n'}□ هل دعمت الأفكار بتفسيرات وأمثلة؟{'\n'}□ هل رتّبت المقدمة والفقرات والخاتمة؟{'\n'}□ هل استخدمت روابط مناسبة ومفردات متنوعة؟{'\n'}□ هل راجعت القواعد والإملاء وعلامات الترقيم؟</Text>
            </View>
            {button('محاولة جديدة', () => setConfirmation({ kind: 'reset' }), 'exam-retake')}
            <Text style={styles.caption}>المحاولة الجديدة تمسح إجاباتك ومسوّدتك الحالية. لا تُضاف هذه المحاكاة إلى نقاط الدروس أو إحصاءات التدريب.</Text>
          </>}
        </>}
        {confirmation && <View style={styles.confirmation} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={styles.title}>{confirmation.kind === 'reset' ? 'حذف المحاولة والبدء من جديد؟' : 'هل تريد التسليم الآن؟'}</Text>
          <Text style={styles.body}>{confirmation.kind === 'reset'
            ? 'ستُحذف الإجابات ومسوّدة التعبير المحفوظة على هذا الجهاز. لا يمكن التراجع. ستعود إلى صفحة البداية.'
            : confirmation.stage < 3
              ? `تبقّى ${unanswered} سؤالًا بلا إجابة في هذا القسم. لن تتمكن من العودة بعد التسليم، وسيبدأ وقت المرحلة التالية فورًا.`
              : `${session?.essay.trim() ? 'ستُحفظ مسوّدتك كما هي.' : 'مسوّدتك فارغة.'} سيُنهي التسليم المحاكاة، دون منح علامة للتعبير.`}</Text>
          <Text style={styles.caption}>يستمر الوقت أثناء التأكيد.</Text>
          {button(confirmation.kind === 'reset' ? 'نعم، حذف المحاولة' : 'تأكيد التسليم', confirmAction, 'exam-confirm')}
          {button(confirmation.kind === 'reset' ? 'إلغاء الحذف' : 'متابعة المحاولة دون تسليم', () => setConfirmation(null), 'exam-cancel-confirm', true)}
        </View>}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    headerTitle: { fontFamily: BOLD, fontWeight: '700', fontSize: 18, color: c.foreground, textAlign: 'right' },
    content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, gap: 16 },
    eyebrow: { fontFamily: BOLD, fontWeight: '700', fontSize: 13, color: c.primary, textAlign: 'right', writingDirection: 'rtl' },
    hero: { fontFamily: BOLD, fontWeight: '700', fontSize: 34, lineHeight: 46, color: c.foreground, textAlign: 'right', writingDirection: 'rtl' },
    title: { fontFamily: BOLD, fontWeight: '700', fontSize: 19, lineHeight: 29, color: c.foreground, textAlign: 'right', writingDirection: 'rtl' },
    body: { fontFamily: FONT, fontSize: 15, lineHeight: 26, color: c.foreground, textAlign: 'right', writingDirection: 'rtl' },
    caption: { fontFamily: FONT, fontSize: 12, lineHeight: 21, color: c.mutedForeground, textAlign: 'right', writingDirection: 'rtl' },
    hebrew: { fontSize: 19, lineHeight: 33, color: c.foreground, textAlign: 'right', writingDirection: 'rtl' },
    card: { padding: 20, gap: 12, borderRadius: c.radius, backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
    notice: { padding: 16, gap: 10, borderRadius: c.radius, backgroundColor: c.secondary },
    error: { padding: 16, gap: 12, borderRadius: c.radius, backgroundColor: c.card, borderWidth: 1, borderColor: c.destructive },
    link: { fontFamily: BOLD, fontWeight: '700', fontSize: 14, lineHeight: 24, color: c.primary, textAlign: 'right', textDecorationLine: 'underline' },
    button: { minHeight: 50, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13, borderRadius: 16, borderBottomWidth: 5, borderColor: c.isDark ? c.background : c.text, backgroundColor: c.primary },
    secondaryButton: { backgroundColor: c.card, borderWidth: 2, borderBottomWidth: 5, borderColor: c.border },
    buttonText: { fontFamily: BOLD, fontWeight: '700', fontSize: 15, lineHeight: 24, textAlign: 'center', color: c.primaryForeground },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
    clock: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 9 },
    clockText: { fontFamily: BOLD, fontWeight: '700', fontSize: 20, color: c.primary, fontVariant: ['tabular-nums'], writingDirection: 'ltr' },
    progressTrack: { height: 14, borderRadius: 7, backgroundColor: c.border, overflow: 'hidden' },
    progressFill: { height: 14, borderRadius: 7, alignSelf: 'flex-end', backgroundColor: c.primary },
    option: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: c.radius, borderWidth: 2, borderBottomWidth: 5, borderColor: c.border, backgroundColor: c.card },
    optionText: { flex: 1, fontSize: 18, lineHeight: 29, textAlign: 'right', writingDirection: 'rtl', color: c.foreground },
    optionNumber: { minWidth: 30, minHeight: 30, flexShrink: 0, padding: 2, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: c.muted },
    numberText: { fontFamily: BOLD, fontWeight: '700', color: c.foreground, fontSize: 13 },
    navigation: { flexDirection: 'row-reverse', gap: 12 },
    questionGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    questionChip: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderBottomWidth: 4, borderColor: c.border, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
    chipText: { fontFamily: BOLD, fontWeight: '700', fontSize: 14, color: c.foreground },
    essayInput: { minHeight: 320, padding: 18, borderRadius: c.radius, borderWidth: 1, borderColor: c.input, backgroundColor: c.card, color: c.foreground, fontSize: 19, lineHeight: 32, textAlign: 'right', writingDirection: 'rtl' },
    score: { fontFamily: BOLD, fontWeight: '700', fontSize: 48, color: c.primary, textAlign: 'right', writingDirection: 'ltr' },
    answer: { fontFamily: BOLD, fontWeight: '700', fontSize: 16, lineHeight: 28, color: c.primary, textAlign: 'right', writingDirection: 'rtl' },
    confirmation: { gap: 14, padding: 20, borderRadius: c.radius, borderWidth: 2, borderColor: c.primary, backgroundColor: c.card },
  });
}
