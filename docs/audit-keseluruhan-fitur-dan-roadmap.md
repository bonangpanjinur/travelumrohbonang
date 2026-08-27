# Audit Keseluruhan Fitur dan Roadmap Penyempurnaan

**Proyek:** Travel Umroh Bonang  
**Tanggal audit:** 28 Agustus 2026  
**Auditor:** Manus AI  
**Basis audit:** Review repository `bonangpanjinur/travelumrohbonang`, struktur monorepo, schema Drizzle, route Express, halaman React, dokumentasi audit yang sudah ada, serta pemeriksaan typecheck/test yang tersedia.

## 1. Ringkasan eksekutif

Aplikasi ini sudah memiliki fondasi produk yang luas: paket dan keberangkatan, booking, pembayaran manual dan gateway, cicilan, piutang, refund, akuntansi, agen, cabang, dokumen jemaah, visa, kamar, kursi, perlengkapan, manifest, checklist, CMS, chat, loyalty, savings, tenant branding, dan generator sertifikat. Masalah terbesar bukan kekurangan menu, melainkan **sebagian fitur belum terintegrasi sebagai workflow end-to-end yang konsisten**.

Untuk kebutuhan yang Anda sampaikan, terdapat tiga gap utama. Pertama, kebijakan pembayaran sudah memiliki schema, resolver global/paket, versioning dasar, dan snapshot pada booking, tetapi belum ditampilkan di halaman booking pelanggan sebelum submit. Kedua, invoice sudah memuat rincian kamar, daftar jemaah, jadwal pembayaran, aturan pembayaran, riwayat pembayaran, total, sisa pembayaran, branding, dan QR tracking, tetapi desainnya masih hardcoded di `InvoiceGenerator.ts` sehingga belum dapat diatur dari panel admin. Ketiga, generator sertifikat baru mendukung dua jenis sertifikat dan empat preset desain dengan field terbatas; model datanya belum mendukung builder berbasis elemen, versioning, aset, approval, batch issuance, dan variasi ekspor.

> **Kesimpulan utama:** Prioritas pengembangan sebaiknya bukan menambah lebih banyak menu, tetapi membangun tiga lapisan produk: **policy engine**, **document template engine**, dan **workflow/exception center**. Ketiganya akan menghubungkan konfigurasi admin dengan pengalaman pelanggan, dokumen resmi, ledger finansial, dan proses operasional.

## 2. Status pemeriksaan teknis

| Pemeriksaan | Hasil | Catatan |
|---|---|---|
| Clone repository | Berhasil | Branch `main`, repository bersih saat mulai audit. |
| Inventaris route/schema/page | Berhasil | Repository memiliki modul bisnis yang sangat luas. |
| Review kebijakan pembayaran | Berhasil | Global/paket, rule, version, activation, snapshot booking tersedia. |
| Review invoice | Berhasil | Isi invoice cukup lengkap, desain masih statis di frontend. |
| Review sertifikat | Berhasil | Empat preset, dua tipe sertifikat, template tersimpan, issue single certificate. |
| Typecheck | Tidak dapat dijalankan | Dependency lokal belum terpasang; `tsc: not found`. Ini adalah keterbatasan environment, bukan bukti error kode. |
| Test suite | Tidak dapat dijalankan | Dependency lokal belum terpasang; `vitest: not found`. |

## 3. Peta kemampuan yang sudah tersedia

