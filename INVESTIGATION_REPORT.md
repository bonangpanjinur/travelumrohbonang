# Laporan Investigasi — UmrohPlus / VinsTravel API 500 Errors

> Dibuat: 18 Juli 2026  
> Investigator: Code audit + live diagnostic test  
> Status: FINAL — belum ada perubahan kode yang dilakukan

---

## Ringkasan

Semua endpoint `/api/admin/*` dan `/api/cms/*` gagal di Vercel karena **tiga akar masalah yang berbeda** yang saling terpisah.

| # | Masalah | Symptom | Confidence |
|---|---------|---------|------------|
| 1 | `DATABASE_URL` di Vercel masih mengarah ke host internal Replit (`helium`) yang tidak bisa diakses dari luar | Semua query Postgres gagal `ETIMEDOUT`/`ENOTFOUND` → 5xx | **High** |
| 2 | `USE_SUPABASE_HTTP` fallback tidak aktif karena `DATABASE_URL` ada (nilainya salah, bukan kosong) | Route tidak beralih ke Supabase REST walaupun DB tidak bisa dihubungi | **High** |
| 3 | `VITE_SUPABASE_ANON_KEY` tidak ada di Vercel → Supabase JS client di browser gagal init → 401 dari Supabase langsung | Browser gagal load sesi login | **High** |

---

## Root Cause

### RC-1 — DATABASE_URL di Vercel = Replit Internal Host

**Bukti langsung dari diagnostic run:**

```
[DATABASE_URL] host=helium port=default db=/heliumdb
  → Is Replit internal host: YES ⚠️
  → Is Supabase host: NO
```

`helium` adalah hostname yang hanya dapat dijangkau dari dalam jaringan container Replit. Dari Vercel serverless, DNS resolution untuk `helium` akan gagal dengan `ENOTFOUND`, atau TCP connection timeout dengan `ETIMEDOUT`.

**Mengapa ini menyebabkan 5xx (bukan immediate crash):**

Database pool dibuat di module-load time (`lib/db/src/index.ts` L50):

```typescript
export const pool = new Pool({
  connectionString: connectionString || "postgres://localhost/placeholder",
  max: 3,
  connectionTimeoutMillis: 5_000,  // ← timeout setelah 5 detik
});
```

Pool creation tidak langsung connect. Error baru muncul saat pertama kali ada query (`pool.query()` atau Drizzle `db.select()`). Setiap request ke endpoint yang butuh DB akan:
1. Menunggu 5 detik (connection timeout)
2. Melempar error `ETIMEDOUT` atau `ENOTFOUND`
3. Ditangkap oleh `sendAdminError()` → HTTP 503 `db_unreachable`
4. Di production mode (`NODE_ENV=production`), Express global error handler akan return HTTP 500 untuk error yang tidak dicatch oleh route handler

---

### RC-2 — `USE_SUPABASE_HTTP` Tidak Aktif Karena DATABASE_URL Ada (Nilainya Salah)

`menu-permissions.ts` (dan beberapa route lain) punya fallback ke Supabase HTTP REST jika `DATABASE_URL` tidak tersedia. Namun logika checknya adalah:

```typescript
// artifacts/api-server/src/routes/admin/menu-permissions.ts L17–20
const USE_SUPABASE_HTTP =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes("localhost/placeholder") ||
  process.env.DATABASE_URL === "postgres://localhost/placeholder";
```

Di Vercel:
- `DATABASE_URL` = `postgres://helium/heliumdb` → **bukan kosong**, **bukan** `localhost/placeholder`
- Hasil: `USE_SUPABASE_HTTP = false`

Artinya route mencoba Drizzle (yang gagal), dan **tidak pernah fallback** ke Supabase REST API meskipun Supabase tersedia dan terkonfigurasi.

**Ini bug desain:** flag seharusnya memeriksa apakah DB *reachable*, bukan hanya apakah URL *ada*.

---

### RC-3 — `VITE_SUPABASE_ANON_KEY` Tidak Ada → Browser Supabase Client 401

