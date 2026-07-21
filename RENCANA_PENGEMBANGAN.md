# Rencana Pengembangan UmrohPlus — Master Document

> Digabung dari: `rencana-perbaikan-operasional.md` + `RENCANA_PENGEMBANGAN_BOOKING_MANIFEST.md`  
> Terakhir diperbarui: 21 Juli 2026  
> Verifikasi status berdasarkan: inspeksi kode + memory sprint agent

---

## Legend Status

| Ikon | Arti |
|------|------|
| ✅ | Selesai diimplementasi |
| 🔄 | Sebagian selesai (schema/backend ada, UI belum) |
| ⏭ | Ditunda deliberate (terlalu berisiko saat ini) |
| ❌ | Belum dikerjakan |

---

## PROGRESS KESELURUHAN

```
Sprint 1  [██████████]  5/5  (100%) ✅ SELESAI
Sprint 2  [██████████]  10/10 (100%) ✅ SELESAI
Sprint 3  [██████████]  7/7  (100%) ✅ SELESAI
Sprint 4  [██████████]  15/15 (100%) ✅ SELESAI
Booking & Manifest Baru  [░░░░░░░░░░]  0/6  (0%)  ← ANTRIAN BERIKUTNYA
```

---

## ✅ SPRINT 1 — Bug Kritis & Quick Wins (SELESAI)

| Status | ID | Judul | File Utama |
|--------|----|-------|------------|
| ✅ | BK-02 | Export Excel tidak jalan (URL hardcode) | `Bookings.tsx` |
| ✅ | KB-03 | Manifest PDF bergantung `VITE_API_URL` | `Departures.tsx` |
| ✅ | JM-01 | Upload dokumen ke path Supabase hardcode | `Pilgrims.tsx` + backend baru |
| ✅ | BK-01 | Halaman Booking kosong & search sempit | `Bookings.tsx`, `bookings.ts` |
| ✅ | JM-02 | Validasi nomor HP terlalu ketat | `Pilgrims.tsx` |

---

## ✅ SPRINT 2 — Perbaikan UI & UX (SELESAI)

| Status | ID | Judul | File Utama |
|--------|----|-------|------------|
| ✅ | KB-02 | Redesign UI Keberangkatan (badge status + progress bar quota) | `Departures.tsx` |
| ✅ | KB-F01 | Tombol clone/duplikat keberangkatan | `Departures.tsx` + `departures.ts` |
| ✅ | PL-01 | Pagination + search halaman Perlengkapan | `Equipment.tsx` |
| ✅ | KB-01 | Tipe kamar dinamis (quad/triple/double/single) | `Departures.tsx` |
| ✅ | BK-F01 | Filter Booking by status & paket | `Bookings.tsx`, `bookings.ts` |
| ✅ | BK-F03 | Tampilkan daftar jemaah di detail Booking | `BookingDetailPanel.tsx` |
| ✅ | IT-01 | Upload gambar hari Itinerary | `Itineraries.tsx`, `uploads.ts` |
| ✅ | MN-01 | Pagination Manifest server-side | `Manifest.tsx`, `departures.ts` |
| ✅ | MN-02 | Tombol Print/Export manifest lebih menonjol | `Manifest.tsx` |
| ✅ | PL-02 | Upload gambar perlengkapan | `Equipment.tsx`, `uploads.ts` |

---

## ✅ SPRINT 3 — Fitur Kritis & Schema DB (SELESAI)

| Status | ID | Judul | Area |
|--------|----|-------|------|
| ✅ | BK-DB01 | Validasi agentId runtime (bukan FK — circular import) | `admin/bookings.ts` |
| ✅ | BK-DB02 | Sinkronisasi `remainingQuota` dalam transaksi DB | `admin/bookings.ts` |
| ✅ | PL-DB01 | Tabel `pilgrim_equipment` di Drizzle + push ke DB | `schema/pilgrim-equipment.ts` |
| ✅ | PL-F01 | UI assignment perlengkapan ke jemaah per booking | `PilgrimEquipmentPanel.tsx` |
| ✅ | PL-F02 | Manajemen stok perlengkapan (totalStock, distributedCount) | `Equipment.tsx`, `schema/masterdata.ts` |
| ✅ | JM-DB01 | Tabel master `pilgrims` (unique NIK + paspor) | `schema/pilgrims.ts` |
| ✅ | JM-F01 | Halaman "Database Jemaah" — semua jemaah + riwayat | `PilgrimsDatabase.tsx` |

