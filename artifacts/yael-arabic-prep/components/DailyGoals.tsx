import React, { useEffect, useRef, useState } from 'react';
import { formatDisplayNumber as ar, toWesternDigits } from '@/lib/display-numbers';
import {
  AccessibilityInfo, ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDailyGoals } from '@/lib/DailyGoalsProvider';
import { isValidDailyTargets, type DailyMetric, type DailyTargets } from '@/lib/daily-goals';
import { usePlanAccess } from '@/lib/PlanAccess';
import { ChunkyButton, ChunkyProgress, usePlay } from '@/components/Playful';
import { Creature } from '@/components/PetTeacher';
import { GlassPressable } from '@/components/Glass';
import { ARABIC_BOLD_FONT } from '@/constants/typography';

type Play = ReturnType<typeof usePlay>;
type Meta = { key: DailyMetric; label: string; unit: string; hint: string; max: number; step: number; icon: keyof typeof Ionicons.glyphMap; route: string };

const METRICS: Meta[] = [
  { key: 'words', label: 'مفردات', unit: 'كلمة', hint: 'كلمات مختلفة راجعتها اليوم', max: 300, step: 5, icon: 'book', route: '/practice?section=vocabulary' },
  { key: 'restatement', label: 'إعادة صياغة', unit: 'سؤال', hint: 'أسئلة جاوبت عليها، صح أو غلط', max: 120, step: 2, icon: 'swap-horizontal', route: '/restatement' },
  { key: 'reading', label: 'فهم المقروء', unit: 'سؤال', hint: 'أسئلة قطع قراءة جاوبت عليها', max: 120, step: 2, icon: 'reader', route: '/reading' },
  { key: 'models', label: 'نماذج كاملة', unit: 'نموذج', hint: 'جاوب كل الأسئلة وسلّم التعبير ليُحسب النموذج', max: 5, step: 1, icon: 'trophy', route: '/exam-library' },
];

const FREE_DEFAULT: DailyTargets = { words: 20, restatement: 6, reading: 0, models: 0 };
const PREMIUM_DEFAULT: DailyTargets = { words: 20, restatement: 6, reading: 6, models: 0 };
const PRESETS: { id: string; label: string; free: DailyTargets; premium: DailyTargets }[] = [
  { id: 'light', label: 'خفيف', free: { words: 5, restatement: 2, reading: 0, models: 0 }, premium: { words: 10, restatement: 4, reading: 4, models: 0 } },
  { id: 'steady', label: 'ثابت', free: { words: 10, restatement: 4, reading: 0, models: 0 }, premium: PREMIUM_DEFAULT },
  { id: 'push', label: 'طموح', free: FREE_DEFAULT, premium: { words: 40, restatement: 12, reading: 12, models: 1 } },
];

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Math.round(Number.isFinite(n) ? n : 0)));
const same = (a: DailyTargets, b: DailyTargets) => METRICS.every((m) => a[m.key] === b[m.key]);

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduced(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduced;
}

function tint(p: Play, key: DailyMetric) {
  return key === 'words' ? [p.brand, p.brandSoft, p.brandShade]
    : key === 'restatement' ? [p.coral, p.coralSoft, p.coralInk]
      : key === 'reading' ? [p.sky, p.skySoft, p.skyInk] : [p.sun, p.sunSoft, p.sunInk];
}

/* ------------------------------ Home section ------------------------------ */

