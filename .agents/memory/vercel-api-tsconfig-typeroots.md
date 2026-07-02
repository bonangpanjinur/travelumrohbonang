---
name: Vercel API tsconfig typeRoots
description: Both api/tsconfig.json AND artifacts/api-server/tsconfig.json must explicitly declare typeRoots or Vercel TS build gets TS7006 on Express callback params.
---

## Rule
**Both** `api/tsconfig.json` and `artifacts/api-server/tsconfig.json` must include `typeRoots` + `types`.

`api/tsconfig.json` (paths relative to `api/` dir):
```json
"typeRoots": ["../artifacts/api-server/node_modules/@types", "../node_modules/@types"],
"types": ["node", "express"]
```

`artifacts/api-server/tsconfig.json` (paths relative to `artifacts/api-server/` dir):
```json
"typeRoots": ["./node_modules/@types", "../../node_modules/@types"],
"types": ["node", "express"]
```

**Why:** `tsconfig.base.json` sets `"types": []` which disables automatic `@types` discovery. Vercel compiles `api/index.ts` with `api/tsconfig.json`; route files inside `artifacts/api-server/src/` are compiled transitively. Without Express types loaded in BOTH configs, every router callback param (`req`, `res`) becomes implicitly `any`, causing TS7006 on Vercel even when local build passes (because local build uses `artifacts/api-server/tsconfig.json` directly). The `@types/express` package lives in `artifacts/api-server/node_modules/@types` in pnpm workspace layout.

**How to apply:** Any time either tsconfig is modified or recreated, ensure both tsconfigs have these two fields. Always run `pnpm run build` inside `artifacts/api-server/` locally to catch errors before push.

**Important:** TS7006 errors from an old GitHub commit won't go away until Replit changes are pushed to GitHub and Vercel redeploys.