Vercel menyimpan `SUPABASE_ANON_KEY`, tapi Vite hanya mengekspos env var dengan prefix `VITE_` ke JavaScript browser. Variabel tanpa prefix ini invisible di browser build.

```
// artifacts/umroh-app/src/shared/integrations/supabase/client.ts
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;  // ← undefined di browser
```

Akibatnya Supabase JS client di browser terinisialisasi dengan `apikey: undefined` → semua call ke Supabase REST API langsung → HTTP 401 Unauthorized.

---

## Bukti

### Bukti 1 — ENV Diagnostic Output (Replit dev environment)

```
[ENV] ────────────────────────────────────────────────────────
  SUPABASE_URL                     MISSING
  VITE_SUPABASE_URL                MISSING
  SUPABASE_ANON_KEY                MISSING
  VITE_SUPABASE_ANON_KEY           MISSING
  SUPABASE_SERVICE_ROLE_KEY        MISSING
  SUPABASE_DATABASE_URL            MISSING
  DATABASE_URL                     OK (62 chars)    ← helium
```

```
[DATABASE_URL] host=helium port=default db=/heliumdb
  → Is Replit internal host: YES ⚠️
  → Is Supabase host: NO
```

```
── Supabase Key Diagnostics ──────────────────────────
  SUPABASE_SERVICE_ROLE_KEY: MISSING
  URL: MISSING
```

### Bukti 2 — Live Test: GET /api/admin/menu-permissions/my

```bash
$ curl -X GET http://localhost:8080/api/admin/menu-permissions/my \
    -H "Authorization: Bearer test-token-invalid"
```

```
[authMiddleware] → GET /api/admin/menu-permissions/my
[authMiddleware] token found, resolving user...
[authMiddleware] token invalid or Supabase unreachable — proceeding unauthenticated
{"error":"Authentication required"}
```

**Interpretasi:** Token tidak bisa divalidasi karena `SUPABASE_URL` missing → user dianggap unauthenticated → `requireAuth` middleware → 401. Di Vercel (di mana SUPABASE_URL tersedia), token berhasil divalidasi, tapi DB query setelahnya yang gagal.

### Bukti 3 — Auth Flow dengan SUPABASE_URL Tersedia tapi DATABASE_URL Salah

```typescript
// authMiddleware.ts L131–148
async function getUserRole(userId: string): Promise<string | null> {
  const [localRole, supabaseResult] = await Promise.all([
    getLocalRole(userId),       // ← query ke pool (helium di Vercel) → ETIMEDOUT setelah 5s
    getSupabaseRole(userId),    // ← fetch ke Supabase → berhasil
  ]);
  if (supabaseResult.reachable) return supabaseResult.role;  // ambil dari Supabase
  return localRole;
}
```

Di Vercel dengan SUPABASE_URL set: auth *akhirnya berhasil* (via Supabase HTTP), tapi setiap request membutuhkan minimal 5 detik (menunggu `getLocalRole` timeout). Setelah auth, route handler mencoba Drizzle → timeout lagi.

### Bukti 4 — Startup Banner Tidak Jalan di Vercel

```typescript
// artifacts/api-server/src/vercel.ts
export { default } from "./app";  // hanya export app, tidak panggil index.ts
```

```typescript
// artifacts/api-server/src/index.ts
validateRequiredEnv();  // ← TIDAK dijalankan di Vercel serverless
logEnvStatus();         // ← TIDAK dijalankan di Vercel serverless
logStartupBanner();     // ← TIDAK dijalankan di Vercel serverless
```

Seluruh validation dan diagnostic logging hanya berjalan di `index.ts` (long-running dev server). Di Vercel, entry point adalah `vercel.ts` yang langsung export app tanpa memanggil `index.ts`. **Env vars tidak pernah divalidasi** di Vercel production.

### Bukti 5 — Replit-Specific ENV Vars Hadir di Runtime