| Domain | Kemampuan yang terlihat di repository | Penilaian |
|---|---|---|
| Booking | Create booking, detail, status, approval expiry, pindah departure, kamar, jemaah, e-ticket, invoice, refund request | Fondasi kuat, tetapi disclosure policy sebelum submit belum terhubung. |
| Pembayaran | Payment manual, payment gateway, proof upload, verification, cicilan, piutang, refund, payment policy | Luas, tetapi approval, settlement, dan rekonsiliasi perlu satu pusat exception. |
| Keuangan | Dashboard, ledger, COA, trial balance, budget, cash flow, HPP, export, bank reconciliation | Perlu standardisasi definisi revenue kas, piutang, potensi, dan status payment. |
| Invoice | HTML print invoice, branding, room details, pilgrims, schedule, policy, payment history, QR | Isi sudah baik; desain dan nomor dokumen belum menjadi template/configuration engine. |
| Sertifikat | Dua tipe: umroh dan badal umroh; empat preset; template tersimpan; print dan issue | Masih level MVP; belum menjadi document designer yang kaya dan scalable. |
| Operasional | Departure, manifest, documents, visa, seat, room, equipment, checklist, readiness | Terpecah; perlu control tower keberangkatan. |
| CMS/branding | Tenant templates, branding, gallery, pages, blog, FAQ, SEO, social kit | Cukup luas, tetapi upload admin dan konfigurasi privileged masih perlu hardening. |
| Integrasi | Payment gateway/webhook, email, WhatsApp, storage, cron, tenant/branch | Belum semuanya memiliki dashboard job, retry, settlement, dan status operasional terpadu. |

## 4. Audit kebijakan pembayaran

### 4.1 Yang sudah benar

Schema `payment_policies` dan `payment_policy_rules` sudah memodelkan cakupan `global` atau `package`, keterkaitan ke paket, status draft/active/archived, version, tanggal berlaku, approval actor, serta aturan terpisah berdasarkan `ruleCode`. Resolver `resolvePaymentPolicy(packageId)` juga sudah menggabungkan kebijakan global dengan kebijakan paket; rule paket menimpa rule global dengan kode yang sama. Ini merupakan fondasi yang tepat untuk kebutuhan “bisa paket tertentu dan global”.

Booking juga memiliki `paymentPolicySnapshot` dan `paymentScheduleSnapshot`. Snapshot ini penting karena perubahan policy di masa depan tidak boleh mengubah kewajiban booking lama. Invoice saat ini sudah mengonsumsi kedua snapshot tersebut, sehingga aturan pembayaran dan jadwal cicilan dapat muncul pada invoice apabila snapshot sudah terisi.

Halaman admin sudah menyediakan rule untuk DP, batas pelunasan, biaya pembatalan, jadwal cicilan, deadline bukti bayar, refund policy, package change fee, dan payment methods. UI juga menyediakan cancellation tiered dan pembuatan draft lalu aktivasi.

### 4.2 Gap dan risiko yang ditemukan

| Prioritas | Temuan | Bukti kode/arsitektur | Dampak |
|---|---|---|---|
| P0 | Policy belum muncul pada proses booking pelanggan | `features/booking/pages/Booking.tsx` hanya mengambil package/departure/branch/agent dan tidak mengambil effective policy | Pelanggan dapat submit booking tanpa melihat DP, jatuh tempo, metode bayar, refund, atau biaya perubahan. |
| P0 | Policy admin belum sepenuhnya menjadi business rule executable | Rule disimpan sebagai JSON/display text, tetapi belum terlihat enforcement terpadu untuk semua rule | Sistem dapat menampilkan aturan tanpa otomatis menolak transaksi yang melanggar. |
| P1 | Endpoint admin policy belum terlihat menerapkan scope/approval guard yang lengkap | `admin/payment-policies.ts` menyediakan CRUD/activate, tetapi validasi role, branch scope, effective date overlap, dan maker-checker perlu dipastikan konsisten | Admin lintas cabang dapat melihat atau mengubah policy yang bukan miliknya jika guard route tidak menutupnya. |
| P1 | Rule `payment_methods` dan `refund_policy` masih teks bebas | UI menyimpan informasi sebagai `text` | Tidak dapat dipakai untuk validasi, filter metode, kalkulasi refund, atau rendering channel-specific secara terstruktur. |
| P1 | Jadwal cicilan belum memiliki validasi bisnis lengkap | Validasi UI hanya mencegah total di atas 100%; belum tampak pemeriksaan total tepat 100%, urutan H-, duplicate due date, dan tanggal yang sudah lewat | Schedule dapat ambigu atau tidak selesai 100%. |
| P1 | Nilai policy tidak memiliki format schema per rule yang ketat | `value` adalah `jsonb`, rule type divalidasi secara umum | Perubahan frontend dapat menghasilkan payload yang secara teknis valid tetapi tidak konsisten secara bisnis. |
| P2 | Belum ada preview “apa yang dilihat pelanggan” | Admin melihat daftar rule, bukan simulasi checkout per paket/departure | Kesalahan wording dan perhitungan dapat lolos sebelum publish. |
| P2 | Belum ada workflow draft → review → approve → active yang benar-benar maker-checker | `activate` langsung mengarsipkan policy aktif dan mengaktifkan target | Tidak ada approval kedua, komentar review, atau rollback terkontrol. |