---

## ✅ SPRINT 4 — Fitur Tambahan & Kualitas (93% SELESAI)

| Status | ID | Judul | Area |
|--------|----|-------|------|
| ✅ | BK-03 | Log/history perubahan status booking | `BookingDetailPanel.tsx` + schema `bookingStatusLogs` |
| ✅ | BK-F02 | Bulk action: konfirmasi/batalkan banyak booking | `BookingTable.tsx`, `PATCH /bulk-status` |
| ✅ | JM-F02 | Flag paspor jemaah hampir expired (badge merah/oranye) | `Pilgrims.tsx` |
| ✅ | JM-DB02 | Relasi jemaah ↔ perlengkapan di detail jemaah | `GET /pilgrim-equipment?masterPilgrimId=X` |
| ✅ | MN-F02 | Status check-in jemaah di halaman Manifest | `Manifest.tsx` + LEFT JOIN `check_ins` |
| ✅ | MN-DB01 | Snapshot manifest saat PDF dicetak (tabel `manifests`) | `schema/manifests.ts` |
| ✅ | MN-F01 | QR code verifikasi manifest | Sudah ada sejak sprint sebelumnya |
| ✅ | IT-F01 | Salin template itinerary ke keberangkatan lain | Dialog "Salin" + `POST /:id/copy-to-departure` |
| ✅ | IT-F02 | Preview mode itinerary (tampilan jemaah) | Toggle di header card `Itineraries.tsx` |
| ✅ | IT-02 | Standarisasi snake_case response di Itinerary API | PATCH & POST /days |
| ✅ | KB-F02 | Log warning quota hampir penuh setelah booking dibuat | `admin/bookings.ts` |
| ✅ | PK-02 | Extra Hotels pakai flag `is_active`, tidak hardcode nama | `Packages.tsx` |
| ✅ | PK-F01 | Preview halaman publik paket dari admin | Tombol Eye → `/paket/:slug` |
| ✅ | PL-F03 | Laporan distribusi perlengkapan (ringkasan + export) | `EquipmentReport.tsx`, `/api/admin/equipment-report` |
| ✅ | PK-01 | Standarisasi camelCase di seluruh API & frontend | GET /departures, /pilgrims-db → camelCase; Departures, BookingTable, Bookings, Agents, Pilgrims, PilgrimsDatabase, PaymentGateway, Accounting, AgentPortal, useAdminNotifications — semua hapus snake_case remapping |

---

## ❌ ANTRIAN PENGERJAAN BERIKUTNYA

> Semua item di bawah belum dikerjakan. Urutkan dari prioritas tertinggi.

---

### 🔴 PRIORITAS 1 — Nama Pemesan Konsisten (Critical)
**Estimasi: 1–2 hari kerja**

Masalah: Kolom nama pemesan tidak konsisten — booking via `user_id` ambil dari `profiles.name`, booking walk-in ambil dari `booking_pilgrims`, field `pic_name` tidak selalu diisi. Akibatnya ada booking yang nama pemesannya kosong di list.

#### F1-DB — Tambah kolom `pemesan_name` + `pemesan_phone` di tabel `bookings`

```sql
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS pemesan_name TEXT,
  ADD COLUMN IF NOT EXISTS pemesan_phone TEXT;
```

Logic pengisian backend:
- Jika ada `userId` → ambil dari `profiles.name` saat INSERT
- Jika ada `customerName` → simpan ke `pemesan_name`
- Fallback: ambil dari `booking_pilgrims` pertama

**Files:**
- `lib/db/src/schema/bookings.ts` — tambah kolom
- `artifacts/api-server/src/routes/admin/bookings.ts` — logic insert & select
- Jalankan `cd lib/db && pnpm drizzle-kit push`

