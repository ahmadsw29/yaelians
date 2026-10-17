import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useClerk, useUser } from '@clerk/expo';
import { router, useFocusEffect } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, useThemePreference } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AvatarConfig, avatarOptions, CartoonAvatar, getAvatarConfig } from '@/components/CartoonAvatar';
import { AuthButton, AuthField, authError } from '@/components/AuthScreen';
import { getProfileNames } from '@/lib/profile';
import { useAccountDeletion } from '@/lib/AccountDeletion';
import { useStudy } from '@/lib/StudyProvider';
import { usePlanAccess } from '@/lib/PlanAccess';

function ThemeSettings() {
  const colors = useColors();
  const { preference, setPreference } = useThemePreference();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>مظهر التطبيق</Text>
    <View style={styles.themeRow}>
      {([
        { value: 'light', title: 'فاتح', icon: 'sun' },
        { value: 'dark', title: 'داكن', icon: 'moon' },
        { value: 'system', title: 'تلقائي', icon: 'smartphone' },
      ] as const).map(option => <Pressable key={option.value} testID={`theme-${option.value}`} accessibilityRole="radio"
        accessibilityLabel={`المظهر ${option.title}`} accessibilityState={{ selected: preference === option.value }}
        onPress={() => setPreference(option.value)}
        style={[styles.themeOption, { backgroundColor: preference === option.value ? colors.secondary : colors.background, borderColor: preference === option.value ? colors.primary : colors.border }]}>
        <Feather name={option.icon} size={20} color={preference === option.value ? colors.primary : colors.mutedForeground} />
        <Text style={{ color: colors.foreground, fontSize: 14 }}>{option.title}</Text>
      </Pressable>)}
    </View>
    <Text style={[styles.caption, { color: colors.mutedForeground }]}>يُحفظ اختيارك على هذا الجهاز.</Text>
  </View>;
}

