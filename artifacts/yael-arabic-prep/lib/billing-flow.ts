export type BillingScreenState = 'checking' | 'inactive' | 'pending' | 'active' | 'error';

export function billingScreenState(
  state: 'inactive' | 'pending' | 'active' | undefined,
  loading: boolean,
  failed: boolean,
  waitingForReturn: boolean,
): BillingScreenState {
  if (loading) return 'checking';
  if (failed || !state) return 'error';
  if (state === 'active' || state === 'pending') return state;
  return waitingForReturn ? 'pending' : 'inactive';
}

// Convenience only: email never proves payment or binds entitlement.
// The server still binds checkout to the authenticated learner and verifies Whop.
export function hostedCheckoutUrl(purchaseUrl: string, verifiedEmail?: string) {
  const url = new URL(purchaseUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'whop.com' || url.username || url.password || url.port) {
    throw new Error('Invalid checkout destination');
  }
  if (verifiedEmail?.trim()) url.searchParams.set('email', verifiedEmail.trim());
  // Leave the email editable: a parent may pay for the learner.
  return url.toString();
}
