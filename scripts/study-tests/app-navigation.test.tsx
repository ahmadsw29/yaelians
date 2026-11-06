import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { DOCK_GROUP_OF, DOCK_TABS, MENU_GROUPS, WEB_TAB_BAR_HEIGHT } from '../../artifacts/yael-arabic-prep/constants/navigation';

const motion = vi.hoisted(() => ({
  reduce: false,
  handles: [] as { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[],
}));
vi.mock('@/components/HomeMotion', () => ({ useReduceMotion: () => motion.reduce }));
vi.mock('react-native', () => {
  class Value {
    value: number;
    constructor(value: number) { this.value = value; }
    setValue(value: number) { this.value = value; }
    interpolate(config: unknown) { return config; }
  }
  const animation = () => {
    const handle = { start: vi.fn(), stop: vi.fn() };
    motion.handles.push(handle);
    return handle;
  };
  return ({
  View: 'View', Text: 'Text', Pressable: 'Pressable',
  Animated: { Value, View: 'AnimatedView', spring: animation, timing: animation, sequence: animation },
  Easing: { quad: (value: number) => value, out: (fn: unknown) => fn },
  Platform: { OS: 'web', select: (options: any) => options.web ?? options.default },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}); });
vi.mock('@expo/vector-icons', () => ({ Feather: 'Icon' }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 47, bottom: 34 }) }));
vi.mock('@/components/Playful', () => ({
  usePlay: () => ({
    isDark: false, border: '#ddd', primary: '#17665c', brandShade: '#17665c',
    mutedForeground: '#74817a', brandSoft: '#dcf4ea',
  }),
}));
import AppDock from '../../artifacts/yael-arabic-prep/components/AppDock';

test('menu entries are unique, real existing destinations without source identifiers', () => {
  const entries = MENU_GROUPS.flatMap(group => group.items);
  expect(entries.map(item => item.key)).toEqual([
    'practice', 'restatement', 'reading', 'flashcards', 'study', 'timed', 'library', 'progress', 'profile',
  ]);
  expect(new Set(entries.map(item => item.href)).size).toBe(entries.length);
  for (const entry of entries) {
    const page = entry.href.slice(1).split('?')[0];
    const direct = fileURLToPath(new URL(`../../artifacts/yael-arabic-prep/app/${page}.tsx`, import.meta.url));
    const tab = fileURLToPath(new URL(`../../artifacts/yael-arabic-prep/app/(tabs)/${page}.tsx`, import.meta.url));
    expect(existsSync(direct) || existsSync(tab)).toBe(true);
    expect(`${entry.title} ${entry.caption}`).not.toMatch(/\b[A-Z]-\d+\b|\.pdf\b/i);
  }
  expect(Object.keys(DOCK_TABS)).toEqual(['menu', 'practice', 'progress', 'index']);
  expect(DOCK_GROUP_OF.profile).toBe('menu');
});

test('dock follows navigator selection and preserves preventable tab events', async () => {
  let prevent = false;
  const navigation = {
    emit: vi.fn(() => ({ defaultPrevented: prevent })),
    navigate: vi.fn(),
  };
  const routes = ['menu', 'profile', 'index', 'progress', 'practice', 'hidden'].map(name => ({
    key: `key-${name}`, name, params: { retained: name, ...(name === 'practice' ? { section: 'vocabulary' } : {}) },
  }));
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<AppDock {...({
    state: { routes, index: 0 }, navigation, descriptors: {},
  } as any)} />); });
  const button = (name: string) => tree.root.findByProps({ testID: `dock-tab-${name}` });
  expect(tree.root.findAllByType('Pressable' as any)).toHaveLength(4);
  expect(tree.root.findAllByType('Pressable' as any).map(item => item.props.testID))
    .toEqual(['dock-tab-menu', 'dock-tab-practice', 'dock-tab-progress', 'dock-tab-index']);
  expect(button('menu').props['aria-selected']).toBe(true);
  expect(button('index').props.accessibilityState.selected).toBe(false);
  expect(tree.root.findAllByType('View' as any)[0].props.style[1].height).toBe(WEB_TAB_BAR_HEIGHT);
  await act(async () => { button('menu').props.onPress(); });
  expect(navigation.navigate).not.toHaveBeenCalled();
  await act(async () => { button('index').props.onPress(); });
  expect(navigation.navigate).toHaveBeenCalledWith('index', { retained: 'index' });
  navigation.navigate.mockClear();
  await act(async () => { button('practice').props.onPress(); });
  expect(navigation.navigate).toHaveBeenCalledWith('practice', { retained: 'practice', section: 'training' });
  navigation.navigate.mockClear();
  prevent = true;
  await act(async () => { button('progress').props.onPress(); });
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(navigation.emit).toHaveBeenLastCalledWith({ type: 'tabPress', target: 'key-progress', canPreventDefault: true });
  await act(async () => { button('progress').props.onLongPress(); });
  expect(navigation.emit).toHaveBeenLastCalledWith({ type: 'tabLongPress', target: 'key-progress' });
  await act(async () => { tree.update(<AppDock {...({
    state: { routes, index: 1 }, navigation, descriptors: {},
  } as any)} />); });
  expect(button('menu').props['aria-selected']).toBe(true);
  prevent = false;
  await act(async () => { button('menu').props.onPress(); });
  expect(navigation.navigate).toHaveBeenCalledWith('menu', { retained: 'menu' });
  const squeeze = motion.handles.at(-1)!;
  expect(squeeze.start).toHaveBeenCalled();
  motion.reduce = true;
  await act(async () => { tree.update(<AppDock {...({
    state: { routes, index: 1 }, navigation, descriptors: {},
  } as any)} />); });
  const settledHandleCount = motion.handles.length;
  await act(async () => { button('index').props.onPress(); });
  expect(motion.handles).toHaveLength(settledHandleCount);
  await act(async () => { tree.unmount(); });
  expect(squeeze.stop).toHaveBeenCalled();
  motion.reduce = false;
});
