---
name: Vercel API tsconfig — express type double-loading conflict
description: Root cause and fix for TS2339 errors when Vercel compiles api-server with Express types from a pnpm monorepo.
---

## Root Cause

`artifacts/api-server/tsconfig.json` had `"typeRoots"` pointing to BOTH local AND root node_modules simultaneously. This loads the Express global namespace from two places → double-merge → `.json()`, `.status()` etc. disappear from `Request`/`Response`.

## Fix

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types"],
    "types": ["node"]
  }
}
```

**Why `./node_modules/@types` (local, not root):** `@types/express` and `@types/node` are direct devDependencies of api-server → pnpm installs them locally. Using root `../../node_modules/@types` would miss them.

**Why remove `"express"` from `types`:** Prevents Express global namespace being loaded a second time via typeRoots (it's already available via module imports). Removing it does NOT break `import { Request, Response } from "express"` — that uses module resolution, not typeRoots.

## What NOT to do

- Do NOT put both `"./node_modules/@types"` AND `"../../node_modules/@types"` in typeRoots — causes double-load.
- Do NOT add `"express"` to `types` array — redundant, triggers double-load.

## manualChunks rule

Every package listed in `rollupOptions.output.manualChunks` MUST be declared in `package.json`. Unlisted packages (even transitive ones like `html2canvas`) cause Rollup to fail at build time. Remove them from the chunk map and let Rollup auto-chunk them.
