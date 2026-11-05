import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { usesExpandedQuestionLayout } from '../../artifacts/yael-arabic-prep/lib/practice-layout';

const dimensions = vi.hoisted(() => ({ width: 375, height: 812, scale: 1, fontScale: 1 }));
vi.mock('react-native', async () => {
  const { createElement } = await import('react');
  return ({
  View: 'View', Text: 'Text',
  Pressable: ({ children, ...props }: any) => createElement('Pressable', props, typeof children === 'function' ? children({ pressed: false }) : children),
  StyleSheet: { create: (s: unknown) => s },
  Platform: { OS: 'web', select: (s: { default: unknown }) => s.default },
  AccessibilityInfo: {
    isReduceMotionEnabled: async () => false,
    addEventListener: () => ({ remove() {} }),
  },
  useWindowDimensions: () => dimensions,
}); });
vi.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
vi.mock('@/hooks/useColors', () => ({ useColors: () => ({ isDark: false }) }));
vi.mock('@/components/PetTeacher', () => ({
  CREATURE_NAMES: { zizo: 'زيزو', lumi: 'لومي', rami: 'رامي', nuna: 'نونا', ghaima: 'غيمة' },
}));
vi.mock('@/components/SpeakingTeacher', () => ({ SpeakingTeacher: 'Teacher' }));
vi.mock('@/hooks/useHebrewSpeech', () => ({
  useHebrewSpeech: () => ({ status: 'idle', toggle() {}, error: null }),
}));
import { ChunkyButton, QuestionPrompt } from '../../artifacts/yael-arabic-prep/components/Playful';
import { GlassPressable, frostedTint } from '../../artifacts/yael-arabic-prep/components/Glass';

const flatten = (styles: unknown): Record<string, any> => Object.assign({},
  ...(Array.isArray(styles) ? styles.flat(Infinity) : [styles]).filter(Boolean));
const arabic = 'اقرأ التعليمات كاملة ثم اختر الإجابة التي تعبّر عن الفكرة الأساسية في النص، وانتبه إلى العلاقة بين الجمل قبل الانتقال إلى السؤال التالي.';
const hebrew = 'למרות השינויים הרבים שהתרחשו בשנים האחרונות, החוקרים ממשיכים לבדוק כיצד משפיעה הסביבה על התפתחות השפה ועל יכולתם של התלמידים להבין טקסטים מורכבים.';

