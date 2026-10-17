import { expect, test } from 'vitest';
import AsyncStorage from './storage';
import { reserveWaitingCharacter, waitingCharacterAfter, WAITING_CHARACTERS, WAITING_CHARACTER_KEY } from '../../artifacts/yael-arabic-prep/lib/loading-characters';

test('waiting windows cycle through fantasy characters without adjacent repeats', async () => {
  await AsyncStorage.setItem(WAITING_CHARACTER_KEY, 'zizo');
  const characters: string[] = [];
  for (let index = 0; index < 8; index++) characters.push(await reserveWaitingCharacter());
  expect(new Set(characters).size).toBe(WAITING_CHARACTERS.length);
  expect(characters.every((character, index) => index === 0 || character !== characters[index - 1])).toBe(true);
  // Persisted state, rather than module initialization, decides the next window.
  await AsyncStorage.setItem(WAITING_CHARACTER_KEY, 'nuna');
  expect(await reserveWaitingCharacter()).toBe('ghaima');
  expect(waitingCharacterAfter('zizo')).toBe('lumi');
});
