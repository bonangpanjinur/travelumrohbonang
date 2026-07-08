# Rencana Perbaikan — Analisis 2026-07-08

Dokumen ini merangkum hasil analisis bug/fitur sesuai permintaan dan urutan perbaikan.
Untuk latar belakang arsitektur lengkap lihat `MASTER_PROJECT_BLUEPRINT.md`, `PROJECT_ANALYSIS.md`, `AUTH_ARCHITECTURE.md`.

## Status: apa yang SUDAH diperbaiki di sesi ini

1. **Header/menu admin tidak konsisten per role**
   - `adminMenuConfig.ts`: item `Dashboard`, `Notifikasi`, `Website Utama` sebelumnya tidak punya
     pembatasan role sama sekali (tampil ke siapapun yang lolos ke `/admin`) → sekarang dibatasi ke role operasional.
   - Beberapa menu operasional (`Jemaah`, `Manifest`, `Check-In QR`, `Manasik Kit`, `Dokumen Jemaah`)
     memakai grup `ALL_STAFF` yang **tidak termasuk role `agent`**, padahal agent seharusnya bisa
     melihat data booking miliknya sendiri → diubah ke grup `OPERATIONAL` (termasuk agent).
   - Menu `Muthawif` sebelumnya hanya untuk `super_admin`/`admin`, padahal `branch_manager` biasanya
     perlu mengelola muthawif cabangnya → ditambahkan `branch_manager`.
   - Catatan lain (belum diubah, perlu keputusan bisnis): key label menu (`labelKey`) dipakai sebagai
     kunci lookup permission kustom di tabel `menu_permissions` — jika label diterjemahkan/diubah,
     override permission tersimpan bisa "hilang" secara diam-diam. Ini bukan bug tapi risiko rapuh.

2. **Data fetching tidak efektif (N+1 query)**
   - `GET /api/admin/departures` dan `GET /api/admin/packages/:id`: sebelumnya melakukan 1 query
     terpisah ke `departure_prices` untuk **setiap** baris departure (N+1). Sekarang di-batch jadi
     1 query pakai `inArray(...)`. Berdampak langsung pada kecepatan halaman Keberangkatan & Detail Paket.

## Temuan KRITIS yang butuh keputusan/akses dari Anda

### A. Backend admin (Drizzle) tersambung ke database yang SALAH

- Aplikasi ini didesain memakai **satu** database: Postgres milik proyek Supabase Anda. Kode `lib/db`
  bahkan sudah punya logic khusus untuk mendeteksi & mengatur SSL bila `DATABASE_URL` adalah URL Supabase.
- Tapi saat proyek ini di-import ke Replit, Replit otomatis menyediakan Postgres miliknya sendiri dan
  mengikat itu ke variabel `DATABASE_URL` — **bukan** Postgres Supabase Anda.
- Saya cek: database Replit itu (yang sekarang dipakai oleh seluruh route `/api/admin/*` via Drizzle)
  **kosong total, tidak ada satupun tabel**. Artinya seluruh CRUD admin (paket, booking, dsb yang lewat
  Drizzle) akan gagal dengan error "relation does not exist" begitu ada yang login dan memakainya.
- Sementara itu, halaman publik (dan sebagian panel admin) memanggil Supabase langsung lewat
  `supabase-js`/PostgREST — itu yang berisi data asli Anda. Jadi ada "split-brain": dua database
  berbeda yang harusnya satu.
- **Perbaikan**: saya akan membuat `lib/db` memakai variabel baru `SUPABASE_DATABASE_URL` (connection
  string Postgres langsung dari dashboard Supabase Anda) jika tersedia, baru fallback ke `DATABASE_URL`
  bawaan Replit. Ini tidak mengubah perilaku di Vercel (di sana `DATABASE_URL` memang sudah diisi manual
  ke Supabase). Saya butuh connection string tersebut dari Anda (lihat pertanyaan di chat).

### B. Tabel `packages` di Supabase kehilangan semua foreign key yang diharapkan

- Query utama untuk menampilkan paket di beranda (join ke `package_categories`, `hotels`, `airlines`,
  `airports`, `package_departures`) **gagal dengan HTTP 400** langsung dari Supabase karena PostgREST
  tidak menemukan relasi/FK constraint yang diharapkan (`packages_hotel_makkah_id_fkey`, dsb).
- Ini artinya **kolom-kolom foreign key ada** di tabel `packages`, tapi **constraint FK aslinya di
  database tidak pernah dibuat** — kemungkinan skema Drizzle sudah didefinisikan di kode tapi migration-nya
  belum pernah dijalankan ke Supabase.
- Dampak nyata: **daftar paket di halaman utama (`PackagesPreview`) tidak akan pernah tampil** selama
  bug ini belum diperbaiki — ini kemungkinan besar salah satu penyebab "data terasa tidak beres" yang
  Anda rasakan.
- **Perbaikan**: setelah saya punya akses koneksi database Supabase (lihat poin A), saya akan menjalankan
  SQL untuk menambahkan FK constraint yang hilang, lalu memverifikasi query beranda kembali normal.

## Temuan lain (severity medium, direncanakan setelah akses DB tersedia)

- Beberapa halaman admin (mis. `AnalyticsDashboard.tsx`) mengambil data lewat banyak query Supabase
  paralel di sisi client lalu mengagregasi sendiri di JS — seharusnya satu query agregasi SQL di server.
- Beberapa lookup individual (mis. `BookingDetailPanel.tsx`) melakukan fetch satu-per-satu untuk data
  yang bisa digabung — dampak kecil, prioritas rendah.
- Beberapa route admin (`packages`) memakai middleware `requireStaff` yang mengizinkan role `staff`
  ikut membuat/mengubah paket — perlu dikonfirmasi apakah ini memang kebijakan bisnis yang diinginkan
  atau seharusnya dibatasi ke admin saja.

## Yang saya butuhkan dari Anda untuk lanjut

1. Connection string Postgres langsung dari Supabase (Project Settings → Database → Connection string,
   pilih mode **Session/Direct**, bukan Transaction pooler 6543, untuk pemakaian dev di Replit).
2. `SUPABASE_SERVICE_ROLE_KEY` proyek Supabase Anda (Project Settings → API) — dipakai backend untuk
   forward request REST tertentu dengan akses penuh, saat ini belum diisi di Replit.

Kedua nilai ini akan disimpan sebagai Replit Secret, tidak pernah saya tampilkan.
