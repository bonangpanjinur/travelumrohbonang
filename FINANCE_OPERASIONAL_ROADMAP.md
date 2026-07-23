# Roadmap Modul Keuangan & Operasional — UmrohPlus

> Dokumen ini mencatat semua rencana, progres, dan backlog fitur keuangan dan operasional.
> Gabungan dari analisa codebase 21 Juli 2026.
>
> **Terakhir diperbarui:** 23 Juli 2026 (diverifikasi ulang dari codebase)

---

## Ringkasan Status

### Modul Keuangan

| Fase | Nama | Status |
|------|------|--------|
| F-0  | Sistem Pembayaran Dasar | ✅ Selesai |
| F-1A | Dashboard Keuangan & Piutang | ✅ Selesai |
| F-1B | Invoice + QR Tracking | ✅ Selesai |
| F-1C | Cicilan (Installment) Otomatis | ✅ Selesai |
| F-2  | Keuangan Per Keberangkatan (HPP, Margin) | ✅ Selesai |
| F-3  | Auto-Alert Deadline Lunas (Cron) | ✅ Selesai |
| F-4  | Biaya Operasional Per Paket | ✅ Selesai |
| F-5  | Reminder Piutang via WA (Bulk) | ✅ Selesai |
| F-6  | Jurnal Otomatis (Auto-Posting) | ✅ Selesai |
| F-7  | Chart of Accounts + Buku Besar | ✅ Selesai |
| F-8  | Laporan Akuntansi Standar (Neraca, L/R, Arus Kas) | ✅ Selesai |
| F-9  | HPP Otomatis dari Biaya Aktual | ✅ Selesai |
| F-10 | Rekonsiliasi Bank (Import Mutasi) | ✅ Selesai |
| F-11 | Pajak (PPN/PPh) & Faktur Pajak | 🔲 Belum |
| F-12 | Budget & Proyeksi Cash Flow | ✅ Selesai |
| F-13 | Nomor Invoice Otomatis per Tenant | ✅ Selesai |
| F-14 | Multi-Currency Terintegrasi | ✅ Selesai |
| F-15 | Export ke Software Akuntansi | ✅ Selesai |

### Modul Operasional

| Fase | Nama | Status |
|------|------|--------|
| O-0  | Paket, Keberangkatan, Itinerary | ✅ Selesai |
| O-1  | Booking Lifecycle + Audit Trail | ✅ Selesai |
| O-2  | Manifest PDF + Check-in QR | ✅ Selesai |
| O-3  | Room Assignment (Bulk) | ✅ Selesai |
| O-4  | Database Jamaah + Dokumen | ✅ Selesai |
| O-5  | Master Data (Hotel, Airline, Muthawif, Equipment) | ✅ Selesai |
| O-6  | CRM, Chat, Kontrak Digital | ✅ Selesai |
| O-7  | RBAC, Multi-tenant, Feature Flags | ✅ Selesai |
| O-8  | Halaman Distribusi Perlengkapan + Stok Rekonsiliasi | ✅ Selesai |
| O-9  | Visa Tracking (Status Pengajuan) | ✅ Selesai |
| O-10 | Assignment Kursi Pesawat | ✅ Selesai |
| O-11 | Pre-departure Checklist Otomatis | ✅ Selesai |
| O-12 | Validasi Kapasitas Kamar + Konflik Gender | ✅ Selesai |
| O-13 | Manifest Offline Cache | 🔲 Belum |
| O-14 | Kode Booking Anti-Collision | ✅ Selesai |

---

## ✅ Yang Sudah Ada — Modul Keuangan

### F-0 — Sistem Pembayaran Dasar

- Tabel `bookings`, `booking_payments` — pencatatan pembayaran manual
- Upload bukti bayar jemaah, verifikasi admin (approve/reject)
- Payment gateway: **Midtrans** (VA + QRIS) dan **Xendit** (VA)
- Webhook handler Midtrans & Xendit → update status otomatis
- Log akses bukti bayar (`payment_proof_access_logs`)