### 4.3 Rancangan policy engine yang disarankan

Gunakan tiga tingkat konfigurasi: **global default**, **package override**, dan **departure override**. Departure override berguna untuk keberangkatan khusus, promo, atau kondisi operasional tertentu, tetapi hanya boleh menimpa field yang eksplisit diisi. Resolver harus mengembalikan policy final beserta sumber setiap rule: global, package, atau departure.

Setiap rule sebaiknya memiliki `schemaVersion`, `calculationBasis`, `enforcementMode`, dan `customerVisibility`. `enforcementMode` minimal mendukung `display_only`, `warning`, dan `blocking`. Contohnya, metode pembayaran dapat bersifat blocking, sedangkan keterangan refund dapat display-only. Rule juga perlu menyimpan `effectiveFrom`, `effectiveUntil`, `approvedBy`, `approvedAt`, `changeReason`, dan immutable version.

| Rule | Struktur data yang disarankan | Enforcement |
|---|---|---|
| DP | `mode`, `value`, `currency`, `minAmount`, `maxAmount` | Blocking saat payment pertama. |
| Cicilan | Array `sequence`, `label`, `percentage/amount`, `dueOffsetDays`, `graceDays` | Blocking/warning sesuai jatuh tempo. |
| Pelunasan | `dueOffsetDays`, `graceDays`, `autoReminderDays` | Warning lalu blocking untuk aksi tertentu. |
| Metode bayar | Array provider/channel/account, `enabled`, `fee`, `instructions` | Blocking pada checkout/payment. |
| Biaya pembatalan | Tier berdasarkan hari sebelum keberangkatan, mode percentage/fixed | Kalkulasi otomatis saat refund request. |
| Refund | `eligibility`, `processingDays`, `deductions`, `requiredDocuments` | Blocking/warning pada refund workflow. |
| Perubahan paket | `allowed`, fee, priceDifferenceMode, approvalRequired | Blocking atau approval. |
| Bukti pembayaran | `deadlineHours`, accepted MIME, maxSize, requiresReference | Blocking pada upload proof. |

### 4.4 Alur booking pelanggan yang seharusnya

Pada saat pelanggan memilih paket dan departure, frontend memanggil endpoint publik yang aman, misalnya `GET /api/packages/:packageId/payment-policy?departureId=...`. Endpoint hanya mengembalikan informasi yang memang customer-visible. Halaman booking kemudian menampilkan kartu “Aturan Pembayaran” sebelum tombol submit, dengan ringkasan DP, total tahap cicilan, deadline pelunasan, metode pembayaran, biaya pembatalan, kebijakan refund, dan checkbox persetujuan.

Saat booking dibuat, backend harus menghitung ulang policy final, menghitung schedule, menyimpan snapshot immutable, dan menyimpan `policyVersion` serta `policyAcceptedAt`, `policyAcceptedBy`, dan `policyAcceptanceIp` atau metadata setara bila diperlukan. Frontend tidak boleh dipercaya untuk mengirim nilai DP, fee, atau jadwal final.

