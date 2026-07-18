# Rencana Perbaikan Menu Operasional — UmrohPlus

> Tanggal analisis: 18 Juli 2026  
> Berdasarkan: inspeksi kode frontend (`artifacts/umroh-app`), backend (`artifacts/api-server`), dan schema DB (`lib/db/src/schema`)  
> Status terakhir diperbarui: 18 Juli 2026

---

## Legend Status
- ✅ **SELESAI** — sudah diimplementasi dan berjalan
- 🔄 **SEBAGIAN** — implementasi parsial, perlu dilengkapi
- ❌ **BELUM** — belum dikerjakan

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

**❌ BK-01 — Halaman Booking Kosong (Tampilan)**  
- Halaman menampilkan "Belum ada booking" meski data sudah ada di DB  
- Root cause: Filter tanggal (`date_from`/`date_to`) dikirim ke API tapi format `mm/dd/yyyy` dari date-input browser tidak di-parse dengan benar di backend  
- File: `artifacts/umroh-app/src/features/admin/pages/Bookings.tsx`, `artifacts/api-server/src/routes/admin/bookings.ts`  
- **Fix**: Normalisasi format tanggal ke ISO 8601 (`yyyy-mm-dd`) sebelum dikirim ke API, atau hapus filter default agar semua booking tampil saat pertama buka

**✅ BK-02 — Export Excel Tidak Jalan di Semua Environment**  
- ~~Tombol "Export Excel" hardcode ke VITE_API_URL~~  
- **Sudah diperbaiki**: Menggunakan relative URL `/api/admin/bookings/export.xlsx` via `window.open`

**❌ BK-03 — Tidak Ada Status History di UI**  
- Admin bisa ubah status booking (pending → confirmed → completed) tapi tidak ada log/history perubahan yang terlihat  
- Membingungkan ketika ada dispute dengan agen atau jemaah  

### ⚠️ Fitur yang Kurang

**❌ BK-F01 — Tidak Ada Filter by Status & Paket**  
- Filter hanya berdasarkan tanggal dan cabang, belum bisa filter by status (pending/confirmed/dll) atau by paket  

**❌ BK-F02 — Tidak Ada Bulk Action**  
- Tidak bisa konfirmasi atau batalkan banyak booking sekaligus  

**❌ BK-F03 — Detail Booking Tidak Menampilkan Jemaah Terkait**  
- Halaman detail booking tidak langsung menampilkan daftar jemaah yang terdaftar di booking tersebut  

### 🔴 Relasi DB Bermasalah

**❌ BK-DB01 — userId, agentId, picId Tanpa Hard Foreign Key**  
- Field `userId`, `agentId`, `picId` di tabel `bookings` tidak memiliki constraint FK ke tabel users/agents  
- Risiko: jika user/agen dihapus, booking menjadi orphaned (data corrupt)  
- File: `lib/db/src/schema/bookings.ts`  
- **Fix**: Tambahkan FK constraint dengan `ON DELETE SET NULL` atau `ON DELETE RESTRICT`

**❌ BK-DB02 — remainingQuota Tidak Sinkron Otomatis**  
- Field `remainingQuota` di tabel `package_departures` adalah integer statis, tidak ada trigger DB atau constraint  
- Jika ada bug di aplikasi, quota bisa desync dengan jumlah jemaah aktual  
- **Fix**: Tambahkan DB trigger atau computed column, atau validasi cross-check di backend saat booking dibuat/dibatalkan

---

## 2. JEMAAH

### 🔴 Bug & Masalah UI

**✅ JM-01 — Upload Dokumen ke Path Hardcode**  
- ~~Upload dokumen jemaah mengarah ke `/object/pilgrim-docs/` (path Supabase Storage lama)~~  
- **Sudah diperbaiki**: Upload sekarang menggunakan `apiFetch("/api/admin/pilgrim-documents/upload", FormData)` ke endpoint backend baru yang menyimpan file lewat multer. Backend juga menyediakan `GET /api/admin/pilgrim-documents/files/:filename` untuk serve file.

