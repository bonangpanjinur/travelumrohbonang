# Rencana Perbaikan Menu Operasional — UmrohPlus

> Tanggal analisis: 18 Juli 2026  
> Berdasarkan: inspeksi kode frontend (`artifacts/umroh-app`), backend (`artifacts/api-server`), dan schema DB (`lib/db/src/schema`)

---

## Ringkasan Temuan

| Menu | Bug UI | Fitur Kurang | Relasi DB Bermasalah |
|------|--------|--------------|----------------------|
| Paket Umroh | ⚠️ 2 | ⚠️ 1 | ✅ OK |
| Keberangkatan | 🔴 3 | ⚠️ 2 | 🔴 1 |
| Itinerary | ⚠️ 2 | ⚠️ 2 | ⚠️ 1 |
| Booking | 🔴 2 | ⚠️ 3 | 🔴 2 |
| Jemaah | 🔴 3 | 🔴 2 | 🔴 2 |
| Manifest | ⚠️ 2 | ⚠️ 2 | 🔴 1 |
| Perlengkapan | ⚠️ 2 | 🔴 3 | 🔴 1 (KRITIS) |

---

## 1. BOOKING

### 🔴 Bug & Masalah UI

**BK-01 — Halaman Booking Kosong (Tampilan)**  
- Halaman menampilkan "Belum ada booking" meski data sudah ada di DB  
- Root cause: Filter tanggal (`date_from`/`date_to`) dikirim ke API tapi format `mm/dd/yyyy` dari date-input browser tidak di-parse dengan benar di backend  
- File: `artifacts/umroh-app/src/features/admin/pages/Bookings.tsx`, `artifacts/api-server/src/routes/admin/bookings.ts`  
- **Fix**: Normalisasi format tanggal ke ISO 8601 (`yyyy-mm-dd`) sebelum dikirim ke API, atau hapus filter default agar semua booking tampil saat pertama buka

**BK-02 — Export Excel Tidak Jalan di Semua Environment**  
- Tombol "Export Excel" hardcode ke `/api/admin/bookings/export.xlsx`  
- Jika `VITE_API_URL` tidak di-set, URL menjadi relative dan bisa menghit route yang salah  
- File: `artifacts/umroh-app/src/features/admin/pages/Bookings.tsx`  
- **Fix**: Gunakan `apiFetch`/`getApiUrl()` helper yang sudah ada, bukan URL hardcode

**BK-03 — Tidak Ada Status History di UI**  
- Admin bisa ubah status booking (pending → confirmed → completed) tapi tidak ada log/history perubahan yang terlihat  
- Membingungkan ketika ada dispute dengan agen atau jemaah  

### ⚠️ Fitur yang Kurang

**BK-F01 — Tidak Ada Filter by Status & Paket**  
- Filter hanya berdasarkan tanggal dan cabang, belum bisa filter by status (pending/confirmed/dll) atau by paket  

**BK-F02 — Tidak Ada Bulk Action**  
- Tidak bisa konfirmasi atau batalkan banyak booking sekaligus  

**BK-F03 — Detail Booking Tidak Menampilkan Jemaah Terkait**  
- Halaman detail booking tidak langsung menampilkan daftar jemaah yang terdaftar di booking tersebut (harus buka menu Jemaah secara terpisah)  

### 🔴 Relasi DB Bermasalah

**BK-DB01 — userId, agentId, picId Tanpa Hard Foreign Key**  
- Field `userId`, `agentId`, `picId` di tabel `bookings` tidak memiliki constraint FK ke tabel users/agents  
- Risiko: jika user/agen dihapus, booking menjadi orphaned (data corrupt)  
- File: `lib/db/src/schema/bookings.ts`  
- **Fix**: Tambahkan FK constraint dengan `ON DELETE SET NULL` atau `ON DELETE RESTRICT`

**BK-DB02 — remainingQuota Tidak Sinkron Otomatis**  
- Field `remainingQuota` di tabel `package_departures` adalah integer statis, tidak ada trigger DB atau constraint  
- Jika ada bug di aplikasi, quota bisa desync dengan jumlah jemaah aktual  
- File: `lib/db/src/schema/packages.ts`  
- **Fix**: Tambahkan DB trigger atau computed column, atau validasi cross-check di backend saat booking dibuat/dibatalkan

