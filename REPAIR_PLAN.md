# Rencana Perbaikan Production — UmrohPlus / VinsTravel

> Dibuat: 18 Juli 2026  
> Status saat ini: Semua `/api/admin/*` dan `/api/cms/*` return **500** di `www.vinstourtravel.com`

---

## Ringkasan Masalah

Semua API route di production gagal karena **dua akar masalah utama** yang saling berkaitan:

| # | Masalah | Dampak | Status |
|---|---------|--------|--------|
| 1 | `DATABASE_URL` di Vercel mengarah ke host Replit internal (`helium`) yang tidak bisa dijangkau dari Vercel | Semua `/api/admin/*` dan `/api/cms/*` → 500 | ⚠️ Perlu aksi user di Vercel |
| 2 | `VITE_SUPABASE_ANON_KEY` tidak ada di Vercel (hanya ada `SUPABASE_ANON_KEY` tanpa prefix `VITE_`) | Supabase client di browser gagal init → 401 | ⚠️ Perlu aksi user di Vercel |
| 3 | Schema Drizzle belum pernah di-push ke database Supabase production | Tabel tidak ada → semua query gagal | ⚠️ Perlu `drizzle-kit push` |
| 4 | REST shim (`/rest/v1/*`) tidak mendeteksi URL Replit internal → tidak fallback ke Supabase HTTP | Route CMS via REST shim → 500/503 | ✅ Sudah diperbaiki di kode |

---

## Bagian A — Aksi di Vercel (dilakukan oleh Anda)

Buka **Vercel Dashboard → Project → Settings → Environment Variables**.

### A-1. Tambah `VITE_SUPABASE_ANON_KEY`

Vite hanya mengekspos env var dengan prefix `VITE_` ke browser. Saat ini Vercel hanya punya `SUPABASE_ANON_KEY` — frontend tidak bisa membacanya.

```
Key   : VITE_SUPABASE_ANON_KEY
Value : (nilai yang sama persis dengan SUPABASE_ANON_KEY Anda)
Env   : Production + Preview
```

**Dampak tanpa ini:** Supabase JS client di browser tidak bisa init → semua permintaan ke `supabase.co/rest/v1/` gagal 401, sesi login tidak bisa dibaca.

---

### A-2. Perbaiki `DATABASE_URL`

`DATABASE_URL` di Vercel saat ini kemungkinan masih berisi URL Replit internal (host `helium`) yang tidak bisa diakses dari Vercel. Ganti dengan Supabase Postgres connection string.

