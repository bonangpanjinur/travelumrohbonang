# Rencana Pengembangan UmrohPlus — Master Document

> Digabung dari: `RENCANA_PENGEMBANGAN.md` + `docs/rencana-pengembangan-booking-keberangkatan.md`  
> Terakhir diperbarui: 21 Juli 2026  
> Verifikasi status: inspeksi kode langsung

---

## ANALISIS FITUR — BOOKING & KEBERANGKATAN

> Hasil analisis mendalam tanggal 21 Juli 2026.  
> Inspeksi langsung komponen: `BookingDetailPanel.tsx`, `BookingTable.tsx`, `BookingFilters.tsx`, `Bookings.tsx`, `Departures.tsx`, `DepartureDetailDrawer.tsx`, `InvoiceGenerator.ts`, `admin/bookings.ts`, `admin/departures.ts`.

### Bug yang Sudah Diperbaiki (21 Juli 2026)

| ✅ | ID | Judul | File |
|----|----|-------|------|
| ✅ | BKG-BUG-01 | Draft → Confirmed selalu gagal (state machine tidak daftarkan `draft`) | `admin/bookings.ts` |
| ✅ | BKG-BUG-02 | Status `pending`, `confirmed`, `completed` tampil sebagai kode mentah di badge | `BookingStatusBadge.tsx` |
| ✅ | BKG-BUG-03 | Tidak ada tombol ubah status individual di detail panel (hanya bulk action) | `BookingDetailPanel.tsx` |
| ✅ | BKG-BUG-04 | Filter status hanya 4 opsi, tidak include `pending`/`confirmed`/`completed` | `BookingFilters.tsx` |

---

### Sprint Berikutnya — Booking

#### 🔴 Prioritas Tinggi

| ❌ | ID | Judul | Keterangan | File Terdampak |
|----|----|-------|------------|----------------|
| ✅ | BKG-F01 | Panel pembayaran di detail booking | Tampilkan ringkasan (sudah bayar / sisa / status lunas), histori pembayaran, tombol "Tambah Pembayaran Manual", tombol "Verifikasi/Tolak" langsung dari panel | `BookingDetailPanel.tsx`, endpoint `GET /api/admin/bookings/:id/payments` sudah ada |
| ✅ | BKG-F02 | Tampilan kamar + total harga booking | Room data sudah di-fetch tapi tidak dirender — tampilkan tabel breakdown (tipe, qty, harga, subtotal) + total harga keseluruhan | `BookingDetailPanel.tsx` |
| ✅ | BKG-BUG-05 | `window.confirm()` native perlu diganti modal proper | Ganti dengan Radix `AlertDialog` dengan field alasan/catatan (terutama untuk pembatalan) | `BookingDetailPanel.tsx` |

#### 🟡 Prioritas Sedang

| ❌ | ID | Judul | Keterangan | File Terdampak |
|----|----|-------|------------|----------------|
| ✅ | BKG-F03 | Catatan/Notes booking | UI view + inline edit di `BookingDetailPanel.tsx`, endpoint PATCH /:id/notes di backend | `BookingDetailPanel.tsx` |
| ✅ | BKG-F04 | Kolom tambahan di tabel booking | Kolom "Status Bayar" (Lunas/DP-Cicil/Belum), jumlah jemaah + HP pemesan sebagai subtext | `BookingTable.tsx` |

#### 🟢 Prioritas Rendah

| ❌ | ID | Judul | Keterangan | File Terdampak |
|----|----|-------|------------|----------------|
| ❌ | BKG-F05 | Bulk action tambahan | Pindah keberangkatan massal, assign cabang massal, export hanya yang dicentang | `Bookings.tsx`, backend `bulk-*` endpoints |
| ✅ | BKG-F06 | Shortcut aksi cepat dari baris tabel | Tombol WhatsApp langsung di baris tabel (muncul jika ada HP pemesan), tanpa harus expand detail | `BookingTable.tsx` |

---

### Sprint Berikutnya — Jadwal Keberangkatan

#### 🔴 Prioritas Tinggi

