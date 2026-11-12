import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useAuth, useSignIn, useSignUp, useSSO } from '@clerk/expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { CartoonAvatar } from '@/components/CartoonAvatar';
import { useColors } from '@/hooks/useColors';
import { GlassPressable } from '@/components/Glass';
import { ARABIC_BOLD_FONT, ARABIC_FONT } from '@/constants/typography';
import { play } from '@/constants/colors';

WebBrowser.maybeCompleteAuthSession();

export function authError(error: unknown): string {
  if (error && typeof error === 'object') {
    const data = error as { errors?: { longMessage?: string; message?: string }[]; longMessage?: string; message?: string };
    return data.errors?.[0]?.longMessage || data.errors?.[0]?.message || data.longMessage || data.message || 'تعذّر إتمام الطلب. حاول مرة أخرى.';
  }
  return 'تعذّر الاتصال. تحقّق من الإنترنت وحاول مرة أخرى.';
}

export function AuthField({ label, ...props }: TextInputProps & { label: string }) {
  const colors = useColors();
  return <View style={styles.field}>
    <Text style={[styles.label, { color: colors.isDark ? play.dark.sunInk : colors.primary }]}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor={colors.mutedForeground} autoCapitalize="none" autoCorrect={false}
      {...props} style={[styles.input, { backgroundColor: colors.isDark ? colors.muted : colors.card, borderColor: colors.input, color: colors.foreground }, props.style]} />
  </View>;
}

export function AuthButton({ title, onPress, disabled, secondary, testID }: {
  title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; testID?: string;
}) {
  const colors = useColors();
  const tint = secondary ? undefined : [colors.primary, colors.primaryDeep] as const;
  return <GlassPressable dark={colors.isDark} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} testID={testID} onPress={onPress} disabled={disabled}
    fill={tint} solid={secondary ? colors.secondary : colors.primary} radius={18}
    style={[styles.button, disabled && { opacity: 0.5 }]} contentStyle={styles.buttonInner}>
    <Text style={[styles.buttonText, { color: secondary ? colors.secondaryForeground : colors.primaryForeground }]}>{title}</Text>
  </GlassPressable>;
}

type Mode = 'sign-in' | 'sign-up' | 'reset';
type Step = 'form' | 'signup-code' | 'trust-code' | 'totp' | 'reset-code' | 'new-password' | 'requirements';