Acceptance criteria utama adalah sebagai berikut: pelanggan tidak dapat submit tanpa menyetujui policy; policy package menimpa rule global secara parsial; booking lama tetap memakai snapshot lama setelah policy baru aktif; perubahan policy tidak mengubah invoice historis; dan API menolak amount payment yang melanggar batas DP atau schedule.

## 5. Audit invoice

### 5.1 Isi invoice saat ini

`InvoiceGenerator.ts` telah mencakup header perusahaan, logo, nama dan tagline, judul invoice, booking code, tanggal, status, pihak yang ditagihkan, detail perjalanan, rincian kamar, daftar jemaah, jadwal pembayaran, ketentuan policy, riwayat pembayaran, total harga, total dibayar, sisa pembayaran, grand total, footer, dan QR tracking. Ini sudah lebih baik daripada invoice sederhana yang hanya mencetak total.

Invoice juga sudah membaca `paymentPolicySnapshot` dan `paymentScheduleSnapshot`, sehingga kebutuhan menampilkan aturan pembayaran di invoice secara konsep sudah tersedia. Namun generator dipanggil melalui browser, membuka jendela print, dan membuat HTML dari template yang seluruh CSS serta struktur dokumennya berada dalam satu file frontend.

### 5.2 Kekurangan invoice yang perlu diperbaiki

| Prioritas | Gap | Dampak |
|---|---|---|
| P0 | Tidak ada konfigurasi desain invoice per tenant/cabang | Semua invoice mengikuti satu desain hardcoded. |
| P0 | Tidak ada template versioning/snapshot resmi di database | Invoice lama dapat sulit direproduksi bila desain atau branding berubah. |
| P1 | Belum ada nomor invoice formal terpisah dari booking code | Kebutuhan accounting, pencarian, credit note, dan audit menjadi terbatas. |
| P1 | Belum terlihat status invoice `draft/issued/void/paid/partially_paid/overdue` | Dokumen dan status finansial berpotensi tercampur. |
| P1 | Payment history perlu memastikan hanya payment valid/non-void yang dijumlahkan | Risiko angka invoice tidak sama dengan ledger bila filter status tidak konsisten. |
| P1 | Tidak ada credit note/debit note atau revision reason | Koreksi invoice dapat dilakukan dengan print ulang tanpa jejak dokumen yang memadai. |
| P2 | Tidak ada pilihan layout, ukuran kertas, bahasa, mata uang, atau section visibility dari admin | Kebutuhan branding dan operasional cabang belum fleksibel. |
| P2 | QR masih menunjuk tracking URL, belum jelas memuat verifikasi dokumen | QR sebaiknya menuju halaman verifikasi invoice dengan nomor dan hash dokumen. |
| P2 | HTML dibangun dengan interpolasi langsung | Perlu escaping semua data dan policy display text untuk mencegah markup injection pada dokumen. |

### 5.3 Rancangan invoice template engine

Buat schema baru `invoice_templates`, `invoice_template_versions`, dan `invoices`. `invoice_templates` menyimpan identitas template dan scope tenant/branch. `invoice_template_versions` menyimpan JSON layout immutable, CSS token, field visibility, numbering format, dan status draft/active/archived. `invoices` menyimpan snapshot template, snapshot branding, invoice number, booking ID, issue date, due date, currency, subtotal, discount, tax, payments applied, balance due, status, QR verification token, dan hash dokumen.

Admin perlu memiliki editor konfigurasi dengan preview real data. Pengaturan minimum meliputi logo, nama/legal entity, alamat, kontak, NPWP atau identitas legal bila dipakai, warna primer/sekunder, font, ukuran A4/A5/thermal, orientasi, format nomor invoice, prefix per cabang, visibilitas daftar jemaah, rincian kamar, jadwal cicilan, policy, rekening, catatan, tanda tangan, cap/stempel, QR, footer, dan bahasa.

