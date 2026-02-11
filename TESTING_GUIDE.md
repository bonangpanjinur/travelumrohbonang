# Panduan Pengujian Perbaikan Dashboard Admin

Setelah perbaikan diterapkan, silakan lakukan langkah-langkah pengujian berikut untuk memastikan Dashboard Admin berfungsi dengan benar.

## 1. Skenario Admin (Akses Berhasil)
1. Buka aplikasi dan buka halaman Login (`/auth`).
2. Masukkan kredensial akun **Admin**.
3. **Ekspektasi**: 
   - Muncul indikator loading ("Memuat dashboard...") selama beberapa saat.
   - Halaman dialihkan secara otomatis ke `/admin`.
   - Sidebar dan konten Dashboard (statistik, grafik, dll.) muncul dengan benar.

## 2. Skenario User Biasa (Akses Ditolak)
1. Login dengan akun **User Biasa** (Jamaah/Agen).
2. Coba akses URL `/admin` secara manual di browser.
3. **Ekspektasi**: 
   - Aplikasi mendeteksi bahwa user bukan admin.
   - User dialihkan kembali ke halaman utama (`/`).

## 3. Skenario Tanpa Login (Akses Ditolak)
1. Pastikan Anda sudah **Logout**.
2. Coba akses URL `/admin` secara manual di browser.
3. **Ekspektasi**: 
   - Aplikasi mendeteksi tidak ada sesi aktif.
   - User dialihkan ke halaman Login (`/auth`).

## 4. Pemeriksaan Teknis (Opsional)
Jika Dashboard masih tidak muncul, buka **Console Browser (F12)** dan periksa apakah ada pesan log berikut:
- `AdminLayout: No user found, redirecting to /auth`
- `AdminLayout: User is not an admin, redirecting to /`

Pesan ini membantu mengonfirmasi bahwa logika pengalihan (redirect) berjalan sesuai rencana.