describe('question bubble accessibility layout (native props, not device rendering)', () => {
  it.each([1, 1.5, 2])('reflows at native font scale %s without disabling text scaling', async fontScale => {
    dimensions.fontScale = fontScale;
    for (const compact of [false, true]) {
      for (const text of [arabic, hebrew]) {
        for (let index = 0; index < 5; index++) {
          let tree!: ReactTestRenderer;
          await act(async () => {
            tree = create(<QuestionPrompt index={index} text={text} hebrew={text === hebrew}
              label={arabic} compact={compact} spokenWord="התפתחות" />);
          });
          const views = tree.root.findAllByType('View' as any);
          const outer = flatten(views[0].props.style);
          expect(outer.flexDirection).toBe(fontScale >= 1.5 ? 'column' : 'row-reverse');
          const bubble = views.find(v => flatten(v.props.style).borderRadius === 20)!;
          const bubbleStyle = flatten(bubble.props.style);
          expect(bubbleStyle.minWidth).toBe(0);
          expect(bubbleStyle.height).toBeUndefined();
          expect(bubbleStyle.overflow).not.toBe('hidden');
          if (fontScale >= 1.5) expect(bubbleStyle).toMatchObject({
            width: '100%', flexGrow: 0, flexShrink: 0, flexBasis: 'auto',
          });
          const texts = tree.root.findAllByType('Text' as any);
          expect(texts.some(t => t.props.children === text)).toBe(true);
          for (const node of texts) {
            expect(node.props.numberOfLines).toBeUndefined();
            expect(node.props.allowFontScaling).not.toBe(false);
            expect(node.props.maxFontSizeMultiplier).toBeUndefined();
            expect(flatten(node.props.style).writingDirection).toBe('rtl');
          }
          const speaker = tree.root.findByProps({ testID: 'hebrew-speaker' });
          expect(flatten(speaker.props.style).position).toBe(compact && fontScale === 1 ? 'absolute' : undefined);
          await act(async () => tree.unmount());
        }
      }
    }
  });

  it('lets long Next labels wrap instead of overflowing beside their icon', async () => {
    let tree!: ReactTestRenderer;
    await act(async () => { tree = create(<ChunkyButton label="السؤال التالي" onPress={() => {}} icon="arrow-back" />); });
    const label = tree.root.findByType('Text' as any);
    expect(flatten(label.props.style)).toMatchObject({ flexShrink: 1, minWidth: 0, textAlign: 'center', writingDirection: 'rtl' });
    expect(label.props.numberOfLines).toBeUndefined();
    await act(async () => tree.unmount());
  });

  it('does not change the normal-size compact practice layout', () => {
    expect(usesExpandedQuestionLayout(1)).toBe(false);
    expect(usesExpandedQuestionLayout(1.49)).toBe(false);
    expect(usesExpandedQuestionLayout(1.5)).toBe(true);
    expect(usesExpandedQuestionLayout(2)).toBe(true);
  });

  it('keeps glass buttons actionable, labelled and clearly disabled when required', async () => {
    const onPress = vi.fn();
    let tree!: ReactTestRenderer;
    const button = (disabled: boolean) => <GlassPressable dark={false} disabled={disabled} testID="glass-action"
      onPress={onPress} accessibilityRole="button" accessibilityLabel="متابعة" accessibilityState={{ disabled }}>
      <span>متابعة</span>
    </GlassPressable>;
    await act(async () => { tree = create(button(false)); });
    const pressable = () => tree.root.findByType('Pressable' as any);
    expect(pressable().props.accessibilityLabel).toBe('متابعة');
    expect(pressable().props.accessibilityRole).toBe('button');
    expect(tree.root.findAllByType('LinearGradient' as any)).toHaveLength(0);
    const surface = flatten(pressable().props.style({ pressed: false }));
    expect(surface.shadowOpacity).toBeLessThan(0.05);
    expect(surface.overflow).toBe('hidden');
    expect(surface.backgroundColor).toBe('rgba(255,255,255,0.76)');
    for (const state of [{ pressed: false }, { pressed: true }, { pressed: false, focused: true }]) {
      const paint = flatten(pressable().props.style(state));
      expect(paint.backdropFilter).toBeUndefined();
      expect(paint.WebkitBackdropFilter).toBeUndefined();
    }
    await act(async () => { pressable().props.onPress(); });
    expect(onPress).toHaveBeenCalledOnce();
    const pressed = flatten(pressable().props.style({ pressed: true, focused: false }));
    expect(pressed.transform).toEqual([{ scale: 0.985 }]);
    const focused = flatten(pressable().props.style({ pressed: false, focused: true }));
    expect(focused.borderWidth).toBe(2);
    await act(async () => { tree.update(button(true)); });
    expect(pressable().props.disabled).toBe(true);
    expect(pressable().props.accessibilityState.disabled).toBe(true);
    expect(tree.root.findAllByType('LinearGradient' as any)).toHaveLength(0);
    expect(flatten(pressable().props.style({ pressed: true })).shadowOpacity).toBe(0);
    await act(async () => { tree.update(<GlassPressable dark={false} accessibilityRole="radio"
      accessibilityState={{ checked: true }} aria-checked={true} onPress={onPress}><span>فاتح</span></GlassPressable>); });
    expect(pressable().props['aria-checked']).toBe(true);
    expect(pressable().props.accessibilityState.checked).toBe(true);
    await act(async () => { tree.unmount(); });
  });

  it('uses one even frosted tint without adding gloss or changing transparent segments', () => {
    expect(frostedTint('#17665c')).toBe('rgba(23,102,92,0.94)');
    expect(frostedTint('rgba(255,255,255,0)')).toBe('rgba(255,255,255,0)');
  });
});
