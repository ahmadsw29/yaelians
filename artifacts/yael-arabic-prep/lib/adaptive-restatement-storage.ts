import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AdaptiveMemory } from './adaptive-restatement';
import { ADAPTIVE_ROUND_MS, SEMI_MASTER_ROUND_MS } from './adaptive-restatement';

const key = (userId: string) => `yael-adaptive-restatement-v1:${userId}`;
const queues = new Map<string, Promise<void>>();
const integer = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0;
const object = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
export function validAdaptiveMemory(value: unknown): value is AdaptiveMemory {
  if (!object(value) || value.version !== 1 || !integer(value.roundNumber) || !object(value.items)) return false;
  for (const item of Object.values(value.items)) {
    if (!object(item) || !['attempts', 'wrong', 'streak', 'lastRound', 'dueRound'].every(k => integer(item[k]))
      || item.attempts < 1 || item.wrong > item.attempts || item.streak > item.attempts
      || item.lastRound > value.roundNumber || item.dueRound <= item.lastRound || typeof item.lastCorrect !== 'boolean') return false;
  }
  if (value.active === null) return true;
  const active = value.active;
  if (!object(active) || typeof active.id !== 'string' || !active.id || !integer(active.number)
    || active.number !== value.roundNumber || !Array.isArray(active.questionIds)
    || active.questionIds.length < 1 || active.questionIds.length > 10
    || active.questionIds.some((id: unknown) => typeof id !== 'string' || !id)
    || new Set(active.questionIds).size !== active.questionIds.length
    || !integer(active.index) || active.index >= active.questionIds.length
    || !integer(active.startedAt) || !integer(active.deadline)
    || ![ADAPTIVE_ROUND_MS, SEMI_MASTER_ROUND_MS, 20 * 60 * 1000].includes(active.deadline - active.startedAt)
    || typeof active.finished !== 'boolean' || !object(active.answers) || !object(active.reasons)) return false;
  if (Object.keys(active.answers).some(id => !active.questionIds.includes(id)
    || !integer(active.answers[id]) || active.answers[id] > 3)) return false;
  return active.questionIds.every((id: string) => ['new', 'retry', 'review'].includes(active.reasons[id]));
}
export async function loadAdaptiveMemory(userId: string): Promise<
  { kind: 'ready'; memory: AdaptiveMemory } | { kind: 'empty' } | { kind: 'corrupt' | 'unavailable' }
> {
  try {
    await queues.get(userId)?.catch(() => undefined);
    const raw = await AsyncStorage.getItem(key(userId));
    if (raw === null) return { kind: 'empty' };
    try {
      const parsed: unknown = JSON.parse(raw);
      return validAdaptiveMemory(parsed) ? { kind: 'ready', memory: parsed } : { kind: 'corrupt' };
    } catch { return { kind: 'corrupt' }; }
  } catch { return { kind: 'unavailable' }; }
}
export function saveAdaptiveMemory(userId: string, memory: AdaptiveMemory): Promise<void> {
  if (!validAdaptiveMemory(memory)) return Promise.reject(new Error('Invalid learning memory'));
  const raw = JSON.stringify(memory);
  const next = (queues.get(userId) ?? Promise.resolve()).catch(() => undefined)
    .then(() => AsyncStorage.setItem(key(userId), raw));
  queues.set(userId, next);
  return next;
}
/** Explicit recovery only: preserve exact damaged bytes before replacing anything. */
export function resetAdaptiveMemory(userId: string): Promise<void> {
  const next = (queues.get(userId) ?? Promise.resolve()).catch(() => undefined).then(async () => {
    const raw = await AsyncStorage.getItem(key(userId));
    if (raw !== null) await AsyncStorage.setItem(`${key(userId)}:recovery:${Date.now()}`, raw);
    await AsyncStorage.removeItem(key(userId));
  });
  queues.set(userId, next);
  return next;
}
