# Rencana Pengembangan & Perbaikan UmrohPlus — Master Document

> Digabung dari: `RENCANA_PENGEMBANGAN.md` + `RENCANA_PERBAIKAN_OPERASIONAL.md` + `docs/rencana-pengembangan-booking-keberangkatan.md`  
> Terakhir diperbarui: 22 Juli 2026  
> Verifikasi status: inspeksi kode langsung

---

## STATUS KESELURUHAN

```
Sprint 1      [██████████]  5/5   (100%) ✅ SELESAI
Sprint 2      [██████████]  10/10 (100%) ✅ SELESAI
Sprint 3      [██████████]  7/7   (100%) ✅ SELESAI
Sprint 4      [██████████]  15/15 (100%) ✅ SELESAI
Backlog       [██████████]  13/13 (100%) ✅ SELESAI
Booking       [██████████]  8/8   (100%) ✅ SELESAI
Keberangkatan [██████████]  8/8   (100%) ✅ SELESAI
Operasional   [██████████]  10/10 (100%) ✅ SELESAI
```

> **Tidak ada item yang tersisa. Semua fitur dan perbaikan sudah selesai diimplementasikan.**

---

## FITUR BOOKING (SEMUA SELESAI)

### Bug Booking

| ID | Judul |
|----|-------|
| ✅ BKG-BUG-01 | Draft → Confirmed selalu gagal (state machine tidak daftarkan `draft`) |
| ✅ BKG-BUG-02 | Status `pending`, `confirmed`, `completed` tampil sebagai kode mentah di badge |
| ✅ BKG-BUG-03 | Tidak ada tombol ubah status individual di detail panel (hanya bulk action) |
| ✅ BKG-BUG-04 | Filter status hanya 4 opsi, tidak include `pending`/`confirmed`/`completed` |
| ✅ BKG-BUG-05 | `window.confirm()` native diganti `AlertDialog` Radix |

### Fitur Booking

| ID | Judul |
|----|-------|
| ✅ BKG-F01 | Panel pembayaran di detail booking (ringkasan, histori, verifikasi) |
| ✅ BKG-F02 | Tampilan kamar + breakdown total harga |
| ✅ BKG-F03 | Catatan/Notes booking — UI view + inline edit + `PATCH /:id/notes` |
| ✅ BKG-F04 | Kolom tambahan di tabel: Status Bayar, jumlah jemaah, HP pemesan |
| ✅ BKG-F05 | Bulk action tambahan — pindah keberangkatan massal + export hanya yang dicentang |
| ✅ BKG-F06 | Shortcut WhatsApp langsung di baris tabel |

---

## FITUR KEBERANGKATAN (SEMUA SELESAI)

| ID | Judul |
|----|-------|
| ✅ KB-F01 | Tombol clone/duplikat keberangkatan |
| ✅ KB-F02 | Log warning quota hampir penuh setelah booking dibuat |
| ✅ KB-F03 | Info penerbangan di form (maskapai, nomor penerbangan, bandara keberangkatan/tujuan) |
| ✅ KB-F04 | Tombol "Keuangan" & "Checklist" di departure card |
| ✅ KB-F05 | DepartureDetailDrawer: muthawif, penerbangan, harga kamar, ringkasan manifest, quick links |
| ✅ KB-F06 | Master data Muthawif — halaman UI (`Muthawifs.tsx` + route `/admin/muthawifs`) |
| ✅ KB-F07 | Status "Draft" di form keberangkatan + StatusBadge (badge abu-abu) |
| ✅ KB-F08 | Manifest history dengan diff/snapshot versi — snapshot penuh jemaah, delta badge, expandable detail |

---

## PERBAIKAN OPERASIONAL (SEMUA SELESAI)

### Menu Operasional — Struktur & Ikon

Menu Operasional (19 item) sekarang mengikuti alur kerja yang logis:

| # | Grup | Menu |
|---|------|------|
| 1 | **Setup Paket** | Paket → Jadwal Keberangkatan → Itinerary Perjalanan |
| 2 | **Booking & Jemaah** | Booking → Jemaah per Booking → Data Induk Jemaah |
| 3 | **Dokumen & Visa** | Dokumen Jemaah → Tracking Dokumen → Tracking Visa |
| 4 | **Perlengkapan** | Materi Manasik → Distribusi Perlengkapan |
| 5 | **Persiapan Keberangkatan** | Penempatan Kamar → Assignment Kursi → Manifest → Checklist → Kesiapan → Check-In |
| 6 | **Laporan Operasional** | Laporan Perlengkapan → Laporan Insiden |

