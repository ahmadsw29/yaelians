import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, test, vi } from 'vitest';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const driver = vi.hoisted(() => ({
  reduce: false,
  jobs: [] as { finish: () => void; stopped: boolean }[],
}));
vi.mock('@/components/HomeMotion', () => ({
  NATIVE_DRIVER: false, useReduceMotion: () => driver.reduce,
}));
vi.mock('expo-router', () => ({ useFocusEffect: (effect: () => unknown) => React.useEffect(effect as any, [effect]) }));
vi.mock('react-native', () => {
  class Value {
    value: number;
    constructor(value: number) { this.value = value; }
    setValue(value: number) { this.value = value; }
    interpolate(config: unknown) { return config; }
  }
  const animation = () => {
    let job: (typeof driver.jobs)[number] | undefined;
    return {
      start(callback: (result: { finished: boolean }) => void) {
        job = { stopped: false, finish: () => callback({ finished: true }) };
        driver.jobs.push(job);
      },
      stop() { if (job) job.stopped = true; },
    };
  };
  return { Animated: { Value, parallel: animation, stagger: animation, timing: animation, spring: animation } };
});
import { useQuestionTransition } from '../../artifacts/yael-arabic-prep/hooks/useQuestionTransition';

let motion: ReturnType<typeof useQuestionTransition>;
function Harness({ enabled = true }: { enabled?: boolean }) {
  motion = useQuestionTransition(enabled);
  return null;
}
async function setup(reduce = false) {
  driver.reduce = reduce; driver.jobs = [];
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<Harness />); });
  return tree;
}

test('exit precedes one advance, entrance locks repeated taps, and cleanup cancels work', async () => {
  const tree = await setup();
  const change = vi.fn();
  await act(async () => { motion.advance(change); motion.advance(change); });
  expect(change).not.toHaveBeenCalled();
  expect(motion.busy).toBe(true);
  const exit = driver.jobs[0];
  await act(async () => { exit.finish(); });
  expect(change).toHaveBeenCalledTimes(1);
  await act(async () => { motion.advance(change); });
  expect(change).toHaveBeenCalledTimes(1);
  await act(async () => { driver.jobs[1].finish(); });
  expect(motion.busy).toBe(false);
  await act(async () => { motion.advance(change); });
  const cancelled = driver.jobs.at(-1)!;
  await act(async () => { tree.unmount(); });
  await act(async () => { cancelled.finish(); });
  expect(cancelled.stopped).toBe(true);
  expect(change).toHaveBeenCalledTimes(1);
});

test('reduced motion advances immediately but rapid taps still advance only once', async () => {
  const tree = await setup(true);
  const change = vi.fn();
  await act(async () => { motion.advance(change); motion.advance(change); });
  expect(change).toHaveBeenCalledTimes(1);
  expect(driver.jobs).toHaveLength(0);
  expect(motion.busy).toBe(false);
  await act(async () => { tree.unmount(); });
});

test('timer completion cancels an outgoing transition instead of advancing a finished round', async () => {
  const tree = await setup();
  const change = vi.fn();
  await act(async () => { motion.advance(change); });
  const exit = driver.jobs[0];
  await act(async () => { tree.update(<Harness enabled={false} />); });
  await act(async () => { exit.finish(); });
  expect(change).not.toHaveBeenCalled();
  expect(motion.busy).toBe(false);
  await act(async () => { tree.unmount(); });
});
