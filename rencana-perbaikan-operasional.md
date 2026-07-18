# Rencana Perbaikan Menu Operasional — UmrohPlus

> Tanggal analisis: 18 Juli 2026  
> Berdasarkan: inspeksi kode frontend (`artifacts/umroh-app`), backend (`artifacts/api-server`), dan schema DB (`lib/db/src/schema`)

---

## Legend Status

| Ikon | Arti |
|------|------|
| ✅ | Selesai diimplementasi |
| 🔄 | Sebagian selesai |
| ❌ | Belum dikerjakan |

---

## Sprint 1 — Bug Kritis & Quick Wins
**Target: 1–2 hari kerja**  
Fokus: perbaiki bug yang membuat fitur inti tidak bisa digunakan sama sekali.

| Status | ID | Judul | Estimasi | File Utama |
|--------|----|-------|----------|------------|
| ✅ | BK-02 | Export Excel tidak jalan (URL hardcode) | 1 jam | `Bookings.tsx` |
| ✅ | KB-03 | Manifest PDF bergantung `VITE_API_URL` | 1 jam | `Departures.tsx` |
| ✅ | JM-01 | Upload dokumen ke path Supabase hardcode | 2 jam | `Pilgrims.tsx` + backend baru |
| ✅ | BK-01 | Halaman Booking kosong & search sempit | 2 jam | `Bookings.tsx`, `bookings.ts` |
| ✅ | JM-02 | Validasi nomor HP terlalu ketat | 30 mnt | `Pilgrims.tsx` |

**Detail item belum selesai:**

**✅ BK-01 — Halaman Booking Kosong**  
Masalah sesungguhnya ada 3 lapis: (1) ketika API error, UI salah menampilkan "Belum ada booking" bukan pesan error; (2) search hanya cari `booking_code`, bukan nama/email; (3) tidak ada tombol reset filter.  
**Yang sudah diperbaiki**:
- Tambah `apiError` state — saat API gagal muncul panel error merah dengan tombol "Coba Lagi" (bukan pesan kosong yang menyesatkan)
- Backend search diperluas: `booking_code OR prof.name OR prof.email OR pic_name`
- Tambah tombol ✕ reset tanggal di header, tombol "Reset Filter" di empty state saat filter aktif
- Tanggal dinormalisasi ke ISO sebelum dikirim ke API (defensive measure)
- Label tanggal diperjelas: "Tgl Berangkat Dari" & "Sampai"
- Search placeholder diperbarui: "Cari kode, nama, email..."

