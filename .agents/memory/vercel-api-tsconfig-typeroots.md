---
name: Vercel API tsconfig typeRoots
description: api/tsconfig.json must explicitly point to @types packages or Vercel type-checks fail with TS7006 implicit-any on all Express callback params.
---

## Rule
`api/tsconfig.json` must include both `typeRoots` and `types`:

```json
"typeRoots": [
  "../artifacts/api-server/node_modules/@types",
  "../node_modules/@types"
],
"types": ["node", "express"]
```

**Why:** `tsconfig.base.json` sets `"types": []` which disables automatic `@types` discovery. When Vercel compiles `api/index.ts` using `api/tsconfig.json`, it doesn't inherit the `typeRoots` from `artifacts/api-server/tsconfig.json`. Without Express types loaded, every router callback param (`req`, `res`, `_req`) becomes implicitly `any`, causing `TS7006` build failures on Vercel even though local typecheck passes (because the api-server tsconfig is used locally).

**How to apply:** Any time `api/tsconfig.json` is modified or recreated, ensure these two fields are present. The `@types/express` and `@types/node` packages live in `artifacts/api-server/node_modules/@types`, not the workspace root.
