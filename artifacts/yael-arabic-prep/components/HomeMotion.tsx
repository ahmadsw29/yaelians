import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { revealScrollRange } from '@/lib/home-reveal';

export const NATIVE_DRIVER = Platform.OS !== 'web';

type Ctx = { scrollY: Animated.Value; viewport: number; contentHeight?: number; offset: number; reduce: boolean };
const MotionCtx = createContext<Ctx | null>(null);

export function useReduceMotion() {
  // Stay still until the preference is known; never flash motion on startup.
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    let alive = true;
    let changed = false;
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v: boolean) => {
      if (alive) { changed = true; setReduce(!!v); }
    });
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive && !changed) setReduce(!!v);
    }).catch(() => {});
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return reduce;
}

export function HomeMotionProvider({ scrollY, viewport, contentHeight, reduce, children }: { scrollY: Animated.Value; viewport: number; contentHeight?: number; reduce: boolean; children: React.ReactNode }) {
  return <MotionCtx.Provider value={{ scrollY, viewport, contentHeight, offset: 0, reduce }}>{children}</MotionCtx.Provider>;
}

/** Nested container: measures its own y so children get content-absolute positions. */
export function RevealGroup({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const ctx = useContext(MotionCtx);
  const [y, setY] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => { const ny = e.nativeEvent.layout.y; if (ny !== y) setY(ny); };
  return (
    <Animated.View style={style} onLayout={onLayout}>
      {ctx ? <MotionCtx.Provider value={{ ...ctx, offset: ctx.offset + (y ?? 0) }}>{children}</MotionCtx.Provider> : children}
    </Animated.View>
  );
}

function useItemRange() {
  const ctx = useContext(MotionCtx);
  const [top, setTop] = useState<number | null>(null);
  const [height, setHeight] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const { y, height: h } = e.nativeEvent.layout;
    if (y !== top) setTop(y);
    if (h !== height) setHeight(h);
  };
  return { ctx, absTop: top == null || !ctx ? null : ctx.offset + top, height, onLayout };
}

/** Scroll-linked reveal: fades/lifts in as it enters; stays shown when scrolled past or reversed. */
export function Reveal({ children, style, lift = 48, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; lift?: number; testID?: string }) {
  const { ctx, absTop, onLayout } = useItemRange();
  const range = ctx && absTop != null && !ctx.reduce ? revealScrollRange(absTop, ctx.viewport, 220, 140, ctx.contentHeight) : null;
  const anim = range && ctx ? {
    opacity: ctx.scrollY.interpolate({ inputRange: range, outputRange: [0.1, 1], extrapolate: 'clamp' }),
    transform: [
      { translateY: ctx.scrollY.interpolate({ inputRange: range, outputRange: [lift, 0], extrapolate: 'clamp' }) },
      { scale: ctx.scrollY.interpolate({ inputRange: range, outputRange: [0.88, 1], extrapolate: 'clamp' }) },
    ],
  } : null;
  return <Animated.View testID={testID} onLayout={onLayout} style={[style, anim]}>
    {ctx ? <MotionCtx.Provider value={{ ...ctx, offset: absTop ?? ctx.offset }}>{children}</MotionCtx.Provider> : children}
  </Animated.View>;
}

/** Character bob, tilt and pop while its card travels through the visible area. */
export function ScrollSway({ children, amount = 12, tilt = 10, testID }: { children: React.ReactNode; amount?: number; tilt?: number; testID?: string }) {
  const { ctx, absTop, height, onLayout } = useItemRange();
  const enabled = ctx && absTop != null && !ctx.reduce;
  let anim: object | null = null;
  if (enabled && ctx && absTop != null) {
    const a = Math.max(0, absTop - ctx.viewport + 120);
    const b = Math.max(a + 1, absTop - ctx.viewport / 2 + height);
    const inputRange = [a, (a + b) / 2, b];
    anim = {
      transform: [
        { translateY: ctx.scrollY.interpolate({ inputRange, outputRange: [amount, -amount, 0], extrapolate: 'clamp' }) },
        { rotate: ctx.scrollY.interpolate({ inputRange, outputRange: [`${-tilt}deg`, `${tilt}deg`, '0deg'], extrapolate: 'clamp' }) },
        { scale: ctx.scrollY.interpolate({ inputRange, outputRange: [0.94, 1.06, 1], extrapolate: 'clamp' }) },
      ],
    };
  }
  return <Animated.View testID={testID} pointerEvents="none" onLayout={onLayout} style={anim}>{children}</Animated.View>;
}