**File utama:**
```
artifacts/api-server/src/routes/admin/payments.ts
artifacts/api-server/src/routes/payment-gateway-webhooks.ts
artifacts/api-server/src/lib/paymentSync.ts
artifacts/umroh-app/src/features/admin/pages/Payments.tsx
artifacts/umroh-app/src/features/booking/pages/Payment.tsx
```

---

### F-1A — Dashboard Keuangan & Piutang

**Backend `GET /api/admin/finance/dashboard`:**
- Total pemasukan bulan ini, total piutang aktif, booking lunas
- Arus kas bulanan 12 bulan (breakdown DP/cicilan/pelunasan)
- Keberangkatan mendatang 90 hari: target, terkumpul, outstanding
- Aging buckets: overdue / kritis (≤14h) / mendesak (15–30h) / perhatian (31–60h) / normal

**Backend `GET /api/admin/finance/piutang`:**
- Join bookings + profiles + packages + departures + booking_payments
- Field computed: `payStatus`, `agingBucket`
- Export CSV piutang, bulk reminder (UI ada, endpoint lihat F-5)

```
artifacts/api-server/src/routes/admin/finance.ts
artifacts/umroh-app/src/features/admin/pages/FinanceDashboard.tsx
artifacts/umroh-app/src/features/admin/pages/Piutang.tsx
```

---

### F-1B — Invoice + QR Tracking

- `GET /api/admin/bookings/:id/invoice-data`
- `GET /api/track/:code` (publik, tanpa auth)
- QR code di invoice → `/track/{bookingCode}`
- Halaman publik `TrackBooking.tsx`

```
artifacts/api-server/src/routes/track.ts
artifacts/umroh-app/src/features/admin/components/InvoiceGenerator.ts
artifacts/umroh-app/src/pages/TrackBooking.tsx
```

---

### F-1C — Cicilan (Installment) Otomatis

- Tabel `installment_schedules` (installmentNumber 0=DP, 1..n)
- `generateInstallmentSchedule()`, `markInstallmentPaid()`, `syncOverdueStatus()`
- Cron harian 08:00 WIB: reminder WA+email 7 hari sebelum jatuh tempo
- Frontend: `InstallmentSchedule.tsx`, `Installments.tsx` (admin monitoring)

```
artifacts/api-server/src/lib/installments.ts
artifacts/api-server/src/lib/installmentReminderCron.ts
artifacts/umroh-app/src/features/admin/pages/Installments.tsx
```

---

### F-2 — Keuangan Per Keberangkatan (HPP & Margin)

- `GET /api/admin/finance/departures` — P&L summary per keberangkatan
- `GET /api/admin/finance/departure/:id` — detail: revenue/HPP/gross profit/margin %
- `package_costs` table: entry biaya per kategori (hotel, tiket, visa, dll.)
- Halaman `PackageCosts.tsx`: CRUD biaya, bulk copy antar paket

```
artifacts/api-server/src/routes/admin/finance.ts
artifacts/api-server/src/routes/admin/costs.ts
artifacts/umroh-app/src/features/admin/pages/PackageCosts.tsx
```

---

### F-3 — Auto-Alert Deadline Lunas

- Cron daily 08:00 WIB: deteksi booking belum lunas H-30, H-14, H-7
- Kirim notifikasi in-app + WA ke jemaah dan admin
- Anti-duplicate via cek notifikasi 24 jam terakhir

```
artifacts/api-server/src/lib/paymentDeadlineAlertCron.ts
```

---

### F-4 — Biaya Operasional Per Paket

- Tabel `package_costs`: budgeted amount, kategori, sort order
- CRUD di `PackageCosts.tsx`, bulk copy antar keberangkatan
- Filter per departure + package level costs

---

## ✅ Yang Sudah Ada — Modul Operasional

