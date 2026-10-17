import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/expo';
import {
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
import { usePlanAccess } from '@/lib/PlanAccess';
import {
  PROGRESS_COUNT_MAX_WIDTH,
  PROGRESS_MASCOT_SIZE,
  PROGRESS_LINE_HEIGHT,
  PROGRESS_RANGE_INSET,
  PROGRESS_ROW_BOTTOM_SPACE,
  PROGRESS_ROW_GAP,
  PRACTICE_HORIZONTAL_PADDING,
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
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = makeStyles(c, insets.top);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [complete, setComplete] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<'words' | 'reading'>('words');
  const [trackProgress, setTrackProgress] = useState(trackThisRound);
  const [wordOrder, setWordOrder] = useState(() => WORD_BANK.map((_, i) => i));
  const wordQuestions = wordOrder.map(i => WORD_BANK[i]);
  const activeQuestions = mode === 'words' ? wordQuestions : READING_QUESTIONS;
  const progressPosition = getProgressMarkerPosition(index, activeQuestions.length);
  const question = mode === 'words'
    ? { ...wordQuestions[index % wordQuestions.length], passage: '' }
    : { ...READING_QUESTIONS[index % READING_QUESTIONS.length], word: '', transliteration: '', sentence: '' };
  const isCorrect = choice === question.correctAnswer;

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
    setChoice(selection.choice);
    setCorrect(selection.correct);
    setCelebrationKey(selection.celebrationKey);
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
    setSaveError(false);
  };

  if (complete) {
    return (
      <View style={styles.completionScreen}>
        <StudySyncStatus />
        {saveError && <Pressable onPress={next} accessibilityRole="button">
          <Text style={{ color: c.foreground }}>لم يُحفظ الدرس. اضغط لإعادة المحاولة قبل المغادرة.</Text>
        </Pressable>}
        <View style={styles.completionIcon}>
          <Ionicons name="trophy" size={38} color="#bd7637" />
        </View>
        <Text style={styles.completionEyebrow}>{trackProgress ? 'أحسنت! أنهيت جولتك المحفوظة اليوم' : 'تدريب إضافي بلا حفظ للتقدّم'}</Text>
        <Text style={styles.completionTitle}>خطوة جديدة نحو{"\n"}هدفك</Text>
        <Text style={styles.completionText}>أجبت عن {correct} من {mode === 'words' ? wordQuestions.length : READING_QUESTIONS.length} أسئلة بشكل صحيح</Text>
        {trackProgress && <View style={styles.xpBadge}><Ionicons name="star" size={17} color="#d38b35" /><Text style={styles.xpText}>+{correct * 10} نقطة خبرة</Text></View>}
        {saved ? (
          <>
          {mode === 'words' && <Pressable onPress={continuePractice} style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]} testID="continue-vocabulary">
            <Text style={styles.continueButtonText}>{isPremium ? 'واصل التدريب بجولة جديدة' : 'واصل التدريب دون حفظ جولة إضافية'}</Text>
            <Ionicons name="refresh" size={18} color={c.primary} />
          </Pressable>}
          <Pressable onPress={finish} style={({ pressed }) => [styles.finishButton, pressed && styles.pressed]} testID="finish-practice">
            <Text style={styles.finishButtonText}>العودة للرئيسية</Text>
            <Ionicons name="arrow-back" size={18} color={c.primaryForeground} />
          </Pressable>
          </>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <StudySyncStatus />
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/')} accessibilityRole="button" style={styles.backButton}>
          <Ionicons name="arrow-forward" size={21} color={c.foreground} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerLabel}>{mode === 'words' ? 'تدريب المفردات · ٢٠ كلمة' : 'فهم المقروء'}</Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressCount}>{index + 1} / {activeQuestions.length}</Text>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`التقدّم: السؤال ${index + 1} من ${activeQuestions.length}`}
          accessibilityValue={{ min: 1, max: activeQuestions.length, now: index + 1 }}
          style={styles.progressLine}
        >
          <View style={styles.progressRange}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressPosition.fillWidth }]} />
            </View>
            <View style={[styles.progressMascot, { left: progressPosition.mascotLeft }]}>
              <PetTeacherReaction mood="happy" size={PROGRESS_MASCOT_SIZE} jumpKey={celebrationKey} testID="progress-mascot" />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.modeSwitch}>
        {isPremium && <Pressable onPress={() => changeMode('reading')} style={[styles.modeButton, mode === 'reading' && styles.modeButtonActive]}>
          <Text style={[styles.modeText, mode === 'reading' && styles.modeTextActive]}>فهم المقروء</Text>
        </Pressable>}
        <Pressable onPress={() => changeMode('words')} style={[styles.modeButton, mode === 'words' && styles.modeButtonActive]}>
          <Text style={[styles.modeText, mode === 'words' && styles.modeTextActive]}>مفردات</Text>
        </Pressable>
      </View>

      {mode === 'words' ? (
        <View style={styles.wordCard}>
          <View style={styles.wordTop}>
            <View style={styles.wordTag}><Text style={styles.wordTagText}>كلمة جديدة</Text></View>
          </View>
          <Text style={styles.hebrew}>{question.word}</Text>
          <Text style={styles.transliteration}>{question.transliteration}</Text>
          <View style={styles.sentenceBox}>
            <Text style={styles.sentenceLabel}>مثال بالعبرية</Text>
            <Text style={styles.sentence} selectable>{question.sentence}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.readingCard}>
          <View style={styles.wordTag}><Text style={styles.wordTagText}>اقرأ القطعة على مهلك</Text></View>
          <Text style={styles.readingHebrew} selectable>{question.passage}</Text>
          <View style={styles.readingHint}>
            <Ionicons name="eye-outline" size={16} color="#729187" />
            <Text style={styles.readingHintText}>ابحث عن الفكرة الأساسية</Text>
          </View>
        </View>
      )}

      <Text style={styles.prompt}>{question.prompt}</Text>
      <View style={styles.options}>
        {question.options.map((option, optionIndex) => {
          const correctOption = option === question.correctAnswer;
          const selected = choice === option;
          const answerState = choice && correctOption ? 'correct' : selected ? 'wrong' : 'default';
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              testID={`answer-${optionIndex + 1}`}
              onPress={() => select(option)}
              style={({ pressed }) => [
                styles.option,
                answerState === 'correct' && styles.correctOption,
                answerState === 'wrong' && styles.wrongOption,
                pressed && !choice && styles.pressed,
              ]}
            >
              <Text style={[
                styles.optionText,
                answerState === 'correct' && styles.correctText,
                answerState === 'wrong' && styles.wrongText,
              ]}>{option}</Text>
              {answerState !== 'default' && <View style={styles.answerReaction}>
                {answerState === 'correct' && <Ionicons name="checkmark-circle" size={20} color="#28755f" />}
                {answerState === 'wrong' && <Ionicons name="close-circle" size={20} color="#bb584b" />}
                {selected && <PetTeacherReaction mood={answerState === 'correct' ? 'happy' : 'sad'} size={42} />}
              </View>}
              {answerState === 'default' && <View style={styles.optionDot}><Text style={styles.optionLetter}>{['أ', 'ب', 'ج', 'د'][optionIndex]}</Text></View>}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        testID="next-question"
        disabled={!choice || loading}
        onPress={next}
        style={({ pressed }) => [styles.nextButton, !choice && styles.nextDisabled, pressed && choice && styles.pressed]}
      >
        <Text style={styles.nextText}>{index === activeQuestions.length - 1 ? 'إنهاء التدريب' : 'السؤال التالي'}</Text>
        <Ionicons name="arrow-back" size={18} color={c.primaryForeground} />
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useColors>, topInset: number) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: PRACTICE_HORIZONTAL_PADDING, paddingTop: Platform.OS === 'web' ? Math.max(67, topInset) : 14, paddingBottom: Platform.OS === 'web' ? 118 : 32, maxWidth: 600, width: '100%', alignSelf: 'center' },
    header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 24 },
    backButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
    headerCopy: { flex: 1, alignItems: 'flex-end' },
    headerLabel: { color: c.foreground, fontFamily: BOLD, fontSize: 18 },
    progressRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: PROGRESS_ROW_GAP, marginBottom: PROGRESS_ROW_BOTTOM_SPACE },
    progressCount: { color: c.primary, fontSize: 12, fontFamily: BOLD, maxWidth: PROGRESS_COUNT_MAX_WIDTH },
    progressLine: { flex: 1, minWidth: PROGRESS_MASCOT_SIZE + PROGRESS_RANGE_INSET * 2, height: PROGRESS_LINE_HEIGHT, position: 'relative', justifyContent: 'center', overflow: 'visible' },
    progressRange: { position: 'absolute', left: PROGRESS_RANGE_INSET, right: PROGRESS_RANGE_INSET, top: 0, bottom: 0 },
    progressTrack: { position: 'absolute', left: 0, right: 0, bottom: 10, height: 7, borderRadius: 4, backgroundColor: '#e6e7db' },
    progressFill: { height: '100%', backgroundColor: '#e88c67', borderRadius: 4 },
    progressMascot: { position: 'absolute', top: 0, width: PROGRESS_MASCOT_SIZE, height: PROGRESS_MASCOT_SIZE, transform: [{ translateX: -PROGRESS_MASCOT_SIZE / 2 }] },
    modeSwitch: { flexDirection: 'row-reverse', backgroundColor: '#eeece4', borderRadius: 14, padding: 4, marginBottom: 14 },
    modeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 11 },
    modeButtonActive: { backgroundColor: c.card },
    modeText: { color: c.mutedForeground, fontFamily: FONT, fontSize: 12 },
    modeTextActive: { color: c.primary, fontFamily: BOLD },
    wordCard: { backgroundColor: '#e4eee7', borderRadius: 25, padding: 19, minHeight: 207, justifyContent: 'space-between', marginBottom: 22 },
    readingCard: { backgroundColor: '#e4eee7', borderRadius: 25, padding: 19, minHeight: 207, justifyContent: 'space-between', marginBottom: 22, alignItems: 'flex-end' },
    readingHebrew: { color: '#17332f', fontSize: 19, lineHeight: 31, fontFamily: BOLD, textAlign: 'right', writingDirection: 'rtl', marginVertical: 12 },
    readingHint: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,253,248,0.72)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
    readingHintText: { color: '#68867a', fontSize: 10, fontFamily: FONT },
    wordTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    wordTag: { backgroundColor: '#d1e4d9', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 9 },
    wordTagText: { color: '#407565', fontFamily: BOLD, fontSize: 11 },
    hebrew: { color: '#17332f', fontSize: 34, fontFamily: BOLD, textAlign: 'center', marginTop: 10 },
    transliteration: { color: '#68867a', fontFamily: FONT, textAlign: 'center', fontSize: 13, marginTop: 2 },
    sentenceBox: { backgroundColor: 'rgba(255,253,248,0.72)', borderRadius: 15, padding: 10, alignItems: 'flex-end', marginTop: 13 },
    sentenceLabel: { color: '#74817a', fontSize: 10, fontFamily: FONT, marginBottom: 3 },
    sentence: { color: '#244b43', fontFamily: BOLD, fontSize: 15, textAlign: 'right' },
    prompt: { color: c.foreground, fontFamily: BOLD, fontSize: 17, textAlign: 'right', marginBottom: 12 },
    options: { gap: 9 },
    option: { minHeight: 53, borderRadius: 17, paddingHorizontal: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
    optionText: { flex: 1, textAlign: 'right', color: c.foreground, fontSize: 14, fontFamily: BOLD },
    optionDot: { width: 25, height: 25, borderRadius: 9, backgroundColor: '#f0eee6', alignItems: 'center', justifyContent: 'center' },
    optionLetter: { color: c.mutedForeground, fontSize: 11, fontFamily: BOLD },
    correctOption: { borderColor: '#70a68d', backgroundColor: '#e8f3ea' },
    wrongOption: { borderColor: '#d9988d', backgroundColor: '#fff0eb' },
    correctText: { color: '#28755f' },
    wrongText: { color: '#ad5347' },
    answerReaction: { flexDirection: 'row', direction: 'ltr', alignItems: 'center', gap: 3 },
    nextButton: { minHeight: 53, borderRadius: 17, marginTop: 16, backgroundColor: c.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    nextDisabled: { opacity: 0.4 },
    nextText: { color: c.primaryForeground, fontFamily: BOLD, fontSize: 14 },
    pressed: { opacity: 0.83, transform: [{ scale: 0.99 }] },
    completionScreen: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingTop: Platform.OS === 'web' ? 67 : 0 },
    completionIcon: { width: 84, height: 84, borderRadius: 29, backgroundColor: '#fae9db', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    completionEyebrow: { color: c.primary, fontFamily: BOLD, fontSize: 14 },
    completionTitle: { color: c.foreground, fontFamily: BOLD, fontSize: 29, lineHeight: 39, textAlign: 'center', marginTop: 9 },
    completionText: { color: c.mutedForeground, fontFamily: FONT, fontSize: 14, marginTop: 12 },
    xpBadge: { marginTop: 19, backgroundColor: '#fff0d9', borderRadius: 15, paddingHorizontal: 15, paddingVertical: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
    xpText: { color: '#976428', fontFamily: BOLD, fontSize: 14 },
    finishButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: c.primary, paddingVertical: 15, paddingHorizontal: 24, borderRadius: 17, marginTop: 28, minWidth: 210 },
    finishButtonText: { color: c.primaryForeground, fontFamily: BOLD, fontSize: 14 },
    continueButton: { backgroundColor: c.card, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 22, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: c.primary },
    continueButtonText: { color: c.primary, fontFamily: BOLD, fontSize: 14 },
  });
}
