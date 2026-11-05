import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useReduceMotion } from '@/components/HomeMotion';

/**
 * Glass-inspired controls. Deliberately no per-control blur: layered translucent
 * gradients + specular highlight + hairline rim work on iOS, Android and every
 * browser. When the OS asks for reduced transparency, surfaces become solid.
 */
export function useReducedTransparency() {
  const [reduced, setReduced] = useState(() => Platform.OS === 'ios' || (
    Platform.OS === 'web' && typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches
  ));
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-reduced-transparency: reduce)');
      const update = () => setReduced(media.matches);
      update();
      media.addEventListener?.('change', update);
      return () => media.removeEventListener?.('change', update);
    }
    if (Platform.OS !== 'ios') return;
    let alive = true;
    let changed = false;
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', v => {
      if (alive) { changed = true; setReduced(v); }
    });
    AccessibilityInfo.isReduceTransparencyEnabled().then(v => {
      if (alive && !changed) setReduced(v);
    }).catch(() => {});
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduced;
}

export const glassTokens = (dark: boolean) => ({
  rim: dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.85)',
  edge: dark ? 'rgba(0,0,0,0.35)' : 'rgba(23,51,47,0.10)',
  sheenTop: dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.62)',
  sheenMid: 'rgba(255,255,255,0)',
  clearFill: dark ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)'] as const : ['rgba(255,255,255,0.88)', 'rgba(255,255,255,0.55)'] as const,
  shadow: dark ? '#000' : '#0f3a33',
  focus: dark ? '#85cbbb' : '#17665c',
});

type State = { pressed: boolean; hovered?: boolean; focused?: boolean };

export function GlassPressable({ fill, solid, dark, disabled, radius = 18, style, contentStyle, children, ...rest }: Omit<PressableProps, 'style' | 'children'> & {
  /** two-stop tint; omit for clear glass */
  fill?: readonly [string, string]; solid?: string; dark: boolean; radius?: number;
  style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle>; children: React.ReactNode;
}) {
  const reduced = useReducedTransparency();
  const reduceMotion = useReduceMotion();
  const t = glassTokens(dark);
  const colorsFill = fill ?? t.clearFill;
  const opaqueFill = solid ?? (fill?.[0] && !fill[0].startsWith('rgba') ? fill[0] : dark ? '#253c34' : '#fffdf8');
  return (
    <Pressable disabled={disabled} {...rest}
      style={(st) => {
        const { pressed, hovered, focused } = st as State;
        const live = !disabled;
        return [
          g.base, { borderRadius: radius, borderColor: t.edge, shadowColor: t.shadow },
          Platform.OS === 'web' && {
            // Progressive enhancement; gradients remain usable without browser blur.
            backgroundColor: 'transparent',
            backdropFilter: reduced ? 'none' : 'blur(16px) saturate(155%)',
            WebkitBackdropFilter: reduced ? 'none' : 'blur(16px) saturate(155%)',
            transitionProperty: 'transform, box-shadow, border-color',
            transitionDuration: reduceMotion ? '0ms' : '180ms',
          } as ViewStyle,
          live ? g.lift : g.flat,
          live && hovered && !reduceMotion && g.hover,
          live && pressed && g.pressed,
          live && pressed && reduceMotion && { transform: [] },
          focused && { borderColor: t.focus, borderWidth: 2 },
          style,
        ];
      }}>
      {(st) => {
        const { pressed } = st as State;
        return <>
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
            style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
            {reduced || disabled
              ? <View style={[StyleSheet.absoluteFill, { backgroundColor: opaqueFill }]} />
              : <LinearGradient colors={[colorsFill[0], colorsFill[1]]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />}
            {!reduced && !disabled && <LinearGradient colors={[t.sheenTop, t.sheenMid]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.55 }}
              style={[g.sheen, { borderTopLeftRadius: radius, borderTopRightRadius: radius, opacity: pressed ? 0.45 : 1 }]} />}
            <View style={[StyleSheet.absoluteFill, g.rim, { borderRadius: radius, borderColor: disabled ? 'transparent' : t.rim }]} />
            {pressed && !disabled && <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,58,51,0.06)' }]} />}
          </View>
          <View style={[g.content, contentStyle]}>{children}</View>
        </>;
      }}
    </Pressable>
  );
}

const g = StyleSheet.create({
  base: { borderWidth: StyleSheet.hairlineWidth, overflow: 'visible' },
  lift: { shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  flat: { shadowOpacity: 0, elevation: 0 },
  hover: { transform: [{ translateY: -1 }], shadowOpacity: 0.22 },
  pressed: { transform: [{ scale: 0.97 }], shadowOpacity: 0.08, shadowRadius: 6, elevation: 1 },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%' },
  rim: { borderWidth: 1 },
  content: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9 },
});
