import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/expo';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import VocabularyStudyHub from '@/components/VocabularyStudyHub';
import TrainingHub from '@/components/TrainingHub';
import { trainingEntry } from '@/lib/training-entry';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { ARABIC_FONT, ARABIC_BOLD_FONT } from '@/constants/typography';
import { getPracticeScreenSpacing, usesExpandedQuestionLayout } from '@/lib/practice-layout';
import { useColors } from '@/hooks/useColors';
import { usePracticeCompletionAnnouncement } from '@/hooks/usePracticeCompletionAnnouncement';
import { useQuestionTransition } from '@/hooks/useQuestionTransition';
import { READING_QUESTIONS, type ReadingQuestion } from '@/lib/study';
import { VOCABULARY_BANK as WORD_BANK } from '@/lib/vocabulary-bank';
import { reserveVocabularyReviewRound, saveVocabularyReviewAnswer } from '@/lib/vocabulary-deck';
import { vocabularyHintExclusions } from '@/lib/vocabulary-hints';
import { trackDailyActivity } from '@/lib/daily-goals';
import { HintedVocabularyOption, VocabularyHintButton } from '@/components/VocabularyHint';
import { formatVocabularyTime, vocabularySecondsLeft } from '@/lib/vocabulary-selection';
import { useStudy } from '@/lib/StudyProvider';
import { StudySyncStatus } from '@/components/StudySyncStatus';
import { PracticeCelebrationPark } from '@/components/PracticeCelebrationPark';
import { ChunkyButton, ChunkyProgress, QuestionPrompt, usePlay } from '@/components/Playful';
import PracticeCelebration from '@/components/PracticeCelebration';
import { completionFeedback } from '@/lib/completion-feedback';
import { nextPracticeCelebration, type PracticeCelebrationVariant } from '@/lib/practice-celebrations';
import { usePlanAccess } from '@/lib/PlanAccess';
import {
  PRACTICE_HORIZONTAL_PADDING,
  getPracticeAnswerFeedback,
  getPracticeAnswerState,
  getPracticeCompletionAnnouncement,
  getProgressMarkerPosition,
  selectPracticeAnswer,
} from '@/lib/progress-marker';

const FONT = ARABIC_FONT;
const BOLD = ARABIC_BOLD_FONT;

export default function PracticeScreen() {
  const { user } = useUser();
  const router = useRouter();
  // Both classic and native tab navigators emit this event, including a selected-tab re-tap.
  type TabNavigation = ReturnType<typeof useNavigation> & {
    addListener(event: 'tabPress', callback: () => void): () => void;
  };
  const navigation = useNavigation<TabNavigation>();
  useEffect(() => navigation.addListener('tabPress', () => {
    router.setParams({ section: 'training' });
  }), [navigation, router]);
  return <TrainingEntry key={user?.id ?? 'signed-out'} userId={user?.id} />;
}

function TrainingEntry({ userId }: { userId?: string }) {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const words = section === 'vocabulary';
  const [visitedWords, setVisitedWords] = useState(words);
  useEffect(() => { if (words) setVisitedWords(true); }, [words]);
  return <View style={{ flex: 1 }}>
    {!words && <TrainingHub />}
    {(words || visitedWords) && <View style={{ flex: 1, display: words ? 'flex' : 'none' }}
      accessibilityElementsHidden={!words} importantForAccessibility={words ? 'auto' : 'no-hide-descendants'}>
      <VocabularyEntry userId={userId} visible={words} />
    </View>}
  </View>;
}

