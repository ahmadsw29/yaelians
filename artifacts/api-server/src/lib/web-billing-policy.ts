type Membership = {
  company: { id: string };
  product: { id: string };
  plan: { id: string };
  status: string;
  renewal_period_end: string | null;
  checkout_configuration_id: string | null;
};

export function membershipGrantsAccess(
  membership: Membership,
  expected: { companyId: string; productId: string; planId: string },
  now = Date.now(),
) {
  const ends = Date.parse(membership.renewal_period_end ?? "");
  return membership.company.id === expected.companyId
    && membership.product.id === expected.productId
    && membership.plan.id === expected.planId
    && membership.status === "active"
    && Number.isFinite(ends) && ends > now;
}

export function replacementCheckoutAllowed(membership: Membership, expected: { companyId: string; productId: string; planId: string }) {
  return membership.company.id === expected.companyId
    && membership.product.id === expected.productId
    && membership.plan.id === expected.planId
    && ["canceled", "expired"].includes(membership.status);
}

export function trustedReturnOrigin(origin: string | undefined, productionUrl: string, developmentOrigins: string[]) {
  const production = new URL(productionUrl).origin;
  if (!origin) return production;
  const parsed = new URL(origin);
  if (parsed.origin === production || developmentOrigins.includes(parsed.origin)) return parsed.origin;
  throw new Error("Untrusted checkout origin");
}
