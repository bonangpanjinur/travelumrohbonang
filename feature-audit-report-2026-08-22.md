# Laporan Audit Fitur Travel Umroh Bonang

**Tanggal audit:** 22 Agustus 2026  
**Ruang lingkup:** Panel admin, booking dan kuota, pembayaran/piutang, keuangan, operasional keberangkatan, CMS, multi-cabang, agen, jemaah, integrasi, logging, role/permission, dan kualitas UI.  
**Metode:** Review source frontend/backend, pemetaan route, static scan, regression test, typecheck, dan build production frontend.

## Ringkasan eksekutif

Aplikasi sudah memiliki cakupan fitur yang sangat luas. Modul utama meliputi paket dan keberangkatan, booking, pembayaran, cicilan, piutang, refund, akuntansi, CRM, agen, cabang, dokumen, visa, kamar, kursi, perlengkapan, manifest, checklist, CMS, chat, audit log, dan konfigurasi tenant.

Kelemahan utama saat ini bukan ketiadaan menu, melainkan **ketidakseimbangan antara keluasan UI dan kedalaman workflow**. Beberapa fitur masih berupa dashboard baca-saja atau kalkulasi di browser, sebagian operasi admin masih langsung menuju Supabase dari frontend, dan sejumlah menu belum memiliki kontrol end-to-end yang cukup untuk approval, rekonsiliasi, audit, pagination, dan exception handling.

| Prioritas | Jumlah temuan utama | Makna |
|---|---:|---|
| P0 | 2 | Risiko keamanan atau integritas operasional yang harus ditangani sebelum skala penggunaan diperbesar. |
| P1 | 8 | Gap yang dapat menyebabkan data tidak akurat, fitur gagal di kondisi nyata, atau kontrol operasional lemah. |
| P2 | 7 | Penguatan UX, observability, dan produktivitas yang penting setelah kontrol inti stabil. |

## Status verifikasi teknis

| Pemeriksaan | Hasil |
|---|---:|
| API regression suite | **PASS — 7 file, 42 test** |
| Frontend test suite | **PASS — 4 file, 26 test** |
| API TypeScript typecheck | **PASS** |
| Frontend TypeScript typecheck | **PASS** |
| Frontend production build | **PASS** |
| Seat reservation rule | **PASS** — `confirmed` menahan seat walaupun unpaid |
| Booking approval expiry | **Tersedia dan memiliki test**, tetapi perlu E2E dengan scheduler/database production |
| Production anonymous boundary | **PASS** — protected endpoint mengembalikan 401 tanpa sesi |
| Production authenticated admin workflow | **PENDING** — memerlukan sesi admin valid dan deployment terbaru |

## Matriks domain fitur

| Domain | Fitur yang tersedia | Kondisi saat ini | Penilaian |
|---|---|---|---|
| Booking | Create booking, detail, status, approval, perubahan keberangkatan/kamar, quota | Logika seat dan expiry sudah diperbaiki; perlu kontrol perubahan dan E2E lebih luas | Baik, perlu penguatan |
| Pembayaran | Verifikasi bukti bayar, payment gateway, cicilan, piutang, refund | Modul luas; rekonsiliasi dan approval lintas ledger belum terlihat sebagai satu workflow | Perlu kontrol finansial |
| Keuangan | Dashboard, HPP, COA, ledger, trial balance, laporan, bank reconciliation, budget, export | Banyak layar tersedia, tetapi integritas antar sumber perlu exception dashboard dan period close | Perlu penguatan |
| Operasional | Departure, itinerary, manifest, dokumen, visa, kamar, kursi, perlengkapan, checklist, check-in | Fitur terpecah di banyak halaman; belum ada satu control tower kesiapan keberangkatan | Gap operasional P0 |
| CMS | Blog, halaman, FAQ, gallery, testimonials, SEO, navigation, social kit | CRUD cukup luas; validasi dan media policy perlu distandardisasi | Cukup |
| Agen | Agent management, leaderboard, commission, withdrawal | Ada portal dan hasil komisi; pipeline, target, approval, settlement belum terpadu | Gap bisnis |
| Cabang/tenant | Branch, multi-branch, tenant sites, branding, domain | Ada dashboard dan CRUD tenant; beberapa data masih dibaca langsung di browser | Risiko arsitektur |
| Jemaah | Portal, booking, payment, documents, savings, loyalty, chat, e-ticket | Shell lengkap; timeline personal dan exception-driven task belum penuh | Perlu pengembangan |
| System/security | Role matrix, menu permissions, feature flags, audit/error logs, health | Guard backend membaik; feature gate dan log UX belum sepenuhnya konsisten | Perlu hardening lanjutan |

## Temuan prioritas P0

### P0-1 — Operasi admin privileged masih langsung dari frontend ke Supabase

