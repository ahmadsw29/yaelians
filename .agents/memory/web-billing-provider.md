---
name: Web billing provider constraints
description: Non-obvious Whop API and configuration pitfalls for the paid website.
---
Whop SDK calls and raw REST helper calls can select different API versions even against the same v1 URL. Treat SDK upgrades and API-version migrations as one coordinated change.

**Why:** A raw plan query returned ownership under `company`, while the SDK's default version returned it under `account`; TypeScript passed but runtime price validation failed. Payment filters and membership ownership checks also depend on this contract.

**How to apply:** Verify live pricing and ownership response shapes as well as compilation when changing provider dependencies. Do not loosen ownership validation merely to accommodate a mismatched response shape.

A company-list permission error does not mean the installed Whop connection is broken.

**Why:** The scoped connection could manage products, plans and checkouts but could not list companies. Public connection metadata did not expose the company identifier.

**How to apply:** Use the documented server-side connection settings flow and extract only needed non-secret identifiers programmatically. Do not reauthorize unnecessarily or print credential payloads.

Shared environment configuration cannot be overridden by adding the same key separately to development.

**Why:** The configuration service rejected that conflicting placement. Checkout activation must remain independently controlled in development and production.

**How to apply:** Put differing activation settings in their own environments. Production activation requires explicit user approval. Never assume a hidden provider product prevents charges through its checkout URL.

Treat checkout activation and bank payout readiness as separate states.

**Why:** The user explicitly requested enabling checkout while bank payout readiness was unconfirmed. Whop's payout documentation requires identity verification and a payout method for withdrawals; the available company response does not establish payout readiness.

**How to apply:** Honor explicit checkout activation requests without claiming bank payouts are ready. Explain that the merchant must complete Whop's secure payout onboarding, and never treat a generic company verification badge as proof of KYC status.

Use Whop's documented hosted payout portal for connected-account onboarding instead of guessing dashboard navigation.

**Why:** The connected-account mobile and browser dashboards expose different controls; Settings → Payments configures buyer payment methods, not merchant bank payouts.

**How to apply:** Generate a short-lived account link with the `payouts_portal` use case through the installed connection. Deliver it privately to the owner, warn against sharing it, and never persist its token or put it in the app. The owner enters identity and bank information directly on Whop.
