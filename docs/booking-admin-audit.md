# Audit & Roadmap — Booking Admin Panel

> Dokumen ini merangkum hasil analisa modul Booking (frontend + backend) beserta status pengerjaannya.  
> Terakhir diperbarui: 24 Juli 2026

---

## Status Ringkasan

| Batch | Total Item | Selesai | Tersisa |
|-------|-----------|---------|---------|
| Batch 1 — Keamanan & Stabilitas Backend | 7 | ✅ 7 | 0 |
| Prioritas Utama — UX Kritis | 4 | ✅ 4 | 0 |
| P1 — Alur Tidak Optimal | 3 | ✅ 3 | 0 |
| P2 — Penyempurnaan | 3 | ❌ 0 | 3 |

---

## ✅ Batch 1 — Keamanan & Stabilitas Backend

File utama: `artifacts/api-server/src/routes/admin/bookings.ts`

| # | Masalah | Risiko | Status |
|---|---------|--------|--------|
| B1-1 | Backend mempercayai `totalPrice`/`roomPrice` dari frontend | Harga bisa dimanipulasi browser | ✅ Selesai |
| B1-2 | Kuota pakai `GREATEST(0, N - jumlah)` tanpa atomic check | Overselling di concurrent request | ✅ Selesai |
| B1-3 | Tidak ada validasi departure milik paket yang dipilih | Booking bisa lintas paket | ✅ Selesai |
| B1-4 | Tidak ada validasi tanggal keberangkatan sudah lewat | Booking bisa ke jadwal masa lalu | ✅ Selesai |
| B1-5 | Tidak ada validasi status departure harus `active` | Booking bisa ke jadwal non-aktif | ✅ Selesai |
| B1-6 | Tolak roomType dengan harga ≤ Rp0 di DB | Booking harga nol bisa masuk | ✅ Selesai |
| B1-7 | Filter `paid` masuk kolom `status` bukan subquery pembayaran | Data filter salah kolom | ✅ Selesai |

**Detail teknis Batch 1:**
- `POST /api/admin/bookings` dan `POST /api/admin/bookings/group` kini mengambil harga dari tabel `departure_prices` — nilai `totalPrice`/`roomPrice` dari request diabaikan.
- Quota decrement: `WHERE remaining_quota >= N RETURNING id` — jika baris tidak dikembalikan, respons `409 CAPACITY_FULL`.
- `GET /api/admin/bookings` kini mendukung `?paymentStatus=paid|partial|unpaid` via subquery ke `booking_payments`, terpisah dari `?status=`.

---

## ✅ Prioritas Utama — UX Kritis

| # | Item | File | Status |
|---|------|------|--------|
| P0-1 | Tombol "Lanjut" bisu tanpa penjelasan | `AdminBookingDialog.tsx` | ✅ Selesai |
| P0-2 | Harga Rp0 tampil sebagai pilihan aktif di UI | `AdminBookingDialog.tsx` | ✅ Selesai |
| P0-3 | Tidak ada debounce pada input search | `Bookings.tsx` | ✅ Selesai |
| P0-4 | Export Excel tidak membawa semua filter aktif | `Bookings.tsx` | ✅ Selesai |

**Detail teknis Prioritas Utama:**

- **P0-1:** Hint validasi muncul di sebelah kiri tombol "Lanjut" — Step 1 menampilkan "Pilih paket Umroh" / "Pilih jadwal keberangkatan", Step 2 menampilkan "Nama pemesan wajib diisi". Hilang otomatis begitu syarat terpenuhi.
- **P0-2:** `dep.prices.filter(p => p.price > 0)` di kartu jadwal (Step 1) dan tombol pilih kamar (Step 3). Jika semua harga Rp0, tampil pesan *"Harga belum diatur"*.
- **P0-3:** State dipisah menjadi `searchInput` (langsung ke input) dan `search` (dikirim ke API, debounce 300 ms via `useEffect` + `setTimeout`).
- **P0-4:** Export Excel kini meneruskan `paymentStatus`, `departureId`, `startDate`, `endDate` ke `GET /api/admin/bookings/export.xlsx`. Tombol CSV halaman digabung ke tombol Excel; export CSV masih tersedia untuk bulk-selected rows.

