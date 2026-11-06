import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlay } from '@/components/Playful';
import { useReduceMotion } from '@/components/HomeMotion';
import { ARABIC_BOLD_FONT } from '@/constants/typography';
import { DOCK_GROUP_OF, DOCK_TABS, WEB_TAB_BAR_HEIGHT } from '@/constants/navigation';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
const ND = Platform.OS !== 'web';

function DockIcon({ name, focused, color, reduce }: { name: string; focused: boolean; color: string; reduce: boolean }) {
  const pop = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) { pop.setValue(focused ? 1 : 0); return; }
    const a = Animated.spring(pop, { toValue: focused ? 1 : 0, damping: 7, stiffness: 180, mass: 0.8, useNativeDriver: ND });
    a.start(); return () => a.stop();
  }, [focused, reduce, pop]);
  return (
    <Animated.View style={{ transform: [
      { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
      { scale: pop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.28, 1.12] }) },
      { rotate: pop.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-14deg', '0deg'] }) },
    ] }}>
      <Feather name={name as any} size={21} color={color} />
    </Animated.View>
  );
}

/** Classic dock: floating frosted capsule (solid tint, no backdrop filter), real navigator events. */
export default function AppDock({ state, navigation, descriptors }: BottomTabBarProps) {
  const p = usePlay();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const isWeb = Platform.OS === 'web';
  const current = state.routes[state.index]?.name;
  const activeName = DOCK_GROUP_OF[current] ?? current;
  const order = Object.keys(DOCK_TABS);
  const routes = state.routes.filter(r => DOCK_TABS[r.name])
    .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  const activeIdx = Math.max(0, routes.findIndex(r => r.name === activeName));
  const [w, setW] = useState(0);
  const slot = w / Math.max(1, routes.length);
  const pos = useRef(new Animated.Value(activeIdx)).current;
  const press = useRef(new Animated.Value(1)).current;
  const squeeze = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    if (reduce) { squeeze.current?.stop(); press.setValue(1); }
    return () => { squeeze.current?.stop(); };
  }, [reduce, press]);
  useEffect(() => {
    if (reduce) { pos.setValue(activeIdx); return; }
    const a = Animated.spring(pos, { toValue: activeIdx, damping: 15, stiffness: 170, useNativeDriver: ND });
    a.start(); return () => a.stop();
  }, [activeIdx, reduce, pos]);
  const bump = () => {
    if (reduce) return;
    squeeze.current?.stop();
    press.setValue(1);
    squeeze.current = Animated.sequence([
      Animated.timing(press, { toValue: 0.96, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.spring(press, { toValue: 1, damping: 6, stiffness: 260, useNativeDriver: ND }),
    ]);
    squeeze.current.start();
  };
  const ink = p.isDark ? p.primary : p.brandShade;
  // RTL: index 0 sits at the right edge.
  const indicatorX = slot > 0 ? pos.interpolate({
    inputRange: routes.map((_, i) => i), outputRange: routes.map((_, i) => w - (i + 1) * slot + 4),
    extrapolate: 'clamp',
  }) : 0;
  return (
    <View pointerEvents="box-none" style={[s.bar, {
      height: isWeb ? WEB_TAB_BAR_HEIGHT : 56 + insets.bottom,
      paddingBottom: isWeb ? 14 : insets.bottom,
    }]}>
      <Animated.View testID="app-dock" style={[s.capsule, {
        backgroundColor: p.isDark ? 'rgba(27,43,39,0.96)' : 'rgba(255,253,248,0.96)',
        borderColor: p.border, shadowColor: p.isDark ? '#000' : '#0f3a33', transform: [{ scale: press }],
      }]}>
        <View style={s.row} role="tablist" aria-label="التنقّل الرئيسي" onLayout={e => setW(e.nativeEvent.layout.width)}>
          {slot > 0 && (
            <Animated.View testID="dock-active-indicator" pointerEvents="none" style={[s.indicator, {
              width: slot - 8, backgroundColor: p.isDark ? 'rgba(133,203,187,0.18)' : p.brandSoft,
              borderColor: p.isDark ? 'rgba(133,203,187,0.35)' : 'rgba(15,77,69,0.14)',
              transform: [{ translateX: indicatorX as any }],
            }]} />
          )}
          {routes.map(route => {
            const focused = route.name === activeName;
            const exact = route.key === state.routes[state.index]?.key;
            const meta = DOCK_TABS[route.name];
            const opts = descriptors[route.key]?.options;
            const color = focused ? ink : p.mutedForeground;
            return (
              <Pressable key={route.key} testID={`dock-tab-${route.name}`}
                accessibilityRole="tab" accessibilityState={{ selected: focused }} aria-selected={focused}
                accessibilityLabel={opts?.tabBarAccessibilityLabel ?? meta.title}
                onPress={() => {
                  bump();
                  const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  // Listeners may reset selection; route.params is still the pre-event snapshot.
                  if (!exact && !e.defaultPrevented) navigation.navigate(
                    route.name,
                    route.name === 'practice' ? { ...route.params, section: 'training' } : route.params,
                  );
                }}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                style={({ pressed }) => [s.tab, pressed && { opacity: 0.75 }]}>
                <DockIcon name={meta.icon} focused={focused} color={color} reduce={reduce} />
                <Text numberOfLines={1} style={[s.label, { color, fontWeight: focused ? '800' : '600' }]}>{meta.title}</Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 14 },
  capsule: { width: '100%', maxWidth: 380, height: 54, borderRadius: 27, borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  row: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center' },
  indicator: { position: 'absolute', left: 0, top: 4, bottom: 4, borderRadius: 23, borderWidth: 1 },
  tab: { flex: 1, minHeight: 48, minWidth: 44, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 1 },
  label: { fontSize: 11, fontFamily: ARABIC_BOLD_FONT },
});
