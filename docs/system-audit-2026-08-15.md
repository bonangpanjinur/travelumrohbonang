# Laporan Audit Sistem Travel Umroh

**Tanggal audit:** 15 Agustus 2026  
**Ruang lingkup:** backend Express/Drizzle/PostgreSQL, frontend React/Vite, Supabase migrations, tenant isolation, keuangan, operasional, dokumen, sertifikat, manifest, dan Paket Tabungan.

## Ringkasan Eksekutif

Sistem sudah memiliki cakupan fitur yang luas: booking, paket, keberangkatan, jemaah, pembayaran, invoice, dokumen, perlengkapan, manifest, checklist keberangkatan, portal jemaah, chat, keuangan, Paket Tabungan, sertifikat, dan multi-tenant branch/agent. Fondasi isolasi tenant, per-pilgrim payment allocation, branded export, serta certificate designer sudah berkembang jauh.

Namun, sistem masih membutuhkan **hardening deployment dan integritas data** sebelum dapat dianggap stabil untuk operasi keuangan dan multi-tenant skala besar. Risiko tertinggi bukan lagi pada kurangnya menu, melainkan pada sinkronisasi migration production, konsistensi transaksi paralel, test coverage fitur kritis, dan kontrak API yang belum seragam.

> **Kesimpulan:** prioritas berikutnya harus beralih dari penambahan fitur ke stabilisasi production, rekonsiliasi database, automated regression test, dan observability.

## Matriks Prioritas

| Prioritas | Temuan | Dampak | Tindakan |
|---|---|---|---|
| P0 | Migration production belum dijamin sinkron dengan schema aplikasi. Sebelumnya terjadi pada `accounting_periods`, `certificates`, dan `departure_checklists`. | Endpoint menghasilkan 503/500 walaupun kode sudah tersedia. | Buat migration runner/check pada deployment, jalankan migration di staging lalu production, dan tambahkan health check schema. |
| P0 | Foreign key dan tipe kolom pernah mismatch, khususnya `done_by TEXT` vs `profiles.id UUID`. | Migration gagal dan fitur checklist tidak dapat digunakan. | Jalankan static FK audit serta query introspeksi Supabase pada setiap release. |
| P0 | Operasi finansial kritis belum seluruhnya diuji secara concurrency dan end-to-end. | Risiko saldo ganda, transaksi ganda, atau ledger tidak sinkron. | Tambahkan test transaksi paralel untuk payments, savings, refund, dan booking payment allocation. |
| P0 | Typecheck repository masih memiliki error existing dan dependency build yang belum konsisten. | Build dapat gagal setelah perubahan lain masuk atau menghasilkan bundle tidak terverifikasi. | Pisahkan baseline error, perbaiki bertahap sampai typecheck CI menjadi blocking. |
| P1 | Admin Paket Tabungan baru diperkuat dengan branch scope, tetapi data rekening lama tanpa profile branch dapat tersembunyi dari branch staff. | Data operasional tidak terlihat dan rekonsiliasi cabang menjadi tidak lengkap. | Backfill ownership branch melalui booking/customer mapping sebelum mengaktifkan enforcement penuh. |
| P1 | Workflow withdrawal sudah memiliki approval, tetapi penolakan masih melakukan pembacaan transaksi di luar transaction lock. | Dua admin dapat memproses request yang sama pada kondisi race. | Pindahkan select dan update rejection ke satu transaction dengan `FOR UPDATE` dan conditional update. |
| P1 | Idempotency deposit sekarang mewajibkan `Idempotency-Key`, tetapi seluruh client lama harus dipastikan mengirim header tersebut. | Setoran portal dapat berubah menjadi 400 jika frontend belum mengirim key. | Buat client helper yang otomatis menghasilkan UUID key dan uji jalur mobile/PWA. |
| P1 | Error handler banyak mengembalikan pesan generik dan tidak selalu membedakan migration missing, validation, forbidden, dan dependency failure. | Diagnosis production lambat dan user mendapat pesan yang tidak membantu. | Standarkan error envelope: `code`, `message`, `requestId`, dan `details` terkontrol. |
| P1 | Export PDF/Excel memiliki banyak generator terpisah. | Branding, pagination, ukuran kolom, dan isi dapat berbeda antar-export. | Buat shared document branding contract dan golden-file test untuk Excel/PDF. |
| P2 | Test coverage fitur sertifikat, manifest PDF, checklist, savings, dan per-pilgrim payment masih terbatas dibanding jumlah route. | Regresi UI/API mudah lolos ke production. | Tambahkan test matrix per role dan tenant untuk seluruh fitur kritis. |
| P2 | Banyak halaman admin berukuran sangat besar, termasuk Booking, CertificateGenerator, Accounting, Reports, dan Savings. | Perubahan kecil sulit diverifikasi dan risiko regresi meningkat. | Pecah menjadi feature components, hooks data, validation schema, dan presentational sections. |
| P2 | Label Bahasa Indonesia belum sepenuhnya seragam; beberapa halaman masih memakai label teknis/Inggris. | UX tidak konsisten untuk staf operasional. | Selesaikan translation inventory dan jadikan label Indonesia sebagai default wajib. |
| P2 | Belum ada bukti automated visual regression untuk layout certificate print, manifest, dan booking detail. | Masalah overlapping/print multi-page dapat kembali muncul. | Tambahkan browser snapshot atau PDF golden comparison pada CI. |