Invoice sebaiknya dapat memiliki section berikut: identitas legal penerbit; nomor invoice dan status; billed-to; detail paket dan keberangkatan; daftar jemaah; rincian harga; diskon/coupon; biaya tambahan; pajak bila berlaku; jadwal pembayaran; aturan pembayaran; riwayat pembayaran; sisa dan jatuh tempo; instruksi transfer; syarat dan ketentuan; catatan; tanda tangan; QR verifikasi; dan riwayat revisi bila invoice pernah diterbitkan ulang.

### 5.4 Pemisahan dokumen

Jangan menjadikan invoice sebagai satu-satunya dokumen. Pisahkan setidaknya: invoice tagihan, kuitansi pembayaran, confirmation letter, e-ticket, receipt refund, credit note, dan statement of account. Dengan demikian, invoice menunjukkan kewajiban, kuitansi menunjukkan uang yang diterima, dan statement menunjukkan rekonsiliasi keseluruhan.

## 6. Audit generator sertifikat

### 6.1 Kemampuan yang sudah ada

Generator sertifikat memiliki tipe `umroh` dan `badal_umroh`, empat preset (`elegant`, `classic`, `modern`, `premium`), template tersimpan, bootstrap branding, pemilihan package → departure → booking → pilgrim, preview langsung, penyimpanan template, penerbitan sertifikat, dan print browser. Desain saat ini dapat mengatur layout, accent color, title, subtitle, body, recipient size/color, footer, logo utama, alamat, dan satu logo tambahan.

### 6.2 Kekurangan dan risiko

| Prioritas | Gap | Dampak |
|---|---|---|
| P0 | Preview/print bukan render dokumen server-side yang konsisten | Hasil dapat berbeda antar browser dan sulit diarsipkan sebagai dokumen resmi. |
| P1 | Hanya dua certificate type | Belum siap untuk visa completion, manasik, penghargaan, badal dengan variasi, atau dokumen partner. |
| P1 | Hanya empat preset dan field desain terbatas | Tidak memenuhi kebutuhan banyak desain dan kontrol kreatif. |
| P1 | `design` dan `payload` generik JSON tanpa versioning | Sulit migrasi layout, mengaudit perubahan, atau mereproduksi sertifikat lama. |
| P1 | Tidak ada elemen builder | Tidak bisa mengatur posisi, ukuran, alignment, layering, shape, background, QR, signature, seal, atau tabel. |
| P1 | Tidak ada batch issuance | Penerbitan per jemaah akan lambat untuk satu rombongan besar. |
| P1 | Tidak ada workflow draft/preview/approve/issue/revoke | Sertifikat resmi perlu kontrol status dan pencabutan. |
| P2 | Asset hanya logo utama dan satu logo tambahan | Belum ada library asset, upload policy, crop, opacity, positioning, atau reuse. |
| P2 | Tidak ada font library dan dukungan bahasa yang memadai | Risiko desain tidak konsisten untuk bahasa Arab, Indonesia, dan Inggris. |
| P2 | Nomor sertifikat belum memiliki konfigurasi format/sequence per cabang/tahun | Pencarian dan verifikasi dokumen belum fleksibel. |
| P2 | Belum ada halaman publik verifikasi sertifikat yang kuat | Penerima dan pihak ketiga belum memiliki validasi resmi yang mudah. |
| P2 | Belum ada download PDF/PNG terarsip dan pengiriman email/WhatsApp | Sertifikat belum menjadi lifecycle document end-to-end. |

### 6.3 Rancangan certificate designer yang kaya fitur

Gunakan model berbasis elemen. Sebuah template terdiri dari page setup, background, element list, variable schema, asset references, typography tokens, and rules. Element type minimum adalah `text`, `rich_text`, `image`, `logo`, `shape`, `line`, `border`, `icon`, `qr_code`, `barcode`, `signature`, `stamp`, `table`, `recipient_name`, `certificate_number`, `date`, `package`, `departure`, dan `conditional_group`.

