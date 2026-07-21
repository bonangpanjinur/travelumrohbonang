# Rencana Pengembangan UmrohPlus — Master Document

> Digabung dari: `RENCANA_PENGEMBANGAN.md` + `docs/rencana-pengembangan-booking-keberangkatan.md`  
> Terakhir diperbarui: 21 Juli 2026  
> Verifikasi status: inspeksi kode langsung

---

## Legend Status

| Ikon | Arti |
|------|------|
| ✅ | Selesai diimplementasi |
| 🔄 | Sebagian selesai (backend ada, UI belum — atau sebaliknya) |
| ❌ | Belum dikerjakan |

---

## PROGRESS KESELURUHAN

```
Sprint 1  [██████████]  5/5   (100%) ✅ SELESAI
Sprint 2  [██████████]  10/10 (100%) ✅ SELESAI
Sprint 3  [██████████]  7/7   (100%) ✅ SELESAI
Sprint 4  [██████████]  15/15 (100%) ✅ SELESAI
Backlog   [██░░░░░░░░]  3/13  (23%)  ← SEDANG BERJALAN
```

---

## ✅ SPRINT 1–4 (SELESAI SEMUA)

<details>
<summary>Lihat detail sprint (klik untuk expand)</summary>

### Sprint 1 — Bug Kritis & Quick Wins
| ✅ | ID | Judul |
|----|----|-------|
| ✅ | BK-02 | Export Excel tidak jalan (URL hardcode) |
| ✅ | KB-03 | Manifest PDF bergantung `VITE_API_URL` |
| ✅ | JM-01 | Upload dokumen ke path Supabase hardcode |
| ✅ | BK-01 | Halaman Booking kosong & search sempit |
| ✅ | JM-02 | Validasi nomor HP terlalu ketat |

### Sprint 2 — Perbaikan UI & UX
| ✅ | ID | Judul |
|----|----|-------|
| ✅ | KB-02 | Redesign UI Keberangkatan (badge status + progress bar quota) |
| ✅ | KB-F01 | Tombol clone/duplikat keberangkatan |
| ✅ | PL-01 | Pagination + search halaman Perlengkapan |
| ✅ | KB-01 | Tipe kamar dinamis (quad/triple/double/single) |
| ✅ | BK-F01 | Filter Booking by status & paket |
| ✅ | BK-F03 | Tampilkan daftar jemaah di detail Booking |
| ✅ | IT-01 | Upload gambar hari Itinerary |
| ✅ | MN-01 | Pagination Manifest server-side |
| ✅ | MN-02 | Tombol Print/Export manifest lebih menonjol |
| ✅ | PL-02 | Upload gambar perlengkapan |

### Sprint 3 — Fitur Kritis & Schema DB
| ✅ | ID | Judul |
|----|----|-------|
| ✅ | BK-DB01 | Validasi agentId runtime (bukan FK — circular import) |
| ✅ | BK-DB02 | Sinkronisasi `remainingQuota` dalam transaksi DB |
| ✅ | PL-DB01 | Tabel `pilgrim_equipment` di Drizzle + push ke DB |
| ✅ | PL-F01 | UI assignment perlengkapan ke jemaah per booking |
| ✅ | PL-F02 | Manajemen stok perlengkapan (totalStock, distributedCount) |
| ✅ | JM-DB01 | Tabel master `pilgrims` (unique NIK + paspor) |
| ✅ | JM-F01 | Halaman "Database Jemaah" — semua jemaah + riwayat |

### Sprint 4 — Fitur Tambahan & Kualitas
| ✅ | ID | Judul |
|----|----|-------|
| ✅ | BK-03 | Log/history perubahan status booking |
| ✅ | BK-F02 | Bulk action: konfirmasi/batalkan banyak booking |
| ✅ | JM-F02 | Flag paspor jemaah hampir expired (badge merah/oranye) |
| ✅ | JM-DB02 | Relasi jemaah ↔ perlengkapan di detail jemaah |
| ✅ | MN-F02 | Status check-in jemaah di halaman Manifest |
| ✅ | MN-DB01 | Snapshot manifest saat PDF dicetak (tabel `manifests`) |
| ✅ | MN-F01 | QR code verifikasi manifest |
| ✅ | IT-F01 | Salin template itinerary ke keberangkatan lain |
| ✅ | IT-F02 | Preview mode itinerary (tampilan jemaah) |
| ✅ | IT-02 | Standarisasi snake_case response di Itinerary API |
| ✅ | KB-F02 | Log warning quota hampir penuh setelah booking dibuat |
| ✅ | PK-02 | Extra Hotels pakai flag `is_active`, tidak hardcode nama |
| ✅ | PK-F01 | Preview halaman publik paket dari admin |
| ✅ | PL-F03 | Laporan distribusi perlengkapan (ringkasan + export) |
| ✅ | PK-01 | Standarisasi camelCase di seluruh API & frontend |