---

## 2. JEMAAH

### 🔴 Bug & Masalah UI

**JM-01 — Upload Dokumen ke Path Hardcode**  
- Upload dokumen jemaah mengarah ke `/object/pilgrim-docs/` (path Supabase Storage lama)  
- Di environment non-Supabase atau saat storage tidak di-konfigurasi, upload pasti gagal tanpa error yang jelas  
- File: `artifacts/umroh-app/src/features/admin/pages/Pilgrims.tsx`  
- **Fix**: Gunakan object storage helper yang sudah ada di proyek (lihat skill `object-storage`), atau tampilkan error yang informatif jika storage tidak tersedia

**JM-02 — Validasi Nomor HP Terlalu Ketat**  
- Regex validasi HP tidak menerima format internasional (+62, 08xx, 62xxx)  
- Banyak jemaah dengan nomor HP format lama atau internasional tidak bisa didaftarkan  
- File: `artifacts/umroh-app/src/features/admin/pages/Pilgrims.tsx`  
- **Fix**: Ganti regex ke format yang lebih permissive: `^(\+?62|0)[0-9]{8,13}$`

**JM-03 — Data Jemaah Terduplikasi Per Booking**  
- Tidak ada tabel `pilgrims` master; semua data (NIK, paspor, dll) disimpan ulang di `booking_pilgrims` setiap kali jemaah yang sama booking paket baru  
- Tidak bisa melacak riwayat perjalanan satu jemaah  

### 🔴 Fitur yang Kurang

**JM-F01 — Tidak Ada Master Database Jemaah**  
- Tidak ada halaman "Database Jemaah" yang menampilkan semua jemaah unik beserta riwayat booking mereka  
- Ini fitur kritis untuk travel agent yang ingin melayani pelanggan returning  

**JM-F02 — Tidak Ada Tracking Dokumen Expired**  
- Tidak ada notifikasi atau flag ketika paspor jemaah hampir expired (< 6 bulan dari tanggal keberangkatan)  
- Risiko: jemaah tidak bisa berangkat karena paspor expired  

### 🔴 Relasi DB Bermasalah

**JM-DB01 — Tidak Ada Tabel Master Pilgrims**  
- Semua data jemaah ada di `booking_pilgrims` yang terikat ke satu booking  
- Implikasi: tidak bisa cross-reference jemaah antar booking, tidak bisa cek duplicate NIK/paspor  
- **Fix**: Buat tabel `pilgrims` master dengan kolom: `id, nik, passportNumber, name, birthDate, nationality, phone, email, createdAt`; ubah `booking_pilgrims` menjadi relasi ke `pilgrims.id`

**JM-DB02 — Tidak Ada Relasi Jemaah ↔ Perlengkapan**  
- Tidak ada cara untuk mencatat perlengkapan (koper, baju ihram, dll) yang sudah diterima oleh jemaah tertentu  
- Lihat juga bagian Perlengkapan di bawah  

---

## 3. KEBERANGKATAN

### 🔴 Bug & Masalah UI

**KB-01 — Tipe Kamar Hardcode**  
- Tipe kamar (quad, triple, double) di-hardcode di frontend dan tidak bisa dikonfigurasi  
- Paket haji/plus sering punya tipe kamar berbeda (single, quint, dll)  
- File: `artifacts/umroh-app/src/features/admin/pages/Departures.tsx`  
- **Fix**: Ambil tipe kamar dari konfigurasi paket atau buat field konfigurasi di `package_departures`

**KB-02 — UI Keberangkatan Perlu Redesign**  
- Tampilan list keberangkatan padat dan sulit dibaca (tidak ada status badge, info quota kurang menonjol)  
- Tidak ada visual yang membedakan keberangkatan "penuh", "hampir penuh", dan "tersedia"  
- **Fix**: Tambahkan color-coded status badge (`penuh`=merah, `hampir penuh`=kuning, `tersedia`=hijau), tampilkan progress bar quota (terisi/total)

