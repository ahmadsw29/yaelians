import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChunkyButton, usePlay } from '@/components/Playful';
import { Creature, type CreatureKind } from '@/components/PetTeacher';
import { ARABIC_BOLD_FONT } from '@/constants/typography';

type State = 'checking' | 'inactive' | 'pending' | 'active' | 'error';
type Props = {
  complimentary?: boolean;
  checkoutEnabled: boolean;
  state: State; priceLabel: string | null; busy: boolean; verifyBusy: boolean; cancelBusy: boolean; message?: string;
  cancelAtPeriodEnd: boolean; periodEnd: string | null; canInstall: boolean; installHelp?: string;
  onCheckout: () => void; onVerify: () => void; onOpenApp: () => void; onInstall: () => void; onCancel: () => void;
  onSignOut: () => void; onPrivacy: () => void; onTerms: () => void;
  onAccount: () => void;
};

const HEAD: Record<State, { title: string; text: string; kind: CreatureKind; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  checking: { title: 'نتحقّق من اشتراكك', text: 'لحظة واحدة، نراجع حالة حسابك.', kind: 'ghaima', icon: 'time' },
  inactive: { title: 'اشترك لتفتح كل شيء', text: 'كل الدورات وتدريب بلا حدود مع معلّميك.', kind: 'zizo', icon: 'lock-closed' },
  pending: { title: 'الدفع قيد التأكيد', text: 'إذا أتممت الدفع، اضغط «تحقّق من الدفع» لتحديث الحالة.', kind: 'lumi', icon: 'hourglass' },
  active: { title: 'اشتراكك فعّال', text: 'كل الدورات والتدريب غير المحدود متاحة لك الآن.', kind: 'nuna', icon: 'checkmark-circle' },
  error: { title: 'تعذّر التحقّق من الاشتراك', text: 'لم نستطع تأكيد الحالة. حاول التحقّق مرة أخرى.', kind: 'rami', icon: 'alert-circle' },
};