**❌ JM-02 — Validasi Nomor HP Terlalu Ketat**  
- Regex validasi HP tidak menerima format internasional (+62, 08xx, 62xxx)  
- **Fix**: Ganti regex ke format yang lebih permissive: `^(\+?62|0)[0-9]{8,13}$`

**❌ JM-03 — Data Jemaah Terduplikasi Per Booking**  
- Tidak ada tabel `pilgrims` master; semua data disimpan ulang di `booking_pilgrims` setiap booking baru  

### 🔴 Fitur yang Kurang

**❌ JM-F01 — Tidak Ada Master Database Jemaah**  
- Tidak ada halaman "Database Jemaah" yang menampilkan semua jemaah unik beserta riwayat booking mereka  

**❌ JM-F02 — Tidak Ada Tracking Dokumen Expired**  
- Tidak ada notifikasi atau flag ketika paspor jemaah hampir expired (< 6 bulan dari tanggal keberangkatan)  

### 🔴 Relasi DB Bermasalah

**❌ JM-DB01 — Tidak Ada Tabel Master Pilgrims**  
- Semua data jemaah ada di `booking_pilgrims` yang terikat ke satu booking  
- **Fix**: Buat tabel `pilgrims` master dengan kolom: `id, nik, passportNumber, name, birthDate, nationality, phone, email, createdAt`; ubah `booking_pilgrims` menjadi relasi ke `pilgrims.id`

**❌ JM-DB02 — Tidak Ada Relasi Jemaah ↔ Perlengkapan**  
- Tidak ada cara untuk mencatat perlengkapan yang sudah diterima oleh jemaah tertentu  

---

## 3. KEBERANGKATAN

### 🔴 Bug & Masalah UI

**🔄 KB-01 — Tipe Kamar Hardcode**  
- Tipe kamar (quad, triple, double) di-hardcode di frontend  
- **Sebagian diperbaiki**: Tipe `"single"` sudah ditambahkan ke array `ROOM_TYPES` di Departures.tsx  
- **Sisa**: Belum bisa dikonfigurasi dari DB/paket; masih hardcode array di frontend

**✅ KB-02 — UI Keberangkatan Perlu Redesign**  
- **Sudah diperbaiki**: 
  - Progress bar quota (terisi/total + persentase + warna dinamis)  
  - Badge status 4-tier: 🟢 Tersedia / 🟡 Hampir Penuh (≤20% sisa) / 🔴 Penuh / ⚫ Ditutup  
  - Teks sisa kursi di bawah progress bar

**✅ KB-03 — Manifest PDF Bergantung VITE_API_URL**  
- ~~Generasi PDF manifest menggunakan `VITE_API_URL` yang mungkin tidak di-set~~  
- **Sudah diperbaiki**: Menggunakan relative URL `/api/admin/departures/${id}/manifest.pdf`

### ⚠️ Fitur yang Kurang

**✅ KB-F01 — Tidak Bisa Salin/Clone Keberangkatan**  
- **Sudah diperbaiki**:  
  - Backend: `POST /api/admin/departures/:id/clone` — duplikat departure + semua harga, quota di-reset ke penuh  
  - Frontend: Tombol duplikat (ikon Copy) ditambahkan di setiap row keberangkatan

**❌ KB-F02 — Tidak Ada Notifikasi Quota Penuh**  
- Tidak ada alert ke admin ketika quota keberangkatan hampir penuh atau penuh  

---

## 4. ITINERARY

### ⚠️ Bug & Masalah UI

**❌ IT-01 — Upload Gambar Hari Tidak Ada**  
- Form tambah/edit hari itinerary hanya menyediakan input URL gambar (text field), bukan upload file  
- **Fix**: Tambahkan komponen file upload yang menggunakan object storage

**❌ IT-02 — Mapping Data API Inconsistent**  
- Komponen melakukan manual mapping shape data dari API (camelCase ↔ snake_case) di beberapa tempat  
- **Fix**: Gunakan satu shared type/transformer atau buat adapter di hooks

### ⚠️ Fitur yang Kurang