---

## ❌ P1 — Alur Tidak Optimal (Belum Dikerjakan)

### P1-1 · Hapus Komponen Lama

| Atribut | Detail |
|---------|--------|
| **File** | `AdminCreateBookingDialog.tsx`, `AdminGroupBookingDialog.tsx` |
| **Masalah** | Kedua file sudah tidak dipanggil di manapun sejak digantikan `AdminBookingDialog.tsx`, tapi masih ada di repo |
| **Risiko** | Developer berikutnya mungkin memperbaiki file yang salah; `useFormDraft` meninggalkan draft orphan di localStorage |
| **Fix** | Hapus kedua file |

---

### P1-2 · Bulk Action Tanpa Preview Dampak

| Atribut | Detail |
|---------|--------|
| **File** | `Bookings.tsx` (fungsi `handleBulkStatus`), `BulkChangeDepartureModal.tsx` |
| **Masalah** | "Konfirmasi Semua" / "Batalkan Semua" langsung eksekusi setelah satu klik konfirmasi tanpa ringkasan apa yang akan terdampak |
| **Fix** | Tampilkan dialog konfirmasi dengan: jumlah booking terpilih, total jamaah, nama paket/jadwal, peringatan jika ada booking yang sudah lunas |

---

### P1-3 · Step 1 Wizard Terlalu Padat

| Atribut | Detail |
|---------|--------|
| **File** | `AdminBookingDialog.tsx` (baris 451–506) |
| **Masalah** | Step 1 menggabungkan: pilih paket, pilih jadwal (list besar), skema bayar, cabang, agen referral, catatan internal — terlalu banyak untuk satu layar |
| **Fix** | Geser **Cabang** dan **Agen Referral** ke Step 2 (Data Pemesan); geser **Catatan Internal** ke Step 4 (Konfirmasi) |

---

## ❌ P2 — Penyempurnaan (Belum Dikerjakan)

### P2-1 · Summary Cards di Halaman Booking

| Atribut | Detail |
|---------|--------|
| **File** | `Bookings.tsx` (tambah section baru di atas tabel) |
| **Masalah** | Tidak ada angka sekilas di atas daftar — admin harus scroll dan hitung manual |
| **Data yang dibutuhkan** | Total booking aktif, menunggu pembayaran, lunas, berangkat dalam 30 hari |
| **Fix** | Tambah 4 stat cards memanggil endpoint analytics yang sudah ada (`GET /api/admin/analytics/dashboard-stats`) atau buat query baru |

---

### P2-2 · Readiness Check Sebelum "Tandai Selesai"

| Atribut | Detail |
|---------|--------|
| **File** | `BookingDetailPage.tsx` (fungsi `handleStatusChange`) |
| **Masalah** | Transisi ke status `completed` bisa dilakukan meski: pembayaran belum lunas, jamaah belum punya data lengkap, kamar belum di-assign |
| **Fix** | Sebelum memproses transisi ke `completed`, fetch readiness dari backend dan tampilkan checklist; blokir atau beri peringatan keras jika ada syarat belum terpenuhi |

---

### P2-3 · Validasi Format Email & Telepon

| Atribut | Detail |
|---------|--------|
| **File** | `AdminBookingDialog.tsx` Step 2 (baris sekitar 580–640) |
| **Masalah** | Input email dan nomor HP pemesan tidak divalidasi format — bisa diisi teks sembarang |
| **Fix** | Tambah validasi inline: email harus mengandung `@` dan domain, telepon harus diawali `08` atau `+62` dan hanya angka |

---

## Catatan Arsitektur

- **Idempotency key** (mencegah double-submit booking) belum diimplementasi karena butuh kolom baru di skema DB. Perlu migrasi terpisah.
- Harga booking selalu dalam IDR; kolom `currency` dan `exchangeRate` sudah ada di schema tapi belum diekspos ke UI untuk multi-currency.
- `useFormDraft` di `AdminBookingDialog.tsx` menyimpan draft ke `localStorage` dengan key berbeda per komponen — perlu periodic cleanup agar tidak membengkak.
