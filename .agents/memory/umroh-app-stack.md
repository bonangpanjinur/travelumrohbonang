---
name: Umroh App Stack
description: Vite+React+Supabase app migrated from Vercel; key quirks for deps and Tailwind v4 setup.
---

## Auth migration: Supabase Auth → Replit Auth

Auth was fully switched to Replit Auth (server sessions via `openid-client` + cookie, `credentials: "include"` on the client). Direct Supabase *data* queries (`supabase.from(...)`) were kept out of scope — dozens of files still call them client-side, so `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` must stay set even though Supabase Auth itself is gone.

**Why:** the user only wanted auth replaced, not a full data-layer migration in the same pass; ripping out Supabase env vars entirely would break all the still-Supabase-backed data screens.

**How to apply:** when adding a workspace lib package (e.g. a browser auth-hook package) that isn't code-generated, remember it needs the same tsconfig project-reference wiring as generated libs: `composite: true` + `declarationMap` + `emitDeclarationOnly` in its own tsconfig, added to both the consuming app's `references` and the root `tsconfig.json` `references`, then `pnpm -w run typecheck:libs` (a `tsc --build`) before the app's own typecheck will pick it up — otherwise you get `TS6305: Output file ... has not been built from source file`.

If a lib file uses `import.meta.env`, add `/// <reference types="vite/client" />` at the top of that file, add `"types": ["vite/client"]` to its tsconfig, and add `vite` to its `devDependencies` — plain `tsc --build` won't otherwise see Vite's ambient types.

A stale `dist/` bundle for the Express API server can keep a runtime error from a **deleted** source file (e.g. an old `lib/supabase.ts` throwing on missing env vars) alive across restarts if the previous build wasn't cleaned. If a workflow fails with an error referencing a file that no longer exists in `src/`, do `rm -rf dist` and rebuild before assuming the code is still broken.