## Temuan Backend dan Database

### Sinkronisasi migration

Riwayat error menunjukkan bahwa production dapat menjalankan bundle yang mengakses tabel yang belum ada. Kondisi ini terjadi pada `accounting_periods`, `certificates`, dan `departure_checklists`. Ini adalah risiko deployment paling penting karena migration masih bergantung pada eksekusi manual.

Selain itu, terdapat dua file migration dengan prefix timestamp yang sama, yaitu `20260814000001_certificate_generator.sql` dan `20260814000001_sprint1_payment_integrity.sql`. Sistem migration harus diverifikasi agar tidak menganggap keduanya memiliki version yang sama atau menjalankan urutan yang tidak deterministik.

**Rekomendasi:** gunakan version sequence unik, tabel migration ledger, pre-deploy schema check, dan endpoint `/health/ready` yang memeriksa tabel wajib tanpa membocorkan detail database.

### Foreign key dan tipe data

Audit menemukan mismatch nyata pada `departure_checklists.done_by`, yang telah diperbaiki menjadi `UUID` agar cocok dengan `profiles.id`. Namun audit static tidak dapat menggantikan introspeksi database production. Query berikut perlu dijalankan di Supabase untuk memastikan seluruh constraint aktif konsisten:

```sql
SELECT
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  format_type(a.atttypid, a.atttypmod) AS child_type,
  format_type(pa.atttypid, pa.atttypmod) AS parent_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.table_schema = tc.table_schema
JOIN pg_attribute a
  ON a.attrelid = format('%I.%I', tc.table_schema, tc.table_name)::regclass
 AND a.attname = kcu.column_name
JOIN pg_attribute pa
  ON pa.attrelid = format('%I.%I', ccu.table_schema, ccu.table_name)::regclass
 AND pa.attname = ccu.column_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND format_type(a.atttypid, a.atttypmod) <> format_type(pa.atttypid, pa.atttypmod)
ORDER BY tc.table_name, kcu.column_name;
```

Target hasil query adalah **0 baris**.

### Paket Tabungan

Perbaikan terbaru sudah menambahkan branch scope, transaction lock untuk verifikasi deposit, approval/rejection withdrawal, status `withdrawal_pending`, dan idempotency key. Masih terdapat tiga risiko yang perlu ditutup:

1. Rejection withdrawal harus melakukan lock dan conditional update di dalam satu transaction.
2. `user_id` rekening tabungan masih berupa teks sehingga relasi ke profile dan branch bergantung pada join cast `p.id::text = sa.user_id`. Ini membuat integritas referensial lebih lemah dibanding UUID FK.
3. Data rekening lama yang tidak memiliki mapping branch harus di-backfill sebelum enforcement tenant penuh.

### Keuangan dan pembayaran

Per-pilgrim payment allocation sudah mendukung pembayaran per orang, tetapi harus diuji untuk pembagian parsial, void, refund, overpayment, perubahan booking, dan concurrent submission. Ledger, accounting period, dan payment status harus selalu berubah dalam transaction yang sama. Setiap kegagalan journal harus menggagalkan operasi utama atau masuk queue rekonsiliasi yang dapat dipantau.

## Tenant Isolation dan RBAC

Model scope saat ini membedakan global, branch, dan agent. Ini baik untuk booking, tetapi tidak semua domain otomatis memiliki relasi tenant yang kuat. Domain yang perlu diverifikasi ulang secara khusus adalah Paket Tabungan, certificates, manifest, checklist, documents, refunds, room assignments, dan reports.

Setiap route admin kritis wajib memenuhi empat pemeriksaan:

| Pemeriksaan | Syarat |
|---|---|
| Authentication | Request tanpa session harus 401. |
| Role | Role yang tidak berhak harus 403. |
| Ownership | Branch/agent tidak boleh membaca record tenant lain. |
| Mutation scope | PATCH, DELETE, verify, refund, approve, dan export harus menerapkan scope yang sama seperti GET. |

Test matrix saat ini belum mencakup semua domain tersebut secara end-to-end. Test role harus ditambah untuk global, branch manager, branch staff, finance, dan agent dengan fixture dua branch serta dua agent.

## Frontend dan UX

Frontend memiliki banyak halaman admin besar yang mencampur fetching data, mutation, modal, tabel, formatting, dan layout dalam satu file. Dampaknya adalah maintainability rendah dan test unit sulit dibuat. Booking Detail dan CertificateGenerator sudah mengalami beberapa putaran perbaikan visual, tetapi perlu visual regression agar bug print atau overlapping tidak berulang.

Area UX yang perlu diprioritaskan:

