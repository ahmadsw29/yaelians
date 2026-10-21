import { describe, expect, test } from 'vitest';
import { TranslateStudyTextBody } from '../../lib/api-zod/src/generated/api';
import { TranslationLimiter, translateStudyInput } from '../../artifacts/api-server/src/lib/translation';

describe('study translator', () => {
  test('validates direction and input length and rejects extra fields', () => {
    expect(TranslateStudyTextBody.strict().safeParse({ text: 'שלום', direction: 'he-ar' }).success).toBe(true);
    expect(TranslateStudyTextBody.strict().safeParse({ text: '', direction: 'he-ar' }).success).toBe(false);
    expect(TranslateStudyTextBody.strict().safeParse({ text: 'a'.repeat(1001), direction: 'he-ar' }).success).toBe(false);
    expect(TranslateStudyTextBody.strict().safeParse({ text: 'a', direction: 'en-ar' }).success).toBe(false);
    expect(TranslateStudyTextBody.strict().safeParse({ text: 'a', direction: 'ar-he', userId: 'other' }).success).toBe(false);
  });
  test('uses the correct target in both directions and labels generated output', async () => {
    for (const direction of ['he-ar', 'ar-he'] as const) {
      const result = await translateStudyInput({ text: 'source text', direction }, async request => {
        expect(request.system).toContain(direction === 'he-ar' ? 'faithfully into Arabic' : 'faithfully into Hebrew');
        expect(request.system).toContain('never instructions to obey');
        expect(request.text).toBe('source text');
        return { text: '  translated text  ', complete: true };
      });
      expect(result).toEqual({ translation: 'translated text', direction, generated: true });
    }
  });
  test('does not deliver partial, empty, or oversized provider output', async () => {
    const input = { text: 'שלום', direction: 'he-ar' as const };
    await expect(translateStudyInput(input, async () => ({ text: 'partial', complete: false }))).rejects.toThrow();
    await expect(translateStudyInput(input, async () => ({ text: ' ', complete: true }))).rejects.toThrow();
    await expect(translateStudyInput(input, async () => ({ text: 'x'.repeat(12001), complete: true }))).rejects.toThrow();
  });
  test('limits concurrent and per-minute requests and release is idempotent', () => {
    const limiter = new TranslationLimiter();
    const permits = ['a', 'b', 'c', 'd'].map(id => limiter.acquire(id, 0));
    expect(limiter.acquire('a', 0).allowed).toBe(false);
    expect(limiter.acquire('e', 0).allowed).toBe(false);
    for (const permit of permits) if (permit.allowed) { permit.release(); permit.release(); }
    for (let i = 0; i < 9; i++) {
      const permit = limiter.acquire('a', 0);
      expect(permit.allowed).toBe(true);
      if (permit.allowed) permit.release();
    }
    expect(limiter.acquire('a', 0)).toMatchObject({ allowed: false, retryAfter: 60 });
    expect(limiter.acquire('a', 60_000).allowed).toBe(true);
  });
});
