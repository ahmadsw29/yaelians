import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { trackDailyActivity } from '@/lib/daily-goals';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Creature } from '@/components/PetTeacher';
import { ChunkyButton, presenterFor, usePlay } from '@/components/Playful';
import PracticeCelebration from '@/components/PracticeCelebration';
import { nextPracticeCelebration } from '@/lib/practice-celebrations';
import { useHebrewSpeech } from '@/hooks/useHebrewSpeech';
import { usePlanAccess } from '@/lib/PlanAccess';
import { IMPORTED_EXAMS, type ImportedQuestion } from '@/lib/solved-exams';
import {
  adaptiveRoundDuration, advanceAdaptiveQuestion, emptyAdaptiveMemory, finishAdaptiveRound, planAdaptiveRound, recordAdaptiveAnswer,
  type AdaptiveMemory, type AdaptiveRound,
} from '@/lib/adaptive-restatement';
import { loadAdaptiveMemory, resetAdaptiveMemory, saveAdaptiveMemory } from '@/lib/adaptive-restatement-storage';
import { completionFeedback } from '@/lib/completion-feedback';
import { useStudy } from '@/lib/StudyProvider';
import { ARABIC_BOLD_FONT } from '@/constants/typography';

const FONT = Platform.OS === 'web' ? 'Inter_400Regular' : undefined;
const BOLD = ARABIC_BOLD_FONT;
type P = ReturnType<typeof usePlay>;
type Phase = 'loading' | 'corrupt' | 'unavailable' | 'intro' | 'claiming' | 'claimError' | 'round' | 'results';
type Reason = AdaptiveRound['reasons'][string];

const REASON: Record<Reason, { label: string; tip: string; icon: keyof typeof Ionicons.glyphMap }> = {
  new: { label: 'سؤال جديد', tip: 'اقرأ الجملة كاملة أولًا، ثم ابحث عن الخيار الذي يقول المعنى نفسه بكلمات أخرى.', icon: 'sparkles-outline' },
  retry: { label: 'محاولة ثانية', tip: 'أخطأت فيه سابقًا. انتبه للنفي والزمن والفاعل، فهي ما يتغيّر عادة بين الخيارات.', icon: 'refresh' },
  review: { label: 'مراجعة متباعدة', tip: 'أجبت عنه صحيحًا من قبل. تأكّد أن المعنى محفوظ تمامًا، لا مجرد كلمات متشابهة.', icon: 'time-outline' },
};

