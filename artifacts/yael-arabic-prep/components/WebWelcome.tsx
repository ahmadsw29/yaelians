import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChunkyButton, usePlay } from '@/components/Playful';
import { Creature, CREATURE_NAMES, type CreatureKind } from '@/components/PetTeacher';
import { ARABIC_BOLD_FONT } from '@/constants/typography';

type Props = {
  priceLabel: string | null; loading: boolean; error?: string;
  onStart: () => void; onSignIn: () => void; onRetry: () => void; onPrivacy: () => void; onTerms: () => void;
};

const CAST: CreatureKind[] = ['zizo', 'lumi', 'nuna', 'rami', 'ghaima'];

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; kind: CreatureKind }[] = [
  { icon: 'library', title: 'كل الدورات مفتوحة', text: 'مفردات، قواعد، وفهم المقروء بترتيب واضح من الأساس.', kind: 'zizo' },
  { icon: 'infinite', title: 'تدريب بلا حدود', text: 'تمرّن بقدر ما تريد، وراجع أخطاءك حتى تثبت.', kind: 'lumi' },
  { icon: 'book', title: 'نصوص عبرية قصيرة', text: 'قصص مع أسئلة موجّهة بالعربية تدرّبك على البحث عن الدليل.', kind: 'nuna' },
  { icon: 'volume-high', title: 'اسمع النطق', text: 'استمع للكلمات العبرية بصوت معلّمك وقت التدريب.', kind: 'ghaima' },
];

