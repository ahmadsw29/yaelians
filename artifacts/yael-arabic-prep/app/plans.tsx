import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { usePlanAccess } from '@/lib/PlanAccess';

import { ARABIC_FONT, ARABIC_BOLD_FONT } from '@/constants/typography';
const FONT = ARABIC_FONT;
const BOLD = ARABIC_BOLD_FONT;

const FREE_BENEFITS = ['جولة مفردات واحدة لخمس دقائق كل يوم', 'قسم امتحان محدد بوقت واحد كل يوم', 'الوصول إلى نموذج B-17'];
const PREMIUM_BENEFITS = ['جميع الدورات والمفردات', 'جلسات امتحان بلا حدود', 'مكتبة النماذج كاملة'];

export default function PlansScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { chooseFree, isPremium } = usePlanAccess();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectFree = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await chooseFree();
      router.replace('/(tabs)');
    } catch {
      setError('تعذّر حفظ الخطة الآن. تحقق من اتصالك وحاول مجددًا؛ استخدامك السابق لم يتغير.');
    } finally {
      setSaving(false);
    }
  };

  if (isPremium) return <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 20, backgroundColor: c.background }}>
    <Text accessibilityRole="header" style={[styles.title, { color: c.foreground }]}>خطتك الكاملة مفعّلة</Text>
    <Text style={[styles.subtitle, { color: c.foreground }]}>جميع الدورات والجلسات والنماذج متاحة لك بلا حدود.</Text>
    <Pressable testID="premium-continue" accessibilityRole="button" onPress={() => router.replace('/(tabs)')} style={[styles.freeButton, { backgroundColor: c.primary }]}>
      <Text style={[styles.freeButtonText, { color: c.primaryForeground }]}>تابع التعلّم</Text>
    </Pressable>
  </View>;

  return <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={[styles.page, { paddingTop: Math.max(insets.top, 24) + 12, paddingBottom: Math.max(insets.bottom, 20) + 24 }]}>
    <View style={styles.topRow}>
      <View style={styles.titleCopy}>
        <Text style={[styles.eyebrow, { color: c.primary }]}>خطتك، على راحتك</Text>
        <Text style={[styles.title, { color: c.foreground }]}>اختر طريقة التعلّم</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>ابدأ مجانًا، ويمكنك الترقية لاحقًا.</Text>
      </View>
      <View style={[styles.icon, { backgroundColor: c.secondary }]}><Feather name="layers" size={22} color={c.primary} /></View>
    </View>

    <View testID="plan-free" style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.priceCopy}><Text accessibilityRole="header" style={[styles.planName, { color: c.foreground }]}>تجربة مجانية</Text><Text accessibilityLabel="تجربة مجانية، صفر شيكل، بدون دفع" style={[styles.price, { color: c.foreground }]}>₪0<Text style={[styles.period, { color: c.mutedForeground }]}> / بدون دفع</Text></Text></View>
        <View style={[styles.badge, { backgroundColor: c.secondary }]}><Text style={[styles.badgeText, { color: c.primary }]}>ابدأ الآن</Text></View>
      </View>
      <View style={styles.benefitList}>{FREE_BENEFITS.map(item => <Benefit key={item} label={item} />)}</View>
      {!!error && <Text accessibilityRole="alert" style={{ color: c.destructive, textAlign: 'right', lineHeight: 22 }}>{error}</Text>}
      <Pressable testID="choose-free-plan" accessibilityRole="button" accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => void selectFree()} style={({ pressed }) => [styles.freeButton, { backgroundColor: c.secondary, opacity: pressed || saving ? 0.75 : 1 }]}>
        <Text style={[styles.freeButtonText, { color: c.foreground }]}>{saving ? 'جارٍ حفظ الخطة…' : 'ابدأ تجربة مجانية'}</Text><Ionicons name="arrow-back" size={19} color={c.foreground} />
      </Pressable>
    </View>

    <View testID="plan-premium" style={[styles.card, styles.premiumCard, { backgroundColor: c.primary, borderColor: c.primary }]}>
      <View style={styles.cardHeader}>
        <View style={styles.priceCopy}><Text accessibilityRole="header" style={[styles.planName, { color: c.primaryForeground }]}>الخطة الكاملة</Text><Text accessibilityLabel="الخطة الكاملة، 48.90 شيكلًا شهريًا" style={[styles.price, { color: c.primaryForeground }]}>₪48.90<Text style={[styles.period, { color: c.primaryForeground }]}> / شهريًا</Text></Text></View>
        <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><Ionicons name="sparkles" size={14} color={c.primaryForeground} /><Text style={[styles.badgeText, { color: c.primaryForeground }]}>بلا حدود</Text></View>
      </View>
      <View style={styles.benefitList}>{PREMIUM_BENEFITS.map(item => <Benefit key={item} label={item} inverse />)}</View>
      <View accessible accessibilityLabel="الاشتراك غير متاح للشراء حاليًا. يلزم إعداد المنتجات وحساب المتجر قبل تفعيل الدفع."
        style={[styles.setupNote, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
        <Feather name="info" size={17} color={c.primaryForeground} />
        <Text style={[styles.setupText, { color: c.primaryForeground }]}>الاشتراك غير متاح للشراء بعد. يلزم إعداد المنتجات وحساب المتجر قبل تفعيل الدفع.</Text>
      </View>
      <Pressable testID="premium-unavailable" accessibilityRole="button"
        accessibilityLabel="الشراء للخطة الكاملة غير متاح حاليًا"
        accessibilityHint="سعر الخطة 48.90 شيكلًا شهريًا. الدفع غير مفعّل بعد."
        accessibilityState={{ disabled: true }} disabled
        style={[styles.premiumButton, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
        <Text style={[styles.premiumButtonText, { color: c.primaryForeground }]}>قريبًا — إعداد الدفع مطلوب</Text>
      </Pressable>
    </View>
    <Text style={[styles.footnote, { color: c.mutedForeground }]}>لا نطلب منك إدخال بيانات البنك هنا. تُدار المدفوعات والتحويلات البنكية من حسابات المتاجر.</Text>
  </ScrollView>;
}

function Benefit({ label, inverse = false }: { label: string; inverse?: boolean }) {
  const c = useColors();
  return <View accessible accessibilityLabel={label} style={styles.benefit}><Ionicons name="checkmark-circle" size={19} color={inverse ? c.primaryForeground : c.primary} /><Text style={[styles.benefitText, { color: inverse ? c.primaryForeground : c.foreground }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 16, width: '100%', maxWidth: 620, alignSelf: 'center' },
  topRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 15, paddingBottom: 2 },
  titleCopy: { flex: 1, gap: 5 },
  eyebrow: { fontFamily: BOLD, fontWeight: '700', fontSize: 13, textAlign: 'right' },
  title: { fontFamily: BOLD, fontWeight: '700', fontSize: 26, lineHeight: 36, textAlign: 'right' },
  subtitle: { fontFamily: FONT, fontSize: 13, textAlign: 'right' },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 20, gap: 17, borderWidth: 1, borderRadius: 24 },
  premiumCard: { borderWidth: 0 },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  priceCopy: { gap: 2, alignItems: 'flex-end' },
  planName: { fontFamily: BOLD, fontWeight: '700', fontSize: 17, textAlign: 'right' },
  price: { fontFamily: BOLD, fontWeight: '700', fontSize: 29, textAlign: 'right' },
  period: { fontFamily: FONT, fontSize: 13 },
  badge: { borderRadius: 14, minHeight: 32, paddingHorizontal: 11, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5 },
  badgeText: { fontFamily: BOLD, fontWeight: '700', fontSize: 12 },
  benefitList: { gap: 12 },
  benefit: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  benefitText: { fontFamily: FONT, fontSize: 14, lineHeight: 22, flex: 1, textAlign: 'right' },
  freeButton: { minHeight: 52, borderRadius: 16, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8 },
  freeButtonText: { fontFamily: BOLD, fontWeight: '700', fontSize: 14 },
  setupNote: { flexDirection: 'row-reverse', gap: 8, padding: 12, borderRadius: 14, alignItems: 'flex-start' },
  setupText: { flex: 1, fontFamily: FONT, fontSize: 12, lineHeight: 20, textAlign: 'right' },
  premiumButton: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  premiumButtonText: { fontFamily: BOLD, fontWeight: '700', fontSize: 14 },
  footnote: { fontFamily: FONT, fontSize: 12, lineHeight: 20, textAlign: 'center' },
});