**❌ IT-F01 — Itinerary Harus Dibuat Per Keberangkatan (Tidak Bisa Template)**  
- Tidak ada itinerary "template" level paket; setiap keberangkatan harus buat itinerary sendiri  

**❌ IT-F02 — Tidak Ada Preview Mode**  
- Tidak ada cara melihat tampilan itinerary sebagaimana yang akan dilihat jemaah (public view)  

### ⚠️ Relasi DB

**❌ IT-DB01 — Itinerary Hanya Terhubung ke Keberangkatan, Bukan ke Paket**  
- Tabel `itineraries` punya FK ke `package_departures.id`, bukan ke `packages.id`  
- **Fix (jangka panjang)**: Tambahkan kolom opsional `packageId` di `itineraries` untuk template level paket

---

## 5. MANIFEST

### ⚠️ Bug & Masalah UI

**❌ MN-01 — Pagination Client-Side Saja**  
- Manifest dengan ratusan jemaah di-load semua sekaligus ke browser, baru dipaginasi di frontend  
- **Fix**: Implementasikan server-side pagination di endpoint `/api/admin/departures/:id/manifest-data`

**❌ MN-02 — Tidak Ada Tombol Print/Export yang Jelas**  
- Tombol cetak manifest tidak menonjol di UI; tidak ada pilihan format (PDF, Excel)  

### ⚠️ Fitur yang Kurang

**❌ MN-F01 — Tidak Ada Tanda Tangan/Verifikasi Digital**  
- Tidak ada fitur e-signature atau QR code verifikasi untuk validasi dokumen resmi  

**❌ MN-F02 — Tidak Ada Status Check-in di Manifest**  
- Tabel `check_ins` ada di DB tapi data check-in tidak ditampilkan di halaman Manifest  

### 🔴 Relasi DB

**❌ MN-DB01 — Tidak Ada Tabel Manifests Dedicated**  
- Manifest di-generate on-the-fly; tidak ada snapshot yang tersimpan  
- **Fix**: Buat tabel `manifests` dengan kolom: `id, departureId, generatedAt, generatedBy, snapshotData (jsonb)`

---

## 6. PAKET UMROH

### ⚠️ Bug & Masalah UI

**❌ PK-01 — camelCase vs snake_case Mapping Manual**  
- Komponen melakukan mapping manual antara format API dan state lokal  
- **Fix**: Standardisasi satu format (camelCase) di seluruh API dan frontend

**❌ PK-02 — "Extra Hotels" Hardcode ke Kategori Plus/Haji**  
- Logika tampil/sembunyikan field "Extra Hotels" hardcode ke nama kategori tertentu  
- **Fix**: Tambahkan field `allowExtraHotels: boolean` di `package_categories` DB

### ⚠️ Fitur yang Kurang

**❌ PK-F01 — Tidak Ada Preview Halaman Publik dari Admin**  
- Admin tidak bisa preview tampilan paket sebagaimana yang dilihat calon jemaah  

---

## 7. PERLENGKAPAN

### ⚠️ Bug & Masalah UI

**✅ PL-01 — Tidak Ada Pagination**  
- **Sudah diperbaiki**: Menggunakan `useAdminPagination` + `AdminPagination`, 20 item per halaman  
- Bonus: Ditambahkan search input (filter nama + kategori), kolom Deskripsi, dan empty state icon

**❌ PL-02 — Tidak Ada Upload Gambar**  
- Hanya ada input URL, bukan file upload  
- **Fix**: Gunakan komponen upload yang sama dengan Paket Umroh

### 🔴 Fitur yang Kurang (KRITIS)

**❌ PL-F01 — Tidak Ada Penugasan Perlengkapan ke Jemaah/Booking [KRITIS]**  
- Perlengkapan hanya sebagai "master data" katalog, tidak bisa di-assign ke jemaah atau booking  
- **Fix**: Buat tabel `booking_equipment`/`pilgrim_equipment` + UI assignment di halaman Jemaah atau Booking

**❌ PL-F02 — Tidak Ada Manajemen Stok**  
- Tidak ada kolom `stock` atau `availableStock` di tabel `equipment`  
- **Fix**: Tambahkan `totalStock, distributedCount` di tabel `equipment`