Ikon duplikat yang sudah diperbaiki:

| Menu | Ikon Lama | Ikon Baru |
|------|-----------|-----------|
| Distribusi Perlengkapan | `Backpack` | `Truck` |
| Laporan Perlengkapan | `Backpack` | `PackageCheck` |
| Assignment Kursi | `ClipboardList` | `Armchair` |
| Checklist Keberangkatan | `ClipboardList` | `ListChecks` |
| Tracking Visa | `FileCheck` | `IdCard` |

**Penamaan diperjelas:** "Perlengkapan Manasik" → "Materi Manasik" *(halaman ini berisi materi/modul pembelajaran, bukan distribusi fisik)*

### Bug Operasional

| ID | Prioritas | Judul | Status |
|----|-----------|-------|--------|
| B-01 | 🔴 Critical | QR Code Check-In: key `pid` di Manifest vs `pilgrim_id` di CheckIn.tsx | ✅ SELESAI |
| B-02 | 🟠 High | Kolom DB belum ada di Equipment Report (`returnedAt`, `size`, `quantity`) | ✅ SELESAI |
| B-03 | 🟠 High | Relasi salah di Documents.tsx — query `bookings→packages` via `booking_pilgrims` | ✅ SELESAI |
| B-04 | 🟡 Medium | `window.confirm` dipakai di `IncidentManagement.tsx`, `DepartureChecklist.tsx` | ✅ SELESAI |
| B-05 | 🟡 Medium | Manasik.tsx tidak ada upload file PDF/gambar — hanya URL manual | ✅ SELESAI |
| B-06 | 🟡 Medium | VisaTracking.tsx: threshold 90 hari hardcoded, tidak fleksibel | ✅ SELESAI |
| B-07 | 🟡 Medium | SeatAssignment.tsx: tidak ada pilihan penerbangan spesifik per segmen | ✅ SELESAI |
| B-08 | 🟢 Low | EquipmentDistribution.tsx: response parsing `r.data ?? r` tidak type-safe | ✅ SELESAI |
| B-09 | 🟢 Low | RoomAssignment.tsx: race condition saat TanStack Query refetch & user sedang edit | ✅ SELESAI |
| B-10 | 🟢 Low | EquipmentReport.tsx: fetch semua tanpa pagination, lambat jika data ribuan | ✅ SELESAI |

---

## BACKLOG A–I (SEMUA SELESAI)

| ID | Judul |
|----|-------|
| ✅ A | Navigasi langsung ke Manifest per Keberangkatan |
| ✅ B | Form Booking Admin Terpadu — `AdminBookingDialog.tsx` |
| ✅ C | Tambah / Edit Jamaah dari Booking Detail |
| ✅ D | Ringkasan Manifest di Departure Card |
| ✅ E | Shortcut Manifest dari Booking Detail + kolom Nama Pemesan di Manifest |
| ✅ F | Halaman Jadwal Keberangkatan Publik (`/jadwal`) |
| ✅ G | Perbaikan Kolom & Filter di Booking List |
| ✅ H | Riwayat Cetak Manifest / Audit Trail |
| ✅ I | Nama Pemesan — Backfill Data Lama |

---

## SPRINT 1–4 (SEMUA SELESAI)

<details>
<summary>Lihat detail sprint (klik untuk expand)</summary>

### Sprint 1 — Bug Kritis & Quick Wins
| ID | Judul |
|----|-------|
| ✅ BK-02 | Export Excel tidak jalan (URL hardcode) |
| ✅ KB-03 | Manifest PDF bergantung `VITE_API_URL` |
| ✅ JM-01 | Upload dokumen ke path Supabase hardcode |
| ✅ BK-01 | Halaman Booking kosong & search sempit |
| ✅ JM-02 | Validasi nomor HP terlalu ketat |

