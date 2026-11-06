import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, test, vi } from 'vitest';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const driver = vi.hoisted(() => ({
  reduce: false,
  animations: [] as { started: boolean; stopped: boolean }[],
}));
vi.mock('@/components/HomeMotion', () => ({ useReduceMotion: () => driver.reduce }));
vi.mock('@/components/Playful', () => ({
  usePlay: () => ({ brand: '#30c5a0', track: '#243a33', mutedForeground: '#abcabc' }),
}));
vi.mock('react-native', () => {
  class Value {
    constructor(public value: number) {}
    setValue(value: number) { this.value = value; }
    interpolate(config: unknown) { return { value: this, config }; }
  }
  const animation = () => {
    const job = { started: false, stopped: false };
    driver.animations.push(job);
    return { start: () => { job.started = true; }, stop: () => { job.stopped = true; } };
  };
  return {
    View: 'View',
    StyleSheet: { create: (styles: unknown) => styles },
    Easing: { out: (v: unknown) => v, inOut: (v: unknown) => v, quad: 'quad' },
    Animated: { Value, View: 'AnimatedView', Text: 'AnimatedText', parallel: animation, sequence: animation, spring: animation, timing: animation },
  };
});
import FlashcardProgress from '../../artifacts/yael-arabic-prep/components/FlashcardProgress';

test('only real forward progress starts feedback; resets stay still and cleanup cancels it', async () => {
  driver.reduce = false; driver.animations = [];
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<FlashcardProgress completed={5} total={20} />); });
  expect(driver.animations).toHaveLength(0);
  expect(tree.root.findByProps({ testID: 'flashcards-progress-count' }).props.children).toBe('6 / 20');
  expect(tree.root.findByProps({ testID: 'flashcards-round-progress' }).props['aria-valuenow']).toBe(5);
  expect(tree.root.findByProps({ testID: 'flashcards-round-progress' }).props['aria-valuemax']).toBe(20);
  await act(async () => { tree.update(<FlashcardProgress completed={6} total={20} />); });
  const feedback = driver.animations.find(job => job.started)!;
  expect(feedback).toBeDefined();
  expect(tree.root.findByProps({ testID: 'flashcards-round-progress' }).props.accessibilityValue.now).toBe(6);
  expect(tree.root.findByProps({ testID: 'flashcards-round-progress' }).props['aria-valuenow']).toBe(6);
  await act(async () => { tree.update(<FlashcardProgress completed={0} total={20} />); });
  expect(feedback.stopped).toBe(true);
  expect(driver.animations.filter(job => job.started)).toHaveLength(1);
  await act(async () => { tree.update(<FlashcardProgress completed={1} total={20} />); });
  const next = driver.animations.filter(job => job.started).at(-1)!;
  await act(async () => { tree.unmount(); });
  expect(next.stopped).toBe(true);
});

test('reduced motion settles to the true fraction without pulses or a replay on preference changes', async () => {
  driver.reduce = false; driver.animations = [];
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<FlashcardProgress completed={0} total={20} />); });
  await act(async () => { tree.update(<FlashcardProgress completed={1} total={20} />); });
  const feedback = driver.animations.find(job => job.started)!;
  driver.reduce = true;
  await act(async () => { tree.update(<FlashcardProgress completed={1} total={20} />); });
  expect(feedback.stopped).toBe(true);
  await act(async () => { tree.update(<FlashcardProgress completed={2} total={20} />); });
  const fill = tree.root.findByProps({ testID: 'flashcards-progress-fill' }).props.style[1].width;
  expect(fill.value.value).toBe(0.1);
  expect(driver.animations.filter(job => job.started)).toHaveLength(1);
  driver.reduce = false;
  await act(async () => { tree.update(<FlashcardProgress completed={2} total={20} />); });
  expect(driver.animations.filter(job => job.started)).toHaveLength(1);
  await act(async () => { tree.unmount(); });
});