### O-0 — Paket, Keberangkatan, Itinerary

- **Paket:** CRUD, clone, bulk status, extra hotel, document requirements, komisi per paket (cabang/agen/staff), kategori paket
- **Keberangkatan:** CRUD, clone, quota bar (visual progress), manifest PDF, gallery foto
- **Itinerary:** CRUD per departure, hari dengan gambar upload, drag-drop reorder (@dnd-kit), copy ke departure lain, preview mode

```
artifacts/api-server/src/routes/admin/packages.ts
artifacts/api-server/src/routes/admin/departures.ts
artifacts/api-server/src/routes/admin/itineraries.ts
artifacts/umroh-app/src/features/admin/pages/Packages.tsx
artifacts/umroh-app/src/features/admin/pages/Departures.tsx
artifacts/umroh-app/src/features/admin/pages/Itineraries.tsx
```

---

### O-1 — Booking Lifecycle + Audit Trail

- State machine: draft → pending → confirmed → completed / cancelled
- Admin create booking, validasi quota
- Ganti departure (restore/consume quota), ganti room type + recalculate harga
- Bulk status update, audit log per perubahan status
- Assign ke cabang, export Excel (.xlsx)

```
artifacts/api-server/src/routes/admin/bookings.ts
artifacts/umroh-app/src/features/admin/pages/Bookings.tsx
```

---

### O-2 — Manifest PDF + Check-in QR

- Manifest PDF (standar airline) + export CSV airline
- Print layout khusus manifest, QR code unik per jamaah
- QR scan check-in (html5-qrcode) + manual check-in by NIK/nama
- Lokasi check-in configurable, recap checked vs belum

```
artifacts/api-server/src/routes/admin/departures.ts  (manifest PDF)
artifacts/umroh-app/src/features/admin/pages/Manifest.tsx
artifacts/umroh-app/src/features/admin/pages/CheckIn.tsx
```

---

### O-3 — Room Assignment (Bulk)

- Bulk edit room type + room number per jamaah
- Stats card: total jamaah, assigned, breakdown per room type
- Filter by nama / room type

```
artifacts/api-server/src/routes/admin/room-assignment.ts
artifacts/umroh-app/src/features/admin/pages/RoomAssignment.tsx
```

---

### O-4 — Database Jamaah + Dokumen

- CRUD jamaah master, import/export CSV + template
- Validasi NIK 16 digit, email, format telepon Indonesia
- Alert passport expired / expiring 90 hari
- Dokumen: upload, verifikasi, hapus (Passport · Visa · Vaksin)
- Equipment assignment tracking per jamaah

```
artifacts/api-server/src/routes/admin/pilgrims.ts
artifacts/api-server/src/routes/admin/pilgrim-documents.ts
artifacts/umroh-app/src/features/admin/pages/Pilgrims.tsx
artifacts/umroh-app/src/features/admin/pages/PilgrimsDatabase.tsx
```

---

### O-5 — Master Data

- Hotel (bintang, kota, gambar), Airline (logo, kode), Airport (IATA)
- Muthawif / pembimbing jamaah
- Equipment master: stok, kategori, gambar, tracking distribusi per jamaah (pending/distributed/returned)
- Kategori paket, template upgrades

```
artifacts/api-server/src/routes/admin/masterdata.ts
artifacts/api-server/src/routes/admin/pilgrim-equipment.ts
artifacts/umroh-app/src/features/admin/pages/Hotels.tsx
artifacts/umroh-app/src/features/admin/pages/Airlines.tsx
```

---

### O-6 — CRM, Chat, Kontrak Digital

- Lead pipeline, follow-up, interaksi, repeat customers
- Chat booking (admin ↔ jamaah)
- Notifikasi in-app, WhatsApp blast per departure (Fonnte)
- Kontrak digital (tanda tangan elektronik)
- Incident reports

