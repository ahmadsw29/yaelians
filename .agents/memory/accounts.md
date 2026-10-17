---
name: Account and avatar decisions
description: Avatar scope and managed authentication constraints for YAEL Prep.
---
The user chose customizable cartoon avatars rather than Snapchat Bitmoji integration or image uploads.
**Why:** Explicit selection when asked which avatar option to build.
**How to apply:** Extend the app's own avatar customization; do not introduce Snapchat dependencies without a new request.

The app owner's testing access is intended to be lifetime complimentary premium, not a paid monthly subscription.
**Why:** The user explicitly requested lifetime premium for his own account so he can test the app.
**How to apply:** Do not attach charges or an expiration to the owner testing grant. When store subscriptions launch, preserve complimentary grants separately rather than overwriting them with a missing store subscription.

XP-dependent learner titles must be additional to the existing “نقاط الخبرة” tag, not replace it.
**Why:** The user asked for learner titles and explicitly said not to delete the XP tag.
**How to apply:** Keep earned XP visible when restyling profile ranks; derive titles from actual progress rather than assigning an unrelated profile role.

The managed Clerk tenant rejects built-in first_name during signup. Display names belong in display-only unsafeMetadata unless tenant settings change.
**Why:** Real signup returned HTTP 422 for first_name; built-in names are not enabled on this tenant. Metadata must never grant authorization.
**How to apply:** Keep login/signup limited to configured identity fields; preserve existing metadata when editing the profile.

Account-deletion testing must use a newly created disposable account, never an existing learner.
**Why:** The user explicitly prohibited deleting existing users during implementation or testing.
**How to apply:** Establish that the test account was created for the current test before taking any destructive action.

Deletion must survive partial failure between the identity provider and cloud storage; keep it scoped to the authenticated account and preserve guest/other-account device data.
**Why:** Identity deletion and database commits cannot form one atomic transaction. Revoking identity first without a durable retry can strand cloud data.
**How to apply:** Preserve the durable, irrevocable deletion-request approach and its explicit pending-state messaging when extending this flow.

Persist device cleanup intent before sending the irreversible deletion request, and recover it before study providers mount. An expired-token rejection after an uncertain request does not prove the original deletion failed.
**Why:** A lost response or app termination can leave private device data behind after cloud identity revocation; an in-memory retry dialog cannot recover after restart.
**How to apply:** Keep accepted versus unconfirmed outcomes distinct. Both resume explicitly authorized device erasure, but unconfirmed outcomes must explain that cloud deletion may need another verified request, never offer to “keep” a potentially deleted account.
