import { defineConfig } from 'vitest/config';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
export default defineConfig({
  resolve: {
    alias: {
      // Native/Clerk adapters are mocked; all React consumers must share a runtime.
      react: dirname(require.resolve('react/package.json')),
      '@': new URL('../../artifacts/yael-arabic-prep', import.meta.url).pathname,
      '@clerk/express': require.resolve('./server-auth.ts'),
      'react-native': require.resolve('./native.ts'),
      '@react-native-async-storage/async-storage': require.resolve('./storage.ts'),
      '@clerk/expo': require.resolve('./auth.ts'),
    },
  },
  test: {
    include: process.env.STUDY_RESTART_PHASE
      ? ['study-tests/restart-process.test.tsx']
      : [
          'study-tests/routes.test.ts',
          'study-tests/outbox.test.tsx',
          'study-tests/progress-marker.test.ts',
          'study-tests/pet-teacher-motion.test.ts',
          'study-tests/practice-celebrations.test.ts',
        ],
    fileParallelism: false,
    testTimeout: 10000,
    hookTimeout: 30000,
  },
});
