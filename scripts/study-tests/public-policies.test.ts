import { describe, expect, it } from 'vitest';
import {
  POLICY_PAGES, PUBLIC_PRICING, SELLER_DETAILS, policyDocument, policyPage,
} from '../../artifacts/yael-arabic-prep/lib/public-policies';

describe('public Paddle-review document drafts', () => {
  it('provides four distinct navigable documents and safe unknown-section handling', () => {
    expect(POLICY_PAGES.map(page => page.id)).toEqual(['pricing', 'terms', 'privacy', 'refunds']);
    expect(policyPage('refunds')).toBe('refunds');
    expect(policyPage(['terms', 'privacy'])).toBe('privacy');
    expect(policyPage('unknown')).toBe('privacy');
    expect(new Set(POLICY_PAGES.map(page => policyDocument(page.id).title)).size).toBe(4);
  });
  it('does not invent a seller identity, contact address, jurisdiction or refund promise', () => {
    expect(SELLER_DETAILS.legalName).toBeNull();
    expect(SELLER_DETAILS.supportEmail).toBeNull();
    expect(SELLER_DETAILS.country).toBeNull();
    expect(SELLER_DETAILS.refundTerms).toBeNull();
    for (const page of POLICY_PAGES) {
      const document = policyDocument(page.id);
      expect(document.draft).toBe(true);
      expect(document.sections.length).toBeGreaterThan(2);
      expect(JSON.stringify(document)).not.toMatch(/[٠-٩۰-۹]/);
    }
  });
  it('shows the proposed monthly price without claiming it is an activated checkout total', () => {
    expect(PUBLIC_PRICING).toMatchObject({ amount: 48.9, currency: 'ILS', proposed: true });
    const pricing = JSON.stringify(policyDocument('pricing'));
    expect(pricing).toContain('48.90');
    expect(pricing).toContain('سعر مخطّط');
    expect(pricing).toContain('الشراء الجديد متوقف');
    expect(pricing).toContain('لم يُحسم بعد إعداد الضريبة');
  });
  it('keeps legacy refunds separate from unimplemented Paddle billing', () => {
    const refunds = JSON.stringify(policyDocument('refunds'));
    expect(refunds).toContain('دفعات Whop السابقة');
    expect(refunds).toContain('ليس استردادًا تلقائيًا');
    expect(refunds).toContain('لم يؤكّد البائع بعد');
    expect(JSON.stringify(policyDocument('terms'))).toContain('غير مفعّل حاليًا');
    expect(JSON.stringify(policyDocument('privacy'))).toContain('Paddle مزوّد مخطّط غير مفعّل بعد');
  });
});
