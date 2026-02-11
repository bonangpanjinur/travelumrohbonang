

# Rencana Perbaikan Menyeluruh: Sinkronisasi Database, Admin Dashboard, dan Frontend

## Temuan Masalah

Setelah analisis mendalam, berikut masalah-masalah yang ditemukan:

### 1. Bug: Edit Keberangkatan Reset `remaining_quota`
**Lokasi:** `src/pages/admin/Departures.tsx` baris 94
**Masalah:** Saat admin mengedit keberangkatan (misal ubah tanggal/harga), `remaining_quota` selalu di-reset ke `form.quota`. Ini akan menghapus data booking yang sudah masuk, karena sisa kursi kembali penuh.
**Perbaikan:** Hanya update `remaining_quota` jika `quota` berubah (selisih ditambahkan), atau jangan update `remaining_quota` sama sekali saat edit.

### 2. Dashboard Tidak Menampilkan Muthawif
**Lokasi:** `src/pages/admin/Dashboard.tsx`
**Masalah:** Dashboard menampilkan stat untuk Total Paket, Keberangkatan, Booking, Jemaah, Cabang, dan Agen -- tapi tidak ada stat untuk Muthawif, padahal tabel `muthawifs` ada dan sudah terisi 3 data.
**Perbaikan:** Tambahkan stat card "Muthawif" di dashboard.

### 3. Admin Packages: Tidak Ada Kolom `image_url`
**Lokasi:** `src/pages/admin/Packages.tsx`
**Masalah:** Form admin tidak menyediakan field untuk upload/input `image_url` paket. Kolom `image_url` ada di tabel `packages` dan digunakan di frontend (`PackageDetail.tsx`, `Paket.tsx`), tapi admin tidak bisa mengisinya.
**Perbaikan:** Tambahkan field upload gambar atau input URL di form admin paket.

### 4. Admin Departures: Tidak Ada Kolom Muthawif
**Lokasi:** `src/pages/admin/Departures.tsx`
**Masalah:** Tabel `package_departures` memiliki kolom `muthawif_id`, dan sudah ada data yang terisi. Namun form admin keberangkatan tidak menyediakan dropdown untuk memilih muthawif.
**Perbaikan:** Tambahkan dropdown muthawif di form keberangkatan.

### 5. Frontend PackageDetail: Fasilitas Hardcoded
**Lokasi:** `src/pages/PackageDetail.tsx` baris 246-262
**Masalah:** Daftar fasilitas ("Tiket Pesawat PP", "Hotel Dekat Masjidil Haram", dll) di-hardcode, bukan dari database. Tidak bisa dikustomisasi per paket.
**Perbaikan (opsional):** Buat tabel `package_facilities` atau tambahkan field JSON di packages. Atau biarkan jika memang standar untuk semua paket.

### 6. Booking Admin: Verifikasi Ganda
**Lokasi:** `src/pages/admin/Bookings.tsx` dan `src/pages/admin/Payments.tsx`
**Masalah:** Ada dua tempat untuk verifikasi pembayaran: di halaman Booking (update status booking langsung ke "paid") dan di halaman Payments (update payment status + booking status). Logikanya bisa konflik:
- Di Bookings: langsung set `bookings.status = 'paid'` tanpa cek jumlah bayar
- Di Payments: set `payments.status = 'paid'` lalu set `bookings.status = 'paid'`
**Perbaikan:** Hapus tombol verifikasi dari halaman Booking, karena verifikasi seharusnya dilakukan melalui halaman Payments yang lebih detail.

### 7. Bank Account Hardcoded di Payment
**Lokasi:** `src/pages/Payment.tsx` baris 226-230
**Masalah:** Informasi rekening bank ("Bank Mandiri", "123-456-7890") di-hardcode. Seharusnya diambil dari `site_settings` atau `settings` agar admin bisa mengubahnya.
**Perbaikan:** Ambil data rekening dari tabel `settings` atau `site_settings`.

### 8. Booking PIC Type Mismatch di UI vs DB
**Lokasi:** `src/pages/Booking.tsx`
**Masalah:** RadioGroup menggunakan value "cabang" dan "agen" di UI, tapi database mengharuskan "branch" dan "agent". Sudah ada mapping di line 188, tapi label dan value di RadioGroup masih inkonsisten -- bisa membingungkan di maintenance.
**Perbaikan:** Ubah RadioGroup value langsung ke "branch" dan "agent" untuk konsistensi.

### 9. Dashboard Revenue Hanya Hitung Status "paid"
**Lokasi:** `src/pages/admin/Dashboard.tsx`
**Masalah:** Revenue dihitung dari `bookings.status = 'paid'`, tapi `waiting_payment` juga bisa dianggap sebagai potensi revenue. Ini mungkin by design, tapi perlu dipertimbangkan apakah menampilkan "Potensi Pendapatan" juga berguna.
**Perbaikan (minor):** Tambahkan card "Potensi Pendapatan" yang menghitung booking `waiting_payment`.

---

## Rencana Implementasi

### Prioritas Tinggi (Bug Fix)

| No | Perbaikan | File |
|----|-----------|------|
| 1 | Fix remaining_quota reset saat edit keberangkatan | `src/pages/admin/Departures.tsx` |
| 2 | Sinkronkan PIC type values di Booking form (gunakan "branch"/"agent" langsung) | `src/pages/Booking.tsx` |
| 3 | Hapus verifikasi ganda di Bookings, arahkan ke Payments | `src/pages/admin/Bookings.tsx` |

### Prioritas Sedang (Fitur Admin Belum Lengkap)

| No | Perbaikan | File |
|----|-----------|------|
| 4 | Tambah field image_url di form admin paket | `src/pages/admin/Packages.tsx` |
| 5 | Tambah dropdown muthawif di form keberangkatan | `src/pages/admin/Departures.tsx` |
| 6 | Tambah stat Muthawif di dashboard | `src/pages/admin/Dashboard.tsx` |
| 7 | Ambil info rekening bank dari database, bukan hardcode | `src/pages/Payment.tsx` + insert data ke `settings` |

### Prioritas Rendah (Enhancement)

| No | Perbaikan | File |
|----|-----------|------|
| 8 | Tambah card "Potensi Pendapatan" di dashboard | `src/pages/admin/Dashboard.tsx` |

---

## Detail Teknis

### 1. Fix remaining_quota (Departures.tsx)
Saat edit, hanya update `remaining_quota` jika quota berubah:
```text
remaining_quota = editing.remaining_quota + (form.quota - editing.quota)
```
Jika quota tidak berubah, `remaining_quota` tetap.

### 4. Image URL di Admin Packages
Tambahkan input field untuk URL gambar paket, atau file upload ke storage bucket (bisa menggunakan bucket `cms-images` yang sudah ada).

### 5. Muthawif di Departures
Fetch data muthawifs, tampilkan dropdown di form, dan simpan `muthawif_id` saat create/update departure.

### 7. Bank Account dari Database
Insert data rekening ke tabel `settings` dengan key seperti `bank_name`, `bank_account`, `bank_holder`. Lalu fetch di halaman Payment.

