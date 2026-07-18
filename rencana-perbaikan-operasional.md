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
| 🔄 | KB-01 | Tipe kamar tidak hardcode (sudah tambah "single", belum dari DB) | 3 jam | `Departures.tsx`, schema |
| ❌ | BK-F01 | Filter Booking by status & paket | 3 jam | `Bookings.tsx`, `bookings.ts` |
| ❌ | BK-F03 | Tampilkan daftar jemaah di detail Booking | 3 jam | `Bookings.tsx` |
| ❌ | IT-01 | Upload gambar hari Itinerary (bukan hanya URL) | 2 jam | `Itineraries.tsx` |
| ❌ | MN-01 | Pagination Manifest server-side (saat ini semua di-load sekaligus) | 3 jam | `Manifest.tsx`, `departures.ts` |
| ❌ | MN-02 | Tombol Print/Export manifest lebih menonjol + pilihan format | 1 jam | `Manifest.tsx` |
| ❌ | PL-02 | Upload gambar perlengkapan (bukan hanya URL) | 2 jam | `Equipment.tsx` |

**Detail item belum selesai:**

**🔄 KB-01 — Tipe Kamar Masih Hardcode**  
Array `ROOM_TYPES` di frontend sudah ditambah `"single"`, tapi daftar tipe kamar masih hardcode di kode. Seharusnya bisa dikonfigurasi dari DB atau dari konfigurasi paket.  
**Fix**: Tambahkan field `allowedRoomTypes: text[]` di tabel `packages` atau `package_departures`, ambil dari API.

**❌ BK-F01 — Filter Booking by Status & Paket**  
Saat ini filter hanya bisa by tanggal dan cabang. Admin tidak bisa melihat "semua booking pending" atau "semua booking untuk Paket Gold".  
**Fix**: Tambahkan dropdown filter `status` (pending/confirmed/cancelled/completed) dan `packageId` di UI + query parameter di backend.

**❌ BK-F03 — Detail Booking Tidak Tampilkan Jemaah**  
Harus buka menu Jemaah secara terpisah untuk melihat siapa yang ada di satu booking.  
**Fix**: Tambahkan tab atau section "Daftar Jemaah" di halaman detail/modal booking.

**❌ IT-01 — Upload Gambar Hari Itinerary**  
Form tambah/edit hari hanya punya text field untuk URL gambar.  
**Fix**: Gunakan komponen upload file yang sama dengan foto paket.

**❌ MN-01 — Pagination Manifest Server-Side**  
Untuk keberangkatan 100+ jemaah, semua data di-load sekaligus ke browser. Sangat lambat.  
**Fix**: Tambahkan `limit`/`offset` di endpoint `GET /api/admin/departures/:id/manifest-data`.

---

## Sprint 3 — Fitur Kritis yang Hilang & Schema DB
**Target: 1–2 minggu kerja**  
Fokus: fitur-fitur yang secara bisnis kritis tetapi butuh perubahan schema database.

| Status | ID | Judul | Estimasi | Area |
|--------|----|-------|----------|------|
| ❌ | BK-DB01 | FK constraint userId/agentId/picId di tabel bookings | 2 jam | Schema DB |
| ❌ | BK-DB02 | Sinkronisasi `remainingQuota` (trigger atau validator) | 3 jam | Schema DB + backend |
| ❌ | PL-DB01 | Buat tabel `pilgrim_equipment` di Drizzle | 4 jam | Schema DB |
| ❌ | PL-F01 | UI assignment perlengkapan ke jemaah per booking | 1 hari | `Pilgrims.tsx` / `Bookings.tsx` |
| ❌ | PL-F02 | Manajemen stok perlengkapan (totalStock, distributedCount) | 4 jam | `Equipment.tsx`, schema |
| ❌ | JM-DB01 | Buat tabel master `pilgrims` (data unik per jemaah) | 1 hari | Schema DB |
| ❌ | JM-F01 | Halaman "Database Jemaah" — semua jemaah + riwayat booking | 1 hari | Page baru |

**Detail dan skema yang dibutuhkan:**

**❌ BK-DB01 — FK Constraint Booking → User/Agent**  
`userId`, `agentId`, `picId` di tabel `bookings` tidak ada FK. Jika user/agen dihapus, booking jadi orphaned.  
**Fix**: `ALTER TABLE bookings ADD CONSTRAINT ... FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL`