</details>

---

## BACKLOG — STATUS SAAT INI

---

### ✅ A. Navigasi Langsung ke Manifest per Keberangkatan
> **Selesai — ditemukan di codebase**

| Item | Status | Bukti |
|------|--------|-------|
| Tombol "Lihat Manifest" di departure card | ✅ | `Departures.tsx` — `navigate('/admin/manifest?departureId=...')` |
| Auto-select departure saat buka halaman Manifest | ✅ | `Manifest.tsx` baris 103 — `searchParams.get("departureId")` |

---

### ✅ B. Form Booking Admin Terpadu (Unifikasi)
> **Selesai — `AdminBookingDialog.tsx` sudah ada**

| Item | Status | Bukti |
|------|--------|-------|
| Form terpadu 1-N jamaah (`AdminBookingDialog.tsx`) | ✅ | Menggantikan `AdminCreateBookingDialog` + `AdminGroupBookingDialog` |
| Nama Pemesan wajib diisi di form | ✅ | `AdminBookingDialog.tsx` — field required `pemesanName` |
| Backend validasi `pemesanName` tidak boleh kosong | ✅ | `admin/bookings.ts` — `if (!pemesanName \|\| !pemesanName.trim()) throw 400` |
| `AdminGroupBookingDialog.tsx` masih ada (perlu dibersihkan) | 🔄 | File lama masih exist, perlu pastikan tidak dipakai lagi |

---

### 🔄 C. Tambah / Edit Jamaah dari Booking Detail
> **Backend sebagian ada, UI belum**

| Item | Status | Bukti |
|------|--------|-------|
| `POST /admin/bookings/:id/pilgrims` — tambah jamaah | ✅ | `admin/bookings.ts` baris 752 |
| `PATCH /admin/pilgrims/:id` — edit data jamaah | ❌ | Tidak ditemukan di routes |
| `DELETE /admin/pilgrims/:id` — hapus jamaah dari booking | ❌ | Tidak ditemukan di routes |
| Tombol "+ Tambah Jamaah" di `BookingDetailPanel.tsx` | ❌ | Belum ada UI di panel detail booking |
| `PilgrimDetailDrawer.tsx` editable | ❌ | Masih read-only |

**File yang perlu diubah:**
- `artifacts/api-server/src/routes/admin/bookings.ts` — tambah PATCH + DELETE pilgrim endpoints
- `artifacts/umroh-app/src/features/admin/pages/components/BookingDetailPanel.tsx` — tombol "+ Tambah Jamaah" + mini-form
- `artifacts/umroh-app/src/features/admin/components/PilgrimDetailDrawer.tsx` — jadikan editable

---

### ❌ D. Ringkasan Manifest di Departure Card
> **Belum ada** — endpoint maupun UI

Tampilkan summary cepat di setiap kartu keberangkatan:
```
📋 Manifest: 38 jamaah terkonfirmasi
   ✅ 30 dokumen lengkap   ⚠️ 8 belum lengkap
[Lihat Manifest]  [Download PDF]
```

**Yang perlu dibuat:**

Backend — endpoint baru `GET /admin/departures/:id/manifest-summary`:
```json
{
  "confirmedPilgrims": 38,
  "docsComplete": 30,
  "docsIncomplete": 8
}
```

Frontend — tambah summary block di kartu di `Departures.tsx`

**File:**
- `artifacts/api-server/src/routes/admin/departures.ts` — endpoint manifest-summary
- `artifacts/umroh-app/src/features/admin/pages/Departures.tsx` — render summary

---

### ❌ E. Shortcut Manifest dari Booking Detail + Filter di Halaman Manifest
> **Belum ada**

Dua item terkait:

**E1 — Link dari BookingDetailPanel ke Manifest keberangkatan:**
- Tambah link "Lihat semua jamaah keberangkatan ini →" di `BookingDetailPanel.tsx`
- Mengarah ke `/admin/manifest?departureId={departureId}`

**E2 — Kolom tambahan di tabel Manifest:**
- **Kode Booking** (clickable → buka detail booking)
- **Nama Pemesan** (untuk rombongan: nama PIC)

**File:**
- `artifacts/umroh-app/src/features/admin/pages/components/BookingDetailPanel.tsx`
- `artifacts/umroh-app/src/features/admin/pages/Manifest.tsx`

---

### ❌ F. Halaman Jadwal Keberangkatan Publik (`/jadwal`)
> **Belum ada** — halaman, endpoint, maupun integrasi di navbar/homepage

Calon jamaah saat ini hanya bisa lihat jadwal dari dalam detail paket. Tidak ada halaman lintas-paket.

**Yang perlu dibuat:**

```
/jadwal — Jadwal Keberangkatan Umroh
Filter: [Bulan ▼] [Tahun ▼] [Paket ▼]
Dikelompokkan per bulan, setiap baris ada tombol [Daftar →]
```

