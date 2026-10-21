import { describe, expect, it } from 'vitest';
import { membershipGrantsAccess, replacementCheckoutAllowed, trustedReturnOrigin } from '../../artifacts/api-server/src/lib/web-billing-policy';

const expected = { companyId: 'biz_ours', productId: 'prod_ours', planId: 'plan_ours' };
const now = Date.parse('2026-10-21T12:00:00Z');
const membership = {
  company: { id: expected.companyId }, product: { id: expected.productId }, plan: { id: expected.planId },
  status: 'active', renewal_period_end: '2026-11-21T12:00:00Z', checkout_configuration_id: 'ch_ours',
};
describe('server-verified web membership access', () => {
  it('accepts the expected active membership inside its paid period', () => {
    expect(membershipGrantsAccess(membership, expected, now)).toBe(true);
  });
  it.each(['company', 'product', 'plan'] as const)('rejects a different %s', key => {
    expect(membershipGrantsAccess({ ...membership, [key]: { id: 'someone_else' } }, expected, now)).toBe(false);
  });
  it.each(['canceled', 'expired', 'past_due', 'trialing', 'pending'])('does not grant from %s', status => {
    expect(membershipGrantsAccess({ ...membership, status }, expected, now)).toBe(false);
  });
  it.each([null, 'not-a-date', new Date(now).toISOString(), new Date(now - 1).toISOString()])('rejects a missing or expired period %s', end => {
    expect(membershipGrantsAccess({ ...membership, renewal_period_end: end }, expected, now)).toBe(false);
  });
  it.each(['active', 'past_due', 'trialing', 'pending', 'unpaid'])('does not create another subscription during %s', status => {
    expect(replacementCheckoutAllowed({ ...membership, status }, expected)).toBe(false);
  });
  it.each(['expired', 'canceled'])('allows a fresh checkout after %s', status => {
    expect(replacementCheckoutAllowed({ ...membership, status }, expected)).toBe(true);
  });
  it('cannot replace a membership belonging to another seller', () => {
    expect(replacementCheckoutAllowed({ ...membership, status: 'expired', company: { id: 'other' } }, expected)).toBe(false);
  });
});
describe('checkout return origins', () => {
  const site = 'https://example.test';
  it('defaults to the configured production origin', () => expect(trustedReturnOrigin(undefined, site, [])).toBe(site));
  it('permits the exact production origin', () => expect(trustedReturnOrigin(site, site, [])).toBe(site));
  it('permits only specifically configured development origins', () => {
    expect(trustedReturnOrigin('https://preview.test', site, ['https://preview.test'])).toBe('https://preview.test');
  });
  it.each(['https://example.test.evil.test', 'https://evil.test', 'http://example.test', 'null'])('rejects %s', origin => {
    expect(() => trustedReturnOrigin(origin, site, [])).toThrow();
  });
});
