import AsyncStorage from '@react-native-async-storage/async-storage';

export const DAILY_METRICS = ['words', 'restatement', 'reading', 'models'] as const;
export type DailyMetric = typeof DAILY_METRICS[number];
export type DailyTargets = Record<DailyMetric, number>;
export type DailyGoalDay = { targets: DailyTargets | null; events: Record<string, DailyMetric> };
export type DailyGoalMemory = { version: 1; days: Record<string, DailyGoalDay> };
export const DAILY_TARGET_MAX: DailyTargets = { words: 300, restatement: 120, reading: 120, models: 5 };
export const emptyDailyCounts = (): DailyTargets => ({ words: 0, restatement: 0, reading: 0, models: 0 });
export const emptyDailyGoals = (): DailyGoalMemory => ({ version: 1, days: {} });
export function localGoalDate(at = Date.now()) {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid activity date');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dailyGoalsKey(userId: string) {
  if (!userId) throw new Error('Sign in required');
  return `yael-daily-goals-v1:${userId}`;
}
export function isValidDailyTargets(value: unknown): value is DailyTargets {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as DailyTargets;
  return Object.keys(v).length === DAILY_METRICS.length
    && DAILY_METRICS.every(metric => Number.isSafeInteger(v[metric]) && v[metric] >= 0 && v[metric] <= DAILY_TARGET_MAX[metric])
    && DAILY_METRICS.some(metric => v[metric] > 0);
}
export function validDailyGoals(value: unknown): value is DailyGoalMemory {
  if (!value || typeof value !== 'object') return false;
  const v = value as DailyGoalMemory;
  return v.version === 1 && !!v.days && typeof v.days === 'object' && !Array.isArray(v.days)
    && Object.keys(v.days).length <= 40
    && Object.entries(v.days).every(([date, day]) =>
      /^\d{4}-\d{2}-\d{2}$/.test(date) && !!day && typeof day === 'object'
      && (day.targets === null || isValidDailyTargets(day.targets))
      && !!day.events && typeof day.events === 'object' && !Array.isArray(day.events)
      && Object.entries(day.events).length <= 20000
      && Object.entries(day.events).every(([id, metric]) => id.length > 0 && id.length <= 500 && DAILY_METRICS.includes(metric)));
}
export function dailyGoalCounts(day?: DailyGoalDay): DailyTargets {
  const counts = emptyDailyCounts();
  for (const metric of Object.values(day?.events ?? {})) counts[metric]++;
  return counts;
}
type Command =
  | { type: 'targets'; date: string; targets: DailyTargets }
  | { type: 'activity'; date: string; metric: DailyMetric; id: string };
export function applyDailyGoalCommand(memory: DailyGoalMemory, command: Command): DailyGoalMemory {
  const before = memory.days[command.date] ?? { targets: null, events: {} };
  let next: DailyGoalDay;
  if (command.type === 'targets') {
    if (!isValidDailyTargets(command.targets)) throw new Error('Invalid daily targets');
    next = { ...before, targets: { ...command.targets } };
  } else {
    if (!DAILY_METRICS.includes(command.metric) || !command.id.trim() || command.id.length > 400) throw new Error('Invalid daily activity');
    const key = `${command.metric}:${command.id.trim().normalize('NFC')}`;
    if (Object.hasOwn(before.events, key)) return memory;
    next = { ...before, events: { ...before.events, [key]: command.metric } };
  }
  const days = { ...memory.days, [command.date]: next };
  // Keep a bounded month of daily activity; never prune the day being updated.
  for (const date of Object.keys(days).sort().filter(date => date !== command.date).slice(0, Math.max(0, Object.keys(days).length - 31))) delete days[date];
  return { version: 1, days };
}

const queues = new Map<string, Promise<unknown>>();
const pending = new Map<string, Command[]>();
const errors = new Map<string, string>();
const blocked = new Set<string>();
const listeners = new Map<string, Set<() => void>>();
const notify = (userId: string) => listeners.get(userId)?.forEach(listener => listener());
export const dailyGoalsError = (userId: string) => errors.get(userId) ?? null;
export function subscribeDailyGoals(userId: string, listener: () => void) {
  const set = listeners.get(userId) ?? new Set();
  set.add(listener); listeners.set(userId, set);
  return () => { set.delete(listener); if (!set.size) listeners.delete(userId); };
}
export async function readDailyGoals(userId: string): Promise<DailyGoalMemory> {
  const raw = await AsyncStorage.getItem(dailyGoalsKey(userId));
  if (raw === null) return emptyDailyGoals();
  const memory: unknown = JSON.parse(raw);
  if (!validDailyGoals(memory)) throw new Error('Invalid saved daily goals');
  return memory;
}
function flush(userId: string): Promise<void> {
  const task = (queues.get(userId) ?? Promise.resolve()).catch(() => {}).then(async () => {
    if (blocked.has(userId)) return;
    const batch = [...(pending.get(userId) ?? [])];
    if (!batch.length) return;
    let memory = await readDailyGoals(userId);
    for (const command of batch) memory = applyDailyGoalCommand(memory, command);
    if (blocked.has(userId)) return;
    await AsyncStorage.setItem(dailyGoalsKey(userId), JSON.stringify(memory));
    pending.get(userId)?.splice(0, batch.length);
    errors.delete(userId);
    notify(userId);
  }).catch(error => {
    errors.set(userId, 'تعذّر حفظ مسارك اليوم. تقدّم التدريب نفسه لم يُحذف؛ أعد المحاولة لحفظ العدّادات.');
    notify(userId);
    throw error;
  });
  const tail = task.catch(() => {});
  queues.set(userId, tail);
  void tail.then(() => { if (queues.get(userId) === tail) queues.delete(userId); });
  return task;
}
function enqueue(userId: string, command: Command) {
  dailyGoalsKey(userId);
  if (blocked.has(userId)) return Promise.reject(new Error('Account deletion pending'));
  const list = pending.get(userId) ?? [];
  list.push(command); pending.set(userId, list);
  return flush(userId);
}
export function saveDailyTargets(userId: string, targets: DailyTargets, date = localGoalDate()) {
  if (!isValidDailyTargets(targets)) return Promise.reject(new Error('Invalid daily targets'));
  return enqueue(userId, { type: 'targets', date, targets: { ...targets } });
}
export async function recordDailyActivity(userId: string, metric: DailyMetric, id: string, at = Date.now()) {
  const command: Command = { type: 'activity', date: localGoalDate(at), metric, id };
  // Validate before queueing, so a bad caller cannot poison every later save.
  applyDailyGoalCommand(emptyDailyGoals(), command);
  await enqueue(userId, command);
}
/** Secondary tracker failures are visible in the daily path; never roll back a saved answer. */
export function trackDailyActivity(userId: string | undefined, metric: DailyMetric, id: string, at = Date.now()) {
  if (!userId) return;
  void recordDailyActivity(userId, metric, id, at).catch(() => {});
}
export const retryDailyGoals = (userId: string) => flush(userId);
export async function stopDailyGoalsForDeletion(userId: string) {
  blocked.add(userId);
  await queues.get(userId)?.catch(() => {});
  pending.delete(userId); errors.delete(userId); listeners.delete(userId);
}
