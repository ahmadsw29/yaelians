import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChunkyButton, ChunkyProgress, usePlay } from '@/components/Playful';
import { Creature, CREATURE_NAMES, type CreatureKind } from '@/components/PetTeacher';
import { Enter } from '@/components/EntranceMotion';
import { useReduceMotion } from '@/components/HomeMotion';
import { PublicPolicyLinks } from '@/components/PublicPolicyLinks';
import { PUBLIC_PRICING } from '@/lib/public-policies';
import { ARABIC_BOLD_FONT } from '@/constants/typography';

type Props = {
  priceLabel: string | null; loading: boolean; error?: string; checkoutEnabled?: boolean;
  onStart: () => void; onSignIn: () => void; onRetry: () => void; onPrivacy: () => void; onTerms: () => void;
};

const CAST: CreatureKind[] = ['zizo', 'lumi', 'nuna', 'rami', 'ghaima'];

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; kind: CreatureKind }[] = [
  { icon: 'library', title: 'دورات مرتّبة من الأساس', text: 'مفردات، قواعد، وفهم المقروء بترتيب واضح يبني على ما تعلّمته.', kind: 'zizo' },
  { icon: 'repeat', title: 'مراجعة تثبّت الأخطاء', text: 'ارجع إلى ما أخطأت فيه حتى يصبح سهلًا عليك.', kind: 'lumi' },
  { icon: 'book', title: 'نصوص عبرية قصيرة', text: 'قصص مع أسئلة موجّهة بالعربية تدرّبك على البحث عن الدليل.', kind: 'nuna' },
  { icon: 'volume-high', title: 'اسمع النطق', text: 'استمع للكلمات العبرية بصوت معلّمك وقت التدريب.', kind: 'ghaima' },
];