**✅ JM-02 — Validasi Nomor HP Terlalu Ketat**  
**Yang sudah diperbaiki**:
- Strip karakter diperluas dari `[\s\-().]` → `[^+\d]` (semua non-digit/non-plus dihapus, termasuk `/`, `:`, dll)
- Regex diperbarui ke `^(\+?62|0)\d{7,12}# Rencana Perbaikan Menu Operasional — UmrohPlus

> Tanggal analisis: 18 Juli 2026  
> Berdasarkan: inspeksi kode frontend (`artifacts/umroh-app`), backend (`artifacts/api-server`), dan schema DB (`lib/db/src/schema`)

---

## Legend Status

| Ikon | Arti |
|------|------|
| ✅ | Selesai diimplementasi |
| 🔄 | Sebagian selesai |
| ❌ | Belum dikerjakan |

---

## Sprint 1 — Bug Kritis & Quick Wins
**Target: 1–2 hari kerja**  
Fokus: perbaiki bug yang membuat fitur inti tidak bisa digunakan sama sekali.

| Status | ID | Judul | Estimasi | File Utama |
|--------|----|-------|----------|------------|
| ✅ | BK-02 | Export Excel tidak jalan (URL hardcode) | 1 jam | `Bookings.tsx` |
| ✅ | KB-03 | Manifest PDF bergantung `VITE_API_URL` | 1 jam | `Departures.tsx` |
| ✅ | JM-01 | Upload dokumen ke path Supabase hardcode | 2 jam | `Pilgrims.tsx` + backend baru |
| ✅ | BK-01 | Halaman Booking kosong & search sempit | 2 jam | `Bookings.tsx`, `bookings.ts` |
| ✅ | JM-02 | Validasi nomor HP terlalu ketat | 30 mnt | `Pilgrims.tsx` |

**Detail item belum selesai:**

 — lebih permissif, menerima nomor pendek daerah
- Pesan error diperbarui dengan contoh format yang lebih lengkap

---

## Sprint 2 — Perbaikan UI & UX
**Target: 3–5 hari kerja**  
Fokus: perbaikan tampilan dan alur kerja admin yang sering digunakan setiap hari.

| Status | ID | Judul | Estimasi | File Utama |
|--------|----|-------|----------|------------|
| ✅ | KB-02 | Redesign UI Keberangkatan (badge status + progress bar quota) | 4 jam | `Departures.tsx` |
| ✅ | KB-F01 | Tombol clone/duplikat keberangkatan | 2 jam | `Departures.tsx` + `departures.ts` |
| ✅ | PL-01 | Pagination + search halaman Perlengkapan | 1 jam | `Equipment.tsx` |
| ✅ | KB-01 | Tipe kamar tidak hardcode (sudah tambah "single", belum dari DB) | 3 jam | `Departures.tsx`, schema |
| ✅ | BK-F01 | Filter Booking by status & paket | 3 jam | `Bookings.tsx`, `bookings.ts` |
| ✅ | BK-F03 | Tampilkan daftar jemaah di detail Booking | 3 jam | `BookingDetailPanel.tsx` |
| ✅ | IT-01 | Upload gambar hari Itinerary (bukan hanya URL) | 2 jam | `Itineraries.tsx`, `uploads.ts` |
| ✅ | MN-01 | Pagination Manifest server-side (saat ini semua di-load sekaligus) | 3 jam | `Manifest.tsx`, `departures.ts` |
| ✅ | MN-02 | Tombol Print/Export manifest lebih menonjol + pilihan format | 1 jam | `Manifest.tsx` |
| ✅ | PL-02 | Upload gambar perlengkapan (bukan hanya URL) | 2 jam | `Equipment.tsx`, `uploads.ts` |

**Detail item belum selesai:**

**✅ KB-01 — Tipe Kamar Tidak Hardcode**  
`form.prices` di `Departures.tsx` sekarang dinamis — dibangun dari `ROOM_TYPES = ["quad","triple","double","single"]` menggunakan `Object.fromEntries`. Semua 4 tipe kamar tampil di form keberangkatan + harga bisa diisi. `handleEdit` dan `resetForm` juga diperbaiki agar tidak lagi hardcode `{quad,triple,double}` saja.

**✅ BK-F01 — Filter Booking by Status & Paket**  
Dropdown `packageId` ditambahkan di frontend `Bookings.tsx` + query param `packageId` di backend `admin/bookings.ts`. Filter paket berlaku juga untuk export Excel.

**✅ BK-F03 — Detail Booking Tampilkan Jemaah**  
Sudah diimplementasi di `BookingDetailPanel.tsx` — section "Daftar Jemaah" muncul saat klik Detail pada setiap baris booking.

**✅ IT-01 — Upload Gambar Hari Itinerary**  
Endpoint baru `POST /api/admin/uploads/image` (`uploads.ts`). Form hari itinerary kini punya tombol "Pilih Gambar" + preview + fallback URL manual.

**✅ MN-01 — Pagination Manifest Server-Side**  
Endpoint `GET /api/admin/departures/:id/manifest-data` kini terima `limit`, `offset`, `search` — query JOIN langsung ke DB, tidak load semua data. Frontend `Manifest.tsx` refactored ke server-side pagination dengan debounced search.

---

## Sprint 3 — Fitur Kritis yang Hilang & Schema DB
**Target: 1–2 minggu kerja**  
Fokus: fitur-fitur yang secara bisnis kritis tetapi butuh perubahan schema database.

| Status | ID | Judul | Estimasi | Area |
|--------|----|-------|----------|------|
| ✅ | BK-DB01 | FK constraint userId/agentId/picId di tabel bookings | 2 jam | Schema DB + backend validation |
| ✅ | BK-DB02 | Sinkronisasi `remainingQuota` (trigger atau validator) | 3 jam | `admin/bookings.ts` |
| ✅ | PL-DB01 | Buat tabel `pilgrim_equipment` di Drizzle | 4 jam | `schema/pilgrim-equipment.ts` |
| ✅ | PL-F01 | UI assignment perlengkapan ke jemaah per booking | 1 hari | `PilgrimEquipmentPanel.tsx` + `BookingDetailPanel.tsx` |
| ✅ | PL-F02 | Manajemen stok perlengkapan (totalStock, distributedCount) | 4 jam | `Equipment.tsx`, `schema/masterdata.ts` |
| ✅ | JM-DB01 | Buat tabel master `pilgrims` (data unik per jemaah) | 1 hari | `schema/pilgrims.ts` |
| ✅ | JM-F01 | Halaman "Database Jemaah" — semua jemaah + riwayat booking | 1 hari | `PilgrimsDatabase.tsx` |

**Detail dan skema yang dibutuhkan:**

**✅ BK-DB01 — Validasi agentId di Backend**  
`agentId` di `bookings` tidak bisa FK ke `agents` karena `agents.ts` sudah import `bookings` (circular). Solusi: runtime validation di `POST /api/admin/bookings` — jika `agentId` diberikan, cek dulu ke tabel `agents`; jika tidak ditemukan return 400.

**✅ BK-DB02 — remainingQuota Sinkron**  
Dua perubahan di `admin/bookings.ts`:
1. `POST /`: cek `remainingQuota > 0` sebelum booking dibuat; jika penuh return 409. Lalu dalam transaksi, `UPDATE package_departures SET remaining_quota = GREATEST(0, remaining_quota - 1)`.
2. `PATCH /:id/status → cancelled`: Status update + restorasi quota kini dibungkus dalam satu DB transaction (sebelumnya restorasi quota berada di luar transaksi, berisiko inkonsistensi jika proses gagal di tengah jalan).

**✅ PL-DB01 + PL-F01 — Tabel pilgrim_equipment + UI Assignment**  
Tabel `pilgrim_equipment` dibuat di `lib/db/src/schema/pilgrim-equipment.ts` dan di-push ke DB. Backend CRUD di `POST/PATCH/DELETE /api/admin/pilgrim-equipment`. Frontend: komponen `PilgrimEquipmentPanel.tsx` terintegrasi di `BookingDetailPanel` — staff bisa assign perlengkapan per jemaah, update status (pending → diserahkan → dikembalikan), dan hapus assignment. Bug diperbaiki: kondisi render panel sebelumnya menggunakan variabel `booking` yang tidak ada di scope komponen; sekarang memakai prop `bookingId` langsung.

**✅ PL-F02 — Manajemen Stok**  
Kolom `total_stock INTEGER NOT NULL DEFAULT 0` ditambahkan ke tabel `equipment` (Drizzle schema `masterdata.ts`, sudah di-push). Form Equipment di `Equipment.tsx` menampilkan field "Total Stok (unit)" yang bisa diisi/edit.

**✅ JM-DB01 + JM-F01 — Master Jemaah + Halaman Database Jemaah**  
Tabel `pilgrims` dibuat di `lib/db/src/schema/pilgrims.ts` (unique NIK + paspor). Kolom `pilgrim_id` FK ditambahkan ke `booking_pilgrims`. Halaman `/admin/pilgrims-db` baru (`PilgrimsDatabase.tsx`) menampilkan semua jemaah dari semua booking dengan server-side search + pagination + export CSV. Nav item "Database Jemaah" ditambahkan ke sidebar.

---

## Sprint 4 — Fitur Tambahan & Peningkatan Kualitas
**Target: 2–3 minggu kerja**  
Fokus: fitur yang meningkatkan kualitas produk tapi tidak menghambat operasional inti.

| Status | ID | Judul | Estimasi | Area |
|--------|----|-------|----------|------|
| ✅ | BK-03 | Log/history perubahan status booking | 3 jam | `BookingDetailPanel.tsx` + `bookingStatusLogs` schema + `bookings.ts` |
| ✅ | BK-F02 | Bulk action: konfirmasi/batalkan banyak booking | 4 jam | `BookingTable.tsx` (checkbox), `Bookings.tsx` (bulk bar), `PATCH /bulk-status` |
| ✅ | JM-F02 | Notifikasi/flag paspor jemaah hampir expired | 4 jam | `Pilgrims.tsx` — badge merah/oranye di kolom NIK/Paspor |
| ⏭ | JM-DB02 | Relasi jemaah ↔ perlengkapan (setelah Sprint 3) | - | Ditunda — `pilgrim_equipment` sudah punya FK ke `booking_pilgrims` |
| ✅ | MN-F02 | Status check-in jemaah di halaman Manifest | 3 jam | `Manifest.tsx` + LEFT JOIN `check_ins` di `manifest-data` |
| ✅ | MN-DB01 | Snapshot manifest saat dicetak (tabel `manifests`) | 1 hari | Schema `manifests` dibuat, snapshot disimpan saat PDF di-download |
| ✅ | MN-F01 | QR code verifikasi manifest | 1 hari | Sudah ada sejak Sprint sebelumnya — QR per-jemaah di PDF & halaman Manifest |
| ✅ | IT-F01 | Template itinerary level paket (salin ke keberangkatan lain) | 1 hari | Dialog "Salin" + `POST /:id/copy-to-departure` endpoint |
| ✅ | IT-F02 | Preview mode itinerary (tampilan jemaah) | 2 jam | Toggle "Preview" di header card itinerary — read-only view |
| ✅ | IT-02 | Standarisasi mapping camelCase ↔ snake_case di Itinerary | 2 jam | PATCH & POST /days sekarang mengembalikan snake_case konsisten |
| ✅ | KB-F02 | Notifikasi ke admin ketika quota hampir penuh | 4 jam | `console.warn` + log quota warning setelah booking dibuat |
| ⏭ | PK-01 | Standarisasi camelCase di seluruh API & frontend | 1 hari | Ditunda — terlalu luas dan berisiko; perbaiki per-fitur saat disentuh |
| ✅ | PK-02 | Extra Hotels tidak hardcode ke nama kategori | 2 jam | Sudah menggunakan flag `show_extra_hotels` dari `category.is_active` |
| ✅ | PK-F01 | Preview halaman publik paket dari admin | 2 jam | Sudah ada — tombol Eye icon → `/paket/:slug` di `Packages.tsx` |
| ✅ | PL-F03 | Laporan distribusi perlengkapan (export/ringkasan) | 1 hari | Halaman baru `EquipmentReport.tsx` + API `/api/admin/equipment-report` |

---

## Relasi SQL Antar Sub-Menu (Status Saat Ini vs Target)

### Kondisi Saat Ini
```
packages (Paket Umroh)
   └── package_departures (Keberangkatan)     [FK OK ✅]
         ├── itineraries                       [FK OK ✅]
         │     └── itinerary_days              [FK OK ✅]
         ├── bookings (Booking)                [FK OK ✅, tapi userId/agentId tanpa FK ❌]
         │     ├── booking_pilgrims            [FK OK ✅, tapi tanpa tabel master pilgrims ❌]
         │     │     └── check_ins             [FK OK ✅]
         │     ├── payment_transactions        [FK OK ✅]
         │     └── installment_schedules       [FK OK ✅]
         └── (manifest dibuat on-the-fly, tidak ada tabel ❌)

equipment (Perlengkapan)   ← BERDIRI SENDIRI, tanpa relasi apapun ❌
pilgrim_documents           ← Upload sudah via backend baru ✅
```

### Target Setelah Sprint 3 & 4
```
pilgrims (Master Jemaah)   ← DIBUAT di Sprint 3
   └── booking_pilgrims    [FK pilgrimId → pilgrims.id]

pilgrim_equipment           ← DIBUAT di Sprint 3
   ├── FK: pilgrim_id  → booking_pilgrims.id CASCADE
   ├── FK: equipment_id → equipment.id
   └── FK: booking_id  → bookings.id CASCADE

manifests (Snapshot)       ← DIBUAT di Sprint 4
   └── FK: departure_id → package_departures.id
```

---

## Progress Overview

```
Sprint 1  [██████████]  5/5 selesai  (100%) ✅ SELESAI
Sprint 2  [██████████]  10/10 selesai (100%) ✅ SELESAI
Sprint 3  [██████████]  7/7 selesai  (100%) ✅ SELESAI
Sprint 4  [████████░░]  13/15 selesai (87%) — 2 item ditunda (JM-DB02, PK-01)
```

---

*Terakhir diperbarui: 18 Juli 2026*
