---
name: Project structure after re-import cleanup
description: After each Replit re-import the real app code lands in .migration-backup/; this documents what to restore and how to clean up.
---

# Project Structure After Re-import Cleanup

**Why:** Every GitHub re-import via Replit's pnpm-workspace auto-migration puts the original app code in `.migration-backup/` and creates a bare-bones skeleton in the root. The real app must be manually restored.

## What Gets Lost on Each Import
- `artifacts/umroh-app/` — entire React frontend
- `artifacts/api-server/src/` (most of it) — replaced by bare health-only skeleton
- `lib/db/src/schema/` — replaced by empty placeholder
- `lib/db/src/index.ts` — replaced by simple version without SUPABASE_DATABASE_URL fallback
- `lib/api-spec/openapi.yaml` — replaced by health-only spec
- `lib/api-zod/src/` — only HealthStatus generated
- `lib/api-client-react/src/` — only health hook generated
- `api/` — Vercel entry point — gone
- `sql/` — migrations and seeds — gone
- `scripts/verify-deploy-env.mjs`, `push-to-supabase.mjs`, `seed.ts` — gone
- `docs/` — all documentation — gone
- `eslint.config.js`, `vercel.json`, `.env.example`, `.githooks/` — gone

## Restore Sequence
```bash
# Copy real app from backup
cp -r .migration-backup/artifacts/umroh-app artifacts/umroh-app
cp -r .migration-backup/artifacts/api-server/src artifacts/api-server/src
cp .migration-backup/artifacts/api-server/package.json artifacts/api-server/package.json
# ... (see full list in previous task history)

# Create docs/
mkdir docs && cp .migration-backup/docs/{PRD,ARCHITECTURE,DATABASE_MAP,ROADMAP,FEATURE_STATUS,ENVIRONMENT,API_MAP,AUTH_ARCHITECTURE,AUTH_FLOW,DEPLOY_TUTORIAL}.md docs/

# Restore agent memory
cp .migration-backup/.agents/memory/*.md .agents/memory/

# Remove backup
rm -rf .migration-backup
```

## Canonical Docs to Keep in docs/
- `PRD.md` — single source of truth product requirements
- `ARCHITECTURE.md` — monorepo layout and stack
- `DATABASE_MAP.md` — all tables, columns, relations
- `ROADMAP.md` — sprint roadmap
- `FEATURE_STATUS.md` — feature completion status
- `ENVIRONMENT.md` — all env variables
- `API_MAP.md` — all API endpoints
- `AUTH_ARCHITECTURE.md` + `AUTH_FLOW.md` — auth design
- `DEPLOY_TUTORIAL.md` — Vercel deployment guide

## Docs NOT to Restore (ephemeral/operational)
- `BUG_TRACKER.md`, `RENCANA_PERBAIKAN.md`, `repair-plan.md` — point-in-time repair plans
- `ADMIN_PANEL_AUDIT_*.md`, `PROJECT_ANALYSIS.md` — audit snapshots
- `RENCANA_PERLENGKAPAN_INVOICE.md`, `ADMIN_API_ERROR_SCHEMA.md` — feature-specific scratchpads
- `MASTER_PROJECT_BLUEPRINT.md` — superseded by PRD

**How to apply:** Any time a re-import is detected (bare `artifacts/api-server/src/routes/index.ts` with only health route, empty `lib/db/src/schema/index.ts`), follow the restore sequence above.
