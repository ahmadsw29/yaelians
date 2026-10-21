import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { useAuth, useClerk } from '@clerk/expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { cancelBillingSubscription, createBillingCheckout, getBillingCatalog, getBillingStatus, getStudyPlanAccess } from '@workspace/api-client-react';
import WebMembership from '@/components/WebMembership';
import { useWebInstall } from '@/lib/WebInstall';
import { getStudyAuthOptions } from '@/lib/study-auth';
import { useColors } from '@/hooks/useColors';

export function MembershipPage({ returning = false }: { returning?: boolean }) {
  const { userId } = useAuth();
  const clerk = useClerk();
  const router = useRouter();
  const client = useQueryClient();
  const palette = useColors();
  const install = useWebInstall();
  const [busy, setBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pollUntil] = useState(() => Date.now() + 60_000);
  const options = useCallback(() => getStudyAuthOptions(() => clerk.session ?? null, userId ?? null, () => true), [clerk, userId]);
  const catalog = useQuery({ queryKey: ['billing-catalog'], queryFn: () => getBillingCatalog(), retry: false });
  const status = useQuery({
    queryKey: ['web-subscription', userId], enabled: !!userId, retry: false,
    queryFn: async ({ signal }) => getBillingStatus({ ...await options(), signal }),
    refetchInterval: query => returning && query.state.data?.state !== 'active' && Date.now() < pollUntil ? 3000 : false,
  });
  useEffect(() => {
    if (status.data) void client.invalidateQueries({ queryKey: ['plan-access', userId] });
  }, [status.data, client, userId]);
  const checkout = async () => {
    if (busy) return;
    setBusy(true); setMessage(undefined);
    try {
      const result = await createBillingCheckout(await options());
      const url = new URL(result.purchaseUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'whop.com') throw new Error('Invalid checkout destination');
      if (Platform.OS === 'web') window.location.assign(url.toString());
    } catch {
      setMessage('تعذّر فتح صفحة الدفع. تحقّق من حالة اشتراكك قبل المحاولة مرة أخرى؛ لا تضغط للدفع مجددًا إذا كنت قد أتممته.');
      void status.refetch();
    } finally { setBusy(false); }
  };
  const cancel = async () => {
    if (cancelBusy) return;
    setCancelBusy(true);
    try {
      const result = await cancelBillingSubscription(await options());
      client.setQueryData(['web-subscription', userId], result);
      setMessage('تم إيقاف التجديد التلقائي. يبقى وصولك متاحًا حتى نهاية المدة المدفوعة.');
      setConfirm(false);
    } catch { setMessage('لم يتأكد إلغاء التجديد. أعد المحاولة؛ لا تعتبر الاشتراك ملغيًا حتى يظهر التأكيد.'); }
    finally { setCancelBusy(false); }
  };
  const active = status.data?.state === 'active';
  const openApp = async () => {
    try {
      const access = await getStudyPlanAccess(await options());
      client.setQueryData(['plan-access', userId], access);
      if (access.plan === 'premium') router.replace('/(tabs)');
      else setMessage('لم يتأكّد الوصول الكامل بعد. تحقّق من الدفع مرة أخرى.');
    } catch { setMessage('تعذّر تأكيد الوصول. أعد المحاولة بعد التأكّد من اتصالك.'); }
  };
  const state = status.isPending ? 'checking' : status.isError ? 'error'
    : active ? 'active' : returning ? 'pending' : status.data?.state ?? 'inactive';
  return <>
    <WebMembership
      state={state} priceLabel={catalog.data?.checkoutEnabled ? catalog.data.priceLabel : null}
      busy={busy} verifyBusy={status.isFetching} cancelBusy={cancelBusy}
      message={message ?? (status.data?.complimentary ? 'لديك وصول كامل مجاني من الإدارة. لا توجد دفعات أو تجديد تلقائي لهذا الوصول.'
        : catalog.data && !catalog.data.checkoutEnabled ? 'إعداد الدفع قيد الإكمال. لن نطلب منك الدفع قبل تفعيل صفحة الدفع الآمنة.'
        : returning && !active ? 'العودة من صفحة الدفع لا تثبت الشراء. نتحقّق من Whop قبل فتح التطبيق.'
        : undefined)}
      complimentary={status.data?.complimentary ?? false}
      cancelAtPeriodEnd={status.data?.cancelAtPeriodEnd ?? false}
      periodEnd={status.data?.periodEnd ? new Date(status.data.periodEnd).toLocaleDateString('ar') : null}
      canInstall={active && install.canInstall}
      installHelp={install.help}
      onCheckout={() => void checkout()} onVerify={() => void status.refetch()}
      onOpenApp={() => void openApp()} onInstall={() => { if (active) void install.install(); }}
      onAccount={() => router.push('/(tabs)/profile')}
      onCancel={() => setConfirm(true)} onSignOut={() => void clerk.signOut()}
      onPrivacy={() => router.push('/web-policy?section=privacy')}
      onTerms={() => router.push('/web-policy?section=terms')}
    />
    {returning && !active && <Pressable onPress={() => router.replace('/subscribe')} style={{ padding: 18, backgroundColor: palette.background }}><Text style={{ color: palette.primary, textAlign: 'center' }}>العودة إلى صفحة الاشتراك</Text></Pressable>}
    <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => !cancelBusy && setConfirm(false)}>
      <View style={{ flex: 1, backgroundColor: '#0009', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 440, padding: 24, borderRadius: 24, backgroundColor: palette.card, gap: 20 }}>
          <Text style={{ fontSize: 22, color: palette.foreground, textAlign: 'right' }}>إيقاف التجديد التلقائي؟</Text>
          <Text style={{ color: palette.foreground, textAlign: 'right', lineHeight: 25 }}>لن يتجدد الاشتراك. ستظل قادرًا على استخدام الدورات والتدريب حتى نهاية المدة المدفوعة. هذا لا يطلب استرداد الدفعات السابقة.</Text>
          <Pressable testID="web-confirm-cancel" disabled={cancelBusy} onPress={() => void cancel()}><Text style={{ color: palette.destructive, textAlign: 'center', padding: 12 }}>{cancelBusy ? 'جارٍ التأكيد…' : 'نعم، أوقف التجديد'}</Text></Pressable>
          <Pressable disabled={cancelBusy} onPress={() => setConfirm(false)}><Text style={{ color: palette.primary, textAlign: 'center', padding: 12 }}>احتفظ باشتراكي</Text></Pressable>
        </View>
      </View>
    </Modal>
  </>;
}
export default MembershipPage;
