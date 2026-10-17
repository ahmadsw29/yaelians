import express from 'express';
import type { Server } from 'node:http';

export async function startServer() {
  if (process.env.STUDY_TEST_DATABASE !== 'isolated'
    || !process.env.DATABASE_URL?.includes('/tmp/yael-study-tests.')) {
    throw new Error('Run pnpm test:study: this suite requires its disposable database');
  }
  const { default: router } = await import('../../artifacts/api-server/src/routes/study');
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  app.use(router);
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({ error: error.message });
  });
  const server = await new Promise<Server>(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test listener');
  const url = `http://127.0.0.1:${address.port}`;
  return {
    url,
    async close() {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      const { pool } = await import('@workspace/db');
      await pool.end();
    },
    request(user: string | null, path = 'stats', data?: unknown) {
      return fetch(`${url}/study/${path}`, {
        method: data === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${user}` } : {}) },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      });
    },
  };
}