#### F1-UI — Field "Nama Pemesan" wajib diisi di dialog booking

- Field required, tidak bisa kosong
- Pisahkan konsep Pemesan (yang bayar) vs Jamaah (yang berangkat)
- Tampilkan `pemesan_name` sebagai kolom utama di `BookingTable`

**Files:**
- `artifacts/umroh-app/src/features/admin/pages/components/AdminCreateBookingDialog.tsx`
- `artifacts/umroh-app/src/features/admin/pages/Bookings.tsx`

#### F1-BACKFILL — Script migrasi data lama

- Booking dengan `user_id`: isi `pemesan_name` dari tabel `profiles`
- Booking tanpa `user_id`: isi dari `booking_pilgrims` pertama

---

### 🟠 PRIORITAS 2 — Batch Booking Multi-Jamaah (High)
**Estimasi: 2–3 hari kerja**

Masalah: Admin harus buka dialog booking berkali-kali untuk grup jamaah. Tidak ada cara input beberapa jamaah sekaligus.

#### F2-BE — Endpoint `POST /api/admin/bookings/batch`

```ts
// Payload
{
  packageId: string,
  departureId: string,
  roomType: "quad" | "triple" | "double" | "single",
  paymentScheme: "full" | "installment",
  branchId?: string,
  agentId?: string,
  jamaah: Array<{
    pemesan_name: string,      // required
    pemesan_email?: string,
    pemesan_phone?: string,
    userId?: string,
  }>
}

// Response
{
  created: Booking[],
  failed: Array<{ index: number, error: string }>
}
```

- Gunakan DB transaction — jika quota tidak cukup untuk semua, rollback semua
- Quota check: `remaining_quota >= jamaah.length` sebelum insert
- Generate `booking_code` unik per jamaah

**File:** `artifacts/api-server/src/routes/admin/bookings.ts`

> ⚠️ Catatan: Route `POST /batch` harus didaftarkan **sebelum** `POST /:id` agar Express tidak salah routing.

#### F2-UI — Komponen `AdminBatchBookingDialog.tsx` (multi-step)

- **Step 1**: Pilih paket, keberangkatan, tipe kamar, skema bayar
- **Step 2**: Dynamic list jamaah — bisa add/remove row. Setiap row: Nama (required), Email, HP, atau pilih user existing. Tampilkan running total + warning jika quota tidak cukup
- **Step 3**: Preview & konfirmasi ringkasan
- Submit → `POST /api/admin/bookings/batch`
- Setelah sukses: tampilkan daftar booking code yang dibuat

**Files:**
- `artifacts/umroh-app/src/features/admin/pages/components/AdminBatchBookingDialog.tsx` ← baru
- `artifacts/umroh-app/src/features/admin/pages/Bookings.tsx` — tambah tombol "Booking Rombongan"

---

### 🟡 PRIORITAS 3 — Navigasi Langsung ke Manifest per Keberangkatan (Medium)
**Estimasi: 0.5–1 hari kerja**

Masalah: Admin harus masuk menu Manifest → pilih departure manual. Tidak ada shortcut dari kartu keberangkatan.

#### F3-NAV — Tombol "Lihat Manifest" di departure card

Di `Departures.tsx`, tambah tombol di setiap kartu:
```
[📋 Lihat Manifest]  [📥 Download PDF]  [✏️ Edit]  [🗑️ Hapus]
```
- Klik → navigate ke `/admin/manifest?departureId=xxx`

**File:** `artifacts/umroh-app/src/features/admin/pages/Departures.tsx`

#### F3-AUTO — Auto-select departure di halaman Manifest

Di `Manifest.tsx`:
- Baca query param `?departureId=xxx` saat mount
- Jika ada → langsung set departure terpilih (skip pilih manual)

**File:** `artifacts/umroh-app/src/features/admin/pages/Manifest.tsx`

---

### 🟡 PRIORITAS 4 — Ringkasan Manifest di Departure Card (Medium)
**Estimasi: 0.5 hari kerja**

