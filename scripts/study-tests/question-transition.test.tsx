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
function Harness({ enabled = true, enter = false }: { enabled?: boolean; enter?: boolean }) {
  motion = useQuestionTransition(enabled, enter);
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
  expect(motion.departing).toBe(true);
  const exit = driver.jobs[0];
  await act(async () => { exit.finish(); });
  expect(change).toHaveBeenCalledTimes(1);
  // New content may be read/flipped while entrance runs; advancing stays locked.
  expect(motion.busy).toBe(true);
  expect(motion.departing).toBe(false);
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

test('async save stays locked and starts entrance only after successful persistence', async () => {
  const tree = await setup();
  let save!: (accepted: boolean) => void;
  const change = vi.fn(() => new Promise<boolean>(resolve => { save = resolve; }));
  await act(async () => { motion.advance(change); driver.jobs[0].finish(); });
  expect(change).toHaveBeenCalledTimes(1);
  expect(motion.busy).toBe(true);
  expect(driver.jobs).toHaveLength(1);
  await act(async () => { motion.advance(change); save(true); });
  expect(change).toHaveBeenCalledTimes(1);
  expect(driver.jobs).toHaveLength(2);
  await act(async () => { driver.jobs[1].finish(); });
  expect(motion.busy).toBe(false);
  await act(async () => { tree.unmount(); });
});

test('failed persistence restores the old question and permits an explicit retry', async () => {
  const tree = await setup();
  const fail = vi.fn(async () => false);
  await act(async () => { motion.advance(fail); driver.jobs[0].finish(); });
  expect(motion.busy).toBe(false);
  expect(driver.jobs).toHaveLength(1);
  const retry = vi.fn(async () => true);
  await act(async () => { motion.advance(retry); driver.jobs[1].finish(); });
  expect(retry).toHaveBeenCalledTimes(1);
  expect(motion.busy).toBe(true);
  await act(async () => { driver.jobs[2].finish(); });
  expect(motion.busy).toBe(false);
  await act(async () => { tree.unmount(); });
});

test('unmount during persistence does not start a late entrance', async () => {
  const tree = await setup();
  let save!: () => void;
  await act(async () => {
    motion.advance(() => new Promise<void>(resolve => { save = resolve; }));
    driver.jobs[0].finish();
  });
  await act(async () => { tree.unmount(); });
  await act(async () => { save(); });
  expect(driver.jobs).toHaveLength(1);
});

test('the first restatement question enters with the same locked staged animation', async () => {
  driver.reduce = false; driver.jobs = [];
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<Harness enter />); });
  expect(motion.busy).toBe(true);
  expect(driver.jobs).toHaveLength(1);
  await act(async () => { driver.jobs[0].finish(); });
  expect(motion.busy).toBe(false);
  await act(async () => { tree.unmount(); });
});

test('an async caller cannot start a transition through a stale enabled callback', async () => {
  const tree = await setup();
  const lateAdvance = motion.advance;
  const change = vi.fn();
  await act(async () => { tree.update(<Harness enabled={false} />); });
  await act(async () => { lateAdvance(change); });
  expect(change).not.toHaveBeenCalled();
  expect(driver.jobs).toHaveLength(0);
  await act(async () => { tree.unmount(); });
  await act(async () => { lateAdvance(change); });
  expect(change).not.toHaveBeenCalled();
});
