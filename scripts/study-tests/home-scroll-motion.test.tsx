import React, { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, test, vi } from 'vitest';
import { revealProgress, revealScrollRange } from '../../artifacts/yael-arabic-prep/lib/home-reveal';

const native = vi.hoisted(() => ({
  listener: null as null | ((enabled: boolean) => void),
  remove: vi.fn(),
  initial: vi.fn<() => Promise<boolean>>(),
}));
vi.mock('react-native', () => ({
  Animated: { View: 'MotionView' },
  Platform: { OS: 'web' },
  AccessibilityInfo: {
    isReduceMotionEnabled: native.initial,
    addEventListener: (_event: string, listener: (enabled: boolean) => void) => {
      native.listener = listener;
      return { remove: native.remove };
    },
  },
}));
import { HomeMotionProvider, Reveal, RevealGroup, ScrollSway, useReduceMotion } from '../../artifacts/yael-arabic-prep/components/HomeMotion';

afterEach(() => { vi.clearAllMocks(); native.listener = null; });

test('first-screen and unmeasured content stays fully visible', () => {
  for (const top of [-1, 0, 300, 660]) expect(revealScrollRange(top, 800)).toBeNull();
  for (const [top, viewport] of [[NaN, 800], [Infinity, 800], [1000, NaN], [1000, 0]]) {
    expect(revealScrollRange(top, viewport)).toBeNull();
  }
  expect(revealProgress(0, null)).toBe(1);
});

test('reveal progress follows scrolling and clamps safely at both ends', () => {
  const range = revealScrollRange(1000, 800);
  expect(range).toEqual([340, 560]);
  expect(revealProgress(0, range)).toBe(0);
  expect(revealProgress(450, range)).toBe(0.5);
  expect(revealProgress(560, range)).toBe(1);
  expect(revealProgress(10000, range)).toBe(1);
  expect(revealScrollRange(1000, 800, 0)).toEqual([340, 341]);
});

test('the last card fully reveals at the maximum reachable scroll offset', () => {
  const range = revealScrollRange(2150, 800, 220, 140, 2400);
  expect(range).toEqual([1490, 1600]);
  expect(revealProgress(1600, range)).toBe(1);
  expect(revealScrollRange(700, 800, 220, 140, 800)).toBeNull();
});

test('nested motion measures offsets without remounting cards or changing layout', async () => {
  let mounts = 0;
  function Card() { useEffect(() => { mounts++; }, []); return <span>Study action</span>; }
  const scrollY = { interpolate: vi.fn(options => options) };
  const content = <RevealGroup style={{ gap: 24 }}>
    <Reveal testID="card"><Card /><ScrollSway><span>Pet</span></ScrollSway></Reveal>
  </RevealGroup>;
  let tree: ReactTestRenderer;
  const render = (reduce: boolean) => <HomeMotionProvider scrollY={scrollY as any} viewport={800} reduce={reduce}>{content}</HomeMotionProvider>;
  await act(async () => { tree = create(render(false)); });
  const views = () => tree!.root.findAllByType('MotionView' as any);
  const layout = (y: number, height = 100) => ({ nativeEvent: { layout: { y, height } } });
  await act(async () => { views()[0].props.onLayout(layout(120)); });
  await act(async () => { views()[1].props.onLayout(layout(900)); });
  await act(async () => { views()[2].props.onLayout(layout(5, 60)); });
  expect(mounts).toBe(1);
  expect(views()[0].props.style).toEqual({ gap: 24 });
  expect(views()[1].props.style[1].opacity.inputRange).toEqual([360, 580]);
  expect(views()[1].props.style[1].transform[0].translateY.outputRange).toEqual([48, 0]);
  expect(views()[1].props.style[1].transform[1].scale.outputRange).toEqual([0.88, 1]);
  expect(views()[2].props.style.transform[0].translateY.inputRange).toEqual([345, 515, 685]);
  expect(views()[2].props.pointerEvents).toBe('none');
  await act(async () => { tree!.update(render(true)); });
  expect(views()[1].props.style[1]).toBeNull();
  expect(views()[2].props.style).toBeNull();
  expect(mounts).toBe(1);
  await act(async () => { tree!.unmount(); });
});

test('reduced motion is safe before lookup, updates live, and ignores stale lookups', async () => {
  let resolve!: (enabled: boolean) => void;
  native.initial.mockImplementation(() => new Promise<boolean>(done => { resolve = done; }));
  let reduced: boolean | undefined;
  function Probe() { reduced = useReduceMotion(); return null; }
  let tree: ReactTestRenderer;
  await act(async () => { tree = create(<Probe />); });
  expect(reduced).toBe(true);
  await act(async () => { native.listener?.(false); });
  expect(reduced).toBe(false);
  await act(async () => { resolve(true); });
  expect(reduced).toBe(false);
  await act(async () => { native.listener?.(true); });
  expect(reduced).toBe(true);
  await act(async () => { tree!.unmount(); });
  expect(native.remove).toHaveBeenCalledOnce();
});
