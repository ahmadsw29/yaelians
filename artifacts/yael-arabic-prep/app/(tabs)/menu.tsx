import React, { useCallback, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlay } from '@/components/Playful';
import { Creature } from '@/components/PetTeacher';
import { useReduceMotion } from '@/components/HomeMotion';
import { ARABIC_FONT, ARABIC_BOLD_FONT } from '@/constants/typography';
import { MENU_GROUPS, WEB_TAB_BAR_HEIGHT, type MenuDestination } from '@/constants/navigation';

const FONT = ARABIC_FONT;
const ND = Platform.OS !== 'web';
const ITEM_COUNT = MENU_GROUPS.reduce((n, g) => n + g.items.length, 0);

export default function MenuScreen() {
  const p = usePlay();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [focused, setFocused] = useState(false);
  const panel = useRef(new Animated.Value(1)).current;
  const pet = useRef(new Animated.Value(1)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const items = useRef(Array.from({ length: ITEM_COUNT }, () => new Animated.Value(1))).current;

  useFocusEffect(useCallback(() => {
    setFocused(true);
    const all = [panel, pet, ...items];
    if (reduce) {
      all.forEach(v => v.setValue(1)); wave.setValue(0);
      return () => setFocused(false);
    }
    all.forEach(v => v.setValue(0)); wave.setValue(0);
    const anim = Animated.parallel([
      Animated.spring(panel, { toValue: 1, damping: 14, stiffness: 140, useNativeDriver: ND }),
      Animated.sequence([Animated.delay(120), Animated.spring(pet, { toValue: 1, damping: 6, stiffness: 150, useNativeDriver: ND })]),
      Animated.sequence([Animated.delay(380), Animated.loop(Animated.sequence([
        Animated.timing(wave, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
        Animated.timing(wave, { toValue: -1, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
      ]), { iterations: 3 }), Animated.timing(wave, { toValue: 0, duration: 200, useNativeDriver: ND })]),
      Animated.stagger(65, items.map(v => Animated.spring(v, { toValue: 1, damping: 11, stiffness: 160, useNativeDriver: ND }))),
    ]);
    anim.start();
    return () => { anim.stop(); all.forEach(v => v.setValue(1)); wave.setValue(0); setFocused(false); };
  }, [reduce, panel, pet, wave, items]));

  const close = () => { if (router.canGoBack()) router.back(); else router.navigate('/'); };
  const tones = {
    brand: [p.brandSoft, p.brandShade], sky: [p.skySoft, p.skyInk],
    sun: [p.sunSoft, p.sunInk], coral: [p.coralSoft, p.coralInk],
  } as const;
  let idx = 0;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: p.background }} testID="app-menu"
      aria-hidden={!focused} accessibilityElementsHidden={!focused}
      importantForAccessibility={focused ? 'auto' : 'no-hide-descendants'}
      pointerEvents={focused ? 'auto' : 'none'}
      contentContainerStyle={[s.content, {
        paddingTop: Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top + 12,
        paddingBottom: 28 + (Platform.OS === 'web' ? WEB_TAB_BAR_HEIGHT : 56 + insets.bottom),
      }]}>
      <Animated.View testID="menu-panel-motion" style={[s.sheet, { backgroundColor: p.card, borderColor: p.border, opacity: panel, transform: [
        { translateY: panel.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) },
        { scale: panel.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
      ] }]}>
        <View style={[s.handle, { backgroundColor: p.border }]} />
        <View style={s.head}>
          <Pressable testID="menu-close" accessibilityRole="button" accessibilityLabel="إغلاق القائمة والرجوع" onPress={close}
            hitSlop={6} style={({ pressed }) => [s.close, { backgroundColor: p.brandSoft, borderColor: p.border }, pressed && { transform: [{ scale: 0.92 }] }]}>
            <Feather name="x" size={20} color={p.brandShade} />
          </Pressable>
          <View style={s.greet}>
            <Text style={[s.eyebrow, { color: p.brandShade }]}>كَلِمَة</Text>
            <Text style={[s.title, { color: p.foreground }]}>القائمة</Text>
            <Text style={[s.sub, { color: p.mutedForeground }]}>أهلًا! زيزو يرافقك. إلى أين نذهب الآن؟</Text>
          </View>
          <Animated.View testID="menu-pet-motion" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
            style={[s.pet, { backgroundColor: p.sunSoft, transform: [
              { translateY: pet.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
              { scale: pet.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              { rotate: wave.interpolate({ inputRange: [-1, 1], outputRange: ['-10deg', '10deg'] }) },
            ] }]}>
            <Creature kind="zizo" mood="hype" size={74} />
          </Animated.View>
        </View>
      </Animated.View>
      {MENU_GROUPS.map(group => (
        <View key={group.key} style={s.group}>
          <Text style={[s.groupTitle, { color: p.mutedForeground }]}>{group.title}</Text>
          <View style={[s.list, group.key === 'learn' && s.learningGrid]}>
            {group.items.map((item: MenuDestination) => {
              const [bg, ink] = tones[item.tone];
              const v = items[idx++];
              const tile = group.key === 'learn' && item.key !== 'study';
              return (
                <Animated.View key={item.key} testID={`menu-reveal-${item.key}`} style={[
                  tile && s.tileWrap, group.key === 'learn' && !tile && s.fullRow, { opacity: v, transform: [
                  { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) },
                  { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                ] }]}>
                  <Pressable testID={`menu-item-${item.key}`} accessibilityRole="button"
                    accessibilityLabel={`${item.title}، ${item.caption}`}
                    onPress={() => router.push(item.href as any)}
                    style={({ pressed }) => [s.row, tile && s.tile, { backgroundColor: p.card, borderColor: p.border },
                      pressed && { transform: [{ scale: 0.97 }], backgroundColor: bg }]}>
                    <View style={[s.icon, { backgroundColor: bg }]}><Feather name={item.icon as any} size={20} color={ink} /></View>
                    <View style={[s.copy, tile && s.tileCopy]}>
                      <Text style={[s.itemTitle, { color: p.foreground }]}>{item.title}</Text>
                      <Text style={[s.caption, { color: p.mutedForeground }]}>{item.caption}</Text>
                    </View>
                    <View style={[s.chev, tile && s.tileChevron, { backgroundColor: bg }]}><Feather name="chevron-left" size={16} color={ink} /></View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 18, maxWidth: 600, width: '100%', alignSelf: 'center' },
  sheet: { borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, padding: 16, paddingTop: 10 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: 10 },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  greet: { flex: 1, alignItems: 'flex-end' },
  pet: { width: 88, height: 88, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', top: -4, left: -4, width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  eyebrow: { textAlign: 'right', fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 13 },
  title: { textAlign: 'right', fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 28, marginTop: 2 },
  sub: { textAlign: 'right', fontFamily: FONT, fontSize: 14, marginTop: 4 },
  group: { marginTop: 20 },
  groupTitle: { textAlign: 'right', fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 12, marginBottom: 8, marginRight: 4 },
  list: { gap: 8 },
  learningGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  tileWrap: { flexBasis: '47%', flexGrow: 1 },
  fullRow: { flexBasis: '100%' },
  tile: { minHeight: 138, flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 12, gap: 8 },
  tileCopy: { flexBasis: 'auto', flexGrow: 0, flexShrink: 0, alignSelf: 'stretch' },
  tileChevron: { position: 'absolute', left: 12, top: 18 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingHorizontal: 12, minHeight: 64, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chev: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, alignItems: 'flex-end' },
  itemTitle: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 15 },
  caption: { fontFamily: FONT, fontSize: 12, marginTop: 1 },
});