**KB-03 — Manifest PDF Bergantung VITE_API_URL**  
- Generasi PDF manifest dari halaman Keberangkatan menggunakan `VITE_API_URL` yang mungkin tidak di-set  
- File: `artifacts/umroh-app/src/features/admin/pages/Departures.tsx`  
- **Fix**: Gunakan helper `getApiUrl()` atau relative URL

### ⚠️ Fitur yang Kurang

**KB-F01 — Tidak Bisa Salin/Clone Keberangkatan**  
- Setiap keberangkatan baru harus diisi dari awal meski serupa dengan yang sudah ada  
- Backend sudah ada `POST /:id/clone` tapi tidak ada tombolnya di UI  
- **Fix**: Tambahkan tombol "Duplikat" di list/detail keberangkatan

**KB-F02 — Tidak Ada Notifikasi Quota Penuh**  
- Tidak ada alert ke admin ketika quota keberangkatan hampir penuh atau penuh  

---

## 4. ITINERARY

### ⚠️ Bug & Masalah UI

**IT-01 — Upload Gambar Hari Tidak Ada**  
- Form tambah/edit hari itinerary hanya menyediakan input URL gambar (text field), bukan upload file  
- Admin harus upload gambar ke tempat lain dulu, lalu paste URL-nya — tidak user-friendly  
- File: `artifacts/umroh-app/src/features/admin/pages/Itineraries.tsx`  
- **Fix**: Tambahkan komponen file upload yang menggunakan object storage (sama seperti upload foto paket)

**IT-02 — Mapping Data API Inconsistent**  
- Komponen melakukan manual mapping shape data dari API (camelCase ↔ snake_case) di beberapa tempat berbeda  
- Rawan error jika API berubah  
- **Fix**: Gunakan satu shared type/transformer dari `@workspace/api-server` atau buat adapter di hooks

### ⚠️ Fitur yang Kurang

**IT-F01 — Itinerary Harus Dibuat Per Keberangkatan (Tidak Bisa Template)**  
- Tidak ada itinerary "template" level paket; setiap keberangkatan harus buat itinerary sendiri  
- Travel agent yang punya 10 keberangkatan untuk paket yang sama harus copy manual 10x  
- **Fix**: Tambahkan konsep "itinerary template" di level paket yang bisa di-apply ke keberangkatan baru

**IT-F02 — Tidak Ada Preview Mode**  
- Tidak ada cara melihat tampilan itinerary sebagaimana yang akan dilihat jemaah (public view)  

### ⚠️ Relasi DB

**IT-DB01 — Itinerary Hanya Terhubung ke Keberangkatan, Bukan ke Paket**  
- Tabel `itineraries` punya FK ke `package_departures.id`, bukan ke `packages.id`  
- Untuk paket dengan banyak keberangkatan, itinerary yang sama harus direplikasi  
- **Fix (jangka panjang)**: Tambahkan kolom opsional `packageId` di `itineraries` untuk template level paket

---

## 5. MANIFEST

### ⚠️ Bug & Masalah UI

**MN-01 — Pagination Client-Side Saja**  
- Manifest dengan ratusan jemaah di-load semua sekaligus ke browser, baru dipaginasi di frontend  
- Bisa sangat lambat untuk keberangkatan besar (100+ jemaah)  
- File: `artifacts/umroh-app/src/features/admin/pages/Manifest.tsx`  
- **Fix**: Implementasikan server-side pagination di endpoint `/api/admin/departures/:id/manifest-data`

**MN-02 — Tidak Ada Tombol Print/Export yang Jelas**  
- Tombol cetak manifest tidak menonjol di UI; tidak ada pilihan format (PDF, Excel)  

### ⚠️ Fitur yang Kurang

**MN-F01 — Tidak Ada Tanda Tangan/Verifikasi Digital**  
- Manifest bisa dicetak tapi tidak ada fitur e-signature atau QR code verifikasi untuk validasi dokumen resmi  

