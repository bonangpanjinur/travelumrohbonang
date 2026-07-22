# Rencana Perbaikan — Console Error Operasional
> Dibuat: 22 Juli 2026  
> Sumber: Browser console log produksi (vinstourtravel.com)

---

## Ringkasan Temuan

Dari 74 baris error log, ada **3 akar masalah** berbeda yang menghasilkan 5 jenis error. Semua bisa diperbaiki tanpa refactor besar.

---

## Error #1 — Supabase 401 Unauthorized (spam HEAD request)
**Tingkat keparahan: 🟡 Medium — noise tinggi, mengganggu monitoring**

### Gejala
```
HEAD https://yakjpqqobknrmhfmybhe.supabase.co/rest/v1/ net::ERR_ABORTED 401 (Unauthorized)
```
Muncul **22+ kali** dalam satu sesi — ini adalah spam, bukan satu kejadian.

### Akar Masalah
`useSupabaseHealth.ts` melakukan HTTP HEAD ping ke Supabase setiap **30 detik** untuk cek konektivitas. Ping ini menggunakan `VITE_SUPABASE_ANON_KEY`, tapi di environment production key tersebut menggunakan nilai default `'placeholder-anon-key'` — sehingga Supabase menolaknya dengan 401.

Selain itu, frontend di beberapa halaman masih **memanggil Supabase REST API langsung** (bukan lewat `/api/...` backend), padahal arsitektur sudah bergeser ke API server. Calls ini juga gagal dengan 401 yang sama.

### Perbaikan
| # | Aksi | File |
|---|------|------|
| 1a | Set `VITE_SUPABASE_ANON_KEY` di environment secrets production | Replit Secrets |
| 1b | Atau: nonaktifkan health-check ping jika fitur ini belum dipakai di UI | `useSupabaseHealth.ts` |
| 1c | Audit halaman yang masih call Supabase langsung → migrasikan ke `apiFetch()` | Cari `supabase.from(` di frontend |

---

## Error #2 — `/api/admin/departures` 503 Service Unavailable (root cause utama)
**Tingkat keparahan: 🔴 Critical — fitur departures/itinerary lumpuh total**

### Gejala
```
GET https://www.vinstourtravel.com/api/admin/departures 503 (Service Unavailable)
```
Muncul **25+ kali**. Halaman Departures, Itinerary, dan semua fitur yang bergantung pada data departure tidak bisa load.

### Akar Masalah
Error message detail terlihat di baris 35–36 log:
```
[itineraries] departures fetch error: Error: Failed query: 
  select ... from "package_departures" left join "packages" ...
— Kolom belum ada di database production. 
  Jalankan drizzle-kit push ke Supabase production atau tambahkan kolom yang hilang via SQL
```

Server (`adminApiError.ts`) menangkap error PostgreSQL **kode 42703** ("column does not exist") dan mengembalikannya sebagai HTTP 503. Artinya: **skema Drizzle di kode sudah di-update (ada kolom/tabel baru), tapi migration belum dijalankan ke database production Supabase.**

Kolom yang kemungkinan hilang (berdasarkan query di departures.ts):
- `package_departures.muthawif_id`
- `package_departures.airline_id`  
- `package_departures.flight_number`
- `package_departures.departure_airport_id`
- `package_departures.arrival_airport_id`

### Perbaikan
| # | Aksi | Perintah |
|---|------|----------|
| 2a | **[Utama]** Jalankan schema push ke Supabase production | `cd lib/db && pnpm drizzle-kit push` (dengan `DATABASE_URL` production) |
| 2b | Atau: generate SQL migration dan jalankan manual via Supabase SQL Editor | `pnpm drizzle-kit generate` lalu copy SQL-nya |
| 2c | Setelah push, verifikasi dengan `SELECT column_name FROM information_schema.columns WHERE table_name = 'package_departures'` | Supabase SQL Editor |

> ⚠️ **Hati-hati**: `drizzle-kit push` ke production bisa destructive jika ada kolom yang dihapus dari skema. Gunakan `drizzle-kit generate` + review SQL-nya dulu sebelum apply.

---

## Error #3 — `/api/admin/visa` 503 Service Unavailable
**Tingkat keparahan: 🔴 Critical — fitur manajemen visa tidak bisa diakses**

### Gejala
```
/api/admin/visa?: 503 (Service Unavailable)
```

### Akar Masalah
**Pola yang sama dengan Error #2** — tabel atau kolom visa di production DB belum di-update. Kemungkinan tabel `visa_applications` atau kolom-kolom baru di dalamnya belum ada di production.

### Perbaikan
Sama dengan perbaikan #2a — satu kali `drizzle-kit push` akan memperbaiki Error #2 dan #3 sekaligus.

---

## Error #4 — `/api/admin/incident-reports` 500 Internal Server Error
**Tingkat keparahan: 🟠 High — fitur incident management error**

### Gejala
```
/api/admin/incident-reports: 500 (Internal Server Error)
```

### Akar Masalah
Status 500 (bukan 503) mengindikasikan **error yang tidak ter-handle** di route handler. Kemungkinan penyebab:
1. Tabel `incident_reports` **belum ada sama sekali** di production (bukan sekadar missing column) — ini menyebabkan error di luar cakupan `sendAdminError` classifier
2. Ada import atau dependency yang gagal di handler tersebut

### Perbaikan
| # | Aksi |
|---|------|
| 4a | Jalankan `drizzle-kit push` (lihat #2a) — jika tabel `incident_reports` baru ditambahkan, ini akan membuatnya |
| 4b | Tambahkan try-catch yang proper di `incidentReports.ts` router jika belum ada |
| 4c | Cek Supabase SQL Editor: `SELECT to_regclass('public.incident_reports')` — null berarti tabel belum ada |

---

## Error #5 — `VITE_SENTRY_DSN not set`
**Tingkat keparahan: ⚪ Info — tidak berdampak ke fungsionalitas**

### Gejala
```
[sentry] VITE_SENTRY_DSN not set — Sentry disabled.
```

### Akar Masalah
Variabel env `VITE_SENTRY_DSN` tidak di-set. Sentry otomatis dinonaktifkan — app tetap jalan normal.

### Perbaikan
| Opsi | Aksi |
|------|------|
| Jika mau pakai Sentry | Daftar di sentry.io, buat project, set `VITE_SENTRY_DSN` di Vercel env vars |
| Jika tidak mau pakai | Hapus inisialisasi Sentry dari kode agar pesan ini tidak muncul |

---

## Urutan Perbaikan yang Disarankan

```
Prioritas 1 (Hari ini — production lumpuh):
  → Perbaikan #2a: drizzle-kit push ke production DB
    └─ Ini sekaligus fix Error #2 (departures 503), #3 (visa 503), #4 (incident 500)

Prioritas 2 (Segera — noise monitoring):
  → Perbaikan #1a: Set VITE_SUPABASE_ANON_KEY di production env
    └─ Atau #1b: Matikan health-check ping sementara

Prioritas 3 (Low priority):
  → Perbaikan #5: Set VITE_SENTRY_DSN atau hapus Sentry init
```

---

## Checklist Verifikasi Setelah Perbaikan

- [ ] `GET /api/admin/departures` → 200 OK
- [ ] `GET /api/admin/visa` → 200 OK  
- [ ] `GET /api/admin/incident-reports` → 200 OK
- [ ] Tidak ada lagi 401 spam dari HEAD Supabase ping
- [ ] Halaman Departures/Itinerary bisa load data
- [ ] Halaman Visa bisa load data
- [ ] Halaman Incident Reports bisa load data
