import type { Request } from 'express';
// Test-only identity adapter. Never mounted by the application.
export const getAuth = (req: Request) => ({
  userId: req.headers.authorization?.replace(/^Bearer /, '') || null,
});
export const clerkClient = { users: { getUser: async (id: string) => ({ id }) } };