| Area | Kekurangan | Perbaikan |
|---|---|---|
| Loading | Sebagian halaman mengandalkan loading lokal tanpa skeleton konsisten. | Gunakan skeleton per panel dan stale-data indicator. |
| Error | Error API sering hanya menjadi toast generik. | Tampilkan pesan tindakan: refresh, jalankan migration, minta akses, atau hubungi finance. |
| Tabel besar | Beberapa daftar berpotensi memuat ribuan record sekaligus. | Server-side pagination, query filters, debounce, dan export asynchronous. |
| Mobile | Tabel dan action group berisiko overflow pada layar kecil. | Responsive table/card transformation dan sticky action footer. |
| Bahasa | Label teknis Inggris masih muncul di beberapa modul. | Translation registry terpusat dengan lint/check label. |
| Print | Certificate dan Manifest sudah diperbaiki secara lokal, tetapi belum memiliki regression test. | Test print-only DOM dan golden PDF per template. |

## Integrasi dan Deployment

Error production yang tercatat meliputi 401 pada Manifest PDF karena Authorization header hilang saat `window.open`, 404 settings branding karena path endpoint salah, serta 503 table missing. Pola ini menunjukkan kontrak frontend-backend belum sepenuhnya terpusat.

**Rekomendasi:** gunakan satu `apiClient` untuk semua authenticated download, generated API contract untuk endpoint settings, deployment checklist otomatis, dan observability berbasis request ID. Endpoint download file harus selalu memiliki test yang memeriksa session, status response, content type, dan filename.

## Fitur yang Masih Kurang

Sistem masih perlu menambahkan atau memperkuat beberapa kemampuan berikut:

| Domain | Fitur yang disarankan |
|---|---|
| Operasional | SLA checklist, escalation reminder, departure readiness score, dan incident postmortem. |
| Keuangan | Rekonsiliasi otomatis bank/payment gateway, aging piutang, cash forecast, dan closing period workflow. |
| Tabungan | Statement PDF jamaah, approval berjenjang, partial withdrawal policy, dan rekonsiliasi saldo harian. |
| Booking | Change log lengkap, cancellation fee calculation, waitlist, seat hold expiry, dan rebooking audit. |
| Dokumen | Expiry reminder, bulk upload, OCR validation, versioning, dan immutable verification history. |
| Sertifikat | QR verification public yang tidak membocorkan data sensitif, revoke certificate, dan batch issuance. |
| Tenant | Tenant-level settings, branch data backfill tool, cross-tenant negative tests, dan data export per tenant. |
| Admin | Central audit log viewer, permission simulation, failed job queue, dan schema health dashboard. |

## Roadmap Prioritas

### Sprint 0 — Production Stabilization

Jalankan seluruh migration di staging, deteksi duplicate migration version, tambahkan schema health check, dan buat deployment gate yang menghentikan release jika tabel wajib belum tersedia.

### Sprint 1 — Financial Integrity

Selesaikan atomicity savings rejection, idempotency client, payment concurrency tests, accounting period guard, dan rekonsiliasi ledger.

### Sprint 2 — Tenant Security

Backfill branch ownership, audit semua mutation/export route, tambah negative test dua tenant, dan buat audit trail immutable untuk perubahan sensitif.

### Sprint 3 — Operational Control

Tambahkan workflow approval pencairan berjenjang, departure readiness dashboard, SLA notification, dan incident escalation.

### Sprint 4 — UX and Performance

Pecah halaman admin besar, tambah pagination/server filtering, skeleton/error states, serta selesaikan Bahasa Indonesia secara menyeluruh.

### Sprint 5 — Automated Quality Gate

Aktifkan typecheck CI sebagai blocking, test role matrix, integration test migration, API contract test, dan visual regression untuk certificate/manifest/booking detail.

## Kesimpulan

Sistem sudah kaya fitur dan fondasi multi-tenant sudah ada, tetapi reliability production belum sebanding dengan luasnya fitur. **Perbaikan paling mendesak adalah migration governance, transactional integrity, complete tenant enforcement, dan automated test coverage.** Penambahan fitur baru sebaiknya ditahan sampai empat fondasi tersebut stabil.

Laporan audit ini dibuat berdasarkan inspeksi source code, schema, migration, route, halaman frontend, dan error production yang diberikan selama pengerjaan. Verifikasi langsung terhadap database Supabase production belum dilakukan karena koneksi database/service-role credential tidak tersedia di lingkungan audit.

## Referensi Internal

- [`scripts/audit_foreign_keys.py`](../scripts/audit_foreign_keys.py)
- [`docs/foreign-key-audit-2026-08-14.md`](./foreign-key-audit-2026-08-14.md)
- [`docs/savings-audit-2026-08-14.md`](./savings-audit-2026-08-14.md)
- [`artifacts/api-server/src/lib/scopeGuard.ts`](../artifacts/api-server/src/lib/scopeGuard.ts)
- [`artifacts/api-server/src/routes/admin/savings.ts`](../artifacts/api-server/src/routes/admin/savings.ts)
- [`artifacts/api-server/src/routes/admin/certificates.ts`](../artifacts/api-server/src/routes/admin/certificates.ts)
- [`supabase/migrations/20260814000009_savings_hardening.sql`](../supabase/migrations/20260814000009_savings_hardening.sql)