**❌ PL-F03 — Tidak Ada Laporan Distribusi**  
- Tidak ada halaman atau export yang menampilkan ringkasan distribusi perlengkapan  

### 🔴 Relasi DB Bermasalah (KRITIS)

**❌ PL-DB01 — Tidak Ada Tabel Penghubung Perlengkapan ↔ Booking/Jemaah**  
- Tabel `equipment` berdiri sendiri tanpa relasi apapun ke `bookings` atau `booking_pilgrims`  
- **Fix Schema yang Dibutuhkan**:
```sql
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

## Ringkasan Status Pengerjaan

### ✅ Sudah Selesai (7 item)

| ID | Judul |
|----|-------|
| BK-02 | Export Excel — URL diperbaiki ke relative path |
| JM-01 | Upload dokumen — endpoint backend baru + apiFetch |
| KB-02 | Redesign UI Keberangkatan — progress bar, badge 4-tier |
| KB-03 | Manifest PDF — URL diperbaiki ke relative path |
| KB-F01 | Clone keberangkatan — tombol UI + endpoint `POST /:id/clone` |
| PL-01 | Pagination + search perlengkapan |
| KB-01 | *(sebagian)* Tipe kamar — ditambah "single" ke ROOM_TYPES |

### ❌ Belum Dikerjakan — Prioritas 1 (Bug Kritis)

| ID | Judul | Estimasi |
|----|-------|----------|
| BK-01 | Halaman Booking kosong karena format tanggal | 2 jam |
| JM-02 | Validasi nomor HP terlalu ketat | 30 menit |

### ❌ Belum Dikerjakan — Prioritas 2 (UI & UX)

| ID | Judul | Estimasi |
|----|-------|----------|
| KB-01 | Tipe kamar dari konfigurasi DB (bukan hardcode) | 3 jam |
| IT-01 | Upload gambar hari itinerary | 2 jam |
| MN-01 | Pagination manifest server-side | 3 jam |
| BK-F03 | Tampilkan jemaah di detail booking | 3 jam |
| MN-02 | Tombol print/export manifest | 1 jam |
| PL-02 | Upload gambar perlengkapan | 2 jam |

### ❌ Belum Dikerjakan — Prioritas 3 (Fitur Kritis)

| ID | Judul | Estimasi |
|----|-------|----------|
| PL-F01 | Assignment perlengkapan ke jemaah + tabel DB baru | 1 hari |
| JM-F01 | Master database jemaah + riwayat booking | 1 hari |
| BK-DB01 | FK constraint userId/agentId di bookings | 2 jam |
| BK-DB02 | Sinkronisasi remainingQuota (trigger/validator) | 3 jam |
| PL-DB01 | Buat tabel `pilgrim_equipment` + Drizzle schema | 4 jam |
| JM-DB01 | Buat tabel master `pilgrims` | 1 hari |

### ❌ Belum Dikerjakan — Prioritas 4 (Nice to Have)

| ID | Judul | Estimasi |
|----|-------|----------|
| JM-F02 | Notifikasi paspor hampir expired | 4 jam |
| MN-DB01 | Snapshot manifest saat cetak | 1 hari |
| IT-F01 | Template itinerary level paket | 1 hari |
| KB-F02 | Notifikasi quota hampir penuh | 4 jam |
| PK-01 | Standarisasi camelCase seluruh API-frontend | 1 hari |
| BK-03 | Status history perubahan booking | 3 jam |
| MN-F02 | Status check-in di manifest | 3 jam |
| IT-F02 | Preview mode itinerary | 2 jam |
| MN-F01 | QR code verifikasi manifest | 1 hari |
| PK-02 | Extra Hotels tidak hardcode ke nama kategori | 2 jam |
| PK-F01 | Preview halaman publik dari admin | 2 jam |

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
pilgrim_documents                          ← Upload via /api/admin/pilgrim-documents/upload (✅ fixed)
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

*File ini dibuat otomatis dari hasil analisis kode. Update terakhir: 18 Juli 2026.*
