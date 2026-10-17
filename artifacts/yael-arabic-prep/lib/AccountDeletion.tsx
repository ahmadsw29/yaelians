import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Modal, Text, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useClerk } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { deleteMyAccount } from '@workspace/api-client-react';
import { AuthButton, AuthField, authError } from '@/components/AuthScreen';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { deletionIntentKey, finishLocalDeletion, readDeletionIntents, saveDeletionIntent, type DeletionIntent } from './deletionStorage';

type Pause = () => Promise<() => void>;
type Session = NonNullable<ReturnType<typeof useClerk>['session']>;
type Verification = Awaited<ReturnType<Session['startVerification']>>;
type Factor = 'password' | 'email_code' | 'phone_code' | 'totp' | 'backup_code';
type Target = { userId: string; session: Session; pause: Pause };
const Context = createContext<(pause: Pause) => void>(() => {});
export const useAccountDeletion = () => useContext(Context);

// Outside the keyed study/navigation tree: provider revocation must not unmount
// cleanup or hide a retryable local-storage/sign-out failure.
export function AccountDeletionProvider({ children }: { children: React.ReactNode }) {
  const clerk = useClerk();
  const client = useQueryClient();
  const colors = useColors();
  const [target, setTarget] = useState<Target | null>(null);
  const [stage, setStage] = useState<'confirm' | 'verify' | 'ready' | 'cleanup'>('confirm');
  const [confirmation, setConfirmation] = useState('');
  const [credential, setCredential] = useState('');
  const [factor, setFactor] = useState<Factor>('password');
  const [secondFactor, setSecondFactor] = useState(false);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const resume = useRef<(() => void) | null>(null);
  const deletionStarted = useRef(false);
  const retryToken = useRef<string | null>(null);
  const intent = useRef<DeletionIntent | null>(null);
  const [recovering, setRecovering] = useState(true);
  const [recoveryError, setRecoveryError] = useState('');
  const [uncertain, setUncertain] = useState<DeletionIntent[]>([]);

  const finishIntent = async (record: DeletionIntent) => {
    await finishLocalDeletion(AsyncStorage, record, async item => {
      await client.cancelQueries({ queryKey: ['study', item.userId], exact: true });
      client.removeQueries({ queryKey: ['study', item.userId], exact: true });
      // On restart the same account may have a new session; never sign out
      // another account. The matching account must not recreate erased data.
      if (clerk.user?.id === item.userId && clerk.session) {
        await clerk.signOut({ sessionId: clerk.session.id });
      }
    });
  };
  const recover = async () => {
    setRecoveryError('');
    try {
      const records = await readDeletionIntents(AsyncStorage);
      for (const record of records) await finishIntent(record);
      setUncertain(records.filter(record => record.status === 'unconfirmed'));
      setRecovering(false);
    } catch (e) { setRecoveryError(authError(e)); }
  };
  useEffect(() => {
    if (clerk.loaded) void recover();
  }, [clerk.loaded]);

  const assertAccount = () => {
    if (!target || clerk.session?.id !== target.session.id || clerk.user?.id !== target.userId) {
      throw new Error('تغيّر الحساب. أغلقي النافذة وافتحيها من الحساب المطلوب.');
    }
    return target;
  };
  const run = async (work: () => Promise<void>) => {
    if (working.current) return;
    working.current = true; setBusy(true); setError('');
    try { await work(); }
    catch (e) { setError(authError(e)); }
    finally { working.current = false; setBusy(false); }
  };
  const close = () => {
    if (working.current || deletionStarted.current || stage === 'cleanup') return;
    resume.current?.(); resume.current = null;
    setTarget(null); setCredential(''); setConfirmation(''); setError('');
  };
  const showVerification = async (verification: Verification) => {
    const { session } = assertAccount();
    setCredential('');
    if (verification.status === 'complete') { setStage('ready'); return; }
    const second = verification.status === 'needs_second_factor';
    setSecondFactor(second);
    if (second) {
      const factors = verification.supportedSecondFactors ?? [];
      const totp = factors.find(f => f.strategy === 'totp');
      const phone = factors.find(f => f.strategy === 'phone_code');
      if (totp) { setFactor('totp'); setHint('أدخلي رمز تطبيق المصادقة.'); }
      else if (phone) {
        await session.prepareSecondFactorVerification({ strategy: 'phone_code', phoneNumberId: phone.phoneNumberId });
        setFactor('phone_code'); setHint(`أُرسل رمز إلى ${phone.safeIdentifier}`);
      } else if (factors.some(f => f.strategy === 'backup_code')) {
        setFactor('backup_code'); setHint('أدخلي رمز استرداد المصادقة.');
      } else throw new Error('طريقة التحقق المطلوبة غير مدعومة هنا. لم يُحذف الحساب. تواصلي مع دعم التطبيق.');
    } else {
      const factors = verification.supportedFirstFactors ?? [];
      const email = factors.find(f => f.strategy === 'email_code');
      const phone = factors.find(f => f.strategy === 'phone_code');
      if (factors.some(f => f.strategy === 'password')) {
        setFactor('password'); setHint('أدخلي كلمة المرور للتحقق من هويتك.');
      } else if (email) {
        await session.prepareFirstFactorVerification({ strategy: 'email_code', emailAddressId: email.emailAddressId });
        setFactor('email_code'); setHint(`أُرسل رمز إلى ${email.safeIdentifier}`);
      } else if (phone) {
        await session.prepareFirstFactorVerification({ strategy: 'phone_code', phoneNumberId: phone.phoneNumberId });
        setFactor('phone_code'); setHint(`أُرسل رمز إلى ${phone.safeIdentifier}`);
      } else throw new Error('طريقة التحقق المطلوبة غير مدعومة هنا. لم يُحذف الحساب. تواصلي مع دعم التطبيق.');
    }
    setStage('verify');
  };
  const startVerification = async () => {
    const { session } = assertAccount();
    await showVerification(await session.startVerification({ level: 'multi_factor' }));
  };
  const verify = async () => {
    const { session } = assertAccount();
    const result = secondFactor
      ? await session.attemptSecondFactorVerification({ strategy: factor as 'totp' | 'phone_code' | 'backup_code', code: credential.trim() })
      : factor === 'password'
        ? await session.attemptFirstFactorVerification({ strategy: 'password', password: credential })
        : await session.attemptFirstFactorVerification({ strategy: factor as 'email_code' | 'phone_code', code: credential.trim() });
    await showVerification(result);
  };
  const cleanup = async () => {
    if (!intent.current) return;
    await finishIntent(intent.current);
    if (intent.current.status === 'unconfirmed') setUncertain([intent.current]);
    deletionStarted.current = false;
    setTarget(null); setCredential(''); setConfirmation('');
    intent.current = null;
    router.replace('/');
  };
  const remove = async () => {
    const current = deletionStarted.current && target ? target : assertAccount();
    if (clerk.user && clerk.user.id !== current.userId) throw new Error('تغيّر الحساب. لم يُرسل طلب جديد.');
    if (confirmation.trim() !== 'حذف') throw new Error('اكتبي حذف للتأكيد.');
    resume.current ??= await current.pause();
    const token = deletionStarted.current && retryToken.current
      ? retryToken.current : await current.session.getToken({ skipCache: true });
    if (!token) throw new Error('انتهت الجلسة. سجّلي الدخول مجددًا.');
    if (!deletionStarted.current) assertAccount();
    // From this point an interrupted request may have succeeded on the server.
    // Keep the dialog open for retry rather than claiming the account survived.
    const wasUnconfirmed = deletionStarted.current;
    // Persist BEFORE the network side effect. After a crash, navigation/study
    // stay unmounted until this account's device data has been purged.
    intent.current = { userId: current.userId, sessionId: current.session.id, status: 'unconfirmed' };
    await saveDeletionIntent(AsyncStorage, intent.current);
    deletionStarted.current = true;
    retryToken.current = token;
    try {
      await deleteMyAccount({ headers: { Authorization: `Bearer ${token}` }, credentials: 'omit' });
    } catch (e) {
      const status = e && typeof e === 'object' && 'status' in e ? e.status : null;
      if (!wasUnconfirmed && (status === 403 || status === 401)) {
        await AsyncStorage.removeItem(deletionIntentKey(current.userId));
        intent.current = null;
        deletionStarted.current = false;
        resume.current?.(); resume.current = null;
        setStage('confirm');
        throw new Error('يلزم التحقق من هويتك مجددًا قبل الحذف.');
      }
      // A lost response (or a later expired/revoked-token rejection) says
      // nothing about the first request. Never offer "keep my account" here.
      setStage('cleanup');
      await cleanup();
      return;
    }
    setStage('cleanup');
    intent.current = { ...intent.current, status: 'accepted' };
    await saveDeletionIntent(AsyncStorage, intent.current);
    await cleanup();
  };
  return <Context.Provider value={pause => {
    if (working.current || target || !clerk.session || !clerk.user) return;
    deletionStarted.current = false; resume.current = null;
    retryToken.current = null;
    setStage('confirm'); setError(''); setConfirmation(''); setCredential('');
    setTarget({ userId: clerk.user.id, session: clerk.session, pause });
  }}>
    {/* Recovery blocks study hydration and outbox flushes until device erasure
        completes, including when the deleted session no longer exists. */}
    {recovering ? <View style={[styles.page, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.foreground }]}>جارٍ التحقق من طلبات مسح البيانات السابقة…</Text>
      {!!recoveryError && <>
        <Text accessibilityRole="alert" style={[styles.text, { color: colors.destructive }]}>{recoveryError}</Text>
        <AuthButton title="إعادة محاولة مسح البيانات" onPress={() => void recover()} />
      </>}
    </View> : children}
    <Modal visible={!recovering && uncertain.length > 0} animationType="slide" onRequestClose={() => {}}>
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.destructive }]}>حالة حذف الحساب غير مؤكّدة</Text>
        <Text testID="delete-uncertain-notice" style={[styles.text, { color: colors.foreground }]}>تم مسح بيانات الحساب من هذا الجهاز وتسجيل الخروج. انقطع تأكيد الطلب، لذلك لا يمكننا تأكيد حذف الحساب السحابي أو إلغاء الحذف. إذا كان الحساب ما زال موجودًا، سجّلي الدخول وأعيدي طلب الحذف بعد التحقق من هويتك. الطلب الذي قَبِله الخادم سيكتمل تلقائيًا.</Text>
        {!!error && <Text accessibilityRole="alert" style={[styles.text, { color: colors.destructive }]}>{error}</Text>}
        <AuthButton testID="delete-acknowledge-uncertain" title="فهمت، العودة للرئيسية" disabled={busy} onPress={() => void run(async () => {
          for (const record of uncertain) await AsyncStorage.removeItem(deletionIntentKey(record.userId));
          setUncertain([]); router.replace('/');
        })} />
      </View>
    </Modal>
    <Modal visible={!!target} animationType="slide" onRequestClose={close}>
      <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.page, { backgroundColor: colors.background }]} style={{ backgroundColor: colors.background }}>
        <Text style={[styles.title, { color: colors.destructive }]}>حذف الحساب نهائيًا</Text>
        <Text style={[styles.text, { color: colors.foreground }]}>
          سيُحذف حسابك وملفك وشخصيتك الكرتونية والتقدّم السحابي نهائيًا. سنحذف أيضًا إعدادات هذا الحساب والدروس غير المتزامنة والامتحان المحفوظ على هذا الجهاز. لا يمكن التراجع بعد تأكيد الطلب. إذا انقطع تأكيد الاتصال، سيُستكمل مسح هذا الجهاز عند فتح التطبيق، وقد تحتاجين إلى إعادة طلب الحذف السحابي. الطلب الذي قَبِله الخادم سيكتمل تلقائيًا. لن تتأثر حسابات الآخرين أو بيانات الضيف. قد تبقى نسخ محلية على أجهزتك الأخرى؛ امسحي بيانات التطبيق عليها.
        </Text>
        {stage === 'confirm' && <>
          <AuthField testID="delete-confirmation" label="اكتبي حذف للتأكيد" value={confirmation} onChangeText={setConfirmation} editable={!busy} textAlign="right" />
          <AuthButton testID="delete-verify-identity" title="التحقق من هويتي" disabled={busy || confirmation.trim() !== 'حذف'} onPress={() => void run(startVerification)} />
        </>}
        {stage === 'verify' && <>
          <Text style={[styles.text, { color: colors.foreground }]}>{hint}</Text>
          <AuthField testID="delete-credential" label={factor === 'password' ? 'كلمة المرور' : 'رمز التحقق'} secureTextEntry={factor === 'password'} value={credential} onChangeText={setCredential} editable={!busy} />
          <AuthButton testID="delete-submit-verification" title="تأكيد الهوية" disabled={busy || !credential} onPress={() => void run(verify)} />
          <AuthButton title="إعادة بدء التحقق / إرسال رمز جديد" secondary disabled={busy} onPress={() => void run(startVerification)} />
        </>}
        {stage === 'ready' && <AuthButton testID="delete-account-permanently" title={busy ? 'جارٍ حذف الحساب…' : 'حذف حسابي وبياناتي نهائيًا'} disabled={busy} onPress={() => void run(remove)} />}
        {stage === 'cleanup' && <>
          <Text style={[styles.text, { color: colors.foreground }]}>{intent.current?.status === 'accepted'
            ? 'تم تأكيد طلب الحذف الدائم وسيكتمل حذف الحساب والتقدّم السحابي تلقائيًا. نُكمل الآن مسح بيانات هذا الجهاز وتسجيل الخروج.'
            : 'تعذّر تأكيد الطلب السحابي. قد يكون الحذف بدأ بالفعل. نُكمل مسح هذا الجهاز؛ لا يمكننا إلغاء الطلب السابق.'}</Text>
          <AuthButton testID="delete-retry-cleanup" title="إكمال المسح وتسجيل الخروج" disabled={busy} onPress={() => void run(cleanup)} />
        </>}
        {!!error && <Text accessibilityRole="alert" style={[styles.text, { color: colors.destructive }]}>{error}</Text>}
        {!deletionStarted.current && stage !== 'cleanup' && <AuthButton testID="delete-cancel" title="إلغاء، الاحتفاظ بحسابي" secondary disabled={busy} onPress={close} />}
        <View style={{ height: 30 }} />
      </KeyboardAwareScrollViewCompat>
    </Modal>
  </Context.Provider>;
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 70, paddingBottom: 40, gap: 24 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'right' },
  text: { fontSize: 15, lineHeight: 26, textAlign: 'right' },
});
