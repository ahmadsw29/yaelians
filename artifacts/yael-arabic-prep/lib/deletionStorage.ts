export type DeletionIntent = { userId: string; sessionId: string; status: 'unconfirmed' | 'accepted' };
export type DeletionStorage = {
  getAllKeys(): Promise<readonly string[]>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
};
const PREFIX = 'yael-deletion-intent-v1:';
export const deletionIntentKey = (userId: string) => `${PREFIX}${userId}`;
export async function accountStorageKeys(storage: Pick<DeletionStorage, 'getAllKeys'>, userId: string) {
  const recoveryPrefix = `yael-study-outbox-recovery-v1:${userId}:`;
  const allKeys = await storage.getAllKeys();
  const recoveryKeys = allKeys.filter(key => key.startsWith(recoveryPrefix));
  const sourceKeys = allKeys.filter(key => key.startsWith(`yael-source:v1:${userId}:`));
  return [
    `yael-theme:${userId}`, `yael-study-stats-v1:${userId}`,
    `yael-study-outbox-v1:${userId}`, `yael-study-migration-v1:${userId}`,
    `yael-exam:v1:${userId}`,
    ...recoveryKeys,
    ...sourceKeys,
  ];
}
export async function saveDeletionIntent(storage: DeletionStorage, intent: DeletionIntent) {
  await storage.setItem(deletionIntentKey(intent.userId), JSON.stringify(intent));
}
export async function readDeletionIntents(storage: DeletionStorage): Promise<DeletionIntent[]> {
  const keys = (await storage.getAllKeys()).filter(key => key.startsWith(PREFIX));
  return Promise.all(keys.map(async key => {
    const value = JSON.parse((await storage.getItem(key)) ?? 'null') as DeletionIntent | null;
    if (!value || typeof value.userId !== 'string' || !value.userId ||
        typeof value.sessionId !== 'string' || !value.sessionId ||
        !['accepted', 'unconfirmed'].includes(value.status) || key !== deletionIntentKey(value.userId)) {
      throw new Error('تعذّرت قراءة سجل مسح البيانات. لم يُستأنف التعلّم لحماية بياناتك؛ أعيدي المحاولة.');
    }
    return value;
  }));
}

// Idempotent; never forget the intent until BOTH local cleanup and scoped
// sign-out succeed. "Unconfirmed" is still an explicit irreversible local
// deletion request, but must never be presented as confirmed cloud deletion.
export async function finishLocalDeletion(
  storage: DeletionStorage,
  intent: DeletionIntent,
  signOut: (intent: DeletionIntent) => Promise<void>,
) {
  await storage.multiRemove(await accountStorageKeys(storage, intent.userId));
  await signOut(intent);
  if (intent.status === 'accepted') await storage.removeItem(deletionIntentKey(intent.userId));
}
