# ARCHITECTURE.md
> Arsitektur teknis Umroh App — struktur monorepo, stack, dan dependency diagram.
> Terakhir diperbarui: 2026-07-08

---

## Monorepo Layout (pnpm workspaces)

```
umroh-app/                          ← root
├── artifacts/
│   ├── umroh-app/                  ← Frontend (React 19 + Vite 7)
│   │   └── src/
│   │       ├── features/           ← domain modules (feature-sliced)
│   │       │   ├── admin/          ← admin pages, components, hooks
│   │       │   ├── agent/          ← agent management
│   │       │   ├── auth/           ← login, register, 2FA, reset
│   │       │   ├── booking/        ← multi-step booking flow
│   │       │   ├── cms/            ← blog, FAQ, gallery (public)
│   │       │   ├── dashboard/      ← customer dashboard
│   │       │   ├── jamaah/         ← pilgrim (jamaah) management
│   │       │   ├── paket/          ← package catalog & detail
│   │       │   ├── tenant/         ← tenant/site settings
│   │       │   └── wishlist/       ← wishlist
│   │       ├── shared/
│   │       │   ├── components/
│   │       │   │   ├── common/     ← shared generic components
│   │       │   │   ├── layout/     ← PublicLayout, DashboardLayout
│   │       │   │   └── ui/         ← shadcn/ui primitives
│   │       │   ├── hooks/          ← useAuth, useTenant, usePermission
│   │       │   ├── i18n/           ← internationalization (id/en)
│   │       │   ├── integrations/
│   │       │   │   └── supabase/   ← Supabase JS client instance
│   │       │   └── lib/
│   │       │       ├── apiClient.ts  ← apiFetch() wrapper (auto-attaches JWT)
│   │       │       └── utils.ts
│   │       └── pages/              ← route entry points, NotFound.tsx
│   │
│   ├── api-server/                 ← Backend (Express 5, Node.js 20)
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── admin/          ← semua /admin/* routes
│   │       │   │   ├── agents.ts, bookings.ts, branches.ts
│   │       │   │   ├── chats.ts, content.ts, costs.ts
│   │       │   │   ├── crm.ts, currencies.ts, departures.ts
│   │       │   │   ├── documents.ts, gallery.ts, integrations.ts
│   │       │   │   ├── logs.ts, loyalty.ts, masterdata.ts
│   │       │   │   ├── packages.ts, payments.ts, pilgrims.ts
│   │       │   │   ├── redirects.ts, refunds.ts, reviews.ts
│   │       │   │   ├── seo.ts, settings.ts, systemHealth.ts
│   │       │   │   ├── tenant.ts, testimonials.ts, users.ts
│   │       │   │   └── index.ts    ← admin router aggregator
│   │       │   ├── auth.ts         ← /auth/user, /logout
│   │       │   ├── bookings.ts     ← booking CRUD
│   │       │   ├── cms.ts          ← site-settings, navigation, chat-messages
│   │       │   ├── faqs.ts         ← public FAQ
│   │       │   ├── health.ts       ← /health, /healthz
│   │       │   ├── logs.ts         ← request/error/audit logs
│   │       │   ├── misc.ts         ← currencies, tenant-site
│   │       │   ├── notifications.ts
│   │       │   ├── packages.ts     ← public package catalog
│   │       │   ├── payments.ts
│   │       │   ├── pilgrim-documents.ts
│   │       │   ├── profile.ts
│   │       │   ├── rest.ts         ← Supabase HTTP proxy (ALLOWED_TABLES whitelist)
│   │       │   ├── storage.ts      ← Supabase Storage proxy
│   │       │   ├── wishlists.ts
│   │       │   └── index.ts        ← main router aggregator
│   │       ├── middlewares/
│   │       │   ├── authMiddleware.ts ← JWT verifier + AbortSignal.timeout(8s)
│   │       │   ├── rateLimiter.ts
│   │       │   ├── validate.ts     ← Zod request validation
│   │       │   └── requireAdmin.ts ← role check
│   │       ├── lib/
│   │       │   ├── auth.ts         ← Supabase fetch helper (no createClient!)
│   │       │   ├── supabase.ts     ← env resolver (SUPABASE_URL, ANON_KEY)
│   │       │   └── logger.ts
│   │       └── index.ts            ← Express app entry, PORT config
│   │
│   └── mockup-sandbox/             ← Vite sandbox untuk UI prototyping
│
├── lib/
│   ├── db/                         ← Drizzle ORM — source of truth schema
│   │   └── src/
│   │       ├── schema/             ← semua table definitions (.ts)
│   │       └── index.ts            ← pool + pool.on("error") handler
│   ├── api-spec/                   ← OpenAPI YAML spec (openapi.yaml)
│   ├── api-zod/                    ← Zod validation schemas (generated via Orval)
│   ├── api-client-react/           ← React hooks (generated via Orval)
│   └── replit-auth-web/            ← ⚠️ LEGACY — Replit Auth, tidak dipakai
│
├── api/
│   └── index.ts                    ← Vercel serverless entry point
│
├── scripts/
│   ├── migrations/                 ← SQL migration files
│   ├── seed.ts / seed.sql          ← dev seed data
│   ├── verify-deploy-env.mjs       ← pre-deploy env check
│   └── scripts/push-to-supabase.mjs ← schema push script
│
├── supabase-schema.sql             ← Drizzle-generated schema (source of truth)
├── supabase-seed.sql               ← General seed data
├── supabase-seed-prod.sql          ← Production seed (idempotent)
├── supabase-deploy.sql             ← Combined deploy script
├── pnpm-workspace.yaml
├── vercel.json
└── tsconfig.json
```

