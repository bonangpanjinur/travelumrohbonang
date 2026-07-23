# UmrohPlus — Umroh & Haji Travel Agency SaaS

Multi-tenant SaaS for Umrah/Hajj travel agencies: package browsing & booking, installment payments, jamaah (pilgrim) document management, branch/agent commissions, a CMS-driven public booking site per tenant, and a full admin back office.

## Run & Operate

- `pnpm --filter @workspace/umroh-app run dev` — frontend (Vite + React, artifact `umroh-app`)
- `pnpm --filter @workspace/api-server run dev` — backend API (Express, artifact `api-server`)
- `pnpm run typecheck:libs` — typecheck shared libs (`lib/db`, `lib/email`, `lib/whatsapp`, `lib/api-*`)
- `pnpm --filter @workspace/api-server run typecheck` / `pnpm --filter @workspace/umroh-app run typecheck`
- `pnpm --filter @workspace/db run push` — push Drizzle schema changes (dev only)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod schemas from `lib/api-spec/openapi.yaml` (covers only the small auth/health surface; most business routes are hand-written in `artifacts/api-server/src/routes/*`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, React Router, TanStack Query, shadcn/Radix UI, Tailwind
- Backend: Express 5, exposes a Supabase-REST-compatible shim (`/:table`, `/rpc/:funcname`, `/object/:bucket`, `/auth/user`) backed by Postgres/Drizzle
- DB: PostgreSQL + Drizzle ORM (`lib/db`) — prefers `SUPABASE_DATABASE_URL` over `DATABASE_URL` if both are set
- Email: Resend (`lib/email`); WhatsApp: Fonnte (`lib/whatsapp`) — both inert without their API keys, app degrades gracefully
- Payments: Midtrans / Xendit gateway integrations (optional keys)

## Where things live

- `artifacts/umroh-app/src/features/*` — feature modules (admin, agent, auth, booking, cms, dashboard, jamaah, paket, tenant, wishlist)
- `artifacts/umroh-app/src/shared/*` — shared UI, hooks, i18n, Supabase client wrappers
- `artifacts/api-server/src/routes/*` — hand-written REST routes (not all covered by the OpenAPI spec)
- `lib/db/src` — Drizzle schema (packages, bookings, profiles, agents, payments, cms, tenant, contracts, itineraries, auth, etc.)
- `lib/api-spec/openapi.yaml` — auth + health-only OpenAPI spec used for codegen

## Architecture decisions

- **REST/Storage split by environment**: `src/shared/integrations/supabase/client.ts` uses the local Replit API shim (same-origin) in dev, and the real external Supabase project (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) in production builds — by explicit choice, since the app was originally Supabase-backed and the user wants production data/RLS to stay on the real Supabase project.
- **Auth always goes to real Supabase** (`auth-client.ts`): PKCE OAuth/login/signup require Supabase's actual Auth service; the local API shim only exposes `/auth/user` and `/logout`, not full auth.
- This project was migrated from a Vercel-hosted Next.js-style export into Replit's pnpm multi-artifact layout: `umroh-app` (frontend) + `api-server` (backend) as separate artifacts, replacing `vercel.json` routing with Replit's path-based artifact proxy (`artifact.toml`).

## Product

- Public site: package browsing, comparison, booking flow with DP/installments, blog, gallery, FAQ, testimonials, tenant subdomains with CMS-driven pages.
- User area: my bookings, payments, e-tickets, documents, wishlist, 2FA, contract signing.
- Admin back office: packages, departures, itineraries, bookings, payments, agents/branches/commissions, CRM, accounting, contracts, manifests, reports/analytics, role management, and more.

## User preferences

- Tujuan deployment: Vercel + Supabase (bukan Replit deployment)
- Bahasa komunikasi: Bahasa Indonesia

## Schema Architecture (post FASE 1)

- **packages** = template produk (no hotel/airline columns)
- **package_departures** = instansi nyata: sekarang punya `hotel_makkah_id`, `hotel_madinah_id` (FK ke `hotels`), plus field maskapai/bandara yang sudah ada sebelumnya
- **departure_hotels** = hotel ekstra per keberangkatan (menggantikan `package_hotels` yang dulu per-paket)
- Migration SQL: `supabase/migrations/20260723000002_fase1_schema_migration.sql`
- Setelah merge, jalankan migration ke DB: `cd lib/db && pnpm drizzle-kit push` (atau jalankan SQL migration langsung)

## Gotchas

- `.migration-backup/` contains the original imported Vercel export — kept as reference only, not part of the pnpm workspace build. Do not re-register artifacts from inside it (it previously created duplicate `.replit-artifact` workflows).
- Optional integrations (Supabase service role, Resend, Fonnte, Midtrans, Xendit) are all missing by default; the app is designed to run without them — check `artifacts/api-server/src/lib/envValidation.ts` for the full list and what each unlocks.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
