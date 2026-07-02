---
name: Vercel API tsconfig — express type double-loading conflict
description: Root cause and fix for TS7006 + TS2339 errors when Vercel compiles the api/ serverless function with Express types from a pnpm monorepo.
---

## Root Cause

A pnpm monorepo with express in `artifacts/api-server/` creates TWO copies of `@types/express`:
- `artifacts/api-server/node_modules/@types/express`
- Root `node_modules/@types/express`

When `api/tsconfig.json` sets **both** in `typeRoots` AND includes `"express"` in `types`, TypeScript loads the global `Express` namespace from **both locations simultaneously**. The two declarations merge incorrectly, causing members like `.json()`, `.query`, `.params`, `.status()` to disappear from `Request`/`Response` (TS2339).

Separately, if the route files have NO explicit type annotations AND the namespace merge is broken, TypeScript can't infer callback param types → TS7006 ("implicitly has 'any' type").

## Fix (two-part)

### 1. `api/tsconfig.json` — load express globally from ONE place only

```json
{
  "compilerOptions": {
    "typeRoots": ["../node_modules/@types"],
    "types": ["node"]
  }
}
```

**Why:** Removing `"express"` from `types` stops the global double-load. Express types are still available in route files via explicit `import { Request, Response } from "express"` — module resolution finds ONE consistent version in `artifacts/api-server/node_modules/@types/express`.

### 2. Route files — explicit `import { Request, Response } from "express"` + annotate ALL handler params

```typescript
import { Router, Request, Response } from "express";

router.get("/path", async (req: Request, res: Response) => { ... });
router.get("/path", async (_req: Request, res: Response) => { ... });
```

**Why:** Module resolution (import) finds one canonical version; global typeRoots no longer fights it. Explicit annotations satisfy `noImplicitAny` so TS7006 can't fire even in Vercel's transitively-compiled context.

## What NOT to do

- Do NOT put both `"artifacts/api-server/node_modules/@types"` AND `"../node_modules/@types"` in `typeRoots` of `api/tsconfig.json` — causes the namespace merge conflict.
- Do NOT include `"express"` in the `types` array of `api/tsconfig.json` — redundant and triggers double-load.

## Null-safety with Drizzle nullable columns

Drizzle columns typed as `string | null` cannot be used as `Record<K, V>` keys directly. Always guard:

```typescript
const map = rows.reduce<Record<string, ...>>((acc, row) => {
  if (!row.nullableId) return acc;   // ← guard required
  if (!acc[row.nullableId]) acc[row.nullableId] = [];
  acc[row.nullableId].push(row);
  return acc;
}, {});
```
