export type StudyAuthSession = {
  id: string;
  user: { id: string };
  getToken: () => Promise<string | null>;
};

/**
 * Build per-request auth options only while this provider still owns the
 * current Clerk session. Keeping this independent of the global generated
 * client token getter prevents queued lessons from crossing account changes.
 */
export async function getStudyAuthOptions(
  getSession: () => StudyAuthSession | null,
  expectedUserId: string | null,
  isActive: () => boolean,
) {
  const session = getSession();
  if (!expectedUserId || !isActive() || session?.user.id !== expectedUserId) {
    throw new Error('Account changed');
  }

  const token = await session.getToken();
  if (!token || !isActive() || getSession()?.id !== session.id) {
    throw new Error('Sign in again');
  }

  return {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'omit' as const,
  };
}
