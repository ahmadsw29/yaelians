import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, test, vi } from 'vitest';
import { shouldBlockStudyLoading } from '../../artifacts/yael-arabic-prep/lib/study-loading';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const state = vi.hoisted(() => ({ loading: true, dark: true }));
vi.mock('@/lib/StudyProvider', () => ({ useStudy: () => ({ loading: state.loading }) }));
vi.mock('@/hooks/useColors', () => ({ useColors: () => ({
  isDark: state.dark, background: state.dark ? '#10201b' : '#fffdf7',
  foreground: state.dark ? '#edf5ef' : '#17332f', mutedForeground: '#81988c',
  card: state.dark ? '#1b2b27' : '#ffffff', border: '#34483e',
  primary: '#85cbbb', primaryForeground: '#102923', secondary: '#253c34',
}) }));
vi.mock('@/components/PetTeacher', () => ({ Creature: 'Creature', CREATURE_NAMES: { nuna: 'نونا' } }));
vi.mock('@/lib/loading-characters', () => ({ reserveWaitingCharacter: async () => 'nuna' }));
vi.mock('react-native', () => ({
  View: 'View', Text: 'Text', Modal: 'Modal', Pressable: 'Pressable', ActivityIndicator: 'Spinner',
  Platform: { OS: 'web' }, StyleSheet: { create: (s: unknown) => s },
  AccessibilityInfo: {
    isReduceMotionEnabled: async () => true,
    addEventListener: () => ({ remove: vi.fn() }),
  },
  Animated: { Value: class {
    setValue() {}
    interpolate() { return 0; }
  }, View: 'AnimatedView' },
  Easing: {},
}));
import { StudyLoadingScreen } from '../../artifacts/yael-arabic-prep/components/StudyLoadingScreen';
import { StartupStatus } from '../../artifacts/yael-arabic-prep/components/StartupStatus';

const flatten = (style: any) => Object.assign({}, ...(Array.isArray(style) ? style : [style]));

test('initial required loading blocks without treating background refresh as a blocking load', () => {
  expect(shouldBlockStudyLoading(false, false, false)).toBe(true);
  expect(shouldBlockStudyLoading(true, true, false)).toBe(true);
  expect(shouldBlockStudyLoading(true, true, true)).toBe(false);
  expect(shouldBlockStudyLoading(true, false, true)).toBe(false);
  // A failed first request must expose its retry/recovery state, not an endless loader.
  expect(shouldBlockStudyLoading(true, false, false)).toBe(false);
});

test.each([true, false])('loading covers the whole frame and text never waits for custom fonts, dark=%s', async dark => {
  state.dark = dark; state.loading = true;
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(StudyLoadingScreen)); });
  const backdrop = flatten(tree.root.findByProps({ testID: 'study-loading-screen' }).props.style);
  expect(backdrop.width).toBe('100%');
  expect(backdrop.alignSelf).toBe('stretch');
  expect(backdrop.backgroundColor).toBe(dark ? '#10201b' : '#fffdf7');
  for (const id of ['study-loading-title', 'study-loading-caption']) {
    const text = tree.root.findByProps({ testID: id });
    const style = flatten(text.props.style);
    expect(style.fontFamily).toContain('system-ui');
    expect(style.lineHeight).toBeGreaterThan(style.fontSize);
    expect(text.props.children).toBeTruthy();
  }
  state.loading = false;
  await act(async () => { tree.update(React.createElement(StudyLoadingScreen)); });
  expect(tree.toJSON()).toBeNull();
  await act(async () => { tree.unmount(); });
});

test.each([true, false])('compact startup fills the guard instead of painting a narrow light strip, dark=%s', async dark => {
  state.dark = dark;
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(StartupStatus, { compact: true })); });
  const style = tree.root.findByProps({ testID: 'startup-status' }).props.style;
  expect(style.width).toBe('100%');
  expect(style.alignSelf).toBe('stretch');
  expect(style.backgroundColor).toBe(dark ? '#10201b' : '#fffdf7');
  await act(async () => { tree.unmount(); });
});
