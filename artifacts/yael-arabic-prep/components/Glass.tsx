import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useReduceMotion } from '@/components/HomeMotion';

/**
 * Soft frosted controls: uniform translucent tint, a quiet edge and minimal
 * elevation. No shine bands or glossy gradients. Native platforms use the same
 * lightweight tint; supported browsers also blur the backdrop.
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
  rim: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.35)',
  edge: dark ? 'rgba(255,255,255,0.10)' : 'rgba(23,51,47,0.10)',
  clearFill: dark ? 'rgba(222,240,231,0.065)' : 'rgba(255,255,255,0.76)',
  shadow: dark ? '#000' : '#0f3a33',
  focus: dark ? '#85cbbb' : '#17665c',
});

/** Keep colour contrast while removing the old opaque, two-tone gloss. */
export function frostedTint(color: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const rgb = [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16));
  return `rgba(${rgb.join(',')},0.94)`;
}

type State = { pressed: boolean; hovered?: boolean; focused?: boolean };

export function GlassPressable({ fill, solid, dark, disabled, radius = 18, style, contentStyle, children, ...rest }: Omit<PressableProps, 'style' | 'children'> & {
  /** Existing two-stop callers remain compatible; only the flat first tint is used. */
  fill?: readonly [string, string]; solid?: string; dark: boolean; radius?: number;
  style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle>; children: React.ReactNode;
}) {
  const reduced = useReducedTransparency();
  const reduceMotion = useReduceMotion();
  const t = glassTokens(dark);
  const surfaceFill = fill ? frostedTint(fill[0]) : t.clearFill;
  const opaqueFill = solid ?? (fill?.[0] && !fill[0].startsWith('rgba') ? fill[0] : dark ? '#253c34' : '#fffdf8');
  return (
    <Pressable disabled={disabled} {...rest}
      style={(st) => {
        const { pressed, hovered, focused } = st as State;
        const live = !disabled;
        return [
          g.base, { borderRadius: radius, borderColor: t.edge, shadowColor: t.shadow },
          Platform.OS === 'web' && {
            // Progressive enhancement; uniform frosted tint works without blur.
            backgroundColor: 'transparent',
            backdropFilter: reduced ? 'none' : 'blur(18px) saturate(125%)',
            WebkitBackdropFilter: reduced ? 'none' : 'blur(18px) saturate(125%)',
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
            <View style={[StyleSheet.absoluteFill, { backgroundColor: reduced || disabled ? opaqueFill : surfaceFill }]} />
            <View style={[StyleSheet.absoluteFill, g.rim, { borderRadius: radius, borderColor: disabled ? 'transparent' : t.rim }]} />
            {pressed && !disabled && <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(255,255,255,0.035)' : 'rgba(15,58,51,0.04)' }]} />}
          </View>
          <View style={[g.content, contentStyle]}>{children}</View>
        </>;
      }}
    </Pressable>
  );
}

const g = StyleSheet.create({
  base: { borderWidth: StyleSheet.hairlineWidth, overflow: 'visible' },
  lift: { shadowOpacity: 0.045, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  flat: { shadowOpacity: 0, elevation: 0 },
  hover: { shadowOpacity: 0.08 },
  pressed: { transform: [{ scale: 0.985 }], shadowOpacity: 0, elevation: 0 },
  rim: { borderWidth: 1 },
  content: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9 },
});