```
artifacts/api-server/src/routes/admin/crm.ts
artifacts/api-server/src/routes/admin/contracts.ts
artifacts/api-server/src/routes/admin/chats.ts
```

---

### O-7 — RBAC, Multi-tenant, Feature Flags

- Role & menu permissions per user
- Multi-tenant: cabang, agen, affiliate link & click tracking
- Komisi agen per paket (cabang/agen/staff), withdrawal request, leaderboard
- Feature flags per tenant, audit logs, system health check

---

## 🔲 Backlog — Modul Keuangan

---

### F-5 — Reminder Piutang via WA (Bulk) ✅ Selesai

**Implementasi:**
- `POST /api/admin/finance/piutang/remind` — body: `{ bookingIds: string[] }`
- Batch limit 100 ID, proses 50 per batch dengan delay 300ms anti-spam
- Pakai template `paymentDeadlineAlertWA` dari `lib/whatsapp/src/templates.ts`
- Return: `{ sent, failed, total, skipped, errors }`

```
artifacts/api-server/src/routes/admin/finance.ts   ← endpoint baris 300-404
```

---

### F-6 — Jurnal Otomatis (Auto-Posting ke Ledger) ✅ Selesai

**Implementasi:**
- `artifacts/api-server/src/lib/autoJournal.ts` — 7 fungsi idempoten (referenceNumber unik per event)
- Hook sudah terpasang di: `payments.ts` (verify), `refunds.ts` (approve/refunded), `agents.ts` (withdrawal), `installments.ts` (paid), savings routes (deposit/used)

| Fungsi | Event |
|---|---|
| `journalPaymentVerified` | Bukti bayar manual diverifikasi |
| `journalInstallmentPaid` | Cicilan dibayar |
| `journalRefundApproved` | Refund disetujui |
| `journalRefundProcessed` | Refund dicairkan |
| `journalCommissionWithdrawal` | Withdrawal komisi agen |
| `journalSavingsDeposit` | Setoran tabungan |
| `journalSavingsUsed` | Tabungan dipakai untuk booking |

---

### F-7 — Chart of Accounts (CoA) + Buku Besar ✅ Selesai

**Verifikasi 23 Juli 2026:** Sudah diimplementasi penuh.

**Implementasi:**
- Tabel `chart_of_accounts` di `lib/db/src/schema/accounting.ts` — kode akun format `{type_digit}-{seq4}`, kolom `type`, `category`, `normal_balance`, `is_active`, `sort_order`
- Route `GET/POST/PATCH/DELETE /api/admin/coa` + `POST /seed` (seed akun standar) + `GET /ledger` + `GET /trial-balance`
- Frontend: `ChartOfAccounts.tsx`, `GeneralLedger.tsx`, `TrialBalance.tsx`

```
lib/db/src/schema/accounting.ts                              ← chartOfAccounts table
artifacts/api-server/src/routes/admin/coa.ts                 ← semua CoA endpoints
artifacts/umroh-app/src/features/admin/pages/ChartOfAccounts.tsx
artifacts/umroh-app/src/features/admin/pages/GeneralLedger.tsx
artifacts/umroh-app/src/features/admin/pages/TrialBalance.tsx
```

---

### F-8 — Laporan Akuntansi Standar (Neraca, L/R, Arus Kas) ✅ Selesai

**Verifikasi 23 Juli 2026:** Sudah diimplementasi penuh.

**Implementasi:**
- `GET /api/admin/finance/reports/income-statement` — P&L (revenue, HPP, gross profit, net income) per periode
- `GET /api/admin/finance/reports/balance-sheet` — Neraca (assets current/fixed, liabilities, equity)
- `GET /api/admin/finance/reports/cash-flow` — Laporan Arus Kas metode tidak langsung
- Frontend: `FinancialReports.tsx`

```
artifacts/api-server/src/routes/admin/finance.ts         ← semua endpoint laporan (reports/*)
artifacts/umroh-app/src/features/admin/pages/FinancialReports.tsx
```

