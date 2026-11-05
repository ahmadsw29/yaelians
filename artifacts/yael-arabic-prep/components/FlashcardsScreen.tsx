import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SectionLearningNotes from '@/components/SectionLearningNotes';
import {
  AccessibilityInfo, ActivityIndicator, Animated, AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChunkyButton, ChunkyProgress, usePlay } from '@/components/Playful';
import { Creature } from '@/components/PetTeacher';
import { ARABIC_BOLD_FONT } from '@/constants/typography';
import { useHebrewSpeech } from '@/hooks/useHebrewSpeech';
import { usePlanAccess } from '@/lib/PlanAccess';
import { VOCABULARY_BANK } from '@/lib/vocabulary-bank';
import { selectFlashcards, type FlashcardMemory, type FlashcardRating } from '@/lib/flashcards';
import { loadFlashcardMemory, saveFlashcardRating } from '@/lib/flashcard-storage';
import { loadVocabularyReview } from '@/lib/vocabulary-deck';
import type { VocabularyReviewMemory } from '@/lib/vocabulary-review';
import { listenForReduceMotionChanges } from '@/lib/pet-teacher-motion';
import { formatVocabularyTime, vocabularySecondsLeft } from '@/lib/vocabulary-selection';

const BOLD = ARABIC_BOLD_FONT;
type Card = { word: string; meaning: string; sentence: string; transliteration: string };
const CARDS = new Map<string, Card>();
for (const q of VOCABULARY_BANK) {
  if (q.word && q.meaning && !CARDS.has(q.word)) {
    CARDS.set(q.word, { word: q.word, meaning: q.meaning, sentence: q.sentence ?? '', transliteration: q.transliteration ?? '' });
  }
}
const WORDS = [...CARDS.keys()];

import { trackDailyActivity } from '@/lib/daily-goals';

