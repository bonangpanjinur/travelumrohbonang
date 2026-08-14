# Analisis Gap Fitur Operasional dan Keuangan

## Ringkasan Eksekutif

Sistem saat ini sudah memiliki fondasi yang luas: pemesanan, pembayaran, invoice, aturan pembayaran, laporan keuangan, akuntansi, dokumen jemaah, chat, agen, cabang, muthawif, CMS, dan portal jemaah. Gap terbesar bukan lagi ketiadaan modul dasar, melainkan belum menyatunya alur kerja lintas modul menjadi proses operasional yang dapat diawasi dari awal sampai akhir.

Risiko tertinggi berada pada empat area. Pertama, rekonsiliasi antara booking, pembayaran, invoice, ledger, refund, dan komisi belum terlihat sebagai satu alur kontrol terpadu. Kedua, cabang dan agen sudah memiliki dashboard tetapi belum memiliki workflow target, approval, settlement, dan profitabilitas yang lengkap. Ketiga, operasional keberangkatan masih tersebar antara dokumen, visa, kamar, kursi, checklist, dan manifest tanpa satu pusat kendali perjalanan. Keempat, portal jemaah sudah tersedia tetapi perlu dikembangkan menjadi pusat tindakan: pembayaran, dokumen, jadwal, notifikasi, dan bantuan harus tampil berdasarkan status nyata jemaah.

## Modul yang Sudah Tersedia

| Domain | Fondasi yang sudah ada |
|---|---|
| Booking | Pembuatan booking, detail booking, pembayaran, invoice, jadwal cicilan, snapshot aturan pembayaran |
| Keuangan | Dashboard finance, accounting, jurnal, chart of accounts, budget, cash flow, bank reconciliation, refund, export |
| Operasional | Paket, keberangkatan, itinerary, dokumen, tracking dokumen, visa, room assignment, seat assignment, checklist, equipment |
| Agen | Portal agen, referral, daftar booking referral, komisi, pencairan |
| Cabang | Branch dashboard, multi-branch, tenant site, pengaturan situs |
| Jemaah | My bookings, dokumen, tabungan, loyalty, chat, e-ticket, portal jemaah |
| Komunikasi | Chat admin/jemaah, notifikasi, template balasan cepat, realtime foundation |
| Manajemen | Analytics, CRM, audit logs, role management, menu permissions, system health |

## Gap Operasional

### P0 — Paling Mendesak

| Gap | Dampak | Fitur yang disarankan |
|---|---|---|
| Tidak ada satu pusat kendali keberangkatan | Tim harus membuka banyak menu untuk mengetahui kesiapan satu rombongan | **Departure Control Tower** dengan checklist otomatis: paspor, visa, pembayaran, kamar, kursi, manifest, perlengkapan, manasik, dan status risiko |
| Status operasional belum menjadi workflow wajib | Data dapat berubah tanpa owner, deadline, atau approval yang jelas | Task operasional dengan PIC, SLA, deadline, eskalasi, komentar, attachment, dan audit trail |
| Manifest dan perubahan data belum menjadi proses terkunci | Perubahan nama, kamar, kursi, atau penerbangan dapat menimbulkan ketidaksesuaian dokumen | Versioning manifest, approval perubahan, diff sebelum/sesudah, dan lock menjelang keberangkatan |
| Tidak ada exception center terpadu | Masalah visa, dokumen, pembayaran, atau keberangkatan terlambat sulit diprioritaskan | **Pusat Peringatan Operasional** dengan severity, owner, aging, dan status penyelesaian |

### P1 — Penguatan Operasional

| Area | Fitur yang kurang |
|---|---|
| Dokumen | OCR data paspor, deteksi kedaluwarsa, validasi nama terhadap booking, checklist per jemaah, dan pengingat otomatis |
| Visa | Tahapan pengajuan, pengiriman, revisi, approval, nomor visa, tanggal terbit/kedaluwarsa, dan SLA vendor |
| Keberangkatan | Integrasi perubahan jadwal penerbangan, notifikasi otomatis, manifest final, dan boarding readiness |
| Hotel dan kamar | Master hotel, allotment, rooming list, perubahan kamar, biaya upgrade, dan rekonsiliasi vendor |
| Manasik | Jadwal, kehadiran, materi, kuis, sertifikat, dan reminder jemaah |
| Perlengkapan | Distribusi koper/seragam/kartu identitas, ukuran, barcode/QR, pengembalian, dan kehilangan |
| Keluhan | Ticketing dengan kategori, prioritas, SLA, eskalasi, dan rating penyelesaian |

## Gap Keuangan

### P0 — Integritas dan Kontrol

