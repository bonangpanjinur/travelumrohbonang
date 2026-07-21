# Rencana Pengembangan UmrohPlus — Master Document

> Digabung dari: `RENCANA_PENGEMBANGAN.md` + `docs/rencana-pengembangan-booking-keberangkatan.md`  
> Terakhir diperbarui: 21 Juli 2026  
> Verifikasi status: inspeksi kode langsung

---

## STATUS KESELURUHAN

```
Sprint 1  [██████████]  5/5   (100%) ✅ SELESAI
Sprint 2  [██████████]  10/10 (100%) ✅ SELESAI
Sprint 3  [██████████]  7/7   (100%) ✅ SELESAI
Sprint 4  [██████████]  15/15 (100%) ✅ SELESAI
Backlog   [██████████]  13/13 (100%) ✅ SELESAI
Booking   [████████░░]  6/8   (75%)  🔄 2 item tersisa
Keberangkatan [██████░░] 6/8  (75%)  🔄 2 item tersisa
```

---

## YANG MASIH TERSISA ❌

### Booking

| ID | Judul | Keterangan | File Terdampak |
|----|-------|------------|----------------|
| BKG-F05 | Bulk action tambahan | Pindah keberangkatan massal, export hanya yang dicentang | `Bookings.tsx`, backend endpoint baru |

### Jadwal Keberangkatan

| ID | Judul | Keterangan | File Terdampak |
|----|-------|------------|----------------|
| KB-F06 | Master data Muthawif | Endpoint `/api/admin/masterdata/muthawifs` ada, halaman UI belum ada | Halaman baru + route |
| KB-F08 | Manifest history versi | Riwayat cetak tampil timestamp saja, belum ada diff/snapshot versi | `Manifest.tsx` |

---

## YANG SUDAH SELESAI ✅

### Bug Booking (Semua Selesai)

| ID | Judul |
|----|-------|
| ✅ BKG-BUG-01 | Draft → Confirmed selalu gagal (state machine tidak daftarkan `draft`) |
| ✅ BKG-BUG-02 | Status `pending`, `confirmed`, `completed` tampil sebagai kode mentah di badge |
| ✅ BKG-BUG-03 | Tidak ada tombol ubah status individual di detail panel (hanya bulk action) |
| ✅ BKG-BUG-04 | Filter status hanya 4 opsi, tidak include `pending`/`confirmed`/`completed` |
| ✅ BKG-BUG-05 | `window.confirm()` native diganti `AlertDialog` Radix |

### Fitur Booking (6/8 Selesai)

| ID | Judul |
|----|-------|
| ✅ BKG-F01 | Panel pembayaran di detail booking (ringkasan, histori, verifikasi) |
| ✅ BKG-F02 | Tampilan kamar + breakdown total harga |
| ✅ BKG-F03 | Catatan/Notes booking — UI view + inline edit + `PATCH /:id/notes` |
| ✅ BKG-F04 | Kolom tambahan di tabel: Status Bayar, jumlah jemaah, HP pemesan |
| ❌ BKG-F05 | Bulk action tambahan (belum) |
| ✅ BKG-F06 | Shortcut WhatsApp langsung di baris tabel |

### Fitur Keberangkatan (6/8 Selesai)

| ID | Judul |
|----|-------|
| ✅ KB-F03 | Info penerbangan di form (maskapai, nomor penerbangan, bandara keberangkatan/tujuan) |
| ✅ KB-F04 | Tombol "Keuangan" & "Checklist" di departure card |
| ✅ KB-F05 | DepartureDetailDrawer: muthawif, penerbangan, harga kamar, ringkasan manifest, quick links |
| ❌ KB-F06 | Master data Muthawif — halaman UI (belum) |
| ✅ KB-F07 | Status "Draft" di form keberangkatan + StatusBadge (badge abu-abu) |
| ❌ KB-F08 | Manifest history dengan diff/snapshot versi (belum) |

### Backlog A–I (Semua Selesai)

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
| `manifests` table | Schema ada, snapshot tersimpan saat download PDF, UI riwayat sudah ada tapi belum ada diff versi |
| `pemesan_name` | Kolom ada, form baru mengisi, data lama sudah di-backfill |
| Form booking | `AdminBookingDialog.tsx` = form terpadu baru; file lama masih ada, perlu verifikasi tidak dipakai |

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
         └── manifests (Snapshot)             [FK ✅] ← snapshot ada, diff versi belum

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
