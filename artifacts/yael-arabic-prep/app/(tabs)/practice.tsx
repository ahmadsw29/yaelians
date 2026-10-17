import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/expo';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { QUESTIONS, YAEL_VOCABULARY_QUESTIONS, READING_QUESTIONS } from '@/lib/study';
import { useStudy } from '@/lib/StudyProvider';
import { StudySyncStatus } from '@/components/StudySyncStatus';
import { PetTeacherReaction } from '@/components/PetTeacher';
import { ChunkyButton, ChunkyProgress, QuestionPrompt, usePlay } from '@/components/Playful';
import PracticeCelebration from '@/components/PracticeCelebration';
import { nextPracticeCelebration, type PracticeCelebrationVariant } from '@/lib/practice-celebrations';
import { usePlanAccess } from '@/lib/PlanAccess';
import {
  PRACTICE_HORIZONTAL_PADDING,
  getPracticeAnswerFeedback,
  getPracticeAnswerState,
  getPracticeModeReset,
  getProgressMarkerPosition,
  selectPracticeAnswer,
} from '@/lib/progress-marker';

const FONT = Platform.OS === 'web' ? 'Inter_400Regular' : undefined;
const BOLD = Platform.OS === 'web' ? 'Inter_700Bold' : undefined;
const WORD_BANK = [...QUESTIONS, ...YAEL_VOCABULARY_QUESTIONS];