export default function WebWelcome({ priceLabel, loading, error, checkoutEnabled = false, onStart, onSignIn, onRetry, onPrivacy, onTerms }: Props) {
  const p = usePlay();
  const scroll = useRef<ScrollView>(null);
  const sections = useRef({ teachers: 0, learning: 0, subscription: 0 });
  const reduceMotion = useReduceMotion();
  const goTo = (section: keyof typeof sections.current) => {
    scroll.current?.scrollTo({ y: Math.max(0, sections.current[section] - 20), animated: !reduceMotion });
  };
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const mid = width >= 640;
  const showPrice = !loading && checkoutEnabled && !!priceLabel;
  const purchaseOpen = !loading && !error && checkoutEnabled;

  const statusTitle = loading ? 'نتحقّق من حالة الاشتراكات…'
    : error ? 'تعذّر تحميل حالة الاشتراك'
      : purchaseOpen ? 'الاشتراك الشهري متاح' : 'الاشتراكات الجديدة متوقفة حاليًا';
  const statusText = loading ? 'لحظة واحدة.'
    : error ? error
      : purchaseOpen ? 'أنشئ حسابك أولًا، ثم أكمل الدفع في صفحة دفع آمنة. لا يبدأ أي اشتراك دون تأكيدك.'
        : 'لا نقبل دفعات جديدة في الوقت الحالي. يمكنك إنشاء حساب أو تسجيل الدخول، وإذا كان لديك اشتراك سابق يمكنك التحقّق منه وإدارته من صفحة الاشتراك.';

  return (
    <ScrollView ref={scroll} style={{ backgroundColor: p.background }} contentContainerStyle={s.page}>
      <View style={[s.glowA, { backgroundColor: p.brandSoft }]} pointerEvents="none" />
      <View style={[s.glowB, { backgroundColor: p.sunSoft }]} pointerEvents="none" />
      <View style={s.wrap}>
        <Enter from="up">
          <View style={[s.nav, { backgroundColor: p.card, borderColor: p.border }]}>
            <View style={s.brandRow}>
              <View style={[s.logoMark, { backgroundColor: p.brand }]}><Text style={[s.logoMarkText, { color: p.onBrand }]}>Y</Text></View>
              <Text style={[s.logo, { color: p.foreground }]}>YAEL</Text>
            </View>
            {mid && <View style={s.navLinks}>
              {([
                ['teachers', 'المعلّمون'], ['learning', 'ماذا تتعلّم'], ['subscription', 'حالة الاشتراك'],
              ] as const).map(([section, label]) => (
                <Pressable key={section} testID={`web-nav-${section}`} accessibilityRole="button" onPress={() => goTo(section)}
                  style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={[s.navLink, { color: p.mutedForeground }]}>{label}</Text>
                </Pressable>
              ))}
            </View>}
            <Pressable testID="web-sign-in" accessibilityRole="button" onPress={onSignIn}
              style={({ pressed }) => [s.navBtn, { backgroundColor: p.foreground, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
              <Text style={[s.navText, { color: p.background }]}>تسجيل الدخول</Text>
            </Pressable>
          </View>
        </Enter>

        <View onLayout={event => { sections.current.teachers = event.nativeEvent.layout.y; }} style={[s.hero, wide && s.heroWide, { backgroundColor: p.brandSoft, borderColor: p.border }]}>
          <View style={[s.heroOrb, { backgroundColor: p.brand, opacity: p.isDark ? 0.18 : 0.12 }]} pointerEvents="none" />
          <View style={[s.heroText, wide && { flex: 1.05 }]}>
            <Enter delay={60}>
              <View style={[s.chip, { backgroundColor: p.card, borderColor: p.border }]}>
                <View style={[s.dot, { backgroundColor: p.sun }]} />
                <Text style={[s.chipText, { color: p.foreground }]}>تحضير لامتحان العبرية «ياعيل»</Text>
              </View>
            </Enter>
            <Enter delay={140}>
              <Text accessibilityRole="header" style={[s.h1, { color: p.foreground }, !mid && { fontSize: 36, lineHeight: 58 }]}>
                العبرية بالعربية،{'\n'}<Text style={{ color: p.brandShade }}>بخطوات تراها تتقدّم.</Text>
              </Text>
            </Enter>
            <Enter delay={220}>
              <Text style={[s.lead, { color: p.mutedForeground }]}>خمسة معلّمين حيوانات يرافقونك في كل تمرين، وتقدّم حقيقي تراه درسًا بعد درس. افتح الموقع من المتصفح وثبّته على جهازك كتطبيق ويب.</Text>
            </Enter>
            <Enter delay={300}>
              <View style={[s.ctaRow, !mid && { flexDirection: 'column' }]}>
                <ChunkyButton label="أنشئ حسابًا" icon="arrow-back" testID="web-start" onPress={onStart} disabled={loading} style={mid ? { minWidth: 190 } : undefined} />
                <ChunkyButton label="لدي حساب" tone="ghost" onPress={onSignIn} style={mid ? { minWidth: 150 } : undefined} />
              </View>
            </Enter>
            {!loading && !purchaseOpen && !error && (
              <Enter delay={360}>
                <View style={s.inlineNote}>
                  <Ionicons name="information-circle" size={18} color={p.skyInk} />
                  <Text style={[s.small, { color: p.skyInk, flexShrink: 1 }]}>الشراء الجديد غير متاح حاليًا. إنشاء الحساب لا يفتح اشتراكًا مدفوعًا.</Text>
                </View>
              </Enter>
            )}
          </View>

          <View style={[s.stage, wide && { flex: 1 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Enter delay={200} from="pop" style={{ width: '100%', alignItems: 'center' }}>
              <View style={[s.board, { backgroundColor: p.card, borderColor: p.border }]}>
                <View style={s.boardHead}>
                  <View style={{ flexDirection: 'row-reverse', gap: 5 }}>
                    {[p.coral, p.sun, p.brand].map(c => <View key={c} style={[s.winDot, { backgroundColor: c }]} />)}
                  </View>
                  <Text style={[s.small, { color: p.mutedForeground }]}>لوحة تدريبك</Text>
                </View>
                <View style={s.boardMain}>
                  <Creature kind="nuna" mood="hype" size={wide ? 96 : 78} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={[s.boardTitle, { color: p.foreground }]}>فهم المقروء</Text>
                    <ChunkyProgress value={0.62} />
                    <Text style={[s.tiny, { color: p.mutedForeground }]}>مثال توضيحي لشكل التقدّم</Text>
                  </View>
                </View>
                <View style={s.boardRows}>
                  {[{ t: 'مفردات', v: 0.8, c: p.sun }, { t: 'قواعد', v: 0.45, c: p.coral }, { t: 'استماع', v: 0.3, c: p.sky }].map(r => (
                    <View key={r.t} style={[s.boardRow, { backgroundColor: p.background }]}>
                      <Text style={[s.tiny, { color: p.foreground, width: 52 }]}>{r.t}</Text>
                      <View style={{ flex: 1 }}><ChunkyProgress value={r.v} color={r.c} /></View>
                    </View>
                  ))}
                </View>
                <View style={s.castRow}>
                  {CAST.map((k, i) => (
                    <View key={k} style={{ alignItems: 'center', marginTop: i % 2 ? 0 : 10 }}>
                      <Creature kind={k} mood="happy" size={wide ? 46 : 40} />
                      <Text style={[s.tiny, { color: p.mutedForeground }]}>{CREATURE_NAMES[k]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Enter>
            <Enter delay={420} from="side" style={[s.float, s.floatA]}>
              <View style={[s.pill, { backgroundColor: p.sun }]}><Ionicons name="volume-high" size={15} color={p.sunInk} /><Text style={[s.pillText, { color: p.sunInk }]}>نطق عبري</Text></View>
            </Enter>
            <Enter delay={500} from="side" style={[s.float, s.floatB]}>
              <View style={[s.pill, { backgroundColor: p.coral }]}><Ionicons name="repeat" size={15} color={p.coralInk} /><Text style={[s.pillText, { color: p.coralInk }]}>مراجعة الأخطاء</Text></View>
            </Enter>
            <Enter delay={580} from="side" style={[s.float, s.floatC]}>
              <View style={[s.pill, { backgroundColor: p.sky }]}><Ionicons name="language" size={15} color={p.skyInk} /><Text style={[s.pillText, { color: p.skyInk }]}>شرح بالعربية</Text></View>
            </Enter>
          </View>
        </View>

        <Enter delay={120}>
          <View style={s.sectionHead}>
            <Text style={[s.eyebrow, { color: p.brandShade }]}>ماذا تتعلّم</Text>
            <Text style={[s.h2, { color: p.foreground }]}>كل ما تحتاجه للامتحان، في مكان واحد.</Text>
          </View>
        </Enter>
        <View onLayout={event => { sections.current.learning = event.nativeEvent.layout.y; }} style={[s.grid, mid && { flexDirection: 'row-reverse', flexWrap: 'wrap' }]}>
          {FEATURES.map((f, i) => {
            const tint = [p.coralSoft, p.sunSoft, p.skySoft, p.brandSoft][i];
            return (
              <Enter key={f.title} delay={160 + i * 70} style={mid ? { width: '48.8%' } : undefined}>
                <View style={[s.feature, { backgroundColor: p.card, borderColor: p.border }]}>
                  <View style={[s.featIcon, { backgroundColor: tint }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    <Creature kind={f.kind} size={58} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                      <Ionicons name={f.icon} size={18} color={p.brandShade} />
                      <Text style={[s.h3, { color: p.foreground }]}>{f.title}</Text>
                    </View>
                    <Text style={[s.body, { color: p.mutedForeground }]}>{f.text}</Text>
                  </View>
                </View>
              </Enter>
            );
          })}
        </View>

        <View onLayout={event => { sections.current.subscription = event.nativeEvent.layout.y; }} style={[s.split, wide && { flexDirection: 'row-reverse', alignItems: 'stretch' }]}>
          <Enter delay={100} style={wide ? { flex: 1 } : undefined}>
            <View style={[s.stepsCard, { backgroundColor: p.foreground }]}>
              <Text style={[s.eyebrow, { color: p.sun }]}>كيف تبدأ</Text>
              {['أنشئ حسابك أو سجّل الدخول.', 'إذا كان لديك اشتراك سابق، تحقّق منه من صفحة الاشتراك.', 'ثبّت الموقع على جهازك وتابع التدريب.'].map((t, i) => (
                <View key={t} style={s.step}>
                  <View style={[s.num, { backgroundColor: p.sun }]}><Text style={[s.numText, { color: p.sunInk }]}>{i + 1}</Text></View>
                  <Text style={[s.body, { color: p.background, flex: 1 }]}>{t}</Text>
                </View>
              ))}
            </View>
          </Enter>

          <Enter delay={180} style={wide ? { flex: 1 } : undefined}>
            <View style={[s.status, { backgroundColor: p.card, borderColor: purchaseOpen ? p.brand : error ? p.coral : p.sky }]}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Creature kind={error ? 'rami' : 'lumi'} mood="happy" size={68} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.small, { color: p.mutedForeground }]}>حالة الاشتراك الشهري</Text>
                  {loading
                    ? <View style={[s.skeleton, { backgroundColor: p.track }]} accessibilityLabel="جارٍ التحميل" />
                    : <Text accessibilityRole="header" style={[s.statusTitle, { color: p.foreground }]}>{statusTitle}</Text>}
                </View>
              </View>
              {showPrice && <Text style={[s.priceText, { color: p.foreground }]}>{`${priceLabel} شهريًا`}</Text>}
              {!showPrice && <View testID="public-proposed-price" style={{ gap: 4 }}>
                <Text style={[s.priceText, { color: p.foreground, writingDirection: 'ltr' }]}>{PUBLIC_PRICING.label}</Text>
                <Text style={[s.small, { color: p.mutedForeground }]}>شهريًا — سعر مخطّط للمراجعة، وليس دفعًا مفعّلًا. الضرائب والإجمالي النهائي لم يُعتمدا بعد. راجع صفحة الأسعار للتفاصيل.</Text>
              </View>}
              {!loading && (error
                ? <View style={[s.err, { backgroundColor: p.coralSoft }]} accessibilityRole="alert">
                    <Text style={[s.body, { color: p.coralInk, flex: 1 }]}>{statusText}</Text>
                    <Pressable accessibilityRole="button" onPress={onRetry} style={[s.retry, { borderColor: p.coralInk }]}>
                      <Text style={[s.navText, { color: p.coralInk }]}>إعادة المحاولة</Text>
                    </Pressable>
                  </View>
                : <Text style={[s.body, { color: p.mutedForeground }]}>{statusText}</Text>)}
              {purchaseOpen && <Text style={[s.small, { color: p.mutedForeground }]}>الاشتراك مدفوع ولا توجد فترة تجريبية مجانية. يتجدّد تلقائيًا كل شهر حتى تلغيه.</Text>}
              <Text style={[s.small, { color: p.mutedForeground }]}>التدريب يساعدك على الاستعداد، ولا يضمن نتيجة معيّنة في الامتحان.</Text>
              <View style={[s.ctaRow, !mid && { flexDirection: 'column' }]}>
                <ChunkyButton label="أنشئ حسابًا" icon="person-add" tone="sun" onPress={onStart} disabled={loading} style={mid ? { flex: 1 } : undefined} />
                <ChunkyButton label="تسجيل الدخول" tone="ghost" onPress={onSignIn} style={mid ? { flex: 1 } : undefined} />
              </View>
            </View>
          </Enter>
        </View>

        <View style={[s.footer, { borderColor: p.border }]}>
          <Text style={[s.logo, { color: p.mutedForeground, fontSize: 16 }]}>YAEL</Text>
          <PublicPolicyLinks onPrivacy={onPrivacy} onTerms={onTerms} />
        </View>
      </View>
    </ScrollView>
  );
}

const rtl = { textAlign: 'right' as const, writingDirection: 'rtl' as const };
const bold = { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800' as const };
const s = StyleSheet.create({
  page: { paddingVertical: 16, paddingHorizontal: 16, alignItems: 'center', overflow: 'hidden' },
  glowA: { position: 'absolute', top: -120, right: -140, width: 520, height: 520, borderRadius: 999, opacity: 0.7 },
  glowB: { position: 'absolute', top: 420, left: -180, width: 460, height: 460, borderRadius: 999, opacity: 0.6 },
  wrap: { width: '100%', maxWidth: 1180, gap: 22 },
  nav: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10, gap: 12 },
  brandRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  logoMark: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  logoMarkText: { ...bold, fontSize: 18 },
  logo: { ...bold, fontSize: 21, letterSpacing: 3 },
  navLinks: { flexDirection: 'row-reverse', gap: 22 },
  navLink: { ...bold, fontSize: 14, ...rtl },
  navBtn: { minHeight: 44, borderRadius: 999, paddingHorizontal: 20, justifyContent: 'center' },
  navText: { ...bold, fontSize: 14, ...rtl },
  hero: { borderWidth: 1, borderRadius: 40, padding: 22, gap: 26, overflow: 'hidden' },
  heroWide: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 56, paddingHorizontal: 52, minHeight: 520 },
  heroOrb: { position: 'absolute', left: -120, bottom: -160, width: 480, height: 480, borderRadius: 999 },
  heroText: { gap: 16 },
  chip: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { ...bold, fontSize: 13, lineHeight: 22, ...rtl },
  h1: { ...bold, fontSize: 52, lineHeight: 80, ...rtl },
  lead: { fontSize: 18, lineHeight: 32, maxWidth: 560, alignSelf: 'flex-end', ...rtl },
  ctaRow: { flexDirection: 'row-reverse', gap: 12, marginTop: 4 },
  inlineNote: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  stage: { minHeight: 300, alignItems: 'center', justifyContent: 'center', paddingVertical: 18 },
  board: { width: '100%', maxWidth: 440, borderWidth: 1, borderRadius: 28, padding: 18, gap: 14, shadowColor: '#0f3d33', shadowOpacity: 0.16, shadowRadius: 30, shadowOffset: { width: 0, height: 18 }, elevation: 6 },
  boardHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  winDot: { width: 10, height: 10, borderRadius: 5 },
  boardMain: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  boardTitle: { ...bold, fontSize: 18, lineHeight: 30, ...rtl },
  boardRows: { gap: 8 },
  boardRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  castRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  float: { position: 'absolute' },
  floatA: { top: 0, left: 0 },
  floatB: { bottom: 4, right: 0 },
  floatC: { top: '46%', left: -8 },
  pill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  pillText: { ...bold, fontSize: 13, lineHeight: 20 },
  sectionHead: { gap: 4, marginTop: 18 },
  eyebrow: { ...bold, fontSize: 13, letterSpacing: 1, ...rtl },
  h2: { ...bold, fontSize: 30, lineHeight: 48, ...rtl },
  h3: { ...bold, fontSize: 17, lineHeight: 28, ...rtl },
  grid: { gap: 14, justifyContent: 'space-between' },
  feature: { flexDirection: 'row-reverse', gap: 14, borderWidth: 1, borderRadius: 26, padding: 18, alignItems: 'center' },
  featIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  body: { fontSize: 15, lineHeight: 26, ...rtl },
  small: { fontSize: 13, lineHeight: 22, ...rtl },
  tiny: { fontSize: 11, lineHeight: 18, ...rtl },
  split: { gap: 16, marginTop: 10 },
  stepsCard: { borderRadius: 32, padding: 26, gap: 18, flex: 1 },
  step: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  num: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  numText: { ...bold, fontSize: 17 },
  status: { borderWidth: 2, borderRadius: 32, padding: 24, gap: 14, flex: 1 },
  statusTitle: { ...bold, fontSize: 22, lineHeight: 36, ...rtl },
  priceText: { ...bold, fontSize: 28, lineHeight: 44, ...rtl },
  skeleton: { height: 28, width: 200, borderRadius: 10, alignSelf: 'flex-end', marginTop: 4 },
  err: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderRadius: 16, padding: 12, flexWrap: 'wrap' },
  retry: { minHeight: 44, borderWidth: 2, borderRadius: 999, paddingHorizontal: 14, justifyContent: 'center' },
  footer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, paddingVertical: 18, marginTop: 10 },
  link: { fontSize: 14, textDecorationLine: 'underline', paddingVertical: 10 },
});
