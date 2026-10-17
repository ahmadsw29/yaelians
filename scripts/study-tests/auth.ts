export const auth = { userId: null as string | null, isLoaded: true };
export const clerk = { session: null as null | {
  id: string; user: { id: string }; getToken: () => Promise<string>;
} };
export const useAuth = () => auth;
export const useClerk = () => clerk;
export function signIn(id: string | null) {
  auth.userId = id;
  clerk.session = id ? { id: `session-${id}`, user: { id }, getToken: async () => id } : null;
}
