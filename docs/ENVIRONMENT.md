# ENVIRONMENT.md
> Semua environment variables — frontend, backend, required, optional.
> Terakhir diperbarui: 2026-07-08

---

## ⚠️ Aturan Penting

1. **Variabel `VITE_*` otomatis di-bundle ke frontend** (JavaScript di browser). Jangan pernah menaruh secret/private key di variabel `VITE_*`.
2. **`SUPABASE_SERVICE_ROLE_KEY` tidak boleh prefix `VITE_`** — key ini memberikan akses penuh ke database, harus tetap di backend saja.
3. **`DATABASE_URL`** dikelola otomatis oleh Replit. Jangan set manual kecuali ada alasan khusus.

---

## Setup Cepat (Minimum Required)

Variabel minimum yang harus di-set agar app bisa berjalan:

```bash
# Supabase project URL (bisa dilihat di Supabase dashboard → Settings → API)
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co

# Supabase anon key (public, aman di frontend)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase service role key (RAHASIA — backend only, jangan prefix VITE_!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# DATABASE_URL → sudah dikelola Replit (tidak perlu di-set manual)
```

---

## Tabel Lengkap

### Core — Wajib Ada

| Variable | Frontend | Backend | Required | Keterangan |
|----------|:--------:|:-------:|:--------:|------------|
| `VITE_SUPABASE_URL` | ✅ | ✅ fallback | **YES** | URL project Supabase. Contoh: `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | ✅ fallback | **YES** | Public anon key dari Supabase dashboard. Aman di frontend. |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | ✅ | **YES** | Service role key — akses penuh database. **RAHASIA.** Jangan prefix `VITE_`. |
| `DATABASE_URL` | ❌ | ✅ | **YES** | PostgreSQL connection string. **Dikelola otomatis oleh Replit.** |

---

### API — Opsional tapi Direkomendasikan

| Variable | Frontend | Backend | Required | Keterangan |
|----------|:--------:|:-------:|:--------:|------------|
| `VITE_API_URL` | ✅ | ❌ | No | Base URL untuk API calls. Kosongkan jika frontend dan backend di domain yang sama (same-origin). Di Replit dev: `http://localhost:8080` |

---

### Backend-Specific — Opsional

| Variable | Frontend | Backend | Required | Keterangan |
|----------|:--------:|:-------:|:--------:|------------|
| `SUPABASE_URL` | ❌ | ✅ | No | Backend-specific Supabase URL. Jika tidak di-set, fallback ke `VITE_SUPABASE_URL`. |
| `SUPABASE_ANON_KEY` | ❌ | ✅ | No | Backend-specific anon key. Jika tidak di-set, fallback ke `VITE_SUPABASE_ANON_KEY`. |
| `NODE_ENV` | ✅ | ✅ | No | `development` atau `production`. Toggle dev features (verbose CORS, error stacks, debug logs). |
| `PORT` | ❌ | ✅ | No | Port untuk API server. Default: `8080`. Di Replit: diset otomatis via workflow config. |

---

### Scripts — Hanya untuk Deploy/Migration Scripts

| Variable | Frontend | Backend | Scripts | Keterangan |
|----------|:--------:|:-------:|:-------:|------------|
| `VITE_SUPABASE_PROJECT_ID` | ✅ | ❌ | ✅ | Supabase project ref ID. Dipakai `push-to-supabase.mjs`. |
| `SUPABASE_PROJECT_REF` | ❌ | ❌ | ✅ | Alternatif untuk project ref. Dipakai `push-to-supabase.mjs`. |
| `SUPABASE_ACCESS_TOKEN` | ❌ | ❌ | ✅ | Supabase CLI access token untuk deploy schema. Bukan JWT user. |

---

### Tidak Dipakai / Deprecated

| Variable | Status | Keterangan |
|----------|--------|------------|
| `SESSION_SECRET` | ⚠️ Unused | Ada di Replit Secrets tapi tidak dipakai di kode manapun. Perlu diverifikasi: hapus jika tidak dibutuhkan. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 🔴 Deprecated | Sudah tidak dipakai. Digantikan `VITE_SUPABASE_ANON_KEY`. |

---

## Cara Set di Replit

1. Buka tab **Secrets** di sidebar Replit (ikon kunci 🔒)
2. Klik **+ New secret**
3. Masukkan nama dan nilai variabel
4. Klik **Add secret**

> ⚠️ Secrets di Replit tersedia sebagai `process.env.NAMA_VAR` di backend Node.js, dan harus di-prefix `VITE_` untuk tersedia di Vite frontend sebagai `import.meta.env.VITE_NAMA_VAR`.

---

## Cara Set di Vercel (Production)

1. Buka project di Vercel dashboard
2. Pergi ke **Settings → Environment Variables**
3. Tambahkan setiap variabel dengan value yang sesuai
4. Pilih environment: `Production`, `Preview`, atau `Development`
5. Deploy ulang setelah menambah variabel baru

> ⚠️ Untuk Vercel, `DATABASE_URL` **tidak disediakan otomatis**. Gunakan Supabase PostgreSQL connection string atau Replit external DB URL sebagai nilainya.

---

## Cara Verifikasi (sebelum deploy)

Jalankan script verifikasi yang sudah ada:

```bash
node scripts/verify-deploy-env.mjs
```

Script ini akan check semua required env vars dan report mana yang missing.

---

## Perbedaan Dev vs Production

| Aspek | Development (Replit) | Production (Vercel) |
|-------|---------------------|---------------------|
| `DATABASE_URL` | Auto dari Replit | Harus di-set manual (Supabase DB URL) |
| `VITE_API_URL` | `http://localhost:8080` | Kosong atau URL Vercel |
| `NODE_ENV` | `development` | `production` |
| Secrets sumber | Replit Secrets | Vercel Environment Variables |
| CORS | Lebih permissive | Strict (hanya origin production) |
| Error stack traces | Ditampilkan | Disembunyikan |

---

## Environment Variables di Kode

### Frontend (`import.meta.env.VITE_*`)
```typescript
// artifacts/umroh-app/src/shared/integrations/supabase/client.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// artifacts/umroh-app/src/shared/lib/apiClient.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
```

### Backend (`process.env.*`)
```typescript
// artifacts/api-server/src/lib/supabase.ts
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// lib/db/src/index.ts
const databaseUrl = process.env.DATABASE_URL;

// artifacts/api-server/src/index.ts
const port = process.env.PORT || 8080;
```
