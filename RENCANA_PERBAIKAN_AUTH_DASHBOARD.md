# Rencana Perbaikan Autentikasi dan Dashboard

Berdasarkan analisis menyeluruh, berikut adalah rencana perbaikan untuk meningkatkan keamanan, efisiensi, dan pengalaman pengguna.

## 1. Perbaikan Sistem Autentikasi (Auth)

### A. Sinkronisasi Role
*   **Masalah:** Role disimpan di dua tempat (`profiles.role` dan `user_roles.role`).
*   **Rencana:** 
    *   Memastikan `user_roles` menjadi sumber kebenaran tunggal (*single source of truth*) untuk otorisasi.
    *   Memperbarui trigger `handle_new_user` untuk memberikan role default 'buyer' di tabel `user_roles` secara otomatis.

### B. Optimasi `useAuth` Hook
*   **Masalah:** Logika `fetchRole` melakukan terlalu banyak query berurutan.
*   **Rencana:**
    *   Menyederhanakan urutan pengecekan.
    *   Menambahkan caching sederhana dalam state untuk menghindari re-fetch yang tidak perlu saat navigasi antar halaman admin.

## 2. Perbaikan Dashboard User

### A. Pembuatan Unified User Dashboard
*   **Masalah:** User tidak memiliki halaman ringkasan terpadu.
*   **Rencana:**
    *   Membuat halaman `src/pages/Dashboard.tsx` (untuk user).
    *   Menampilkan: Ringkasan profil, Status booking terbaru, Notifikasi terbaru, dan Quick links ke paket umroh.

### B. Navigasi User
*   **Rencana:**
    *   Memperbarui `Navbar.tsx` untuk mengarahkan user ke Dashboard baru setelah login, bukan langsung ke profil.

## 3. Perbaikan Dashboard Admin

### A. Validasi Akses di Sisi Klien
*   **Rencana:**
    *   Menambahkan pengecekan role yang lebih ketat pada komponen-komponen sensitif di dalam dashboard admin untuk mencegah elemen UI muncul jika role tidak sesuai (misal: admin vs superadmin).

---
*Rencana ini akan diimplementasikan secara bertahap dimulai dari perbaikan sistem auth.*