**Cara ambil nilai yang benar:**
1. Buka [supabase.com/dashboard](https://supabase.com/dashboard) → pilih project **Vins Travel**
2. Klik **Project Settings** → **Database** → tab **Connection string**
3. Pilih mode **Transaction** (port `6543`, untuk Vercel Serverless)
4. Copy URI-nya

```
Key   : DATABASE_URL
Value : postgresql://postgres.yakjpqqobknrmhfmybhe:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
Env   : Production + Preview
```

> ⚠️ Jangan pakai port `5432` (Session mode) — Vercel serverless tidak mendukung persistent connection.

---

### A-3. Redeploy Vercel

Vercel **tidak otomatis redeploy** saat env var diubah. Setelah A-1 dan A-2 selesai:

1. Buka tab **Deployments**
2. Klik tombol **⋯** di deployment terakhir → **Redeploy**
3. Centang **"Use existing build cache"** agar cepat
4. Tunggu status berubah ke **Ready**

---

## Bagian B — Aksi di Replit (dilakukan oleh saya / agent)

### B-1. ✅ Sudah Selesai — Perbaikan `USE_SUPABASE_HTTP` di REST shim

**File:** `artifacts/api-server/src/routes/rest.ts` baris 53–90

**Masalah lama:**
```typescript
const USE_SUPABASE_HTTP =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes("localhost/placeholder");
```
Jika `DATABASE_URL` diisi URL Replit (`helium`), nilai tetap `false` → REST shim mencoba konek ke `helium` dari Vercel → timeout 5 detik → 500.

**Perbaikan yang sudah diterapkan:**
```typescript
function _isLocalOnlyDbHost(url: string): boolean {
  const host = new URL(url).hostname;
  return host === "helium" || host === "localhost" || host.endsWith(".internal");
}
const _effectiveDbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "";
const USE_SUPABASE_HTTP =
  !_effectiveDbUrl ||
  _effectiveDbUrl.includes("localhost/placeholder") ||
  _isLocalOnlyDbHost(_effectiveDbUrl);
```
Sekarang jika `DATABASE_URL` berisi `helium`, REST shim otomatis fallback ke Supabase HTTP API.

---

### B-2. Push Schema Drizzle ke Supabase Production

**Masalah:** Supabase project menunjukkan "No migrations" — tabel-tabel yang didefinisikan di Drizzle schema (`lib/db/src/schema/`) belum pernah dibuat di database Supabase production. Semua route yang menyentuh DB akan gagal dengan `relation "X" does not exist`.

**Tabel yang perlu dibuat** (dari schema Drizzle):
`agents`, `bookings`, `cms` (site_settings, blog_posts, dll), `contracts`, `crm`, `itineraries`, `logs`, `manifests`, `masterdata` (hotels, airlines, airports, muthawifs), `packages`, `payments`, `pilgrim_equipment`, `pilgrims`, `profiles`, `seo`, `tenant`

**Cara eksekusi (membutuhkan secret):**

Tambahkan secret `SUPABASE_DATABASE_URL` di Replit (klik 🔒 di sidebar) dengan nilai connection string dari langkah A-2, kemudian saya jalankan:

```bash
DATABASE_URL=$SUPABASE_DATABASE_URL pnpm --filter @workspace/db drizzle-kit push
```

Alternatif jika tidak ingin via Replit — jalankan dari terminal lokal:
```bash
DATABASE_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres" \
  pnpm --filter @workspace/db drizzle-kit push
```

---

### B-3. Verifikasi Schema Konsisten dengan Kode

Beberapa route menggunakan nama kolom/tabel yang baru direfaktor. Perlu diverifikasi bahwa schema Drizzle cocok dengan query di route berikut:

| File route | Kolom/tabel yang diperbaiki | Perlu dikonfirmasi |
|---|---|---|
| `routes/admin/equipment-report.ts` | Tabel `equipment` (bukan `equipment_items`), kolom `equipment_id` (bukan `equipment_item_id`) | ✅ Kode sudah benar |
| `routes/admin/itineraries.ts` | Import `inArray` dari `@workspace/db` | ✅ Kode sudah benar |
| `routes/admin/room-assignment.ts` | Join `booking_pilgrims` ↔ `bookings` | ✅ Kode sudah benar |
| `routes/admin/pilgrims.ts` | Route `/check-ins` join `check_ins` tabel | Perlu konfirmasi tabel `check_ins` ada di schema |

---

### B-4. Tambahkan Migration File ke Supabase (Opsional)

Saat ini ada 5 file SQL di `supabase/migrations/` tetapi belum diaplikasikan ke Supabase (karena kita pakai `drizzle-kit push`). Jika ingin menggunakan Supabase migration system untuk tracking perubahan schema di masa depan, file-file ini perlu diaplikasikan via:

```bash
supabase db push
```

Ini **opsional** dan tidak memblokir perbaikan sekarang.

---

## Urutan Eksekusi yang Disarankan

```
1. [USER]    Tambah VITE_SUPABASE_ANON_KEY di Vercel           → A-1
2. [USER]    Perbaiki DATABASE_URL di Vercel ke Supabase URL   → A-2
3. [REPLIT]  Push schema Drizzle ke Supabase production        → B-2 (butuh secret SUPABASE_DATABASE_URL)
4. [USER]    Redeploy Vercel                                   → A-3
5. [REPLIT]  Verifikasi semua route via curl ke production      → post-check
```

---

## Verifikasi Setelah Semua Fix

Setelah deploy ulang, jalankan curl checks berikut (atau buka di browser):

```bash
# Harus return JSON, bukan 500
curl https://www.vinstourtravel.com/api/cms/site-settings
curl https://www.vinstourtravel.com/api/packages?active=true

# Harus return JSON (butuh auth token)
curl -H "Authorization: Bearer <token>" https://www.vinstourtravel.com/api/admin/menu-permissions/my
curl -H "Authorization: Bearer <token>" https://www.vinstourtravel.com/api/admin/bookings?limit=5
```

---

## Checklist Final

- [ ] `VITE_SUPABASE_ANON_KEY` ditambahkan di Vercel
- [ ] `DATABASE_URL` di Vercel diubah ke Supabase Transaction pooler URL (port 6543)
- [ ] `drizzle-kit push` dijalankan ke database Supabase production
- [ ] Vercel di-redeploy setelah semua env fix
- [ ] `/api/cms/site-settings` return 200
- [ ] `/api/admin/bookings` return 200 (dengan auth token)
- [ ] Browser tidak menampilkan 401 dari `supabase.co/rest/v1/`