**Backend:** `GET /api/public/jadwal?month=&year=&packageId=`

**Frontend:**
- `artifacts/umroh-app/src/features/cms/pages/Jadwal.tsx` ← buat baru
- `artifacts/umroh-app/src/features/cms/pages/Index.tsx` — section "Jadwal Terdekat" + countdown
- Navbar publik — tambah menu "Jadwal"
- `App.tsx` — tambah route `/jadwal`

---

### ❌ G. Perbaikan Kolom & Filter di Booking List
> **Belum ada**

Tambahkan ke `BookingTable.tsx` dan `Bookings.tsx`:
- Kolom **"Jumlah Jamaah"** (dari `paxCount`)
- Kolom **"Nama Pemesan"** eksplisit (bukan fallback)
- Filter **"Keberangkatan"** — dropdown pilih tanggal spesifik
- Badge **"Rombongan"** untuk booking grup
- Quick action: ikon **👥 Lihat Jamaah** per baris

---

### ❌ H. Riwayat Cetak Manifest / Audit Trail
> **Schema sudah ada, UI belum**

Tabel `manifests` sudah ada dan snapshot tersimpan saat download PDF. Yang belum ada: UI untuk melihat riwayat.

- Tampilkan "Terakhir dicetak: [tanggal]" di halaman Manifest atau departure card
- Tombol "Lihat Riwayat Cetak" → list snapshot (tanggal, total jamaah saat itu)

**File:**
- `artifacts/umroh-app/src/features/admin/pages/Manifest.tsx`
- `artifacts/api-server/src/routes/admin/departures.ts` — GET manifest history per departure

---

### ❌ I. Nama Pemesan — Backfill Data Lama
> **Kolom ada, data lama belum diisi**

Kolom `pemesan_name` + `pemesan_phone` sudah ada di tabel `bookings`. Form baru sudah mengisinya. Tapi booking lama yang dibuat sebelum form baru mungkin masih kosong.

Script migrasi data:
- Booking dengan `user_id`: isi `pemesan_name` dari tabel `profiles`
- Booking tanpa `user_id`: isi dari `booking_pilgrims` pertama (nama jamaah pertama)

**File:** `artifacts/api-server/src/routes/admin/bookings.ts` atau script terpisah

---

## URUTAN PENGERJAAN YANG DISARANKAN

```
Segera (sudah selesai, perlu verifikasi/cleanup):
  [A] Pastikan AdminBookingDialog.tsx terpasang & dialog lama tidak dipakai
  [B] Hapus/arsipkan AdminCreateBookingDialog + AdminGroupBookingDialog jika sudah tidak dipakai

Minggu ini (nilai tinggi, effort rendah):
  [C] Tambah/edit jamaah dari booking detail  ← backend setengah jalan, tinggal UI
  [D] Manifest summary di departure card      ← 1 endpoint + UI kecil
  [E] Shortcut manifest dari booking detail   ← 1 link + 2 kolom

Minggu depan (fitur baru):
  [F] Halaman jadwal publik /jadwal           ← endpoint baru + halaman baru
  [G] Perbaikan kolom booking list            ← UI only, data sudah ada
  [I] Backfill pemesan_name data lama         ← script SQL 1x

Nanti (low priority):
  [H] Riwayat cetak manifest                 ← schema siap, tinggal UI
```

---

## CATATAN ARSITEKTUR PENTING

| Isu | Keputusan |
|-----|-----------|
| `agentId` FK circular | Runtime validation di backend, bukan FK constraint |
| Batch booking route order | `POST /batch` harus sebelum `POST /:id` di Express router |
| Schema push | `cd lib/db && pnpm drizzle-kit push` setelah setiap perubahan schema |
| camelCase API | Perbaiki per-endpoint saat disentuh, jangan refactor global |
| `manifests` table | Schema ada, snapshot tersimpan saat download PDF, UI riwayat belum ada |
| `pemesan_name` | Kolom ada, form baru mengisi, data lama perlu backfill |
| Form booking | `AdminBookingDialog.tsx` = form terpadu baru; dua file lama masih ada, perlu verifikasi |

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
         │     └── booking_status_logs         [FK ✅]
         └── manifests (Snapshot)             [FK ✅] ← schema ada, UI riwayat belum

pilgrims (Master Jemaah)
   └── booking_pilgrims                       [FK pilgrimId → pilgrims.id]

pilgrim_equipment
   ├── FK: booking_pilgrim_id → booking_pilgrims.id CASCADE
   ├── FK: equipment_id → equipment.id
   └── FK: booking_id → bookings.id CASCADE

equipment                                     [total_stock ✅, relasi via pilgrim_equipment]
```

---

*File ini menggantikan `RENCANA_PENGEMBANGAN.md` (versi lama) dan `docs/rencana-pengembangan-booking-keberangkatan.md`.*