---

### F-9 — HPP Otomatis dari Biaya Aktual ✅ Selesai

**Verifikasi 23 Juli 2026:** Sudah diimplementasi penuh.

**Implementasi:**
- Kolom `actual_amount`, `invoice_reference`, `paid_at` sudah ada di tabel `package_costs`
- `GET /api/admin/costs/summary?packageId=X` — budgeted vs actual vs variance per kategori (dengan `missing_actual_count`)
- `PATCH /api/admin/costs/:id` — update `actualAmount`, `invoiceReference`, `paidAt`
- `PackageCosts.tsx` menampilkan kolom Aktual | Variance, export CSV sudah include kolom aktual, HPP per pax otomatis

```
lib/db/src/schema/packages.ts                            ← actual_amount, invoice_reference, paid_at
artifacts/api-server/src/routes/admin/costs.ts           ← summary endpoint + PATCH
artifacts/umroh-app/src/features/admin/pages/PackageCosts.tsx
```

---

### F-10 — Rekonsiliasi Bank (Import Mutasi) ✅ Selesai

**Verifikasi 23 Juli 2026:** Sudah diimplementasi penuh.

**Implementasi:**
- Tabel `bank_mutations` di `lib/db/src/schema/accounting.ts` — kolom `mutation_date`, `amount`, `balance`, `ref_number`, `bank_account`, `bank_name`, `matched_to`, `is_matched`
- `GET /api/admin/bank-reconciliation` — list mutasi (filter: bankAccount, matched, date range)
- `POST /api/admin/bank-reconciliation/import` — import CSV mutasi
- `PATCH /api/admin/bank-reconciliation/:id` — manual match ke booking_payment
- `POST /api/admin/bank-reconciliation/auto-match` — auto-match by amount + tanggal ±1 hari
- Frontend: `BankReconciliation.tsx`

```
lib/db/src/schema/accounting.ts                               ← bankMutations table
artifacts/api-server/src/routes/admin/bank-reconciliation.ts  ← semua endpoint
artifacts/umroh-app/src/features/admin/pages/BankReconciliation.tsx
```

---

### F-11 — Pajak (PPN/PPh) & Faktur Pajak

**Prioritas: Sedang | Estimasi: 3 hari**

- Konfigurasi tarif PPN/PPh per tenant (misal PPN 11%, PPh 23 2%)
- Kalkulasi otomatis di invoice
- Tabel `tax_invoices` untuk nomor faktur pajak
- Export format e-Faktur (DJP Online)

---

### F-12 — Budget & Proyeksi Cash Flow

**Prioritas: Rendah | Estimasi: 2 hari**

- Tabel `budgets` per periode + kategori
- Dashboard: target pendapatan vs realisasi per bulan/kuartal/tahun
- Proyeksi cash flow 3–6 bulan ke depan berdasarkan jadwal cicilan + keberangkatan

---

### F-13 — Nomor Invoice Otomatis per Tenant ✅ Selesai

**Implementasi:**
- Format: `INV/{YYYY}/{SEQ:04d}` — contoh: `INV/2026/0042`
- Sequence dihitung on-the-fly: COUNT bookings dalam tahun yang sama dengan created_at ≤ booking ini (stabil, tanpa schema change)
- Response `GET /api/admin/bookings/:id/invoice-data` sudah mengembalikan `invoiceNumber`

```
artifacts/api-server/src/routes/admin/bookings.ts  ← invoice-data endpoint
```

---

### F-14 — Multi-Currency Terintegrasi ✅ Selesai

**Verifikasi 23 Juli 2026:** Sudah diimplementasi penuh.

