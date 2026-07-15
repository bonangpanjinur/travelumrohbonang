# UmrohPlus

A SaaS platform for Umrah/Hajj travel agencies (Indonesia) to manage packages, bookings, payments, jamaah (pilgrim) documents, branches/agents, and CRM — imported from an existing GitHub repo and set up to run on Replit.

## Run & Operate

- Preview: frontend at `/` (Umroh App), API at `/api` (API Server) — both run as managed Replit artifact workflows; restart via the `WorkflowsRestart` tool, not manually.
- `pnpm --filter @workspace/umroh-app run dev` — frontend dev server (do not run directly; use the artifact workflow)
- `pnpm --filter @workspace/api-server run dev` — API server dev server (do not run directly; use the artifact workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` (auto-provisioned by Replit's built-in Postgres, already set)

## Stack

- pnpm workspace monorepo, Node.js 20, TypeScript
- Frontend: React 19 + Vite, Tailwind, React Router, TanStack Query
- API: Express 5 (`artifacts/api-server`)
- DB: PostgreSQL (Replit-provisioned) + Drizzle ORM (`lib/db`)
- Auth: designed for Supabase Auth (`lib/db` schema + `artifacts/umroh-app/src/shared/integrations/supabase`) — not yet configured, see Gotchas
- Notifications: `lib/email` (Resend) and `lib/whatsapp` (Fonnte) — fully implemented in code, not yet configured, see Gotchas
- Canvas/mockup sandbox: `artifacts/mockup-sandbox`

## Where things live

- `docs/PRD.md` — full product requirements doc (Indonesian), including the F-01..F-09 feature roadmap and priority matrix
- `docs/FEATURE_STATUS.md` — feature-by-feature implementation status snapshot
- `lib/api-spec/openapi.yaml` — source of truth for API contracts (drives Orval codegen)
- `lib/db/src/schema/` — Drizzle schema (packages, bookings, profiles, payments, cms, tenant, crm, contracts, itineraries, auth, etc.)
- `artifacts/api-server/src/routes/` — REST routes, including `admin/` subtree for admin-only endpoints
- `artifacts/api-server/src/lib/notifications/` — email/WhatsApp dispatch layer wired into booking/payment/document events
- `artifacts/umroh-app/src/features/` — frontend feature modules (booking, admin, agent, cms, dashboard, jamaah, etc.)

## Architecture decisions

- This project was imported from GitHub with `artifact.toml` files already on disk but not registered with Replit's artifact system (a leftover from a prior migration). Registration was completed by creating a disposable probe artifact, which triggered auto-discovery of the existing `artifact.toml` files; duplicate registrations under a stale `.migration-backup/` folder were then deleted, and manually-configured ad hoc workflows were removed in favor of the platform-managed ones.
- Both `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` and email/WhatsApp provider keys are optional at the code level (the app degrades gracefully — logs and skips rather than crashing), so the app is fully runnable today even without those credentials.
- DB schema is pushed to Replit's own provisioned Postgres (`DATABASE_URL`) for now. The app's original design uses a separate Supabase Postgres project as source of truth (`SUPABASE_DATABASE_URL` env var takes precedence in `lib/db` when set) — decide with the user whether to keep using Replit's Postgres or reconnect to the original Supabase project before going to production.

## Product

Travel-agency-facing SaaS: manage Umrah/Hajj packages, departures, bookings & installment payments, jamaah documents, branches/agents/commissions, CMS content (site pages, blog, gallery, testimonials), and a public-facing booking site per tenant/branch.

## User preferences

- Work through the PRD's unfinished roadmap phases in priority order (P0 → P1 → …).

## Gotchas

- Login/auth, email notifications, and WhatsApp notifications are fully coded but **inert** until secrets are provided: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` (auth), `RESEND_API_KEY`/`EMAIL_FROM`/`EMAIL_FROM_NAME` (email), `FONNTE_API_TOKEN`/`WA_SENDER_NUMBER` (WhatsApp). Payment gateways (Midtrans/Xendit) are similarly coded but unconfigured.
- Never call `configureWorkflow` for `api-server`/`umroh-app`/`mockup-sandbox` — they are platform-managed artifact services now; use `WorkflowsRestart` with their exact managed names.
- `docs/PRD.md` originally marked F-03 (Email) and F-04 (WhatsApp) as "⏳ Belum" (not started) — this was stale; both are fully implemented in code as of 2026-07-15 and only need provider credentials.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
