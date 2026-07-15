---
name: Restoring after an incomplete Replit pnpm-workspace auto-migration
description: How to detect and undo a partial platform auto-migration that left the real app in .migration-backup/ while artifacts/ held empty scaffolds.
---

## Symptom
An imported Supabase/Vercel-deployed app (Express + Drizzle API, React+Vite frontend) had gone through the platform's automatic pnpm-workspace migration, but it only completed partially: the real, original app source survived intact in a top-level `.migration-backup/` directory, while the live `artifacts/umroh-app` and `artifacts/api-server` directories held fresh, empty scaffold placeholders (generic "Replit Agent is building..." App.tsx, placeholder theme CSS, minimal package.json). `vercel.json`, the real root `package.json`/`pnpm-workspace.yaml`/`.replit`, `docs/`, `sql/`, `supabase/`, and `.agents/memory/*` (a rich prior-session memory history) were also only present under `.migration-backup/`.

This causes Vercel builds to fail (e.g. "No Output Directory named public") because the scaffold app builds successfully but produces no meaningful output, or the workspace member is missing entirely from what Vercel's build command expects.

## Fix
1. Confirm `.migration-backup/` contains the real, complete app (check for `vercel.json`, real `src/`, `supabase/`, `.agents/memory/*`).
2. Restore wholesale: `cp -a .migration-backup/. .` from repo root, overwriting the scaffold, then `rm -rf .migration-backup`.
3. Re-register artifacts — see [artifact-reregistration-after-restore.md](artifact-reregistration-after-restore.md), since `listArtifacts()` won't pick up the restored `.replit-artifact/artifact.toml` files automatically.
4. `pnpm install`, then build each restored artifact package to confirm the real build now matches what `vercel.json`'s `outputDirectory` expects.

**Why:** the platform's artifact/workflow registry is populated by explicit `createArtifact` calls, not by scanning the filesystem on its own — a manual file restore alone leaves the registry pointing at nothing, and the previous partial migration already overwrote real files once, so treating `.migration-backup/` as the source of truth (not the live `artifacts/` scaffold) is essential.