**Implementasi:**
- Kolom `exchange_rate` (snapshot kurs saat booking) ditambah ke tabel `bookings`
- Kolom `rate_updated_at` ditambah ke tabel `currencies` untuk tracking kapan kurs terakhir diperbarui
- `POST /api/admin/currencies/sync-rates` — sinkronisasi kurs dari Open Exchange Rates API (gratis, tanpa API key); mengembalikan `{ updated, errors, syncedAt }`
- Cron harian 06:00 WIB: `startExchangeRateCron()` — auto-update `rate_to_idr` + `rate_updated_at` untuk semua mata uang aktif (kecuali IDR)
- Booking create (single & group): otomatis snapshot `exchangeRate` dari DB saat booking dibuat
- `useCurrency` hook: migrasi dari Supabase direct → `apiFetch("/api/admin/currencies")` agar konsisten dengan pola CMS
- Halaman admin Mata Uang: tombol "Perbarui Kurs" (trigger manual sync), kolom "Terakhir Update Kurs", info sumber data + jadwal otomatis

```
lib/db/src/schema/masterdata.ts                       ← rateUpdatedAt di currencies
lib/db/src/schema/bookings.ts                         ← exchangeRate di bookings
artifacts/api-server/src/lib/exchangeRateCron.ts      ← cron + syncExchangeRates()
artifacts/api-server/src/routes/admin/currencies.ts   ← POST /sync-rates
artifacts/api-server/src/index.ts                     ← startExchangeRateCron()
artifacts/umroh-app/src/shared/hooks/useCurrency.tsx  ← apiFetch (bukan supabase direct)
artifacts/umroh-app/src/features/admin/pages/Currencies.tsx ← sync button + last updated
```

---

### F-15 — Export ke Software Akuntansi

**Prioritas: Rendah | Estimasi: 1–2 hari**

- Export jurnal ke format CSV Jurnal.id / Accurate / Zahir
- Export ke format XML/CSV e-SPT PPh
- API publik laporan keuangan (untuk integrasi eksternal)

---

## 🔲 Backlog — Modul Operasional

---

### O-8 — Halaman Distribusi Perlengkapan + Stok Rekonsiliasi ✅ Selesai

**Verifikasi 23 Juli 2026:** Sudah diimplementasi penuh.

**Implementasi:**
- `PATCH /api/admin/pilgrim-equipment/bulk-status` — bulk update status (pending→distributed→returned) dengan auto-adjust `total_stock` per equipment
- Stock delta dihitung per-row sebelum update, lalu aggregasi ke equipment
- Frontend: `EquipmentDistribution.tsx` dan `EquipmentReport.tsx` (laporan stok)

```
artifacts/api-server/src/routes/admin/pilgrim-equipment.ts  ← PATCH /bulk-status
artifacts/umroh-app/src/features/admin/pages/EquipmentDistribution.tsx
artifacts/umroh-app/src/features/admin/pages/EquipmentReport.tsx
```

---

### O-9 — Visa Tracking (Status Pengajuan) ✅ Selesai

**Verifikasi 23 Juli 2026:** Sudah diimplementasi penuh.

**Implementasi:**
- Tabel `visa_applications` di `lib/db/src/schema/visa.ts` — kolom `status` (draft/submitted/processing/approved/rejected/expired), `submitted_at`, `approved_at`, `expiry_date`, `rejection_reason`, `visa_number`, `updated_by`
- Route lengkap di `artifacts/api-server/src/routes/admin/visa.ts`
- Frontend: `VisaTracking.tsx`

```
lib/db/src/schema/visa.ts
artifacts/api-server/src/routes/admin/visa.ts
artifacts/umroh-app/src/features/admin/pages/VisaTracking.tsx
```

---

### O-10 — Assignment Kursi Pesawat ✅ Selesai

**Verifikasi 23 Juli 2026:** Sudah diimplementasi penuh.

