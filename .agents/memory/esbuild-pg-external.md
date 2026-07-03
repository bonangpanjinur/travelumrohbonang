---
name: esbuild pg externalization
description: pg must be external in esbuild AND a direct dep of the bundle package; otherwise runtime throws ERR_MODULE_NOT_FOUND
---

**Rule:** Any package imported transitively (e.g. `pg` used by `@workspace/db`) that esbuild externalizes must also be a direct `dependency` of the artifact that runs the bundle.

**Why:** pnpm doesn't hoist transitive deps into the artifact's `node_modules`. When esbuild externalizes `pg`, the built `.mjs` does `require('pg')` at runtime from the artifact's CWD — and finds nothing, because `pg` only lives in `lib/db/node_modules/pg` (pnpm virtual store).

**How to apply:**
1. Add the package to `external` in `build.mjs`.
2. Also add it as a direct `dependency` in the artifact's `package.json`.
3. Run `pnpm install` to link it.

Applied in `artifacts/api-server` for `pg@^8.22.0`.
