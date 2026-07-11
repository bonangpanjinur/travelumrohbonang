# Tutorial Deploy: Vercel + Supabase

Panduan lengkap untuk menghubungkan repository ini ke Supabase (database & auth) dan men-deploy ke Vercel (hosting).

---

## Gambaran Arsitektur

```
Browser → Vercel (frontend React + API Function)
                    ↕
              Supabase (Auth + PostgreSQL)
```

- **Frontend** (React/Vite) dan **Backend** (Express) di-deploy ke satu domain Vercel.
- Semua request `/api/*`, `/rest/v1/*`, `/storage/v1/*` diarahkan ke Express function.
- Auth sepenuhnya pakai Supabase JWT — tidak ada auth tambahan dari Vercel.

---

## Bagian 1 — Setup Supabase

### 1.1 Buat Project Supabase

1. Buka [supabase.com](https://supabase.com) → **New project**
2. Isi nama project, pilih region terdekat (mis. `Southeast Asia`), set password database
3. Tunggu project selesai dibuat (~2 menit)

### 1.2 Catat Credentials

Buka **Project Settings → API**, catat:

| Nama | Lokasi | Dipakai untuk |
|------|--------|---------------|
| `VITE_SUPABASE_URL` | Project URL | Frontend + Backend |
| `VITE_SUPABASE_ANON_KEY` | `anon` / `public` key | Frontend + Backend |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key | Backend only (rahasia!) |
| `VITE_SUPABASE_PROJECT_ID` | Subdomain dari URL (bagian `xxxxx` dari `https://xxxxx.supabase.co`) | Frontend |

Buka **Project Settings → Database → Connection string → URI**, pilih mode **Transaction (port 6543)**:

| Nama | Keterangan |
|------|------------|
| `DATABASE_URL` | Connection string dengan port **6543** (Transaction mode — wajib untuk serverless) |

> ⚠️ **Jangan** pakai port 5432 (Session mode) — akan timeout di Vercel serverless.

### 1.3 Setup Schema Database

Ada dua cara, pilih salah satu:

#### Cara A — Via Supabase SQL Editor (direkomendasikan)

1. Buka **SQL Editor** di Supabase Dashboard
2. Klik **New query**
3. Copy-paste isi file `sql/schema/supabase-schema.sql` → **Run**
4. Untuk data awal (opsional), jalankan juga `sql/seeds/supabase-seed-prod.sql`

#### Cara B — Via Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ke project (gunakan Project ID dari dashboard)
supabase link --project-ref <YOUR_PROJECT_ID>

# Push schema
supabase db push
```

### 1.4 Setup Row Level Security (RLS)

Setelah schema terpasang, pastikan RLS aktif. Di **SQL Editor**, jalankan:

```sql
-- Cek tabel mana yang belum aktif RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

RLS sudah dikonfigurasi di schema file — pastikan tidak ada error saat menjalankan file tersebut.

### 1.5 Setup JWT Hook (untuk Role-Based Access)

Agar role user (admin/agent/buyer) terbaca di JWT:

1. Buka **Authentication → Hooks**
2. Tambah hook baru:
   - **Event**: `custom_access_token`
   - **Type**: PostgreSQL function
   - **Function**: `custom_jwt_claims` (sudah ada di schema)

---

## Bagian 2 — Hubungkan Repository ke Vercel

### 2.1 Push ke GitHub (jika belum)

```bash
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

### 2.2 Import ke Vercel

1. Buka [vercel.com](https://vercel.com) → **Add New → Project**
2. Pilih repository GitHub Anda
3. Vercel akan otomatis mendeteksi konfigurasi dari `vercel.json`

> ✅ Vercel sudah dikonfigurasi via `vercel.json` — **jangan ubah** Build Command dan Output Directory di dashboard Vercel, biarkan diambil dari file.

Verifikasi setting yang muncul:
- **Build Command**: `pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/umroh-app run build`
- **Output Directory**: `artifacts/umroh-app/dist/public`
- **Framework Preset**: Other

### 2.3 Set Environment Variables di Vercel

Di halaman import (atau **Project Settings → Environment Variables**), tambahkan semua variabel berikut:

#### Wajib (deploy gagal tanpa ini)

| Key | Value | Env |
|-----|-------|-----|
| `DATABASE_URL` | Connection string Supabase port **6543** | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key dari Supabase | Production, Preview |
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | anon key dari Supabase | Production, Preview |
| `VITE_SUPABASE_PROJECT_ID` | subdomain project (mis. `xxxxx`) | Production, Preview |

#### Direkomendasikan

| Key | Value | Keterangan |
|-----|-------|------------|
| `ALLOWED_ORIGINS` | `https://domain-anda.vercel.app` | CORS — pisahkan dengan koma jika lebih dari satu domain |
| `ADMIN_EMAILS` | `admin@email.com` | Email yang dapat akses admin panel |
| `SESSION_SECRET` | string random panjang (min 32 karakter) | Keamanan session |
| `CRON_SECRET` | string random | Melindungi endpoint health-check |

#### Opsional

| Key | Value | Keterangan |
|-----|-------|------------|
| `VITE_SENTRY_DSN` | DSN dari Sentry | Error monitoring |
| `VITE_TURNSTILE_SITE_KEY` | Key dari Cloudflare | CAPTCHA di form login |
| `LOG_LEVEL` | `info` | Level log (debug/info/warn/error) |
| `MIDTRANS_SERVER_KEY` | Key Midtrans | Payment gateway |
| `XENDIT_API_KEY` | Key Xendit | Payment gateway |
| `XENDIT_WEBHOOK_TOKEN` | Token Xendit | Verifikasi webhook payment |

> 💡 `VITE_API_URL` **dikosongkan** di Vercel — frontend dan API satu domain, tidak perlu diisi.

### 2.4 Deploy

Klik **Deploy**. Proses pertama biasanya ~3-5 menit.

---

## Bagian 3 — Konfigurasi Supabase Auth

### 3.1 Set Redirect URL

Di Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://domain-anda.vercel.app`
- **Redirect URLs**: tambahkan:
  ```
  https://domain-anda.vercel.app/**
  https://*.vercel.app/**
  ```

### 3.2 Aktifkan Provider yang Dibutuhkan

Di **Authentication → Providers**:
- **Email** — aktifkan (biasanya sudah aktif)
- Provider lain (Google, dll) — aktifkan sesuai kebutuhan

---

## Bagian 4 — Verifikasi Setelah Deploy

### 4.1 Cek via Script Bawaan

```bash
# Install Vercel CLI
npm i -g vercel

# Pull env production ke local
vercel env pull .env.vercel

# Jalankan script verifikasi
node -r dotenv/config scripts/verify-deploy-env.mjs dotenv_config_path=.env.vercel
```

Output yang diharapkan:
```
✅ Semua environment variable wajib sudah lengkap. Aman untuk deploy ke Vercel.
```

### 4.2 Cek Health Endpoint

Setelah deploy, buka:
```
https://domain-anda.vercel.app/api/health
```

Response yang benar:
```json
{ "status": "ok", "env": "production" }
```

### 4.3 Checklist Manual

- [ ] Homepage terbuka tanpa error di browser
- [ ] `/api/health` mengembalikan `status: ok`
- [ ] Halaman login berfungsi (register + login)
- [ ] Setelah login sebagai admin, menu Admin Panel muncul
- [ ] Data packages/paket umroh tampil di halaman Paket Perjalanan

---

## Troubleshooting Umum

### Build gagal: "Cannot find module"
→ Pastikan `pnpm-lock.yaml` ter-commit ke repository. Vercel butuh lockfile untuk install dependencies.

### API 500 setelah deploy
→ Cek Vercel Function Logs di dashboard. Biasanya `DATABASE_URL` salah port (pakai 5432 bukan 6543) atau `SUPABASE_SERVICE_ROLE_KEY` belum diisi.

### Login gagal / redirect loop
→ Periksa **Supabase → Authentication → URL Configuration** — pastikan domain Vercel sudah ditambahkan ke Redirect URLs.

### Role admin tidak terbaca (selalu "buyer")
→ JWT Hook belum diaktifkan. Ulangi langkah 1.5 dan pastikan function `custom_jwt_claims` ada di database.

### CORS error di browser
→ Set `ALLOWED_ORIGINS` di Vercel env dengan domain production yang benar.