| Gap | Dampak | Fitur yang disarankan |
|---|---|---|
| Rekonsiliasi booking–payment–ledger belum menjadi dashboard pengecualian | Selisih saldo dapat terlambat ditemukan | Dashboard rekonsiliasi harian dengan status cocok, selisih, duplikat, payment tanpa booking, dan booking tanpa jurnal |
| Settlement gateway dan bank belum menjadi workflow close period | Finance sulit memastikan saldo benar-benar masuk | Settlement batch, import mutasi bank, auto-match, unmatched queue, approval, dan closing period |
| Refund belum terhubung penuh dengan approval dan dampak komisi | Risiko refund tanpa kontrol atau komisi tetap dibayar | Refund approval matrix, alasan wajib, dampak ledger, komisi, invoice, dan audit |
| Biaya paket belum menjadi profitabilitas aktual per keberangkatan | Harga dan keputusan paket dapat memakai margin yang tidak lengkap | Actual cost capture per vendor, departure P&L, margin per booking, dan variance budget vs actual |
| Komisi agen belum mempunyai accrual dan settlement terintegrasi | Hutang komisi serta profit bersih cabang/agen tidak jelas | Commission accrual, approval, payable aging, settlement batch, dan reversal saat refund |

### P1 — Pelaporan Manajemen

| Fitur | Kegunaan |
|---|---|
| Laporan laba rugi per keberangkatan | Mengetahui profit aktual setiap rombongan |
| Arus kas 13 minggu | Mengetahui kebutuhan kas untuk tiket, hotel, visa, refund, dan operasional |
| Aging piutang jemaah | Memprioritaskan pelunasan dan risiko gagal berangkat |
| Aging hutang vendor dan komisi | Mengelola kewajiban yang jatuh tempo |
| Analisis margin paket | Membandingkan harga jual, biaya aktual, diskon, refund, dan komisi |
| Approval matrix | Membatasi refund, diskon, write-off, biaya ekstra, dan perubahan harga |
| Period close | Mengunci periode, mencatat adjustment, dan mencegah perubahan historis tanpa jurnal koreksi |

## Fitur untuk Agen

Sistem sudah memiliki portal agen, referral, komisi, dan pencairan. Namun agen membutuhkan workflow penjualan yang lebih lengkap agar tidak hanya melihat hasil akhir.

| Prioritas | Fitur |
|---|---|
| P0 | Pipeline prospek: lead baru, dihubungi, konsultasi, proposal, booking, batal, dan alasan kalah |
| P0 | Quotation digital dengan masa berlaku, opsi paket, diskon yang membutuhkan approval, dan link pembayaran |
| P1 | CRM follow-up: reminder WhatsApp/email, aktivitas terakhir, next action, dan probabilitas closing |
| P1 | Target dan leaderboard yang membedakan booking gross, booking paid, revenue net, dan margin |
| P1 | Komisi transparan per booking dengan status earned, pending, approved, paid, reversed |
| P1 | Materi penjualan: katalog paket, proposal PDF, banner referral, dan link kampanye |
| P2 | Pelatihan agen, sertifikasi produk, knowledge base, dan penilaian kualitas layanan |
| P2 | Anti-fraud referral: device/IP anomaly, duplicate customer, self-referral, dan conflict checking |

## Fitur untuk Cabang

Cabang sudah memiliki dashboard dan multi-branch, tetapi belum sepenuhnya berfungsi sebagai unit bisnis mandiri yang terkontrol.

| Prioritas | Fitur |
|---|---|
| P0 | Hak akses berbasis cabang dan data isolation yang konsisten untuk booking, jemaah, pembayaran, dan laporan |
| P0 | Laporan profitabilitas cabang: penjualan, kas masuk, komisi, biaya, refund, dan laba bersih |
| P1 | Target cabang, anggaran, forecast, dan perbandingan realisasi terhadap target |
| P1 | Approval cabang untuk diskon, refund, biaya operasional, perubahan booking, dan transfer jemaah |
| P1 | Settlement antar-cabang/manajemen pusat serta pencatatan biaya shared service |
| P1 | Persediaan cabang untuk perlengkapan, dokumen cetak, seragam, koper, dan kartu identitas |
| P2 | Portal manager cabang dengan task board, KPI staf, SLA, dan evaluasi layanan |
| P2 | Tenant branding yang lebih lengkap: layout homepage, domain, SEO, campaign, dan analytics per cabang |

## Fitur untuk Jemaah dan Portal Jemaah

Portal jemaah sudah memiliki shell PWA, ringkasan booking, pembayaran, dokumen, chat, jadwal, dan notifikasi. Pengembangan berikutnya harus menjadikan portal sebagai pusat tindakan, bukan sekadar dashboard.