function ProfileEditor({ user }: { user: NonNullable<ReturnType<typeof useUser>['user']> }) {
  const openDeletion = useAccountDeletion();
  const { pauseForDeletion, stats, loading: statsLoading, refresh } = useStudy();
  const { plan, usage } = usePlanAccess();
  const colors = useColors();
  const { signOut } = useClerk();
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const profileNames = getProfileNames(user);
  const [firstName, setFirstName] = useState<string>(profileNames.firstName);
  const [lastName, setLastName] = useState<string>(profileNames.lastName);
  const [avatar, setAvatar] = useState<AvatarConfig>(() => getAvatarConfig(user.unsafeMetadata.avatar));
  const [saving, setSaving] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const busy = saving || loggingOut;
  useFocusEffect(useCallback(() => { refresh(); }, [user.id]));
  const accuracy = stats.answeredQuestions
    ? Math.round((stats.correctAnswers / stats.answeredQuestions) * 100)
    : null;
  const save = async () => {
    if (busy) return;
    setSaving(true); setMessage(''); setError('');
    try {
      if (!firstName.trim()) throw new Error('أدخل اسمك أولًا.');
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          avatar,
        },
      });
      setMessage('تم حفظ ملفك وشخصيتك الكرتونية بنجاح.');
    } catch (err) { setError(authError(err)); } finally { setSaving(false); }
  };
  const logout = async () => {
    if (busy) return;
    setLoggingOut(true); setError(''); setMessage('');
    try { await signOut(); router.replace('/'); }
    catch (err) { setError(authError(err)); setLoggingOut(false); }
  };
  const labels: Record<keyof AvatarConfig, string> = { skin: 'لون البشرة', hair: 'لون الشعر', clothes: 'لون الملابس', background: 'الخلفية', hairStyle: 'تسريحة الشعر' };
  return <>
    <View style={[styles.heroCompact, { backgroundColor: colors.secondary }]}>
      <CartoonAvatar config={avatar} size={76} />
      <View style={styles.heroCopy}>
        <Text style={[styles.heroName, { color: colors.foreground }]}>{profileNames.fullName || user.username || 'ملفي الشخصي'}</Text>
        <Text style={[styles.caption, { color: colors.mutedForeground }]}>{user.primaryEmailAddress?.emailAddress}</Text>
        <View style={[styles.xpPill, { backgroundColor: colors.card }]}>
          <Ionicons name="sparkles" size={15} color={colors.primary} />
          <Text style={[styles.xpText, { color: colors.foreground }]}>{statsLoading ? '—' : stats.xp} نقطة خبرة</Text>
        </View>
      </View>
    </View>

    <View>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>تقدّمك</Text>
        <Pressable testID="profile-full-progress" accessibilityRole="button" onPress={() => router.push('/(tabs)/progress')}
          style={styles.textLink}>
          <Text style={[styles.textLinkLabel, { color: colors.primary }]}>كل الإحصاءات</Text>
          <Feather name="arrow-left" size={15} color={colors.primary} />
        </Pressable>
      </View>
      <View style={styles.statsGrid}>
        <AccountMetric icon="flame" value={statsLoading ? '—' : `${stats.streak}`} unit="أيام" label="سلسلة التعلّم" colors={colors} />
        <AccountMetric icon="checkmark-circle" value={statsLoading ? '—' : accuracy === null ? '—' : `${accuracy}%`} unit="" label="دقّة الإجابات" colors={colors} />
        <AccountMetric icon="book" value={statsLoading ? '—' : `${stats.masteredWords}`} unit="" label="كلمات أتقنتها" colors={colors} />
        <AccountMetric icon="albums" value={statsLoading ? '—' : `${stats.lessonsCompleted}`} unit="" label="دروس مكتملة" colors={colors} />
      </View>
    </View>

    <View testID="profile-plan-overview" style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.planHeader}>
        <View style={styles.planTitleCopy}>
          <Text style={[styles.planEyebrow, { color: colors.mutedForeground }]}>خطتك الحالية</Text>
          <Text style={[styles.planName, { color: colors.foreground }]}>{plan === 'free' ? 'الخطة المجانية' : 'اختر خطتك'}</Text>
        </View>
        <View style={[styles.planBadge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.planBadgeText, { color: colors.secondaryForeground }]}>{plan === 'free' ? 'مجانية' : 'الخطط'}</Text>
        </View>
      </View>
      <Text style={[styles.caption, { color: colors.mutedForeground }]}>
        {plan === 'free'
          ? `اليوم: مفردات ${usage.vocabularyRounds}/1 · جلسات موقّتة ${usage.timedSections}/1`
          : 'اختر خطة تناسب طريقة دراستك.'}
      </Text>
      <Pressable testID="profile-upgrade-plan" accessibilityRole="button" onPress={() => router.push('/plans')}
        style={({ pressed }) => [styles.upgradeCard, { backgroundColor: colors.primary, opacity: pressed ? 0.84 : 1 }]}>
        <View style={styles.upgradeCopy}>
          <Text style={[styles.upgradeEyebrow, { color: colors.primaryForeground }]}>للمزيد من التعلّم</Text>
          <Text style={[styles.upgradeTitle, { color: colors.primaryForeground }]}>استكشف الخطة الكاملة</Text>
          <Text style={[styles.upgradePrice, { color: colors.primaryForeground }]}>₪50 شهريًا</Text>
        </View>
        <Feather name="arrow-left" size={20} color={colors.primaryForeground} />
      </Pressable>
      <Text style={[styles.setupNote, { color: colors.mutedForeground }]}>
        جميع الدورات والجلسات والنماذج؛ الشراء عبر المتجر غير متاح بعد.
      </Text>
    </View>

    <Pressable testID="profile-edit-toggle" accessibilityRole="button" accessibilityState={{ expanded: detailsOpen }}
      onPress={() => setDetailsOpen(open => !open)}
      style={[styles.editorToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.editorCopy}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>بياناتك وشخصيتك</Text>
        <Text style={[styles.caption, { color: colors.mutedForeground }]}>تعديل الاسم والصورة الكرتونية</Text>
      </View>
      <Feather name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.mutedForeground} />
    </Pressable>

    {detailsOpen && <>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>بياناتي</Text>
        <AuthField testID="profile-first-name" label="الاسم الأول" value={firstName} onChangeText={setFirstName} textAlign="right" autoCapitalize="words" editable={!busy} maxLength={80} />
        <AuthField testID="profile-last-name" label="اسم العائلة (اختياري)" value={lastName} onChangeText={setLastName} textAlign="right" autoCapitalize="words" editable={!busy} maxLength={80} />
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>شخصيتك، بطريقتك</Text>
        <Text style={[styles.caption, { color: colors.mutedForeground }]}>اختر تفاصيل شخصيتك الكرتونية الخاصة بالتطبيق.</Text>
        {(Object.keys(labels) as (keyof AvatarConfig)[]).map(key => <View key={key} style={styles.optionGroup}>
          <Text style={[styles.optionLabel, { color: colors.foreground }]}>{labels[key]}</Text>
          <View style={styles.swatches}>
            {avatarOptions[key].map((value, index) => <Pressable key={value} disabled={busy}
              accessibilityRole="radio" accessibilityState={{ selected: avatar[key] === index, disabled: busy }}
              accessibilityLabel={`${labels[key]}، الخيار ${index + 1}`} testID={`avatar-${key}-${index}`}
              onPress={() => { setAvatar(old => ({ ...old, [key]: index })); setMessage(''); }}
              style={[styles.swatch, {
                backgroundColor: key === 'hairStyle' ? colors.secondary : value,
                borderColor: avatar[key] === index ? colors.primary : colors.border,
                borderWidth: avatar[key] === index ? 3 : 1,
              }]}>
              {key === 'hairStyle' ? <Text style={{ color: colors.foreground, fontSize: 12 }}>{['قصير', 'مجعد', 'طويل'][index]}</Text>
                : avatar[key] === index ? <View style={[styles.selectedDot, { backgroundColor: colors.card }]}><Feather name="check" size={14} color={colors.primary} /></View> : null}
            </Pressable>)}
          </View>
        </View>)}
      </View>
      <AuthButton testID="profile-save" title={saving ? 'جارٍ الحفظ…' : 'حفظ التغييرات'} onPress={() => void save()} disabled={busy || !firstName.trim()} />
    </>}
    {!!error && <Text accessibilityRole="alert" style={[styles.feedback, { color: colors.destructive }]}>{error}</Text>}
    {!!message && <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: colors.primary }]}>{message}</Text>}
    {busy && <ActivityIndicator color={colors.primary} />}
    <ThemeSettings />
    <AuthButton testID="profile-logout" title={loggingOut ? 'جارٍ تسجيل الخروج…' : 'تسجيل الخروج'} onPress={() => void logout()} disabled={busy} secondary />
    <View style={[styles.card, { borderColor: colors.destructive, backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.destructive }]}>حذف الحساب</Text>
      <Text style={[styles.caption, { color: colors.mutedForeground }]}>حذف دائم للحساب وبيانات التعلّم. ستُطلب موافقتك والتحقق من هويتك أولًا.</Text>
      <AuthButton testID="profile-delete-account" title="حذف حسابي…" secondary disabled={busy} onPress={() => openDeletion(pauseForDeletion)} />
    </View>
  </>;
}

