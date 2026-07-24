---
name: Imported workspace dependency bootstrap
description: Imported pnpm workspaces may have a valid lockfile but no node_modules, so workflows can fail before application code is evaluated.
---

After importing a pnpm monorepo, install from the existing lockfile before diagnosing workflow or runtime failures.

**Why:** A missing `node_modules` directory makes both frontend and backend workflows report misleading command/module-not-found errors, hiding whether the application itself starts.

**How to apply:** Check for the lockfile and workspace package manifests, run the repository's frozen-lockfile install, then restart managed workflows and inspect their logs before changing application code.