type Phase = 'intro' | 'starting' | 'claim-error' | 'limit' | 'session' | 'expired' | 'complete';
type Tally = Record<FlashcardRating, number>;
const RATINGS: { rating: FlashcardRating; label: string; tone: 'coral' | 'sun' | 'success'; icon: 'refresh' | 'time-outline' | 'checkmark' }[] = [
  { rating: 'forgot', label: 'نسيت', tone: 'coral', icon: 'refresh' },
  { rating: 'difficult', label: 'صعبة', tone: 'sun', icon: 'time-outline' },
  { rating: 'easy', label: 'سهلة', tone: 'success', icon: 'checkmark' },
];
const newKey = () => `flashcards-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export default function FlashcardsScreen({ userId }: { userId: string }) {
  const p = usePlay();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const top = Platform.OS === 'web' ? 67 : insets.top;
  const bottom = Platform.OS === 'web' ? 34 : insets.bottom;
  const { ready, plan, isPremium, startVocabularyRound } = usePlanAccess();

  const [memory, setMemory] = useState<FlashcardMemory | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyReviewMemory | undefined>();
  const [memoryError, setMemoryError] = useState(false);
  const [loadTick, setLoadTick] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [deck, setDeck] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<FlashcardRating | null>(null);
  const [tally, setTally] = useState<Tally>({ forgot: 0, difficult: 0, easy: 0 });
  const [deadline, setDeadline] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const claimKey = useRef<string | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    let alive = true;
    setMemory(null); setMemoryError(false);
    Promise.all([loadFlashcardMemory(userId), loadVocabularyReview(userId)])
      .then(([m, v]) => { if (alive) { setMemory(m); setVocabulary(v); } })
      .catch(() => { if (alive) setMemoryError(true); });
    return () => { alive = false; };
  }, [userId, loadTick]);

  const previewCount = useMemo(() => memory ? selectFlashcards(WORDS, userId, memory, Date.now(), 20, vocabulary).length : 0, [memory, vocabulary, userId]);

  const isExpired = useCallback(() => deadline !== null && Date.now() >= deadline, [deadline]);
  const checkExpiry = useCallback(() => {
    if (!deadline) return false;
    const left = vocabularySecondsLeft(deadline, Date.now());
    setSecondsLeft(left);
    if (Date.now() >= deadline) {
      setPhase(cur => cur === 'session' ? 'expired' : cur);
      return true;
    }
    return false;
  }, [deadline]);

  useEffect(() => {
    if (phase !== 'session' || !deadline) return;
    checkExpiry();
    const id = setInterval(checkExpiry, 1000);
    const sub = AppState.addEventListener('change', s => { if (s === 'active') checkExpiry(); });
    return () => { clearInterval(id); sub.remove(); };
  }, [phase, deadline, checkExpiry]);

  useEffect(() => {
    if (phase === 'expired') AccessibilityInfo.announceForAccessibility('انتهى وقت الجولة. تقييماتك المحفوظة باقية على هذا الجهاز.');
    if (phase === 'complete') AccessibilityInfo.announceForAccessibility('أنهيت جولة البطاقات.');
  }, [phase]);

  const start = useCallback(async () => {
    if (!memory || previewCount === 0) return;
    setPhase('starting');
    try {
      let nextDeadline: number | null = null;
      if (!isPremium) {
        if (!claimKey.current) claimKey.current = newKey();
        const response = await startVocabularyRound(claimKey.current);
        if (!response.allowed) { setPhase('limit'); return; }
        const timer = response.vocabularyRound;
        if (!timer) throw new Error('Missing timed round');
        nextDeadline = Date.now() + Math.max(0, Date.parse(timer.expiresAt) - Date.parse(timer.serverNow));
        if (!Number.isFinite(nextDeadline)) throw new Error('Invalid timer');
      }
      const [fresh, quiz] = await Promise.all([loadFlashcardMemory(userId), loadVocabularyReview(userId)]);
      const selected = selectFlashcards(WORDS, userId, fresh, Date.now(), 20, quiz).filter(w => CARDS.has(w));
      setDeck(selected); setIndex(0); setRevealed(false); setSaveError(null);
      setTally({ forgot: 0, difficult: 0, easy: 0 });
      setDeadline(nextDeadline);
      setSecondsLeft(nextDeadline ? vocabularySecondsLeft(nextDeadline, Date.now()) : null);
      if (nextDeadline !== null && Date.now() >= nextDeadline) { setPhase('expired'); return; }
      setPhase(selected.length ? 'session' : 'complete');
    } catch {
      setPhase('claim-error');
    }
  }, [memory, previewCount, isPremium, startVocabularyRound, userId]);

  const reveal = () => {
    if (isExpired()) { checkExpiry(); return; }
    setRevealed(true);
  };

  const rate = async (rating: FlashcardRating) => {
    if (savingRef.current || !revealed) return;
    if (isExpired()) { checkExpiry(); return; }
    const word = deck[index];
    savingRef.current = true; setSaving(true); setSaveError(null);
    try {
      const next = await saveFlashcardRating(userId, word, rating);
      trackDailyActivity(userId, 'words', word);
      setMemory(next);
      setTally(t => ({ ...t, [rating]: t[rating] + 1 }));
      if (index + 1 >= deck.length) setPhase('complete');
      else { setIndex(index + 1); setRevealed(false); }
    } catch {
      setSaveError(rating);
      AccessibilityInfo.announceForAccessibility('لم يُحفظ التقييم. البطاقة باقية، أعد المحاولة.');
    } finally {
      savingRef.current = false; setSaving(false);
    }
  };

  const premiumAgain = () => { claimKey.current = null; setPhase('intro'); setLoadTick(t => t + 1); };
  const goHome = () => router.canGoBack() ? router.back() : router.replace('/');

  const header = (
    <View style={[s.header, { paddingTop: top + 8 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={goHome} hitSlop={8}
        style={[s.iconBtn, { backgroundColor: p.card, borderColor: p.border }]}>
        <Ionicons name="chevron-forward" size={22} color={p.foreground} />
      </Pressable>
      <Text style={[s.headerTitle, { color: p.foreground }]} accessibilityRole="header">بطاقات الكلمات</Text>
      {phase === 'session' && secondsLeft !== null ? (
        <View style={[s.timer, { backgroundColor: secondsLeft <= 30 ? p.coral : p.sun }]} accessibilityLabel={`الوقت المتبقي ${formatVocabularyTime(secondsLeft)}`}>
          <Ionicons name="hourglass-outline" size={14} color={secondsLeft <= 30 ? p.onBrand : p.sunInk} />
          <Text style={[s.timerText, { color: secondsLeft <= 30 ? p.onBrand : p.sunInk }]}>{formatVocabularyTime(secondsLeft)}</Text>
        </View>
      ) : <View style={{ width: 44 }} />}
    </View>
  );

  const centered = (kind: 'lumi' | 'zizo' | 'nuna' | 'rami' | 'ghaima', title: string, body: string, actions: React.ReactNode, mood?: 'happy' | 'hype') => (
    <ScrollView contentContainerStyle={[s.center, { paddingBottom: bottom + 24 }]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Creature kind={kind} mood={mood} size={110} /></View>
      <Text style={[s.title, { color: p.foreground }]} accessibilityRole="header">{title}</Text>
      <Text style={[s.body, { color: p.mutedForeground }]}>{body}</Text>
      <View style={s.actions}>{actions}</View>
    </ScrollView>
  );

  let content: React.ReactNode;
  if (!ready || (!memory && !memoryError)) {
    content = (
      <View style={s.center} accessibilityLabel="جارٍ تجهيز البطاقات">
        <View style={[s.skelCard, { backgroundColor: p.muted, borderColor: p.border }]} />
        <View style={[s.skelLine, { backgroundColor: p.muted }]} />
        <View style={[s.skelLine, { width: '50%', backgroundColor: p.muted }]} />
      </View>
    );
  } else if (memoryError) {
    content = centered('zizo', 'تعذّر فتح مراجعاتك', 'لم نستطع قراءة تقييماتك المحفوظة على هذا الجهاز. لم نحذف شيئًا منها.',
      <ChunkyButton label="إعادة المحاولة" icon="refresh" onPress={() => setLoadTick(t => t + 1)} testID="flashcards-load-retry" />);
  } else if (!plan) {
    content = centered('nuna', 'اختر خطتك أولًا', 'البطاقات جزء من خطتك اليومية. اختر خطة لتبدأ.',
      <ChunkyButton label="اختيار الخطة" icon="arrow-back" onPress={() => router.push('/plans')} />);
  } else if (phase === 'limit') {
    content = centered('lumi', 'استخدمت جولة اليوم', 'جولة المفردات المجانية واحدة يوميًا، وتشمل البطاقات والاختبار. ارجع غدًا أو افتح الخطة الكاملة.',
      <>
        <ChunkyButton label="الخطة الكاملة" tone="sun" icon="star" onPress={() => router.push('/plans')} />
        <ChunkyButton label="الرئيسية" tone="ghost" onPress={goHome} />
      </>);
  } else if (phase === 'claim-error') {
    content = centered('zizo', 'لم تبدأ الجولة', 'تعذّر التحقق من رصيدك اليومي. تحقق من الاتصال وحاول مجددًا.',
      <>
        <ChunkyButton label="إعادة المحاولة" icon="refresh" onPress={() => void start()} testID="flashcards-start-retry" />
        <ChunkyButton label="الرئيسية" tone="ghost" onPress={goHome} />
      </>);
  } else if (phase === 'expired') {
    content = centered('rami', 'انتهى الوقت', `راجعت ${tally.forgot + tally.difficult + tally.easy} بطاقة، وكل تقييم أرسلته محفوظ على هذا الجهاز.`,
      <ChunkyButton label="الرئيسية" icon="home" onPress={goHome} testID="flashcards-expired-home" />);
  } else if (phase === 'complete') {
    const total = tally.forgot + tally.difficult + tally.easy;
    content = centered('ghaima', total ? 'أنهيت الجولة' : 'لا بطاقات الآن', total ? 'تقييماتك محفوظة على هذا الجهاز وستعود الكلمات في وقتها.' : 'لا توجد بطاقات مستحقة حاليًا.',
      <>
        {total > 0 && (
          <View style={s.tallyRow}>
            {RATINGS.map(r => (
              <View key={r.rating} style={[s.tally, { backgroundColor: p.card, borderColor: p.border }]} accessibilityLabel={`${r.label}: ${tally[r.rating]}`}>
                <Text style={[s.tallyNum, { color: p.foreground }]}>{tally[r.rating]}</Text>
                <Text style={[s.tallyLabel, { color: p.mutedForeground }]}>{r.label}</Text>
              </View>
            ))}
          </View>
        )}
        {isPremium && <ChunkyButton label="جولة جديدة" icon="refresh" onPress={premiumAgain} testID="flashcards-again" />}
        <ChunkyButton label="الرئيسية" tone={isPremium ? 'ghost' : 'brand'} icon={isPremium ? undefined : 'home'} onPress={goHome} />
      </>, 'happy');
  } else if (phase === 'session' && deck[index]) {
    const card = CARDS.get(deck[index])!;
    content = (
      <ScrollView contentContainerStyle={[s.session, { paddingBottom: bottom + 24 }]}>
        <View style={s.progressRow}>
          <Text style={[s.count, { color: p.mutedForeground }]}>{`${index + 1} / ${deck.length}`}</Text>
          <View style={{ flex: 1 }}><ChunkyProgress value={index / deck.length} /></View>
        </View>
        <FlashCard key={`${userId}:${card.word}`} card={card} revealed={revealed} onReveal={reveal} disabled={saving} />
        {revealed ? (
          <View style={s.rateWrap}>
            {saveError && (
              <View style={[s.alert, { backgroundColor: p.card, borderColor: p.coral }]} accessibilityLiveRegion="polite">
                <Text style={[s.alertText, { color: p.foreground }]}>لم يُحفظ التقييم. بطاقتك باقية هنا.</Text>
                <ChunkyButton label="أعد الحفظ" tone="coral" icon="refresh" disabled={saving} onPress={() => void rate(saveError)} testID="flashcards-save-retry" />
              </View>
            )}
            <Text style={[s.rateHint, { color: p.mutedForeground }]}>كيف كانت معك؟</Text>
            <View style={s.rateRow}>
              {RATINGS.map(r => (
                <ChunkyButton key={r.rating} label={r.label} tone={r.tone} icon={r.icon} disabled={saving}
                  onPress={() => void rate(r.rating)} testID={`flashcards-rate-${r.rating}`} style={s.rateBtn} />
              ))}
            </View>
            {saving && <ActivityIndicator color={p.brand} accessibilityLabel="جارٍ الحفظ" />}
          </View>
        ) : (
          <ChunkyButton label="اكشف المعنى" icon="eye-outline" onPress={reveal} testID="flashcards-reveal" />
        )}
      </ScrollView>
    );
  } else {
    content = (
      <ScrollView contentContainerStyle={[s.intro, { paddingBottom: bottom + 24 }]}>
        <View style={[s.introHero, { backgroundColor: p.card, borderColor: p.border }]}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.introArt}>
            <Creature kind="lumi" mood="happy" size={104} />
            <View style={[s.chip, { backgroundColor: p.sun }]}><Text style={[s.chipText, { color: p.sunInk }]}>כרטיסיות</Text></View>
          </View>
          <Text style={[s.title, { color: p.foreground }]} accessibilityRole="header">اقلب، تذكّر، قيّم</Text>
          <Text style={[s.body, { color: p.mutedForeground }]}>كلمة عبرية على الوجه، والمعنى بالعربية مع جملة مثال عند القلب.</Text>
          <View style={[s.stat, { backgroundColor: p.muted }]}>
            <Text style={[s.statNum, { color: p.foreground }]}>{previewCount}</Text>
            <Text style={[s.statLabel, { color: p.mutedForeground }]}>بطاقة جاهزة لهذه الجولة</Text>
          </View>
        </View>
        <View style={[s.note, { borderColor: p.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={p.mutedForeground} />
          <Text style={[s.noteText, { color: p.mutedForeground }]}>
            {isPremium
              ? 'جولات بلا حدود وبلا وقت. تقييماتك تُحفظ على هذا الجهاز فقط ولا تضيف نقاطًا.'
              : 'الضغط على ابدأ يستخدم جولة المفردات المجانية الوحيدة اليوم (5 دقائق)، وهي نفسها جولة الاختبار. التقييمات تُحفظ على هذا الجهاز فقط ولا تضيف نقاطًا.'}
          </Text>
        </View>
        {previewCount === 0 ? (
          <Text style={[s.body, { color: p.mutedForeground }]}>لا بطاقات مستحقة الآن. ارجع لاحقًا.</Text>
        ) : (
          <ChunkyButton label={phase === 'starting' ? 'جارٍ البدء…' : 'ابدأ الجولة'} icon="arrow-back" disabled={phase === 'starting'}
            onPress={() => void start()} testID="flashcards-start" />
        )}
        <SectionLearningNotes section="flashcards" />
      </ScrollView>
    );
  }

  return <View style={[s.root, { backgroundColor: p.background }]}>{header}{content}</View>;
}

function FlashCard({ card, revealed, onReveal, disabled }: { card: Card; revealed: boolean; onReveal: () => void; disabled: boolean }) {
  const p = usePlay();
  const speech = useHebrewSpeech(card.word);
  const turn = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const [face, setFace] = useState<'front' | 'back'>('front');
  const [reduceMotion, setReduceMotion] = useState(true);
  const [heights, setHeights] = useState({ front: 0, back: 0 });
  useEffect(() => listenForReduceMotionChanges(AccessibilityInfo, setReduceMotion), []);

  const turnTo = useCallback((target: 'front' | 'back') => {
    setFace(target);
    anim.current?.stop();
    const toValue = target === 'back' ? 1 : 0;
    if (reduceMotion) { turn.setValue(toValue); return; }
    anim.current = Animated.spring(turn, { toValue, friction: 8, tension: 46, useNativeDriver: Platform.OS !== 'web' });
    anim.current.start();
  }, [reduceMotion, turn]);

  useEffect(() => { if (revealed) turnTo('back'); }, [revealed]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { anim.current?.stop(); }, []);
  useEffect(() => {
    if (!reduceMotion) return;
    anim.current?.stop();
    anim.current = null;
    turn.setValue(face === 'back' ? 1 : 0);
  }, [reduceMotion, face, turn]);

  const onCardPress = () => {
    if (!revealed) { if (!disabled) onReveal(); return; }
    turnTo(face === 'back' ? 'front' : 'back');
  };
  const measure = (key: 'front' | 'back') => (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    setHeights(prev => prev[key] === h ? prev : { ...prev, [key]: h });
  };
  const height = Math.max(240, heights.front, revealed ? heights.back : 0) + 36;
  const playing = speech.status !== 'idle';
  const lift = turn.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.94, 1] });
  const faceStyle = (side: 'front' | 'back') => ({
    opacity: turn.interpolate(side === 'front'
      ? { inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] }
      : { inputRange: [0, 0.5, 0.51, 1], outputRange: [0, 0, 1, 1] }),
    transform: [
      { perspective: 1100 },
      { rotateY: turn.interpolate({ inputRange: [0, 1], outputRange: side === 'front' ? ['0deg', '180deg'] : ['-180deg', '0deg'] }) },
      { scale: lift },
    ],
  });
  const hidden = (side: 'front' | 'back') => face !== side
    ? { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const, pointerEvents: 'none' as const }
    : {};

  return (
    <View style={s.cardWrap}>
      <Pressable testID="flashcard-card" onPress={onCardPress} disabled={!revealed && disabled}
        accessibilityRole="button"
        accessibilityLabel={face === 'front'
          ? `الوجه الأمامي: ${card.word}`
          : `الوجه الخلفي: ${card.meaning}${card.sentence ? `. ${card.sentence}` : ''}`}
        accessibilityHint={revealed ? 'اضغط لقلب البطاقة' : 'اضغط لكشف المعنى'}
        accessibilityState={{ expanded: face === 'back', disabled: !revealed && disabled }}
        accessibilityValue={{ text: face === 'front' ? 'front' : 'back' }}
        style={{ height }}>
        <Animated.View testID="flashcard-face-front" {...hidden('front')}
          style={[s.face, { backgroundColor: p.card, borderColor: p.brand }, faceStyle('front')]}>
          <View onLayout={measure('front')} style={s.faceInner} accessible={false}>
            <Text style={[s.faceTag, { color: p.mutedForeground }]}>עברית</Text>
            <Text style={[s.hebrew, { color: p.foreground }]} lang="he">{card.word}</Text>
            {revealed && !!card.transliteration && <Text style={[s.translit, { color: p.mutedForeground }]}>{card.transliteration}</Text>}
            <View style={s.turnHint}>
              <Ionicons name="sync-outline" size={14} color={p.mutedForeground} />
              <Text style={[s.tapHint, { color: p.mutedForeground }]}>{revealed ? 'اضغط لتقلبها' : 'اضغط على البطاقة لتكشف المعنى'}</Text>
            </View>
          </View>
        </Animated.View>
        {revealed && (
          <Animated.View testID="flashcard-face-back" {...hidden('back')}
            style={[s.face, { backgroundColor: p.card, borderColor: p.sun }, faceStyle('back')]}>
            <View onLayout={measure('back')} style={s.faceInner} accessible={false}>
              <Text style={[s.faceTag, { color: p.mutedForeground }]}>المعنى</Text>
              <Text style={[s.meaning, { color: p.brand }]}>{card.meaning}</Text>
              {!!card.transliteration && <Text style={[s.translit, { color: p.mutedForeground }]}>{`${card.word} · ${card.transliteration}`}</Text>}
              {!!card.sentence && (
                <View style={[s.sentenceBox, { borderTopColor: p.border }]}>
                  <Text style={[s.sentence, { color: p.foreground }]} lang="he">{card.sentence}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}
      </Pressable>
      <Pressable testID="flashcard-speak" accessibilityRole="button" accessibilityLabel={playing ? 'إيقاف النطق' : 'استمع للنطق'} onPress={speech.toggle}
        style={[s.speak, { backgroundColor: p.muted, borderColor: p.border }]}>
        <Ionicons name={playing ? 'stop' : 'volume-high'} size={18} color={p.foreground} />
        <Text style={[s.speakText, { color: p.foreground }]}>{playing ? 'إيقاف' : 'استمع'}</Text>
      </Pressable>
      {!!speech.error && <Text style={[s.speechErr, { color: p.coral }]} accessibilityLiveRegion="polite">النطق العبري غير متاح على هذا الجهاز الآن.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: BOLD, fontWeight: '800', fontSize: 18, textAlign: 'right', writingDirection: 'rtl' },
  timer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 10, minHeight: 32, borderRadius: 12 },
  timerText: { fontWeight: '800', fontSize: 14, fontVariant: ['tabular-nums'] },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontFamily: BOLD, fontWeight: '800', fontSize: 24, lineHeight: 38, textAlign: 'center', writingDirection: 'rtl' },
  body: { fontSize: 15, lineHeight: 25, textAlign: 'center', writingDirection: 'rtl' },
  actions: { alignSelf: 'stretch', gap: 12, marginTop: 8 },
  skelCard: { width: '100%', height: 240, borderRadius: 28, borderWidth: 2 },
  skelLine: { width: '70%', height: 16, borderRadius: 8 },
  intro: { padding: 16, gap: 16 },
  introHero: { borderRadius: 28, borderWidth: 2, borderBottomWidth: 6, padding: 20, alignItems: 'center', gap: 8 },
  introArt: { alignItems: 'center' },
  chip: { marginTop: -10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 3, transform: [{ rotate: '-4deg' }] },
  chipText: { fontWeight: '800', fontSize: 14 },
  stat: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 8, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, marginTop: 6 },
  statNum: { fontWeight: '900', fontSize: 28 },
  statLabel: { fontSize: 14, writingDirection: 'rtl' },
  note: { flexDirection: 'row-reverse', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: 12 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl' },
  session: { padding: 16, gap: 16 },
  progressRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  count: { fontWeight: '800', fontSize: 13, fontVariant: ['tabular-nums'] },
  cardWrap: { gap: 12 },
  face: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28, borderWidth: 3, borderBottomWidth: 8, paddingHorizontal: 18, justifyContent: 'center', backfaceVisibility: 'hidden', overflow: 'hidden' },
  faceInner: { alignItems: 'center', gap: 8 },
  faceTag: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  turnHint: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 },
  sentenceBox: { alignSelf: 'stretch', borderTopWidth: 2, borderStyle: 'dashed', paddingTop: 12, marginTop: 4 },
  hebrew: { fontSize: 44, lineHeight: 60, fontWeight: '800', textAlign: 'center', writingDirection: 'rtl' },
  translit: { fontSize: 15, fontStyle: 'italic', textAlign: 'center' },
  tapHint: { fontSize: 13, textAlign: 'center', writingDirection: 'rtl' },
  speak: { alignSelf: 'center', minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  speakText: { fontFamily: BOLD, fontWeight: '800', fontSize: 13 },
  speechErr: { fontSize: 12, lineHeight: 20, textAlign: 'center', writingDirection: 'rtl' },
  meaning: { fontFamily: BOLD, fontWeight: '800', fontSize: 22, lineHeight: 36, textAlign: 'center', writingDirection: 'rtl' },
  sentence: { fontSize: 18, lineHeight: 30, textAlign: 'center', writingDirection: 'rtl' },
  rateWrap: { gap: 10 },
  rateHint: { fontSize: 13, textAlign: 'center', writingDirection: 'rtl' },
  rateRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  rateBtn: { flexGrow: 1, flexBasis: 96, paddingHorizontal: 8 },
  alert: { borderWidth: 2, borderRadius: 16, padding: 12, gap: 8 },
  alertText: { fontSize: 14, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl' },
  tallyRow: { flexDirection: 'row-reverse', gap: 8 },
  tally: { flex: 1, alignItems: 'center', borderWidth: 2, borderRadius: 16, paddingVertical: 10 },
  tallyNum: { fontWeight: '900', fontSize: 24 },
  tallyLabel: { fontSize: 12, fontFamily: BOLD, fontWeight: '800' },
});
