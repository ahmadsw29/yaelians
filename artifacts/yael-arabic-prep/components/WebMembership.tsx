import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChunkyButton, usePlay } from '@/components/Playful';
import { Creature, type CreatureKind } from '@/components/PetTeacher';
import { Enter } from '@/components/EntranceMotion';
import { PublicPolicyLinks } from '@/components/PublicPolicyLinks';
import { ARABIC_BOLD_FONT } from '@/constants/typography';

type State = 'checking' | 'inactive' | 'pending' | 'active' | 'error';
type Props = {
  complimentary?: boolean;
  email?: string;
  opening?: boolean;
  checkoutEnabled: boolean;
  state: State; priceLabel: string | null; busy: boolean; verifyBusy: boolean; cancelBusy: boolean; message?: string;
  cancelAtPeriodEnd: boolean; periodEnd: string | null; canInstall: boolean; installHelp?: string;
  onCheckout: (useAccountEmail?: boolean) => void; onVerify: () => void; onOpenApp: () => void; onInstall: () => void; onCancel: () => void;
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [useAccountEmail, setUseAccountEmail] = useState(true);
  const { state, priceLabel, busy, verifyBusy, cancelBusy, message, cancelAtPeriodEnd, periodEnd, canInstall, installHelp } = props;
  const p = usePlay();
  const h = props.complimentary ? { ...HEAD.active, title: 'وصولك الكامل مفعّل' }
    : state === 'inactive' && !props.checkoutEnabled
      ? { ...HEAD.inactive, title: 'الاشتراكات الجديدة متوقفة', text: 'لا نقبل دفعات جديدة حاليًا. يمكنك التحقّق من اشتراك سابق أدناه.' }
      : HEAD[state];
  const tint = state === 'active' ? p.successSoft : state === 'error' ? p.coralSoft : state === 'pending' ? p.sunSoft : p.skySoft;
  const edge = state === 'active' ? p.successShade : state === 'error' ? p.coralShade : state === 'pending' ? p.sunShade : p.skyShade;

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={s.page}>
      <View style={s.wrap}>
        <Enter><View style={[s.nav, { backgroundColor: p.card, borderColor: p.border }]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={[s.mark, { backgroundColor: p.brand }]}><Text style={[s.bold, { color: p.onBrand, fontSize: 17 }]}>Y</Text></View>
            <Text style={[s.logo, { color: p.foreground, letterSpacing: 0.4, fontSize: 20 }]}>Yaelians</Text>
          </View>
          <Pressable testID="web-account" accessibilityRole="button" onPress={props.onAccount} style={s.ghost}>
            <Text style={[s.bold, { color: p.foreground }]}>حسابي</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={props.onSignOut} style={[s.ghost, { borderColor: p.border, backgroundColor: p.card }]}>
            <Text style={[s.bold, { color: p.foreground }]}>تسجيل الخروج</Text>
          </Pressable>
        </View></Enter>

        <Enter delay={90}><View style={[s.card, s.hero, { backgroundColor: tint, borderColor: edge }]}>
          <View pointerEvents="none" style={[s.orb, { backgroundColor: edge, opacity: p.isDark ? 0.18 : 0.1 }]} />
          <View style={s.headRow}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Creature kind={h.kind} mood={state === 'active' ? 'hype' : 'happy'} size={92} />
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
            {props.checkoutEnabled && <>
            <View style={[s.priceBox, { backgroundColor: p.card, borderColor: p.border }]}>
              <Text style={[s.small, { color: p.mutedForeground }]}>اشتراك شهري</Text>
              <Text style={[s.price, { color: priceLabel ? p.foreground : p.mutedForeground }]}>{priceLabel ? `${priceLabel} شهريًا` : 'السعر غير متاح حاليًا'}</Text>
              <Text style={[s.small, { color: p.mutedForeground }]}>كل الدورات والنماذج، وتدريب بلا حدود.</Text>
              <Text style={[s.small, { color: p.mutedForeground }]}>يتجدّد كل 30 يومًا حتى تلغيه. لا توجد فترة تجريبية مجانية.</Text>
            </View>
            <ChunkyButton testID="web-checkout" label={busy ? 'جارٍ فتح الدفع الآمن…' : props.checkoutEnabled ? `اشترك بـ ${priceLabel ?? '…'} شهريًا` : 'الدفع غير مفعّل حاليًا'} icon="card" tone="sun"
              disabled={busy || verifyBusy || !priceLabel || !props.checkoutEnabled} onPress={() => props.onCheckout(useAccountEmail)} />
            {props.checkoutEnabled && <View testID="web-wallet-guidance" style={[s.receipt, { backgroundColor: p.card }]}>
              <Ionicons name="wallet-outline" size={24} color={p.foreground} />
              <Text style={[s.small, { flex: 1, color: p.foreground }]}>للدفع بأقل كتابة، اختَر Apple Pay أو Google Pay إن ظهر في صفحة Whop. إذا لم يتوفّر لجهازك أو بطاقتك، يمكنك الدفع بالبطاقة.</Text>
            </View>}
            <Text style={[s.small, { color: p.mutedForeground }]}>ستكمل الدفع الآمن، ثم نعيدك إلى تدريبك تلقائيًا. بيانات البطاقة لا تُحفظ في التطبيق.</Text>
            {!!props.email && <Pressable testID="web-use-account-email" accessibilityRole="checkbox"
              accessibilityLabel="عبّئ بريد حسابي تلقائيًا في صفحة الدفع"
              aria-checked={useAccountEmail}
              accessibilityState={{ checked: useAccountEmail, disabled: busy || verifyBusy }}
              disabled={busy || verifyBusy} onPress={() => setUseAccountEmail(value => !value)}
              style={[s.receipt, { backgroundColor: p.card, minHeight: 44 }]}>
              <Ionicons name={useAccountEmail ? 'checkbox' : 'square-outline'} size={24} color={p.foreground} />
              <View style={{ flex: 1 }}>
                <Text style={[s.small, { color: p.foreground }]}>{useAccountEmail ? 'عبّئ بريد حسابي تلقائيًا في صفحة الدفع' : 'سأدخل بريدًا آخر في صفحة الدفع'}</Text>
                <Text testID="web-payment-email" selectable style={{ color: p.foreground, fontSize: 14, textAlign: 'right' }}>{props.email}</Text>
                <Text style={[s.small, { color: p.mutedForeground }]}>للدفع ببريد مختلف، أزِل علامة الاختيار قبل المتابعة.</Text>
              </View>
            </Pressable>}
            </>}
            <Pressable testID="web-already-paid" accessibilityRole="button" disabled={verifyBusy || busy} onPress={props.onVerify} style={s.helpButton}>
              <Text style={[s.bold, { color: p.brandShade }]}>{verifyBusy ? 'جارٍ التحقّق…' : 'دفعت بالفعل؟ تحقّق من اشتراكك'}</Text>
            </Pressable>
          </View>}

          {(state === 'pending' || state === 'error') &&
            <ChunkyButton testID="web-verify" label={verifyBusy ? 'جارٍ التحقّق…' : 'تحقّق من الدفع'} icon="refresh" disabled={verifyBusy} onPress={props.onVerify} />}

          {state === 'active' && <View style={{ gap: 12 }}>
            {!!periodEnd && <Text style={[s.body, { color: p.foreground }]}>
              {cancelAtPeriodEnd ? `تم إلغاء التجديد. يبقى وصولك حتى ${periodEnd}.` : `يتجدّد اشتراكك تلقائيًا في ${periodEnd}.`}
            </Text>}
            <ChunkyButton testID="web-open-app" label={props.opening ? 'جارٍ فتح تدريبك…' : 'افتح التدريب'} disabled={props.opening} icon="arrow-back" onPress={props.onOpenApp} />
          </View>}
        </View></Enter>

        {state !== 'active' && <Enter delay={170}><View style={[s.help, { backgroundColor: p.card, borderColor: p.border }]}>
          <Pressable testID="web-payment-help" accessibilityRole="button" accessibilityState={{ expanded: helpOpen }} onPress={() => setHelpOpen(value => !value)} style={s.helpButton}>
            <Ionicons name={helpOpen ? 'chevron-up' : 'help-circle-outline'} size={22} color={p.brandShade} />
            <Text style={[s.bold, { color: p.foreground }]}>تحتاج مساعدة في الدفع؟</Text>
          </Pressable>
          {helpOpen && <View testID="web-payment-help-content" style={{ gap: 10 }}>
            <Text style={[s.body, { color: p.foreground }]}>• اختَر Apple Pay أو Google Pay إن ظهر أحدهما في صفحة الدفع لتقليل الكتابة. التوفّر يعتمد على الجهاز والبطاقة.</Text>
            <Text style={[s.body, { color: p.foreground }]}>• إذا طلب البنك تأكيدًا، أكمِله في تطبيق البنك ثم ارجع لصفحة الدفع.</Text>
            <Text style={[s.body, { color: p.foreground }]}>• رمز الأمان غير صحيح؟ راجع رمز CVC على البطاقة. رفض البنك أو رفض أمني؟ تواصل مع البنك أو جرّب وسيلة دفع أخرى؛ لا تكرّر المحاولة بسرعة.</Text>
            <Text style={[s.body, { color: p.foreground }]}>• إذا خُصم المبلغ ولم يفتح التدريب، تحقّق من اشتراكك بدل أن تدفع مجددًا.</Text>
            <Text style={[s.small, { color: p.mutedForeground }]}>لا ترسل رقم بطاقتك أو رمز الأمان لأي شخص.</Text>
          </View>}
        </View></Enter>}

        {state === 'active' && <Enter delay={170} style={{ gap: 16 }}>
          <View style={[s.card, { backgroundColor: p.card, borderColor: p.border }]}>
            <Text style={[s.h2, { color: p.foreground }]}>ثبّت Yaelians على جهازك</Text>
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
        </Enter>}

        <View style={[s.footer, { borderColor: p.border }]}>
          <PublicPolicyLinks onPrivacy={props.onPrivacy} onTerms={props.onTerms} />
        </View>
      </View>
    </ScrollView>
  );
}