export function DailyGoalsSection() {
  const p = usePlay();
  const router = useRouter();
  const g = useDailyGoals();

  if (!g.ready) {
    return (
      <View style={[st.card, { backgroundColor: p.card, borderColor: p.border }]} accessibilityLabel="جارٍ تحميل أهداف اليوم">
        <Text style={[st.title, { color: p.foreground }]}>مسارك اليوم</Text>
        {[0, 1, 2].map((i) => <View key={i} style={[st.skeleton, { backgroundColor: p.track }]} />)}
      </View>
    );
  }

  const targets = g.targets;
  const active = targets ? METRICS.filter((m) => targets[m.key] > 0) : [];
  const done = active.filter((m) => g.counts[m.key] >= (targets?.[m.key] ?? 0)).length;
  const anyActivity = METRICS.some((m) => g.counts[m.key] > 0);
  const allDone = active.length > 0 && done === active.length;

  return (
    <View style={[st.card, { backgroundColor: p.card, borderColor: p.border }]}>
      <View style={st.headRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text accessibilityRole="header" style={[st.title, { color: p.foreground }]}>مسارك اليوم</Text>
          <Text style={[st.sub, { color: p.mutedForeground }]}>
            {!targets ? 'ما حددت أهداف اليوم بعد. حطّ رقم يناسبك وانطلق.'
              : allDone ? 'خلّصت كل أهداف اليوم. مهمة منجزة يا بطل.'
                : active.length === 0 ? 'اليوم استراحة، ما في أهداف.'
                  : `${ar(done)} من ${ar(active.length)} أهداف منجزة`}
          </Text>
        </View>
        <GlassPressable testID="daily-goals-edit" dark={p.isDark} onPress={g.openEditor} accessibilityRole="button"
          accessibilityLabel={targets ? 'تعديل أهداف اليوم' : 'حدد أهداف اليوم'}
          fill={[p.brandSoft, p.brandSoft]} radius={14} style={st.editBtn} contentStyle={st.editInner}>
          <Ionicons name={targets ? 'create' : 'flag'} size={17} color={p.isDark ? p.brand : p.brandShade} />
          <Text style={[st.editText, { color: p.isDark ? p.brand : p.brandShade }]}>{targets ? 'تعديل' : 'حدد'}</Text>
        </GlassPressable>
      </View>

      {!!g.error && (
        <View style={[st.errorBox, { backgroundColor: p.coralSoft }]} accessibilityRole="alert">
          <Text style={[st.small, { color: p.coralInk, flex: 1 }]}>{g.error}</Text>
          <Pressable onPress={g.retry} accessibilityRole="button" style={st.retry}>
            <Text style={[st.editText, { color: p.coralInk }]}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      )}

      {targets ? METRICS.map((m) => {
        const target = targets[m.key];
        const count = g.counts[m.key];
        const [main, soft, ink] = tint(p, m.key);
        const off = target === 0;
        const met = !off && count >= target;
        return (
          <Pressable key={m.key} testID={`daily-goal-${m.key}`} onPress={() => router.push(m.route as never)}
            accessibilityRole="button"
            accessibilityLabel={off ? `${m.label}: ليس اليوم${count > 0 ? `، أنجزت ${count}` : ''}` : `${m.label}: ${count} من ${target}${met ? '، الهدف منجز' : ''}. افتح التدريب`}
            accessibilityValue={off ? undefined : { min: 0, max: target, now: Math.min(count, target) }}
            style={({ pressed }) => [st.metric, { backgroundColor: off ? p.muted : soft }, pressed && { transform: [{ translateY: 2 }] }]}>
            <View style={[st.icon, { backgroundColor: off ? p.track : main }]}>
              <Ionicons name={met ? 'checkmark' : m.icon} size={18} color={off ? p.mutedForeground : p.onBrand} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <View style={st.metricTop}>
                <Text style={[st.metricLabel, { color: off ? p.mutedForeground : ink }]}>{m.label}</Text>
                <Text style={[st.count, { color: off ? p.mutedForeground : ink }]}>
                  {off ? (count > 0 ? `ليس اليوم · ${ar(count)}` : 'ليس اليوم') : `${ar(count)} / ${ar(target)}`}
                </Text>
              </View>
              {!off && <ChunkyProgress value={count / target} color={main} />}
            </View>
            <Ionicons name="chevron-back" size={18} color={off ? p.mutedForeground : ink} />
          </Pressable>
        );
      }) : (
        <View style={st.emptyRow}>
          <Creature kind="nuna" mood="cheer" size={64} />
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={[st.small, { color: p.foreground }]}>
              {anyActivity ? 'بلّشت تدرّب اليوم. حدد هدف عشان تشوف قدّيش ضايل.' : 'نونا جاهزة تمشي معك. اختار كم كلمة وكم سؤال لليوم.'}
            </Text>
            <ChunkyButton label="حدد أهداف اليوم" icon="flag" onPress={g.openEditor} testID="daily-goals-empty-cta" />
          </View>
        </View>
      )}
      <Text style={[st.foot, { color: p.mutedForeground }]}>محفوظ على هذا الجهاز</Text>
    </View>
  );
}

/* ------------------------------ Editor sheet ------------------------------ */

export function DailyGoalsPrompt({ enabled }: { enabled: boolean }) {
  const g = useDailyGoals();
  const seenFor = useRef<string | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);

  useEffect(() => {
    if (!enabled || !g.ready || g.error || g.targets || seenFor.current === g.date) return;
    seenFor.current = g.date;
    setAutoOpen(true);
  }, [enabled, g.ready, g.error, g.targets, g.date]);

  useEffect(() => { if (!enabled) setAutoOpen(false); }, [enabled]);

  const visible = g.editorOpen || (autoOpen && enabled && !g.targets);
  const close = () => { setAutoOpen(false); g.closeEditor(); };
  if (!visible) return null;
  return <GoalsSheet onClose={close} first={!g.targets} />;
}

