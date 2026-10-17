import { expect, test } from 'vitest';
import { shouldBlockStudyLoading } from '../../artifacts/yael-arabic-prep/lib/study-loading';

test('initial required loading blocks without treating background refresh as a blocking load', () => {
  expect(shouldBlockStudyLoading(false, false, false)).toBe(true);
  expect(shouldBlockStudyLoading(true, true, false)).toBe(true);
  expect(shouldBlockStudyLoading(true, true, true)).toBe(false);
  expect(shouldBlockStudyLoading(true, false, true)).toBe(false);
  // A failed first request must expose its retry/recovery state, not an endless loader.
  expect(shouldBlockStudyLoading(true, false, false)).toBe(false);
});
