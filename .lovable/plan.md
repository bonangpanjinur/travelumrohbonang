

# Analisis Lengkap: Hal yang Masih Kurang

## A. Bug dan Masalah Kritis

### 1. Dashboard Admin: Data Hardcoded dan Tidak Lengkap
- **Lokasi:** `src/pages/admin/Dashboard.tsx`
- Grafik "Tren Pendaftaran Jamaah" hanya placeholder (tidak ada data nyata)
- "Aktivitas Terbaru" menampilkan data dummy statis (hardcoded "Ahmad Fulan", "2 jam yang lalu")
- Trend teks seperti "+12% bulan ini", "+3 agen baru" juga hardcoded, bukan dari data aktual
- Tidak ada stat untuk Muthawif, Cabang, Jemaah, atau Total Pendapatan

### 2. Fasilitas Paket Hardcoded di Frontend
- **Lokasi:** `src/pages/PackageDetail.tsx` baris 246-262
- Daftar fasilitas ("Tiket Pesawat PP", "Hotel Dekat Masjidil Haram", dll) di-hardcode
- Tidak bisa dikustomisasi per paket oleh admin

### 3. Halaman User: Route Tanpa Proteksi
- **Lokasi:** `src/App.tsx` baris 69-71
- Route `/my-bookings`, `/dashboard`, `/profile` tidak dibungkus dengan proteksi auth
- User yang belum login bisa mengakses halaman ini (meski masing-masing halaman punya pengecekan sendiri, lebih baik dilindungi di level route)

### 4. Dashboard User: Step Status Hardcoded
- **Lokasi:** `src/pages/Dashboard.tsx` baris 14-21
- Status step perjalanan (Pendaftaran, Pembayaran DP, Upload Dokumen, dll) semuanya hardcoded
- Tidak berubah berdasarkan status booking aktual user

---

## B. Fitur yang Belum Ada / Belum Lengkap

### 5. Tidak Ada Fitur Export Data
- Admin tidak bisa export data booking, jemaah, atau laporan ke Excel/CSV
- Penting untuk operasional travel

### 6. Tidak Ada Pencarian Global di Admin
- Tidak ada fitur search di halaman Booking, Jemaah, Paket, dan lainnya (kecuali Users)
- Sulit menemukan data spesifik saat jumlah data banyak

### 7. Tidak Ada Konfirmasi Dialog untuk Aksi Berbahaya
- Hapus paket, keberangkatan, dan data lain menggunakan `confirm()` browser bawaan
- Seharusnya menggunakan AlertDialog yang lebih profesional dan konsisten

### 8. Tidak Ada Pagination
- Semua halaman admin (Booking, Payments, Packages, dll) fetch seluruh data tanpa pagination
- Bisa menjadi lambat saat data bertambah banyak (limit Supabase 1000 row)

### 9. Admin Dashboard: Tidak Ada Widget Booking Terbaru
- Tidak menampilkan daftar booking terbaru yang bisa diklik untuk detail
- Aktivitas terbaru hanya dummy

### 10. Tidak Ada Notifikasi Admin
- Saat ada booking baru atau pembayaran masuk, admin tidak mendapat notifikasi
- `NotificationBell` hanya ada untuk user biasa

### 11. Tidak Ada Validasi Form yang Komprehensif
- Form booking, pembayaran, dan admin menggunakan validasi minimal
- Tidak ada validasi format email, nomor telepon, NIK, atau nomor paspor

### 12. Tidak Ada Fitur Cetak/Download Invoice untuk Admin
- `InvoiceButton` ada untuk user, tapi admin belum punya fitur cetak invoice massal atau per booking

### 13. Tidak Ada Manajemen Kupon di Admin
- Tabel `coupons` sudah ada di database, tapi tidak ada halaman admin untuk mengelolanya
- Tidak ada route `/admin/coupons`

### 14. Tidak Ada Manajemen Advantages/Keunggulan
- Tabel `advantages` ada di database tapi tidak ada halaman admin
- Tidak ada route `/admin/advantages`

### 15. Tidak Ada Manajemen Guide Steps
- Tabel `guide_steps` ada di database tapi tidak ada halaman admin
- Tidak ada route `/admin/guide-steps`

### 16. Tidak Ada Manajemen Services
- Tabel `services` ada di database tapi tidak ada halaman admin
- Tidak ada route `/admin/services`

---

## C. Keamanan dan Performa

### 17. Route `/my-bookings` dan `/profile` Masih Bisa Diakses
- Sebelumnya menu dihapus dari navbar, tapi route masih ada
- User bisa mengakses langsung via URL -- ini mungkin disengaja, tapi perlu dipertimbangkan

### 18. Tidak Ada Rate Limiting pada Upload File
- Upload bukti pembayaran dan gambar tidak membatasi ukuran atau frekuensi
- Bisa disalahgunakan untuk mengisi storage

---

## D. UX/UI

### 19. Tidak Ada Dark Mode Toggle yang Terlihat
- Package `next-themes` terinstall tapi tidak terlihat ada toggle dark/light mode

### 20. Tidak Ada Breadcrumb di Admin
- Navigasi admin tidak memiliki breadcrumb untuk menunjukkan posisi halaman saat ini

### 21. Tidak Ada Loading State yang Konsisten
- Beberapa halaman menggunakan spinner berbeda, beberapa menggunakan `LoadingSpinner`, beberapa inline

---

## Ringkasan Prioritas

| Prioritas | Item | Deskripsi |
|-----------|------|-----------|
| Tinggi | #1 | Dashboard admin: ganti data dummy dengan data real |
| Tinggi | #3 | Proteksi route user dengan auth guard |
| Tinggi | #8 | Pagination untuk halaman admin |
| Sedang | #4 | Status perjalanan user dashboard dari data real |
| Sedang | #6 | Pencarian global di admin |
| Sedang | #13 | Halaman admin untuk kupon |
| Sedang | #14-16 | Halaman admin untuk advantages, guide steps, services |
| Sedang | #5 | Export data ke CSV/Excel |
| Rendah | #2 | Fasilitas paket dari database |
| Rendah | #7 | Ganti confirm() dengan AlertDialog |
| Rendah | #10 | Notifikasi admin |
| Rendah | #19 | Dark mode toggle |
| Rendah | #20 | Breadcrumb admin |