Setiap element perlu memiliki `id`, `type`, `x`, `y`, `width`, `height`, `rotation`, `zIndex`, `visible`, `locked`, `opacity`, `style`, `binding`, dan `conditions`. Dengan ini admin dapat membuat desain portrait atau landscape, A4 atau custom, bingkai ornamental, watermark, background image, logo partner, tanda tangan, stempel, QR verifikasi, dan blok teks dinamis.

Sediakan kategori desain yang lebih banyak: Islami klasik, Ottoman, minimalis putih, emerald-gold, corporate, luxury black-gold, floral, geometric, Arabic calligraphy, children/family, badal umroh, manasik, penghargaan, dan custom blank canvas. Preset sebaiknya hanya titik awal; pengguna dapat menduplikasi dan mengubahnya.

### 6.4 Fitur operasional sertifikat

| Area | Fitur target |
|---|---|
| Template | Draft, duplicate, version, preview, publish, archive, default per type/branch. |
| Data | Variable picker dan preview dengan data nyata atau sample data. |
| Issuance | Single issue, batch issue, reissue, revoke, expiration, reason, audit log. |
| Numbering | Prefix, sequence, year, branch code, checksum, collision prevention. |
| Output | PDF, PNG, print, bulk ZIP, email, WhatsApp link, public verification page. |
| Verifikasi | QR ke halaman publik, status valid/revoked, issued date, recipient, issuer, hash. |
| Asset | Asset library, private/public scope, upload validation, crop, fit, positioning. |
| Approval | Maker-checker, signature authority, approval note, immutable issued snapshot. |

## 7. Gap integrasi lintas sistem

| Area integrasi | Kondisi audit | Perbaikan yang disarankan |
|---|---|---|
| Booking → payment policy | Snapshot ada, disclosure checkout belum ada | Tambah public effective-policy endpoint, acceptance, server-side calculation. |
| Payment policy → payment validation | Rule tersimpan, enforcement belum terpadu | Central payment policy service dipakai booking, payment, refund, reminder, invoice. |
| Booking/payment → invoice | Data cukup, generator client-side | Bangun invoice record dan renderer server-side dengan template snapshot. |
| Payment → ledger | Modul tersedia, exception center belum terpadu | Reconciliation run dan queue `missing_ledger`, `duplicate`, `unmatched`, `overpayment`. |
| Payment gateway → booking payment | Webhook tersedia | Tambah idempotency, settlement matching, retry, provider event log. |
| Invoice → customer portal | Button invoice tersedia | Tambah invoice timeline, download history, status, due reminders, receipt. |
| Certificate → customer portal | Generator admin tersedia | Tambah daftar sertifikat pelanggan, download, share, public verification. |
| Certificate → email/WhatsApp | Belum terlihat sebagai lifecycle lengkap | Queue pengiriman, retry, delivery log, opt-in, template pesan. |
| Admin upload → storage | Sebagian operasi privileged masih langsung dari browser | Satukan backend upload service, signed URL, magic-byte check, private bucket default. |
| Cron → operations | Cron terpisah | Job dashboard, last success, failure, retry count, dead-letter queue. |
| Branch/tenant → documents | Scope perlu diuji lintas cabang | Semua query/mutation harus branch-scoped dan diuji dengan fixture A/B. |

## 8. Prioritas roadmap implementasi

| Fase | Prioritas | Output |
|---|---|---|
| Fase 0: stabilisasi | P0 | Pasang dependency dan jalankan ulang typecheck/test/build; dokumentasikan baseline. Tutup privileged admin direct Supabase, CORS deployment, dan scope guard. |
| Fase 1: policy checkout | P0 | Effective policy public endpoint, policy acceptance, snapshot lengkap, schedule calculator server-side, tampilan policy di Booking dan Payment. |
| Fase 2: invoice foundation | P0/P1 | Invoice entity, numbering, status, template/version schema, server-side render, download PDF, receipt, statement of account. |
| Fase 3: finance control | P1 | Reconciliation exception center, idempotency gateway, void/refund reversal, approval matrix, period close, komisi berbasis uang masuk. |
| Fase 4: certificate 2.0 | P1 | Element schema, editor, 10–15 preset awal, asset library, PDF/PNG, batch issuance, QR verification. |
| Fase 5: customer document portal | P1/P2 | Timeline invoice/payment/receipt/certificate, reminder, email/WhatsApp delivery, public verification. |
| Fase 6: control tower | P1/P2 | Readiness score departure, blocker, owner, SLA, escalation, comment, attachment, audit trail. |
| Fase 7: scale hardening | P2 | Server-side filters/pagination, retention, observability job, privacy masking, branch fixture test, UX recovery. |

