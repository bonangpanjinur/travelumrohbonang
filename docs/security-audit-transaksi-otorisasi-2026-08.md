# Audit Keamanan Modul Transaksi dan Otorisasi API

## Ringkasan

Audit ini dilakukan terhadap route backend pada `artifacts/api-server/src/routes`, middleware role, modul booking/payment/refund, pengaturan rekening, certificate, dan endpoint admin. Pemeriksaan bersifat static code review dan regression verification; audit ini bukan penetration test eksternal.

## Temuan yang diperbaiki

| ID | Severity | Area | Temuan | Tindakan |
|---|---|---|---|---|
| SEC-01 | High | `routes/misc.ts` | Endpoint `PUT /payment-settings` sebelumnya hanya memakai `requireAuth`, sehingga semua user terautentikasi berpotensi mengubah rekening pembayaran global. | Diganti menjadi `requireFinance`; perubahan rekening kini membutuhkan role finance/admin yang sesuai. |
| SEC-02 | Medium | Certificate template | Payload design dan asset URL diterima terlalu longgar. | Ditambahkan sanitizer: allowlist layout, hex color, batas panjang teks, batas ukuran data URL, dan hanya `https://`/data image untuk asset. |
| SEC-03 | Medium | Invoice template | Belum ada endpoint terdedikasi dengan batasan konfigurasi. | Ditambahkan endpoint `GET/PUT /api/admin/settings/invoice-template` dengan allowlist template, orientasi, font, border, warna, section, dan batas footer. |

## Kontrol keamanan yang telah diverifikasi

| Area | Status | Catatan |
|---|---|---|
| Booking customer create | PASS | Total harga dihitung dari departure price server-side; nominal client tidak dipercaya. |
| Payment customer create | PASS | Nominal DP/cicilan/full payment dibandingkan dengan `paymentScheduleSnapshot`; overpayment, wrong sequence, dan pending duplicate ditolak. |
| Certificate booking scope | PASS | Booking dan pilgrim diverifikasi melalui `isBookingInScope` dan relasi `pilgrim.bookingId`. |
| Certificate template scope | PASS | Template global atau template cabang hanya terlihat/dapat dipakai sesuai scope user. |
| Admin router mounts | PASS | Router admin utama memakai guard berbasis role; area finance/certificate memiliki guard spesifik. |
| Invoice template write | PASS | Endpoint berada di bawah admin settings router yang memakai `requireAdmin`; payload disanitasi. |
| SQL injection | PASS dari review | Query menggunakan Drizzle expressions; tidak ditemukan interpolasi SQL mentah pada area audit. |
| Secrets | PASS sebagian | Gateway secrets tidak disimpan di `site_settings` menurut komentar dan route yang diperiksa; tetap perlu validasi deployment environment. |

## Residual risk dan backlog keamanan

### SEC-R01 — Mass assignment di beberapa endpoint admin

Static scan menemukan beberapa endpoint yang memakai `.set(req.body)`, antara lain agent commissions, branches, costs, coupons, CRM, currencies, masterdata, redirects, SEO, testimonials, dan generic settings patch. Route-route tersebut sudah berada di area admin, tetapi mass assignment dapat memungkinkan perubahan field sensitif bila schema Drizzle menerima field tersebut atau bila role terlalu luas.

**Rekomendasi:** ubah seluruh update menjadi allowlist field per endpoint, tambahkan Zod schema request, dan lakukan authorization per record/branch sebelum update. Prioritas: high untuk costs, commissions, branches, settings, dan masterdata.

### SEC-R02 — Generic settings mutation perlu dipersempit

`PATCH /api/admin/settings/:id`, `POST /api/admin/settings`, dan generic `PUT /api/admin/settings/:key` memiliki permukaan mutasi luas. Walaupun router dilindungi admin, endpoint generik menyulitkan audit field-level authorization dan dapat menimpa setting yang seharusnya hanya dapat diubah super admin.

**Rekomendasi:** nonaktifkan endpoint generic untuk production atau gunakan registry setting key dengan role, schema, dan batas ukuran yang jelas.

### SEC-R03 — Audit concurrency pada inventory dan payment

Payment sudah transactional terhadap schedule validator, namun perlu pengujian database concurrency untuk dua request bersamaan. Booking room allocation juga perlu diuji dengan isolation/locking jika stok kamar memiliki batas ketat.

### SEC-R04 — Penetration test eksternal

Perlu dilakukan test dengan session role berbeda, ID enumeration, replay payment, malformed JSON, oversized data URL, CSRF/session fixation, rate limit, dan verification webhook gateway pada staging.

## Prioritas tindak lanjut

1. Hapus mass assignment dari seluruh endpoint admin finansial dan masterdata.
2. Tambahkan field-level authorization untuk generic settings.
3. Tambahkan integration test dua request payment paralel.
4. Tambahkan security headers, CSRF strategy, dan pemeriksaan cookie/session production.
5. Lakukan penetration test staging dan review log/audit trail untuk setiap perubahan nominal, rekening, refund, dan template dokumen.

## Batasan audit

Audit ini didasarkan pada pembacaan kode repository dan pemeriksaan build/test. Tidak dilakukan pemindaian dependency CVE, DAST, pengujian jaringan, atau akses database production. Temuan “PASS” berarti tidak ditemukan masalah pada area yang diperiksa secara static review, bukan jaminan bebas kerentanan.