`TenantSites.tsx` melakukan `select`, `insert`, `update`, dan `delete` langsung ke tabel `tenant_sites`, serta membaca `branches` dan `agents` dari browser. `UpgradeDialog.tsx` membaca pricing, mengunggah bukti pembayaran ke bucket storage, dan memasukkan `template_upgrade_orders` langsung dari browser. Selain itu, beberapa halaman admin masih melakukan upload langsung ke Supabase Storage, termasuk gallery keberangkatan, gallery paket, gallery CMS, paket, muthawif, dan settings.

Ini bertentangan dengan prinsip hardening sebelumnya bahwa operasi privileged harus melewati endpoint backend yang memvalidasi identitas, role, ownership, input, audit trail, dan rate limit. RLS memang dapat menjadi lapisan tambahan, tetapi tidak menggantikan policy backend yang konsisten dan auditability operasi admin.

**Rekomendasi:** pindahkan seluruh write admin dan upload admin ke endpoint Express terproteksi. Gunakan signed upload URL atau endpoint upload yang memvalidasi MIME, extension, ukuran, ownership, bucket, dan path. Tambahkan audit event untuk create/update/delete tenant, upload/delete media, dan template upgrade. Setelah migrasi, jalankan static check yang gagal jika area admin mengimpor client Supabase untuk operasi data atau storage.

**Bukti:** `artifacts/umroh-app/src/features/admin/pages/TenantSites.tsx:109-160`; `artifacts/umroh-app/src/features/admin/components/UpgradeDialog.tsx:58-159`; static scan menemukan penggunaan `supabase.storage` di beberapa halaman admin.

### P0-2 — Multi-branch dashboard menghitung data bisnis di browser dan dapat menyajikan KPI yang tidak sesuai aturan baru

`MultiBranch.tsx` mengambil hingga 1.000 booking, seluruh booking-pilgrim rows, cabang, dan agen melalui Supabase client, lalu menghitung agregat di browser. Revenue hanya menghitung booking dengan `status === "paid"`, sedangkan pending hanya menghitung `pending` dan `waiting_payment`. Booking `confirmed` yang unpaid, yang menurut aturan bisnis tetap menahan seat dan masuk piutang, tidak masuk ke pending KPI. Pembatasan 1.000 rows juga dapat membuat angka cabang tidak lengkap tanpa indikator truncation.

**Rekomendasi:** sediakan endpoint agregasi backend yang memakai query server-side, filter tanggal eksplisit, branch scope, pagination/aggregation database, dan definisi status terpusat. Pisahkan metrik `approved/seat-held`, `paid`, `receivable`, `cancelled`, dan `expired`. Tampilkan timestamp snapshot serta warning jika data belum final.

**Bukti:** `artifacts/umroh-app/src/features/admin/pages/MultiBranch.tsx:33-69,110-129`.

## Temuan prioritas P1

### P1-1 — Belum ada Departure Control Tower

Data kesiapan rombongan tersebar di dokumen, visa, pembayaran, kamar, kursi, manifest, perlengkapan, checklist, dan itinerary. Halaman `DepartureReadiness` membantu, tetapi belum menjadi pusat kendali dengan owner, severity, deadline, exception, dan status blocker yang wajib ditutup.

**Dampak:** operator harus berpindah banyak menu dan dapat melewatkan blocker kritis menjelang keberangkatan.

**Rekomendasi:** buat readiness score per departure dengan blocker otomatis, misalnya unpaid melewati deadline, dokumen kurang, visa belum selesai, seat/kamar belum ditentukan, atau manifest berubah setelah lock. Tambahkan PIC, SLA, escalation, comment, attachment, dan audit perubahan.

### P1-2 — Rekonsiliasi booking–payment–ledger belum menjadi exception workflow terpadu

Modul payment, accounting, bank reconciliation, refund, commission, dan export sudah tersedia, tetapi audit fitur menunjukkan belum ada pusat pengecualian yang menyatukan booking tanpa pembayaran, pembayaran tanpa booking, pembayaran duplikat, ledger yang tidak seimbang, refund yang belum membalik komisi, dan settlement gateway yang belum cocok.

**Rekomendasi:** sediakan reconciliation run harian dengan status `matched`, `unmatched`, `duplicate`, `missing_ledger`, dan `needs_review`; tambahkan approval dan period close agar histori finansial tidak berubah diam-diam.

### P1-3 — Feature flags hanya mengatur sebagian route

Catalog feature flags memiliki 19 feature ID, tetapi route list hanya mencakup subset halaman. Banyak halaman finance, operasional, settings, dan master data tidak tercakup dalam feature map. Akibatnya, mematikan sebuah feature dapat menyembunyikan menu tertentu tetapi halaman terkait lainnya tetap dapat diakses langsung melalui URL oleh role yang memang memiliki izin.

