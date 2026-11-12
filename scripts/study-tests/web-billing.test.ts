import { beforeEach, describe, expect, it, vi } from 'vitest';

type Link = { userId: string; checkoutId: string | null; membershipId: string | null };
type Member = {
  id: string; company: { id: string }; product: { id: string }; plan: { id: string };
  checkout_configuration_id: string; status: string; renewal_period_end: string; cancel_at_period_end: boolean;
};
type Payment = { checkout_configuration_id: string; company: { id: string }; status: string; membership: { id: string } | null };
const mocks = vi.hoisted(() => ({
  link: null as Link | null, member: null as Member | null, payments: [] as Payment[],
  sdk: vi.fn(), retrieve: vi.fn(), cancel: vi.fn(), list: vi.fn(), insert: vi.fn(),
}));
vi.mock('@workspace/db', () => ({
  webBillingAccounts: { userId: 'user_id' },
  db: {
    select: () => ({ from: () => ({ where: async () => mocks.link ? [mocks.link] : [] }) }),
    insert: () => ({ values: (value: { userId: string; membershipId: string }) => ({ onConflictDoUpdate: async () => {
      mocks.insert(value);
      if (mocks.link) mocks.link.membershipId = value.membershipId;
    } }) }),
    delete: () => ({ where: async () => { mocks.link = null; } }),
  },
}));
vi.mock('../../artifacts/api-server/src/lib/whopClient', () => ({
  getWhopClient: mocks.sdk,
}));
import { billingCatalog, cancelWebSubscription, effectiveStudyPlan, invalidateWebBilling, webBillingStatus } from '../../artifacts/api-server/src/lib/web-billing';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('WHOP_COMPANY_ID', 'biz_ours'); vi.stubEnv('WHOP_PRODUCT_ID', 'prod_ours'); vi.stubEnv('WHOP_PLAN_ID', 'plan_ours');
  mocks.link = { userId: 'learner', checkoutId: 'ch_ours', membershipId: null };
  mocks.payments = [];
  mocks.member = {
    id: 'mem_ours', company: { id: 'biz_ours' }, product: { id: 'prod_ours' }, plan: { id: 'plan_ours' },
    checkout_configuration_id: 'ch_ours', status: 'active', renewal_period_end: new Date(Date.now() + 86400_000).toISOString(),
    cancel_at_period_end: false,
  };
  mocks.retrieve.mockImplementation(async () => mocks.member);
  mocks.list.mockImplementation(async () => ({ async *[Symbol.asyncIterator]() { yield* mocks.payments; } }));
  mocks.cancel.mockImplementation(async () => { mocks.member!.cancel_at_period_end = true; return mocks.member; });
  mocks.sdk.mockResolvedValue({ memberships: { retrieve: mocks.retrieve, cancel: mocks.cancel }, payments: { list: mocks.list } });
  invalidateWebBilling('learner');
});
const paid = (): Payment => ({ checkout_configuration_id: 'ch_ours', company: { id: 'biz_ours' }, status: 'paid', membership: { id: 'mem_ours' } });

describe('payment-backed account access', () => {
  it('retires new checkout even if the old activation setting remains enabled', async () => {
    vi.stubEnv('WHOP_CHECKOUT_ENABLED', 'true');
    expect(await billingCatalog()).toEqual({ priceLabel: '', checkoutEnabled: false });
    expect(mocks.sdk).not.toHaveBeenCalled();
  });
  it('does not contact the provider without a server-side link', async () => {
    mocks.link = null;
    expect((await webBillingStatus('learner', true)).state).toBe('inactive');
    expect(mocks.sdk).not.toHaveBeenCalled();
  });
  it('does not unlock from an unpaid checkout', async () => {
    expect((await webBillingStatus('learner', true)).state).toBe('inactive');
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
  it('shows pending payments without access', async () => {
    mocks.payments = [{ ...paid(), status: 'pending' }];
    expect((await webBillingStatus('learner', true)).state).toBe('pending');
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('rejects payments belonging to a different checkout even if the API filter returns them', async () => {
    mocks.payments = [{ ...paid(), checkout_configuration_id: 'ch_someone_else' }];
    expect((await webBillingStatus('learner', true)).state).toBe('inactive');
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
  it('rejects payments from a different seller', async () => {
    mocks.payments = [{ ...paid(), company: { id: 'biz_someone_else' } }];
    expect((await webBillingStatus('learner', true)).state).toBe('inactive');
  });
  it('checks the membership checkout as well as the receipt checkout', async () => {
    mocks.payments = [paid()]; mocks.member!.checkout_configuration_id = 'ch_other';
    expect((await webBillingStatus('learner', true)).state).toBe('inactive');
  });
  it('links a paid, matching, active membership to this learner only', async () => {
    mocks.payments = [paid()];
    expect((await webBillingStatus('learner', true)).state).toBe('active');
    expect(mocks.insert).toHaveBeenCalledWith({ userId: 'learner', membershipId: 'mem_ours' });
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ checkout_configuration_ids: ['ch_ours'] }));
  });
  it('rechecks linked memberships and refuses expired periods', async () => {
    mocks.link!.membershipId = 'mem_ours';
    mocks.member!.renewal_period_end = new Date(Date.now() - 1).toISOString();
    expect((await webBillingStatus('learner', true)).state).toBe('inactive');
  });
  it('does not silently grant access when verification fails', async () => {
    mocks.link!.membershipId = 'mem_ours'; mocks.retrieve.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(webBillingStatus('learner', true)).rejects.toThrow('Unavailable');
  });
  it('preserves complimentary premium grants without a payment', async () => {
    expect(await effectiveStudyPlan('learner', 'premium')).toBe('premium');
    expect(mocks.sdk).not.toHaveBeenCalled();
  });
  it('never turns a trial account into premium without a verified payment', async () => {
    expect(await effectiveStudyPlan('learner', 'free')).toBe('free');
  });
});
describe('subscription renewal controls', () => {
  it('cancels only the membership stored for this account, at period end', async () => {
    mocks.link!.membershipId = 'mem_ours';
    const result = await cancelWebSubscription('learner');
    expect(mocks.cancel).toHaveBeenCalledWith('mem_ours', { cancellation_mode: 'at_period_end' });
    expect(result).toMatchObject({ state: 'active', cancelAtPeriodEnd: true });
  });
  it('does not claim a successful cancellation without provider confirmation', async () => {
    mocks.link!.membershipId = 'mem_ours';
    mocks.cancel.mockResolvedValueOnce({ ...mocks.member, cancel_at_period_end: false });
    await expect(cancelWebSubscription('learner')).rejects.toThrow('not confirmed');
  });
  it('does not cancel another seller product', async () => {
    mocks.link!.membershipId = 'mem_ours'; mocks.member!.product.id = 'prod_other';
    await expect(cancelWebSubscription('learner')).rejects.toThrow('mismatch');
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
});
