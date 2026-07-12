# PROJECT_ANALYSIS.md
> Audit menyeluruh repository Umroh App — hanya dokumentasi, tidak ada perubahan kode.
> Dibuat: 2026-07-08

---

## Daftar Isi
1. [Arsitektur Project](#1-arsitektur-project)
2. [Flow Aplikasi](#2-flow-aplikasi)
3. [Flow Login](#3-flow-login)
4. [Flow Dashboard](#4-flow-dashboard)
5. [Flow Database](#5-flow-database)
6. [ERD](#6-erd)
7. [Daftar API](#7-daftar-api)
8. [Daftar SQL](#8-daftar-sql)
9. [Daftar Environment Variables](#9-daftar-environment-variables)
10. [Dependency Diagram](#10-dependency-diagram)
11. [Daftar Bug](#11-daftar-bug)
12. [Technical Debt](#12-technical-debt)
13. [Prioritas Perbaikan](#13-prioritas-perbaikan)
14. [Feature Map](#14-feature-map)
15. [Implementation Roadmap (Sprint Plan)](#15-implementation-roadmap-sprint-plan)

---

## 1. Arsitektur Project

### Monorepo Layout (pnpm workspaces)

```
umroh-app/                          ← root
├── artifacts/
│   ├── umroh-app/                  ← Frontend (React 19 + Vite 7)
│   │   └── src/
│   │       ├── features/           ← domain modules
│   │       │   ├── admin/          ← admin pages & components
│   │       │   ├── agent/          ← agent management
│   │       │   ├── auth/           ← login/register/2FA
│   │       │   ├── booking/        ← booking flow
│   │       │   ├── cms/            ← blog, FAQ, gallery
│   │       │   ├── dashboard/      ← customer dashboard
│   │       │   ├── jamaah/         ← pilgrim management
│   │       │   ├── paket/          ← package catalog
│   │       │   ├── tenant/         ← tenant/site settings
│   │       │   └── wishlist/       ← wishlist
│   │       ├── shared/
│   │       │   ├── components/     ← layout, UI primitives
│   │       │   ├── hooks/          ← useAuth, useTenant, etc.
│   │       │   ├── i18n/           ← internationalization
│   │       │   ├── integrations/supabase/  ← Supabase client
│   │       │   └── lib/            ← apiClient, utils
│   │       └── pages/              ← route entry points
│   │
│   ├── api-server/                 ← Backend (Express 5, Node.js)
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── admin/          ← /admin/* routes
│   │       │   ├── auth.ts
│   │       │   ├── bookings.ts
│   │       │   ├── cms.ts
│   │       │   ├── faqs.ts
│   │       │   ├── misc.ts
│   │       │   ├── notifications.ts
│   │       │   ├── packages.ts
│   │       │   ├── payments.ts
│   │       │   ├── pilgrim-documents.ts
│   │       │   ├── profile.ts
│   │       │   ├── rest.ts         ← Supabase HTTP proxy
│   │       │   ├── storage.ts      ← Supabase Storage proxy
│   │       │   ├── wishlists.ts
│   │       │   └── index.ts        ← route aggregator
│   │       ├── middlewares/
│   │       │   ├── auth.ts         ← JWT verifier
│   │       │   ├── rateLimiter.ts
│   │       │   ├── validate.ts
│   │       │   └── requireAdmin.ts
│   │       ├── lib/
│   │       │   ├── auth.ts         ← Supabase fetch-based auth helper
│   │       │   ├── supabase.ts     ← env resolver
│   │       │   └── logger.ts
│   │       └── index.ts            ← Express app entry
│   │
│   └── mockup-sandbox/             ← Vite sandbox for UI prototyping
│
├── lib/
│   ├── db/                         ← Drizzle ORM schema + client
│   │   └── src/schema/             ← all table definitions
│   ├── api-spec/                   ← OpenAPI YAML spec
│   ├── api-zod/                    ← Zod validation schemas (generated)
│   ├── api-client-react/           ← React hooks (generated via Orval)
│   └── replit-auth-web/            ← Replit Auth (legacy, not active)
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
├── supabase-schema.sql             ← Drizzle-generated schema
├── supabase-seed.sql               ← General seed
├── supabase-seed-prod.sql          ← Production seed
├── supabase-deploy.sql             ← Combined deploy script
├── pnpm-workspace.yaml
├── vercel.json
└── tsconfig.json
```

### Stack Teknologi

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, React Router DOM (routing) |
| State/Data | TanStack Query, Zustand (minimal) |
| UI Components | Radix UI, shadcn/ui |
| Backend | Express 5, Node.js 20 |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Replit managed) |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage (proxied) |
| Real-time | Supabase Realtime |
| API Validation | Zod |
| Code Gen | Orval (OpenAPI → React hooks) |
| Deploy | Vercel (serverless) / Replit (dev) |

---

## 2. Flow Aplikasi

```
Browser
  │
  ├── / (Landing)             → PublicLayout → public pages
  ├── /auth                   → Login / Register / Reset
  ├── /packages               → Katalog Paket Umroh
  ├── /packages/:slug         → Detail Paket
  ├── /booking                → Booking Flow (auth required)
  ├── /dashboard/*            → Customer Dashboard (auth required)
  │   ├── /dashboard          → Overview
  │   ├── /dashboard/bookings → My Bookings
  │   ├── /dashboard/profile  → Profil
  │   └── /dashboard/wishlist → Wishlist
  └── /admin/*                → Admin Dashboard (admin role required)
      ├── /admin              → Admin Overview
      ├── /admin/packages     → Kelola Paket
      ├── /admin/bookings     → Kelola Booking
      ├── /admin/users        → Kelola User
      ├── /admin/payments     → Kelola Pembayaran
      └── ... (banyak lagi)

API Server (port 8080 dev / Vercel serverless prod)
  ├── /health                 → Health check
  ├── /auth/*                 → Auth proxy
  ├── /packages/*             → Paket (public)
  ├── /bookings/*             → Booking (auth)
  ├── /admin/*                → Admin (admin role)
  ├── /api/rest/:table        → Supabase REST proxy
  └── /api/storage/*          → Supabase Storage proxy

External Services
  ├── Supabase Auth           → JWT management
  ├── Supabase Realtime       → Live notifications
  └── PostgreSQL              → Data persistence
```

---

## 3. Flow Login

```
User Input (email + password)
        │
        ▼
supabaseAuth.signInWithPassword()
        │
        ▼
Supabase Auth Server (/auth/v1/token)
        │
        ▼
Response: { access_token (JWT), refresh_token, user }
        │
        ▼
AuthContext.setSession()
  ├── Simpan session di localStorage (Supabase default)
  └── Trigger onAuthStateChange listener
        │
        ▼
apiFetch() — setiap API call menyertakan:
  Authorization: Bearer <access_token>
        │
        ▼
Express Middleware: auth.ts
  ├── Extract Bearer token
  ├── Fetch ke Supabase /auth/v1/user (verifikasi token)
  └── Set req.user = { id, email, role }
        │
        ▼
requireAdmin.ts (untuk /admin/* routes)
  ├── Cek user_roles table (via Drizzle/Supabase)
  └── Verifikasi role hierarchy (super_admin > admin > branch_manager > staff > agent > buyer)
        │
        ▼
Route Handler → Response
        │
        ▼
Frontend — redirect berdasarkan role:
  ├── super_admin / admin / staff → /admin
  └── buyer / agent               → /dashboard
```

### Potensi Error Auth

| # | Scenario | Error |
|---|----------|-------|
| 1 | `SUPABASE_SERVICE_ROLE_KEY` tidak di-set | 401 pada semua /admin routes |
| 2 | Token expired, refresh gagal | Logout paksa dari frontend |
| 3 | `VITE_SUPABASE_URL` salah | `supabase.auth.signIn()` timeout |
| 4 | User ada di Supabase Auth tapi tidak di `user_roles` | Role = null → redirect loop |
| 5 | 2FA enabled tapi belum setup | Redirect ke /account/2fa, tidak bisa masuk |
| 6 | CORS salah konfigurasi (Vercel) | Preflight 403 |
| 7 | `createClient()` dipanggil di Node.js | WebSocket crash (tidak ada native WS di Node 20) |

---

## 4. Flow Dashboard

### Admin Dashboard

```
/admin → AdminRoute.tsx
  ├── Cek: isAdmin dari useAuth()
  ├── Cek: 2FA jika diaktifkan
  └── Render AdminLayout
        ├── AdminSidebar (role-filtered menu)
        │   ├── SUPER_ONLY: Role Mgmt, Integrasi
        │   ├── FINANCE: Payments, Reports
        │   ├── OPERATIONAL: Packages, Bookings
        │   └── ALL_STAFF: Departures, Pilgrims, Chat
        └── <Outlet> — halaman aktif

API calls dari Admin Dashboard:
  GET /admin/dashboard/stats
  GET /admin/bookings?status=pending
  GET /admin/system-health
  GET /admin/settings
  GET /cms/navigation
  GET /cms/site-settings
```

### Customer Dashboard

```
/dashboard → AuthRoute.tsx
  ├── Cek: user login
  └── Render DashboardLayout
        ├── Sidebar customer
        └── <Outlet> — halaman aktif

API calls dari Customer Dashboard:
  GET /bookings/my
  GET /notifications
  GET /profile/:id
  GET /wishlists
```

### Route yang Belum Selesai / Perlu Perhatian

| Route | Status | Keterangan |
|-------|--------|------------|
| `/admin/payment-gateway` | Incomplete | Tidak ada provider aktif (Midtrans/Xendit) |
| `/admin/analytics-ai` | Incomplete | AI analytics belum terhubung ke model |
| `/admin/contracts` | Partial | Ada permission check tapi flow belum lengkap |
| `/admin/refunds` | Partial | UI ada, backend route belum full |
| `/admin/costs` | Partial | `admin/costs.ts` ada, write operations belum diverifikasi |

---

## 5. Flow Database

```
Frontend (React)
      │
      ├── via apiFetch() → Express API Server
      │       │
      │       ├── Drizzle ORM → PostgreSQL (Replit/Supabase)
      │       └── Supabase REST proxy (/api/rest/:table)
      │               │
      │               └── Supabase PostgREST → PostgreSQL
      │
      └── via supabase.from() (direct, hanya beberapa tempat)
              │
              └── Supabase PostgREST → PostgreSQL
                      │
                      └── RLS Policies aktif
```

**Catatan Penting**: Ada dua jalur akses database:
1. **Drizzle ORM via Express** — dipakai mayoritas admin routes
2. **Supabase direct client** — dipakai beberapa halaman frontend (wishlists, dashboard counts)

Kedua jalur ini mengakses database yang sama tapi melewati lapisan keamanan berbeda (Drizzle bypass RLS via service role, Supabase client tunduk RLS).

---

## 6. ERD

```
profiles
  id (FK → auth.users.id)
  fullName, email, phone, avatarUrl
  role, isActive
  createdAt, updatedAt

user_roles
  id, userId (FK → profiles.id)
  role (enum: super_admin|admin|branch_manager|staff|agent|buyer)
  isActive, assignedBy
  createdAt

packages
  id, slug, title, description
  categoryId (FK → package_categories.id)
  basePrice, durationDays
  isActive, isFeatured
  createdAt

package_categories
  id, name, description, parentId (self-ref FK)
  icon, isActive, sortOrder

package_departures
  id, packageId (FK → packages.id)
  departureDate, returnDate
  quota, bookedCount
  hotelMekkahId (FK → hotels.id)
  hotelMadinahId (FK → hotels.id)
  airlineId (FK → airlines.id)
  price, status

bookings
  id, bookingCode
  userId (FK → profiles.id)
  packageId (FK → packages.id)
  departureId (FK → package_departures.id)
  agentId (FK → agents.id) [nullable]
  roomType, totalAmount
  status (pending|confirmed|cancelled|completed)
  paymentStatus
  createdAt

payments
  id, bookingId (FK → bookings.id)
  amount, method, status
  proofUrl, notes
  createdAt, verifiedAt, verifiedBy

booking_pilgrims
  id, bookingId (FK → bookings.id)
  name, nik, passportNumber
  gender, birthDate
  mahramRelation

agents
  id, userId (FK → profiles.id)
  agentCode, commissionRate
  totalCommission, withdrawnAmount
  isActive

agent_commissions
  id, agentId (FK → agents.id)
  bookingId (FK → bookings.id)
  amount, status, paidAt

agent_withdrawals
  id, agentId (FK → agents.id)
  amount, status, processedAt

notifications
  id, userId (FK → profiles.id)
  type, title, message
  isRead, relatedId, relatedType
  createdAt

wishlists
  id, userId (FK → profiles.id)
  packageId (FK → packages.id)
  createdAt

reviews
  id, packageId (FK → packages.id)
  userId (FK → profiles.id)
  rating, comment
  isApproved, createdAt

pilgrim_documents
  id, bookingId (FK → bookings.id)
  pilgramId (FK → booking_pilgrims.id)
  type, fileUrl, status
  uploadedAt, verifiedAt

branches
  id, name, slug, address
  city, region, phone, email
  isActive, createdAt

hotels / airlines / airports / muthawifs
  (master data, no FK ke booking langsung)

gallery (images)
  id, title, imageUrl
  departureId (FK → package_departures.id) [nullable]
  category, isActive

faqs
  id, question, answer
  category, sortOrder, isActive

blog_posts / pages (CMS)
  id, title, slug, content
  authorId (FK → profiles.id)
  status, publishedAt

site_settings
  id, key, value, type
  (key-value store untuk konfigurasi site)

cms_navigation
  id, label, href, icon
  parentId (self-ref FK)
  sortOrder, isActive, roles[]

logs
  id, type (request|error|audit)
  userId, method, path, statusCode
  duration, message, metadata
  createdAt
```

### Relasi Utama

```
[profiles] 1 ──── N [user_roles]
[profiles] 1 ──── N [bookings]
[profiles] 1 ──── N [notifications]
[profiles] 1 ──── N [wishlists]
[profiles] 1 ──── 1 [agents]

[packages]     1 ──── N [package_departures]
[packages]     1 ──── N [wishlists]
[packages]     1 ──── N [reviews]
[package_categories] 1 ──── N [packages]
[package_categories] 1 ──── N [package_categories] (self)

[bookings] 1 ──── N [payments]
[bookings] 1 ──── N [booking_pilgrims]
[bookings] 1 ──── N [pilgrim_documents]
[bookings] 1 ──── 1 [agent_commissions]

[agents]  1 ──── N [agent_commissions]
[agents]  1 ──── N [agent_withdrawals]
```

---

## 7. Daftar API

### Public & Auth

| Method | URL | File | Status |
|--------|-----|------|--------|
| GET | `/health` | `health.ts` | ✅ Working |
| GET | `/healthz` | `health.ts` | ✅ Working |
| GET | `/auth/user` | `auth.ts` | ✅ Working |
| GET | `/logout` | `auth.ts` | ✅ Working |
| GET | `/packages` | `packages.ts` | ✅ Working |
| GET | `/packages/filter-options` | `packages.ts` | ✅ Working |
| GET | `/packages/:slug` | `packages.ts` | ✅ Working |
| GET | `/packages/reviews/:packageId` | `packages.ts` | ✅ Working |
| GET | `/faqs` | `faqs.ts` | ✅ Working |
| GET | `/currencies` | `misc.ts` | ✅ Working |
| GET | `/tenant-site` | `misc.ts` | ✅ Working |
| POST | `/logs/request` | `logs.ts` | ✅ Working |
| POST | `/logs/error` | `logs.ts` | ✅ Working |
| POST | `/logs/audit` | `logs.ts` | ✅ Working |

### Authenticated User

| Method | URL | File | Status |
|--------|-----|------|--------|
| GET | `/bookings/my` | `bookings.ts` | ✅ Working |
| POST | `/bookings` | `bookings.ts` | ✅ Working |
| POST | `/bookings/:id/rooms` | `bookings.ts` | ✅ Working |
| POST | `/bookings/:id/pilgrims` | `bookings.ts` | ✅ Working |
| GET | `/profile/:id` | `profile.ts` | ✅ Working |
| PATCH | `/profile/:id` | `profile.ts` | ✅ Working |
| GET | `/notifications` | `notifications.ts` | ✅ Working |
| PATCH | `/notifications/:id/read` | `notifications.ts` | ✅ Working |
| GET | `/pilgrim-documents` | `pilgrim-documents.ts` | ✅ Working |
| POST | `/pilgrim-documents` | `pilgrim-documents.ts` | ✅ Working |
| GET | `/wishlists` | `wishlists.ts` | ✅ Working |
| POST | `/wishlists/toggle` | `wishlists.ts` | ✅ Working |

### Admin (Prefix: `/admin`)

| Method | URL | File | Status |
|--------|-----|------|--------|
| GET | `/admin/users` | `admin/users.ts` | ✅ Working |
| PATCH | `/admin/users/:id` | `admin/users.ts` | ✅ Working |
| GET | `/admin/agents` | `admin/agents.ts` | ✅ Working |
| POST | `/admin/agents` | `admin/agents.ts` | ✅ Working |
| GET | `/admin/agents/commissions` | `admin/agents.ts` | ✅ Working |
| GET | `/admin/bookings` | `admin/bookings.ts` | ✅ Working |
| GET | `/admin/bookings/recent` | `admin/bookings.ts` | ✅ Working |
| GET | `/admin/settings` | `admin/settings.ts` | ✅ Working |
| GET | `/admin/system-health` | `admin/systemHealth.ts` | ✅ Working |
| GET | `/admin/crm/leads` | `admin/crm.ts` | ✅ Working |
| POST | `/admin/crm/leads` | `admin/crm.ts` | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/content/blog` | `admin/content.ts` | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/content/gallery` | `admin/content.ts` | ✅ Working |
| GET/POST/PATCH/DELETE | `/admin/content/pages` | `admin/content.ts` | ✅ Working |
| * | `/admin/payments/*` | `admin/payments.ts` | ⚠️ Partial |
| * | `/admin/refunds/*` | `admin/refunds.ts` | ⚠️ Partial |
| * | `/admin/costs/*` | `admin/costs.ts` | ⚠️ Partial |

### Proxy / Infrastructure

| Method | URL | File | Status |
|--------|-----|------|--------|
| GET/POST/PATCH/DELETE | `/api/rest/:table` | `rest.ts` | ✅ Working |
| POST | `/api/rest/rpc/:func` | `rest.ts` | ✅ Working |
| GET | `/api/storage/object/public/:bucket/*` | `storage.ts` | ✅ Working |
| POST | `/api/storage/object/:bucket/*` | `storage.ts` | ✅ Working |

---

## 8. Daftar SQL

| File | Kategori | Keterangan | Sinkron? |
|------|----------|------------|----------|
| `supabase-schema.sql` | Schema | Generated dari Drizzle, idempotent | ✅ Source of truth |
| `supabase-deploy.sql` | Schema + Config | Combined deploy script | ✅ |
| `supabase-seed.sql` | Seed | Data awal umum | ✅ |
| `supabase-seed-prod.sql` | Seed | Production seed, idempotent | ✅ |
| `scripts/seed.sql` | Seed | Dev environment seed | ✅ |
| `scripts/migrations/supabase_schema.sql` | Schema + Policy | Berisi RLS policies | ⚠️ Mungkin drift vs Drizzle |
| `scripts/migrations/business_logic_triggers.sql` | Trigger + Function | Booking quota, auto-confirm, agent commission, notif | ⚠️ Ada trigger untuk Replit Auth (konflik) |
| `scripts/migrations/add_new_user_profile_trigger.sql` | Trigger | Sync auth.users → profiles | ⚠️ Khusus Supabase, gagal di local |
| `scripts/migrations/add_show_extra_hotels_to_package_categories.sql` | Migration | Tambah kolom + backfill | ✅ |

### Business Logic Triggers (dari `business_logic_triggers.sql`)

| Trigger | Tabel | Fungsi |
|---------|-------|--------|
| `check_departure_quota` | `bookings` (BEFORE INSERT) | Hard lock quota via FOR UPDATE |
| `auto_confirm_booking` | `payments` (AFTER UPDATE) | Auto-confirm booking saat payment lunas |
| `calculate_agent_commission` | `bookings` (AFTER INSERT) | Hitung komisi agen otomatis |
| `send_booking_notification` | `bookings` (AFTER INSERT/UPDATE) | Insert ke `notifications` |
| `update_departure_booked_count` | `bookings` (AFTER INSERT/UPDATE) | Update counter quota |
| `create_user_profile` | `auth.users` (AFTER INSERT) | Auto-create `profiles` row |
| `update_updated_at` | Multiple tables | Auto-update `updatedAt` |
| `log_booking_changes` | `bookings` | Audit trail |

---

## 9. Daftar Environment Variables

| Variable | Frontend | Backend | Required | Catatan |
|----------|----------|---------|----------|---------|
| `VITE_SUPABASE_URL` | ✅ | ✅ (fallback) | **YES** | URL project Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ | ✅ (fallback) | **YES** | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | ✅ | **YES** | Admin operations, JANGAN prefix VITE_ |
| `DATABASE_URL` | ❌ | ✅ | **YES** | Dikelola Replit; wajib ada |
| `VITE_API_URL` | ✅ | ❌ | YES | Base URL API; bisa kosong (same-origin) |
| `SUPABASE_URL` | ❌ | ✅ | No | Backend-specific; fallback ke VITE_ |
| `SUPABASE_ANON_KEY` | ❌ | ✅ | No | Backend-specific; fallback ke VITE_ |
| `NODE_ENV` | ✅ | ✅ | No | Toggle dev features (CORS, stacks) |
| `VITE_SUPABASE_PROJECT_ID` | ✅ | ❌ | No | Dipakai scripts/push-to-supabase |
| `SUPABASE_PROJECT_REF` | ❌ | Script | No | scripts/push-to-supabase.mjs |
| `SUPABASE_ACCESS_TOKEN` | ❌ | Script | No | Supabase CLI auth |
| `SESSION_SECRET` | ❌ | ❌ | No | ⚠️ Ada di secrets tapi tidak dipakai di code |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Deprecated | ❌ | No | Diganti VITE_SUPABASE_ANON_KEY |

### ⚠️ Yang Perlu Dikonfigurasi di Replit

```
VITE_SUPABASE_URL          = https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY     = eyJ...
SUPABASE_SERVICE_ROLE_KEY  = eyJ...  ← RAHASIA, jangan expose ke frontend
DATABASE_URL               = (sudah dikelola Replit)
VITE_API_URL               = (kosong atau URL API server)
```

---

## 10. Dependency Diagram

```
                    ┌─────────────────────────┐
                    │    Browser / User        │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   artifacts/umroh-app    │
                    │   React + Vite           │
                    │                          │
                    │  imports:                │
                    │  ├── lib/api-client-react │◄─── generated by Orval
                    │  ├── lib/api-zod          │◄─── generated from spec
                    │  └── @supabase/supabase-js│
                    └────────┬────────┬────────┘
                             │        │
               apiFetch()   │        │ supabase.from()
                             │        │ (direct, beberapa tempat)
                    ┌────────▼──┐  ┌──▼────────────────┐
                    │ api-server│  │  Supabase Cloud    │
                    │ Express 5 │  │  (PostgREST + Auth)│
                    │           │  └───────────────────┘
                    │ imports:  │           │
                    │ ├── lib/db│           │ RLS Policies
                    │ └── lib/  │           │
                    │   api-zod │  ┌────────▼──────────┐
                    └─────┬─────┘  │   PostgreSQL DB    │
                          │        │  (Replit managed)  │
                   Drizzle│        └───────────────────┘
                          │
                    ┌─────▼───────────────────┐
                    │      lib/db              │
                    │  Drizzle Schema + Client │
                    └─────────────────────────┘

                    ┌─────────────────────────┐
                    │      lib/api-spec        │
                    │  openapi.yaml            │
                    │       │                  │
                    │       ▼ (Orval codegen)  │
                    │  lib/api-zod             │
                    │  lib/api-client-react    │
                    └─────────────────────────┘
```

---

## 11. Daftar Bug

### 🔴 Critical (P0)

| # | Bug | Lokasi | Dampak |
|---|-----|--------|--------|
| B1 | `SESSION_SECRET` ada di Replit Secrets tapi tidak dipakai di kode manapun | — | Unused secret, membingungkan |
| B2 | Jika `SUPABASE_SERVICE_ROLE_KEY` tidak di-set, semua `/admin/*` routes return 401 tanpa pesan yang jelas | `middlewares/auth.ts` | Admin tidak bisa login |
| B3 | User ada di Supabase Auth tapi belum ada row di `user_roles` → role = null → redirect loop antara `/admin` dan `/dashboard` | `AdminRoute.tsx`, `AuthRoute.tsx` | User terjebak loop |
| B4 | `scripts/migrations/business_logic_triggers.sql` berisi trigger yang merujuk Replit Auth schema yang konflik dengan Supabase Auth | `business_logic_triggers.sql` | Auth inconsistency di production |
| B5 | `scripts/migrations/add_new_user_profile_trigger.sql` hanya bisa dijalankan di Supabase (butuh `auth` schema) — gagal di local dev | — | Migration gagal di local |

### 🔴 Security (P0)

| # | Bug | Lokasi | Dampak |
|---|-----|--------|--------|
| B6 | `/cms/chat-messages` endpoint **tidak ada auth/ownership check** — siapapun bisa baca pesan booking milik orang lain hanya dengan menebak `booking_id` | `artifacts/api-server/src/routes/cms.ts:212` | Data leak pesan chat user lain |

### 🟠 High (P1)

| # | Bug | Lokasi | Dampak |
|---|-----|--------|--------|
| B7 | Payment gateway tidak terintegrasi (Midtrans/Xendit tidak ada di routes) — hanya manual upload bukti bayar | `admin/payments.ts`, `Payment.tsx` | Pembayaran tidak otomatis |
| B8 | `supabase-schema.sql` (Drizzle generated) dan `scripts/migrations/supabase_schema.sql` bisa drift satu sama lain | — | Schema production ≠ ORM |

### 🟡 Medium (P2)

| # | Bug | Lokasi | Dampak |
|---|-----|--------|--------|
| B9 | `lib/replit-auth-web` masih ada sebagai package tapi tidak dipakai sama sekali | `lib/replit-auth-web/` | Dead code, confusion |
| B10 | `AnalyticsAI.tsx` ada komponen UI tapi tidak terhubung ke AI model apapun | `features/admin/` | Feature non-functional |
| B11 | `admin/contracts.ts` permission check ada tapi create/delete flow belum lengkap | `admin/contracts.ts` | Feature incomplete |

### 🟢 Low (P3)

| # | Bug | Lokasi | Dampak |
|---|-----|--------|--------|
| B12 | Tidak ada global error boundary di frontend | `src/App.tsx` | White screen tanpa info saat error |
| B13 | `console.error` di `faqs.ts` tidak diikuti proper error response shape | `faqs.ts:40` | Inconsistent error format |
| B14 | `stale .tsbuildinfo` bisa menyembunyikan TypeScript errors saat typecheck | Semua packages | False "clean" typecheck |

> ✅ **Verified correct (bukan bug):** CMS router sudah di-mount di `routes/index.ts`; `rest.ts` sudah memiliki `ALLOWED_TABLES` whitelist; `pool.on("error")` sudah ada di `lib/db/src/index.ts`; `AbortSignal.timeout()` sudah dipakai di `authMiddleware.ts` dan `rest.ts`; backend tidak menggunakan Supabase `createClient()`.

---

## 12. Technical Debt

| # | Debt | Severity | Keterangan |
|---|------|----------|------------|
| TD1 | Dua jalur DB (Drizzle vs Supabase direct) tanpa abstraksi jelas | High | Frontend langsung query Supabase di beberapa tempat, bypasses business logic |
| TD2 | OpenAPI spec (`lib/api-spec`) bisa drift dari implementasi Express routes | High | Generated hooks jadi stale |
| TD3 | `lib/replit-auth-web` legacy package masih ada — sisa dari migrasi auth | Medium | Dead code, confusion |
| TD4 | Tidak ada integration tests / e2e tests | High | Tidak bisa detect regresi |
| TD5 | `rest.ts` proxy memiliki `ALLOWED_TABLES` whitelist, tapi RLS policies di Supabase harus tetap diverifikasi untuk setiap tabel dalam daftar | Low | Defense-in-depth |
| TD6 | Schema drift antara Drizzle ORM dan manual SQL migrations | High | Sulit maintain |
| TD7 | Tidak ada error boundary di frontend | Medium | UX buruk saat error |
| TD8 | `SESSION_SECRET` di Replit Secrets tapi tidak dipakai | Low | Unnecessary secret |
| TD9 | `AnalyticsAI.tsx` komponen tanpa backend | Low | Dead UI code |
| TD10 | Bahasa campur (Indonesia/English) di kode dan komentar | Low | Maintainability |

---

## 13. Prioritas Perbaikan

### P0 — Blocker (Harus diperbaiki dulu, sistem tidak bisa jalan)

| Priority | Issue |
|----------|-------|
| P0 | Konfigurasi env vars yang benar (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) |
| P0 | Verifikasi Supabase Auth berjalan dan bisa login end-to-end |
| P0 | Fix trigger konflik Replit Auth vs Supabase Auth di `business_logic_triggers.sql` |
| P0 | Pastikan schema Supabase (production) sync dengan Drizzle ORM |
| P0 | Fix redirect loop saat user ada di auth tapi tidak ada di `user_roles` |
| P0 🔒 | **SECURITY**: Tambah auth + ownership check di `/cms/chat-messages` (`cms.ts:212`) |

### P1 — Critical (Dashboard tidak bisa jalan normal)

| Priority | Issue |
|----------|-------|
| P1 | Pastikan `/admin/*` routes tidak return 500 tanpa pesan yang jelas |
| P1 | Pastikan `SUPABASE_SERVICE_ROLE_KEY` terkonfigurasi untuk admin routes |

### P2 — Important (Fitur utama belum lengkap)

| Priority | Issue |
|----------|-------|
| P2 | Integrasi payment gateway (Midtrans atau Xendit) |
| P2 | Lengkapi flow Refunds di admin |
| P2 | Lengkapi flow Contracts |
| P2 | Tambah global error boundary di frontend |
| P2 | Hapus / isolasi `lib/replit-auth-web` |

### P3 — Nice to Have (Kualitas & maintainability)

| Priority | Issue |
|----------|-------|
| P3 | Tulis integration/e2e tests |
| P3 | Sync OpenAPI spec dengan implementasi aktual |
| P3 | Konsolidasi dua jalur DB (Drizzle + Supabase direct) |
| P3 | Hapus AnalyticsAI placeholder atau implement benar |
| P3 | Konsistensi bahasa di codebase |

---

## 14. Feature Map

| Feature | Status | Keterangan |
|---------|--------|------------|
| Authentication (Login/Register/Reset) | ✅ Complete | `Auth.tsx`, Supabase Auth |
| Two-Factor Authentication (2FA) | ✅ Complete | `Account2FA.tsx` |
| Package Catalog (Browse/Filter) | ✅ Complete | `Paket.tsx`, `PackageDetail.tsx` |
| Package Comparison | ✅ Complete | `Compare.tsx` |
| Booking Flow (Multi-step) | ✅ Complete | `Booking.tsx` |
| Admin: Package Management | ✅ Complete | `AdminPackages.tsx` |
| Admin: Booking Management | ✅ Complete | `AdminBookings.tsx` |
| Admin: User Management | ✅ Complete | `AdminUsers.tsx` |
| Admin: Dashboard & Analytics | ✅ Complete | `AdminDashboard.tsx` |
| Admin: System Health | ✅ Complete | `SystemHealth.tsx` |
| Admin: Role Management (RBAC) | ✅ Complete | `RoleManagement.tsx` |
| Admin: Gallery Management | ✅ Complete | `AdminGallery.tsx` |
| Admin: FAQ Management | ✅ Complete | via CMS |
| Admin: Blog/CMS | ✅ Complete | `AdminBlog.tsx` |
| Admin: Agent Management | ✅ Complete | `AdminAgents.tsx` |
| Admin: Branch Management | ✅ Complete | `AdminBranches.tsx` |
| Admin: CRM Leads | ✅ Complete | `AdminCRM.tsx` |
| Customer: Dashboard Overview | ✅ Complete | `Dashboard.tsx` |
| Customer: My Bookings | ✅ Complete | `MyBookings.tsx` |
| Customer: Profile | ✅ Complete | `Profile.tsx` |
| Customer: Wishlist | ✅ Complete | `Wishlist.tsx` |
| Notifications | ✅ Complete | Real-time via Supabase |
| Pilgrim Documents | ✅ Complete | `pilgrim-documents.ts` |
| Reviews | ✅ Complete | `reviews/` |
| FAQ (public) | ✅ Complete | `FAQ.tsx` |
| Blog/Articles (public) | ✅ Complete | `Blog.tsx` |
| Gallery (public) | ✅ Complete | `Gallery.tsx` |
| Payments (manual upload bukti) | ⚠️ Incomplete | Tidak ada payment gateway |
| Payment Gateway (Midtrans/Xendit) | ❌ Broken | Tidak terintegrasi |
| Refunds | ⚠️ Incomplete | UI ada, flow belum lengkap |
| Contracts | ⚠️ Incomplete | Permission check ada, CRUD belum |
| Accounting | ⚠️ Incomplete | Read-only, tidak ada write ops |
| Analytics AI | ❌ Unused | Komponen ada, tidak terhubung model |
| Agent Commissions (auto) | ✅ Complete | Via DB trigger |
| Agent Withdrawals | ⚠️ Incomplete | UI ada, approval flow belum |
| Site Settings (Theming) | ✅ Complete | `site_settings` table + CSS vars |
| Multi-language (i18n) | ✅ Complete | `i18n/` folder |
| Dark Mode | ✅ Complete | Tailwind dark mode |

---

## 15. Implementation Roadmap (Sprint Plan)

### Sprint 1 — Supabase Foundation
**Goal**: Supabase berjalan, schema sinkron, env vars benar

- [ ] Set semua env vars yang diperlukan (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Jalankan `supabase-deploy.sql` di Supabase project
- [ ] Apply `business_logic_triggers.sql` (setelah fix konflik Replit Auth)
- [ ] Apply `add_new_user_profile_trigger.sql`
- [ ] Verifikasi schema Drizzle == schema Supabase
- [ ] Pastikan `DATABASE_URL` mengarah ke Supabase PostgreSQL (atau Replit DB)
- [ ] Test koneksi DB dari API server

### Sprint 2 — Authentication
**Goal**: Login/register/logout berjalan end-to-end, role assignment benar

- [ ] Test full login flow: email + password → JWT → dashboard redirect
- [ ] Fix redirect loop untuk user tanpa `user_roles` row
- [ ] Pastikan admin route guard bekerja dengan benar
- [ ] Test 2FA flow
- [ ] Fix trigger Replit Auth vs Supabase Auth di `business_logic_triggers.sql`
- [ ] Verifikasi `auth.ts` middleware di backend tidak crash (no `createClient()` di Node)

### Sprint 3 — Dashboard
**Goal**: Admin dan Customer dashboard load tanpa error

- [ ] Verifikasi semua admin dashboard stats endpoints return 200 (bukan 500)
- [ ] **SECURITY FIX**: Tambah auth + ownership check di `/cms/chat-messages` (cms.ts:212)
- [ ] Tambah global error boundary di React frontend
- [ ] Test semua sidebar menu items — tidak ada dead links
- [ ] Verifikasi Supabase Realtime subscription untuk notifikasi
> ✅ Sudah ada (tidak perlu fix): CMS router mounted, `rest.ts` ALLOWED_TABLES whitelist, `pool.on("error")`, `AbortSignal.timeout()` di authMiddleware

### Sprint 4 — Booking
**Goal**: Booking flow end-to-end: pilih paket → isi data → konfirmasi

- [ ] Test full booking flow sebagai customer
- [ ] Verifikasi quota trigger berjalan
- [ ] Verifikasi agent commission trigger berjalan
- [ ] Test booking notification (Supabase Realtime)
- [ ] Admin: approve/reject booking

### Sprint 5 — Payment
**Goal**: Pembayaran bisa diproses (minimal manual, idealnya gateway)

- [ ] Lengkapi manual payment proof upload + admin verify flow
- [ ] Pilih dan integrasi payment gateway (Midtrans recommended untuk Indonesia)
- [ ] Test webhook dari payment gateway
- [ ] Auto-confirm booking saat payment success

### Sprint 6 — Notification
**Goal**: Notifikasi real-time berjalan untuk semua event penting

- [ ] Test Supabase Realtime subscription
- [ ] Verifikasi notifikasi trigger untuk booking, payment, dll
- [ ] Test push notification (jika ada)
- [ ] Admin: broadcast notification

### Sprint 7 — Optimization & Polish
**Goal**: Production-ready

- [ ] Hapus `lib/replit-auth-web` (legacy)
- [ ] Sync OpenAPI spec dengan implementasi
- [ ] Tulis integration tests untuk auth dan booking flow
- [ ] Security audit: hardening `rest.ts` proxy, rate limiting
- [ ] Performance: lazy loading, image optimization
- [ ] Deploy ke Vercel, verifikasi semua env vars production

---

*Dokumen ini hanya audit — tidak ada perubahan kode yang dilakukan.*
*Semua perubahan menunggu persetujuan dari pemilik project.*
