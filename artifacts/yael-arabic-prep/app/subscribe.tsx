import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { useAuth, useClerk, useUser } from '@clerk/expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { cancelBillingSubscription, createBillingCheckout, getBillingCatalog, getBillingStatus, getStudyPlanAccess } from '@workspace/api-client-react';
import WebMembership from '@/components/WebMembership';
import { useWebInstall } from '@/lib/WebInstall';
import { getStudyAuthOptions } from '@/lib/study-auth';
import { useColors } from '@/hooks/useColors';
import { billingScreenState, hostedCheckoutUrl } from '@/lib/billing-flow';

export function MembershipPage({ returning = false }: { returning?: boolean }) {
  const { userId } = useAuth();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.verification.status === 'verified'
    ? user.primaryEmailAddress.emailAddress : undefined;
  const clerk = useClerk();
  const router = useRouter();
  const client = useQueryClient();
  const palette = useColors();
  const install = useWebInstall();
  const [busy, setBusy] = useState(false);
  const checkoutInFlight = useRef(false);
  const openingInFlight = useRef(false);
  const autoOpenedFor = useRef<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [waitingForReturn, setWaitingForReturn] = useState(returning);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pollUntil] = useState(() => Date.now() + 60_000);
  useEffect(() => {
    setWaitingForReturn(returning);
    if (!returning) return;
    const timer = setTimeout(() => setWaitingForReturn(false), 15_000);
    return () => clearTimeout(timer);
  }, [returning, userId]);
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
  useEffect(() => {
    if (Platform.OS !== 'web' || !userId) return;
    // Also recover when Safari returns from checkout without following its redirect.
    let lastCheck = 0;
    const checkOnReturn = () => {
      if (document.visibilityState === 'hidden' || Date.now() - lastCheck < 2000) return;
      lastCheck = Date.now();
      void status.refetch();
    };
    window.addEventListener('focus', checkOnReturn);
    document.addEventListener('visibilitychange', checkOnReturn);
    return () => {
      window.removeEventListener('focus', checkOnReturn);
      document.removeEventListener('visibilitychange', checkOnReturn);
    };
  }, [userId, status.refetch]);
  const checkout = async (useAccountEmail = true) => {
    if (checkoutInFlight.current || status.isFetching || status.isError
      || status.data?.state !== 'inactive' || !catalog.data?.checkoutEnabled) return;
    checkoutInFlight.current = true;
    setBusy(true); setMessage(undefined);
    try {
      const result = await createBillingCheckout(await options());
      const url = hostedCheckoutUrl(result.purchaseUrl, useAccountEmail ? email : undefined);
      if (Platform.OS === 'web') window.location.assign(url);
    } catch {
      setMessage('تعذّر فتح صفحة الدفع. تحقّق من حالة اشتراكك قبل المحاولة مرة أخرى؛ لا تضغط للدفع مجددًا إذا كنت قد أتممته.');
      void status.refetch();
    } finally { checkoutInFlight.current = false; setBusy(false); }
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
  const openApp = useCallback(async () => {
    if (openingInFlight.current) return;
    openingInFlight.current = true;
    setOpening(true);
    try {
      const access = await getStudyPlanAccess(await options());
      client.setQueryData(['plan-access', userId], access);
      if (access.plan === 'premium') router.replace('/(tabs)');
      else setMessage('لم يتأكّد الوصول الكامل بعد. تحقّق من الدفع مرة أخرى.');
    } catch { setMessage('تعذّر تأكيد الوصول. أعد المحاولة بعد التأكّد من اتصالك.'); }
    finally { openingInFlight.current = false; setOpening(false); }
  }, [options, client, userId, router]);
  useEffect(() => {
    if (returning && active && userId && autoOpenedFor.current !== userId) {
      autoOpenedFor.current = userId;
      void openApp();
    }
  }, [returning, active, userId, openApp]);
  const verify = async () => {
    setMessage(undefined);
    const checked = await status.refetch();
    if (checked.data?.state === 'active' && !checked.isError) {
      void openApp();
    } else if (checked.data?.state === 'inactive' && !checked.isError) {
      setWaitingForReturn(false);
      setMessage('لم يظهر اشتراك فعّال بعد. إذا خُصم المبلغ، لا تدفع مرة ثانية؛ انتظر قليلًا ثم تحقّق مجددًا.');
    }
  };
  const state = billingScreenState(status.data?.state, status.isPending, status.isError, waitingForReturn);
  return <>
    <WebMembership
      state={state} priceLabel={catalog.data?.priceLabel ?? null}
      checkoutEnabled={catalog.data?.checkoutEnabled ?? false}
      busy={busy} opening={opening} verifyBusy={status.isFetching} cancelBusy={cancelBusy}
      email={email}
      message={message ?? (status.data?.complimentary ? 'لديك وصول كامل مجاني من الإدارة. لا توجد دفعات أو تجديد تلقائي لهذا الوصول.'
        : catalog.data && !catalog.data.checkoutEnabled ? 'إعداد الدفع قيد الإكمال. لن نطلب منك الدفع قبل تفعيل صفحة الدفع الآمنة.'
        : returning && !active ? waitingForReturn || status.data?.state === 'pending'
          ? 'نتحقّق من الدفع تلقائيًا. سيُفتح تدريبك فور تأكيد اشتراكك.'
          : 'لم نتلقَّ تأكيدًا للدفع بعد. إن لم تُكمل الدفع، يمكنك العودة إلى صفحة الدفع نفسها. إذا خُصم المبلغ، تحقّق بدل الدفع مجددًا.'
        : undefined)}
      complimentary={status.data?.complimentary ?? false}
      cancelAtPeriodEnd={status.data?.cancelAtPeriodEnd ?? false}
      periodEnd={status.data?.periodEnd ? new Date(status.data.periodEnd).toLocaleDateString('ar') : null}
      canInstall={active && install.canInstall}
      installHelp={install.help}
      onCheckout={useAccountEmail => void checkout(useAccountEmail)} onVerify={() => void verify()}
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