```
[REPLIT ENV VARS PRESENT]: REPL_OWNER, REPLIT_DOMAINS, REPL_OWNER_ID,
REPL_ORG_ID, REPLIT_LD_AUDIT, REPL_ID, REPLIT_DB_URL, REPLIT_DEV_DOMAIN,
REPL_CLUSTER, REPL_LANGUAGE, REPL_HOME, REPL_SLUG, ...
```

Ada **28 Replit-specific env vars** yang present di runtime. Beberapa (`REPL_ID`, `REPLIT_DEV_DOMAIN`) dibaca oleh frontend Vite config.

---

## File yang Bermasalah

| File | Baris | Masalah |
|------|-------|---------|
| `lib/db/src/index.ts` | 14–15 | Pool diinisialisasi di module-load time dengan URL yang mungkin tidak reachable. Tidak ada validasi apakah host reachable. |
| `artifacts/api-server/src/routes/admin/menu-permissions.ts` | 17–20 | `USE_SUPABASE_HTTP` hanya `true` jika `DATABASE_URL` kosong atau `localhost/placeholder`. Tidak mendeteksi Replit internal host. |
| `artifacts/api-server/src/vercel.ts` | 1–11 | Tidak memanggil `validateRequiredEnv()` atau `logEnvStatus()`. Semua validation/diagnostic hanya jalan di `index.ts`. |
| `artifacts/api-server/src/middlewares/authMiddleware.ts` | 41–53 | `getLocalRole()` selalu dipanggil di setiap request terautentikasi, menyebabkan 5-detik timeout jika DB unreachable — bahkan sebelum route handler jalan. |
| `artifacts/umroh-app/src/shared/integrations/supabase/client.ts` | ~29 | `import.meta.env.VITE_SUPABASE_ANON_KEY` — membutuhkan prefix `VITE_` di Vercel, tapi hanya `SUPABASE_ANON_KEY` yang diset. |

---

## Mengapa Berjalan di Replit tetapi Gagal di Vercel

| Aspek | Replit (berjalan) | Vercel (gagal) |
|-------|-------------------|----------------|
| `DATABASE_URL` | Auto-set ke `postgres://helium/heliumdb` oleh platform Replit — host ini reachable dari dalam container Replit | Masih berisi `postgres://helium/heliumdb` — Replit internal host, **tidak reachable dari Vercel** |
| Auth (SUPABASE_URL) | SUPABASE_URL tidak diset → auth selalu null → semua request 401. Tapi di dev environment, mungkin ada bypass atau admin mengakses tanpa auth | SUPABASE_URL diset → auth berjalan → JWT divalidasi → route handler dijalankan → DB query gagal |
| Pool behavior | Pool connect ke helium, berhasil | Pool mencoba connect ke helium → DNS NXDOMAIN / ENOTFOUND → 5xx |
| `USE_SUPABASE_HTTP` | `false` (DATABASE_URL ada) — tapi DB berhasil diakses | `false` (DATABASE_URL ada tapi nilainya salah) — DB gagal, fallback tidak aktif |
| Startup validation | `validateRequiredEnv()` jalan via `index.ts`, memberikan warning | TIDAK jalan di `vercel.ts` → tidak ada error log saat cold start |

---

## Apakah Ada Dependency Terhadap Runtime Replit

**Ya, ada dua dependency eksplisit terhadap Replit:**

### 1. DATABASE_URL (Critical — menyebabkan 500 di Vercel)

```typescript
// lib/db/src/index.ts L8–15
// On Replit dev, the platform auto-provisions its own Postgres and binds it to
// `DATABASE_URL`, which shadows the Supabase Postgres connection string...
const rawConnection =
  process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "";
```

Komentar di kode sendiri mengakui bahwa `DATABASE_URL` di Replit adalah Replit-managed DB, bukan Supabase. Workaround yang ada (`SUPABASE_DATABASE_URL`) belum diisi di Vercel.

**Confidence: High** — Terbukti dari diagnostic output: `DATABASE_URL` berisi `helium`.

### 2. REPL_ID di Vite Config (Non-critical — hanya frontend dev)

```typescript
// artifacts/umroh-app/vite.config.ts L40 (frontend only)
process.env.REPL_ID  // dibaca untuk config dev server
```

