---
name: Workspace pnpm alignment
description: Replit workflow startup depends on the packageManager version matching the pnpm binary available in the workspace runtime.
---

The root `packageManager` declaration must match the pnpm version provided by the current Replit runtime. If it requests an unavailable version, every managed workflow can fail before the application command starts while pnpm repeatedly attempts a self-install.

**Why:** Imported workspaces can carry a newer packageManager declaration than the runtime image. The resulting failure looks like an application or port problem, but no Vite/API code is reached.

**How to apply:** Check the runtime pnpm version before diagnosing workflow or dependency failures. Align the root declaration, run a frozen workspace install to restore package links, then restart the managed artifact workflows.