---
name: Orval zod client requires zod v4
description: Orval-generated Zod schemas (zod client target) crash at runtime, not typecheck, if the workspace catalog pins zod v3.
---

## Symptom
`lib/api-zod`-style generated code (from Orval's zod client) throws `TypeError: (void 0) is not a function` at runtime — e.g. inside calls to `zod.email()` or `zod.url()` — even though the project typechecks fine.

## Root cause
Orval's zod client target emits **zod v4** top-level syntax (`z.email()`, `z.url()`, etc.), which doesn't exist in zod v3 (v3 only has `.string().email()`-style chained methods). If the pnpm-workspace catalog pins `zod: ^3.x`, the generated code compiles but throws at call time.

## Fix
Pin the workspace catalog's `zod` version to `^4.x` (e.g. `^4.4.3`) in `pnpm-workspace.yaml`, then `pnpm install` and restart affected services.

**Why:** this is a runtime-only failure — bundlers/typecheckers don't catch the v3/v4 API mismatch, so it silently ships broken until a route using the generated schema is actually hit.

**How to apply:** whenever Orval's `client: "zod"` (or similar) config is used for API codegen, verify the catalog's zod version is v4 before assuming a "generated code is broken" bug is something else.