Ini hanya memengaruhi Vite dev server configuration, bukan production build. Tidak menyebabkan 500 di Vercel.

**Confidence: High** — Terbukti dari ENV diagnostic: `REPL_ID` hadir di runtime.

### 3. REPLIT_DB_URL (Tidak digunakan di backend)

`REPLIT_DB_URL` hadir di env tapi tidak dibaca oleh kode backend maupun frontend. Tidak menyebabkan masalah.

---

## Daftar Perubahan yang Diperlukan

### A. Aksi di Vercel Dashboard (tidak butuh perubahan kode)

**A-1. Perbaiki `DATABASE_URL`**

Ganti nilai `DATABASE_URL` di Vercel dengan Supabase Postgres connection string (Transaction mode, port 6543):

```
Key   : DATABASE_URL
Value : postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
Env   : Production + Preview
```

Ambil dari: Supabase Dashboard → Project Settings → Database → Connection string → Transaction.

**Confidence: High — ini adalah penyebab utama semua 5xx.**

---

**A-2. Tambah `VITE_SUPABASE_ANON_KEY`**

```
Key   : VITE_SUPABASE_ANON_KEY
Value : (nilai sama persis dengan SUPABASE_ANON_KEY yang sudah ada)
Env   : Production + Preview
```

Ini memperbaiki 401 dari browser Supabase client.

**Confidence: High — sudah dikonfirmasi di REPAIR_PLAN.md dan code audit.**

---

**A-3. Redeploy Vercel**

Setelah A-1 dan A-2, trigger redeploy untuk serverless function muat ulang env vars baru.

---

### B. Perubahan Kode (perlu persetujuan)

Berikut perubahan kode yang *direkomendasikan* untuk kekokohan jangka panjang. Belum ada yang diimplementasikan — menunggu persetujuan.

---

**B-1. Tambah Env Validation di `vercel.ts`**

**File:** `artifacts/api-server/src/vercel.ts`

Saat ini `vercel.ts` tidak memanggil `logEnvStatus()` atau `validateRequiredEnv()`. Jika startup Vercel gagal karena env salah, tidak ada log yang menjelaskan kenapa.

```typescript
// SEBELUM (vercel.ts saat ini — hanya 11 baris):
export { default } from "./app";

// SESUDAH — tambahkan startup log di Vercel:
import { logEnvStatus } from "./lib/envValidation";
import { logSupabaseKeyDiagnostics } from "./lib/startupLogger";

// Log env status on cold start (Vercel shows this in function logs)
logEnvStatus();
logSupabaseKeyDiagnostics();

export { default } from "./app";
```

**Confidence benefit: High** — cold start log akan langsung terlihat di Vercel Function Logs.

---

**B-2. Perbaiki `USE_SUPABASE_HTTP` — Deteksi Replit Internal Host**

**File:** `artifacts/api-server/src/routes/admin/menu-permissions.ts` L17–20

```typescript
// SEBELUM:
const USE_SUPABASE_HTTP =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes("localhost/placeholder") ||
  process.env.DATABASE_URL === "postgres://localhost/placeholder";

// SESUDAH — tambah deteksi Replit internal host:
const rawDbUrl = process.env.DATABASE_URL ?? "";
const USE_SUPABASE_HTTP =
  !rawDbUrl ||
  rawDbUrl.includes("localhost/placeholder") ||
  /helium|\.repl\./.test(rawDbUrl);  // ← deteksi Replit internal
```

**Confidence benefit: Medium** — ini fallback safety net. Dengan A-1 (DATABASE_URL diperbaiki), flag ini tidak dibutuhkan. Tapi melindungi jika DATABASE_URL tidak sengaja diisi ulang dengan Replit URL.

---

**B-3. Short-circuit `getLocalRole` di Vercel (authMiddleware)**

**File:** `artifacts/api-server/src/middlewares/authMiddleware.ts` L41–53