function makeRoundId() { return `restate-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }

export default function AdaptiveRestatementScreen() {
  const p = usePlay();
  const s = makeStyles(p);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const userId = user?.id;
  const { ready, plan, isPremium, claimActivity } = usePlanAccess();
  const { stats } = useStudy();
  const xp = stats.xp ?? 0;
  const [legacyNotice, setLegacyNotice] = useState(false);

  const bank = useMemo(() => {
    const all = Array.isArray(IMPORTED_EXAMS) ? IMPORTED_EXAMS : [];
    const exams = isPremium ? all : all.filter(e => e.id === 'b17');
    const map = new Map<string, ImportedQuestion>();
    for (const e of exams) for (const sec of e.sections) for (const q of sec) {
      if (q.type === 'restatement' && q.answer !== null) map.set(q.id, q);
    }
    return map;
  }, [isPremium]);
  const pool = useMemo(() => [...bank.keys()].map(id => ({ id })), [bank]);

  const [phase, setPhase] = useState<Phase>('loading');
  const [memory, setMemory] = useState<AdaptiveMemory | null>(null);
  const [result, setResult] = useState<AdaptiveRound | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const pending = useRef<AdaptiveMemory | null>(null);
  const lastCommitted = useRef<AdaptiveMemory | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  /** Persist first; only commit to UI after a successful save. */
  const commit = useCallback(async (next: AdaptiveMemory) => {
    if (!userId) return false;
    pending.current = next;
    setBusy(true);
    try {
      await saveAdaptiveMemory(userId, next);
      const round = next.active;
      if (round) {
        const oldAnswers = lastCommitted.current?.active?.id === round.id ? lastCommitted.current.active.answers : {};
        for (const id of Object.keys(round.answers)) {
          if (!Object.hasOwn(oldAnswers, id)) trackDailyActivity(userId, 'restatement', `${round.id}:${id}`);
        }
      }
      lastCommitted.current = next;
      if (!alive.current) return false;
      pending.current = null;
      setSaveError(false);
      setMemory(next);
      return true;
    } catch {
      if (alive.current) setSaveError(true);
      return false;
    } finally {
      if (alive.current) setBusy(false);
    }
  }, [userId]);

  const enterRound = useCallback(async (m: AdaptiveMemory) => {
    const round = m.active;
    if (!round) return;
    if (isPremium) { setPhase('round'); return; }
    setPhase('claiming');
    try {
      const allowed = await claimActivity('timed-section', round.id);
      if (!alive.current) return;
      if (allowed) setPhase('round');
      else router.replace('/plans?reason=daily-timed-limit');
    } catch {
      if (alive.current) setPhase('claimError');
    }
  }, [claimActivity, isPremium, router]);

  const finishNow = useCallback(async (m: AdaptiveMemory) => {
    if (!m.active) return;
    const snapshot = { ...m.active, finished: true };
    const ok = await commit(finishAdaptiveRound(m));
    if (ok) { setResult(snapshot); setPhase('results'); }
  }, [commit]);

  // Load on entry.
  useEffect(() => {
    if (!isLoaded || !ready || !plan || !userId) return;
    let live = true;
    setPhase('loading');
    void (async () => {
      const r = await loadAdaptiveMemory(userId).catch(() => ({ kind: 'unavailable' as const }));
      if (!live) return;
      if (r.kind === 'corrupt') { setPhase('corrupt'); return; }
      if (r.kind === 'unavailable') { setPhase('unavailable'); return; }
      const m = r.kind === 'ready' ? r.memory : emptyAdaptiveMemory();
      lastCommitted.current = m;
      setMemory(m);
      const a = m.active;
      const legacy = !!a && (a.questionIds.length > 6 || a.deadline - a.startedAt > 390000);
      if (a && !a.finished && legacy) { setLegacyNotice(true); await finishNow(m); return; }
      if (a && !a.finished) {
        if (Date.now() >= a.deadline) { await finishNow(m); return; }
        await enterRound(m);
      } else if (a && a.finished) {
        setResult(a); setPhase('results');
      } else setPhase('intro');
    })();
    return () => { live = false; };
  }, [attempt, isLoaded, plan, ready, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deadline watcher.
  const memRef = useRef(memory);
  memRef.current = memory;
  useEffect(() => {
    if (phase !== 'round') return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      const m = memRef.current;
      if (m?.active && !m.active.finished && n >= m.active.deadline && !pending.current) void finishNow(m);
    }, 1000);
    return () => clearInterval(t);
  }, [phase, finishNow]);

  async function startNew() {
    if (!memory || busy) return;
    const planned = planAdaptiveRound(memory, pool, makeRoundId(), Date.now(), undefined, xp);
    if (!planned.active || planned.active.questionIds.length === 0) return;
    const ok = await commit(planned);
    if (ok) { setResult(null); setLegacyNotice(false); await enterRound(planned); }
  }

  async function retrySave() {
    const m = pending.current;
    if (!m) return;
    const ok = await commit(m);
    if (!ok) return;
    if (m.active && !m.active.finished) { if (phase !== 'round') await enterRound(m); }
    else if (m.active?.finished || !m.active) {
      if (phase === 'round' || phase === 'intro') { const last = m.active ?? result; if (last) { setResult({ ...last, finished: true }); setPhase('results'); } }
    }
  }

  const top = (Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top) + 12;
  const round = memory?.active && !memory.active.finished ? memory.active : null;
  const seconds = round ? Math.max(0, Math.ceil((round.deadline - now) / 1000)) : 0;

  return <View style={s.screen}>
    <View style={[s.header, { paddingTop: top }]}>
      <Pressable testID="adaptive-back" accessibilityRole="button" accessibilityLabel="رجوع؛ الوقت يستمر" hitSlop={12}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
        <Ionicons name="arrow-forward" size={24} color={p.foreground} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={s.headerTitle}>إعادة صياغة</Text>
        <Text style={s.caption}>تدريب ذكي يتكيّف مع أخطائك</Text>
      </View>
      {phase === 'round' && round && <View accessible accessibilityLabel={`الوقت المتبقي ${Math.floor(seconds / 60)} دقيقة`} style={[s.clock, seconds <= 60 && { borderColor: p.destructive }]}>
        <Ionicons name="time-outline" size={17} color={seconds <= 60 ? p.destructive : p.brand} />
        <Text style={[s.clockText, seconds <= 60 && { color: p.destructive }]}>{`${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`}</Text>
      </View>}
    </View>
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 24 }]} keyboardShouldPersistTaps="handled">
      {saveError && <View style={s.errorBox} testID="adaptive-save-error">
        <Text accessibilityRole="alert" style={s.body}>تعذّر الحفظ على هذا الجهاز، فلم نعتمد آخر خطوة بعد.</Text>
        <ChunkyButton tone="coral" icon="refresh" label="إعادة الحفظ" testID="adaptive-retry-save" disabled={busy} onPress={() => void retrySave()} />
      </View>}

      {phase === 'loading' || phase === 'claiming' ? <View style={{ gap: 12 }} testID="adaptive-loading">
        {[120, 70, 70].map((h, i) => <View key={i} style={[s.skeleton, { height: h }]} />)}
        <ActivityIndicator color={p.coral} />
        <Text accessibilityLiveRegion="polite" style={s.caption}>{phase === 'claiming' ? 'نتحقّق من حصة اليوم…' : 'نجهّز ذاكرتك التدريبية…'}</Text>
      </View>

      : phase === 'unavailable' ? <View style={s.errorBox} testID="adaptive-unavailable">
        <Text style={s.title}>تعذّر قراءة تقدّمك</Text>
        <Text style={s.body}>لم نتمكن من فتح الحفظ المحلي على هذا الجهاز. لم نغيّر شيئًا.</Text>
        <ChunkyButton tone="brand" icon="refresh" label="حاول مجددًا" testID="adaptive-retry-load" onPress={() => setAttempt(n => n + 1)} />
      </View>

      : phase === 'corrupt' ? <View style={s.errorBox} testID="adaptive-corrupt">
        <Text style={s.title}>بيانات التقدّم غير صالحة</Text>
        <Text style={s.body}>حفظ إعادة الصياغة على هذا الجهاز تالف. لن نحذفه دون موافقتك؛ عند البدء من جديد نحتفظ بنسخة منه جانبًا.</Text>
        {!confirmReset ? <>
          <ChunkyButton tone="brand" icon="refresh" label="حاول القراءة مجددًا" testID="adaptive-retry-load" onPress={() => setAttempt(n => n + 1)} />
          <ChunkyButton tone="ghost" label="البدء من جديد" testID="adaptive-reset" onPress={() => setConfirmReset(true)} />
        </> : <View style={s.confirm} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={s.title}>البدء بتقدّم جديد؟</Text>
          <Text style={s.body}>سيبدأ سجلّ إعادة الصياغة من الصفر على هذا الجهاز. لا يمكن التراجع من التطبيق.</Text>
          <ChunkyButton tone="coral" label="نعم، ابدأ من جديد" testID="adaptive-reset-confirm" disabled={busy} onPress={() => {
            if (!userId) return;
            setBusy(true);
            void resetAdaptiveMemory(userId).then(() => { setConfirmReset(false); setAttempt(n => n + 1); })
              .catch(() => setSaveError(true)).finally(() => setBusy(false));
          }} />
          <ChunkyButton tone="ghost" label="إلغاء" testID="adaptive-reset-cancel" onPress={() => setConfirmReset(false)} />
        </View>}
      </View>

      : phase === 'claimError' ? <View style={s.errorBox} testID="adaptive-claim-error">
        <Text style={s.title}>تعذّر التحقق من حصة اليوم</Text>
        <Text style={s.body}>جولتك محفوظة كما هي. أعد المحاولة لنفس الجولة دون استهلاك حصة إضافية.</Text>
        <ChunkyButton tone="brand" icon="refresh" label="إعادة المحاولة" testID="adaptive-retry-claim" onPress={() => memory && void enterRound(memory)} />
      </View>

      : phase === 'intro' && memory ? <Intro p={p} xp={xp} memory={memory} poolSize={pool.length} isPremium={isPremium} busy={busy} onStart={() => void startNew()} />

      : phase === 'round' && round && memory ? <RoundView p={p} round={round} bank={bank} busy={busy}
          onPick={(qid, i, correctIndex) => void commit(recordAdaptiveAnswer(memory, qid, i, correctIndex))}
          onNext={async () => {
            const next = advanceAdaptiveQuestion(memory);
            if (next.active?.finished) {
              const snap = next.active;
              const ok = await commit(finishAdaptiveRound(next));
              if (ok) { setResult(snap); setPhase('results'); }
            } else await commit(next);
          }} />

      : phase === 'results' && result ? <>
        {legacyNotice && <View style={s.info} testID="adaptive-legacy-notice"><Text accessibilityLiveRegion="polite" style={s.body}>قواعد الجولات تحدّثت؛ محاولتك السابقة محفوظة والجديدة 6 أسئلة.</Text></View>}
        <Results p={p} round={result} bank={bank} isPremium={isPremium} busy={busy}
          onHome={() => router.replace('/')} onNew={() => void startNew()} />
      </>

      : <ActivityIndicator color={p.coral} />}
    </ScrollView>
  </View>;
}

function Intro({ p, xp, memory, poolSize, isPremium, busy, onStart }: { p: P; xp: number; memory: AdaptiveMemory; poolSize: number; isPremium: boolean; busy: boolean; onStart: () => void }) {
  const s = makeStyles(p);
  const items = Object.values(memory.items);
  const seen = items.length;
  const toRetry = items.filter(i => !i.lastCorrect).length;
  return <View style={{ gap: 14 }} testID="adaptive-intro">
    <View style={s.hero}>
      <View style={{ flex: 1, minWidth: 160, alignItems: 'flex-end' }}>
        <Text style={s.heroTitle}>نفس المعنى،{'\n'}بكلمات أخرى</Text>
        <Text style={s.heroSub}>{adaptiveRoundDuration(xp) <= 360000 ? '6 أسئلة • 6 دقائق (من Semi-Master وفوق)' : '6 أسئلة • 6 دقائق ونصف'}</Text>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.heroArt}>
        <Creature kind="rami" mood="happy" size={104} />
      </View>
    </View>
    <View style={s.statRow}>
      <Stat p={p} value={`${seen} / ${poolSize}`} label="أسئلة رأيتها" />
      <Stat p={p} value={`${toRetry}`} label="تنتظر محاولة ثانية" />
      <Stat p={p} value={`${memory.roundNumber}`} label="جولات" />
    </View>
    <Text style={s.caption}>التقدّم محفوظ على هذا الجهاز فقط ولهذا الحساب.</Text>
    <View style={s.info}>
      <Text style={s.body}>الأسئلة من نماذج امتحانات حقيقية بنصّها الأصلي. الشروحات مولّدة بالذكاء الاصطناعي وليست مفتاحًا رسميًا.</Text>
      {!isPremium && <Text style={s.body}>في تجربة مجانية تُحتسب الجولة كقسمك الموقّت الوحيد لليوم.</Text>}
    </View>
    <ChunkyButton tone="success" icon="arrow-back" label="ابدأ الجولة" testID="adaptive-start" disabled={busy || poolSize === 0} onPress={onStart} />
  </View>;
}

function Stat({ p, value, label }: { p: P; value: string; label: string }) {
  const s = makeStyles(p);
  return <View style={s.stat}><Text style={s.statValue}>{value}</Text><Text style={[s.caption, { textAlign: 'center' }]}>{label}</Text></View>;
}

function RoundView({ p, round, bank, busy, onPick, onNext }: {
  p: P; round: AdaptiveRound; bank: Map<string, ImportedQuestion>; busy: boolean;
  onPick: (qid: string, i: number, correctIndex: number) => void; onNext: () => void;
}) {
  const s = makeStyles(p);
  const qid = round.questionIds[round.index];
  const q = bank.get(qid);
  const picked = round.answers[qid];
  const answered = picked !== undefined;
  const reason = REASON[round.reasons[qid] ?? 'new'];
  const speech = useHebrewSpeech(q?.prompt);
  const total = round.questionIds.length;
  const last = round.index === total - 1;
  if (!q || q.answer === null) return <View style={s.errorBox}>
    <Text style={s.body}>هذا السؤال لم يعد متاحًا في خطتك.</Text>
    <ChunkyButton tone="brand" label={last ? 'إنهاء الجولة' : 'التالي'} testID="adaptive-next" disabled={busy} onPress={onNext} />
  </View>;
  const correctIndex = q.answer;
  const right = answered && picked === correctIndex;
  return <View style={{ gap: 14 }} testID="adaptive-round">
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`السؤال ${round.index + 1} من ${total}`} style={s.progressRow}>
      {round.questionIds.map((id, i) => {
        const a = round.answers[id];
        const bg = a === undefined ? (i === round.index ? p.coral : p.track) : a === bank.get(id)?.answer ? p.success : p.destructive;
        return <View key={id} style={[s.dot, { backgroundColor: bg }]} />;
      })}
    </View>
    <View style={s.row}>
      <View style={[s.reason, { backgroundColor: p.skySoft }]}>
        <Ionicons name={reason.icon} size={14} color={p.skyInk} />
        <Text style={[s.reasonText, { color: p.skyInk }]}>{reason.label}</Text>
      </View>
      <Text style={s.caption}>السؤال {round.index + 1} من {total} • صفحة {q.sourcePage}</Text>
    </View>
    <View style={s.teacherRow}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Creature kind={presenterFor(round.index)} mood="happy" size={64} /></View>
      <View style={[s.bubble, { backgroundColor: p.sunSoft, borderColor: p.sun }]}>
        <Text style={[s.body, { color: p.sunInk }]}>{reason.tip}</Text>
      </View>
    </View>
    <View style={s.promptCard}>
      <Text selectable style={s.hebrew}>{q.prompt}</Text>
      <Pressable testID="adaptive-speak" accessibilityRole="button" accessibilityLabel="استمع إلى الجملة" onPress={speech.toggle} style={[s.speak, { backgroundColor: p.skySoft }]}>
        <Ionicons name={speech.status === 'speaking' ? 'stop' : 'volume-high'} size={18} color={p.skyInk} />
        <Text style={[s.reasonText, { color: p.skyInk }]}>استمع</Text>
      </Pressable>
    </View>
    <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
      {q.options.map((o, i) => {
        const isKey = answered && i === correctIndex;
        const isWrong = answered && i === picked && !isKey;
        return <Pressable key={i} testID={`adaptive-option-${i}`} accessibilityRole="radio" disabled={answered || busy}
          accessibilityState={{ checked: picked === i, disabled: answered }}
          accessibilityLabel={`${i + 1}. ${o}${isKey ? '، الإجابة الصحيحة' : isWrong ? '، اختيارك غير صحيح' : ''}`}
          onPress={() => onPick(qid, i, correctIndex)}
          style={[s.option, isKey && { borderColor: p.success, backgroundColor: p.successSoft }, isWrong && { borderColor: p.destructive, backgroundColor: p.coralSoft }]}>
          {(isKey || isWrong) && <Ionicons name={isKey ? 'checkmark-circle' : 'close-circle'} size={20} color={isKey ? p.successInk : p.coralInk} />}
          <Text selectable style={s.optionText}>{o}</Text>
          <Text style={s.caption}>{i + 1}</Text>
        </Pressable>;
      })}
    </View>
    {answered && <View style={[s.bubble, { flex: 0, backgroundColor: right ? p.successSoft : p.coralSoft, borderColor: right ? p.success : p.coral }]} testID={right ? 'adaptive-feedback-correct' : 'adaptive-feedback-wrong'}>
      <Text accessibilityLiveRegion="polite" style={[s.title, { color: right ? p.successInk : p.coralInk }]}>
        {right ? 'صحيح، حافظت على المعنى' : `ليس تمامًا. الصحيح هو الخيار ${correctIndex + 1}، وسيعود هذا السؤال في جولتك القادمة.`}
      </Text>
      <Text selectable style={s.body}>{q.explanation}</Text>
      <Text style={s.caption}>شرح مولّد بالذكاء الاصطناعي، وليس مفتاحًا رسميًا.</Text>
    </View>}
    {answered && <ChunkyButton tone="brand" icon="arrow-back" label={last ? 'إنهاء الجولة' : 'التالي'} testID="adaptive-next" disabled={busy} onPress={onNext} />}
  </View>;
}

function Results({ p, round, bank, isPremium, busy, onHome, onNew }: {
  p: P; round: AdaptiveRound; bank: Map<string, ImportedQuestion>; isPremium: boolean; busy: boolean; onHome: () => void; onNew: () => void;
}) {
  const s = makeStyles(p);
  const total = round.questionIds.length;
  const answeredIds = round.questionIds.filter(id => round.answers[id] !== undefined);
  const correct = answeredIds.filter(id => round.answers[id] === bank.get(id)?.answer).length;
  const wrongIds = answeredIds.filter(id => round.answers[id] !== bank.get(id)?.answer);
  const feedback = completionFeedback(correct, answeredIds.length, total);
  const [variant] = useState(() => nextPracticeCelebration());
  const message = feedback === 'celebrate' ? 'نتيجة قوية في هذه الجولة.'
    : feedback === 'empty' ? 'ابدأ بمحاولة فعلية بدل التسليم بدون إجابات.'
    : feedback === 'review' ? 'جولة للمراجعة. الأسئلة التي أخطأت فيها ستعود في جولتك القادمة.'
    : 'جولة ثابتة. راجع الأخطاء أدناه، وستعود في الجولة القادمة.';
  return <View style={{ gap: 14 }} testID="adaptive-results">
    {feedback === 'celebrate' && <PracticeCelebration variant={variant} />}
    <Text style={s.eyebrow}>انتهت الجولة</Text>
    <Text accessibilityLiveRegion="polite" style={s.heroDark}>{message}</Text>
    <View style={s.statRow}>
      <Stat p={p} value={`${correct}`} label="صحيحة" />
      <Stat p={p} value={`${wrongIds.length}`} label="غير صحيحة" />
      <Stat p={p} value={`${total - answeredIds.length}`} label="بلا إجابة" />
    </View>
    <Text style={s.caption}>{correct} من {total} • نسبة تدريبية فقط، وليست علامة YAEL. محفوظ على هذا الجهاز فقط.</Text>
    {wrongIds.map(id => { const q = bank.get(id); return q && q.answer !== null ? <View key={id} style={[s.reviewCard, { borderColor: p.destructive }]}>
      <Text style={s.caption}>صفحة {q.sourcePage} • يعود في الجولة القادمة</Text>
      <Text selectable style={s.hebrewSmall}>{q.prompt}</Text>
      <Text style={[s.body, { color: p.coralInk }]}>اختيارك: {q.options[round.answers[id]] ?? ''}</Text>
      <Text style={[s.body, { color: p.successInk }]}>الصحيح: {q.options[q.answer]}</Text>
    </View> : null; })}
    <ChunkyButton tone="ghost" icon="arrow-back" label="العودة للرئيسية" testID="adaptive-home" onPress={onHome} />
    <ChunkyButton tone="success" icon="refresh" label="واصل التدريب بجولة جديدة" testID="adaptive-new-round" disabled={busy} onPress={onNew} />
    {!isPremium && <Text style={[s.caption, { textAlign: 'center' }]}>في تجربة مجانية: جولة موقّتة واحدة يوميًا. إن استُخدمت سننقلك لصفحة الخطط.</Text>}
  </View>;
}

function makeStyles(p: P) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: p.background },
    header: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: p.border },
    headerTitle: { fontFamily: BOLD, fontWeight: '800', fontSize: 17, color: p.foreground, textAlign: 'right' },
    clock: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: p.border, borderRadius: 12, padding: 8 },
    clockText: { fontFamily: BOLD, fontWeight: '800', fontSize: 17, color: p.brand, fontVariant: ['tabular-nums'], writingDirection: 'ltr' },
    content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 14 },
    hero: { backgroundColor: p.coral, borderRadius: 26, borderBottomWidth: 7, borderColor: p.coralShade, padding: 18, flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'center' },
    heroTitle: { color: '#fffdf7', fontSize: 25, lineHeight: 33, textAlign: 'right', fontFamily: BOLD, fontWeight: '800' },
    heroSub: { color: '#fffdf7', opacity: 0.9, fontSize: 13, lineHeight: 20, textAlign: 'right', marginTop: 5, fontFamily: FONT },
    heroArt: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
    heroDark: { color: p.foreground, fontFamily: BOLD, fontWeight: '800', fontSize: 22, lineHeight: 34, textAlign: 'right', writingDirection: 'rtl' },
    eyebrow: { color: p.coralShade, fontFamily: BOLD, fontWeight: '800', fontSize: 13, textAlign: 'right' },
    title: { color: p.foreground, fontFamily: BOLD, fontWeight: '800', fontSize: 16, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl' },
    body: { color: p.foreground, fontFamily: FONT, fontSize: 15, lineHeight: 25, textAlign: 'right', writingDirection: 'rtl' },
    caption: { color: p.mutedForeground, fontFamily: FONT, fontSize: 12, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
    hebrew: { color: p.foreground, fontSize: 20, lineHeight: 34, textAlign: 'right', writingDirection: 'rtl' },
    hebrewSmall: { color: p.foreground, fontSize: 17, lineHeight: 29, textAlign: 'right', writingDirection: 'rtl' },
    info: { backgroundColor: p.coralSoft, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, borderColor: p.coral, padding: 14, gap: 8 },
    statRow: { flexDirection: 'row-reverse', gap: 8 },
    stat: { flex: 1, alignItems: 'center', gap: 2, padding: 10, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: p.border, backgroundColor: p.card },
    statValue: { color: p.foreground, fontFamily: BOLD, fontWeight: '800', fontSize: 19 },
    skeleton: { borderRadius: 20, backgroundColor: p.muted, opacity: 0.7 },
    errorBox: { gap: 10, padding: 16, borderRadius: 20, borderWidth: 2, borderColor: p.destructive, backgroundColor: p.card },
    confirm: { gap: 10, padding: 14, borderRadius: 16, borderWidth: 2, borderColor: p.coral, backgroundColor: p.coralSoft },
    progressRow: { flexDirection: 'row-reverse', gap: 5 },
    dot: { flex: 1, height: 10, borderRadius: 5 },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    reason: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    reasonText: { fontFamily: BOLD, fontWeight: '800', fontSize: 12 },
    teacherRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    bubble: { flex: 1, gap: 8, padding: 14, borderRadius: 18, borderWidth: 2, borderBottomWidth: 4 },
    promptCard: { gap: 10, padding: 16, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, borderColor: p.border, backgroundColor: p.card },
    speak: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
    option: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 58, padding: 14, borderRadius: 18, borderWidth: 2, borderBottomWidth: 5, borderColor: p.border, backgroundColor: p.card },
    optionText: { flex: 1, color: p.foreground, fontSize: 17, lineHeight: 28, textAlign: 'right', writingDirection: 'rtl' },
    reviewCard: { gap: 6, padding: 14, borderRadius: 18, borderWidth: 2, borderRightWidth: 6, backgroundColor: p.card },
  });
}