export default function PracticeScreen() {
  const { user } = useUser();
  const { ready, plan, isPremium, claimActivity } = usePlanAccess();
  const router = useRouter();
  const activityKey = useRef<string | null>(null);
  if (!activityKey.current) activityKey.current = `vocabulary-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const [access, setAccess] = useState<'checking' | 'allowed' | 'continue' | 'untracked' | 'blocked'>('checking');

  useEffect(() => {
    let active = true;
    if (!ready || !plan) return;
    if (isPremium) { setAccess('allowed'); return; }
    void claimActivity('vocabulary', activityKey.current!).then(allowed => {
      if (!active) return;
      if (allowed) setAccess('allowed');
      else setAccess('continue');
    }).catch(() => { if (active) setAccess('blocked'); });
    return () => { active = false; };
  }, [activityKey, claimActivity, isPremium, plan, ready, router]);

  if (!ready || !plan || access === 'checking' || access === 'blocked') return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>{access === 'blocked' ? 'تعذّر التحقق من خطتك. أعد المحاولة.' : 'جارٍ تجهيز التدريب…'}</Text></View>;
  if (access === 'continue' && !isPremium) return <FreePracticePrompt onContinue={() => setAccess('untracked')} />;
  return <PracticeSession key={`${user?.id ?? 'guest'}:${access}`} userId={user?.id} isPremium={isPremium} trackThisRound={access === 'allowed'} activityKey={activityKey.current} />;
}

function FreePracticePrompt({ onContinue }: { onContinue: () => void }) {
  const c = useColors();
  const router = useRouter();
  return <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 15, backgroundColor: c.background }}>
    <View style={{ alignSelf: 'center', width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.secondary }}>
      <Ionicons name="sparkles" size={27} color={c.primary} />
    </View>
    <Text style={{ color: c.foreground, fontSize: 24, fontWeight: '700', textAlign: 'center' }}>أنهيت جولتك المحفوظة اليوم</Text>
    <Text style={{ color: c.mutedForeground, fontSize: 15, lineHeight: 24, textAlign: 'center' }}>
      تقدر تواصل التدريب مجانًا. الجولات الإضافية لن تُضاف إلى تقدّمك اليومي.
    </Text>
    <Pressable testID="continue-free-practice" accessibilityRole="button" onPress={onContinue}
      style={({ pressed }) => ({ minHeight: 52, borderRadius: 16, backgroundColor: c.primary, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: pressed ? 0.82 : 1 })}>
      <Text style={{ color: c.primaryForeground, fontWeight: '700', fontSize: 15 }}>واصل التدريب</Text><Ionicons name="arrow-back" size={18} color={c.primaryForeground} />
    </Pressable>
    <Pressable testID="vocabulary-see-plans" accessibilityRole="button" onPress={() => router.push('/plans')}
      style={({ pressed }) => ({ minHeight: 48, borderRadius: 16, backgroundColor: c.card, borderColor: c.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.78 : 1 })}>
      <Text style={{ color: c.foreground, fontWeight: '600' }}>عرض الخطط</Text>
    </Pressable>
  </View>;
}

function PracticeSession({ userId, isPremium, trackThisRound, activityKey }: { userId?: string; isPremium: boolean; trackThisRound: boolean; activityKey: string | null }) {
  const { save, loading } = useStudy();
  const saving = useRef(false);
  const [saveError, setSaveError] = useState(false);
  const p = usePlay();
  const c = p;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = makeStyles(p, insets.top);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [complete, setComplete] = useState(false);
  const [saved, setSaved] = useState(false);
  const [completionCelebration, setCompletionCelebration] = useState<PracticeCelebrationVariant | null>(null);
  const [mode, setMode] = useState<'words' | 'reading'>('words');
  const [trackProgress, setTrackProgress] = useState(trackThisRound);
  const [wordOrder, setWordOrder] = useState(() => WORD_BANK.map((_, i) => i));
  const wordQuestions = wordOrder.map(i => WORD_BANK[i]);
  const activeQuestions = mode === 'words' ? wordQuestions : READING_QUESTIONS;
  const progressPosition = getProgressMarkerPosition(index, activeQuestions.length);
  const question = mode === 'words'
    ? { ...wordQuestions[index % wordQuestions.length], passage: '' }
    : { ...READING_QUESTIONS[index % READING_QUESTIONS.length], word: '', transliteration: '', sentence: '' };
  const answerFeedback = getPracticeAnswerFeedback(choice, question.correctAnswer);
  const isCorrect = answerFeedback?.isCorrect ?? false;

  const changeMode = (nextMode: 'words' | 'reading') => {
    const reset = getPracticeModeReset(nextMode);
    setMode(reset.mode);
    setIndex(reset.index);
    setChoice(reset.choice);
    setCorrect(reset.correct);
    setCelebrationKey(reset.celebrationKey);
    setComplete(reset.complete);
    setSaved(reset.saved);
  };

  const select = (answer: string) => {
    const selection = selectPracticeAnswer({ choice, correct, celebrationKey }, answer, question.correctAnswer);
    if (!selection) return;
    const feedback = getPracticeAnswerFeedback(selection.choice, question.correctAnswer);
    setChoice(selection.choice);
    setCorrect(selection.correct);
    setCelebrationKey(selection.celebrationKey);
    if (Platform.OS === 'ios' && feedback) {
      AccessibilityInfo.announceForAccessibility(feedback.announcement);
    }
    if (answer === question.correctAnswer) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const next = async () => {
    if (index === activeQuestions.length - 1) {
      if (saving.current || saved) return;
      saving.current = true;
      if (!complete) setCompletionCelebration(nextPracticeCelebration());
      setComplete(true);
      if (!trackProgress) {
        setSaved(true);
        saving.current = false;
        return;
      }
      setSaveError(false);
      try {
        await save(correct, activeQuestions.length, activityKey ?? undefined);
        setSaved(true);
      } catch {
        setSaveError(true);
      } finally {
        saving.current = false;
      }
      return;
    }
    setIndex((value) => value + 1);
    setChoice(null);
  };

  const finish = () => {
    router.push('/');
  };

  const continuePractice = () => {
    if (!isPremium) setTrackProgress(false);
    const nextOrder = WORD_BANK.map((_, i) => i);
    for (let i = nextOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nextOrder[i], nextOrder[j]] = [nextOrder[j], nextOrder[i]];
    }
    setWordOrder(nextOrder);
    setIndex(0);
    setChoice(null);
    setCorrect(0);
    setCelebrationKey(0);
    setComplete(false);
    setSaved(false);
    setCompletionCelebration(null);
    setSaveError(false);
  };

  if (complete) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={[styles.completionScreen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 112 }]}>
        <StudySyncStatus />
        {saveError && <Pressable onPress={next} accessibilityRole="button" style={styles.saveError}>
          <Text style={{ color: p.coralInk, fontWeight: '700', textAlign: 'center' }}>لم يُحفظ الدرس. اضغط لإعادة المحاولة قبل المغادرة.</Text>
        </Pressable>}
        {completionCelebration && <PracticeCelebration variant={completionCelebration} />}
        <Text style={styles.completionEyebrow}>{trackProgress ? 'أحسنت! أنهيت جولتك المحفوظة اليوم' : 'تدريب إضافي بلا حفظ للتقدّم'}</Text>
        <Text style={styles.completionTitle}>خطوة جديدة نحو{"\n"}هدفك</Text>
        <View style={styles.resultRow}>
          <View style={[styles.resultTile, { borderColor: p.success, backgroundColor: p.successSoft }]}>
            <Text style={[styles.resultValue, { color: p.successInk }]}>{correct} / {mode === 'words' ? wordQuestions.length : READING_QUESTIONS.length}</Text>
            <Text style={[styles.resultLabel, { color: p.successInk }]}>إجابات صحيحة</Text>
          </View>
          {trackProgress && <View style={[styles.resultTile, { borderColor: p.sun, backgroundColor: p.sunSoft }]}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}><Ionicons name="star" size={18} color={p.sunShade} /><Text style={[styles.resultValue, { color: p.sunInk }]}>+{correct * 10}</Text></View>
            <Text style={[styles.resultLabel, { color: p.sunInk }]}>نقطة خبرة</Text>
          </View>}
        </View>
        {saved ? (
          <View style={{ width: '100%', maxWidth: 420, gap: 12, marginTop: 24 }}>
            {mode === 'words' && <ChunkyButton tone="ghost" icon="refresh" onPress={continuePractice} testID="continue-vocabulary"
              label={isPremium ? 'واصل التدريب بجولة جديدة' : 'واصل التدريب دون حفظ جولة إضافية'} />}
            <ChunkyButton icon="arrow-back" onPress={finish} testID="finish-practice" label="العودة للرئيسية" />
          </View>
        ) : null}
      </ScrollView>
    );
  }

  const answered = choice !== null;
  return (
    <View style={styles.screen}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <StudySyncStatus />
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/')} accessibilityRole="button" accessibilityLabel="العودة للرئيسية" hitSlop={10} style={styles.backButton}>
          <Ionicons name="close" size={26} color={c.mutedForeground} />
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
        <Text style={styles.progressCount}>{index + 1}/{activeQuestions.length}</Text>
      </View>

      <View style={styles.modeSwitch}>
        {isPremium && <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'reading' }} onPress={() => changeMode('reading')} style={[styles.modeButton, mode === 'reading' && styles.modeButtonActive]}>
          <Ionicons name="book" size={15} color={mode === 'reading' ? p.skyInk : c.mutedForeground} />
          <Text style={[styles.modeText, mode === 'reading' && { color: p.skyInk }]}>فهم المقروء</Text>
        </Pressable>}
        <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'words' }} onPress={() => changeMode('words')} style={[styles.modeButton, mode === 'words' && styles.modeButtonActive]}>
          <Ionicons name="chatbubbles" size={15} color={mode === 'words' ? p.skyInk : c.mutedForeground} />
          <Text style={[styles.modeText, mode === 'words' && { color: p.skyInk }]}>مفردات</Text>
        </Pressable>
      </View>

      <Text style={styles.lessonKicker}>{mode === 'words' ? 'كلمة جديدة' : 'اقرأ القطعة على مهلك'}</Text>

      {mode === 'words' ? (
        <QuestionPrompt index={index} text={question.prompt}>
          <View style={styles.wordStage}>
            <Text style={styles.hebrew}>{question.word}</Text>
            <Text style={styles.transliteration}>{question.transliteration}</Text>
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

      <View style={styles.options}>
        {question.options.map((option, optionIndex) => {
          const selected = choice === option;
          const answerState = getPracticeAnswerState(choice, option, question.correctAnswer);
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              testID={`answer-${optionIndex + 1}`}
              onPress={() => select(option)}
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
          );
        })}
      </View>
    </ScrollView>

      <View style={[styles.footer, answered && { backgroundColor: isCorrect ? p.successSoft : p.coralSoft, borderTopColor: isCorrect ? p.success : p.coral }, { paddingBottom: Platform.OS === 'web' ? 100 : Math.max(insets.bottom, 14) }]}>
        {answerFeedback && <Text
          accessibilityLiveRegion="polite"
          importantForAccessibility="yes"
          style={styles.accessibilityAnnouncement}
        >{answerFeedback.announcement}</Text>}
        {answered && <View style={styles.feedbackRow}>
          <PetTeacherReaction mood={isCorrect ? 'happy' : 'sad'} size={62} jumpKey={celebrationKey} />
          <Ionicons name={isCorrect ? 'checkmark-circle' : 'close-circle'} size={28}
            color={isCorrect ? p.successInk : p.coralInk} accessibilityLabel={isCorrect ? 'إجابة صحيحة' : 'إجابة غير صحيحة'} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {!isCorrect && <Text style={[styles.feedbackBody, { color: p.coralInk }]}>الإجابة الصحيحة: {question.correctAnswer}</Text>}
          </View>
        </View>}
        <ChunkyButton
          testID="next-question"
          disabled={!choice || loading}
          onPress={next}
          tone={!answered || isCorrect ? 'success' : 'coral'}
          icon="arrow-back"
          label={index === activeQuestions.length - 1 ? 'إنهاء التدريب' : 'السؤال التالي'}
        />
      </View>
    </View>
  );
}

function makeStyles(p: ReturnType<typeof usePlay>, topInset: number) {
  const c = p;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: PRACTICE_HORIZONTAL_PADDING, paddingTop: Platform.OS === 'web' ? Math.max(67, topInset) : 14, paddingBottom: 24, maxWidth: 600, width: '100%', alignSelf: 'center' },
    header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 18 },
    backButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    progressCount: { color: p.successInk, fontSize: 13, fontFamily: BOLD, fontWeight: '800', minWidth: 40, textAlign: 'center' },
    modeSwitch: { flexDirection: 'row-reverse', backgroundColor: c.muted, borderRadius: 16, padding: 4, marginBottom: 16, gap: 4 },
    modeButton: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 12 },
    modeButtonActive: { backgroundColor: p.skySoft, borderWidth: 2, borderColor: p.sky, borderBottomWidth: 4 },
    modeText: { color: c.mutedForeground, fontFamily: BOLD, fontWeight: '700', fontSize: 13 },
    lessonKicker: { color: p.coralShade, fontFamily: BOLD, fontWeight: '800', fontSize: 13, textAlign: 'right', marginBottom: 10, letterSpacing: 0.3 },
    wordStage: { alignItems: 'center', backgroundColor: p.brandSoft, borderRadius: 14, paddingVertical: 10 },
    hebrew: { color: c.foreground, fontSize: 34, fontFamily: BOLD, fontWeight: '800', textAlign: 'center', writingDirection: 'rtl' },
    transliteration: { color: c.mutedForeground, fontFamily: FONT, textAlign: 'center', fontSize: 13, marginTop: 2 },
    sentenceBox: { backgroundColor: c.muted, borderRadius: 12, padding: 10, alignItems: 'flex-end' },
    sentenceLabel: { color: c.mutedForeground, fontSize: 10, fontFamily: FONT, marginBottom: 3 },
    sentence: { color: c.foreground, fontFamily: BOLD, fontSize: 16, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl' },
    readingCard: { backgroundColor: c.card, borderRadius: 20, borderWidth: 2, borderBottomWidth: 4, borderColor: c.border, padding: 16, marginBottom: 14, alignItems: 'flex-end', gap: 8 },
    readingHebrew: { color: c.foreground, fontSize: 19, lineHeight: 32, fontFamily: BOLD, textAlign: 'right', writingDirection: 'rtl' },
    readingHint: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: p.skySoft, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
    readingHintText: { color: p.skyInk, fontSize: 11, fontFamily: BOLD, fontWeight: '700' },
    options: { gap: 10 },
    option: { minHeight: 58, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.card, borderWidth: 2, borderBottomWidth: 5, borderColor: c.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    pressedOption: { transform: [{ translateY: 3 }], borderBottomWidth: 2, borderColor: p.sky, backgroundColor: p.skySoft },
    optionText: { flex: 1, textAlign: 'right', color: c.foreground, fontSize: 16, fontFamily: BOLD, fontWeight: '700', writingDirection: 'rtl' },
    optionDot: { width: 30, height: 30, borderRadius: 10, borderWidth: 2, borderColor: c.border, backgroundColor: c.muted, alignItems: 'center', justifyContent: 'center' },
    optionLetter: { color: c.mutedForeground, fontSize: 12, fontFamily: BOLD, fontWeight: '800' },
    footer: { borderTopWidth: 2, borderTopColor: c.border, backgroundColor: c.background, paddingHorizontal: PRACTICE_HORIZONTAL_PADDING, paddingTop: 12, gap: 10, width: '100%', alignSelf: 'center' },
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