## 9. Backlog teknis yang direkomendasikan

### Epic A — Payment Policy Engine

1. Tambahkan enum/schema rule yang typed, termasuk metode pembayaran, refund, schedule, grace period, customer visibility, dan enforcement mode.
2. Buat resolver final untuk global → package → departure dengan metadata source per rule.
3. Buat endpoint customer-visible yang tidak membocorkan data internal.
4. Pindahkan kalkulasi DP, schedule, due date, fee, dan validasi ke backend transaction.
5. Simpan acceptance record dan snapshot immutable saat booking dibuat.
6. Tambahkan preview policy per package/departure di admin.

### Epic B — Invoice and Document Engine

1. Buat invoice entity, numbering sequence, status, issue/revision, dan verification hash.
2. Buat template/version entity dengan scope tenant/branch dan active version.
3. Pisahkan renderer dari halaman React; gunakan renderer server-side yang menghasilkan PDF deterministik.
4. Buat section visibility dan design token yang dapat diatur admin.
5. Tambahkan receipt, statement of account, credit note, dan refund receipt.
6. Tambahkan customer download history dan verifikasi publik.

### Epic C — Certificate Designer 2.0

1. Definisikan element schema dan migrasi desain preset lama ke schema baru.
2. Bangun canvas dengan drag, resize, align, snap, layer, lock, duplicate, undo/redo, zoom, dan grid.
3. Tambahkan typography, color palette, image/asset library, background, border, QR, signature, stamp, dan conditional fields.
4. Tambahkan katalog 10–15 preset awal dan custom blank template.
5. Tambahkan batch issue, reissue, revoke, audit, numbering, PDF/PNG, ZIP, email, dan WhatsApp.
6. Tambahkan halaman verifikasi publik dan QR yang menunjuk ke certificate ID/hash.

### Epic D — Finance Exception Center

1. Satukan payment, booking, ledger, gateway, refund, commission, dan bank reconciliation dalam satu exception run.
2. Deteksi payment tanpa booking, booking tanpa ledger, duplicate reference, overpayment, refund excess, unbalanced journal, dan stale gateway event.
3. Tambahkan assignment, reason, resolution, approval, evidence, dan audit event.
4. Terapkan period close dan larangan perubahan transaksi historis tanpa reversal.

### Epic E — UX dan kualitas

1. Tambahkan empty, loading, error, retry, unsaved changes, and stale data states.
2. Tambahkan Playwright smoke flow customer: package → booking → policy acceptance → payment → invoice.
3. Tambahkan smoke flow admin: policy draft → preview → approve → activate → test booking.
4. Tambahkan smoke flow certificate: template → preview → batch issue → verify → revoke.
5. Pasang kembali dependency dan jalankan baseline typecheck/test/build sebelum setiap sprint.

## 10. Kriteria penerimaan bisnis utama

