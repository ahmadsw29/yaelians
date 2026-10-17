---
name: Account and avatar decisions
description: Avatar scope and managed authentication constraints for YAEL Prep.
---
The user chose customizable cartoon avatars rather than Snapchat Bitmoji integration or image uploads.
**Why:** Explicit selection when asked which avatar option to build.
**How to apply:** Extend the app's own avatar customization; do not introduce Snapchat dependencies without a new request.

The managed Clerk tenant rejects built-in first_name during signup. Display names belong in display-only unsafeMetadata unless tenant settings change.
**Why:** Real signup returned HTTP 422 for first_name; built-in names are not enabled on this tenant. Metadata must never grant authorization.
**How to apply:** Keep login/signup limited to configured identity fields; preserve existing metadata when editing the profile.