### Sprint 2 — Perbaikan UI & UX
| ID | Judul |
|----|-------|
| ✅ KB-02 | Redesign UI Keberangkatan (badge status + progress bar quota) |
| ✅ KB-F01 | Tombol clone/duplikat keberangkatan |
| ✅ PL-01 | Pagination + search halaman Perlengkapan |
| ✅ KB-01 | Tipe kamar dinamis (quad/triple/double/single) |
| ✅ BK-F01 | Filter Booking by status & paket |
| ✅ BK-F03 | Tampilkan daftar jemaah di detail Booking |
| ✅ IT-01 | Upload gambar hari Itinerary |
| ✅ MN-01 | Pagination Manifest server-side |
| ✅ MN-02 | Tombol Print/Export manifest lebih menonjol |
| ✅ PL-02 | Upload gambar perlengkapan |

### Sprint 3 — Fitur Kritis & Schema DB
| ID | Judul |
|----|-------|
| ✅ BK-DB01 | Validasi agentId runtime (bukan FK — circular import) |
| ✅ BK-DB02 | Sinkronisasi `remainingQuota` dalam transaksi DB |
| ✅ PL-DB01 | Tabel `pilgrim_equipment` di Drizzle + push ke DB |
| ✅ PL-F01 | UI assignment perlengkapan ke jemaah per booking |
| ✅ PL-F02 | Manajemen stok perlengkapan (totalStock, distributedCount) |
| ✅ JM-DB01 | Tabel master `pilgrims` (unique NIK + paspor) |
| ✅ JM-F01 | Halaman "Database Jemaah" — semua jemaah + riwayat |

### Sprint 4 — Fitur Tambahan & Kualitas
| ID | Judul |
|----|-------|
| ✅ BK-03 | Log/history perubahan status booking |
| ✅ BK-F02 | Bulk action: konfirmasi/batalkan banyak booking |
| ✅ JM-F02 | Flag paspor jemaah hampir expired (badge merah/oranye) |
| ✅ JM-DB02 | Relasi jemaah ↔ perlengkapan di detail jemaah |
| ✅ MN-F02 | Status check-in jemaah di halaman Manifest |
| ✅ MN-DB01 | Snapshot manifest saat PDF dicetak (tabel `manifests`) |
| ✅ MN-F01 | QR code verifikasi manifest |
| ✅ IT-F01 | Salin template itinerary ke keberangkatan lain |
| ✅ IT-F02 | Preview mode itinerary (tampilan jemaah) |
| ✅ IT-02 | Standarisasi snake_case response di Itinerary API |
| ✅ KB-F02 | Log warning quota hampir penuh setelah booking dibuat |
| ✅ PK-02 | Extra Hotels pakai flag `is_active`, tidak hardcode nama |
| ✅ PK-F01 | Preview halaman publik paket dari admin |
| ✅ PL-F03 | Laporan distribusi perlengkapan (ringkasan + export) |
| ✅ PK-01 | Standarisasi camelCase di seluruh API & frontend |

</details>

---

## CATATAN ARSITEKTUR PENTING

| Isu | Keputusan |
|-----|-----------|
| `agentId` FK circular | Runtime validation di backend, bukan FK constraint |
| Batch booking route order | `POST /batch` harus sebelum `POST /:id` di Express router |
| Schema push | `cd lib/db && pnpm drizzle-kit push` setelah setiap perubahan schema |
| camelCase API | Perbaiki per-endpoint saat disentuh, jangan refactor global |
| `manifests` table | Snapshot penuh jemaah tersimpan saat download PDF; UI riwayat cetak dengan delta badge dan expandable detail sudah ada |
| `pemesan_name` | Kolom ada, form baru mengisi, data lama sudah di-backfill |
| Form booking | `AdminBookingDialog.tsx` = form terpadu baru; file lama masih ada, perlu verifikasi tidak dipakai |
| Bulk move departure | Hanya booking yang benar-benar berpindah (`current.departureId ≠ tujuan`) yang mengurangi kuota tujuan — booking yang sudah di tujuan diabaikan |

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
         └── manifests (Snapshot)             [FK ✅] ← snapshot penuh + diff versi ✅

pilgrims (Master Jemaah)
   └── booking_pilgrims                       [FK pilgrimId → pilgrims.id]

pilgrim_equipment
   ├── FK: booking_pilgrim_id → booking_pilgrims.id CASCADE
   ├── FK: equipment_id → equipment.id
   └── FK: booking_id → bookings.id CASCADE

equipment                                     [total_stock ✅, relasi via pilgrim_equipment]
```

---

*File ini menggantikan `RENCANA_PENGEMBANGAN.md`, `RENCANA_PERBAIKAN_OPERASIONAL.md`, dan `docs/rencana-pengembangan-booking-keberangkatan.md`.*
