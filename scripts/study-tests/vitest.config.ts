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
      '@expo/vector-icons': require.resolve('../../artifacts/yael-arabic-prep/node_modules/@expo/vector-icons'),
      '@react-native-async-storage/async-storage': require.resolve('./storage.ts'),
      '@clerk/expo': require.resolve('./auth.ts'),
    },
  },
  test: {
    include: process.env.STUDY_RESTART_PHASE
      ? ['study-tests/restart-process.test.tsx']
      : [
          'study-tests/routes.test.ts',
          'study-tests/source-session.test.ts',
          'study-tests/outbox.test.tsx',
          'study-tests/study-stats-display.test.ts',
          'study-tests/progress-marker.test.ts',
          'study-tests/practice-layout.test.ts',
          'study-tests/question-bubbles.test.tsx',
          'study-tests/vocabulary-rounds.test.ts',
          'study-tests/learner-ranks.test.ts',
          'study-tests/study-loading.test.ts',
          'study-tests/restatement-practice.test.ts',
          'study-tests/answer-review.test.ts',
          'study-tests/loading-characters.test.ts',
          'study-tests/study-courses-content.test.ts',
          'study-tests/adaptive-restatement.test.ts',
          'study-tests/vocabulary-review.test.ts',
          'study-tests/hebrew-speaker.test.ts',
          'study-tests/pet-teacher-motion.test.ts',
          'study-tests/practice-celebrations.test.ts',
        ],
    fileParallelism: false,
    testTimeout: 10000,
    hookTimeout: 30000,
  },
});
