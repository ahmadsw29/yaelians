import AsyncStorage from '@react-native-async-storage/async-storage';

export const WAITING_CHARACTERS = ['lumi', 'nuna', 'ghaima', 'zizo'] as const;
export const WAITING_CHARACTER_KEY = 'yael-waiting-character-v1';
type WaitingCharacter = typeof WAITING_CHARACTERS[number];
let lastInSession: WaitingCharacter | null = null;
let queue: Promise<unknown> = Promise.resolve();

export function waitingCharacterAfter(previous: string | null): WaitingCharacter {
  const index = WAITING_CHARACTERS.findIndex(character => character === previous);
  return WAITING_CHARACTERS[(index + 1) % WAITING_CHARACTERS.length];
}

/** Cosmetic app-wide rotation survives reloads and never blocks study on storage failure. */
export function reserveWaitingCharacter(): Promise<WaitingCharacter> {
  const next = queue.catch(() => undefined).then(async () => {
    let previous: string | null = lastInSession;
    try {
      previous = await AsyncStorage.getItem(WAITING_CHARACTER_KEY) ?? previous;
    } catch {
      console.warn('Loading character history could not be read; using session rotation.');
    }
    const character = waitingCharacterAfter(previous);
    lastInSession = character;
    try {
      await AsyncStorage.setItem(WAITING_CHARACTER_KEY, character);
    } catch {
      console.warn('Loading character history could not be saved; session rotation remains available.');
    }
    return character;
  });
  queue = next;
  return next;
}
