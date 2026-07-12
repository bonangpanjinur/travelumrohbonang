# MASTER_PROJECT_BLUEPRINT.md

> **Kitab utama repository Umroh App / UmrohPlus.**
> Konsolidasi dari `PROJECT_ANALYSIS.md`, `AUTH_ARCHITECTURE.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_MAP.md`, `docs/API_MAP.md`, `docs/AUTH_FLOW.md`, `docs/ENVIRONMENT.md`, `docs/FEATURE_STATUS.md`, `docs/BUG_TRACKER.md`, `docs/ROADMAP.md`, `docs/PRD.md`, dan `docs/repair-plan.md`.
> Dibuat: 2026-07-08
> Status: **Dokumentasi murni.** Tidak ada baris kode yang diubah, tidak ada refactor, tidak ada migration baru, tidak ada file yang dihapus untuk menghasilkan dokumen ini.
> Dokumen sumber (`PROJECT_ANALYSIS.md`, `AUTH_ARCHITECTURE.md`, `docs/*.md`) **tetap dipertahankan apa adanya** sebagai arsip audit mentah — dokumen ini adalah lapisan konsolidasi di atasnya, bukan pengganti.

---

## Daftar Isi

1. [Executive Summary](#1-executive-summary)
2. [Repository Overview](#2-repository-overview)
3. [Architecture](#3-architecture)
4. [Database](#4-database)
5. [Authentication](#5-authentication)
6. [API](#6-api)
7. [Modules](#7-modules)
8. [Environment Variables](#8-environment-variables)
9. [Deployment](#9-deployment)
10. [Business Flow](#10-business-flow)
11. [Technical Debt](#11-technical-debt)
12. [Implementation Roadmap](#12-implementation-roadmap)
13. [Coding Standards](#13-coding-standards)
14. [Definition of Done](#14-definition-of-done)

---

## 1. Executive Summary

### Apa tujuan project

**UmrohPlus (Umroh App)** adalah platform SaaS full-stack untuk travel agent perjalanan umroh di Indonesia. Platform ini mengelola seluruh siklus operasional sebuah biro travel umroh dalam satu sistem: pemasaran paket, katalog & perbandingan paket, pemesanan (booking) multi-step, pembayaran (manual + rencana gateway online), manajemen data jemaah & dokumen perjalanan, manajemen agen & komisi, CMS (blog/FAQ/gallery/halaman statis), CRM leads, hingga laporan keuangan dan monitoring sistem — semuanya di satu dashboard admin multi-role dan satu dashboard customer.

### Target bisnis

- Menjadi platform manajemen perjalanan umroh **paling lengkap dan terpercaya di Indonesia**, menggantikan proses manual berbasis spreadsheet/WhatsApp yang umum dipakai travel agent saat ini.
- Model operasional saat ini: **single-tenant per deployment** (satu instance = satu travel agent/brand), dengan rencana jangka panjang (2027, di luar scope stabilisasi Fase 1) menuju **multi-tenant white-label SaaS**.
- Proposisi nilai: satu platform terpadu untuk travel agent (pemasaran + operasional + keuangan), pengalaman booking yang transparan untuk jemaah, dan sistem komisi yang terukur untuk agen pemasaran.

### Target pengguna

| Persona | Peran | Kebutuhan utama |
|---|---|---|
| **Jemaah** (calon peserta umroh, umumnya 45–65 tahun) | Customer — role `buyer` | Info paket jelas, proses daftar mudah, status booking bisa dipantau, transparansi harga/dokumen |
| **Staff Admin Travel** | Operasional harian — role `staff`/`branch_manager` | Input data cepat, verifikasi dokumen & pembayaran, laporan otomatis |
| **Agen Pemasaran Freelance** | Penjual dengan komisi — role `agent` | Link referral, pantau komisi real-time, materi promosi |
| **Pemilik/Direktur Travel Agent** | Pengambil keputusan — role `admin`/`super_admin` | Laporan keuangan terpusat, performa agen, kontrol penuh sistem & role |

Role hierarchy sistem: `super_admin > admin > branch_manager > staff > agent > buyer` (detail di [Bagian 5](#5-authentication)).

### Target deployment

| Environment | Peran | Catatan |
|---|---|---|
| **Replit** | Development — frontend (Vite, port 5000/klien workflow), API server (Express, port 8080), sandbox mockup | `DATABASE_URL` disediakan otomatis oleh Replit-managed PostgreSQL |
| **Supabase** | Identity provider (Auth) + PostgreSQL cloud (opsional sebagai DB produksi) + Storage + Realtime | Satu-satunya sumber JWT/session; RLS aktif untuk akses langsung dari frontend |
| **Vercel** | Production — frontend statis + API sebagai serverless function, satu domain (same-origin, tanpa CORS) | `DATABASE_URL` tidak tersedia otomatis di Vercel — backend fallback total ke Supabase HTTP REST API |

**Status saat ini (dari audit, lihat detail di [Bagian 12](#12-implementation-roadmap) dan [11](#11-technical-debt)):** fondasi teknis sudah solid dan ~73% fitur dinyatakan "Complete" secara fungsional, namun project **belum stabil untuk production** — ada blocker P0 (konfigurasi env, konflik trigger Replit Auth vs Supabase Auth, satu celah keamanan kritis) yang harus diselesaikan sebelum lanjut ke penambahan fitur baru. Dokumen ini adalah blueprint untuk fase stabilisasi tersebut.

---

## 2. Repository Overview

### Struktur folder (pnpm workspaces monorepo)

```
umroh-app/                          ← root
├── artifacts/
│   ├── umroh-app/                  ← Frontend (React 19 + Vite 7)
│   ├── api-server/                 ← Backend (Express 5, Node.js 20)
│   └── mockup-sandbox/             ← Vite sandbox untuk prototyping UI (Canvas)
│
├── lib/                            ← Package internal yang dishare via pnpm workspace
│   ├── db/                         ← Drizzle ORM — source of truth schema
│   ├── api-spec/                   ← OpenAPI YAML spec (sumber kebenaran kontrak API)
│   ├── api-zod/                    ← Zod validation schemas (generated via Orval)
│   ├── api-client-react/           ← React Query hooks (generated via Orval)
│   └── replit-auth-web/            ← ⚠️ LEGACY — Replit Auth, tidak dipakai flow aktif
│
├── api/
│   └── index.ts                    ← Vercel serverless entry point (wrapper untuk api-server)
│
├── scripts/
│   ├── migrations/                 ← SQL migration files (trigger, RLS, schema manual)
│   ├── seed.ts / seed.sql          ← Dev seed data
│   ├── verify-deploy-env.mjs       ← Pre-deploy env checker
│   └── scripts/push-to-supabase.mjs ← Script push schema ke Supabase
│
├── docs/                           ← Dokumen audit granular (arsip, dipertahankan)
│   ├── ARCHITECTURE.md, DATABASE_MAP.md, API_MAP.md, AUTH_FLOW.md
│   ├── ENVIRONMENT.md, FEATURE_STATUS.md, BUG_TRACKER.md, ROADMAP.md
│   ├── PRD.md, repair-plan.md
│
├── attached_assets/                ← File yang diupload user selama sesi kerja
├── supabase-schema.sql             ← Schema Drizzle-generated (source of truth skema)
├── supabase-seed.sql / -prod.sql   ← Seed data
├── supabase-deploy.sql             ← Combined deploy script
├── PROJECT_ANALYSIS.md             ← Audit awal (arsip)
├── AUTH_ARCHITECTURE.md            ← Blueprint auth (arsip, lihat Bagian 5)
├── replit.md                       ← Overview project + preferensi user
├── pnpm-workspace.yaml
├── vercel.json
└── tsconfig.json
```

### Frontend — `artifacts/umroh-app/`

React 19 + Vite 7 + Tailwind CSS 4 + shadcn/ui, terorganisir **feature-sliced**:

```
src/
├── features/            ← domain modules: admin, agent, auth, booking, cms,
│                            dashboard, jamaah, paket, tenant, wishlist
├── shared/
│   ├── components/      ← common, layout (PublicLayout/DashboardLayout), ui (shadcn primitives)
│   ├── hooks/           ← useAuth, useTenant, usePermission, dll.
│   ├── i18n/            ← terjemahan id/en
│   ├── integrations/supabase/  ← auth-client.ts + client.ts (dua Supabase client terpisah)
│   └── lib/             ← apiClient.ts (apiFetch), utils.ts
└── pages/                ← route entry points
```

### Backend — `artifacts/api-server/`

Express 5 di Node.js 20:

```
src/
├── routes/
│   ├── admin/            ← 30+ file route /admin/*  (agents, bookings, branches, chats,
│   │                        content, costs, crm, departures, documents, gallery,
│   │                        integrations, logs, loyalty, masterdata, packages,
│   │                        payments, pilgrims, redirects, refunds, reviews, seo,
│   │                        settings, systemHealth, tenant, testimonials, users, dst.)
│   ├── auth.ts, bookings.ts, cms.ts, faqs.ts, health.ts, logs.ts, misc.ts,
│   │   notifications.ts, packages.ts, payments.ts, pilgrim-documents.ts,
│   │   profile.ts, rest.ts (Supabase REST proxy), storage.ts (Supabase Storage proxy),
│   │   wishlists.ts
│   └── index.ts           ← router aggregator utama
├── middlewares/
│   ├── authMiddleware.ts  ← JWT verifier (fetch ke Supabase, bukan SDK)
│   ├── auth.ts             ← requireAuth sederhana
│   ├── requireAdmin.ts     ← requireAdmin/requireStaff/requireOperational/requireSuperAdmin
│   ├── rateLimiter.ts, validate.ts (Zod)
├── lib/
│   ├── auth.ts, supabaseEnv.ts (env resolver + fallback chain), adminAllowlist.ts, logger.ts
└── index.ts                ← Express app entry, PORT config
```

### Shared — `lib/`

- `lib/db` — Drizzle ORM, source of truth skema database, termasuk `pool` dengan `pool.on("error")` handler.
- `lib/api-spec` — OpenAPI YAML, kontrak API resmi.
- `lib/api-zod`, `lib/api-client-react` — hasil generate Orval dari OpenAPI spec (Zod schema + React Query hooks).
- `lib/replit-auth-web` — **legacy**, tidak dipakai flow auth aktif (lihat [Bagian 5](#5-authentication) dan [Bagian 11](#11-technical-debt)).

### Scripts

- `scripts/migrations/*.sql` — trigger, RLS policy, migration inkremental.
- `scripts/seed.ts`/`seed.sql`, `supabase-seed*.sql` — data awal.
- `scripts/verify-deploy-env.mjs` — validasi env vars sebelum deploy Vercel.
- `scripts/push-to-supabase.mjs` — push schema ke Supabase project.

### Assets

- `attached_assets/` — file yang diupload pengguna selama sesi kerja dengan agent (screenshot, teks instruksi, dsb.) — bukan bagian dari source aplikasi.

---

## 3. Architecture

### Diagram lengkap: Frontend → API → Middleware → Supabase → Storage → Database

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (SPA)                                  │
│  artifacts/umroh-app — React 19 + Vite 7 + Tailwind + shadcn/ui             │
│                                                                              │
│  ┌─────────────────┐        ┌──────────────────┐       ┌────────────────┐  │
│  │ auth-client.ts   │──────▶│ AuthProvider       │──────▶│ AuthRoute /    │  │
│  │ (Supabase, persist│       │ (useAuth context) │       │ AdminRoute     │  │
│  │  session)         │       └─────────┬────────┘       │ (route guards) │  │
│  └────────┬─────────┘                   │ user/role              └───────┬────────┘  │
│           │ token                        ▼                                │ redirect │
│           ▼                   ┌──────────────────┐                        ▼          │
│  ┌─────────────────┐        │ apiFetch()          │                                    │
│  │ client.ts         │        │ (Bearer injected)  │                                    │
│  │ (data, RLS-bound)  │        └─────────┬────────┘                                    │
└───────────┼──────────────────────────────┼──────────────────────────────────────────────┘
            │ PostgREST (RLS enforced)      │ REST (Express)
            ▼                                ▼
┌────────────────────┐        ┌─────────────────────────────────────────┐
│ Supabase PostgREST   │        │           API — artifacts/api-server     │
│ (Storage & sebagian   │        │           Express 5 / Node.js 20         │
│  data langsung dari   │        │                                          │
│  frontend, auth.uid() │        │  ── MIDDLEWARE ──                        │
│  based RLS)           │        │  authMiddleware.ts  → verifikasi JWT     │
└─────────┬─────────────┘        │       (fetch mentah ke Supabase,         │
          │                      │        BUKAN createClient() SDK)         │
          ▼                      │  requireAuth / requireOperational /      │
┌────────────────────┐        │  requireStaff / requireAdmin /           │
│  Supabase Storage    │        │  requireSuperAdmin  → role gate          │
│  (proxied via         │        │  rateLimiter, validate (Zod)             │
│  storage.ts)          │        │                                          │
└─────────┬─────────────┘        │  ── ROUTES ──                            │
          │                      │  public / auth-required / admin-only     │
          ▼                      │  (lihat Bagian 6 — API)                  │
┌─────────────────────────────────────────┴──────────────────────────────────┐
│                     SUPABASE (Cloud) — identity + data plane                 │
│  ┌────────────────────┐   ┌──────────────────────┐   ┌───────────────────┐ │
│  │ Supabase Auth        │   │ Supabase Realtime      │   │ Supabase Storage   │ │
│  │ (JWT issue/verify)   │   │ (live notification ch) │   │ (file jemaah, dsb.)│ │
│  └──────────┬──────────┘   └───────────┬───────────┘   └─────────┬─────────┘ │
│             └─────────────────────────┬┴───────────────────────┘            │
└───────────────────────────────────────┼──────────────────────────────────────┘
                                         ▼
                              ┌─────────────────────────┐
                              │      PostgreSQL           │
                              │ (Replit-managed di dev;   │
                              │  Supabase Postgres di prod│
                              │  jika DATABASE_URL diarah  │
                              │  ke sana)                 │
                              │  — Drizzle ORM (service    │
                              │    role, bypass RLS) DAN   │
                              │    PostgREST (RLS aktif)   │
                              │    mengakses DB yang sama  │
                              └───────────────────────────┘
```

### Poin arsitektur kunci

1. **Dua jalur akses database yang disengaja, dua model keamanan berbeda:**
   | Jalur | Dipakai di | RLS | Service role |
   |---|---|---|---|
   | Drizzle ORM → Express → PostgreSQL | Mayoritas admin routes | ❌ bypass | ✅ ya |
   | `supabase.from()` → PostgREST | Beberapa halaman frontend (wishlists, dashboard counts, dll.) | ✅ aktif | ❌ tidak |

   Karena Drizzle via service role melewati RLS, **access control untuk admin routes sepenuhnya ditentukan oleh kode Express** (middleware role), bukan RLS Supabase. Ini bukan bug, tapi harus dipahami sebagai keputusan arsitektur — didokumentasikan sebagai Technical Debt TD1 karena tidak ada abstraksi eksplisit yang mencegah developer baru salah pilih jalur untuk data sensitif.

2. **Backend tidak pernah memanggil Supabase SDK (`createClient()`).** Semua interaksi dari Node.js 20 ke Supabase Auth/REST memakai `fetch()` mentah — constraint permanen karena SDK Supabase butuh native WebSocket yang tidak tersedia di Node 20 tanpa polyfill (lihat memory: `supabase-backend-auth.md`).

3. **Vercel deployment**: `vercel.json` me-rewrite semua request ke `api/index.ts` (serverless function yang mengimpor `artifacts/api-server/src/index.ts`). Saat di Vercel, `DATABASE_URL` tidak tersedia — `rest.ts` dan `auth.ts`/`authMiddleware.ts` fallback penuh ke Supabase HTTP REST API dengan service role key (lihat memory: `vercel-supabase-http-proxy.md`).

4. **OpenAPI-driven codegen**: `lib/api-spec/openapi.yaml` adalah kontrak sumber, di-generate via Orval menjadi `lib/api-zod` (validasi) dan `lib/api-client-react` (React Query hooks). **Risiko**: spec bisa drift dari implementasi Express aktual (dicatat sebagai TD2 — termasuk endpoint OIDC basi yang masih ada di spec, lihat Bagian 5).

### Stack Teknologi

| Layer | Teknologi |
|---|---|
| Frontend Framework | React 19 |
| Frontend Build | Vite 7 |
| CSS | Tailwind CSS 4 |
| Routing | React Router DOM |
| Server State | TanStack Query v5 |
| UI Primitives | Radix UI + shadcn/ui |
| Backend Framework | Express 5 |
| Runtime | Node.js 20 |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage |
| Real-time | Supabase Realtime |
| API Validation | Zod |
| Code Generation | Orval (OpenAPI → hooks) |
| Package Manager | pnpm workspaces |
| Deploy (prod) | Vercel (serverless) |
| Deploy (dev) | Replit |

---

## 4. Database

### Daftar seluruh tabel (dikelompokkan per kategori)

| Kategori | Tabel |
|---|---|
| Auth & Users | `profiles`, `user_roles` |
| Paket | `packages`, `package_categories`, `package_departures` |
| Booking | `bookings`, `booking_pilgrims`, `pilgrim_documents` |
| Pembayaran | `payments` |
| Agen | `agents`, `agent_commissions`, `agent_withdrawals` |
| Master Data | `hotels`, `airlines`, `airports`, `muthawifs`, `branches` |
| CMS | `blog_posts`, `pages`, `gallery`, `faqs`, `cms_navigation` |
| Config | `site_settings` |
| Social | `wishlists`, `reviews`, `notifications` |
| System | `logs` |
| Legacy (deprecated, tidak dipakai flow aktif) | `users`, `sessions` (remnant Replit Auth, di `lib/db/src/schema/auth.ts`) |

### Skema kunci (ringkas — detail lengkap kolom per tabel ada di `docs/DATABASE_MAP.md`)

- **`profiles`**: `id` (PK, mirror `auth.users.id`), `fullName`/`name`, `email`, `phone`, `avatarUrl`, `totpEnabled`/`totpSecret`/`totpBackupCodes` (2FA), `createdAt`. ⚠️ **Schema drift terdeteksi**: `supabase-schema.sql` (Drizzle) memakai `VARCHAR`/`TEXT` untuk id, sedangkan `scripts/migrations/supabase_schema.sql` (manual) memakai `UUID` native — krusial karena kolom ini menyimpan `auth.users.id` Supabase yang secara native UUID.
- **`user_roles`**: `id`, `userId` (FK ke `profiles.id`), `role` (text, bukan Postgres enum formal — nilai valid: `super_admin | admin | branch_manager | staff | agent | buyer`), `isActive`, `assignedBy`, `createdAt`.
- **`packages`** → **`package_departures`** (1:N) → refer ke `hotels`/`airlines`. **`package_categories`** self-referential untuk sub-kategori.
- **`bookings`** — hub utama: FK ke `profiles` (user), `packages`, `package_departures`, `agents` (nullable). Relasi 1:N ke `payments`, `booking_pilgrims`, `pilgrim_documents`; relasi ke `agent_commissions`.
- **`agents`** (1:1 dengan `profiles`) → `agent_commissions`, `agent_withdrawals`.
- CMS: `blog_posts`, `pages`, `gallery`, `faqs`, `cms_navigation` (self-referential, kolom `roles[]` untuk filter visibility per role), `site_settings` (key-value store untuk theming).
- Social/system: `wishlists` (unique per user+package), `reviews` (butuh `isApproved`), `notifications`, `logs` (audit trail request/error/audit).

### Relasi utama (ERD ringkas)

```
[profiles] 1──N [user_roles]
[profiles] 1──N [bookings], [notifications], [wishlists], [reviews]
[profiles] 1──1 [agents]

[package_categories] 1──N [packages]           (+ self-ref parent)
[packages]           1──N [package_departures], [wishlists], [reviews]
[hotels]/[airlines]  1──N [package_departures]

[bookings] 1──N [payments], [booking_pilgrims], [pilgrim_documents]
[bookings] 1──1 [agent_commissions]
[booking_pilgrims] 1──N [pilgrim_documents]

[agents] 1──N [agent_commissions], [agent_withdrawals]

[package_departures] 1──N [gallery]
[blog_posts] N──1 [profiles] (author)
[cms_navigation] self-ref parent
```

ERD lengkap dengan semua kolom: lihat `docs/DATABASE_MAP.md`.

### Migration — daftar file SQL

| File | Kategori | Status sinkronisasi |
|---|---|---|
| `supabase-schema.sql` | Schema, generated dari Drizzle | ✅ Source of truth (nominal) |
| `supabase-deploy.sql` | Schema + Config gabungan | ✅ |
| `supabase-seed.sql` / `supabase-seed-prod.sql` | Seed data | ✅ |
| `scripts/seed.sql` | Dev seed | ✅ |
| `scripts/migrations/supabase_schema.sql` | Schema manual + RLS policy | ⚠️ **Berpotensi drift** dari Drizzle — lihat schema drift `profiles.id`/`user_roles.user_id` di atas |
| `scripts/migrations/business_logic_triggers.sql` | Trigger + function bisnis | ⚠️ **Berisi trigger konflik Replit Auth vs Supabase Auth** — lihat di bawah |
| `scripts/migrations/add_new_user_profile_trigger.sql` | Trigger `on_auth_user_created` | ⚠️ Khusus Supabase (butuh schema `auth`), gagal di Postgres lokal murni |
| `scripts/migrations/add_show_extra_hotels_to_package_categories.sql` | Migration kolom + backfill | ✅ |

### Trigger (Business Logic)

| Trigger | Tabel | Event | Fungsi |
|---|---|---|---|
| `check_departure_quota` | `bookings` | BEFORE INSERT | Hard lock quota via `FOR UPDATE` — cegah overbooking |
| `update_departure_booked_count` | `bookings` | AFTER INSERT/UPDATE | Update counter `bookedCount` di `package_departures` |
| `auto_confirm_booking` | `payments` | AFTER UPDATE | Auto-confirm booking saat `payment.status = 'verified'` |
| `calculate_agent_commission` | `bookings` | AFTER INSERT | Insert `agent_commissions` jika booking via agen |
| `send_booking_notification` | `bookings` | AFTER INSERT/UPDATE | Insert ke `notifications` |
| `create_user_profile` (`on_auth_user_created`) | `auth.users` (Supabase-only) | AFTER INSERT | Auto-create `profiles` + `user_roles` (`buyer`) |
| `update_updated_at` | Banyak tabel | BEFORE UPDATE | Auto-update `updatedAt` |
| `log_booking_changes` | `bookings` | AFTER INSERT/UPDATE | Audit trail ke `logs` |
| `trg_handle_new_local_user` ⚠️ | `users` (tabel remnant Replit Auth) | AFTER INSERT | Versi lokal dari `create_user_profile` untuk dev tanpa Supabase — **konflik konseptual dengan poin di atas, lihat catatan** |

> ⚠️ **Konflik trigger Replit Auth vs Supabase Auth**: `business_logic_triggers.sql` berisi `trg_handle_new_local_user` yang memantau tabel `users` (remnant Replit Auth, ditandai `@deprecated` di `lib/db/src/schema/auth.ts`), sementara sistem produksi memakai `auth.users` milik Supabase via trigger terpisah (`add_new_user_profile_trigger.sql`). Kedua trigger melayani tujuan yang sama (auto-create profile) untuk dua sumber user yang berbeda — ini bekerja untuk mendukung dev lokal tanpa Supabase, TAPI berisiko membingungkan dan sudah tercatat sebagai bug P0 (`BUG_TRACKER.md` B4). Lihat [Bagian 5](#5-authentication) untuk keputusan arsitektur target.

### Policy / RLS

- `scripts/migrations/supabase_schema.sql` mengaktifkan RLS pada 70 tabel (`alter table ... enable row level security`), dengan catatan eksplisit di file "Enable RLS with permissive policies (tighten later for production)" — artinya kebijakan RLS saat ini **longgar**, bukan hardening penuh, dan perlu direview sebelum production untuk tabel yang diakses langsung dari frontend (`supabase.from()`).
- Tabel yang diakses via Drizzle (service role) **bypass RLS sepenuhnya** — access control untuk jalur ini murni di kode Express (lihat [Bagian 3](#3-architecture)).

### Function & RPC

- `rest.ts` (backend) menyediakan proxy generik `POST /api/rest/rpc/:func` ke PostgREST RPC — dibatasi oleh whitelist `ALLOWED_TABLES` untuk endpoint tabel CRUD (`/api/rest/:table`), memberikan defense-in-depth meski RLS aktif.
- Tidak ditemukan Postgres function custom di luar yang dipakai trigger di atas (tidak ada RPC bisnis kompleks tersendiri di luar trigger).

---

## 5. Authentication

> Bagian ini adalah ringkasan operasional dari `AUTH_ARCHITECTURE.md` (dokumen sumber lengkap, termasuk checklist migrasi 20+ item, tetap menjadi rujukan detail). Lihat juga `docs/AUTH_FLOW.md` untuk versi audit granular sebelumnya.

### Prinsip

**Supabase Auth adalah satu-satunya identity provider yang sah.** Backend tidak pernah memanggil Supabase SDK (`createClient()`) — selalu `fetch()` mentah (constraint permanen, Node 20 tidak punya native WebSocket). Backend tidak menyimpan sesi sendiri — sepenuhnya stateless, setiap request diverifikasi ulang ke Supabase (dioptimalkan dengan cache token in-memory 60 detik). Role adalah satu sumber kebenaran, dibaca lewat satu fungsi resolver (`getUserRole()`), bukan dipanggil langsung dari dua tabel berbeda oleh kode lain.

### Flow Login

```
User input email+password
      ▼
supabaseAuth.signInWithPassword()  (auth-client.ts, PKCE flow, persist ke localStorage)
      ▼
Supabase Auth Server → { access_token (JWT), refresh_token, user }
      ▼
AuthProvider (useAuth.tsx): onAuthStateChange → GET /api/auth/user (Bearer <jwt>)
      ▼
Backend authMiddleware.ts: fetch /auth/v1/user (verifikasi) → getUserRole(userId) → req.user
      ▼
AuthContext.setUser({..., role})  → isAdmin = role !== "user" && role !== "buyer"
      ▼
Redirect: role ∈ {super_admin,admin,branch_manager,staff} → /admin (+ 2FA gate jika aktif)
          role ∈ {agent,buyer} → /dashboard
```

Fallback penting: jika `/api/auth/user` unreachable/5xx (bukan 401/403), frontend decode klaim JWT secara lokal (`buildUserFromToken`) sebagai user sementara — mencegah redirect loop saat backend down, TIDAK PERNAH dipakai untuk bypass otorisasi (backend tetap re-verify di setiap API call berikutnya).

### Flow Logout

```
signOut() → supabaseAuth.auth.signOut() → hapus token dari localStorage
          → trigger onAuthStateChange(SIGNED_OUT) → setUser(null)
          → window.location.href = "/" (full reload)
```
Catatan: flag verifikasi 2FA (`sessionStorage`) **tidak otomatis dibersihkan** saat signOut — item checklist migrasi.

### JWT Lifecycle

- Diterbitkan oleh Supabase Auth server saat login/refresh; disimpan di `localStorage` (key `sb-auth-session`), **tidak pernah** di cookie atau server-side store.
- Dikirim via header `Authorization: Bearer <token>` pada setiap request ke API.
- **Diverifikasi via network call** (`GET {SUPABASE_URL}/auth/v1/user`), bukan verifikasi signature lokal — pilihan desain sah untuk menghindari penyimpanan/rotasi signing key di backend, dioptimalkan dengan cache 60 detik.
- Refresh otomatis oleh Supabase JS SDK (`autoRefreshToken: true`) selama sesi berjalan.

### Role & Permission

Hierarchy (satu definisi target, saat ini terduplikasi di ≥3 file — lihat Technical Debt):

```
super_admin (0) > admin (1) > branch_manager (2) > staff (3) > agent (4) > buyer (5) > user (6)
```

| Middleware backend | Role diizinkan | Dipakai untuk |
|---|---|---|
| `requireAuth` | Semua yang terautentikasi | Booking, profile, wishlist |
| `requireOperational` | super_admin…agent | Packages read, booking milik sendiri |
| `requireStaff` | super_admin…staff | Manajemen jemaah, dokumen |
| `requireAdmin` | super_admin, admin | Gate default admin router |
| `requireSuperAdmin` | super_admin saja | Role management, integrasi pihak ketiga |

**Resolusi role backend** (`getUserRole()` di `authMiddleware.ts`): menjalankan `getLocalRole()` (Drizzle/Postgres langsung, untuk dev/Replit) dan `getSupabaseRole()` (Supabase REST, untuk Vercel serverless) secara paralel, lalu memilih role **paling restriktif** — memastikan demosi role di Supabase langsung berlaku meski cache lokal stale. Aturan wajib: kode lain tidak boleh memanggil `getLocalRole`/`getSupabaseRole` langsung.

**Inkonsistensi yang tercatat**: `isAdmin` di frontend (`role !== "user" && role !== "buyer"`) menganggap `agent` sebagai admin, sementara backend `requireAdmin` TIDAK mengizinkan `agent`. Ini harus diselaraskan (checklist migrasi di `AUTH_ARCHITECTURE.md` §12.2).

### Middleware (Backend)

| File | Fungsi |
|---|---|
| `middlewares/authMiddleware.ts` | Extract Bearer token → verifikasi ke Supabase → resolve role → set `req.user`. Cache token in-memory TTL 60 detik. |
| `middlewares/auth.ts` (`requireAuth`) | Cek `req.isAuthenticated()` |
| `middlewares/requireAdmin.ts` | 4 gate berbasis role Set (lihat tabel di atas) |
| `lib/adminAllowlist.ts` (`isAdminEmail`) | Override role → `super_admin` untuk email di `ADMIN_EMAILS` — mekanisme bootstrap resmi, bukan backdoor tersembunyi |

### Frontend Auth

| File | Peran |
|---|---|
| `shared/integrations/supabase/auth-client.ts` | Satu-satunya client yang memanggil `supabase.auth.*` (persist session, PKCE) |
| `shared/integrations/supabase/client.ts` | Client data-only (REST/Storage), stateless, token disuntik per-request dari `auth-client` |
| `shared/hooks/useAuth.tsx` | `AuthProvider`/`useAuth` — satu-satunya context state auth |
| `shared/lib/apiClient.ts` (`apiFetch`) | Wrapper fetch wajib untuk semua panggilan API — auto-attach Bearer token |
| `shared/components/common/AuthRoute.tsx` | Guard halaman non-admin yang butuh login |
| `features/admin/AdminRoute.tsx` | Guard admin + gate 2FA (TOTP via `otpauth`, backup codes, state verifikasi di `sessionStorage`) |

### API Authentication Contract

```
Endpoint publik (tanpa Authorization):
  /health, /healthz, /packages*, /faqs, /cms/* (kecuali chat-messages — lihat catatan keamanan),
  /currencies, /tenant-site, /logs/*

Endpoint wajib auth (requireAuth minimum):
  /bookings/*, /profile/:id, /notifications/*, /wishlists/*, /pilgrim-documents/*

Endpoint wajib role (requireOperational/Staff/Admin/SuperAdmin):
  /admin/*  (detail per-route di Bagian 6)
```

### ⚠️ Catatan Keamanan Kritis (bukan murni auth, tapi terkait langsung)

`GET /cms/chat-messages` (`routes/cms.ts:212`) **tidak menerapkan `requireAuth` atau ownership check** — siapa pun yang mengetahui `booking_id` bisa membaca pesan chat booking milik user lain. Kode bahkan mengandung komentar yang mengakui ketidakpastian ini. **Prioritas P0 🔒 di semua dokumen sumber** (`PROJECT_ANALYSIS.md`, `BUG_TRACKER.md` B6, `API_MAP.md`) — harus diperbaiki sebelum production, di luar urutan "jangan ubah kode" pada fase dokumentasi ini.

### Diagram Lengkap

Lihat `AUTH_ARCHITECTURE.md` §11 untuk diagram ASCII penuh (Browser → auth-client/client.ts → AuthProvider/apiFetch → PostgREST/Express → authMiddleware/role gates → Supabase Auth Server → PostgreSQL).

---

## 6. API

Base URL: dev `http://localhost:8080` (via workflow `API Server`), prod `https://<domain>.vercel.app` (same-origin dengan frontend).

Semua endpoint auth-required mengirim header `Authorization: Bearer <supabase_access_token>`.

### Endpoint aktif — Public

| Method | URL | Kategori |
|---|---|---|
| GET | `/health`, `/healthz` | Health check |
| GET | `/packages`, `/packages/filter-options`, `/packages/:slug`, `/packages/reviews/:packageId` | Katalog paket |
| GET | `/faqs` | FAQ |
| GET | `/cms/site-settings`, `/cms/navigation`, `/cms/blog`, `/cms/blog/:slug`, `/cms/gallery`, `/cms/services` | CMS publik |
| GET | `/currencies`, `/tenant-site` | Misc |
| POST | `/logs/request`, `/logs/error`, `/logs/audit` | Logging (rate limited) |

### Endpoint aktif — Auth Required

| Method | URL |
|---|---|
| GET | `/auth/user`, `/logout` |
| GET/POST | `/bookings/my`, `/bookings`, `/bookings/:id`, `/bookings/:id/status` (PATCH), `/bookings/:id/rooms`, `/bookings/:id/pilgrims` |
| GET/PATCH | `/profile/:id` |
| GET/PATCH | `/notifications`, `/notifications/:id/read`, `/notifications/read-all` |
| GET/POST/PATCH | `/pilgrim-documents`, `/pilgrim-documents/:id` |
| GET/POST | `/wishlists`, `/wishlists/toggle` |

### Endpoint aktif — Admin (role-gated, lihat Bagian 5 untuk gate per grup)

Users, Agents (+ commissions), Bookings, Packages/Departures/Masterdata, Settings/SystemHealth/Tenant, CRM leads, Content (blog/gallery/pages), Branches, Reviews, Pilgrims, Documents, Chats, Loyalty, SEO, Redirects, Testimonials, Coupons, Integrations (super admin), Logs — semua `✅ Working` per audit terakhir.

### Endpoint yang belum selesai / partial

| Endpoint | Status | Catatan |
|---|---|---|
| `/admin/payments/*`, `PATCH /admin/payments/:id/verify` | ⚠️ Partial | Manual verify ada, belum ada payment gateway |
| `/admin/refunds/*` | ⚠️ Partial | UI ada, backend flow belum lengkap |
| `/admin/costs/*` | ⚠️ Partial | Write operations belum diverifikasi penuh |
| `/admin/contracts/*` | ⚠️ Partial | Permission check ada, CRUD belum lengkap |

### Endpoint dengan masalah keamanan (bukan "deprecated", tapi harus ditandai eksplisit)

| Endpoint | Status |
|---|---|
| `GET /cms/chat-messages?booking_id=` | 🔴 **Security bug** — tidak ada auth/ownership check (lihat Bagian 5) |

### Endpoint deprecated / tidak didukung logic aktif

- Endpoint OIDC (`/auth/login`, `/auth/callback`, dst.) masih terdefinisi di `lib/api-spec/openapi.yaml` dan generated clients (`lib/api-zod`, `lib/api-client-react`), **tapi tidak ada implementasi aktif** di `api-server` — sisa dari openapi spec yang belum dibersihkan setelah migrasi ke Supabase Auth penuh. Tidak boleh dipanggil dari kode baru.

### Proxy / Infrastructure

| Method | URL | Keterangan |
|---|---|---|
| GET/POST/PATCH/DELETE | `/api/rest/:table` | Supabase REST proxy, whitelist `ALLOWED_TABLES` |
| POST | `/api/rest/rpc/:func` | Supabase RPC proxy |
| GET | `/api/storage/object/public/:bucket/*name` | Public storage |
| POST/DELETE | `/api/storage/object/:bucket/*name` | Upload/hapus storage (Bearer) |

### Error Response Convention

| Status | Situasi |
|---|---|
| 400 | Request tidak valid |
| 401 | Token tidak ada/expired/invalid |
| 403 | Token valid, role tidak cukup |
| 404 | Resource tidak ditemukan |
| 429 | Rate limit terlampaui |
| 500 | Server error |

---

## 7. Modules

### Packages (Katalog Paket)
Domain paket umroh: kategori (self-referential), paket, dan keberangkatan (`package_departures`) dengan kuota, hotel Mekkah/Madinah, maskapai. **Hubungan:** sumber utama untuk Booking (pilih paket → pilih keberangkatan) dan target Wishlist/Reviews.

### Bookings (Pemesanan)
Hub transaksional utama. **Hubungan:** menghubungkan `profiles` (siapa memesan), `packages`/`package_departures` (apa yang dipesan), `agents` (siapa yang menjual, opsional), lalu memicu `payments`, `booking_pilgrims`, `pilgrim_documents`, `agent_commissions`, dan `notifications` via trigger. Status booking adalah state machine inti bisnis (`pending → confirmed/cancelled → completed`).

### Payments (Pembayaran)
Saat ini: upload bukti transfer manual + verifikasi admin, memicu trigger `auto_confirm_booking`. **Hubungan:** 1:N dari Booking; status `payments` menentukan status `paymentStatus` booking. **Gap:** belum ada payment gateway (Midtrans/Xendit) — pembayaran online dan webhook confirmation belum ada (lihat Bagian 11).

### Users (Profiles & Roles)
`profiles` + `user_roles`, terhubung ke Supabase `auth.users`. **Hubungan:** akar dari hampir semua modul lain (Booking, Agent, Reviews, Notifications, Wishlist semua FK ke `profiles`). Role menentukan akses ke seluruh modul Admin (lihat Bagian 5).

### Notifications
Dipicu trigger DB (`send_booking_notification`) untuk event booking/payment, dikirim real-time via Supabase Realtime channel. **Hubungan:** konsumen pasif dari perubahan state di Bookings/Payments.

### FAQ, Gallery, CMS (Blog/Pages)
Konten publik yang dikelola Admin — tidak terhubung ke transaksi, murni informasi. `cms_navigation` mengatur menu dinamis dengan filter per role (`roles[]`).

### Admin
Bukan modul domain tunggal, melainkan **panel kontrol lintas-modul** — setiap domain (Packages, Bookings, Payments, Users, CRM, dll.) punya sub-halaman admin sendiri dengan gate role masing-masing (lihat Bagian 5 & 6). Termasuk sub-modul operasional (CRM leads, Agent management, Branch management, Loyalty) dan konfigurasi (Site Settings/Theming, Integrations, Audit Logs).

### Customer (Dashboard)
Area self-service jemaah: overview, my bookings, profile, wishlist, notifikasi, upload dokumen. **Hubungan:** semua read/write terbatas ke data milik `req.user.id` sendiri (kecuali admin).

### Settings (Site Settings / Theming)
`site_settings` key-value store dikonsumsi frontend via `useActiveTemplate` untuk apply CSS variables real-time (dengan Supabase Realtime channel untuk live update saat admin ubah warna). **Hubungan:** cross-cutting, mempengaruhi tampilan seluruh frontend publik & dashboard.

### Agents & Commissions
`agents` (1:1 profiles) → `agent_commissions` (auto via trigger saat booking) dan `agent_withdrawals` (approval manual, masih incomplete). **Hubungan:** Booking dengan `agentId` terisi memicu komisi otomatis.

### Modul Incomplete/Broken lintas kategori
Payment Gateway, Refunds (flow), Contracts (CRUD), Analytics AI (tidak terhubung model), Agent Withdrawals (approval flow) — detail status di `docs/FEATURE_STATUS.md`, prioritas perbaikan di Bagian 11.

---

## 8. Environment Variables

### Frontend (`import.meta.env.VITE_*`)

| Variable | Wajib? | Keterangan |
|---|---|---|
| `VITE_SUPABASE_URL` | **Wajib** | URL project Supabase |
| `VITE_SUPABASE_ANON_KEY` | **Wajib** | Public anon key |
| `VITE_SUPABASE_PROJECT_ID` | Opsional | Dipakai script `scripts/push-to-supabase.mjs` |
| `VITE_API_URL` | Opsional | Kosong = same-origin (Vercel); isi untuk dev lokal (`http://localhost:8080`) jika API terpisah domain |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 🔴 Deprecated | Digantikan `VITE_SUPABASE_ANON_KEY` |

### Backend (`process.env.*`)

| Variable | Wajib? | Keterangan |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | **Wajib** | Akses penuh DB — **TIDAK BOLEH** prefix `VITE_` |
| `DATABASE_URL` | **Wajib** | Dikelola otomatis oleh Replit di dev; harus diisi manual (Supabase connection string) di Vercel |
| `SUPABASE_URL` | Opsional | Fallback ke `VITE_SUPABASE_URL` jika kosong |
| `SUPABASE_ANON_KEY` | Opsional | Fallback ke `VITE_SUPABASE_ANON_KEY` jika kosong |
| `NODE_ENV` | Opsional | `development`/`production` — toggle CORS, error stack, logging |
| `PORT` | Opsional | Default 8080, dev only |
| `ALLOWED_ORIGINS` | **Wajib di production** | Comma-separated origin untuk CORS |

### Scripts-only

| Variable | Keterangan |
|---|---|
| `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN` | Dipakai `scripts/push-to-supabase.mjs`, bukan runtime app |

### Tidak dipakai / perlu keputusan

| Variable | Status |
|---|---|
| `SESSION_SECRET` | Ada di Replit Secrets tapi **tidak dipakai di kode manapun** — perlu diputuskan: hapus atau dokumentasikan rencana pemakaian |
| `REPL_ID`, `ISSUER_URL` | Legacy Replit OIDC — masih direferensikan di `.env.example`/`verify-deploy-env.mjs` sebagai "tidak dipakai", kandidat pembersihan |

### Development vs Production

| Aspek | Replit (dev) | Vercel (prod) |
|---|---|---|
| `DATABASE_URL` | Auto dari Replit | Manual — Supabase connection string |
| `VITE_API_URL` | Bisa `http://localhost:8080` | Kosong (same-origin) |
| CORS | Permissive | Strict via `ALLOWED_ORIGINS` |
| Error stack traces | Ditampilkan | Disembunyikan |
| Sumber secrets | Replit Secrets | Vercel Environment Variables (harus di-set ulang manual, tidak otomatis dari Replit) |

Verifikasi sebelum deploy: `pnpm run verify:deploy-env` (menjalankan `scripts/verify-deploy-env.mjs`).

---

## 9. Deployment

### Local
Menjalankan `pnpm install` di root, lalu masing-masing package via workflow-nya sendiri (frontend Vite dev server, api-server Express dev, mockup-sandbox). Membutuhkan `.env` lokal (`cp .env.example .env`) minimal dengan `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### Replit
- Workflow terkonfigurasi: `API Server` (`PORT=8080`), `Start application`/`artifacts/umroh-app: web` (Vite, port 5000, host `0.0.0.0`), `artifacts/mockup-sandbox: Component Preview Server`.
- `DATABASE_URL` disediakan otomatis oleh Replit PostgreSQL — **dependency**: tanpa ini, backend fallback ke jalur Supabase HTTP REST untuk role resolution (jalur yang sama dipakai di Vercel), yang berarti perilaku dev bisa berbeda tergantung apakah `DATABASE_URL` valid.
- Secrets (`VITE_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`) di-set manual via Replit Secrets tab.
- **Dependency kritis**: tanpa `SUPABASE_SERVICE_ROLE_KEY`, seluruh `/admin/*` gagal auth (role resolution via Supabase REST tidak berfungsi).

### Supabase
- Menyediakan: Auth (JWT issuer, satu-satunya), PostgreSQL (opsional sebagai DB utama jika `DATABASE_URL` diarahkan ke sana), Storage, Realtime.
- Setup awal: jalankan `supabase-deploy.sql` (schema) di SQL editor, lalu trigger (`business_logic_triggers.sql` — **setelah dibersihkan dari konflik Replit Auth**, lihat Bagian 5), lalu `add_new_user_profile_trigger.sql` (khusus Supabase, butuh schema `auth`), lalu seed (`supabase-seed.sql`/`-prod.sql`).
- **Dependency**: Backend (auth resolution, RLS-bound frontend queries) dan Frontend (auth langsung) SAMA-SAMA bergantung penuh pada Supabase — ini adalah single point of failure yang disengaja sesuai prinsip "satu identity provider" (Bagian 5).

### Vercel
- `vercel.json` me-rewrite semua request ke `api/index.ts` (serverless function membungkus `api-server`).
- **Dependency kritis**: `DATABASE_URL` **tidak tersedia otomatis** — harus diisi manual dengan Supabase Postgres connection string (mode Transaction, port 6543 untuk serverless) di Vercel dashboard, atau backend akan berjalan penuh di jalur fallback Supabase HTTP REST.
- Semua env vars harus di-set ulang manual di Vercel dashboard (tidak ada sinkronisasi otomatis dari Replit Secrets).
- Verifikasi sebelum deploy: `node scripts/verify-deploy-env.mjs`.
- Frontend dan API di satu domain (same-origin) — `VITE_API_URL` dikosongkan, tidak perlu konfigurasi CORS cross-domain untuk trafik normal, tapi `ALLOWED_ORIGINS` tetap wajib diisi untuk domain produksi resmi.

### Production
- Definisi "siap production" ada di [Bagian 14](#14-definition-of-done).
- Belum ada CI/CD (GitHub Actions) — deploy manual via Vercel dashboard/CLI.
- Monitoring: `/health` endpoint mengecek konektivitas DB & Supabase; `SystemHealth.tsx` di admin dashboard menampilkan status ini secara visual.

### Dependency antar environment (ringkas)

```
Supabase (Auth+DB+Storage) ── wajib untuk SEMUA environment (dev, Replit, Vercel)
        │
        ├── Replit dev: DATABASE_URL → Replit Postgres (independen dari Supabase Postgres,
        │                 tapi tetap pakai Supabase untuk Auth) — role resolution punya jalur ganda
        │
        └── Vercel prod: DATABASE_URL → HARUS diarahkan ke Supabase Postgres (tidak ada Postgres
                          bawaan Vercel) — role resolution & rest.ts 100% via Supabase HTTP REST
```

---

## 10. Business Flow

### Booking
```
Customer browse /packages → pilih paket → pilih package_departure (cek kuota tersedia)
  → /booking (multi-step: pilih tipe kamar → input data jemaah per pilgrim → review)
  → POST /bookings → trigger check_departure_quota (FOR UPDATE lock, cegah overbooking)
  → trigger update_departure_booked_count → trigger calculate_agent_commission (jika via agent)
  → trigger send_booking_notification → booking status "pending"
  → Admin review → PATCH status → "confirmed" (setelah payment verified) / "cancelled"
```

### Checkout & Payment
```
Booking "pending" → customer upload bukti transfer (Payment.tsx) → payments.status "pending"
  → Admin verifikasi manual (AdminPayments.tsx) → payments.status "verified"
  → trigger auto_confirm_booking → bookings.status "confirmed", paymentStatus "paid"
  → trigger send_booking_notification → customer dapat notifikasi konfirmasi
```
**Gap saat ini**: tidak ada jalur otomatis (payment gateway + webhook) — 100% manual verify oleh admin. Lihat Bagian 11/12 untuk rencana integrasi Midtrans.

### Approval (Admin)
```
Admin dashboard → daftar booking/payment/refund/document pending
  → review data (jemaah, dokumen, bukti bayar)
  → approve → trigger status change + notification
  → reject → status "cancelled"/"rejected" + notification alasan
```
Berlaku sama untuk: Booking approval, Payment verification, Pilgrim document verification, (rencana) Refund approval, (rencana) Agent withdrawal approval.

### Notification
```
Event di Booking/Payment (trigger DB) → INSERT notifications
  → Supabase Realtime channel → frontend subscription → badge count update real-time
  → user buka notifikasi → PATCH /notifications/:id/read
```

### Travel Schedule (Departure)
```
Admin buat package_departure (tanggal berangkat/pulang, kuota, hotel, maskapai)
  → muncul di katalog publik sebagai opsi keberangkatan per paket
  → customer booking mengurangi kuota (trigger)
  → mendekati H-30/H-14 keberangkatan: reminder dokumen (direncanakan, belum aktif — lihat PRD)
  → post-keberangkatan: booking status "completed" (transisi manual/admin saat ini)
```

### Alur end-to-end ringkas (semua flow di atas dirantai)

```
Browse Paket → Pilih Departure → Booking (multi-step) → Upload Bukti Bayar
    → Admin Verifikasi Bayar → Auto-Confirm (trigger) → Notifikasi Customer
    → Upload & Verifikasi Dokumen Jemaah → (H-30/H-14 reminder — belum aktif)
    → Keberangkatan → Booking "completed"
```

---

## 11. Technical Debt

> Konsolidasi dari `PROJECT_ANALYSIS.md` §11–13, `BUG_TRACKER.md`, dan `AUTH_ARCHITECTURE.md` §1. Semua item **masih Open** (belum ada perbaikan kode yang dilakukan).

### P0 — Blocker (sistem tidak bisa jalan dengan benar / security breach)

| # | Masalah | Lokasi |
|---|---|---|
| P0-1 | 🔒 **SECURITY**: `GET /cms/chat-messages` tanpa auth/ownership check — data leak chat booking | `routes/cms.ts:212` |
| P0-2 | Env vars wajib (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) belum lengkap terkonfigurasi di semua environment | Replit/Vercel |
| P0-3 | Trigger konflik Replit Auth (`trg_handle_new_local_user` di tabel `users` remnant) vs Supabase Auth (`on_auth_user_created` di `auth.users`) | `scripts/migrations/business_logic_triggers.sql` |
| P0-4 | Schema drift `profiles.id`/`user_roles.user_id`: `VARCHAR`/`TEXT` (Drizzle) vs `UUID` (migration manual) | `supabase-schema.sql` vs `scripts/migrations/supabase_schema.sql` |
| P0-5 | Redirect loop: user ada di Supabase Auth tapi tidak ada row `user_roles` | `AdminRoute.tsx`, `AuthRoute.tsx` — root cause di trigger `create_user_profile` |
| P0-6 | `add_new_user_profile_trigger.sql` hanya jalan di Supabase cloud (butuh schema `auth`), gagal di Postgres lokal murni | `scripts/migrations/` |

### P1 — High (fitur utama tidak berfungsi penuh)

| # | Masalah | Lokasi |
|---|---|---|
| P1-1 | Admin routes bisa return 401/500 tanpa pesan jelas jika `SUPABASE_SERVICE_ROLE_KEY` tidak ter-set | `authMiddleware.ts` |
| P1-2 | Payment gateway (Midtrans/Xendit) tidak terintegrasi — hanya manual upload bukti bayar | `admin/payments.ts`, `Payment.tsx` |
| P1-3 | `isAdmin` frontend (termasuk `agent`) tidak selaras dengan `requireAdmin` backend (tidak termasuk `agent`) | `useAuth.tsx` vs `requireAdmin.ts` |
| P1-4 | Dua jalur role resolution (`getLocalRole`/`getSupabaseRole`) digabung heuristik — bukan satu sumber kebenaran tunggal | `authMiddleware.ts` |

### P2 — Medium (fitur ada tapi tidak lengkap / dead code)

| # | Masalah | Lokasi |
|---|---|---|
| P2-1 | `lib/replit-auth-web` legacy package masih ter-link, tidak dipakai flow aktif | `lib/replit-auth-web/`, `pnpm-workspace.yaml`, `tsconfig.json` |
| P2-2 | Shadow table Replit Auth (`users`, `sessions`) masih ada di schema, ditandai `@deprecated` tapi belum dihapus | `lib/db/src/schema/auth.ts` |
| P2-3 | OpenAPI spec masih mendefinisikan endpoint OIDC basi (`/auth/login`, `/auth/callback`) | `lib/api-spec/openapi.yaml` |
| P2-4 | `AnalyticsAI.tsx` komponen UI tanpa backend/model AI | `features/admin/AnalyticsAI.tsx` |
| P2-5 | `admin/contracts.ts` — permission check ada, CRUD create/update/delete belum lengkap | `admin/contracts.ts`, `AdminContracts.tsx` |
| P2-6 | Refunds — UI ada, approval flow backend belum lengkap | `admin/refunds.ts`, `AdminRefunds.tsx` |
| P2-7 | Agent Withdrawals — UI ada, approval flow belum lengkap | terkait `agent_withdrawals` |
| P2-8 | `SESSION_SECRET` di secrets tapi tidak dipakai kode manapun | Replit Secrets |
| P2-9 | Env var legacy `REPL_ID`/`ISSUER_URL` masih direferensikan | `.env.example`, `verify-deploy-env.mjs` |

### P3 — Low (kualitas & maintainability)

| # | Masalah | Lokasi |
|---|---|---|
| P3-1 | Tidak ada global React Error Boundary — white screen saat unhandled error | `App.tsx` |
| P3-2 | `console.error` di `faqs.ts` tanpa format error response konsisten | `faqs.ts:40` |
| P3-3 | Stale `.tsbuildinfo` bisa menyembunyikan TypeScript errors saat typecheck | Semua packages |
| P3-4 | Tidak ada integration/e2e tests | Seluruh monorepo |
| P3-5 | OpenAPI spec bisa drift lebih jauh dari implementasi Express aktual | `lib/api-spec` vs `routes/` |
| P3-6 | Dua jalur DB (Drizzle vs Supabase direct dari frontend) tanpa abstraksi eksplisit | Lihat Bagian 3 |
| P3-7 | Bahasa campur Indonesia/English di kode dan komentar | Seluruh codebase |
| P3-8 | 2FA `sessionStorage` flag tidak dibersihkan saat `signOut()` | `AdminRoute.tsx`, `useAuth.tsx` |
| P3-9 | Definisi role hierarchy terduplikasi di ≥3 file berbeda (Set vs Record vs union type) | `authMiddleware.ts`, `requireAdmin.ts`, `useAuth.tsx` |

---

## 12. Implementation Roadmap

> **Ini roadmap stabilisasi, bukan roadmap fitur.** Tujuannya: dari kondisi "audit selesai, belum stabil" menjadi "production-ready" tanpa menambah kapabilitas bisnis baru. Roadmap fitur bisnis (payment gateway sebagai bisnis, bahasa Arab, multi-tenant, dst.) ada terpisah di `docs/PRD.md` dan dijalankan **setelah** stabilisasi ini selesai.

### Fase 0 — Dokumentasi (SELESAI)
Audit menyeluruh (`PROJECT_ANALYSIS.md`), blueprint auth (`AUTH_ARCHITECTURE.md`), dan dokumen ini (`MASTER_PROJECT_BLUEPRINT.md`). Tidak ada perubahan kode.

### Fase 1 — Supabase & Database Foundation
**Tujuan**: Supabase berjalan, schema sinkron, tidak ada konflik trigger.
- Set semua env vars wajib di setiap environment (Replit, Vercel).
- Audit & bersihkan `business_logic_triggers.sql` — hilangkan konflik Replit Auth vs Supabase Auth (P0-3).
- Selesaikan schema drift `profiles.id`/`user_roles.user_id` — tetapkan `UUID` sebagai tipe kanonik (P0-4).
- Jalankan `supabase-deploy.sql` + trigger yang sudah dibersihkan + seed data.
- Verifikasi `GET /health` mengembalikan status DB & Supabase OK di semua environment.

### Fase 2 — Authentication Stabilization
**Tujuan**: satu flow auth yang konsisten, tidak ada redirect loop, tidak ada jejak Replit Auth.
- Ikuti checklist migrasi lengkap di `AUTH_ARCHITECTURE.md` §12 (pembersihan legacy, konsolidasi role, penyelarasan `isAdmin`).
- Fix redirect loop role null (P0-5) dengan fallback role `buyer` default.
- Perbaiki celah keamanan `/cms/chat-messages` (P0-1) — ini murni security fix, independen dari refactor auth besar, harus dieksekusi secepat mungkin begitu fase kode dimulai.
- Test end-to-end: login semua role, demosi role, 2FA, logout membersihkan seluruh state (termasuk `sessionStorage`).

### Fase 3 — Dashboard Verification
**Tujuan**: admin & customer dashboard tidak error.
- Verifikasi semua admin stats endpoints return 200 (bukan 500 senyap).
- Tambah global React Error Boundary (P3-1).
- Test semua sidebar menu (tidak ada dead link) dan role-based filtering.
- Verifikasi Supabase Realtime notification subscription.

### Fase 4 — Booking Flow Verification
**Tujuan**: booking end-to-end teruji, tidak ada race condition.
- Test quota trigger di bawah concurrent booking (cegah overbooking).
- Test agent commission trigger.
- Test approve/reject admin flow.

### Fase 5 — Payment Completion
**Tujuan**: minimal manual payment flow solid; gateway online sebagai lanjutan (bukan blocker stabilisasi).
- Lengkapi manual payment proof + admin verify end-to-end.
- (Lanjutan, bisa paralel dengan roadmap fitur PRD) integrasi Midtrans + webhook.

### Fase 6 — Notification Verification
- Verifikasi semua trigger notifikasi konsisten dengan status booking/payment terbaru.
- Test badge count real-time dan mark-as-read.

### Fase 7 — Production Hardening & Cleanup
**Tujuan**: production-ready.
- Hapus `lib/replit-auth-web`, shadow table Replit Auth, endpoint OIDC basi di OpenAPI spec (P2-1, P2-2, P2-3).
- Putuskan nasib `SESSION_SECRET`, `REPL_ID`/`ISSUER_URL` (P2-8, P2-9).
- Sync OpenAPI spec dengan implementasi aktual, regenerate `lib/api-zod`/`lib/api-client-react`.
- Tulis integration test minimal untuk auth flow dan booking flow (P3-4).
- Security review: RLS policies (saat ini "permissive, tighten later" — harus di-tighten), `ALLOWED_TABLES` di `rest.ts`, CORS production.
- Deploy ke Vercel, jalankan `verify-deploy-env.mjs`, verifikasi `/health` di production, monitor 24 jam pertama.

### Urutan dependency antar fase

```
Fase 1 (DB/Supabase)
    │
    ▼
Fase 2 (Auth) ── harus selesai sebelum Fase 3, 4
    │
    ├──▼ Fase 3 (Dashboard)
    │
    └──▼ Fase 4 (Booking)
              │
              ▼
         Fase 5 (Payment)
              │
              ▼
         Fase 6 (Notification)
              │
              ▼
         Fase 7 (Production Hardening)
```

**Catatan penting**: perbaikan keamanan `/cms/chat-messages` (P0-1) tidak perlu menunggu Fase 2 selesai penuh — begitu tim mulai menyentuh kode, ini harus jadi salah satu perubahan pertama karena merupakan data leak aktif, bukan sekadar debt arsitektur.

---

## 13. Coding Standards

> Standar ini **mendeskripsikan konvensi yang sudah dianut project** (diambil dari observasi struktur kode nyata), bukan mengarang standar baru — tujuannya konsistensi untuk pekerjaan berikutnya.

### Folder Structure
- **Frontend**: feature-sliced — setiap domain bisnis punya folder sendiri di `features/`, komponen/hook/util yang dipakai lintas fitur masuk `shared/`. Jangan taruh logic domain di `shared/`.
- **Backend**: satu file route per resource di `routes/` (admin sub-resource di `routes/admin/`), middleware terpisah di `middlewares/`, helper/env-resolver di `lib/`. Router baru **wajib** didaftarkan di `routes/index.ts` (atau `routes/admin/index.ts`) — route yang tidak di-mount adalah bug diam-diam.
- **Shared packages** (`lib/`): satu package pnpm workspace per concern (db, api-spec, api-zod, api-client-react). Jangan import lintas package tanpa melalui interface publiknya (`index.ts`).

### Naming Convention
- File React component: PascalCase (`AdminDashboard.tsx`, `Booking.tsx`).
- File non-komponen (hooks, utils, middleware): camelCase (`useAuth.tsx`, `apiClient.ts`, `authMiddleware.ts`).
- Route file backend: lowercase/kebab sesuai resource (`pilgrim-documents.ts`, `bookings.ts`).
- Kolom DB: camelCase di Drizzle schema (di-map ke snake_case di Postgres oleh Drizzle secara konsisten).
- Role sebagai string literal lowercase snake (`super_admin`, `branch_manager`) — jangan perkenalkan casing baru.

### Supabase Usage (WAJIB — lihat Bagian 5 untuk detail lengkap)
1. **Backend tidak pernah memanggil `createClient()`** — selalu `fetch()` mentah ke REST/Auth endpoint Supabase. Ini bukan preferensi, ini constraint teknis keras (Node 20 crash tanpa native WebSocket).
2. **Dua client Supabase di frontend, jangan dicampur**: `auth-client.ts` HANYA untuk operasi auth (`supabase.auth.*`); `client.ts` HANYA untuk data REST/Storage (stateless, token disuntik otomatis).
3. Query database sensitif/admin lewat Drizzle+Express (service role, bypass RLS, access control di kode). Query dari frontend langsung (`supabase.from()`) hanya untuk data yang RLS-nya sudah diverifikasi aman untuk diakses user biasa.
4. Setiap penambahan tabel baru yang diakses `rest.ts` proxy **wajib** ditambahkan ke `ALLOWED_TABLES` whitelist — jangan buka akses generik.
5. Upsert ke Supabase REST (PostgREST) pada kolom unique non-PK wajib menyertakan `?on_conflict=<col>` di URL DAN header `Prefer: resolution=merge-duplicates`.

### API Style
- REST konvensional: `GET` (read), `POST` (create), `PATCH` (partial update), `DELETE` (hapus). Hindari `PUT` (tidak dipakai project ini).
- Endpoint publik vs auth-required vs role-gated dipisah eksplisit lewat middleware, bukan pengecekan manual di dalam handler.
- Validasi request body dengan Zod (`middlewares/validate.ts`) — jangan validasi manual ad-hoc di handler.
- Kontrak API idealnya didefinisikan dulu di `lib/api-spec/openapi.yaml`, baru diimplementasikan — jaga agar tidak drift (lihat P3-5).

### Error Handling
- Response error konsisten: `{ error: string }` dengan HTTP status code yang sesuai (lihat tabel di Bagian 6).
- Middleware auth mengembalikan 401 (tidak terautentikasi) vs 403 (terautentikasi tapi tidak berwenang) — jangan tukar keduanya.
- Async handler yang gagal koneksi eksternal (Supabase, dsb.) harus `catch` dan fallback ke `null`/response error terkontrol — **jangan** biarkan exception unhandled menjatuhkan seluruh proses Express (lihat pola `pool.on("error")` di `lib/db`).
- Semua fetch ke Supabase dari backend **wajib** pakai `AbortSignal.timeout(ms)` — mencegah request menggantung tanpa batas.

### Logging
- Gunakan `lib/logger.ts` (backend) untuk log terstruktur, bukan `console.log` polos di route handler baru (perbaiki pola lama seperti `faqs.ts:40` — P3-2 — jangan direplikasi).
- Log request/error/audit penting dikirim ke tabel `logs` via `POST /logs/*` untuk keperluan audit trail, bukan hanya stdout.

### Security
- Setiap route baru yang mengembalikan data milik user tertentu **wajib** memasang `requireAuth` + ownership check eksplisit (`req.user.id === resource.userId` atau role staff+) — pelajaran langsung dari bug `/cms/chat-messages`.
- Jangan pernah memberi prefix `VITE_` pada secret backend (`SUPABASE_SERVICE_ROLE_KEY`) — akan ter-bundle ke frontend publik.
- RLS di Supabase untuk tabel yang diakses `supabase.from()` dari frontend harus direview sebelum production (saat ini "permissive, tighten later").
- Rate limiting (`middlewares/rateLimiter.ts`) wajib dipasang di endpoint publik yang menerima write (mis. logs, form submission).

---

## 14. Definition of Done

### Kapan project dianggap stabil

Project dianggap **stabil** (bukan "selesai" — pengembangan fitur bisnis di `docs/PRD.md` berlanjut terus) ketika:

1. Tidak ada lagi item **P0** terbuka di [Bagian 11](#11-technical-debt) — termasuk celah keamanan `/cms/chat-messages`, konflik trigger auth, dan schema drift.
2. Login/logout berfungsi end-to-end untuk **semua enam role** tanpa redirect loop, di Replit dev maupun Vercel prod.
3. Tidak ada satu pun jejak Replit Auth aktif di jalur kode yang dieksekusi (package boleh dihapus atau diisolasi eksplisit dengan dokumentasi, tapi tidak boleh ambigu mana yang "hidup").
4. `GET /health` mengembalikan status OK untuk DB dan Supabase di setiap environment target (Replit, Vercel + Supabase project).
5. Semua endpoint admin (`/admin/*`) memiliki role gate yang benar dan terverifikasi manual per role (super_admin s.d. agent) — tidak ada endpoint yang "kebetulan aman".
6. Booking flow end-to-end (pilih paket → booking → bayar manual → admin verifikasi → konfirmasi → notifikasi) berjalan tanpa error, termasuk skenario overbooking yang harus ditolak oleh trigger kuota.

### Checklist Production

- [ ] Semua env vars wajib ter-set di Vercel (bukan asumsi dari Replit Secrets) — divalidasi via `scripts/verify-deploy-env.mjs`.
- [ ] `DATABASE_URL` production mengarah ke Supabase Postgres (mode Transaction/pooler) — bukan connection dev.
- [ ] RLS policies di Supabase sudah di-tighten dari "permissive" ke kebijakan production-appropriate untuk semua tabel yang diakses langsung dari frontend.
- [ ] `ALLOWED_ORIGINS` CORS diisi dengan domain production resmi saja.
- [ ] Global React Error Boundary aktif — tidak ada lagi kemungkinan white screen tanpa pesan.
- [ ] Tidak ada `console.log`/`console.error` yang membocorkan data sensitif ke log produksi.
- [ ] Minimal satu integration test untuk auth flow dan satu untuk booking flow berjalan hijau.
- [ ] `pnpm run typecheck` bersih **setelah** menghapus `.tsbuildinfo` (cegah false-negative — lihat P3-3).
- [ ] `/health` di production menunjukkan status `ok` untuk DB dan Supabase.
- [ ] Login flow diuji manual langsung di production URL (bukan hanya di dev/preview) untuk minimal satu akun tiap role.
- [ ] Monitoring/log production dipantau minimal 24 jam pertama pasca-deploy tanpa error rate abnormal.
- [ ] Dokumen ini (`MASTER_PROJECT_BLUEPRINT.md`) dan dokumen sumber di `docs/` diperbarui untuk mencoret item yang sudah selesai — living document, bukan artefak sekali pakai.

---

*Dokumen ini adalah konsolidasi audit — tidak ada perubahan kode yang dilakukan untuk menghasilkannya. Semua tindakan implementasi menunggu keputusan eksplisit pemilik project, dieksekusi mengikuti urutan di [Bagian 12](#12-implementation-roadmap).*