| ❌ | ID | Judul | Keterangan | File Terdampak |
|----|----|-------|------------|----------------|
| ✅ | KB-F03 | Info penerbangan di form keberangkatan | Tambah field: maskapai, nomor penerbangan, bandara keberangkatan, bandara tujuan — krusial untuk manifest airline | `Departures.tsx`, `admin/departures.ts`, schema DB |
| ✅ | KB-F04 | Tombol "Keuangan" & "Checklist" di departure card | Halaman `DepartureFinance` dan `DepartureChecklist` sudah dibuat tapi tidak bisa diakses dari card | `Departures.tsx` — footer card |

#### 🟡 Prioritas Sedang

| ❌ | ID | Judul | Keterangan | File Terdampak |
|----|----|-------|------------|----------------|
| ✅ | KB-F05 | DepartureDetailDrawer lebih lengkap | Drawer sekarang tampil: muthawif, info penerbangan, harga per kamar, ringkasan manifest, quick links ke Manifest/Kesiapan | `DepartureDetailDrawer.tsx` |
| ❌ | KB-F06 | Master data Muthawif | Endpoint `/api/admin/masterdata/muthawifs` ada tapi halaman manajemen muthawif belum ada/placeholder | Perlu halaman baru |

#### 🟢 Prioritas Rendah

| ❌ | ID | Judul | Keterangan | File Terdampak |
|----|----|-------|------------|----------------|
| ✅ | KB-F07 | Status "Draft" untuk keberangkatan | Opsi "Draft" ditambah ke form + StatusBadge (badge abu-abu) | `Departures.tsx` |
| ❌ | KB-F08 | Manifest history dengan snapshot versi | "Riwayat Cetak" tampil timestamp & nama, belum tampil perbedaan versi manifest | `Manifest.tsx` |

---

### Ringkasan Gap Analisis

```
BOOKING
  Panel Pembayaran di Detail    ✅ Selesai
  Tampilan Kamar + Total Harga  ✅ Selesai
  Modal Konfirmasi Status       ✅ Selesai (AlertDialog)
  Catatan/Notes Booking         ✅ Selesai (UI view + edit + PATCH endpoint)
  Kolom Tabel Tambahan          ✅ Selesai (Status Bayar, jml jemaah, HP pemesan)

KEBERANGKATAN
  Info Penerbangan di Form      ❌ Tidak ada field airline/flight number
  Tombol Finance & Checklist    ❌ Halaman ada tapi tidak ada link dari card
  DepartureDetailDrawer         🔄 Ada tapi terlalu minimalis
  Master Data Muthawif          🔄 Endpoint ada, UI belum
  Status Draft Keberangkatan    ❌ Belum ada
```

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
Backlog   [██████████]  13/13 (100%) ✅ SELESAI
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

### ✅ C. Tambah / Edit Jamaah dari Booking Detail
> **Selesai** — backend POST/PATCH/DELETE ada, UI inline add + edit + delete di `BookingDetailPanel.tsx`, `PilgrimDetailDrawer.tsx` fully editable

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

### ✅ D. Ringkasan Manifest di Departure Card
> **Selesai** — `GET /admin/departures/:id/manifest-summary` + blok ringkasan (Terdaftar/Dok✓/Belum) di setiap kartu `Departures.tsx`

---

### ✅ E. Shortcut Manifest dari Booking Detail + Kolom Nama Pemesan di Manifest
> **Selesai** — tombol "Lihat Manifest" di `BookingDetailPanel.tsx` + kolom "Pemesan" di tabel `Manifest.tsx` + kolom ikut ke CSV export

---

### ✅ F. Halaman Jadwal Keberangkatan Publik (`/jadwal`)
> **Selesai** — `GET /api/packages/jadwal` + `Jadwal.tsx` + route App.tsx + menu "Jadwal" di Navbar default links

---

### ✅ G. Perbaikan Kolom & Filter di Booking List
> **Selesai** — kolom "Pemesan" di `BookingTable.tsx` + filter "Keberangkatan" di `Bookings.tsx` (panel Filter Lanjutan) + backend filter `departureId`

---

### ✅ H. Riwayat Cetak Manifest / Audit Trail
> **Selesai** — `GET /admin/departures/:id/manifest-history` + tombol "Riwayat Cetak" + panel riwayat di `Manifest.tsx`

---

### ✅ I. Nama Pemesan — Backfill Data Lama
> **Selesai** — `POST /api/admin/bookings/backfill-pemesan` mengisi dari `profiles` atau `booking_pilgrims` pertama

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