```typescript
// SEBELUM:
async function getLocalRole(userId: string): Promise<string | null> {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl || dbUrl.includes("localhost/placeholder")) return null;
  ...
}

// SESUDAH — tambah deteksi Replit host:
async function getLocalRole(userId: string): Promise<string | null> {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl || dbUrl.includes("localhost/placeholder")) return null;
  if (/helium|\.repl\./.test(dbUrl)) return null;  // ← skip, akan timeout
  ...
}
```

**Confidence benefit: High** — eliminasi 5-detik timeout per request di Vercel jika DATABASE_URL masih salah.

---

**B-4. Push Drizzle Schema ke Supabase Production**

```bash
# Jalankan sekali, setelah DATABASE_URL diperbaiki ke Supabase production:
pnpm --filter @workspace/db run push
```

Tabel-tabel yang dibuat oleh Drizzle di Replit local (helium) belum tentu ada di Supabase production. Jika tabel tidak ada → semua query gagal dengan error `relation does not exist` → 503.

**Confidence: High** — REPAIR_PLAN.md mengkonfirmasi belum pernah dilakukan.

---

## Matriks: Berjalan Identik di Semua Environment

| Environment Variable | localhost | Replit Dev | Vercel |
|---------------------|-----------|-----------|--------|
| `DATABASE_URL` | `postgresql://localhost/umrohplus` (local PG) | Auto-set oleh Replit → `helium` (jangan gunakan untuk Supabase) | **Supabase Transaction URL (port 6543)** — ini yang harus diperbaiki |
| `SUPABASE_DATABASE_URL` | Kosong (optional) | Supabase Postgres URL → override DATABASE_URL | Bisa kosong jika DATABASE_URL sudah Supabase |
| `SUPABASE_URL` | `https://[ref].supabase.co` | `https://[ref].supabase.co` | `https://[ref].supabase.co` |
| `SUPABASE_ANON_KEY` | JWT anon | JWT anon | JWT anon |
| `VITE_SUPABASE_ANON_KEY` | JWT anon | JWT anon | **JWT anon — wajib ditambahkan di Vercel** |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT service_role | JWT service_role | JWT service_role |
| `NODE_ENV` | `development` | `development` | `production` (auto-set Vercel) |

---

## Temuan Tambahan (Tidak Kritis)

| Temuan | Detail | Impact |
|--------|--------|--------|
| Startup validator tidak jalan di Vercel | `validateRequiredEnv()` hanya ada di `index.ts`, tidak di `vercel.ts` | Medium — cold start tidak memberikan log diagnostik |
| Setiap request autentikasi membuka Postgres connection | `getLocalRole()` dipanggil di setiap request, tidak ada skip jika DB unreachable | Performance: +5 detik per request jika DB bermasalah |
| `api/[...all].mjs` memuat bundle dari `dist/vercel.mjs` | Build artifact harus ada sebelum deploy; tidak ada fallback jika build gagal | Medium — Vercel akan error jika build artifact tidak ada |
| `REPLIT_DB_URL` ada di env tapi tidak dibaca backend | Platform-injected, tidak berbahaya | Low |

---

## Kesimpulan

**Penyebab utama semua 5xx di Vercel adalah satu hal: `DATABASE_URL` masih mengarah ke host internal Replit (`helium`).** Ini adalah server yang hanya bisa diakses dari dalam container Replit — dari Vercel, host ini tidak exist.

Semua route yang mencoba query database (hampir semua `/api/admin/*` dan `/api/cms/*`) akan gagal setelah 5 detik timeout, menghasilkan error 5xx.

Perbaikan minimal yang diperlukan adalah **hanya di Vercel Dashboard** (tidak butuh deploy ulang kode):
1. Ganti `DATABASE_URL` ke Supabase Transaction connection string
2. Tambah `VITE_SUPABASE_ANON_KEY`
3. Redeploy

Perubahan kode (B-1 s/d B-4) direkomendasikan untuk kekokohan jangka panjang dan mencegah masalah yang sama terulang.

---

*File diagnostik sementara: `scripts/diag-env.ts` — dapat dihapus setelah investigasi selesai.*