function GoalsSheet({ onClose, first }: { onClose: () => void; first: boolean }) {
  const p = usePlay();
  const g = useDailyGoals();
  const { isPremium } = usePlanAccess();
  const reduced = useReducedMotion();
  const base = g.targets ?? (isPremium ? PREMIUM_DEFAULT : FREE_DEFAULT);
  const [draft, setDraft] = useState<DailyTargets>(base);
  const [saveError, setSaveError] = useState<string | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) { anim.setValue(1); return; }
    Animated.spring(anim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', friction: 8, tension: 70 }).start();
  }, [anim, reduced]);

  const valid = isValidDailyTargets(draft) && METRICS.some((m) => draft[m.key] > 0);
  const set = (k: DailyMetric, v: number, max: number) => { setSaveError(null); setDraft((d) => ({ ...d, [k]: clamp(v, max) })); };

  const save = async () => {
    if (!valid || g.busy) return;
    setSaveError(null);
    const ok = await g.saveTargets(draft);
    if (ok) onClose(); else setSaveError('ما قدرنا نحفظ الأهداف. جرّب مرة ثانية.');
  };

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} visible onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.backdropWrap}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12,22,20,0.55)' }]} onPress={onClose}
          accessibilityRole="button" accessibilityLabel="إغلاق" />
        <Animated.View accessibilityViewIsModal style={[st.sheet, { backgroundColor: p.background, borderColor: p.border },
          { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 12 }}>
            <View style={st.sheetHead}>
              <Creature kind="lumi" mood="happy" size={56} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text accessibilityRole="header" style={[st.title, { color: p.foreground }]}>{first ? 'شو خطتك اليوم؟' : 'عدّل أهداف اليوم'}</Text>
                <Text style={[st.small, { color: p.mutedForeground }]}>حط أرقام تقدر عليها. صفر يعني ليس اليوم.</Text>
              </View>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={first ? 'لاحقاً' : 'إغلاق'} hitSlop={10} style={st.closeBtn}>
                <Ionicons name="close" size={22} color={p.mutedForeground} />
              </Pressable>
            </View>

            <View style={st.presets} accessibilityRole="radiogroup">
              {PRESETS.map((pr) => {
                const t = isPremium ? pr.premium : pr.free;
                const on = same(draft, t);
                return (
                  <GlassPressable key={pr.id} dark={p.isDark} onPress={() => { setSaveError(null); setDraft(t); }} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on}
                    fill={on ? [p.primary, p.isDark ? '#5fa999' : '#0f4d45'] : undefined} radius={14} style={st.preset} contentStyle={st.presetInner}>
                    <Text style={[st.editText, { color: on ? p.primaryForeground : p.foreground }]}>{pr.label}</Text>
                  </GlassPressable>
                );
              })}
            </View>

            {METRICS.map((m) => (
              <Stepper key={m.key} meta={m} value={draft[m.key]} onChange={(v) => set(m.key, v, m.max)} />
            ))}

            <View style={[st.note, { backgroundColor: p.sunSoft }]}>
              <Ionicons name="information-circle" size={18} color={p.sunInk} />
              <Text style={[st.small, { color: p.sunInk, flex: 1 }]}>
                {isPremium ? 'الأهداف للتنظيم بس، ما بتغيّر خطتك ولا بتعطي نقاط.'
                  : 'الأهداف ما بتفتح تدريب إضافي. بالتجربة المجانية في حد يومي للجولات والأقسام الموقوتة، وبعض المحتوى للخطة الكاملة.'}
              </Text>
            </View>

            {!valid && <Text style={[st.small, { color: p.coralInk }]} accessibilityLiveRegion="polite">اختار هدف واحد على الأقل أكبر من صفر.</Text>}
            {!!saveError && (
              <Text accessibilityRole="alert" style={[st.small, { color: p.coralInk }]}>{saveError}</Text>
            )}

            <ChunkyButton testID="daily-goals-save" label={g.busy ? 'جارٍ الحفظ…' : saveError ? 'إعادة المحاولة' : 'ثبّت الأهداف'}
              icon="checkmark-circle" disabled={!valid || g.busy} onPress={save} />
            {g.busy && <ActivityIndicator color={p.brand} />}
            {first && <ChunkyButton tone="ghost" label="لاحقاً" onPress={onClose} testID="daily-goals-later" />}
            <Text style={[st.foot, { color: p.mutedForeground }]}>محفوظ على هذا الجهاز، مش متزامن مع السحابة.</Text>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Stepper({ meta, value, onChange }: { meta: Meta; value: number; onChange: (v: number) => void }) {
  const p = usePlay();
  const [main, soft, ink] = tint(p, meta.key);
  const [text, setText] = useState<string | null>(null);
  const off = value === 0;
  const btn = (dir: 1 | -1) => {
    const dis = dir < 0 ? value <= 0 : value >= meta.max;
    return (
      <Pressable onPress={() => { setText(null); onChange(value + dir * meta.step); }} disabled={dis}
        accessibilityRole="button" accessibilityLabel={`${dir > 0 ? 'زيادة' : 'إنقاص'} ${meta.label}`}
        style={({ pressed }) => [st.stepBtn, { backgroundColor: dis ? p.muted : main, opacity: dis ? 0.5 : 1 }, pressed && { transform: [{ scale: 0.94 }] }]}>
        <Ionicons name={dir > 0 ? 'add' : 'remove'} size={20} color={dis ? p.mutedForeground : p.onBrand} />
      </Pressable>
    );
  };
  return (
    <View style={[st.stepRow, { backgroundColor: off ? p.card : soft, borderColor: off ? p.border : main }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[st.metricLabel, { color: off ? p.mutedForeground : ink }]}>{meta.label}</Text>
        <Text style={[st.tiny, { color: p.mutedForeground }]}>{off ? 'ليس اليوم' : meta.hint}</Text>
      </View>
      <View style={st.stepCtl}>
        {btn(1)}
        <TextInput value={text ?? String(value)} keyboardType="number-pad" maxLength={3} selectTextOnFocus
          accessibilityLabel={`هدف ${meta.label} بال${meta.unit}، الحد ${meta.max}`}
          onChangeText={(t) => { const d = toWesternDigits(t).replace(/[^0-9]/g, ''); setText(d); onChange(d === '' ? 0 : Number(d)); }}
          onBlur={() => setText(null)}
          style={[st.input, { color: p.foreground, backgroundColor: p.background, borderColor: p.border }]} />
        {btn(-1)}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 2, borderBottomWidth: 5, borderRadius: 22, padding: 16, gap: 10 },
  headRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  title: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 20, lineHeight: 32, textAlign: 'right', writingDirection: 'rtl' },
  sub: { fontSize: 13, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl' },
  small: { fontSize: 13, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl' },
  tiny: { fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  foot: { fontSize: 11, lineHeight: 18, textAlign: 'center', writingDirection: 'rtl' },
  editBtn: { minHeight: 44 },
  editInner: { minHeight: 44, gap: 5, paddingHorizontal: 12 },
  editText: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 13, lineHeight: 22, writingDirection: 'rtl' },
  skeleton: { height: 52, borderRadius: 14, opacity: 0.6 },
  errorBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 12, padding: 10 },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  metric: { minHeight: 60, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderRadius: 16, padding: 10 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metricTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  metricLabel: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 15, lineHeight: 24, textAlign: 'right', writingDirection: 'rtl' },
  count: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 13, lineHeight: 22, writingDirection: 'rtl' },
  emptyRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  backdropWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 460, maxHeight: '88%', borderRadius: 26, borderWidth: 2, borderBottomWidth: 6, overflow: 'hidden' },
  sheetHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  presets: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' },
  preset: { flexGrow: 1, minHeight: 44 },
  presetInner: { minHeight: 44, paddingHorizontal: 10 },
  stepRow: { flexDirection: 'row-reverse', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderWidth: 2, borderRadius: 18, padding: 10 },
  stepCtl: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  stepBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  input: { width: 58, minHeight: 44, borderWidth: 2, borderRadius: 12, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  note: { flexDirection: 'row-reverse', gap: 8, borderRadius: 14, padding: 10, alignItems: 'flex-start' },
});