export default function WebWelcome({ priceLabel, loading, error, onStart, onSignIn, onRetry, onPrivacy, onTerms }: Props) {
  const p = usePlay();
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const priceLine = loading ? 'جارٍ تحميل السعر…' : priceLabel ? `${priceLabel} شهريًا` : 'السعر غير متاح حاليًا';

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={s.page}>
      <View style={[s.wrap]}>
        <View style={s.nav}>
          <Text style={[s.logo, { color: p.brandShade }]}>YAEL</Text>
          <Pressable testID="web-sign-in" accessibilityRole="button" onPress={onSignIn} style={[s.navBtn, { borderColor: p.border, backgroundColor: p.card }]}>
            <Text style={[s.navText, { color: p.foreground }]}>تسجيل الدخول</Text>
          </Pressable>
        </View>

        <View style={[s.hero, wide && s.heroWide, { backgroundColor: p.brandSoft, borderColor: p.brandShade }]}>
          <View style={[s.heroText, wide && { flex: 1.2 }]}>
            <View style={[s.chip, { backgroundColor: p.sun }]}><Text style={[s.chipText, { color: p.sunInk }]}>تحضير لامتحان العبرية</Text></View>
            <Text style={[s.h1, { color: p.foreground }, !wide && { fontSize: 32, lineHeight: 50 }]}>العبرية صارت أوضح، خطوة بخطوة.</Text>
            <Text style={[s.lead, { color: p.mutedForeground }]}>تعلّم بالعربية مع خمسة معلّمين لطفاء يرافقونك في كل تمرين. افتح الموقع من المتصفح وثبّته على جهازك كتطبيق ويب.</Text>
            <View style={[s.ctaRow, !wide && { flexDirection: 'column' }]}>
              <ChunkyButton label="ابدأ الاشتراك" icon="arrow-back" testID="web-start" onPress={onStart} disabled={loading} style={wide ? { minWidth: 200 } : undefined} />
              <ChunkyButton label="لدي حساب" tone="ghost" onPress={onSignIn} style={wide ? { minWidth: 160 } : undefined} />
            </View>
          </View>
          <View style={[s.stage, wide && { flex: 1 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[s.blob, { backgroundColor: p.sunSoft }]} />
            <View style={s.castRow}>
              {CAST.map((k, i) => (
                <View key={k} style={{ alignItems: 'center', marginTop: i % 2 ? 0 : 26 }}>
                  <Creature kind={k} mood={i === 2 ? 'hype' : 'happy'} size={wide ? 92 : 64} />
                  <Text style={[s.castName, { color: p.foreground }]}>{CREATURE_NAMES[k]}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Text style={[s.h2, { color: p.foreground }]}>ماذا تحصل مع الاشتراك؟</Text>
        <View style={[s.grid, wide && { flexDirection: 'row-reverse', flexWrap: 'wrap' }]}>
          {FEATURES.map((f, i) => {
            const tint = [p.coralSoft, p.sunSoft, p.skySoft, p.brandSoft][i];
            return (
              <View key={f.title} style={[s.feature, wide && { width: '48.5%' }, { backgroundColor: p.card, borderColor: p.border }]}>
                <View style={[s.featIcon, { backgroundColor: tint }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <Creature kind={f.kind} size={56} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                    <Ionicons name={f.icon} size={18} color={p.brandShade} />
                    <Text style={[s.h3, { color: p.foreground }]}>{f.title}</Text>
                  </View>
                  <Text style={[s.body, { color: p.mutedForeground }]}>{f.text}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={[s.h2, { color: p.foreground }]}>كيف تبدأ؟</Text>
        <View style={[s.steps, wide && { flexDirection: 'row-reverse' }]}>
          {['أنشئ حسابك أو سجّل الدخول.', 'ادفع الاشتراك الشهري عبر صفحة دفع آمنة.', 'ثبّت الموقع على جهازك وابدأ التدريب.'].map((t, i) => (
            <View key={t} style={[s.step, wide && { flex: 1 }, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={[s.num, { backgroundColor: p.brand }]}><Text style={[s.numText, { color: p.onBrand }]}>{i + 1}</Text></View>
              <Text style={[s.body, { color: p.foreground, flex: 1 }]}>{t}</Text>
            </View>
          ))}
        </View>

        <View style={[s.price, { backgroundColor: p.card, borderColor: p.sunShade }]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Creature kind="lumi" mood="cheer" size={72} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.small, { color: p.mutedForeground }]}>اشتراك شهري</Text>
              {loading
                ? <View style={[s.skeleton, { backgroundColor: p.track }]} accessibilityLabel="جارٍ تحميل السعر" />
                : <Text style={[s.priceText, { color: priceLabel ? p.foreground : p.mutedForeground }]}>{priceLine}</Text>}
            </View>
          </View>
          {!!error && (
            <View style={[s.err, { backgroundColor: p.coralSoft }]} accessibilityRole="alert">
              <Text style={[s.body, { color: p.coralInk, flex: 1 }]}>{error}</Text>
              <Pressable accessibilityRole="button" onPress={onRetry} style={[s.retry, { borderColor: p.coralInk }]}>
                <Text style={[s.navText, { color: p.coralInk }]}>إعادة المحاولة</Text>
              </Pressable>
            </View>
          )}
          <Text style={[s.body, { color: p.mutedForeground }]}>
            الاشتراك مدفوع ولا توجد فترة تجريبية مجانية. يتجدّد تلقائيًا كل شهر بنفس السعر حتى تلغيه، ويبقى وصولك فعّالًا حتى نهاية الفترة المدفوعة. التدريب يساعدك على الاستعداد، ولا يضمن نتيجة معيّنة في الامتحان.
          </Text>
          <ChunkyButton label="ابدأ الاشتراك" icon="card" tone="sun" onPress={onStart} disabled={loading} />
        </View>

        <View style={[s.footer, { borderColor: p.border }]}>
          <Pressable accessibilityRole="link" onPress={onPrivacy}><Text style={[s.link, { color: p.mutedForeground }]}>سياسة الخصوصية</Text></Pressable>
          <Pressable accessibilityRole="link" onPress={onTerms}><Text style={[s.link, { color: p.mutedForeground }]}>شروط الاستخدام</Text></Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const rtl = { textAlign: 'right' as const, writingDirection: 'rtl' as const };
const s = StyleSheet.create({
  page: { paddingVertical: 16, paddingHorizontal: 16, alignItems: 'center' },
  wrap: { width: '100%', maxWidth: 1080, gap: 18 },
  nav: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 24, letterSpacing: 3 },
  navBtn: { minHeight: 44, borderWidth: 2, borderBottomWidth: 4, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' },
  navText: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 14, ...rtl },
  hero: { borderWidth: 2, borderBottomWidth: 7, borderRadius: 32, padding: 22, gap: 18, overflow: 'hidden' },
  heroWide: { flexDirection: 'row-reverse', alignItems: 'center', padding: 40 },
  heroText: { gap: 14 },
  chip: { alignSelf: 'flex-end', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  chipText: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 13, lineHeight: 22, ...rtl },
  h1: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 44, lineHeight: 66, ...rtl },
  lead: { fontSize: 17, lineHeight: 30, ...rtl },
  ctaRow: { flexDirection: 'row-reverse', gap: 12, marginTop: 4 },
  stage: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  blob: { position: 'absolute', width: '90%', height: '80%', borderRadius: 999 },
  castRow: { flexDirection: 'row-reverse', gap: 4, alignItems: 'flex-start' },
  castName: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 12, marginTop: -4 },
  h2: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 26, lineHeight: 42, marginTop: 12, ...rtl },
  h3: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 17, lineHeight: 28, ...rtl },
  grid: { gap: 12, justifyContent: 'space-between' },
  feature: { flexDirection: 'row-reverse', gap: 12, borderWidth: 2, borderBottomWidth: 5, borderRadius: 22, padding: 14, alignItems: 'center' },
  featIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  body: { fontSize: 15, lineHeight: 26, ...rtl },
  small: { fontSize: 13, lineHeight: 20, ...rtl },
  steps: { gap: 12 },
  step: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderWidth: 2, borderBottomWidth: 5, borderRadius: 20, padding: 14 },
  num: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 17 },
  price: { borderWidth: 2, borderBottomWidth: 7, borderRadius: 28, padding: 20, gap: 14, marginTop: 10, maxWidth: 620, width: '100%', alignSelf: 'center' },
  priceText: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 28, lineHeight: 44, ...rtl },
  skeleton: { height: 30, width: 160, borderRadius: 10, alignSelf: 'flex-end', marginTop: 6 },
  err: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, flexWrap: 'wrap' },
  retry: { minHeight: 44, borderWidth: 2, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center' },
  footer: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 24, borderTopWidth: 1, paddingVertical: 18, marginTop: 10 },
  link: { fontSize: 14, textDecorationLine: 'underline', paddingVertical: 10 },
});