| Prioritas | Fitur |
|---|---|
| P0 | Timeline perjalanan personal berdasarkan status booking, pembayaran, dokumen, visa, manasik, dan keberangkatan |
| P0 | Pembayaran langsung dengan nominal jatuh tempo, instruksi transfer, upload bukti, dan status verifikasi |
| P0 | Checklist dokumen dan indikator kelengkapan yang terhubung ke review admin |
| P1 | E-ticket, QR check-in, kartu identitas, rooming detail, seat detail, dan kontak PIC rombongan |
| P1 | Notifikasi push untuk jatuh tempo, perubahan jadwal, dokumen ditolak, visa, manasik, dan pengumuman penting |
| P1 | Chat realtime dengan routing ke PIC/cabang yang benar dan SLA respons |
| P1 | Mode offline untuk invoice, jadwal, nomor darurat, dan dokumen penting yang sudah diizinkan |
| P2 | Pusat panduan ibadah, audio/video manasik, kuis, sertifikat, dan checklist ibadah |
| P2 | Fitur keluarga: beberapa anggota dalam satu akun dengan kontrol privasi |
| P2 | Survey NPS dan rating layanan per fase perjalanan |

## Fitur untuk Muthawif dan Tim Lapangan

Modul muthawif sudah tersedia, tetapi masih perlu diperkuat untuk kebutuhan lapangan.

| Fitur | Manfaat |
|---|---|
| Daftar jemaah per rombongan | Mengetahui siapa yang menjadi tanggung jawab muthawif |
| Kehadiran dan lokasi kumpul | Mengurangi risiko jemaah tertinggal |
| Catatan kesehatan dan kebutuhan khusus | Menangani kebutuhan jemaah secara aman dan terkontrol |
| Laporan kejadian | Mencatat insiden, bukti, severity, dan tindak lanjut |
| Broadcast per rombongan | Mengirim pengumuman ke kelompok yang tepat |
| Mode offline lapangan | Tetap dapat melihat manifest dan checklist saat koneksi buruk |

## Prioritas Roadmap

### Fase 1 — Kontrol dan Integritas, 0–30 Hari

Fokus pertama adalah membangun rekonsiliasi booking–payment–ledger, approval refund dan diskon, aging piutang, settlement gateway/bank, pusat exception operasional, serta Departure Control Tower. Fase ini memberikan dampak terbesar terhadap risiko keuangan dan kesiapan keberangkatan.

### Fase 2 — Workflow Unit Bisnis, 31–60 Hari

Fokus berikutnya adalah profitabilitas per cabang dan keberangkatan, accrual dan settlement komisi agen, CRM pipeline, quotation digital, target cabang/agen, approval matrix, serta SLA dokumen dan visa.

### Fase 3 — Portal dan Layanan Jemaah, 61–90 Hari

Portal jemaah dikembangkan menjadi pusat tindakan dengan timeline personal, pembayaran jatuh tempo, checklist dokumen, notifikasi push, e-ticket, QR check-in, chat routing, dan mode offline.

### Fase 4 — Skalabilitas dan Optimasi, Setelah 90 Hari

Tahap terakhir mencakup forecasting kas, analitik margin, anomaly detection, vendor scorecard, predictive reminders, family account, knowledge base, dan benchmarking antar-cabang.

## KPI yang Disarankan

| Kelompok | KPI |
|---|---|
| Keuangan | Rekonsiliasi harian selesai, unmatched payment aging, collection rate, refund turnaround, margin aktual per keberangkatan |
| Operasional | Persentase dokumen lengkap, visa on-time rate, manifest accuracy, readiness score H-30/H-7/H-1, incident closure time |
| Agen | Lead-to-booking conversion, paid booking rate, revenue net, margin, komisi pending aging, refund ratio |
| Cabang | Revenue, gross margin, cash collection, biaya per jemaah, target achievement, SLA penyelesaian kasus |
| Jemaah | Payment on-time, document completion, chat first response time, NPS, portal activation, notification engagement |
| Layanan | Response time, resolution time, reopened cases, complaint rate, CSAT |

## Kesimpulan

Prioritas utama bukan menambah sebanyak mungkin menu, tetapi membuat sistem memiliki satu alur kendali. Untuk keuangan, pusatkan rekonsiliasi, settlement, close period, profitabilitas, dan approval. Untuk operasional, pusatkan readiness keberangkatan, exception, SLA, dan versioning manifest. Untuk agen dan cabang, tambahkan pipeline, target, profitabilitas, komisi, dan approval. Untuk jemaah, ubah portal menjadi pusat tindakan yang memandu setiap langkah sampai keberangkatan.

Urutan implementasi paling aman adalah **rekonsiliasi dan kontrol terlebih dahulu, workflow cabang/agen berikutnya, lalu pengalaman portal jemaah dan fitur lapangan**. Dengan urutan ini, peningkatan layanan tidak mengorbankan integritas keuangan dan auditability sistem.
