# PROJECT ARCHITECTURE
**Umroh Gateway — Platform Travel Umroh All-in-One**  
Versi: 1.0 | Dibuat: 2026-07-01 | Status: Living Document

> Dokumen ini adalah **standar proyek yang wajib diikuti** oleh semua kontributor.  
> Update dokumen ini setiap kali ada perubahan arsitektur signifikan.

---

## DAFTAR ISI

1. [Tech Stack](#1-tech-stack)
2. [Folder Structure](#2-folder-structure)
3. [Naming Convention](#3-naming-convention)
4. [Feature Structure](#4-feature-structure)
5. [Database](#5-database)
6. [Migration](#6-migration)
7. [Assets](#7-assets)
8. [Documentation](#8-documentation)
9. [Rules](#9-rules)

---

## 1. TECH STACK

### Frontend
| Layer | Library | Versi | Catatan |
|-------|---------|-------|---------|
| Framework | React | 18 | SPA, tidak ada SSR |
| Build Tool | Vite | 5+ | Dev server + bundler |
| Routing | React Router DOM | v6 | `BrowserRouter` + nested routes |
| State / Fetching | TanStack Query | v5 | Server state, caching, invalidation |
| Bahasa | TypeScript | 5+ | `noImplicitAny: false` untuk kecepatan |
| Styling | Tailwind CSS | v3 | Konfigurasi via `tailwind.config.ts` |
| UI Components | shadcn/ui | latest | Base component, di `src/shared/components/ui/` |
| Animasi | Framer Motion | 12+ | Transisi halaman & micro-interaction |
| Forms | React Hook Form + Zod | - | Semua form wajib pakai keduanya |
| Rich Text | TipTap | 3+ | Editor CMS, kontrak |
| Charts | Recharts | 2+ | Dashboard & laporan |
| PDF | jsPDF + html2canvas | - | Invoice, promo PDF |
| QR | qrcode.react + html5-qrcode | - | Generate & scan QR |
| i18n | Custom LanguageContext | - | `src/shared/i18n/` |
| SEO | react-helmet-async | - | Meta tags, JSON-LD |
| Error Tracking | Sentry | 10+ | Aktif jika `VITE_SENTRY_DSN` tersedia |

### Backend (BaaS)
| Layer | Teknologi | Catatan |
|-------|-----------|---------|
| Database | Supabase PostgreSQL | RLS aktif di semua tabel sensitif |
| Auth | Supabase Auth | + 2FA TOTP + HIBP password check |
| Realtime | Supabase Realtime | Chat jamaah ↔ admin |
| Storage | Supabase Storage | Buckets: `payment-proofs`, `cms-images`, `avatars`, `gallery`, `documents` |
| Edge Functions | Supabase Edge (Deno) | Payment gateway webhook, export data, email, reminders |
| Cron | pg_cron | Daily 09:00 → payment-reminder, follow-up-reminder |

### Dev Tools
| Tool | Kegunaan |
|------|----------|
| Vitest + Testing Library | Unit & integration test |
| ESLint + typescript-eslint | Linting |
| pnpm | Package manager (monorepo workspace) |

---

## 2. FOLDER STRUCTURE

### Struktur Target (setelah refactor)

```
project-root/
│
├── artifacts/
│   └── umroh-app/                  ← Frontend artifact utama
│       └── src/
│           ├── features/           ← Kode dikelompokkan per FITUR (bukan per tipe)
│           │   ├── auth/
│           │   ├── paket/
│           │   ├── booking/
│           │   ├── jamaah/
│           │   ├── dashboard/
│           │   ├── agent/
│           │   ├── cms/
│           │   ├── wishlist/
│           │   ├── tenant/
│           │   └── admin/
│           │
│           ├── shared/             ← Kode yang dipakai lintas fitur
│           │   ├── components/
│           │   │   ├── ui/         ← shadcn/ui (jangan dimodifikasi)
│           │   │   ├── layout/     ← Navbar, Footer, Breadcrumbs
│           │   │   ├── seo/        ← SEO, JSON-LD components
│           │   │   ├── notifications/
│           │   │   └── common/     ← Komponen umum lintas fitur
│           │   ├── hooks/          ← Hooks yang dipakai >1 fitur
│           │   ├── lib/            ← Utility functions
│           │   ├── i18n/           ← LanguageContext, translations
│           │   └── integrations/
│           │       └── supabase/   ← client.ts, types.ts
│           │
│           ├── pages/              ← Hanya entry-level pages
│           │   ├── Index.tsx       ← Landing page
│           │   └── NotFound.tsx    ← 404
│           │
│           ├── App.tsx             ← Root: providers + router
│           ├── main.tsx            ← Entry point
│           └── index.css           ← Global styles + CSS variables
│
├── database/                       ← Semua SQL terorganisir
│   ├── schema/                     ← Full schema (referensi)
│   ├── migrations/                 ← Perubahan bertahap, berurutan
│   ├── patches/                    ← Hotfix & perbaikan ad-hoc
│   └── seed/                       ← Data awal / setup bucket
│
├── docs/                           ← Dokumentasi teknis
│   ├── Architecture.md
│   ├── Database.md
│   ├── API.md
│   ├── Deployment.md
│   ├── FolderStructure.md
│   ├── CodingStandard.md
│   ├── DevelopmentGuide.md
│   └── FeatureList.md
│
├── PROJECT_ARCHITECTURE.md         ← Dokumen ini
├── PRD.md                          ← Product Requirements Document
└── replit.md                       ← Replit environment notes
```

### Struktur Saat Ini (sebelum refactor)
Lihat hasil audit di `docs/Architecture.md` (akan dibuat di Phase 2).  
Perbedaan utama: saat ini kode dikelompokkan by **tipe file** (`pages/`, `components/`, `hooks/`), bukan by **fitur**.

---

## 3. NAMING CONVENTION

### File & Folder

| Jenis | Convention | Contoh |
|-------|-----------|--------|
| React Component | `PascalCase.tsx` | `PackageCard.tsx` |
| React Page | `PascalCase.tsx` | `PackageDetail.tsx` |
| Custom Hook | `camelCase.ts(x)`, prefix `use` | `useAuth.tsx`, `useBooking.ts` |
| Utility / Helper | `camelCase.ts` | `validations.ts`, `phone.ts` |
| Context | `PascalCase.tsx`, suffix `Context` | `LanguageContext.tsx` |
| Type file | `camelCase.ts` | `types.ts` |
| Config file | `camelCase.ts` | `adminMenuConfig.ts` |
| Test file | sama dengan yang ditest, suffix `.test` | `phone.test.ts` |
| CSS / Style | `camelCase.css` atau ikut component | `index.css` |
| Folder | `kebab-case` atau `camelCase` konsisten | `master-data/`, `api-logs/` |
| SQL Migration | `YYYYMMDD_NNN_deskripsi_singkat.sql` | `20260209_001_create_profiles.sql` |
| SQL Patch | `fix_deskripsi_singkat.sql` | `fix_auth_schema.sql` |

### Variabel & Fungsi (TypeScript)

| Jenis | Convention | Contoh |
|-------|-----------|--------|
| Variable | `camelCase` | `bookingId`, `isLoading` |
| Konstanta global | `UPPER_SNAKE_CASE` | `MAX_PILGRIM_PER_ROOM` |
| Function | `camelCase`, verb prefix | `getBookings()`, `handleSubmit()` |
| Component prop type | `PascalCase`, suffix `Props` | `PackageCardProps` |
| Enum | `PascalCase` | `BookingStatus` |
| Enum value | `UPPER_SNAKE_CASE` | `BookingStatus.PENDING_PAYMENT` |
| Supabase table (DB) | `snake_case`, plural | `package_departures`, `pilgrim_documents` |
| Supabase column (DB) | `snake_case` | `booking_code`, `created_at` |

### Environment Variables

| Prefix | Kegunaan | Contoh |
|--------|----------|--------|
| `VITE_` | Variabel yang diakses frontend | `VITE_SUPABASE_URL` |
| (tanpa prefix) | Diakses server/edge function saja | `RESEND_API_KEY` |

**Rule:** Tidak ada nilai credential/secret yang di-hardcode di kode. Selalu via `import.meta.env.VITE_*`.

---

## 4. FEATURE STRUCTURE

Setiap fitur adalah folder mandiri yang berisi semua kode terkait fitur tersebut.

### Anatomi Sebuah Feature

```
features/
└── paket/                      ← nama fitur, kebab-case
    ├── pages/                  ← halaman (di-register di App.tsx)
    │   ├── Paket.tsx
    │   ├── PackageDetail.tsx
    │   └── Compare.tsx
    ├── components/             ← komponen khusus fitur ini
    │   ├── PackageCard.tsx
    │   ├── PackagesPreview.tsx
    │   └── InstallmentCalculator.tsx
    ├── hooks/                  ← hooks khusus fitur ini (opsional)
    │   └── usePackageFilter.ts
    └── index.ts                ← barrel export (opsional)
```

**Aturan feature:**
- Sebuah feature **boleh** import dari `shared/`
- Sebuah feature **tidak boleh** import dari feature lain secara langsung
- Jika dua feature butuh berbagi kode → pindahkan ke `shared/`

### Daftar Feature

| Feature | Folder | Deskripsi | Route Prefix |
|---------|--------|-----------|--------------|
| Auth | `features/auth/` | Login, register, 2FA, forgot/reset password | `/auth`, `/forgot-password`, `/reset-password`, `/account/2fa` |
| Paket | `features/paket/` | Daftar paket, detail, compare | `/paket`, `/paket/:slug`, `/bandingkan` |
| Booking | `features/booking/` | Proses booking, pembayaran, histori, e-ticket, refund | `/booking/*`, `/my-bookings`, `/e-ticket/:id`, `/refund-request` |
| Jamaah | `features/jamaah/` | Dokumen, upgrade, kontrak, manasik | `/my-documents`, `/my-upgrades`, `/contract/:id`, `/manasik` |
| Dashboard | `features/dashboard/` | Dashboard user, branch dashboard | `/dashboard`, `/branch-dashboard` |
| Agent | `features/agent/` | Portal agen, komisi, afiliasi | `/agent-portal`, `/agent-commissions`, `/r/:code` |
| CMS | `features/cms/` | Blog, galeri, halaman dinamis | `/blog`, `/blog/:slug`, `/galeri`, `/:slug` |
| Wishlist | `features/wishlist/` | Daftar paket favorit | `/wishlist` |
| Tenant | `features/tenant/` | Multi-tenant site (subdomain) | (subdomain-based) |
| Admin | `features/admin/` | Seluruh panel admin | `/admin/*` |

### Admin Feature Sub-structure

Admin adalah feature terbesar, dikelompokkan lagi per domain:

```
features/admin/
├── components/               ← shell admin (layout, sidebar, header, dll)
│   ├── AdminLayout.tsx
│   ├── AdminSidebar.tsx
│   ├── AdminRoute.tsx        ← route guard
│   └── ...
└── pages/
    ├── master-data/          ← Hotels, Airlines, Airports, Services, dll
    ├── paket/                ← Packages, Departures, Itineraries, Costs
    ├── booking/              ← Bookings, Payments, Gateway, Refunds, Installments
    ├── jamaah/               ← Pilgrims, Manifest, Documents, CheckIn, Manasik
    ├── laporan/              ← Reports, Accounting, AuditLogs, ErrorLogs
    ├── agent/                ← Agents, Withdrawals, Branches, CRM, Muthawifs
    ├── cms/                  ← Blog, Gallery, Pages, Navigation, FAQ, Testimonials
    ├── pengguna/             ← Users, Roles, Coupons, Loyalty, Reviews, Chats
    └── settings/             ← Settings, TenantSites, Integrations, SEO, Analytics
```

---

## 5. DATABASE

### Platform
**Supabase PostgreSQL** — hosted, fully managed.  
Semua tabel sensitif menggunakan **Row Level Security (RLS)**.

### Akses dari Frontend
```typescript
// src/shared/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storage: localStorage, persistSession: true, autoRefreshToken: true } }
);
```

**Rule:** Semua akses database dari frontend wajib via `supabase` client ini. Tidak boleh ada direct SQL query dari frontend.

### Roles & Auth

| Role | Akses |
|------|-------|
| `buyer` | Data diri sendiri: bookings, documents, profile |
| `agent` | Buyer + data referral, komisi, leads |
| `branch_manager` | Agent + data cabang sendiri |
| `admin` | Semua kecuali super-admin operations |
| `super_admin` | Full access, impersonation, tenant management |

Role disimpan di tabel `user_roles`, dicek via RLS policy dan fungsi `has_role(user_id, role)`.

### Tabel Utama (Grouped by Domain)

**Auth & Users**
- `profiles` — extended user data (nama, NIK, foto, 2FA config)
- `user_roles` — role per user (satu user bisa punya beberapa role)

**Paket**
- `packages` — paket umroh (nama, harga, durasi, DP setting)
- `package_categories` — kategori + hierarki (parent_id)
- `package_departures` — jadwal keberangkatan per paket
- `package_hotels` — hotel per paket (bertingkat: Makkah/Madinah)
- `package_commissions` — komisi per paket per tipe agen
- `package_costs` — HPP / biaya pokok per paket

**Booking**
- `bookings` — data booking jamaah
- `booking_pilgrims` — detail setiap jamaah dalam booking
- `payments` — pembayaran (DP / cicilan / lunas)
- `payment_proof_access_logs` — audit akses bukti bayar
- `payment_gateway_transactions` — transaksi Midtrans/Xendit
- `installments` — jadwal cicilan

**Jamaah**
- `pilgrim_documents` — dokumen (passport, visa, foto)
- `check_ins` — check-in QR scan keberangkatan
- `manasik_materials` — materi manasik

**Keuangan**
- `financial_transactions` — jurnal keuangan umum
- `agent_commissions` — komisi per transaksi per agen
- `agent_withdrawals` — penarikan komisi agen

**CMS**
- `site_settings` — pengaturan tenant (nama, logo, warna, dll)
- `cms_pages` — halaman statis dinamis
- `blog_posts` — artikel blog
- `gallery` — galeri foto
- `testimonials` — testimoni jamaah
- `faqs` — FAQ publik

**Master Data**
- `hotels`, `airlines`, `airports` — data referensi
- `muthawifs` — pembimbing umroh
- `branches` — cabang
- `agents` — data agen/mitra
- `currencies` — kurs mata uang

**Sistem**
- `notifications` — notifikasi in-app
- `leads` — CRM leads
- `api_logs` — log API call
- `audit_logs` — trail perubahan data sensitif
- `seo_overrides` — SEO meta per halaman
- `tenant_sites` — konfigurasi multi-tenant

### Environment Variables Database

```bash
VITE_SUPABASE_URL=         # URL project Supabase
VITE_SUPABASE_ANON_KEY=    # Anon key (public, aman di frontend)
# VITE_SUPABASE_PROJECT_ID=  # Optional, untuk CLI
```

**Rule:** Jangan pernah menyimpan `service_role` key di frontend. Hanya untuk Edge Functions / server-side.

---

## 6. MIGRATION

### Lokasi

```
database/
├── schema/         ← Snapshot schema lengkap (untuk referensi & setup fresh)
├── migrations/     ← Perubahan incremental, berurutan
├── patches/        ← Hotfix yang perlu dijalankan manual (bukan via CLI)
└── seed/           ← Data awal / setup storage bucket
```

### Format Nama File

#### Migration
```
YYYYMMDD_NNN_deskripsi_singkat.sql
```
- `YYYYMMDD` — tanggal migration dibuat
- `NNN` — sequence number per hari (001, 002, ...)
- `deskripsi` — lowercase, underscore, max 5 kata

**Contoh yang benar:**
```
20260209_001_create_profiles.sql
20260209_002_booking_code_function.sql
20260507_001_create_agent_commissions_withdrawals.sql
```

**Contoh yang salah:**
```
20260209000132_3fbaab72-b42e-4b40-b96b-680a7ce2a556.sql  ← UUID, tidak informatif
fix_something.sql                                          ← tidak ada tanggal
migration_1.sql                                            ← tidak deskriptif
```

#### Patch
```
fix_deskripsi_singkat.sql
```
Patch adalah SQL yang dijalankan **manual**, biasanya untuk memperbaiki data atau schema di luar jalur migration normal.

#### Seed
```
seed_deskripsi.sql
```
Data awal atau setup infrastruktur (bucket storage, default settings).

### Alur Migration (Supabase)

```
1. Tulis migration baru di database/migrations/YYYYMMDD_NNN_*.sql
2. Push ke Supabase via CLI:
   supabase db push
   ATAU
   supabase migration apply
3. Update types.ts via:
   supabase gen types typescript --linked > src/shared/integrations/supabase/types.ts
4. Commit ke git
```

### Aturan Migration

1. **Migration harus idempoten** — gunakan `IF NOT EXISTS`, `IF EXISTS`, `ON CONFLICT DO NOTHING`
2. **Jangan ubah migration lama** — sudah dijalankan = tidak boleh diedit. Buat migration baru
3. **Satu migration = satu perubahan logis** — jangan gabungkan terlalu banyak perubahan
4. **Selalu sertakan rollback** (sebagai komentar) jika memungkinkan
5. **RLS wajib** untuk tabel yang menyimpan data user

**Contoh migration yang baik:**
```sql
-- 20260209_001_create_profiles.sql
-- Membuat tabel profil user dengan RLS
-- Rollback: DROP TABLE IF EXISTS public.profiles;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
```

---

## 7. ASSETS

### Lokasi

```
artifacts/umroh-app/
├── public/               ← Static assets (served as-is, URL publik)
│   ├── favicon.ico
│   ├── robots.txt
│   └── sitemap.xml
└── src/
    └── assets/           ← Assets yang di-import dalam kode (di-bundle Vite)
        ├── about-madinah.jpg
        └── hero-umroh.jpg
```

### Supabase Storage Buckets

| Bucket | Akses | Kegunaan |
|--------|-------|---------|
| `cms-images` | Public | Foto paket, blog, galeri CMS |
| `avatars` | Public | Foto profil user |
| `gallery` | Public | Galeri keberangkatan |
| `payment-proofs` | Private (signed URL) | Bukti pembayaran jamaah |
| `documents` | Private (signed URL) | Dokumen jamaah (passport, visa) |

### Aturan Asset

1. **Public assets** (`public/`) — file yang perlu URL statis: favicon, robots.txt, sitemap, OG image default
2. **Imported assets** (`src/assets/`) — gambar yang di-import dalam komponen React, di-bundle Vite
3. **User-generated content** — selalu ke Supabase Storage, tidak pernah ke `public/` atau `src/assets/`
4. **Optimasi:** Semua gambar yang di-upload via CMS sebaiknya di-compress sebelum upload (target <500KB per gambar)
5. **Format:** Prefer WebP untuk foto, SVG untuk ikon/logo
6. **Watermark:** Gunakan `src/shared/lib/watermark.ts` untuk gambar yang perlu watermark sebelum display

### Aturan Import Asset dalam Kode

```typescript
// ✅ BENAR — import langsung (Vite akan handle)
import heroImage from '@/assets/hero-umroh.jpg';

// ✅ BENAR — URL dari Supabase Storage
const { data } = supabase.storage.from('cms-images').getPublicUrl('path/to/image.jpg');

// ❌ SALAH — hardcode URL external yang tidak terkontrol
const img = "https://random-cdn.com/image.jpg";

// ❌ SALAH — path relatif dalam komponen (akan broken setelah refactor)
const img = "../../assets/hero.jpg";
```

---

## 8. DOCUMENTATION

### Lokasi

```
docs/
├── Architecture.md       ← Gambaran arsitektur sistem (diagram, flow)
├── Database.md           ← Schema database, relasi tabel, RLS policy
├── API.md                ← Edge functions, endpoints, request/response format
├── Deployment.md         ← Cara deploy, environment, CI/CD
├── FolderStructure.md    ← Peta folder lengkap dengan penjelasan tiap folder
├── CodingStandard.md     ← Standard kode, best practices, anti-patterns
├── DevelopmentGuide.md   ← Setup lokal, cara run, cara test, cara debug
└── FeatureList.md        ← Status semua fitur (done / in-progress / planned)
```

### Aturan Dokumentasi

1. **Update setiap selesai satu fase refactor** — docs tidak boleh stale
2. **Semua file docs ditulis dalam Bahasa Indonesia** (konsisten dengan PRD.md)
3. **Sertakan tanggal update** di header setiap dokumen
4. **Diagram** menggunakan Mermaid (dirender di GitHub/Replit)
5. **FeatureList.md** diupdate setiap ada fitur baru atau status berubah
6. `PROJECT_ARCHITECTURE.md` (dokumen ini) adalah sumber kebenaran pertama — docs/ adalah elaborasinya

---

## 9. RULES

### 9.1 Rules Umum

| # | Rule |
|---|------|
| R01 | **Jangan hapus file** tanpa mapping ke lokasi baru + verifikasi semua import diupdate |
| R02 | **Jangan rename file** tanpa update semua import yang mereferensikannya |
| R03 | **Jangan pindah file** sebelum dependency-nya dicek dengan grep |
| R04 | **Commit setiap fase refactor** — satu fase = satu commit, pesan commit jelas |
| R05 | **App harus tetap jalan** setelah setiap perubahan — test di browser sebelum commit |
| R06 | **Jangan gabung fitur baru dengan refactor** dalam satu commit/PR |

### 9.2 Rules Frontend

| # | Rule |
|---|------|
| F01 | Semua form **wajib** menggunakan React Hook Form + Zod validation |
| F02 | Semua data fetching **wajib** menggunakan TanStack Query — tidak ada `fetch` langsung di komponen |
| F03 | Semua teks user-facing yang perlu multi-bahasa **wajib** melalui `useLanguage()` hook |
| F04 | Semua halaman dengan data user **wajib** wrap dengan `<AuthRoute>` atau `<AdminRoute>` |
| F05 | Tidak ada `console.log` di production code — gunakan `src/shared/lib/errorLogger.ts` |
| F06 | Semua import gunakan alias `@/` — tidak ada import relative `../../` |
| F07 | Setiap halaman publik **wajib** memiliki `<SEO>` component dengan title, description, dan OG tags |
| F08 | Komponen shadcn/ui di `shared/components/ui/` **tidak boleh** dimodifikasi langsung — extend atau wrap |

### 9.3 Rules Database & Migration

| # | Rule |
|---|------|
| D01 | Semua tabel baru **wajib** memiliki RLS policy |
| D02 | Migration **wajib** idempoten (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) |
| D03 | Migration lama **tidak boleh** diedit — buat migration baru |
| D04 | Satu migration = satu perubahan logis yang kohesif |
| D05 | Nama migration: `YYYYMMDD_NNN_deskripsi_singkat.sql` |
| D06 | Setelah migration dijalankan, update `types.ts` via Supabase CLI |
| D07 | Tidak ada SQL di root folder — semua SQL masuk `database/` |

### 9.4 Rules Keamanan

| # | Rule |
|---|------|
| S01 | Tidak ada credential/secret di kode — selalu via environment variable |
| S02 | `service_role` key Supabase **hanya** untuk Edge Functions, tidak pernah di frontend |
| S03 | Semua endpoint yang mengembalikan data sensitif **wajib** menggunakan Signed URL |
| S04 | Captcha (Turnstile) **wajib** di semua form publik: auth, booking, kontak |
| S05 | Rate limiting **wajib** di endpoint booking dan pembayaran |
| S06 | Semua akses ke `payment-proofs` dan `documents` bucket dicatat di audit log |

### 9.5 Rules Struktur Kode

| # | Rule |
|---|------|
| ST01 | Fitur **tidak boleh** import langsung dari fitur lain — gunakan `shared/` |
| ST02 | `shared/components/ui/` hanya untuk shadcn/ui — komponen bisnis masuk feature |
| ST03 | Hook dengan prefix `use` = selalu custom hook, bukan utility function |
| ST04 | `lib/` (shared/lib/) = pure functions tanpa React dependency |
| ST05 | Context Providers didefinisikan di masing-masing feature atau `shared/` — di-compose di `App.tsx` |
| ST06 | Setiap feature **boleh** memiliki `index.ts` barrel export — tapi tidak wajib |

### 9.6 Rules Testing

| # | Rule |
|---|------|
| T01 | Setiap utility function di `shared/lib/` **wajib** memiliki unit test |
| T02 | Test file ditempatkan sedekat mungkin dengan file yang ditest (co-location) |
| T03 | Test menggunakan Vitest + Testing Library |
| T04 | Jalankan `pnpm test` sebelum commit phase refactor |

---

## CHANGELOG

| Versi | Tanggal | Perubahan |
|-------|---------|-----------|
| 1.0 | 2026-07-01 | Dokumen awal — dibuat berdasarkan audit codebase |

---

*Dokumen ini dikelola bersama. Jika ada ketidaksesuaian antara dokumen ini dengan kode aktual, **kode aktual** adalah referensi sementara, tapi **dokumen ini** adalah target yang harus dicapai.*