Tambah summary cepat di kartu keberangkatan:
```
📋 Manifest: 28 jamaah confirmed | 2 pending dokumen
```

- Backend: tambah query param `?summary=true` ke `GET /api/admin/departures/:id/manifest-data`
- Return: `{ totalConfirmed, totalPendingDokumen }`
- Frontend: tampilkan di departure card bawah quota bar

**Files:**
- `artifacts/api-server/src/routes/admin/departures.ts`
- `artifacts/umroh-app/src/features/admin/pages/Departures.tsx`

---

### 🟢 PRIORITAS 5 — Riwayat Cetak Manifest / Audit Trail (Low)
**Estimasi: 1 hari kerja**

Schema `manifests` sudah ada (dibuat di MN-DB01), snapshot disimpan saat PDF di-download. Yang belum ada: **UI untuk melihat riwayat tersebut**.

- Di halaman Manifest atau departure card: tampilkan "Terakhir dicetak: [tanggal]"
- Tombol "Lihat Riwayat Cetak" → list snapshot manifest (tanggal, total jemaah saat itu)
- Berguna untuk audit trail jika ada perubahan data pasca-cetak

**Files:**
- `artifacts/umroh-app/src/features/admin/pages/Manifest.tsx`
- `artifacts/api-server/src/routes/admin/departures.ts` — GET manifest history per departure

---

## URUTAN PENGERJAAN YANG DISARANKAN

```
Minggu ini:
  [P1] Nama pemesan konsisten       ← selesaikan dulu, block P2
  [P3] Tombol manifest + auto-select ← independen, bisa paralel dengan P1

Minggu depan:
  [P2] Batch booking multi-jamaah   ← butuh P1 selesai dulu (field pemesan_name)
  [P4] Summary manifest di card      ← bisa dikerjakan bersamaan P2

Nanti (jika ada waktu):
  [P5] Riwayat cetak manifest        ← low priority, schema sudah siap
  [PK-01] Standarisasi camelCase     ✅ selesai — semua API & frontend sudah camelCase
```

---

## CATATAN ARSITEKTUR PENTING

| Isu | Keputusan |
|-----|-----------|
| `agentId` FK circular | Runtime validation di backend, bukan FK constraint |
| Batch booking route order | `POST /batch` harus sebelum `POST /:id` di Express router |
| Schema push | `cd lib/db && pnpm drizzle-kit push` setelah setiap perubahan schema |
| camelCase API | Perbaiki per-endpoint saat disentuh, jangan refactor global |
| `manifests` table | Sudah ada, snapshot tersimpan saat download PDF, UI belum ada |
| Quota warning | Saat ini hanya `console.warn`, notifikasi in-app belum karena butuh userId admin |

---

## RELASI DATABASE SAAT INI

```
packages (Paket Umroh)
   └── package_departures (Keberangkatan)     [FK ✅]
         ├── itineraries                       [FK ✅]
         │     └── itinerary_days              [FK ✅]
         ├── bookings (Booking)                [FK ✅, agentId runtime validation]
         │     ├── booking_pilgrims            [FK ✅ → pilgrims.id]
         │     │     └── check_ins             [FK ✅]
         │     ├── payment_transactions        [FK ✅]
         │     ├── installment_schedules       [FK ✅]
         │     └── booking_status_logs         [FK ✅]  ← Sprint 4
         └── manifests (Snapshot)             [FK ✅]  ← Sprint 4, UI belum

pilgrims (Master Jemaah)                      ← Sprint 3
   └── booking_pilgrims                       [FK pilgrimId → pilgrims.id]

pilgrim_equipment                             ← Sprint 3
   ├── FK: booking_pilgrim_id → booking_pilgrims.id CASCADE
   ├── FK: equipment_id → equipment.id
   └── FK: booking_id → bookings.id CASCADE

equipment                                     [total_stock ✅, relasi via pilgrim_equipment]
```

---

*File ini menggantikan `rencana-perbaikan-operasional.md` dan `RENCANA_PENGEMBANGAN_BOOKING_MANIFEST.md`.*