const rtl = { textAlign: 'right' as const, writingDirection: 'rtl' as const };
const s = StyleSheet.create({
  page: { padding: 16, alignItems: 'center' },
  wrap: { width: '100%', maxWidth: 720, gap: 18 },
  nav: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 999, padding: 8 },
  mark: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  hero: { borderWidth: 2, borderBottomWidth: 2, borderRadius: 36, padding: 24, overflow: 'hidden' },
  orb: { position: 'absolute', left: -110, top: -110, width: 300, height: 300, borderRadius: 999 },
  logo: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 24, letterSpacing: 3 },
  ghost: { minHeight: 44, borderWidth: 1, borderColor: 'transparent', borderRadius: 999, paddingHorizontal: 14, justifyContent: 'center' },
  bold: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 14, ...rtl },
  card: { borderWidth: 1, borderRadius: 28, padding: 20, gap: 14 },
  headRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  h1: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 26, lineHeight: 42, flexShrink: 1, ...rtl },
  h2: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 19, lineHeight: 32, ...rtl },
  body: { fontSize: 15, lineHeight: 26, ...rtl },
  small: { fontSize: 13, lineHeight: 22, ...rtl },
  price: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 26, lineHeight: 42, ...rtl },
  priceBox: { borderWidth: 2, borderRadius: 18, padding: 14, gap: 4 },
  receipt: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center', borderRadius: 14, padding: 12 },
  help: { borderWidth: 1, borderRadius: 24, padding: 14, gap: 12 },
  helpButton: { minHeight: 44, flexDirection: 'row-reverse', gap: 8, alignItems: 'center', justifyContent: 'center' },
  sk: { height: 16, borderRadius: 8, alignSelf: 'flex-end' },
  msg: { borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 14, lineHeight: 24, overflow: 'hidden', ...rtl },
  footer: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 24, borderTopWidth: 1, paddingVertical: 14 },
  link: { fontSize: 14, textDecorationLine: 'underline', paddingVertical: 10 },
});
