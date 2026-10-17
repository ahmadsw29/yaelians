import { useState } from 'react';
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
import { QUESTIONS, READING_QUESTIONS, recordLesson } from '@/lib/study';
import PetTeacher from '@/components/PetTeacher';

const FONT = Platform.OS === 'web' ? 'Inter_400Regular' : undefined;
const BOLD = Platform.OS === 'web' ? 'Inter_700Bold' : undefined;

export default function PracticeScreen() {
  const { user } = useUser();
  return <PracticeSession key={user?.id ?? 'guest'} userId={user?.id} />;
}

function PracticeSession({ userId }: { userId?: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = makeStyles(c, insets.top);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [complete, setComplete] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<'words' | 'reading'>('words');
  const question = mode === 'words'
    ? { ...QUESTIONS[index % QUESTIONS.length], passage: '' }
    : { ...READING_QUESTIONS[index % READING_QUESTIONS.length], word: '', transliteration: '', sentence: '' };
  const isCorrect = choice === question.correctAnswer;

  const changeMode = (nextMode: 'words' | 'reading') => {
    setMode(nextMode);
    setIndex(0);
    setChoice(null);
    setCorrect(0);
    setComplete(false);
    setSaved(false);
  };

  const select = (answer: string) => {
    if (choice) return;
    setChoice(answer);
    if (answer === question.correctAnswer) {
      setCorrect((value) => value + 1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const next = async () => {
    if (index === 4) {
      setComplete(true);
      await recordLesson(correct, 5, userId);
      setSaved(true);
      return;
    }
    setIndex((value) => value + 1);
    setChoice(null);
  };

  const finish = () => {
    router.push('/');
  };

  if (complete) {
    return (
      <View style={styles.completionScreen}>
        <View style={styles.completionIcon}>
          <Ionicons name="trophy" size={38} color="#bd7637" />
        </View>
        <Text style={styles.completionEyebrow}>أحسنتِ! خلصتِ تدريب اليوم</Text>
        <Text style={styles.completionTitle}>خطوة جديدة نحو{"\n"}هدفك</Text>
        <Text style={styles.completionText}>أجبتِ عن {correct} من ٥ أسئلة بشكل صحيح</Text>
        <View style={styles.xpBadge}><Ionicons name="star" size={17} color="#d38b35" /><Text style={styles.xpText}>+{correct * 10} نقطة خبرة</Text></View>
        {saved ? (
          <Pressable onPress={finish} style={({ pressed }) => [styles.finishButton, pressed && styles.pressed]} testID="finish-practice">
            <Text style={styles.finishButtonText}>العودة للرئيسية</Text>
            <Ionicons name="arrow-back" size={18} color={c.primaryForeground} />
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable testID="open-exam" accessibilityRole="button" onPress={() => router.push('/exam')} style={{ padding: 16, borderRadius: 18, backgroundColor: c.primary, marginBottom: 15 }}>
        <Text style={{ color: c.primaryForeground, fontWeight: '700', textAlign: 'right', fontSize: 16 }}>محاكاة YAEL كاملة</Text>
        <Text style={{ color: c.primaryForeground, textAlign: 'right', marginTop: 5 }}>٦٦ سؤالًا + كتابة · ٧٥ دقيقة</Text>
      </Pressable>
      <PetTeacher />
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/')} accessibilityRole="button" style={styles.backButton}>
          <Ionicons name="arrow-forward" size={21} color={c.foreground} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerLabel}>{mode === 'words' ? 'تدريب المفردات' : 'فهم المقروء'}</Text>
          <Text style={styles.headerSub}>خذي وقتك، أنتِ تتعلّمين</Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressCount}>{index + 1} / ٥</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((index + 1) / 5) * 100}%` }]} /></View>
      </View>

      <View style={styles.modeSwitch}>
        <Pressable onPress={() => changeMode('reading')} style={[styles.modeButton, mode === 'reading' && styles.modeButtonActive]}>
          <Text style={[styles.modeText, mode === 'reading' && styles.modeTextActive]}>فهم المقروء</Text>
        </Pressable>
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
          <View style={styles.wordTag}><Text style={styles.wordTagText}>اقرئي القطعة على مهلك</Text></View>
          <Text style={styles.readingHebrew} selectable>{question.passage}</Text>
          <View style={styles.readingHint}>
            <Ionicons name="eye-outline" size={16} color="#729187" />
            <Text style={styles.readingHintText}>ابحثي عن الفكرة الأساسية</Text>
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
              {answerState === 'correct' && <Ionicons name="checkmark-circle" size={20} color="#28755f" />}
              {answerState === 'wrong' && <Ionicons name="close-circle" size={20} color="#bb584b" />}
              {answerState === 'default' && <View style={styles.optionDot}><Text style={styles.optionLetter}>{['أ', 'ب', 'ج', 'د'][optionIndex]}</Text></View>}
            </Pressable>
          );
        })}
      </View>

      {choice ? (
        <View style={[styles.feedback, isCorrect ? styles.feedbackGood : styles.feedbackTry]}>
          <Ionicons name={isCorrect ? 'sparkles' : 'heart-outline'} size={19} color={isCorrect ? '#28755f' : '#b66a4f'} />
          <View style={styles.feedbackCopy}>
            <Text style={[styles.feedbackTitle, { color: isCorrect ? '#28755f' : '#a85e45' }]}>{isCorrect ? 'إجابة رائعة!' : 'ولا يهمّك، بتتعلّمي!'}</Text>
            {!isCorrect && <Text style={styles.feedbackSub}>المعنى الصحيح: {question.meaning}</Text>}
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        testID="next-question"
        disabled={!choice}
        onPress={next}
        style={({ pressed }) => [styles.nextButton, !choice && styles.nextDisabled, pressed && choice && styles.pressed]}
      >
        <Text style={styles.nextText}>{index === 4 ? 'إنهاء التدريب' : 'السؤال التالي'}</Text>
        <Ionicons name="arrow-back" size={18} color={c.primaryForeground} />
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useColors>, topInset: number) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 21, paddingTop: Platform.OS === 'web' ? Math.max(67, topInset) : 14, paddingBottom: Platform.OS === 'web' ? 118 : 32, maxWidth: 600, width: '100%', alignSelf: 'center' },
    header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 24 },
    backButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
    headerCopy: { flex: 1, alignItems: 'flex-end' },
    headerLabel: { color: c.foreground, fontFamily: BOLD, fontSize: 18 },
    headerSub: { color: c.mutedForeground, fontFamily: FONT, fontSize: 12, marginTop: 3 },
    progressRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 18 },
    progressCount: { color: c.primary, fontSize: 12, fontFamily: BOLD },
    progressTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: '#e6e7db', overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#e88c67', borderRadius: 4 },
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
    feedback: { minHeight: 54, borderRadius: 16, paddingHorizontal: 14, marginTop: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    feedbackGood: { backgroundColor: '#e7f1e7' },
    feedbackTry: { backgroundColor: '#fbebe2' },
    feedbackCopy: { flex: 1, alignItems: 'flex-end' },
    feedbackTitle: { fontFamily: BOLD, fontSize: 13 },
    feedbackSub: { color: '#8f6757', fontFamily: FONT, fontSize: 11, marginTop: 2 },
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
  });
}
