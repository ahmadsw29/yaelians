import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlay } from '@/components/Playful';
import { ARABIC_BOLD_FONT } from '@/constants/typography';
import { DOCK_TABS, WEB_TAB_BAR_HEIGHT } from '@/constants/navigation';

/** Classic dock: solid frosted tint (no backdrop filter), real navigator events. */
export default function AppDock({ state, navigation, descriptors }: BottomTabBarProps) {
  const p = usePlay();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const activeKey = state.routes[state.index]?.key;
  const routes = state.routes.filter(r => DOCK_TABS[r.name]);
  return (
    <View style={[s.bar, {
      height: isWeb ? WEB_TAB_BAR_HEIGHT : 56 + insets.bottom,
      paddingBottom: isWeb ? 22 : insets.bottom,
      backgroundColor: p.isDark ? 'rgba(27,43,39,0.97)' : 'rgba(255,253,248,0.97)',
      borderTopColor: p.border,
    }]}>
      <View style={s.row} role="tablist" aria-label="التنقّل الرئيسي">
        {routes.map(route => {
          const focused = route.key === activeKey;
          const meta = DOCK_TABS[route.name];
          const opts = descriptors[route.key]?.options;
          const isMenu = route.name === 'menu';
          const color = focused ? (p.isDark ? p.primary : p.brandShade) : p.mutedForeground;
          return (
            <Pressable key={route.key} testID={`dock-tab-${route.name}`}
              accessibilityRole="tab" accessibilityState={{ selected: focused }} aria-selected={focused}
              accessibilityLabel={opts?.tabBarAccessibilityLabel ?? meta.title}
              onPress={() => {
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [s.tab, pressed && { opacity: 0.7 }]}>
              <View style={[s.pill, focused && { backgroundColor: p.isDark ? 'rgba(133,203,187,0.16)' : p.brandSoft },
                isMenu && !focused && { borderWidth: 1, borderColor: p.border }]}>
                <Feather name={meta.icon as any} size={20} color={color} />
              </View>
              <Text numberOfLines={1} style={[s.label, { color, fontWeight: focused ? '800' : '600' }]}>{meta.title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 6 },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 2 },
  pill: { width: 50, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontFamily: ARABIC_BOLD_FONT },
});
