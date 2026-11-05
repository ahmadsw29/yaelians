import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { DOCK_TABS, MENU_GROUPS, WEB_TAB_BAR_HEIGHT } from '../../artifacts/yael-arabic-prep/constants/navigation';

vi.mock('react-native', () => ({
  View: 'View', Text: 'Text', Pressable: 'Pressable',
  Platform: { OS: 'web', select: (options: any) => options.web ?? options.default },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));
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
    const page = entry.href.slice(1);
    const direct = fileURLToPath(new URL(`../../artifacts/yael-arabic-prep/app/${page}.tsx`, import.meta.url));
    const tab = fileURLToPath(new URL(`../../artifacts/yael-arabic-prep/app/(tabs)/${page}.tsx`, import.meta.url));
    expect(existsSync(direct) || existsSync(tab)).toBe(true);
    expect(`${entry.title} ${entry.caption}`).not.toMatch(/\b[A-Z]-\d+\b|\.pdf\b/i);
  }
  expect(Object.keys(DOCK_TABS)).toEqual(['index', 'practice', 'progress', 'profile', 'menu']);
});

test('dock follows navigator selection and preserves preventable tab events', async () => {
  let prevent = false;
  const navigation = {
    emit: vi.fn(() => ({ defaultPrevented: prevent })),
    navigate: vi.fn(),
  };
  const routes = ['menu', 'profile', 'index', 'progress', 'practice', 'hidden'].map(name => ({
    key: `key-${name}`, name, params: { retained: name },
  }));
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<AppDock {...({
    state: { routes, index: 0 }, navigation, descriptors: {},
  } as any)} />); });
  const button = (name: string) => tree.root.findByProps({ testID: `dock-tab-${name}` });
  expect(tree.root.findAllByType('Pressable' as any)).toHaveLength(5);
  expect(button('menu').props['aria-selected']).toBe(true);
  expect(button('index').props.accessibilityState.selected).toBe(false);
  expect(tree.root.findAllByType('View' as any)[0].props.style[1].height).toBe(WEB_TAB_BAR_HEIGHT);
  await act(async () => { button('menu').props.onPress(); });
  expect(navigation.navigate).not.toHaveBeenCalled();
  await act(async () => { button('index').props.onPress(); });
  expect(navigation.navigate).toHaveBeenCalledWith('index', { retained: 'index' });
  navigation.navigate.mockClear();
  prevent = true;
  await act(async () => { button('progress').props.onPress(); });
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(navigation.emit).toHaveBeenLastCalledWith({ type: 'tabPress', target: 'key-progress', canPreventDefault: true });
  await act(async () => { button('profile').props.onLongPress(); });
  expect(navigation.emit).toHaveBeenLastCalledWith({ type: 'tabLongPress', target: 'key-profile' });
  await act(async () => { tree.unmount(); });
});