---

## Stack Teknologi

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Frontend Framework | React | 19 |
| Frontend Build | Vite | 7 |
| CSS | Tailwind CSS | 4 |
| Routing | React Router DOM | v6+ |
| Server State | TanStack Query | v5 |
| UI Primitives | Radix UI + shadcn/ui | — |
| Backend | Express | 5 |
| Runtime | Node.js | 20 |
| ORM | Drizzle ORM | — |
| Database | PostgreSQL | — |
| Auth | Supabase Auth (JWT) | — |
| Storage | Supabase Storage | — |
| Real-time | Supabase Realtime | — |
| API Validation | Zod | — |
| Code Generation | Orval (OpenAPI → hooks) | — |
| Package Manager | pnpm workspaces | — |
| Deploy (prod) | Vercel (serverless) | — |
| Deploy (dev) | Replit | — |

---

## Flow Aplikasi

```
Browser
  │
  ├── / (Landing)              → PublicLayout → halaman publik
  ├── /auth                    → Login / Register / Reset Password
  ├── /packages                → Katalog Paket Umroh
  ├── /packages/:slug          → Detail Paket + Reviews
  ├── /booking                 → Booking Flow (requires auth)
  ├── /dashboard/*             → Customer Dashboard (requires auth)
  │   ├── /dashboard           → Overview & stats
  │   ├── /dashboard/bookings  → My Bookings
  │   ├── /dashboard/profile   → Profil
  │   └── /dashboard/wishlist  → Wishlist
  └── /admin/*                 → Admin Dashboard (requires admin role)
      ├── /admin               → Admin Overview
      ├── /admin/packages      → Kelola Paket
      ├── /admin/bookings      → Kelola Booking
      ├── /admin/users         → Kelola User
      ├── /admin/payments      → Kelola Pembayaran
      ├── /admin/agents        → Kelola Agen
      ├── /admin/branches      → Kelola Cabang
      ├── /admin/roles         → Role Management
      └── ... (30+ halaman admin)

API Server (port 8080 dev / Vercel serverless prod)
  ├── /health, /healthz        → Health check
  ├── /auth/user, /logout      → Auth
  ├── /packages/*              → Paket (public)
  ├── /faqs                    → FAQ (public)
  ├── /cms/*                   → CMS data (site-settings, navigation)
  ├── /bookings/*              → Booking (auth required)
  ├── /profile/*               → Profil (auth required)
  ├── /notifications           → Notifikasi (auth required)
  ├── /wishlists               → Wishlist (auth required)
  ├── /admin/*                 → Admin routes (admin role required)
  ├── /api/rest/:table         → Supabase REST proxy (ALLOWED_TABLES)
  └── /api/storage/*           → Supabase Storage proxy

External Services
  ├── Supabase Auth            → JWT issuance & verification
  ├── Supabase Realtime        → Live notifications & updates
  └── PostgreSQL (Replit DB)   → Data persistence
```

---

## Dependency Diagram

```
                    ┌─────────────────────────┐
                    │    Browser / User        │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   artifacts/umroh-app    │
                    │   React 19 + Vite 7      │
                    │                          │
                    │  imports:                │
                    │  ├── lib/api-client-react │◄── generated by Orval
                    │  ├── lib/api-zod          │◄── generated from spec
                    │  └── @supabase/supabase-js│
                    └────────┬────────┬────────┘
                             │        │
               apiFetch()   │        │ supabase.from()
               (with JWT)   │        │ (direct — beberapa halaman)
                    ┌────────▼──┐  ┌──▼────────────────┐
                    │ api-server │  │  Supabase Cloud    │
                    │ Express 5  │  │  PostgREST + Auth  │
                    │            │  └────────┬──────────┘
                    │ imports:   │           │ RLS Policies
                    │ ├── lib/db │           │
                    │ └── lib/   │  ┌────────▼──────────┐
                    │   api-zod  │  │                    │
                    └─────┬──────┘  │   PostgreSQL DB    │
                          │ Drizzle │  (Replit managed)  │
                          └─────────►                    │
                                    └───────────────────┘

                    ┌─────────────────────────┐
                    │      lib/api-spec        │
                    │  openapi.yaml            │
                    │       │                  │
                    │       ▼  Orval codegen   │
                    │  lib/api-zod             │
                    │  lib/api-client-react    │
                    └─────────────────────────┘
```

### Catatan Penting: Dua Jalur Database

| Jalur | Dipakai Di | RLS | Service Role |
|-------|-----------|-----|-------------|
| Drizzle ORM → Express → PostgreSQL | Mayoritas admin routes | ❌ Bypass | ✅ Ya |
| `supabase.from()` → PostgREST | Beberapa halaman frontend | ✅ Aktif | ❌ Tidak |

Kedua jalur mengakses database yang sama. Drizzle via service role bypass RLS — artinya **business logic dan access control di admin routes sepenuhnya dari kode Express**, bukan dari RLS Supabase.

---

## Vercel Deployment

```
vercel.json
  └── rewrites semua request ke api/index.ts (serverless function)
          │
          └── import artifacts/api-server/src/index.ts
                    │
                    └── Express app handle semua routes
```

Saat deploy ke Vercel:
- `DATABASE_URL` tidak tersedia → `rest.ts` dan `auth.ts` fallback ke Supabase HTTP REST API
- Semua env vars harus di-set di Vercel dashboard (tidak dari Replit Secrets)