**❌ BK-DB02 — remainingQuota Tidak Sinkron**  
`remainingQuota` di `package_departures` bisa desync jika ada bug saat booking dibuat/dibatalkan.  
**Fix**: Tambahkan validator cross-check di endpoint `POST /bookings` dan `PATCH /bookings/:id/status`, atau buat DB trigger.

**❌ PL-DB01 + PL-F01 — Tabel pilgrim_equipment**  
```sql
CREATE TABLE pilgrim_equipment (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pilgrim_id    UUID NOT NULL REFERENCES booking_pilgrims(id) ON DELETE CASCADE,
  equipment_id  UUID NOT NULL REFERENCES equipment(id),
  booking_id    UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | distributed | returned
  distributed_at TIMESTAMPTZ,
  distributed_by TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```
Setelah schema dibuat: UI assignment di halaman Jemaah (checklist perlengkapan per jemaah).

**❌ PL-F02 — Manajemen Stok**  
Tambahkan kolom `total_stock INTEGER DEFAULT 0` dan hitung `distributed_count` dari `pilgrim_equipment`.

**❌ JM-DB01 + JM-F01 — Master Jemaah**  
Saat ini data jemaah (NIK, paspor, nama) disimpan ulang di `booking_pilgrims` setiap booking baru. Tidak bisa track jemaah returning.
```sql
CREATE TABLE pilgrims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nik             TEXT UNIQUE,
  passport_number TEXT UNIQUE,
  name            TEXT NOT NULL,
  birth_date      DATE,
  nationality     TEXT DEFAULT 'WNI',
  phone           TEXT,
  email           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
-- Tambah kolom ke booking_pilgrims:
ALTER TABLE booking_pilgrims ADD COLUMN pilgrim_id UUID REFERENCES pilgrims(id);
```

---

## Sprint 4 — Fitur Tambahan & Peningkatan Kualitas
**Target: 2–3 minggu kerja**  
Fokus: fitur yang meningkatkan kualitas produk tapi tidak menghambat operasional inti.

| Status | ID | Judul | Estimasi | Area |
|--------|----|-------|----------|------|
| ❌ | BK-03 | Log/history perubahan status booking | 3 jam | `Bookings.tsx`, backend |
| ❌ | BK-F02 | Bulk action: konfirmasi/batalkan banyak booking | 4 jam | `Bookings.tsx`, `bookings.ts` |
| ❌ | JM-F02 | Notifikasi/flag paspor jemaah hampir expired | 4 jam | `Pilgrims.tsx`, cron |
| ❌ | JM-DB02 | Relasi jemaah ↔ perlengkapan (setelah Sprint 3) | - | Tergantung Sprint 3 |
| ❌ | MN-F02 | Status check-in jemaah di halaman Manifest | 3 jam | `Manifest.tsx` |
| ❌ | MN-DB01 | Snapshot manifest saat dicetak (tabel `manifests`) | 1 hari | Schema DB |
| ❌ | MN-F01 | QR code verifikasi manifest | 1 hari | Backend PDF |
| ❌ | IT-F01 | Template itinerary level paket (bisa di-apply ke banyak keberangkatan) | 1 hari | Schema + UI |
| ❌ | IT-F02 | Preview mode itinerary (tampilan jemaah) | 2 jam | `Itineraries.tsx` |
| ❌ | IT-02 | Standarisasi mapping camelCase ↔ snake_case di Itinerary | 2 jam | `Itineraries.tsx` |
| ❌ | KB-F02 | Notifikasi ke admin ketika quota hampir penuh | 4 jam | Backend + notif |
| ❌ | PK-01 | Standarisasi camelCase di seluruh API & frontend | 1 hari | Seluruh codebase |
| ❌ | PK-02 | Extra Hotels tidak hardcode ke nama kategori | 2 jam | `Packages.tsx`, schema |
| ❌ | PK-F01 | Preview halaman publik paket dari admin | 2 jam | `Packages.tsx` |
| ❌ | PL-F03 | Laporan distribusi perlengkapan (export/ringkasan) | 1 hari | Page baru |

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
Sprint 2  [███░░░░░░░]  3/10 selesai (30%)
Sprint 3  [░░░░░░░░░░]  0/7 selesai  (0%)
Sprint 4  [░░░░░░░░░░]  0/15 selesai (0%)
```

---

*Terakhir diperbarui: 18 Juli 2026*
