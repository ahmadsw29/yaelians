import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlay } from '@/components/Playful';
import { ARABIC_BOLD_FONT } from '@/constants/typography';
import { MENU_GROUPS, WEB_TAB_BAR_HEIGHT, type MenuDestination } from '@/constants/navigation';

const FONT = Platform.OS === 'web' ? 'Inter_400Regular' : undefined;

export default function MenuScreen() {
  const p = usePlay();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tones = {
    brand: [p.brandSoft, p.brandShade], sky: [p.skySoft, p.skyInk],
    sun: [p.sunSoft, p.sunInk], coral: [p.coralSoft, p.coralInk],
  } as const;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: p.background }} testID="app-menu"
      contentContainerStyle={[s.content, {
        paddingTop: Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top + 12,
        paddingBottom: 28 + (Platform.OS === 'web' ? WEB_TAB_BAR_HEIGHT : 56 + insets.bottom),
      }]}>
      <Text style={[s.eyebrow, { color: p.brandShade }]}>كَلِمَة</Text>
      <Text style={[s.title, { color: p.foreground }]}>القائمة</Text>
      <Text style={[s.sub, { color: p.mutedForeground }]}>كل أقسام التدريب في مكان واحد.</Text>
      {MENU_GROUPS.map(group => (
        <View key={group.key} style={s.group}>
          <Text style={[s.groupTitle, { color: p.mutedForeground }]}>{group.title}</Text>
          <View style={[s.panel, { backgroundColor: p.card, borderColor: p.border }]}>
            {group.items.map((item: MenuDestination, i) => {
              const [bg, ink] = tones[item.tone];
              return (
                <Pressable key={item.key} testID={`menu-item-${item.key}`} accessibilityRole="button"
                  accessibilityLabel={`${item.title}، ${item.caption}`}
                  onPress={() => router.push(item.href as any)}
                  style={({ pressed }) => [s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                    pressed && { backgroundColor: p.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,58,51,0.04)' }]}>
                  <View style={[s.icon, { backgroundColor: bg }]}><Feather name={item.icon as any} size={19} color={ink} /></View>
                  <View style={s.copy}>
                    <Text style={[s.itemTitle, { color: p.foreground }]}>{item.title}</Text>
                    <Text style={[s.caption, { color: p.mutedForeground }]}>{item.caption}</Text>
                  </View>
                  <Feather name="chevron-left" size={18} color={p.mutedForeground} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 20, maxWidth: 600, width: '100%', alignSelf: 'center' },
  eyebrow: { textAlign: 'right', fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 13 },
  title: { textAlign: 'right', fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 28, marginTop: 2 },
  sub: { textAlign: 'right', fontFamily: FONT, fontSize: 14, marginTop: 4, marginBottom: 8 },
  group: { marginTop: 18 },
  groupTitle: { textAlign: 'right', fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 12, marginBottom: 8, marginRight: 4 },
  panel: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 64 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, alignItems: 'flex-end' },
  itemTitle: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 15 },
  caption: { fontFamily: FONT, fontSize: 12, marginTop: 1 },
});