**MN-F02 — Tidak Ada Status Check-in di Manifest**  
- Tabel `check_ins` ada di DB tapi data check-in tidak ditampilkan di halaman Manifest  
- Admin tidak bisa melihat langsung siapa yang sudah check-in dan siapa yang belum  

### 🔴 Relasi DB

**MN-DB01 — Tidak Ada Tabel Manifests Dedicated**  
- Manifest di-generate on-the-fly dari join `booking_pilgrims` + `check_ins` + `bookings`  
- Tidak ada snapshots manifest yang tersimpan; jika data booking berubah setelah keberangkatan, manifest historis tidak bisa direcover  
- **Fix**: Buat tabel `manifests` dengan kolom: `id, departureId, generatedAt, generatedBy, snapshotData (jsonb)` untuk menyimpan snapshot saat manifest dicetak

---

## 6. PAKET UMROH

### ⚠️ Bug & Masalah UI

**PK-01 — camelCase vs snake_case Mapping Manual**  
- Komponen melakukan mapping manual antara format API (camelCase) dan state lokal (snake_case)  
- Rawan bug dan sudah ada bug tersembunyi di beberapa field  
- **Fix**: Standardisasi satu format (camelCase) di seluruh API dan frontend

**PK-02 — "Extra Hotels" Hardcode ke Kategori Plus/Haji**  
- Logika tampil/sembunyikan field "Extra Hotels" hardcode ke nama kategori tertentu  
- Jika admin membuat kategori baru dengan nama berbeda, field ini tidak muncul  
- File: `artifacts/umroh-app/src/features/admin/pages/Packages.tsx`  
- **Fix**: Tambahkan field `allowExtraHotels: boolean` di `package_categories` DB, jadikan basis kondisi

### ⚠️ Fitur yang Kurang

**PK-F01 — Tidak Ada Preview Halaman Publik dari Admin**  
- Admin tidak bisa preview tampilan paket sebagaimana yang dilihat calon jemaah tanpa buka tab terpisah  

---

## 7. PERLENGKAPAN (KRITIS)

### ⚠️ Bug & Masalah UI

**PL-01 — Tidak Ada Pagination**  
- List perlengkapan tidak berpaginasi; jika item banyak akan penuh semua  
- File: `artifacts/umroh-app/src/features/admin/pages/Equipment.tsx`  
- **Fix**: Tambahkan `AdminPagination` yang sudah ada di komponen lain

**PL-02 — Tidak Ada Upload Gambar**  
- Sama seperti Itinerary, hanya ada input URL, bukan file upload  
- **Fix**: Gunakan komponen upload yang sama dengan Paket Umroh

### 🔴 Fitur yang Kurang (KRITIS)

**PL-F01 — Tidak Ada Penugasan Perlengkapan ke Jemaah/Booking [KRITIS]**  
- Perlengkapan hanya sebagai "master data" katalog, tapi tidak bisa di-assign ke jemaah atau booking  
- Admin tidak bisa mencatat "Jemaah A sudah terima koper", "Jemaah B belum terima baju ihram"  
- **Fix**: Buat tabel `booking_equipment` atau `pilgrim_equipment` + UI assignment di halaman Jemaah atau Booking

**PL-F02 — Tidak Ada Manajemen Stok**  
- Tidak ada kolom `stock` atau `availableStock` di tabel `equipment`  
- Tidak bisa tahu berapa item tersedia vs sudah didistribusikan  
- **Fix**: Tambahkan `totalStock, distributedCount` di tabel `equipment`, update otomatis saat assignment

**PL-F03 — Tidak Ada Laporan Distribusi**  
- Tidak ada halaman atau export yang menampilkan ringkasan: paket X → berapa perlengkapan sudah dibagikan, berapa belum  

### 🔴 Relasi DB Bermasalah (KRITIS)

