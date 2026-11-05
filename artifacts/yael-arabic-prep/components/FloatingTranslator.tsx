import { toWesternDigits } from '@/lib/display-numbers';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Alert, Animated, Easing, Platform, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useClerk } from '@clerk/expo';
import { translateStudyText, type TranslatorInput } from '@workspace/api-client-react';
import { usePlay } from '@/components/Playful';
import { TranslatorPet } from '@/components/TranslatorPet';
import { ARABIC_BOLD_FONT } from '@/constants/typography';
import { getStudyAuthOptions } from '@/lib/study-auth';
import { listenForReduceMotionChanges } from '@/lib/pet-teacher-motion';
import { loadTranslatorVisibility, saveTranslatorVisibility, type TranslatorVisibility } from '@/lib/translator-visibility';

const PET = 60;
const MARGIN = 8;
const MAX_CHARS = 1000;
const DRAG_THRESHOLD = 6;
const HIDE_HIT = 44; // touch target for the hide control, stacked above the pet (never over it)
const TAB_W = 44;
const TAB_H = 56;
// Departure ("goodbye") timing — total 1200ms.
const WAVE_MS = [200, 200, 160] as const; // tilt/bob left, right, settle = 560ms
const TRAVEL_MS = 640;                    // ease toward the edge tab with shrink
const NATIVE = Platform.OS !== 'web';
type Direction = TranslatorInput['direction'];
type Phase =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'done'; translation: string }
  | { kind: 'error'; message: string; retryable: boolean };

function describeError(error: unknown): { message: string; retryable: boolean } {
  const status = (error as { status?: number } | null)?.status;
  const msg = error instanceof Error ? error.message : '';
  if (msg === 'Account changed' || msg === 'Sign in again' || status === 401) return { message: 'انتهت جلستك. سجّل الدخول من جديد ثم حاول.', retryable: false };
  if (status === 403) return { message: 'حسابك لا يملك صلاحية استخدام المترجم الآن. راجع حالة حسابك أو خطتك.', retryable: false };
  if (status === 400) return { message: 'لم يتمكّن المترجم من قراءة هذا النص. عدّل النص وحاول مرة أخرى.', retryable: false };
  if (status === 429) return { message: 'ترجمت كثيرًا خلال وقت قصير. خذ نفسًا وحاول بعد قليل.', retryable: true };
  if (status === 504) return { message: 'استغرقت الترجمة وقتًا أطول من المتوقع.', retryable: true };
  if (status === 502 || status === 503) return { message: 'خدمة الترجمة غير متاحة الآن.', retryable: true };
  return { message: 'تعذّر الاتصال. تأكّد من الإنترنت وحاول مرة أخرى.', retryable: true };
}