export default function WebMembership(props: Props) {
  const { state, priceLabel, busy, verifyBusy, cancelBusy, message, cancelAtPeriodEnd, periodEnd, canInstall, installHelp } = props;
  const p = usePlay();
  const h = props.complimentary ? { ...HEAD.active, title: 'وصولك الكامل مفعّل' } : HEAD[state];
  const tint = state === 'active' ? p.successSoft : state === 'error' ? p.coralSoft : state === 'pending' ? p.sunSoft : p.skySoft;
  const edge = state === 'active' ? p.successShade : state === 'error' ? p.coralShade : state === 'pending' ? p.sunShade : p.skyShade;

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={s.page}>
      <View style={s.wrap}>
        <View style={s.nav}>
          <Text style={[s.logo, { color: p.brandShade }]}>YAEL</Text>
          <Pressable testID="web-account" accessibilityRole="button" onPress={props.onAccount} style={s.ghost}>
            <Text style={[s.bold, { color: p.foreground }]}>حسابي</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={props.onSignOut} style={[s.ghost, { borderColor: p.border, backgroundColor: p.card }]}>
            <Text style={[s.bold, { color: p.foreground }]}>تسجيل الخروج</Text>
          </Pressable>
        </View>

        <View style={[s.card, { backgroundColor: tint, borderColor: edge }]}>
          <View style={s.headRow}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Creature kind={h.kind} mood={state === 'active' ? 'hype' : 'happy'} size={96} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <Ionicons name={h.icon} size={22} color={edge} />
                <Text accessibilityRole="header" style={[s.h1, { color: p.foreground }]}>{h.title}</Text>
              </View>
              <Text style={[s.body, { color: p.mutedForeground }]}>{h.text}</Text>
            </View>
          </View>

          {state === 'checking' && <View style={{ gap: 8 }}>
            <View style={[s.sk, { backgroundColor: p.track, width: '70%' }]} />
            <View style={[s.sk, { backgroundColor: p.track, width: '45%' }]} />
          </View>}

          {!!message && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.msg, { backgroundColor: p.card, color: p.foreground, borderColor: p.border }]}>{message}</Text>}

          {state === 'inactive' && <View style={{ gap: 12 }}>
            <View style={[s.priceBox, { backgroundColor: p.card, borderColor: p.border }]}>
              <Text style={[s.small, { color: p.mutedForeground }]}>اشتراك شهري</Text>
              <Text style={[s.price, { color: priceLabel ? p.foreground : p.mutedForeground }]}>{priceLabel ? `${priceLabel} شهريًا` : 'السعر غير متاح حاليًا'}</Text>
              <Text style={[s.small, { color: p.mutedForeground }]}>يتجدّد تلقائيًا كل 30 يومًا حتى تلغيه. لا توجد فترة تجريبية مجانية. الدفع يتم في صفحة دفع آمنة في المتصفح.</Text>
            </View>
            <ChunkyButton testID="web-checkout" label={busy ? 'جارٍ فتح صفحة الدفع…' : props.checkoutEnabled ? 'اشترك الآن' : 'قريبًا — الدفع غير مفعّل'} icon="card" tone="sun"
              disabled={busy || !priceLabel || !props.checkoutEnabled} onPress={props.onCheckout} />
          </View>}

          {(state === 'pending' || state === 'error') &&
            <ChunkyButton testID="web-verify" label={verifyBusy ? 'جارٍ التحقّق…' : 'تحقّق من الدفع'} icon="refresh" disabled={verifyBusy} onPress={props.onVerify} />}

          {state === 'active' && <View style={{ gap: 12 }}>
            {!!periodEnd && <Text style={[s.body, { color: p.foreground }]}>
              {cancelAtPeriodEnd ? `تم إلغاء التجديد. يبقى وصولك حتى ${periodEnd}.` : `يتجدّد اشتراكك تلقائيًا في ${periodEnd}.`}
            </Text>}
            <ChunkyButton testID="web-open-app" label="افتح التدريب" icon="arrow-back" onPress={props.onOpenApp} />
          </View>}
        </View>

        {state === 'active' && <>
          <View style={[s.card, { backgroundColor: p.card, borderColor: p.border }]}>
            <Text style={[s.h2, { color: p.foreground }]}>ثبّت YAEL على جهازك</Text>
            <Text style={[s.body, { color: p.mutedForeground }]}>تطبيق ويب يُضاف إلى شاشتك الرئيسية من المتصفح، وليس تنزيلًا من متجر التطبيقات.</Text>
            {canInstall
              ? <ChunkyButton testID="web-install" label="تثبيت على الجهاز" icon="download" tone="ghost" onPress={props.onInstall} />
              : null}
            {!!installHelp && <Text style={[s.msg, { backgroundColor: p.skySoft, color: p.skyInk, borderColor: p.sky }]}>{installHelp}</Text>}
          </View>
          {!cancelAtPeriodEnd && !props.complimentary && <View style={[s.card, { backgroundColor: p.card, borderColor: p.border }]}>
            <Text style={[s.h2, { color: p.foreground }]}>إدارة الاشتراك</Text>
            <Text style={[s.body, { color: p.mutedForeground }]}>عند الإلغاء يتوقف التجديد، ويبقى وصولك حتى نهاية الفترة المدفوعة.</Text>
            <ChunkyButton testID="web-cancel" label={cancelBusy ? 'جارٍ الإلغاء…' : 'إلغاء التجديد'} tone="coral" disabled={cancelBusy} onPress={props.onCancel} />
          </View>}
        </>}

        <View style={[s.footer, { borderColor: p.border }]}>
          <Pressable accessibilityRole="link" onPress={props.onPrivacy}><Text style={[s.link, { color: p.mutedForeground }]}>سياسة الخصوصية</Text></Pressable>
          <Pressable accessibilityRole="link" onPress={props.onTerms}><Text style={[s.link, { color: p.mutedForeground }]}>شروط الاستخدام</Text></Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const rtl = { textAlign: 'right' as const, writingDirection: 'rtl' as const };
const s = StyleSheet.create({
  page: { padding: 16, alignItems: 'center' },
  wrap: { width: '100%', maxWidth: 620, gap: 16 },
  nav: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 24, letterSpacing: 3 },
  ghost: { minHeight: 44, borderWidth: 2, borderBottomWidth: 4, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' },
  bold: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 14, ...rtl },
  card: { borderWidth: 2, borderBottomWidth: 6, borderRadius: 26, padding: 18, gap: 14 },
  headRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  h1: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 22, lineHeight: 36, flexShrink: 1, ...rtl },
  h2: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 19, lineHeight: 32, ...rtl },
  body: { fontSize: 15, lineHeight: 26, ...rtl },
  small: { fontSize: 13, lineHeight: 22, ...rtl },
  price: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 26, lineHeight: 42, ...rtl },
  priceBox: { borderWidth: 2, borderRadius: 18, padding: 14, gap: 4 },
  sk: { height: 16, borderRadius: 8, alignSelf: 'flex-end' },
  msg: { borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 14, lineHeight: 24, overflow: 'hidden', ...rtl },
  footer: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 24, borderTopWidth: 1, paddingVertical: 14 },
  link: { fontSize: 14, textDecorationLine: 'underline', paddingVertical: 10 },
});
