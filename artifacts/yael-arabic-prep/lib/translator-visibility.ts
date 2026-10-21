import AsyncStorage from '@react-native-async-storage/async-storage';

export type TranslatorVisibility = 'hidden' | 'visible';
export const translatorVisibilityKey = (userId: string) => `yael-translator-visibility-v1:${userId}`;

export class InvalidTranslatorVisibilityError extends Error {
  constructor(public readonly raw: string) {
    super('Invalid translator visibility value');
    this.name = 'InvalidTranslatorVisibilityError';
  }
}

function requireUser(userId: string) {
  if (typeof userId !== 'string' || !userId) throw new Error('Missing userId for translator visibility');
}

/**
 * Reads the hide/show preference (never any translation text).
 * Missing => 'visible'. Throws on storage failure or an invalid stored value
 * (the raw value is left untouched in storage and exposed on the error).
 */
export async function loadTranslatorVisibility(userId: string): Promise<TranslatorVisibility> {
  requireUser(userId);
  const raw = await AsyncStorage.getItem(translatorVisibilityKey(userId));
  if (raw === null) return 'visible';
  if (raw === 'hidden' || raw === 'visible') return raw;
  throw new InvalidTranslatorVisibilityError(raw);
}

// Per-key write chain so rapid hide/restore saves land in call order.
const chains = new Map<string, Promise<void>>();

/** Serialized per account; rejects if this write fails. */
export function saveTranslatorVisibility(userId: string, value: TranslatorVisibility): Promise<void> {
  requireUser(userId);
  const key = translatorVisibilityKey(userId);
  const prev = chains.get(key) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(() => AsyncStorage.setItem(key, value));
  const tail = next.catch(() => {});
  chains.set(key, tail);
  void tail.then(() => { if (chains.get(key) === tail) chains.delete(key); });
  return next;
}