**Implementasi:**
- Kolom `seat_number` dan `flight_segment` sudah ada di `booking_pilgrims`
- `GET /api/admin/seat-assignment?departureId=X` — list jemaah beserta kursi per departure
- `PATCH /api/admin/seat-assignment/:pilgrimId` — update kursi individual
- `POST /api/admin/seat-assignment/bulk` — bulk update kursi sekaligus
- Frontend: `SeatAssignment.tsx`

```
lib/db/src/schema/bookings.ts                              ← seat_number, flight_segment
artifacts/api-server/src/routes/admin/seat-assignment.ts   ← semua endpoint
artifacts/umroh-app/src/features/admin/pages/SeatAssignment.tsx
```

---

### O-11 — Pre-departure Checklist Otomatis ✅ Selesai

**Verifikasi 23 Juli 2026:** Sudah diimplementasi penuh.

**Implementasi:**
- Tabel `departure_checklists` di `lib/db/src/schema/checklists.ts` — kolom `h_minus` (60/30/14/7/3), `category`, `item`, `is_done`, `done_by`, `done_at`
- Route lengkap di `artifacts/api-server/src/routes/admin/checklist.ts` (termasuk cron generate `/cron/checklist-generate`)
- Frontend: `DepartureChecklist.tsx`

```
lib/db/src/schema/checklists.ts
artifacts/api-server/src/routes/admin/checklist.ts
artifacts/umroh-app/src/features/admin/pages/DepartureChecklist.tsx
```

---

### O-12 — Validasi Kapasitas Kamar + Konflik Gender ✅ Selesai

**Implementasi:**
- Konstanta `ROOM_CAPACITY = { single:1, double:2, triple:3, quad:4 }` di backend
- `PATCH /pilgrims/:id` — validasi kapasitas & gender sebelum update individual
- `POST /:departureId/bulk` — pre-validasi seluruh batch sebelum apply; return `409` dengan list error detail
- Import `sql` dari `@workspace/db` sudah diperbaiki (bug missing import sebelumnya)

```
artifacts/api-server/src/routes/admin/room-assignment.ts
```

---

### O-13 — Manifest Offline Cache

**Prioritas: Sedang | Estimasi: 1 hari**

**Gap saat ini:** Manifest sangat kritis saat di bandara. Jika internet putus, admin tidak bisa akses.

**Rencana:**
- Service Worker + IndexedDB untuk cache manifest per departure
- Tombol "Simpan Offline" di halaman Manifest
- Indicator: "Data tersimpan offline — terakhir sync: {waktu}"
- Sinkronisasi otomatis saat koneksi kembali

---

### O-14 — Kode Booking Anti-Collision ✅ Selesai

**Implementasi:**
- Ganti `Math.random()` dengan `crypto.randomUUID()` (cryptographically secure, collision-free)
- Format: `BNG-{YYMM}-{8 hex uppercase}` — contoh: `BNG-2607-A3F2C19E`
- Tidak perlu retry karena UUID sudah collision-free secara kriptografis

```
artifacts/api-server/src/routes/admin/bookings.ts  ← POST / handler baris ~330
```

---

## 📌 Sisa Backlog (Yang Benar-Benar Belum Ada)

> Diverifikasi 23 Juli 2026. Semua item lain sudah selesai di codebase.

| # | Task | Estimasi | Prioritas |
|---|------|----------|-----------|
| 1 | F-11: Pajak (PPN/PPh) & Faktur Pajak | 3 hari | Sedang |
| 2 | F-12: Budget & Proyeksi Cash Flow | 2 hari | Rendah |
| 3 | F-14: Multi-Currency Terintegrasi | 2 hari | Rendah |
| 4 | F-15: Export ke Software Akuntansi | 1–2 hari | Rendah |
| 5 | O-13: Manifest Offline Cache (Service Worker) | 1 hari | Sedang |

### Estimasi Sisa

```
Sisa backlog                     : ~9–10 hari kerja
(dari total awal ~28.5 hari kerja)
```

---

## 🗂 Struktur File Referensi Lengkap

