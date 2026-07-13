---
name: pnpm workspace test setup
description: How to add vitest/supertest devDeps and wire a test script for one package in this pnpm monorepo, plus a template literal edit gotcha hit along the way.
---

`installLanguagePackages` (the package-management callback) runs `pnpm add` from the repo root, which pnpm refuses for a workspace member (`ERR_PNPM_ADDING_TO_ROOT`). For a package-scoped devDependency, run `pnpm add -D <pkgs>` via shell from that package's own directory (e.g. `cd artifacts/api-server && pnpm add -D vitest supertest @types/supertest`) instead.

`api-server` now has `vitest.config.ts` + a `test` script (`vitest run`, `include: ["src/**/*.test.ts"]`); the root `package.json` has `"test": "pnpm --filter @workspace/api-server run test"`. `app.ts` exports the Express `app` (no `.listen()` call there — that's in `index.ts`), so `supertest(app)` works directly without starting a real server or needing valid Supabase JWTs for unauthenticated-path tests.

**Gotcha:** when writing a template-literal SQL placeholder like `` `col = $${values.length}` `` through the Edit tool, verify the literal `$` actually landed — a same-string edit silently failed to persist here (old_string/new_string were byte-identical to what was already in the file after a partial apply), producing `col = 1` instead of `col = $1` and only surfacing via a test assertion. When an Edit call reports success but a grep afterward shows the old content unchanged, don't retry the same Edit call — fall back to a `perl -0pi -e 's/.../.../'` (or python) in-place substitution with escaped `$`/`{}`, then grep again to confirm.