**PL-DB01 — Tidak Ada Tabel Penghubung Perlengkapan ↔ Booking/Jemaah**  
- Tabel `equipment` di `masterdata.ts` berdiri sendiri tanpa relasi apapun ke `bookings` atau `booking_pilgrims`  
- **Fix Schema yang Dibutuhkan**:
```sql
-- Tabel baru yang perlu dibuat
CREATE TABLE pilgrim_equipment (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pilgrim_id  UUID NOT NULL REFERENCES booking_pilgrims(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | distributed | returned
  distributed_at TIMESTAMPTZ,
  distributed_by TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## Prioritas Pengerjaan

### 🔴 Prioritas 1 — Bug Kritis (Harus Diperbaiki Segera)

| ID | Judul | Estimasi |
|----|-------|----------|
| BK-01 | Halaman Booking kosong karena format tanggal salah | 2 jam |
| BK-02 | Export Excel tidak jalan | 1 jam |
| JM-01 | Upload dokumen ke path hardcode | 2 jam |
| JM-02 | Validasi HP terlalu ketat | 30 menit |
| KB-03 | Manifest PDF bergantung VITE_API_URL | 1 jam |

### ⚠️ Prioritas 2 — Perbaikan UI & UX Penting

| ID | Judul | Estimasi |
|----|-------|----------|
| KB-02 | Redesign UI Keberangkatan (badge status, progress quota) | 4 jam |
| KB-01 | Tipe kamar tidak hardcode | 3 jam |
| IT-01 | Upload gambar hari itinerary | 2 jam |
| MN-01 | Pagination manifest server-side | 3 jam |
| PL-01 | Pagination perlengkapan | 1 jam |
| BK-03 | Tampilkan jemaah di detail booking | 3 jam |

### 🔴 Prioritas 3 — Fitur Kritis yang Hilang

| ID | Judul | Estimasi |
|----|-------|----------|
| PL-F01 | Assignment perlengkapan ke jemaah + tabel DB baru | 1 hari |
| JM-F01 | Master database jemaah + riwayat booking | 1 hari |
| BK-DB01 | Tambah FK constraint userId/agentId di bookings | 2 jam |
| BK-DB02 | Sinkronisasi remainingQuota dengan trigger/validator | 3 jam |
| PL-DB01 | Buat tabel pilgrim_equipment + Drizzle schema | 4 jam |

### ⚠️ Prioritas 4 — Fitur Tambahan (Nice to Have)

| ID | Judul | Estimasi |
|----|-------|----------|
| JM-F02 | Notifikasi paspor hampir expired | 4 jam |
| MN-DB01 | Snapshot manifest saat cetak | 1 hari |
| IT-F01 | Template itinerary level paket | 1 hari |
| KB-F01 | Tombol clone keberangkatan | 2 jam |
| PK-01 | Standarisasi camelCase seluruh API-frontend | 1 hari |

---

## Relasi SQL Antar Sub-Menu Operasional (Status Saat Ini)

```
packages (Paket Umroh)
   └── package_departures (Keberangkatan)  [FK: packageId → packages.id CASCADE]
         ├── itineraries (Itinerary)        [FK: departureId → package_departures.id CASCADE]
         │     └── itinerary_days           [FK: itineraryId → itineraries.id CASCADE]
         ├── bookings (Booking)             [FK: departureId → package_departures.id]
         │     ├── booking_pilgrims         [FK: bookingId → bookings.id CASCADE]
         │     │     └── check_ins          [FK: pilgrimId → booking_pilgrims.id]
         │     ├── payment_transactions     [FK: bookingId → bookings.id]
         │     └── installment_schedules    [FK: bookingId → bookings.id]
         └── manifest (TIDAK ADA TABEL)    ← generate on-the-fly

equipment (Perlengkapan)                   ← BERDIRI SENDIRI, tidak terhubung ke apapun
```

### Yang Perlu Ditambahkan:
```
pilgrims (Master Jemaah)  ← PERLU DIBUAT
   └── booking_pilgrims   [FK: pilgrimId → pilgrims.id]

pilgrim_equipment         ← PERLU DIBUAT
   ├── FK: pilgrimId → booking_pilgrims.id
   ├── FK: equipmentId → equipment.id
   └── FK: bookingId → bookings.id

manifests (Snapshot)      ← PERLU DIBUAT
   └── FK: departureId → package_departures.id
```

---

*File ini dibuat otomatis dari hasil analisis kode. Update setelah setiap perbaikan selesai.*
