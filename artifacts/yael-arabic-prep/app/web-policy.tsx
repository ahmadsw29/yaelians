import React from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlay } from '@/components/Playful';
import { Enter } from '@/components/EntranceMotion';
import { ARABIC_BOLD_FONT } from '@/constants/typography';
import { POLICY_PAGES, policyPage, policyDocument, SELLER_DETAILS, PUBLIC_PRICING } from '@/lib/public-policies';

export default function WebPolicy() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const router = useRouter();
  const p = usePlay();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const mid = width >= 640;
  const page = policyPage(section);
  const doc = policyDocument(page);
  const top = Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top + 16;
  const bottom = Platform.OS === 'web' ? Math.max(34, insets.bottom) : insets.bottom + 16;
  const email = SELLER_DETAILS.supportEmail;

  return (
    <ScrollView style={{ backgroundColor: p.background }}
      contentContainerStyle={[s.page, { paddingTop: top, paddingBottom: bottom + 24, paddingHorizontal: mid ? 24 : 14 }]}>
      <View style={s.wrap}>
        <View style={[s.top, { backgroundColor: p.card, borderColor: p.border }]}>
          <View style={s.brandRow}>
            <View style={[s.logoMark, { backgroundColor: p.brand }]}><Text style={[s.logoMarkText, { color: p.onBrand }]}>Y</Text></View>
            <Text style={[s.logo, { color: p.foreground }]}>YAEL</Text>
          </View>
          <Pressable testID="policy-home" accessibilityRole="link" onPress={() => router.replace('/website')}
            style={({ pressed }) => [s.homeBtn, { backgroundColor: p.foreground, opacity: pressed ? 0.85 : 1 }]}>
            <Ionicons name="arrow-forward" size={16} color={p.background} />
            <Text style={[s.btnText, { color: p.background }]}>الصفحة الرئيسية</Text>
          </Pressable>
        </View>

        <View style={s.tabs} accessibilityRole="tablist">
          {POLICY_PAGES.map(item => {
            const on = item.id === page;
            return (
              <Pressable key={item.id} testID={`policy-nav-${item.id}`} accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => router.replace({ pathname: '/web-policy', params: { section: item.id } })}
                style={[s.tab, { backgroundColor: on ? p.brand : p.card, borderColor: on ? p.brand : p.border }]}>
                <Text style={[s.tabText, { color: on ? p.onBrand : p.foreground }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Enter key={page} delay={40}>
          <View style={[s.hero, { backgroundColor: p.brandSoft, borderColor: p.border }]}>
            <Text style={[s.eyebrow, { color: p.brandShade }]}>{SELLER_DETAILS.brand}</Text>
            <Text accessibilityRole="header" style={[s.h1, { color: p.foreground }, !mid && { fontSize: 28, lineHeight: 44 }]}>{doc.title}</Text>
            <Text style={[s.lead, { color: p.mutedForeground }]}>{doc.summary}</Text>
            {page === 'pricing' && (
              <View style={[s.price, { backgroundColor: p.card, borderColor: p.border }]}>
                <Text style={[s.priceText, { color: p.foreground }]}>{`${PUBLIC_PRICING.label} ${PUBLIC_PRICING.cadence}`}</Text>
                {PUBLIC_PRICING.proposed && <View style={[s.badge, { backgroundColor: p.sun }]}><Text style={[s.badgeText, { color: p.sunInk }]}>سعر مخطّط</Text></View>}
              </View>
            )}
          </View>
        </Enter>

        <View style={[s.notice, { backgroundColor: p.coralSoft }]} accessibilityRole="alert">
          <Ionicons name="pause-circle" size={20} color={p.coralInk} />
          <Text style={[s.body, { color: p.coralInk, flex: 1 }]}>الشراء الجديد متوقف في هذه النسخة. لا تُقبل مشتريات جديدة ولا يُخصم أي مبلغ من هذه الصفحة.</Text>
        </View>
        {doc.draft && (
          <View style={[s.notice, { backgroundColor: p.skySoft }]}>
            <Ionicons name="document-text" size={20} color={p.skyInk} />
            <Text style={[s.body, { color: p.skyInk, flex: 1 }]}>مسودة للمراجعة: هذه معلومات عامة وليست استشارة قانونية، ولم يُحدَّد لها تاريخ سريان بعد.</Text>
          </View>
        )}

        {doc.sections.map((sec, i) => (
          <Enter key={`${page}-${sec.title}`} delay={80 + Math.min(i, 6) * 50}>
            <View style={[s.card, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={s.cardHead}>
                <View style={[s.num, { backgroundColor: p.brandSoft }]}><Text style={[s.numText, { color: p.brandShade }]}>{i + 1}</Text></View>
                <Text accessibilityRole="header" style={[s.h2, { color: p.foreground }]}>{sec.title}</Text>
              </View>
              {sec.paragraphs.map((t, j) => <Text key={j} style={[s.body, { color: p.foreground }]}>{t}</Text>)}
            </View>
          </Enter>
        ))}

        <View style={[s.card, { backgroundColor: p.card, borderColor: p.border }]}>
          <Text style={[s.h2, { color: p.foreground }]}>التواصل</Text>
          {email ? (
            <Pressable testID="policy-support-email" accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${email}`)}>
              <Text style={[s.body, s.link, { color: p.brandShade }]}>{email}</Text>
            </Pressable>
          ) : (
            <Text style={[s.body, { color: p.mutedForeground }]}>عنوان التواصل المباشر للدعم والخصوصية بانتظار تأكيد صاحب الخدمة. لم يُنشر عنوان غير موثّق.</Text>
          )}
        </View>

        <Pressable accessibilityRole="link" onPress={() => router.replace('/website')} style={s.footLink}>
          <Text style={[s.body, s.link, { color: p.mutedForeground }]}>العودة إلى الصفحة الرئيسية</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const rtl = { textAlign: 'right' as const, writingDirection: 'rtl' as const };
const bold = { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800' as const };
const s = StyleSheet.create({
  page: { alignItems: 'center' },
  wrap: { width: '100%', maxWidth: 760, gap: 16 },
  top: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 999, padding: 8, gap: 8 },
  brandRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  logoMark: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  logoMarkText: { ...bold, fontSize: 17 },
  logo: { ...bold, fontSize: 19, letterSpacing: 3 },
  homeBtn: { minHeight: 44, borderRadius: 999, paddingHorizontal: 16, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  btnText: { ...bold, fontSize: 14, ...rtl },
  tabs: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  tab: { minHeight: 44, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, justifyContent: 'center', flexGrow: 1 },
  tabText: { ...bold, fontSize: 14, textAlign: 'center' },
  hero: { borderWidth: 1, borderRadius: 28, padding: 22, gap: 8 },
  eyebrow: { ...bold, fontSize: 13, letterSpacing: 1, ...rtl },
  h1: { ...bold, fontSize: 36, lineHeight: 54, ...rtl },
  lead: { fontSize: 16, lineHeight: 28, ...rtl },
  price: { flexDirection: 'row-reverse', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 6, alignSelf: 'flex-end' },
  priceText: { ...bold, fontSize: 24, lineHeight: 36, ...rtl },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { ...bold, fontSize: 12 },
  notice: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, borderRadius: 18, padding: 14 },
  card: { borderWidth: 1, borderRadius: 24, padding: 20, gap: 12 },
  cardHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  num: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  numText: { ...bold, fontSize: 14 },
  h2: { ...bold, fontSize: 19, lineHeight: 32, flex: 1, ...rtl },
  body: { fontSize: 16, lineHeight: 29, ...rtl },
  link: { textDecorationLine: 'underline' },
  footLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'center' },
});
