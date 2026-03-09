## Status Fitur yang Belum Selesai / Bisa Dikembangkan

### A. Masih Belum Beres (dari plan.md)


| #   | Status   | Fitur                                                   |
| --- | -------- | ------------------------------------------------------- |
| 1   | Belum    | Dashboard admin masih pakai data dummy/hardcoded        |
| 2   | Belum    | Fasilitas paket hardcoded di PackageDetail              |
| 4   | Belum    | Dashboard user: step status hardcoded                   |
| 5   | Belum    | Export data ke CSV/Excel                                |
| 6   | Belum    | Pencarian/search di halaman admin                       |
| 7   | Sebagian | Beberapa halaman masih pakai `confirm()` bawaan browser |
| 8   | Belum    | Pagination di halaman admin                             |
| 10  | Belum    | Notifikasi untuk admin                                  |
| 11  | Belum    | Validasi form komprehensif (NIK, paspor, telepon)       |
| 12  | Belum    | Invoice untuk admin                                     |
| 19  | Belum    | Dark mode toggle                                        |


**Yang sudah selesai:** Route protection (#3), Kupon (#13), Advantages (#14), Guide Steps (#15), Services (#16), Breadcrumb (#20), Multi-Cabang, Multi-Bahasa, filter cabang di booking.

### B. Fitur Baru yang Diusulkan: Multi-Tenant Website

Konsep Anda adalah fitur besar -- setiap cabang/agen punya website sendiri dengan:

- Domain kustom (berbayar ke owner)
- Pilihan template
- Dikelola oleh owner/pemilik travel

**Ini membutuhkan arsitektur multi-tenant yang signifikan:**

- Tabel `tenant_sites` untuk menyimpan konfigurasi website per cabang/agen
- Sistem domain routing (subdomain atau custom domain)
- Template engine dengan beberapa pilihan layout
- Dashboard owner untuk mengelola tenant
- Sistem billing internal (cabang bayar ke owner untuk domain)

Sebelum saya buat rencana detail untuk fitur multi-tenant ini, mohon lengkapi kalimat Anda yang terpotong: **"cabang atau agen bisa memilih template masing-masing, tapi mereka harus bayar ke owner, harga di sesuaikan di owner travel, jadi ada harga website , kalau gratis domainnya pakai subdmain, dan templatenya sederhana,** 

**.."** -- tapi apa?