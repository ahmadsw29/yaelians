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

**How to apply:** Put differing activation settings in their own environments; keep production disabled until merchant verification and explicit launch approval. Never assume a hidden provider product prevents charges through its checkout URL.
