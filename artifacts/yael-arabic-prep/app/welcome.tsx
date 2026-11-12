import React from 'react';
import { ARABIC_BOLD_FONT, ARABIC_FONT } from '@/constants/typography';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartoonAvatar } from '@/components/CartoonAvatar';
import { useColors } from '@/hooks/useColors';

const FONT = ARABIC_FONT;
const BOLD = ARABIC_BOLD_FONT;

export default function WelcomeScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={[styles.page, { paddingTop: Math.max(insets.top, 24) + 28, paddingBottom: insets.bottom + 30 }]}>
    <View style={styles.brand}><View style={[styles.brandIcon, { backgroundColor: c.secondary }]}><Ionicons name="sparkles" size={20} color={c.primary} /></View><Text style={[styles.brandName, { color: c.foreground }]}>YAEL · ياعيل</Text></View>
    <View style={[styles.hero, { backgroundColor: c.secondary }]}>
      <View style={styles.avatar}><CartoonAvatar size={126} /></View>
      <Text style={[styles.kicker, { color: c.primary }]}>استعدّ لامتحانك بثقة</Text>
      <Text style={[styles.title, { color: c.foreground }]}>كل يوم خطوة،{'\n'}وكل كلمة إنجاز.</Text>
      <Text style={[styles.description, { color: c.secondaryForeground }]}>تدرّب على المفردات والفهم والامتحانات الحقيقية، مع معلّم صغير يشجّعك في الطريق.</Text>
      <View style={styles.features}>
        {['تدريبات سريعة وممتعة', 'نماذج امتحانات مع حلول', 'تقدّمك محفوظ في حسابك'].map((feature, index) =>
          <View key={feature} style={styles.feature}><Feather name={['zap', 'book-open', 'award'][index] as 'zap' | 'book-open' | 'award'} size={17} color={c.primary} /><Text style={[styles.featureText, { color: c.foreground }]}>{feature}</Text></View>)}
      </View>
    </View>
    <Pressable testID="welcome-sign-up" accessibilityRole="button" onPress={() => router.push('/(auth)/sign-up')} style={({ pressed }) => [styles.primaryButton, { backgroundColor: c.primary, opacity: pressed ? 0.82 : 1 }]}>
      <Text style={[styles.primaryText, { color: c.primaryForeground }]}>أنشئ حسابًا وابدأ</Text><Ionicons name="arrow-back" size={20} color={c.primaryForeground} />
    </Pressable>
    <Pressable testID="welcome-sign-in" accessibilityRole="button" onPress={() => router.push('/(auth)/sign-in')} style={({ pressed }) => [styles.secondaryButton, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.75 : 1 }]}>
      <Text style={[styles.secondaryText, { color: c.foreground }]}>لديك حساب؟ سجّل الدخول</Text>
    </Pressable>
    <Text style={[styles.footnote, { color: c.mutedForeground }]}>اختر خطتك بعد تسجيل الدخول. يمكنك البدء مجانًا.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 22, gap: 15, width: '100%', maxWidth: 560, alignSelf: 'center' },
  brand: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, justifyContent: 'center', marginBottom: 2 },
  brandIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: BOLD, fontSize: 14, letterSpacing: 0.4 },
  hero: { borderRadius: 28, padding: 24, gap: 13, alignItems: 'center' },
  avatar: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 48, padding: 5 },
  kicker: { fontFamily: BOLD, fontSize: 14, textAlign: 'center' },
  title: { fontFamily: BOLD, fontSize: 31, lineHeight: 43, textAlign: 'center', writingDirection: 'rtl' },
  description: { fontFamily: FONT, fontSize: 15, lineHeight: 25, textAlign: 'center', writingDirection: 'rtl', maxWidth: 400 },
  features: { alignSelf: 'stretch', gap: 11, paddingTop: 5 },
  feature: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  featureText: { fontFamily: FONT, fontSize: 14, textAlign: 'right' },
  primaryButton: { minHeight: 56, borderRadius: 18, paddingHorizontal: 18, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 9 },
  primaryText: { fontFamily: BOLD, fontSize: 16 },
  secondaryButton: { minHeight: 52, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 },
  secondaryText: { fontFamily: BOLD, fontSize: 14 },
  footnote: { fontFamily: FONT, fontSize: 12, textAlign: 'center', lineHeight: 20 },
});
