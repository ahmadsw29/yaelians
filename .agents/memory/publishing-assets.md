---
name: Publishing generated assets
description: Deployment image exclusions apply to generated production output, not only initial source upload.
---

Required production build outputs must not be excluded by `.replitignore`, even when they are correctly excluded from Git.

**Why:** Publishing successfully exported the browser app and verified its files, but the deployed image lacked those same files because the deployment ignore rule removed them. The missing-file startup guard caught this; before that guard, the legacy Expo landing page silently hid the missing browser build.

**How to apply:** Keep required browser assets out of Git history without excluding them from deployment packaging. When build verification passes but runtime reports missing files, inspect image exclusions before changing bundling or weakening startup checks.