| Skenario | Hasil yang wajib terjadi |
|---|---|
| Booking tanpa pembayaran | Booking boleh dibuat sesuai kebijakan, tetapi revenue kas tetap nol dan policy/schedule tampil ke pelanggan. |
| Booking DP | Nominal minimal mengikuti policy final; schedule dan sisa pembayaran dihitung server-side. |
| Package override | Hanya rule yang diisi pada policy paket yang menimpa global; rule lain tetap mewarisi global. |
| Policy berubah | Booking lama tetap menggunakan snapshot lama; booking baru menggunakan policy aktif terbaru. |
| Invoice diterbitkan | Nomor invoice unik, template dan branding tersnapshot, status terdokumentasi, QR dapat diverifikasi. |
| Payment di-void | Total paid, balance, receipt, ledger, dan invoice status diperbarui melalui reversal/audit trail. |
| Refund | Fee dan eligible amount dihitung dari policy snapshot yang berlaku untuk booking; approval tercatat. |
| Sertifikat batch | Semua jemaah terpilih mendapat nomor unik, PDF/PNG valid, payload snapshot, dan QR verifikasi. |
| Sertifikat revoke | Halaman verifikasi menampilkan status revoked dengan alasan dan timestamp. |
| Cross-branch | User cabang A tidak dapat membaca atau mengubah policy, invoice, payment, maupun certificate cabang B. |

## 11. Keputusan bisnis yang perlu ditetapkan sebelum implementasi

Beberapa hal memerlukan keputusan pemilik bisnis karena memengaruhi data dan akuntansi. Pertama, apakah DP dianggap cukup untuk mengunci seat, atau hanya pembayaran terverifikasi berapa pun nominalnya. Kedua, komisi agen diterbitkan proporsional mengikuti uang masuk atau hanya saat booking lunas. Ketiga, apakah invoice perlu memuat pajak/NPWP dan entitas legal per cabang. Keempat, apakah refund dihitung dari total booking, uang yang sudah diterima, atau policy tiered yang berbeda. Kelima, siapa yang berwenang menyetujui invoice, refund, dan sertifikat resmi.

## 12. Kesimpulan

Repository sudah memiliki banyak fondasi dan beberapa keputusan arsitektur yang baik, terutama snapshot kebijakan pembayaran pada booking, rule resolver global/paket, payment ledger, dan pemisahan modul operasional. Namun kebutuhan Anda untuk sistem yang “kaya dan canggih” membutuhkan penguatan pada **enforcement**, **konfigurasi desain**, **versioning**, **approval**, **batch operation**, **public verification**, dan **integrasi customer-facing**.

Urutan paling aman adalah menyelesaikan **policy checkout terlebih dahulu**, kemudian membangun **invoice/document engine**, lalu mengembangkan **certificate designer 2.0**. Dengan urutan ini, aturan pembayaran tidak hanya tercatat di admin, tetapi benar-benar dipahami pelanggan, disimpan pada booking, tercetak konsisten pada invoice, dan tersedia sebagai sumber kebenaran untuk payment, refund, ledger, dan reminder.

## Referensi repository

[1]: `../artifacts/api-server/src/lib/paymentPolicyResolver.ts` — Resolver dan validasi kebijakan pembayaran.  
[2]: `../artifacts/api-server/src/routes/admin/payment-policies.ts` — API policy draft dan activation.  
[3]: `../lib/db/src/schema/paymentPolicies.ts` — Schema policy dan policy rules.  
[4]: `../lib/db/src/schema/bookings.ts` — Booking snapshot, payment, allocation, dan status log.  
[5]: `../artifacts/umroh-app/src/features/booking/pages/Booking.tsx` — Alur booking pelanggan.  
[6]: `../artifacts/umroh-app/src/features/admin/components/InvoiceGenerator.ts` — Isi dan layout invoice saat ini.  
[7]: `../artifacts/umroh-app/src/features/admin/pages/PaymentPolicies.tsx` — UI konfigurasi policy saat ini.  
[8]: `../artifacts/umroh-app/src/features/admin/pages/CertificateGenerator.tsx` — Generator dan preset sertifikat saat ini.  
[9]: `../lib/db/src/schema/certificates.ts` — Schema template dan certificate.  
[10]: `./feature-audit-report-2026-08-22.md` — Audit fitur terdahulu yang menjadi konteks tambahan.  
[11]: `./finance-integrity-audit.md` — Audit integritas finansial dan exception yang sudah dirumuskan.  