export default function AuthScreen({ mode }: { mode: Mode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { signIn, errors: signInErrors, fetchStatus: signInFetch } = useSignIn();
  const { signUp, errors: signUpErrors, fetchStatus: signUpFetch } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [legalAccepted, setLegalAccepted] = useState<boolean>(false);
  const loading = busy || signInFetch === 'fetching' || signUpFetch === 'fetching';
  const signup = mode === 'sign-up';
  const reset = mode === 'reset';
  const fieldErrors = signup ? signUpErrors : signInErrors;
  const sdkMessages = Object.values(fieldErrors.fields).flatMap(value => value?.message ? [value.message] : []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);

  const run = async (action: () => Promise<void>) => {
    if (loading) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (err) { setError(authError(err)); } finally { setBusy(false); }
  };
  const check = (result: { error: unknown }) => {
    if (result.error) throw result.error;
  };
  const navigate = ({ session }: { session: { currentTask?: unknown } | null }) => {
    if (session?.currentTask) {
      setError('حسابك يحتاج إلى خطوة أمان إضافية غير مدعومة هنا. تواصل مع دعم التطبيق لإكمالها.');
      return;
    }
    router.replace('/');
  };
  const finishSignIn = async () => {
    if (signIn.status === 'complete') {
      check(await signIn.finalize({ navigate }));
    } else if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
      if (signIn.supportedSecondFactors.some(factor => factor.strategy === 'email_code')) {
        check(await signIn.mfa.sendEmailCode()); setStep('trust-code');
      } else if (signIn.supportedSecondFactors.some(factor => factor.strategy === 'totp')) {
        setStep('totp');
      } else {
      setError('حسابك يتطلب تحققًا أمنيًا غير مدعوم هنا. تواصل مع دعم التطبيق؛ لم يتم تجاوز التحقق.');
      }
    } else if (signIn.status === 'needs_new_password') {
      setStep('new-password'); setPassword('');
    } else {
      setError('لم يكتمل تسجيل الدخول. راجع بياناتك وحاول مجددًا.');
    }
  };
  const finishSignUp = async () => {
    if (signUp.status === 'complete') {
      check(await signUp.finalize({ navigate }));
    } else if (signUp.missingFields.length) {
      setStep('requirements');
    } else if (signUp.unverifiedFields.includes('email_address')) {
      check(await signUp.verifications.sendEmailCode()); setStep('signup-code');
    } else {
      setError('لم يكتمل إنشاء الحساب. تواصل مع دعم التطبيق لإكمال متطلبات الحساب.');
    }
  };
  const submit = () => run(async () => {
    if (step === 'signup-code') {
      check(await signUp.verifications.verifyEmailCode({ code })); await finishSignUp();
    } else if (step === 'trust-code' || step === 'totp') {
      check(await (step === 'totp' ? signIn.mfa.verifyTOTP({ code }) : signIn.mfa.verifyEmailCode({ code })));
      await finishSignIn();
    } else if (step === 'reset-code') {
      check(await signIn.resetPasswordEmailCode.verifyCode({ code }));
      setPassword(''); setStep('new-password');
    } else if (step === 'new-password') {
      check(await signIn.resetPasswordEmailCode.submitPassword({ password, signOutOfOtherSessions: true }));
      await finishSignIn();
    } else if (step === 'requirements') {
      const supported = ['first_name', 'last_name', 'username', 'legal_accepted'];
      if (signUp.missingFields.some(field => !supported.includes(field))) {
        throw new Error('يتطلب الحساب حقولًا إضافية غير مدعومة هنا. تواصل مع دعم التطبيق.');
      }
      check(await signUp.update({ ...extraFields, ...(signUp.missingFields.includes('legal_accepted') ? { legalAccepted } : {}) }));
      await finishSignUp();
    } else if (reset) {
      check(await signIn.create({ identifier: email.trim() }));
      check(await signIn.resetPasswordEmailCode.sendCode());
      setStep('reset-code'); setNotice('أرسلنا رمز إعادة التعيين إلى بريدك الإلكتروني.');
    } else if (signup) {
      // This tenant disables Clerk's built-in name attributes. Keep the
      // authentication request to supported fields and store display data separately.
      check(await signUp.password({ emailAddress: email.trim(), password }));
      check(await signUp.update({
        unsafeMetadata: { ...signUp.unsafeMetadata, firstName: name.trim(), lastName: '' },
      }));
      await finishSignUp();
    } else {
      check(await signIn.password({ emailAddress: email.trim(), password }));
      await finishSignIn();
    }
  });
  const google = () => run(async () => {
    const scheme = Constants.expoConfig?.scheme;
    const response = await startSSOFlow({
      strategy: 'oauth_google',
      redirectUrl: AuthSession.makeRedirectUri({
        ...(Constants.appOwnership !== 'expo' && scheme ? { scheme: Array.isArray(scheme) ? scheme[0] : scheme } : {}),
      }),
    });
    if (response.createdSessionId && response.setActive) {
      await response.setActive({ session: response.createdSessionId, navigate });
    } else if (response.signUp?.status === 'missing_requirements') {
      await finishSignUp();
    } else if (response.signIn?.status === 'needs_second_factor' || response.signIn?.status === 'needs_client_trust') {
      await finishSignIn();
    } else if (response.authSessionResult?.type !== 'cancel' && response.authSessionResult?.type !== 'dismiss') {
      setError('لم يكتمل الدخول عبر Google. حاول مجددًا أو استخدم البريد الإلكتروني.');
    }
  });
  const resend = () => run(async () => {
    if (step === 'signup-code') check(await signUp.verifications.sendEmailCode());
    if (step === 'trust-code') check(await signIn.mfa.sendEmailCode());
    if (step === 'reset-code') check(await signIn.resetPasswordEmailCode.sendCode());
    setNotice('أُرسل رمز جديد. تحقّق أيضًا من البريد غير المرغوب فيه.');
  });
  if (isSignedIn && !error) return <Redirect href="/" />;

  const codeStep = ['signup-code', 'trust-code', 'totp', 'reset-code'].includes(step);
  const title = codeStep ? 'تحقّق من هويتك' : step === 'new-password' ? 'كلمة مرور جديدة' : step === 'requirements' ? 'لنُكمل حسابك' : reset ? 'نسيت كلمة المرور؟' : signup ? 'خطوتك الأولى نحو النجاح' : 'أهلًا بعودتك';
  const canSubmit = codeStep ? code.trim().length >= 6 : step === 'new-password' ? !!password : step === 'requirements' ? true : !!email.trim() && (reset || (!!password && (!signup || !!name.trim())));
  return (
    <KeyboardAwareScrollViewCompat bottomOffset={40} style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.page, { paddingTop: (Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top) + 16, paddingBottom: insets.bottom + 40 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="العودة إلى الرئيسية" testID="auth-close" disabled={loading}
        onPress={() => router.replace('/')} style={styles.close}>
        <Feather name="x" size={24} color={colors.foreground} />
      </Pressable>
      <View style={styles.hero}><CartoonAvatar size={88} />
        <Text style={[styles.brand, { color: colors.isDark ? play.dark.sun : play.light.coralShade, backgroundColor: colors.isDark ? play.dark.sunSoft : play.light.coralSoft }]}>يَاعيل · رحلتك تبدأ هنا</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{codeStep ? (step === 'totp' ? 'أدخل الرمز من تطبيق المصادقة.' : 'أدخل الرمز المرسل إلى بريدك الإلكتروني.') : 'حسابك الخاص، تقدّمك، وشخصيتك الكرتونية.'}</Text>
      </View>
      {step === 'form' && <>
        {signup && <AuthField testID="signup-name" label="اسمك" value={name} onChangeText={setName} autoCapitalize="words" textAlign="right" autoComplete="given-name" />}
        <AuthField testID="auth-email" label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" placeholder="name@example.com" />
        {!reset && <AuthField testID="auth-password" label="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry autoComplete={signup ? 'new-password' : 'current-password'} />}
      </>}
      {codeStep && <AuthField testID="auth-code" label="رمز التحقق" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={10} textAlign="center" />}
      {step === 'new-password' && <AuthField testID="reset-new-password" label="كلمة المرور الجديدة" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />}
      {step === 'requirements' && signUp.missingFields.map(field => {
        const labels: Record<string, string> = { first_name: 'الاسم الأول', last_name: 'اسم العائلة', username: 'اسم المستخدم' };
        const keys: Record<string, string> = { first_name: 'firstName', last_name: 'lastName', username: 'username' };
        if (field === 'legal_accepted') return <Pressable key={field} accessibilityRole="checkbox" accessibilityState={{ checked: legalAccepted }} onPress={() => setLegalAccepted(!legalAccepted)} style={styles.legal}>
          <Feather name={legalAccepted ? 'check-square' : 'square'} size={22} color={colors.primary} />
          <Text style={{ color: colors.foreground }}>أوافق على الشروط وسياسة الخصوصية للتطبيق</Text>
        </Pressable>;
        return keys[field] ? <AuthField key={field} label={labels[field]} value={extraFields[keys[field]] || ''} onChangeText={text => setExtraFields(old => ({ ...old, [keys[field]]: text }))} /> : <Text key={field} style={{ color: colors.destructive }}>يتطلب الحساب حقلًا غير مدعوم: {field}</Text>;
      })}
      {(!!error || sdkMessages.length > 0) && <Text accessibilityRole="alert" style={[styles.message, { color: colors.destructive }]}>{error || sdkMessages.join('\n')}</Text>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={[styles.message, { color: colors.primary }]}>{notice}</Text>}
      {loading && <ActivityIndicator accessibilityLabel="جارٍ المعالجة" color={colors.primary} />}
      <AuthButton testID="auth-submit" title={loading ? 'جارٍ المتابعة…' : codeStep ? 'تأكيد الرمز' : reset || step === 'new-password' ? 'متابعة' : signup ? 'إنشاء حسابي' : 'تسجيل الدخول'} onPress={submit} disabled={loading || !canSubmit} />
      {codeStep && step !== 'totp' && <AuthButton testID="auth-resend" secondary title="إعادة إرسال الرمز" onPress={resend} disabled={loading} />}
      {step === 'form' && !reset && <>
        <Text style={[styles.or, { color: colors.mutedForeground }]}>أو</Text>
        <AuthButton testID="auth-google" secondary title="المتابعة مع Google" onPress={google} disabled={loading} />
        {!signup && <AuthButton testID="auth-forgot-password" secondary title="نسيت كلمة المرور؟" onPress={() => router.push('/(auth)/forgot-password')} disabled={loading} />}
        <Pressable accessibilityRole="button" testID="auth-switch-mode" disabled={loading} onPress={() => router.replace(signup ? '/(auth)/sign-in' : '/(auth)/sign-up')}>
          <Text style={[styles.link, { color: colors.primary }]}>{signup ? 'لديك حساب؟ سجّل الدخول' : 'جديد هنا؟ أنشئ حسابًا'}</Text>
        </Pressable>
      </>}
      {step !== 'form' && <AuthButton testID="auth-start-over" secondary title="البدء من جديد" disabled={loading} onPress={() => void run(async () => {
        await signIn.reset(); await signUp.reset(); setStep('form'); setCode(''); setPassword('');
      })} />}
      {reset && step === 'form' && <AuthButton secondary title="العودة لتسجيل الدخول" onPress={() => router.replace('/(auth)/sign-in')} disabled={loading} />}
      <View nativeID="clerk-captcha" />
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 24, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center' },
  close: { alignSelf: 'flex-start', padding: 10 },
  hero: { alignItems: 'center', gap: 12, marginBottom: 10 },
  brand: { fontFamily: ARABIC_BOLD_FONT, fontSize: 13, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  title: { fontFamily: ARABIC_BOLD_FONT, fontSize: 32, lineHeight: 46, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontFamily: ARABIC_FONT, fontSize: 15, lineHeight: 25, textAlign: 'center' },
  field: { gap: 8 }, label: { fontFamily: ARABIC_BOLD_FONT, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  input: { fontFamily: ARABIC_FONT, borderWidth: 2, borderRadius: 18, minHeight: 56, paddingHorizontal: 16, fontSize: 17 },
  button: { minHeight: 52, justifyContent: 'center' },
  buttonInner: { minHeight: 52, padding: 14 },
  buttonText: { fontFamily: ARABIC_BOLD_FONT, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  message: { fontFamily: ARABIC_FONT, textAlign: 'right', lineHeight: 23, fontSize: 14 },
  link: { fontFamily: ARABIC_BOLD_FONT, textAlign: 'center', padding: 14, fontSize: 15, fontWeight: '600' },
  or: { fontFamily: ARABIC_FONT, textAlign: 'center' }, legal: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
});