```
lib/
├── db/src/schema/
│   ├── bookings.ts          ✅ bookings, booking_pilgrims (+ seat_number, flight_segment)
│   ├── payments.ts          ✅ payments, installment_schedules, payment_gateway_transactions
│   ├── packages.ts          ✅ packages, package_departures, package_costs (+ actual_amount)
│   ├── itineraries.ts       ✅ itineraries, itinerary_days
│   ├── masterdata.ts        ✅ hotels, airlines, airports, muthawifs, equipment, currencies
│   ├── pilgrim-equipment.ts ✅ pilgrim_equipment
│   ├── pilgrims.ts          ✅ master_pilgrims, pilgrim_documents
│   ├── agents.ts            ✅ agents, commissions, withdrawals, affiliate_clicks
│   ├── savings.ts           ✅ savings_accounts, savings_transactions
│   ├── crm.ts               ✅ leads, interactions, follow_ups
│   ├── cms.ts               ✅ blog_posts, pages, gallery, testimonials, faqs
│   ├── tenant.ts            ✅ tenant_sites, site_settings, navigation_items
│   ├── accounting.ts        ✅ chart_of_accounts (F-7), bank_mutations (F-10)
│   ├── checklists.ts        ✅ departure_checklists (O-11)
│   └── visa.ts              ✅ visa_applications (O-9)
│
artifacts/
├── api-server/src/routes/admin/
│   ├── finance.ts           ✅ dashboard, piutang, departures P&L, income-statement, balance-sheet, cash-flow
│   ├── accounting.ts        ✅ manual journal CRUD
│   ├── coa.ts               ✅ CoA CRUD + seed + ledger + trial-balance (F-7)
│   ├── bank-reconciliation.ts ✅ import CSV, auto-match, manual match (F-10)
│   ├── payments.ts          ✅ verify + hook ke autoJournal
│   ├── costs.ts             ✅ package_costs + actual_amount + summary/variance (F-9)
│   ├── installments.ts      ✅ monitoring + mark paid
│   ├── bookings.ts          ✅ lifecycle, invoice-data, booking code anti-collision
│   ├── pilgrim-equipment.ts ✅ assign + bulk-status + auto stock update (O-8)
│   ├── room-assignment.ts   ✅ bulk edit + validasi kapasitas + konflik gender
│   ├── seat-assignment.ts   ✅ get/patch/bulk kursi pesawat (O-10)
│   ├── checklist.ts         ✅ pre-departure checklist CRUD + generate (O-11)
│   └── visa.ts              ✅ visa tracking CRUD + bulk update (O-9)
│
└── umroh-app/src/features/admin/pages/
    ├── FinanceDashboard.tsx     ✅
    ├── Piutang.tsx              ✅ (termasuk bulk remind WA)
    ├── Accounting.tsx           ✅ manual journal
    ├── ChartOfAccounts.tsx      ✅ (F-7)
    ├── GeneralLedger.tsx        ✅ (F-7)
    ├── TrialBalance.tsx         ✅ (F-7)
    ├── BankReconciliation.tsx   ✅ (F-10)
    ├── FinancialReports.tsx     ✅ neraca, L/R, arus kas (F-8)
    ├── PackageCosts.tsx         ✅ (termasuk kolom Aktual + Variance, F-9)
    ├── Installments.tsx         ✅
    ├── Pilgrims.tsx             ✅
    ├── RoomAssignment.tsx       ✅ (validasi kapasitas + gender)
    ├── SeatAssignment.tsx       ✅ (O-10)
    ├── EquipmentDistribution.tsx ✅ (O-8)
    ├── EquipmentReport.tsx      ✅ (O-8 laporan stok)
    ├── VisaTracking.tsx         ✅ (O-9)
    ├── DepartureChecklist.tsx   ✅ (O-11)
    └── Manifest.tsx             ✅ → 🔲 O-13 offline cache (Service Worker belum ada)
```
