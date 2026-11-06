import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { NATIVE_DRIVER, useReduceMotion } from '@/components/HomeMotion';

/**
 * One-shot staged entrance on mount (or when `trigger` changes). Bounded spring,
 * stopped on unmount, snaps to rest under Reduce Motion. Never loops.
 */
export function Enter({ children, delay = 0, from = 'up', style, trigger, testID }: {
  children: React.ReactNode; delay?: number; from?: 'up' | 'side' | 'pop'; style?: StyleProp<ViewStyle>; trigger?: unknown; testID?: string;
}) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(1)).current;
  const played = useRef<unknown>(Symbol('none'));
  useEffect(() => {
    if (reduce) { v.setValue(1); return; }
    if (played.current === trigger) return;
    played.current = trigger;
    v.setValue(0);
    const a = Animated.sequence([
      Animated.delay(delay),
      Animated.spring(v, { toValue: 1, damping: 13, stiffness: 170, mass: 0.85, useNativeDriver: NATIVE_DRIVER }),
    ]);
    a.start(({ finished }) => { if (!finished) v.setValue(1); });
    return () => { a.stop(); v.setValue(1); };
  }, [reduce, trigger, delay, v]);
  const transform = from === 'side'
    ? [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-56, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }]
    : from === 'pop'
      ? [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '0deg'] }) }]
      : [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [38, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }];
  return <Animated.View testID={testID} style={[style, { opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.85, 1], extrapolate: 'clamp' }), transform }]}>{children}</Animated.View>;
}

/**
 * Web-only route entrance for the root navigator. Native stacks already animate.
 * Does not key/remount children; it only plays a bounded lift when the path changes.
 * Opacity floor stays visible so persistent tabs are never hidden.
 */
export function RouteEntrance({ path, children }: { path: string; children: React.ReactNode }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(1)).current;
  const last = useRef(path);
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || reduce || last.current === path) {
      last.current = path; v.setValue(1); setMoving(false); return;
    }
    last.current = path;
    setMoving(true);
    v.setValue(0);
    const a = Animated.spring(v, { toValue: 1, damping: 16, stiffness: 200, mass: 0.8, useNativeDriver: false });
    a.start(({ finished }) => { if (finished) setMoving(false); else v.setValue(1); });
    return () => { a.stop(); v.setValue(1); };
  }, [path, reduce, v]);
  return <Animated.View style={{
    flex: 1,
    opacity: moving ? v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1], extrapolate: 'clamp' }) : 1,
    transform: moving ? [
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.975, 1] }) },
    ] : undefined,
  }}>{children}</Animated.View>;
}