function VocabularyEntry({ userId, visible }: { userId?: string; visible: boolean }) {
  const { ready, plan, isPremium, startVocabularyRound } = usePlanAccess();
  const activityKey = useRef<string | null>(null);
  const [access, setAccess] = useState<'idle' | 'checking' | 'allowed' | 'limit' | 'blocked'>('idle');
  const [round, setRound] = useState<{ order: number[]; number: number; deadline: number | null } | null>(null);
  const [showHub, setShowHub] = useState(true);
  const [completed, setCompleted] = useState(false);
  const starting = useRef(false);
  const focused = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useFocusEffect(useCallback(() => {
    focused.current = visible;
    setShowHub(true);
    return () => { focused.current = false; };
  }, [visible]));

  async function begin() {
    if (!ready || !plan || !userId || starting.current) return;
    if (round && trainingEntry({ ...round, finished: completed }) === 'resume') {
      setShowHub(false); return;
    }
    starting.current = true;
    if (!activityKey.current || completed) activityKey.current = `vocabulary-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    setAccess('checking');
    try {
      const response = isPremium ? null : await startVocabularyRound(activityKey.current!);
      if (!alive.current) return;
      if (response && !response.allowed) { setAccess('limit'); return; }
      if (!isPremium && !response?.vocabularyRound) throw new Error('Missing timed round');
      const timer = response?.vocabularyRound;
      const deadline = timer ? Date.now() + Math.max(0, Date.parse(timer.expiresAt) - Date.parse(timer.serverNow)) : null;
      if (deadline !== null && deadline <= Date.now()) { setAccess('limit'); return; }
      const reservation = await reserveVocabularyReviewRound(userId, WORD_BANK.map(q => q.word!), timer?.number);
      if (alive.current) {
        setRound({ ...reservation, deadline }); setCompleted(false);
        setAccess('allowed'); setShowHub(!focused.current);
      }
    } catch { if (alive.current) setAccess('blocked'); }
    finally { starting.current = false; }
  }
  const resumable = !!round && trainingEntry({ ...round, finished: completed }) === 'resume';
  return <View style={{ flex: 1 }}>
    {showHub && (access === 'limit' && !isPremium ? <FreePracticePrompt /> :
      <VocabularyStudyHub isPremium={isPremium} ready={ready && !!plan && !!userId}
        starting={access === 'checking'} error={access === 'blocked' ? 'تعذّر تجهيز الجولة. حاول مجددًا؛ تقدّمك محفوظ.' : undefined}
        onStart={() => void begin()} onResume={resumable ? () => setShowHub(false) : undefined} />)}
    {round && <View style={{ flex: 1, display: showHub ? 'none' : 'flex' }}>
      <PracticeSession key={`${userId}:${round.number}`} userId={userId} isPremium={isPremium}
        initialOrder={round.order} initialRoundNumber={round.number} deadline={round.deadline}
        activityKey={activityKey.current} onCompletionChange={setCompleted} />
    </View>}
  </View>;
}

function FreePracticePrompt() {
  const c = useColors();
  const router = useRouter();
  return <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 15, backgroundColor: c.background }}>
    <View style={{ alignSelf: 'center', width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.secondary }}>
      <Ionicons name="sparkles" size={27} color={c.primary} />
    </View>
    <Text style={{ color: c.foreground, fontSize: 24, fontWeight: '700', textAlign: 'center' }}>استخدمت جولة المفردات اليوم</Text>
    <Text style={{ color: c.mutedForeground, fontSize: 15, lineHeight: 24, textAlign: 'center' }}>
      تجربة مجانية تشمل جولة واحدة لمدة 5 دقائق كل يوم. ارجع غدًا لجولة جديدة، أو استكشف الخطة الكاملة للتدرّب بلا حدود.
    </Text>
    <Pressable testID="vocabulary-return-home" accessibilityRole="button" onPress={() => router.replace('/')}
      style={({ pressed }) => ({ minHeight: 52, borderRadius: 16, backgroundColor: c.primary, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: pressed ? 0.82 : 1 })}>
      <Text style={{ color: c.primaryForeground, fontWeight: '700', fontSize: 15 }}>العودة للرئيسية</Text><Ionicons name="arrow-back" size={18} color={c.primaryForeground} />
    </Pressable>
    <Pressable testID="vocabulary-see-plans" accessibilityRole="button" onPress={() => router.push('/plans')}
      style={({ pressed }) => ({ minHeight: 48, borderRadius: 16, backgroundColor: c.card, borderColor: c.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.78 : 1 })}>
      <Text style={{ color: c.foreground, fontWeight: '600' }}>عرض الخطط</Text>
    </Pressable>
  </View>;
}

export function PracticeSession({ userId, isPremium, initialOrder, initialRoundNumber, deadline, activityKey, readingBank = READING_QUESTIONS, initialMode = 'words', hasDock = true, onCompletionChange }: { userId?: string; isPremium: boolean; initialOrder: number[]; initialRoundNumber: number; deadline: number | null; activityKey: string | null; readingBank?: ReadingQuestion[]; initialMode?: 'words' | 'reading'; hasDock?: boolean; onCompletionChange?: (complete: boolean) => void }) {
  const { save, loading } = useStudy();
  const saving = useRef(false);
  const [saveError, setSaveError] = useState(false);
  const p = usePlay();
  const c = p;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = makeStyles(p, insets.top);
  const { fontScale } = useWindowDimensions();
  const expanded = usesExpandedQuestionLayout(fontScale);
  const screenSpacing = getPracticeScreenSpacing(Platform.OS, insets.top, insets.bottom, isLiquidGlassAvailable(), hasDock);
  const [bodyHeight, setBodyHeight] = useState(0);
  const [parkHeight, setParkHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [hintExcluded, setHintExcluded] = useState<string[]>([]);
  const hintRef = useRef<string[]>([]);
  const readingAttempt = useRef(`reading-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const resetHint = () => { hintRef.current = []; setHintExcluded([]); };
  const [correct, setCorrect] = useState(0);
  const masteredWordIds = useRef<string[]>([]);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [complete, setComplete] = useState(false);
  const questionMotion = useQuestionTransition(!complete);
  useEffect(() => { onCompletionChange?.(complete); }, [complete, onCompletionChange]);
  const [saved, setSaved] = useState(false);
  const [completionCelebration, setCompletionCelebration] = useState<PracticeCelebrationVariant | null>(null);
  // The route owns the section; vocabulary and reading are separate sessions.
  const mode = initialMode;
  const trackProgress = true;
  const [wordOrder, setWordOrder] = useState(initialOrder);
  const [reviewRound, setReviewRound] = useState(initialRoundNumber);
  const [reviewError, setReviewError] = useState(false);
  const [answerSaving, setAnswerSaving] = useState(false);
  const selecting = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(() => deadline ? vocabularySecondsLeft(deadline, Date.now()) : null);
  const [completedTotal, setCompletedTotal] = useState<number | null>(null);
  const finalTotal = useRef<number | null>(null);
  const expire = useRef<() => void>(() => {});
  useEffect(() => {
    if (!deadline || complete) return;
    const tick = () => {
      const remaining = vocabularySecondsLeft(deadline, Date.now());
      setSecondsLeft(remaining);
      if (!remaining) expire.current();
    };
    const timer = setInterval(tick, 250);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') tick(); });
    tick();
    return () => { clearInterval(timer); listener.remove(); };
  }, [deadline, complete]);
  const wordQuestions = wordOrder.map(i => WORD_BANK[i]);
  const activeQuestions = mode === 'words' ? wordQuestions : readingBank;
  const progressPosition = getProgressMarkerPosition(index, activeQuestions.length);
  const question = mode === 'words'
    ? { ...wordQuestions[index % wordQuestions.length], passage: '' }
    : { ...readingBank[index % readingBank.length], word: '', transliteration: '', sentence: '' };
  const answerFeedback = getPracticeAnswerFeedback(choice, question.correctAnswer);
  const isCorrect = answerFeedback?.isCorrect ?? false;
  const completionAnnouncement = getPracticeCompletionAnnouncement(
    correct, completedTotal ?? activeQuestions.length, secondsLeft === 0,
  );
  usePracticeCompletionAnnouncement(complete, completionAnnouncement);

  const revealHint = () => {
    if (mode !== 'words' || choice || complete || selecting.current || hintRef.current.length) return;
    if (deadline && Date.now() >= deadline) { expire.current(); return; }
    const excluded = vocabularyHintExclusions(question.options, question.correctAnswer, `${userId}:${reviewRound}:${index}:${question.word}`);
    if (!excluded.length) return;
    hintRef.current = excluded;
    setHintExcluded(excluded);
    AccessibilityInfo.announceForAccessibility('استبعدنا خيارين غير صحيحين. اختر من الخيارين المتبقيين. الإجابة بمساعدة لا تُحتسب إتقانًا للكلمة.');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const select = async (answer: string) => {
    if (questionMotion.busy) return;
    if (complete || selecting.current) return;
    if (mode === 'words' && hintRef.current.includes(answer)) return;
    if (deadline && Date.now() >= deadline) { expire.current(); return; }
    const selection = selectPracticeAnswer({ choice, correct, celebrationKey }, answer, question.correctAnswer);
    if (!selection) return;
    if (mode === 'words') {
      selecting.current = true;
      setAnswerSaving(true);
      setReviewError(false);
      try {
        if (!userId || !question.word) throw new Error('Missing vocabulary identity');
        await saveVocabularyReviewAnswer(userId, question.word, reviewRound, answer === question.correctAnswer, hintRef.current.length > 0);
      } catch {
        setReviewError(true);
        return;
      } finally {
        selecting.current = false;
        setAnswerSaving(false);
      }
    }
    const feedback = getPracticeAnswerFeedback(selection.choice, question.correctAnswer);
    if (mode === 'reading') trackDailyActivity(userId, 'reading', `${readingAttempt.current}:${index}`);
    setChoice(selection.choice);
    setCorrect(selection.correct);
    setCelebrationKey(selection.celebrationKey);
    if (Platform.OS === 'ios' && feedback) {
      AccessibilityInfo.announceForAccessibility(feedback.announcement);
    }
    if (answer === question.correctAnswer) {
      if (mode === 'words' && question.word && !hintRef.current.length) masteredWordIds.current.push(question.word.trim().normalize('NFC'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const finishRound = async (total: number) => {
      if (saving.current || saved) return;
      saving.current = true;
      finalTotal.current ??= total;
      setCompletedTotal(finalTotal.current);
      if (!complete) setCompletionCelebration(nextPracticeCelebration());
      setComplete(true);
      if (finalTotal.current === 0) {
        setSaved(true);
        saving.current = false;
        return;
      }
      setSaveError(false);
      try {
        await save(correct, finalTotal.current, activityKey ?? undefined, masteredWordIds.current);
        setSaved(true);
      } catch {
        setSaveError(true);
      } finally {
        saving.current = false;
      }
  };
  expire.current = () => { if (!selecting.current) void finishRound(index + (choice ? 1 : 0)); };
  const next = async () => {
    if (complete) { await finishRound(finalTotal.current ?? activeQuestions.length); return; }
    if (deadline && Date.now() >= deadline) { expire.current(); return; }
    if (index === activeQuestions.length - 1) { await finishRound(activeQuestions.length); return; }
    if (!choice || loading || answerSaving || selecting.current) return;
    questionMotion.advance(() => {
      if (deadline && Date.now() >= deadline) { expire.current(); return; }
      setIndex((value) => value + 1);
      setChoice(null);
      resetHint();
    });
  };

  const finish = () => {
    router.push('/');
  };

  const continuePractice = async () => {
    if (!isPremium || !userId || saving.current) return;
    saving.current = true;
    let reservation: { order: number[]; number: number };
    try { reservation = await reserveVocabularyReviewRound(userId, WORD_BANK.map(q => q.word!)); }
    catch { setSaveError(true); return; }
    finally { saving.current = false; }
    setWordOrder(reservation.order);
    setReviewRound(reservation.number);
    setReviewError(false);
    setIndex(0);
    setChoice(null);
    resetHint();
    setCorrect(0);
    masteredWordIds.current = [];
    setCelebrationKey(0);
    setComplete(false);
    setSaved(false);
    setCompletionCelebration(null);
    setSaveError(false);
    setCompletedTotal(null);
    finalTotal.current = null;
  };

  if (complete) {
    const feedback = completionFeedback(correct, completedTotal ?? 0, activeQuestions.length);
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={[styles.completionScreen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + (hasDock ? 112 : 24) }]}>
        {Platform.OS === 'web' && <Text accessibilityLiveRegion="polite" style={styles.accessibilityAnnouncement}>
          {completionAnnouncement}
        </Text>}
        <StudySyncStatus />
        {saveError && <Pressable onPress={next} accessibilityRole="button" style={styles.saveError}>
          <Text style={{ color: p.coralInk, fontWeight: '700', textAlign: 'center' }}>لم يُحفظ الدرس. اضغط لإعادة المحاولة قبل المغادرة.</Text>
        </Pressable>}
        {completionCelebration && feedback === 'celebrate' && <PracticeCelebration variant={completionCelebration} />}
        <Text style={styles.completionEyebrow}>{secondsLeft === 0 ? 'انتهت الدقائق الخمس لجولتك اليومية' : feedback === 'celebrate' ? 'أحسنت! أنهيت جولتك' : 'انتهت الجولة'}</Text>
        <Text style={styles.completionTitle}>{feedback === 'celebrate' ? 'خطوة جديدة نحو\nهدفك' : feedback === 'empty' ? 'ابدأ بمحاولة فعلية بدل التسليم بدون إجابات' : feedback === 'review' ? 'جولة للمراجعة: راجع الأسئلة التي أخطأت فيها ثم حاول مجددًا' : 'تقدّم ثابت. راجع الأخطاء القليلة وواصل'}</Text>
        <View style={styles.resultRow}>
          <View style={[styles.resultTile, { borderColor: p.success, backgroundColor: p.successSoft }]}>
            <Text style={[styles.resultValue, { color: p.successInk }]}>{correct} / {completedTotal ?? activeQuestions.length}</Text>
            <Text style={[styles.resultLabel, { color: p.successInk }]}>إجابات صحيحة</Text>
          </View>
          {trackProgress && <View style={[styles.resultTile, { borderColor: p.sun, backgroundColor: p.sunSoft }]}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}><Ionicons name="star" size={18} color={p.sunShade} /><Text style={[styles.resultValue, { color: p.sunInk }]}>+{correct * 10}</Text></View>
            <Text style={[styles.resultLabel, { color: p.sunInk }]}>نقطة خبرة</Text>
          </View>}
        </View>
        {saved ? (
          <View style={{ width: '100%', maxWidth: 420, gap: 12, marginTop: 24 }}>
            <ChunkyButton tone="ghost" icon="arrow-back" onPress={finish} testID="finish-practice" label="العودة للرئيسية" />
            {mode === 'words' && isPremium && <ChunkyButton tone="success" icon="refresh" onPress={() => void continuePractice()} testID="continue-vocabulary"
              label="واصل التدريب بجولة جديدة" />}
            {!isPremium && <Text style={{ color: c.mutedForeground, textAlign: 'center' }}>{mode === 'words' ? 'جولتك القادمة غدًا. تجربة مجانية تشمل جولة واحدة لخمس دقائق يوميًا.' : 'التجربة المجانية تشمل قسمًا موقوتًا واحدًا كل يوم، مشتركًا مع تدريب إعادة الصياغة.'}</Text>}
          </View>
        ) : null}
      </ScrollView>
    );
  }

  const answered = choice !== null;
  const footer = (
    <View testID="practice-session-footer" style={[styles.footer, answered && { backgroundColor: isCorrect ? p.successSoft : p.coralSoft, borderTopColor: isCorrect ? p.success : p.coral }, { paddingBottom: 8 }]}>
      {reviewError && <Text accessibilityLiveRegion="polite" style={{ color: p.coralInk, textAlign: 'center' }}>تعذّر حفظ الإجابة. اضغط اختيارك مرة أخرى للمحاولة؛ لم نغيّر محفوظاتك السابقة.</Text>}
      {answerFeedback && <Text accessibilityLiveRegion="polite" importantForAccessibility="yes"
        style={styles.accessibilityAnnouncement}>{answerFeedback.announcement}</Text>}
      <View style={mode === 'words' ? styles.compactFooterRow : undefined}>
        <ChunkyButton testID="next-question" disabled={!choice || loading || answerSaving || questionMotion.busy}
          onPress={next} tone={!answered || isCorrect ? 'success' : 'coral'} icon="arrow-back"
          label={index === activeQuestions.length - 1 ? 'إنهاء التدريب' : 'السؤال التالي'}
          style={mode === 'words' ? { flex: 1 } : undefined} />
      </View>
    </View>
  );
  return (
    <View style={[styles.screen, screenSpacing]}>
    <View testID="practice-top-bar" style={styles.topBar}>
      <StudySyncStatus />
      <View style={styles.header}>
        <Pressable testID="practice-close" onPress={() => router.push('/')} accessibilityRole="button" accessibilityLabel="العودة للرئيسية" hitSlop={6} style={styles.backButton}>
          <Ionicons name="close" size={24} color={c.foreground} />
        </Pressable>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`التقدّم: السؤال ${index + 1} من ${activeQuestions.length}`}
          accessibilityValue={{ min: 1, max: activeQuestions.length, now: index + 1 }}
          style={{ flex: 1 }}
        >
          <ChunkyProgress value={progressPosition.percent / 100} />
        </View>
        <Text testID="practice-progress-count" style={styles.progressCount}>{index + 1}/{activeQuestions.length}</Text>
        {secondsLeft !== null && <Text testID="vocabulary-countdown" accessibilityLabel={`الوقت المتبقي: ${Math.floor(secondsLeft / 60)} دقيقة و${secondsLeft % 60} ثانية`} style={[styles.progressCount, { minWidth: 44 }]}>{formatVocabularyTime(secondsLeft)}</Text>}
      </View>

      <View testID="practice-category" style={styles.categoryBar}>
        <View style={styles.categoryBadge}>
          <Ionicons name={mode === 'reading' ? 'book' : 'chatbubbles'} size={15} color={p.skyInk} />
          <Text accessibilityRole="header" style={styles.categoryText}>{mode === 'reading' ? 'فهم المقروء' : 'مفردات'}</Text>
        </View>
      </View>

    </View>
    <ScrollView testID="practice-question-body" key={`${mode}-${index}`} style={{ flex: 1 }} contentContainerStyle={[styles.content, { flexGrow: 1 }]} showsVerticalScrollIndicator={false}
      scrollEnabled={mode !== 'words' || contentHeight > bodyHeight + 1}
      onLayout={event => setBodyHeight(event.nativeEvent.layout.height)}
      onContentSizeChange={(_, height) => setContentHeight(height)}
      bounces={mode !== 'words'}
      contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false}>

      {mode !== 'words' && <Text style={styles.lessonKicker}>اقرأ القطعة على مهلك</Text>}

      <Animated.View testID="question-transition" style={questionMotion.promptStyle}>
      {mode === 'words' ? (
        <QuestionPrompt key={`word-${index}`} index={index} text={question.prompt} spokenWord={question.word} compact>
          <View style={[styles.wordStage, expanded && { paddingLeft: 0 }]}>
            <Text style={styles.hebrew}>{question.word}</Text>
            {!!question.transliteration && <Text style={styles.transliteration}>{question.transliteration}</Text>}
          </View>
          <View style={styles.sentenceBox}>
            <Text style={styles.sentenceLabel}>مثال بالعبرية</Text>
            <Text style={styles.sentence} selectable>{question.sentence}</Text>
          </View>
        </QuestionPrompt>
      ) : (
        <>
          <View style={styles.readingCard}>
            <View style={styles.readingHint}>
              <Ionicons name="eye-outline" size={15} color={p.skyInk} />
              <Text style={styles.readingHintText}>ابحث عن الفكرة الأساسية</Text>
            </View>
            <Text style={styles.readingHebrew} selectable>{question.passage}</Text>
          </View>
          <QuestionPrompt index={index} text={question.prompt} />
        </>
      )}
      </Animated.View>

      {mode === 'words' && <View testID="vocabulary-hint-area" style={{ alignItems: 'flex-end', marginBottom: 6 }}>
        <VocabularyHintButton key={`hint-${reviewRound}-${index}`} used={hintExcluded.length > 0}
          disabled={answered || answerSaving || loading || questionMotion.busy || secondsLeft === 0
            || vocabularyHintExclusions(question.options, question.correctAnswer, question.word ?? '').length === 0}
          onPress={revealHint} />
      </View>}
      <View style={styles.options}>
        {question.options.map((option, optionIndex) => {
          const selected = choice === option;
          const answerState = getPracticeAnswerState(choice, option, question.correctAnswer);
          const eliminated = mode === 'words' && hintExcluded.includes(option);
          const disabled = answered || answerSaving || eliminated || questionMotion.busy;
          return (
            <Animated.View key={`${reviewRound}-${index}-${option}`} testID={`answer-transition-${optionIndex + 1}`}
              style={questionMotion.answerStyle(optionIndex)}>
            <HintedVocabularyOption eliminated={eliminated}
              highlighted={mode === 'words' && hintExcluded.length > 0 && !eliminated && !answered}>
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={eliminated ? `${option}، مستبعد بالتلميح` : option}
              accessibilityState={{ selected, disabled }}
              testID={`answer-${optionIndex + 1}`}
              disabled={disabled}
              onPress={() => void select(option)}
              style={({ pressed }) => [
                styles.option,
                answerState === 'correct' && { borderColor: p.success, backgroundColor: p.successSoft },
                answerState === 'wrong' && { borderColor: p.coral, backgroundColor: p.coralSoft },
                answered && answerState === 'default' && { opacity: 0.6 },
                pressed && !choice && styles.pressedOption,
              ]}
            >
              <View style={[styles.optionDot, answerState === 'correct' && { backgroundColor: p.success, borderColor: p.successShade }, answerState === 'wrong' && { backgroundColor: p.coral, borderColor: p.coralShade }]}>
                {answerState === 'correct' ? <Ionicons name="checkmark" size={16} color={p.onBrand} />
                  : answerState === 'wrong' ? <Ionicons name="close" size={16} color={p.onBrand} />
                  : <Text style={styles.optionLetter}>{['أ', 'ب', 'ج', 'د'][optionIndex]}</Text>}
              </View>
              <Text style={[
                styles.optionText,
                answerState === 'correct' && { color: p.successInk },
                answerState === 'wrong' && { color: p.coralInk },
              ]}>{option}</Text>
            </Pressable>
            </HintedVocabularyOption>
            </Animated.View>
          );
        })}
      </View>
      {mode === 'reading' && answered && !!question.meaning && <View style={[styles.readingCard, { marginTop: 12 }]}>
        <Text style={{ color: p.skyInk, fontFamily: BOLD, fontWeight: '700', writingDirection: 'rtl', textAlign: 'right', lineHeight: 25 }}>{question.meaning}</Text>
      </View>}
      {mode === 'words' && !expanded && <View testID="practice-celebration-space"
        onLayout={event => setParkHeight(event.nativeEvent.layout.height)}
        style={{ flex: 1, minHeight: 0, justifyContent: 'center', overflow: 'hidden' }}>
        {answered && parkHeight >= 100 && <PracticeCelebrationPark correct={isCorrect} animationKey={index + 1} />}
      </View>}
      {expanded && footer}
    </ScrollView>
    {!expanded && footer}
    </View>
  );
}

function makeStyles(p: ReturnType<typeof usePlay>, topInset: number) {
  const c = p;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    topBar: { paddingHorizontal: PRACTICE_HORIZONTAL_PADDING, paddingTop: Platform.OS === 'web' ? Math.max(67, topInset) : 4, maxWidth: 600, width: '100%', alignSelf: 'center', backgroundColor: c.background, zIndex: 1 },
    content: { paddingHorizontal: PRACTICE_HORIZONTAL_PADDING, paddingTop: 2, paddingBottom: 8, maxWidth: 600, width: '100%', alignSelf: 'center' },
    header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 },
    backButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
    progressCount: { color: c.foreground, fontSize: 15, lineHeight: 22, fontFamily: BOLD, fontWeight: '800', fontVariant: ['tabular-nums'], writingDirection: 'ltr', minWidth: 40, textAlign: 'center' },
    categoryBar: { backgroundColor: c.muted, borderRadius: 16, padding: 3, marginBottom: 8, minHeight: 44, justifyContent: 'center' },
    categoryBadge: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 5, borderRadius: 12, backgroundColor: p.skySoft, borderWidth: 2, borderColor: p.sky, borderBottomWidth: 4 },
    categoryText: { flexShrink: 1, minWidth: 0, textAlign: 'right', writingDirection: 'rtl', color: p.skyInk, fontFamily: BOLD, fontWeight: '800', fontSize: 13, lineHeight: 22 },
    lessonKicker: { color: p.coralShade, fontFamily: BOLD, fontWeight: '800', fontSize: 13, textAlign: 'right', marginBottom: 10, letterSpacing: 0.3 },
    wordStage: { alignItems: 'center', backgroundColor: p.brandSoft, borderRadius: 14, paddingVertical: 4, paddingLeft: 44 },
    hebrew: { color: c.foreground, fontSize: 28, lineHeight: 36, fontFamily: BOLD, fontWeight: '800', textAlign: 'center', writingDirection: 'rtl' },
    transliteration: { color: c.mutedForeground, fontFamily: FONT, textAlign: 'center', fontSize: 13, marginTop: 2 },
    sentenceBox: { backgroundColor: c.muted, borderRadius: 12, padding: 6, alignItems: 'flex-end' },
    sentenceLabel: { color: c.mutedForeground, fontSize: 10, lineHeight: 12, fontFamily: FONT, marginBottom: 1 },
    sentence: { color: c.foreground, fontFamily: BOLD, fontWeight: '700', fontSize: 14, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
    readingCard: { backgroundColor: c.card, borderRadius: 20, borderWidth: 2, borderBottomWidth: 4, borderColor: c.border, padding: 16, marginBottom: 14, alignItems: 'flex-end', gap: 8 },
    readingHebrew: { color: c.foreground, fontSize: 19, lineHeight: 32, fontFamily: BOLD, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
    readingHint: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: p.skySoft, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
    readingHintText: { flexShrink: 1, minWidth: 0, textAlign: 'right', writingDirection: 'rtl', color: p.skyInk, fontSize: 11, fontFamily: BOLD, fontWeight: '700' },
    options: { gap: 6 },
    option: { minHeight: 48, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.card, borderWidth: 2, borderBottomWidth: 4, borderColor: c.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    pressedOption: { transform: [{ translateY: 3 }], borderBottomWidth: 2, borderColor: p.sky, backgroundColor: p.skySoft },
    optionText: { flex: 1, textAlign: 'right', color: c.foreground, fontSize: 16, lineHeight: 24, includeFontPadding: true, fontFamily: BOLD, fontWeight: '800', writingDirection: 'rtl' },
    optionDot: { minWidth: 30, minHeight: 30, flexShrink: 0, padding: 2, borderRadius: 10, borderWidth: 2, borderColor: c.border, backgroundColor: c.muted, alignItems: 'center', justifyContent: 'center' },
    optionLetter: { color: c.mutedForeground, fontSize: 12, fontFamily: BOLD, fontWeight: '800' },
    footer: { borderTopWidth: 2, borderTopColor: c.border, backgroundColor: c.background, paddingHorizontal: PRACTICE_HORIZONTAL_PADDING, paddingTop: 8, gap: 6, width: '100%', alignSelf: 'center' },
    compactFooterRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, maxWidth: 600, width: '100%', alignSelf: 'center' },
    feedbackRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, maxWidth: 600, width: '100%', alignSelf: 'center' },
    accessibilityAnnouncement: { position: 'absolute', left: -10000, width: 1, height: 1, overflow: 'hidden' },
    feedbackBody: { fontSize: 14, fontWeight: '600', textAlign: 'right', marginTop: 2, writingDirection: 'rtl' },
    completionScreen: { flexGrow: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    saveError: { backgroundColor: p.coralSoft, borderColor: p.coral, borderWidth: 2, borderRadius: 14, padding: 12, marginBottom: 8 },
    completionEyebrow: { color: p.brandShade, fontFamily: BOLD, fontWeight: '800', fontSize: 14, marginTop: 8 },
    completionTitle: { color: c.foreground, fontFamily: BOLD, fontWeight: '800', fontSize: 29, lineHeight: 39, textAlign: 'center', marginTop: 9 },
    resultRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 18, width: '100%', maxWidth: 420 },
    resultTile: { flex: 1, borderWidth: 2, borderBottomWidth: 5, borderRadius: 18, paddingVertical: 14, alignItems: 'center', gap: 4 },
    resultValue: { fontSize: 22, fontWeight: '800' },
    resultLabel: { fontSize: 12, fontWeight: '700' },
  });
}