function AccountMetric({ icon, value, unit, label, colors }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  unit: string;
  label: string;
  colors: ReturnType<typeof useColors>;
}) {
  return <View accessible accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
    style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Ionicons name={icon} size={18} color={colors.primary} />
    <Text style={[styles.metricValue, { color: colors.foreground }]}>{value} <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{unit}</Text></Text>
    <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
  </View>;
}

export default function Profile() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  return <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: colors.background }} bottomOffset={40}
    contentContainerStyle={[styles.page, { paddingTop: (Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top) + 24, paddingBottom: Math.max(34, insets.bottom) + 100 }]}>
    <View style={styles.headingRow}>
      <Feather name="user" size={22} color={colors.primary} />
      <Text style={[styles.heading, { color: colors.foreground }]}>حسابي</Text>
    </View>
    {!isLoaded ? <ActivityIndicator color={colors.primary} /> : user ? <ProfileEditor key={user.id} user={user} /> : <>
      <View style={[styles.hero, { backgroundColor: colors.secondary }]}>
        <CartoonAvatar size={126} />
        <Text style={[styles.heroName, { color: colors.foreground }]}>مساحتك الخاصة للتعلّم</Text>
        <Text style={[styles.description, { color: colors.secondaryForeground }]}>سجّل الدخول لحفظ ملفك، واختر شخصية كرتونية تعبّر عنك.</Text>
      </View>
      <AuthButton testID="profile-sign-in" title="تسجيل الدخول" onPress={() => router.push('/(auth)/sign-in')} />
      <AuthButton testID="profile-sign-up" secondary title="إنشاء حساب جديد" onPress={() => router.push('/(auth)/sign-up')} />
      <ThemeSettings />
    </>}
  </KeyboardAwareScrollViewCompat>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 22, gap: 15, maxWidth: 600, width: '100%', alignSelf: 'center' },
  headingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  heading: { fontSize: 28, fontWeight: '700' },
  hero: { borderRadius: 26, alignItems: 'center', padding: 26, gap: 14 },
  heroCompact: { borderRadius: 22, flexDirection: 'row-reverse', alignItems: 'center', padding: 15, gap: 14 },
  heroCopy: { flex: 1, alignItems: 'flex-end', gap: 5 },
  heroName: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  description: { textAlign: 'center', fontSize: 15, lineHeight: 26 },
  card: { padding: 18, borderRadius: 22, borderWidth: 1, gap: 14 },
  sectionTitle: { fontSize: 19, fontWeight: '700', textAlign: 'right' },
  caption: { fontSize: 13, lineHeight: 22, textAlign: 'right' },
  optionGroup: { gap: 10 }, optionLabel: { textAlign: 'right', fontSize: 14, fontWeight: '600' },
  swatches: { flexDirection: 'row-reverse', gap: 12, flexWrap: 'wrap' },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  selectedDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  themeRow: { flexDirection: 'row-reverse', gap: 10 },
  themeOption: { flex: 1, borderWidth: 1, borderRadius: 16, gap: 10, paddingVertical: 13, alignItems: 'center' },
  feedback: { fontSize: 14, lineHeight: 24, textAlign: 'right' },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  textLink: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 2 },
  textLinkLabel: { fontSize: 13, fontWeight: '700' },
  statsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9 },
  metricCard: { width: '48%', flexGrow: 1, minHeight: 88, borderRadius: 17, borderWidth: 1, padding: 12, alignItems: 'flex-end', justifyContent: 'space-between' },
  metricValue: { fontSize: 20, fontWeight: '700' },
  metricLabel: { fontSize: 11, textAlign: 'right' },
  xpPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 9, marginTop: 3 },
  xpText: { fontSize: 11, fontWeight: '600' },
  planCard: { padding: 16, borderRadius: 22, borderWidth: 1, gap: 12 },
  planHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  planTitleCopy: { alignItems: 'flex-end', gap: 3 },
  planEyebrow: { fontSize: 11 },
  planName: { fontSize: 17, fontWeight: '700' },
  planBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 13 },
  planBadgeText: { fontSize: 11, fontWeight: '700' },
  upgradeCard: { minHeight: 76, borderRadius: 17, paddingVertical: 12, paddingHorizontal: 15, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  upgradeCopy: { alignItems: 'flex-end', gap: 2 },
  upgradeEyebrow: { fontSize: 10, opacity: 0.84 },
  upgradeTitle: { fontSize: 15, fontWeight: '700' },
  upgradePrice: { fontSize: 12 },
  setupNote: { fontSize: 11, lineHeight: 18, textAlign: 'right' },
  editorToggle: { minHeight: 70, padding: 16, borderRadius: 20, borderWidth: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  editorCopy: { alignItems: 'flex-end', gap: 3 },
});
