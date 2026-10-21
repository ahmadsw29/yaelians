import { expect, test } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readingPacks, reserveReadingPack } from '../../artifacts/yael-arabic-prep/lib/reading-practice';
import { accountStorageKeys } from '../../artifacts/yael-arabic-prep/lib/deletionStorage';

test('reading packs contain a real passage and its own graded questions', () => {
  const free = readingPacks(false);
  const premium = readingPacks(true);
  expect(free.length).toBeGreaterThan(1);
  expect(premium.length).toBeGreaterThan(free.length);
  expect(free.every(pack => pack.id.startsWith('b17:'))).toBe(true);
  expect(new Set(premium.map(pack => pack.id)).size).toBe(premium.length);
  for (const pack of premium) {
    expect(pack.questions.length).toBeGreaterThan(0);
    expect(pack.questions.length).toBeLessThanOrEqual(6);
    expect(new Set(pack.questions.map(q => q.passage)).size).toBe(1);
    for (const q of pack.questions) {
      expect(q.passage.trim().length).toBeGreaterThan(20);
      expect(q.options).toContain(q.correctAnswer);
      expect(q.prompt.trim()).not.toBe('');
      expect(q.meaning.trim()).not.toBe('');
    }
  }
});

test('successive rounds rotate passages, with serialized account-specific reservations', async () => {
  const first = await reserveReadingPack('reading-test-a', false);
  const next = await reserveReadingPack('reading-test-a', false);
  expect(first.number).toBe(1);
  expect(next.number).toBe(2);
  expect(next.pack.id).not.toBe(first.pack.id);
  const batch = await Promise.all(Array.from({ length: 5 }, () => reserveReadingPack('reading-test-a', false)));
  expect(batch.map(x => x.number)).toEqual([3, 4, 5, 6, 7]);
  const other = await reserveReadingPack('reading-test-b', false);
  expect(other.number).toBe(1);
  expect(await AsyncStorage.getItem('yael-reading-round-v1:reading-test-b')).toBe('1');
});

test('damaged passage history is preserved and included in account cleanup', async () => {
  const key = 'yael-reading-round-v1:reading-damaged';
  await AsyncStorage.setItem(key, 'not-a-counter');
  await expect(reserveReadingPack('reading-damaged', true)).rejects.toThrow();
  expect(await AsyncStorage.getItem(key)).toBe('not-a-counter');
  expect(await accountStorageKeys(AsyncStorage, 'reading-damaged')).toContain(key);
});