export function FloatingTranslator({ userId }: { userId: string }) {
  const p = usePlay();
  const clerk = useClerk();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => listenForReduceMotionChanges(AccessibilityInfo, setReduceMotion), []);
  const [direction, setDirection] = useState<Direction>('he-ar');
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const controller = useRef<AbortController | null>(null);
  const requestId = useRef(0);

  // ---------- visibility (account-scoped, persisted) ----------
  // 'loading' renders nothing so the wrong state never flashes.
  const [visibility, setVisibility] = useState<TranslatorVisibility | 'loading'>('loading');
  const userRef = useRef(userId);
  userRef.current = userId;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const isCurrent = (uid: string) => mounted.current && userRef.current === uid;
  useEffect(() => {
    let cancelled = false;
    const uid = userId;
    setVisibility('loading');
    loadTranslatorVisibility(uid).then(
      v => { if (!cancelled && isCurrent(uid)) setVisibility(v); },
      () => {
        if (cancelled || !isCurrent(uid)) return;
        setVisibility('visible');
        Alert.alert('المترجم', 'تعذّرت قراءة إعداد إظهار المترجم، فأظهرناه الآن.');
      },
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  const persistVisibility = useCallback((v: TranslatorVisibility) => {
    const uid = userRef.current;
    setVisibility(v);
    let saving: Promise<void>;
    try { saving = saveTranslatorVisibility(uid, v); } catch (e) { saving = Promise.reject(e); }
    saving.catch(() => {
      if (!mounted.current || userRef.current !== uid) return;
      Alert.alert('المترجم', v === 'hidden'
        ? 'أخفينا المترجم الآن، لكن تعذّر حفظ اختيارك، فقد يظهر عند فتح التطبيق من جديد.'
        : 'أظهرنا المترجم الآن، لكن تعذّر حفظ اختيارك، فقد يبقى مخفيًا عند فتح التطبيق من جديد.');
    });
  }, []);

  // ---------- position / drag ----------
  const bounds = useMemo(() => ({
    minX: insets.left + MARGIN,
    maxX: Math.max(insets.left + MARGIN, width - insets.right - PET - MARGIN),
    minY: insets.top + MARGIN + HIDE_HIT,
    maxY: Math.max(insets.top + MARGIN + HIDE_HIT, height - insets.bottom - PET - 96),
  }), [insets, width, height]);
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;
  const clamp = (x: number, y: number) => ({
    x: Math.min(Math.max(x, boundsRef.current.minX), boundsRef.current.maxX),
    y: Math.min(Math.max(y, boundsRef.current.minY), boundsRef.current.maxY),
  });
  // Default: left edge (RTL app keeps primary controls on the right), above the tab bar.
  const pos = useRef({ x: bounds.minX, y: bounds.maxY - 40 });
  const anim = useRef(new Animated.ValueXY(pos.current)).current;
  useEffect(() => {
    pos.current = clamp(pos.current.x, pos.current.y);
    anim.setValue(pos.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, anim]);

  // ---------- departure (transient, separate from persisted visibility) ----------
  const [departing, setDeparting] = useState(false);
  const departingRef = useRef(false);
  const dep = useRef({
    dx: new Animated.Value(0), bob: new Animated.Value(0), tilt: new Animated.Value(0),
    scale: new Animated.Value(1), fade: new Animated.Value(1),
  }).current;
  const depAnim = useRef<Animated.CompositeAnimation | null>(null);
  const resetDeparture = useCallback(() => {
    depAnim.current?.stop();
    depAnim.current = null;
    dep.dx.setValue(0); dep.bob.setValue(0); dep.tilt.setValue(0); dep.scale.setValue(1); dep.fade.setValue(1);
    departingRef.current = false;
    setDeparting(false);
  }, [dep]);
  // Interruptions: account switch, rotation/bounds change, reduced-motion turned on, unmount.
  useEffect(() => resetDeparture, [resetDeparture, userId, bounds]);
  useEffect(() => { if (reduceMotion && departingRef.current) resetDeparture(); }, [reduceMotion, resetDeparture]);
  const [instantClose, setInstantClose] = useState(false);

  const openRef = useRef<() => void>(() => {});
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_e, g) => !departingRef.current && Math.abs(g.dx) + Math.abs(g.dy) > DRAG_THRESHOLD,
    onPanResponderMove: (_e, g) => {
      if (Math.abs(g.dx) + Math.abs(g.dy) <= DRAG_THRESHOLD) return;
      anim.setValue(clamp(pos.current.x + g.dx, pos.current.y + g.dy));
    },
    onPanResponderRelease: (_e, g) => {
      if (Math.abs(g.dx) + Math.abs(g.dy) <= DRAG_THRESHOLD) { openRef.current(); return; }
      pos.current = clamp(pos.current.x + g.dx, pos.current.y + g.dy);
      anim.setValue(pos.current);
    },
    onPanResponderTerminate: () => anim.setValue(pos.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [anim]);

  // ---------- translation ----------
  const cancelPending = useCallback(() => {
    requestId.current += 1;
    controller.current?.abort();
    controller.current = null;
  }, []);
  useEffect(() => cancelPending, [cancelPending, userId]);

  const trimmed = text.trim();
  const translate = async () => {
    if (!trimmed || trimmed.length > MAX_CHARS || phase.kind === 'pending') return;
    cancelPending();
    const id = requestId.current;
    const ac = new AbortController();
    controller.current = ac;
    const active = () => requestId.current === id && !ac.signal.aborted;
    setPhase({ kind: 'pending' });
    try {
      const auth = await getStudyAuthOptions(() => clerk.session ?? null, userId, active);
      const result = await translateStudyText({ text: trimmed, direction }, { ...auth, signal: ac.signal });
      if (!active()) return;
      setPhase({ kind: 'done', translation: toWesternDigits(result.translation) });
    } catch (error) {
      if (!active()) return;
      setPhase({ kind: 'error', ...describeError(error) });
    } finally {
      if (controller.current === ac) controller.current = null;
    }
  };

  const resetOutput = () => { cancelPending(); setPhase({ kind: 'idle' }); };
  const onChangeText = (value: string) => { setText(value.slice(0, MAX_CHARS)); resetOutput(); };
  const swap = () => { setDirection(d => (d === 'he-ar' ? 'ar-he' : 'he-ar')); resetOutput(); };
  const clear = () => { setText(''); resetOutput(); };
  const close = () => { resetOutput(); setOpen(false); };
  openRef.current = () => { if (!departingRef.current) { setInstantClose(false); setOpen(true); } };
  const tabOnLeftNow = () => pos.current.x + PET / 2 < width / 2;
  const startDeparture = () => {
    if (departingRef.current) return;
    if (reduceMotion) return; // immediate hide
    departingRef.current = true;
    setDeparting(true);
    const left = tabOnLeftNow();
    // Glide so the shrunken pet's center lands on the edge tab.
    const target = left ? insets.left + 11 - PET / 2 : width - insets.right - 11 - PET / 2;
    const t = (v: Animated.Value, toValue: number, duration: number, easing = Easing.inOut(Easing.quad)) =>
      Animated.timing(v, { toValue, duration, easing, useNativeDriver: NATIVE });
    const lean = left ? -1 : 1;
    const anim2 = Animated.sequence([
      Animated.parallel([t(dep.tilt, -lean, WAVE_MS[0]), t(dep.bob, -8, WAVE_MS[0])]),
      Animated.parallel([t(dep.tilt, lean * 0.8, WAVE_MS[1]), t(dep.bob, 0, WAVE_MS[1])]),
      Animated.parallel([t(dep.tilt, -lean * 0.4, WAVE_MS[2]), t(dep.bob, -4, WAVE_MS[2])]),
      Animated.parallel([
        t(dep.dx, target - pos.current.x, TRAVEL_MS, Easing.bezier(0.45, 0, 0.25, 1)),
        t(dep.bob, 0, TRAVEL_MS),
        t(dep.tilt, 0, TRAVEL_MS),
        t(dep.scale, 0.45, TRAVEL_MS, Easing.in(Easing.quad)),
        Animated.sequence([Animated.delay(TRAVEL_MS * 0.55), t(dep.fade, 0, TRAVEL_MS * 0.45)]),
      ]),
    ]);
    depAnim.current = anim2;
    anim2.start(({ finished }) => { if (finished && depAnim.current === anim2) resetDeparture(); });
  };
  const hideAssistant = (fromCloud = false) => {
    if (departingRef.current) return;
    resetOutput();
    if (fromCloud) setInstantClose(true); // no modal fade over the goodbye
    setOpen(false);
    persistVisibility('hidden');
    startDeparture();
  };
  const restoreAndOpen = () => { persistVisibility('visible'); setInstantClose(false); setOpen(true); };
  // Edge tab snaps to whichever horizontal edge the pet was nearest to.
  const tabOnLeft = pos.current.x + PET / 2 < width / 2;
  const tabY = Math.min(Math.max(pos.current.y, insets.top + MARGIN), Math.max(insets.top + MARGIN, height - insets.bottom - TAB_H - 96));

  const fromHe = direction === 'he-ar';
  const fromLabel = fromHe ? 'العبرية' : 'العربية';
  const toLabel = fromHe ? 'العربية' : 'العبرية';
  const pending = phase.kind === 'pending';
  const canSubmit = trimmed.length > 0 && !pending;

  return (
    <>
      {!open && (visibility === 'visible' || departing) && (
        <Animated.View pointerEvents={departing ? 'none' : 'box-none'} style={[styles.pet, { transform: anim.getTranslateTransform() }]}>
          <Animated.View pointerEvents="box-none" style={{ flex: 1, opacity: dep.fade, transform: [
            { translateX: dep.dx }, { translateY: dep.bob },
            { rotate: dep.tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] }) },
            { scale: dep.scale },
          ] }}>
          <Pressable
            onPress={() => hideAssistant()}
            disabled={departing}
            accessibilityRole="button"
            accessibilityLabel="إخفاء المترجم"
            accessibilityHint="يبقى لسان صغير «ترجمة» على طرف الشاشة لإظهاره من جديد."
            testID="translator-hide"
            style={styles.hideHit}
          >
            <View style={[styles.hideDot, { backgroundColor: p.card, borderColor: p.border }]}>
              <Ionicons name="remove" size={14} color={p.mutedForeground} />
            </View>
          </Pressable>
          <View {...pan.panHandlers}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="المترجم ترجمان"
            accessibilityHint="يفتح غيمة الترجمة بين العبرية والعربية. يمكنك سحبه لمكان آخر."
            onPress={() => openRef.current()}
            disabled={departing}
            testID="translator-pet"
            style={[styles.petBadge, { backgroundColor: p.card, borderColor: p.brandShade, shadowColor: p.brandShade }]}
          >
            <TranslatorPet size={PET - 6} />
          </Pressable>
          </View>
          </Animated.View>
        </Animated.View>
      )}
      {!open && visibility === 'hidden' && !departing && (
        <Pressable
          onPress={restoreAndOpen}
          accessibilityRole="button"
          accessibilityLabel="ترجمة: إظهار المترجم وفتحه"
          testID="translator-edge-tab"
          style={[styles.tabHit, { top: tabY }, tabOnLeft ? { left: insets.left } : { right: insets.right }]}
        >
          <View style={[styles.tab, { backgroundColor: p.card, borderColor: p.brandShade },
            tabOnLeft ? { borderLeftWidth: 0, borderTopRightRadius: 12, borderBottomRightRadius: 12, alignSelf: 'flex-start' }
              : { borderRightWidth: 0, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, alignSelf: 'flex-end' }]}>
            <Ionicons name="language" size={15} color={p.brandShade} />
          </View>
        </Pressable>
      )}

      <Modal visible={open} transparent animationType={reduceMotion || instantClose ? 'none' : 'fade'} onRequestClose={close} statusBarTranslucent>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <Pressable accessibilityLabel="إغلاق المترجم" accessibilityRole="button" onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: p.isDark ? 'rgba(4,12,10,0.6)' : 'rgba(23,51,47,0.32)' }]} />
          <View pointerEvents="box-none" style={[styles.center, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
            <View accessibilityViewIsModal style={{ width: Math.min(width - 32, 440), maxHeight: '100%' }}>
              {/* cloud puffs (decorative) */}
              <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.puffRow}>
                {[44, 64, 52, 38].map((s, i) => (
                  <View key={i} style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: p.card, borderWidth: 2, borderColor: p.skySoft, marginBottom: -s / 2, marginHorizontal: -6 }} />
                ))}
              </View>
              <View style={[styles.cloud, { backgroundColor: p.card, borderColor: p.skySoft }]}>
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
                  <View style={styles.header}>
                    <TranslatorPet size={44} idle={false} />
                    <View style={{ flex: 1 }}>
                      <Text accessibilityRole="header" style={[styles.title, { color: p.foreground }]}>ترجمان</Text>
                      <Text style={[styles.sub, { color: p.mutedForeground }]}>صديقك بين العبرية والعربية</Text>
                    </View>
                    <Pressable onPress={() => hideAssistant(true)} accessibilityRole="button" accessibilityLabel="إخفاء المترجم إلى طرف الشاشة" hitSlop={4} testID="translator-cloud-hide" style={[styles.iconBtn, { backgroundColor: p.muted }]}>
                      <Ionicons name="eye-off-outline" size={18} color={p.mutedForeground} />
                    </Pressable>
                    <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="إغلاق" hitSlop={4} style={[styles.iconBtn, { backgroundColor: p.muted }]}>
                      <Ionicons name="close" size={20} color={p.foreground} />
                    </Pressable>
                  </View>

                  <View style={[styles.dirRow, { backgroundColor: p.skySoft }]}>
                    <Text style={[styles.lang, { color: p.skyInk }]}>{fromLabel}</Text>
                    <Pressable onPress={swap} accessibilityRole="button" hitSlop={6} accessibilityLabel={`تبديل الاتجاه. الآن من ${fromLabel} إلى ${toLabel}`} style={[styles.swap, { backgroundColor: p.sky }]}>
                      <Ionicons name="swap-horizontal" size={18} color={p.onBrand} />
                    </Pressable>
                    <Text style={[styles.lang, { color: p.skyInk }]}>{toLabel}</Text>
                  </View>

                  <View>
                    <TextInput
                      value={text}
                      onChangeText={onChangeText}
                      multiline
                      maxLength={MAX_CHARS}
                      placeholder={fromHe ? 'הקלד כאן טקסט בעברית…' : 'اكتب هنا نصًا بالعربية…'}
                      placeholderTextColor={p.mutedForeground}
                      accessibilityLabel={`النص باللغة ${fromLabel}`}
                      textAlign="right"
                      style={[styles.input, { color: p.foreground, backgroundColor: p.background, borderColor: p.border, writingDirection: 'rtl' }]}
                      testID="translator-input"
                    />
                    <Text style={[styles.count, { color: trimmed.length >= MAX_CHARS ? p.coralInk : p.mutedForeground }]}>{text.length}/{MAX_CHARS}</Text>
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      onPress={translate}
                      disabled={!canSubmit}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !canSubmit, busy: pending }}
                      accessibilityLabel="ترجم"
                      testID="translator-submit"
                      style={[styles.primary, { backgroundColor: canSubmit ? p.brand : p.track, borderBottomColor: canSubmit ? p.brandShade : p.shade }]}
                    >
                      {pending ? <ActivityIndicator color={p.onBrand} /> : <Ionicons name="language" size={18} color={canSubmit ? p.onBrand : p.mutedForeground} />}
                      <Text style={[styles.primaryText, { color: canSubmit ? p.onBrand : p.mutedForeground }]}>{pending ? 'يترجم…' : 'ترجم'}</Text>
                    </Pressable>
                    <Pressable onPress={clear} disabled={!text && phase.kind === 'idle'} accessibilityRole="button" accessibilityLabel="مسح النص" style={[styles.ghost, { borderColor: p.border, opacity: !text && phase.kind === 'idle' ? 0.5 : 1 }]}>
                      <Ionicons name="trash-outline" size={18} color={p.foreground} />
                    </Pressable>
                  </View>

                  <View accessibilityLiveRegion="polite" style={[styles.result, { backgroundColor: phase.kind === 'error' ? p.coralSoft : p.sunSoft }]}>
                    {phase.kind === 'idle' && <Text style={[styles.hint, { color: p.sunInk }]}>اكتب كلمة أو جملة، ثم اضغط «ترجم».</Text>}
                    {phase.kind === 'pending' && (
                      <View style={{ gap: 8 }}>
                        {[0.9, 0.7, 0.5].map(w => <View key={w} style={{ height: 10, width: `${w * 100}%`, borderRadius: 5, backgroundColor: p.shade, alignSelf: 'flex-end' }} />)}
                      </View>
                    )}
                    {phase.kind === 'done' && (
                      <Text selectable style={[styles.translation, { color: p.foreground, writingDirection: 'rtl' }]}>{phase.translation}</Text>
                    )}
                    {phase.kind === 'error' && (
                      <View style={{ gap: 10 }}>
                        <Text style={[styles.hint, { color: p.coralInk }]}>{phase.message}</Text>
                        {phase.retryable && (
                          <Pressable onPress={translate} accessibilityRole="button" accessibilityLabel="أعد المحاولة" style={[styles.retry, { backgroundColor: p.coral }]}>
                            <Ionicons name="refresh" size={16} color={p.onBrand} />
                            <Text style={[styles.primaryText, { color: p.onBrand, fontSize: 14 }]}>أعد المحاولة</Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>

                  <Text style={[styles.caveat, { color: p.mutedForeground }]}>
                    الترجمة يولّدها الذكاء الاصطناعي وقد تخطئ أحيانًا. تحقّق من المعنى قبل الاعتماد عليه.
                  </Text>
                </ScrollView>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pet: { position: 'absolute', top: -HIDE_HIT, left: 0, width: PET, height: PET + HIDE_HIT, zIndex: 50, elevation: 12 },
  hideHit: { width: PET, height: HIDE_HIT, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  hideDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tabHit: { position: 'absolute', width: TAB_W, height: TAB_H, justifyContent: 'center', zIndex: 50, elevation: 12 },
  tab: { width: 22, height: 44, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', opacity: 0.92 },
  petBadge: { width: PET, height: PET, borderRadius: PET / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  puffRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', zIndex: 1 },
  cloud: { borderRadius: 34, borderWidth: 2, padding: 18, flexShrink: 1, zIndex: 2 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  title: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 20, textAlign: 'right' },
  sub: { fontSize: 13, textAlign: 'right' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dirRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderRadius: 18, padding: 6, paddingHorizontal: 14 },
  lang: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '700', fontSize: 15, flex: 1, textAlign: 'center' },
  swap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 96, maxHeight: 180, borderWidth: 1.5, borderRadius: 18, padding: 12, fontSize: 16, textAlignVertical: 'top' },
  count: { fontSize: 12, marginTop: 4, textAlign: 'left' },
  actions: { flexDirection: 'row-reverse', gap: 10 },
  primary: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 18, paddingVertical: 12, borderBottomWidth: 4, minHeight: 50 },
  primaryText: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 16 },
  ghost: { width: 50, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  result: { borderRadius: 18, padding: 14, minHeight: 64, justifyContent: 'center' },
  hint: { fontSize: 14, textAlign: 'right', lineHeight: 22 },
  translation: { fontSize: 18, lineHeight: 28, textAlign: 'right' },
  retry: { flexDirection: 'row-reverse', alignSelf: 'flex-end', alignItems: 'center', gap: 6, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14 },
  caveat: { fontSize: 12, lineHeight: 18, textAlign: 'right' },
});