**Rekomendasi:** jadikan feature gate sebagai policy backend dan frontend. Setiap domain harus memiliki daftar route lengkap, API capability, dan default behavior ketika flag disabled. Jangan menganggap hide-menu sebagai pembatasan akses.

**Bukti:** `artifacts/umroh-app/src/features/admin/config/featureDefinitions.ts:52-269`; `getFeatureForPath()` hanya menggunakan route prefix yang terdaftar.

### P1-4 — Log audit/error belum memiliki server-side filtering dan lifecycle management

Backend `/api/admin/logs/audit` dan `/api/admin/logs/error` hanya menyediakan `limit` dan `offset`. Search dan date filtering dilakukan di browser setelah data diambil. Halaman audit tidak memiliki pagination UI yang memadai, metadata dipotong di tabel, dan halaman error memiliki tombol bersihkan yang hanya menampilkan toast bahwa fitur belum tersedia.

**Rekomendasi:** tambah parameter server-side `q`, `action`, `result`, `userId`, `from`, `to`, cursor pagination, total/hasNext, dan retention policy. Untuk clear/delete, gunakan archive atau purge terproteksi dengan confirmation, reason, role restriction, dan audit event; jangan menyediakan penghapusan tanpa kebijakan retensi.

**Bukti:** `artifacts/api-server/src/routes/admin/logs.ts:10-60`; `artifacts/umroh-app/src/features/admin/pages/ErrorLogs.tsx`.

### P1-5 — Status deployment production dan CORS belum sepenuhnya sinkron

Host aktif `travelvins.vercel.app` berhasil mengembalikan health HTTP 200 dan database connected. Namun preflight OPTIONS dari alias tersebut mengembalikan HTTP 401 karena alias aktif belum ada pada default CORS allowlist deployment yang sedang berjalan. Source sudah diperbaiki dengan menambahkan alias tersebut, tetapi recheck sebelum redeploy masih mengembalikan 401.

**Rekomendasi:** redeploy commit terbaru, lalu verifikasi OPTIONS mengembalikan 204/200 dengan `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`, dan method/header yang benar. Tambahkan integration test production-origin CORS agar perubahan alias tidak kembali merusak browser admin.

### P1-6 — Upload media admin belum memiliki policy yang seragam

Beberapa halaman membangun path file dari nama atau timestamp dan melakukan upload langsung. Walaupun sebagian memvalidasi ukuran atau tipe, policy antar halaman belum terpusat. Risiko yang perlu dikendalikan mencakup MIME spoofing, extension berbahaya, file terlalu besar, path collision, file orphan setelah record dihapus, dan public URL exposure.

**Rekomendasi:** satu upload service backend dengan allowlist MIME, pemeriksaan magic bytes, ukuran maksimum per kategori, random object key, virus scanning bila tersedia, ownership, private bucket default, signed read URL untuk dokumen sensitif, dan cleanup orphan.

### P1-7 — Approval matrix lintas refund, discount, biaya, dan perubahan booking belum seragam

Route role sudah dibagi menjadi finance, operational, admin, dan super-admin. Namun dari inventaris fitur, belum terlihat satu policy approval yang mengatur batas nominal, maker-checker, reason wajib, segregation of duties, serta dampak ke ledger/komisi untuk refund, diskon, biaya paket, perubahan departure, dan override booking.

**Rekomendasi:** definisikan action policy per nominal dan domain, simpan actor/approver, before-after snapshot, reason, timestamp, dan audit event. Blokir self-approval dan perubahan historis setelah period close.

### P1-8 — Fitur template upgrade masih mengandung asumsi bisnis hardcoded

`UpgradeDialog.tsx` menggunakan fallback nomor WhatsApp hardcoded `6281234567890` ketika tidak ada tenant site. Status order langsung menjadi `paid` jika bukti upload tersedia, padahal upload bukti belum sama dengan verifikasi pembayaran. Ini berisiko menampilkan status finansial yang terlalu optimistis.

**Rekomendasi:** ambil contact dari konfigurasi resmi, validasi nomor, dan gunakan status `proof_submitted` atau `awaiting_verification` sampai admin menyetujui. Harga dan status harus ditetapkan server-side, bukan dipercaya dari state browser.

## Temuan prioritas P2

### P2-1 — UI memiliki placeholder dan route redirect yang perlu diberi status jelas

Route `multi-language` masih menuju `AdminPlaceholder`, sementara `role-management` dan beberapa route dokumen/chat menggunakan redirect kompatibilitas. Ini bukan bug jika disengaja, tetapi perlu label “belum tersedia” yang konsisten dan tidak terlihat sebagai fitur produksi penuh.

### P2-2 — Cakupan automated test frontend masih tipis dibanding jumlah fitur

