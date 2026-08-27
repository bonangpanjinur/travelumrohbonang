# Laporan Pengujian E2E Booking → Pembayaran → Sertifikat

**Tanggal pengujian:** 28 Agustus 2026  
**Repository:** `bonangpanjinur/travelumrohbonang`  
**Status:** Regression suite lulus; full E2E dengan database/payment runtime belum dapat dieksekusi pada sandbox karena environment runtime tidak tersedia.

## Ringkasan hasil

Pengujian otomatis yang tersedia berhasil dijalankan dengan hasil **83 test lulus**: 56 test API/backend dan 27 test frontend. Typecheck serta production build juga berhasil. Namun, pengujian E2E penuh yang membuat booking nyata, mengirim DP/cicilan, melakukan pelunasan, dan membaca sertifikat dari database tidak dapat diklaim lulus karena sandbox tidak menyediakan `DATABASE_URL`, Supabase runtime credentials, `PORT`, atau credential gateway aktif.

| Lapisan | Hasil | Arti |
|---|---:|---|
| Backend/API regression | **PASS — 56 test** | Kontrak, auth boundary, scope, payment schedule, dan route regression yang tersedia lulus. |
| Frontend regression | **PASS — 27 test** | Test frontend yang tersedia lulus. |
| TypeScript | **PASS** | Tidak ada error tipe pada workspace yang diuji. |
| Production build | **PASS** | Backend dan frontend berhasil dibuild. |
| Full database E2E | **BLOCKED** | Tidak ada runtime database/Supabase credentials di sandbox. |
| Payment gateway callback E2E | **BLOCKED** | Tidak ada credential dan callback gateway aktif untuk transaksi sandbox. |
| Browser journey E2E | **NOT AVAILABLE** | Repository belum memiliki Playwright/Cypress harness atau script E2E browser. |

## Skenario yang diverifikasi melalui code path dan regression

### Booking

Backend menghitung total harga dari harga departure server-side. Nilai `totalPrice` dari client tidak menjadi sumber kebenaran. Pilihan kamar dihitung ulang oleh backend dan rincian room disimpan dengan harga resmi.

Policy pembayaran harus diterima sebelum booking dibuat ketika policy aktif tersedia. Snapshot policy dan preferensi invoice disimpan pada booking.

### DP dan cicilan

Validator payment schedule membandingkan nominal payment dengan `paymentScheduleSnapshot`. DP harus sesuai nominal tahap DP. Cicilan harus mengikuti urutan tahap. Pembayaran full/balance harus sesuai sisa tagihan. Overpayment, nominal invalid, wrong sequence, dan pending duplicate ditolak.

### Pelunasan

Saat agregasi pembayaran mencapai total harga booking, `paymentStatus` menjadi `paid`. Payment sync kemudian memperbarui status booking sesuai aturan existing dan menjalankan trigger auto-issue sertifikat.

### Auto-issue sertifikat

Auto-issue mengambil semua jemaah dalam booking, memilih template Umroh yang sesuai scope, lalu membuat satu sertifikat per jemaah. Sertifikat memakai payload `source: "auto_fully_paid"`. Existing certificate akan dilewati dan unique index database mencegah duplikasi akibat callback bersamaan.

### Idempotensi

Jalur webhook gateway memiliki guard order/reference. Jalur auto-issue memiliki guard query dan unique index `(booking_id, pilgrim_id, certificate_type)`. Karena trigger dibuat fire-and-forget dengan logging, kegagalan sertifikat tidak membatalkan pembayaran yang sudah sukses.

## Alur E2E yang harus dijalankan pada staging

| No. | Skenario | Expected result |
|---:|---|---|
| 1 | Customer membuka paket/departure dan memilih jumlah kamar | Quote menampilkan harga server-authoritative. |
| 2 | Customer membuka tahap konfirmasi | Policy pembayaran aktif terlihat sebelum submit. |
| 3 | Customer submit tanpa acceptance | API menolak request dengan `400`/`409` yang sesuai. |
| 4 | Customer submit dengan acceptance valid | Booking dibuat dengan snapshot policy, schedule, dan invoice preferences. |
| 5 | Customer membayar DP tepat | Payment diterima dan status menjadi partial/pending sesuai aturan. |
| 6 | Customer mengirim DP nominal manipulatif | Payment ditolak. Tidak ada payment record valid yang tercipta. |
| 7 | Customer membayar cicilan berikutnya | Cicilan diterima hanya jika sequence dan nominal benar. |
| 8 | Customer membayar pelunasan | Total paid sama dengan total price dan `paymentStatus` menjadi paid. |
| 9 | Sistem menjalankan auto-issue | Satu sertifikat Umroh terbuat untuk setiap jemaah. |
| 10 | Callback pelunasan dikirim ulang | Tidak ada payment atau sertifikat duplikat. |
| 11 | Booking memiliki template certificate custom | Sertifikat memakai template dalam branch/global scope yang valid. |
| 12 | User branch mencoba mengakses booking branch lain | API mengembalikan `403` dan tidak membocorkan data. |

## Blocker untuk full E2E

Full E2E membutuhkan staging runtime dengan database yang sudah menjalankan migration, akun user test, package/departure/room price, payment policy, payment gateway sandbox, serta certificate template. Environment saat pengujian tidak memiliki variable runtime database/payment sehingga request terhadap health dependency menghasilkan status tidak siap dan tidak aman untuk membuat data transaksi.

Selain itu, repository belum memiliki browser E2E harness. Test yang tersedia adalah Vitest unit/integration boundary; test tersebut tidak menggantikan verifikasi UI browser dari customer booking sampai halaman sertifikat.

## Rekomendasi tindak lanjut

Pertama, siapkan staging database dan seed data yang terisolasi. Kedua, tambahkan Playwright atau Cypress dengan environment-specific base URL dan test user. Ketiga, buat fixture cleanup berdasarkan `testRunId` agar transaksi pengujian tidak mengotori data operasional. Keempat, gunakan payment gateway sandbox atau endpoint webhook test yang memverifikasi signature dengan secret non-production. Kelima, tambahkan assertion database untuk jumlah payment, status schedule, booking payment status, jumlah certificate, dan unique idempotency.

## Kesimpulan

Tidak ditemukan regresi pada suite otomatis yang tersedia dan seluruh build lulus. Secara static code path, seluruh rangkaian booking, schedule validation, full payment detection, dan auto-issue sudah terhubung. Akan tetapi, status **full E2E production-like belum dapat dinyatakan lulus** sampai dijalankan pada staging dengan database, authentication session, dan payment gateway sandbox yang aktif.