Frontend hanya memiliki 26 test pada empat file, dengan cakupan utama berupa helper, phone, payment proof, dan route access. Belum ada test komponen untuk booking approval, payment verification, piutang, multi-branch KPI, sidebar active state, tenant CRUD, upload, financial reports, dan departure readiness.

**Rekomendasi:** prioritaskan contract tests untuk hook API, component tests untuk status/error/empty states, dan Playwright smoke flow untuk login → sidebar → booking → payment → piutang → departure readiness.

### P2-3 — Dashboard branch belum memberi indikator data stale atau incomplete

Query browser menggunakan fixed limit 1.000 dan tidak menampilkan `last updated`, total server-side, filter rentang tanggal, atau penanda bahwa data dapat terpotong. Tambahkan filter tanggal, export snapshot, dan indikator freshness.

### P2-4 — Error handling banyak bergantung pada toast tanpa recovery path

Toast membantu feedback singkat, tetapi audit UI perlu memastikan setiap error menyediakan retry, detail yang dapat ditindaklanjuti, dan state form yang tidak hilang. Ini penting untuk upload, payment proof, bulk change departure, room assignment, dan import pilgrims.

### P2-5 — Observability untuk cron dan provider perlu dashboard operasional

Cron expiry, reminder, exchange rate, email, dan WhatsApp sudah memiliki kode terpisah, tetapi operator membutuhkan job history, duration, retry count, last success, last failure, dan dead-letter/error queue. Health endpoint saja belum cukup untuk membuktikan job berjalan benar.

### P2-6 — Data privacy perlu klasifikasi per halaman dan export

Panel memiliki passport/document, payment proof, user, audit logs, chat, health, dan diagnostic routes. Audit berikutnya perlu memastikan masking default, signed access, access log, export restriction, dan tidak ada data sensitif di client cache atau log request.

### P2-7 — Multi-branch authorization perlu diuji dengan fixture lintas cabang

Role gate backend sudah lebih baik, tetapi audit fitur belum membuktikan setiap query dan mutation memfilter `branch_id` secara konsisten. Tambahkan test fixture branch A/branch B untuk booking, pilgrims, payment, documents, reports, chat, and tenant sites.

## Rekomendasi roadmap

| Fase | Fokus | Output minimum |
|---|---|---|
| 0–14 hari | Tutup P0 | Migrasi operasi privileged frontend ke backend; backend aggregation multi-branch; redeploy dan CORS verification. |
| 15–30 hari | Integritas finansial | Reconciliation exception center, approval matrix, proof-submitted status, audit retention/filtering. |
| 31–60 hari | Control tower operasional | Departure readiness score, blocker, PIC/SLA, manifest lock/versioning, cross-branch test fixtures. |
| 61–90 hari | Reliability dan UX | Test coverage komponen, cron dashboard, upload service terpusat, retry/error recovery, privacy review. |

## Kesimpulan

Panel admin sudah kaya fitur dan fondasi routing/role backend cukup baik. Perubahan booking seat, expiry, piutang, session bridge, rate limiting, dan audit logging merupakan kemajuan penting. Namun, sistem belum sebaiknya dianggap fully production-hardened karena masih ada operasi privileged langsung dari frontend, KPI multi-cabang yang tidak mengikuti definisi confirmed unpaid, feature flags yang tidak mencakup seluruh route, serta gap rekonsiliasi dan control tower operasional.

Prioritas yang paling tepat bukan menambah menu baru, tetapi menyatukan **policy backend, source of truth data, approval, audit trail, dan exception workflow**. Setelah P0 ditutup dan deployment production terbaru terverifikasi, tim dapat melanjutkan penguatan P1 secara bertahap tanpa memperluas permukaan risiko.

## Referensi internal

[1]: `artifacts/umroh-app/src/features/admin/components/adminMenuConfig.ts` — Menu, role, dan feature IDs admin.  
[2]: `artifacts/umroh-app/src/features/admin/adminRouteAccess.ts` — Frontend route access policy.  
[3]: `artifacts/api-server/src/routes/admin/index.ts` — Backend admin router dan role gates.  
[4]: `artifacts/umroh-app/src/features/admin/pages/MultiBranch.tsx` — Multi-branch browser-side KPI calculation.  
[5]: `artifacts/umroh-app/src/features/admin/pages/TenantSites.tsx` — Direct tenant CRUD from frontend Supabase client.  
[6]: `artifacts/umroh-app/src/features/admin/components/UpgradeDialog.tsx` — Direct pricing, upload, and upgrade-order operations.  
[7]: `artifacts/api-server/src/routes/admin/logs.ts` — Audit/error log API capabilities.  
[8]: `artifacts/umroh-app/src/features/admin/config/featureDefinitions.ts` — Feature flag route catalog.  
[9]: `artifacts/api-server/src/lib/seatQuota.test.ts` — Seat reservation behavior tests.  
[10]: `security-audit-summary-2026-08-22.md` — Security and production verification summary.
