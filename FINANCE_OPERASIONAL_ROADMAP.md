# Roadmap Modul Keuangan & Operasional — UmrohPlus

> Dokumen ini mencatat semua rencana, progres, dan backlog fitur keuangan dan operasional.
> Gabungan dari analisa codebase 21 Juli 2026.
>
> **Terakhir diperbarui:** 21 Juli 2026

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
| F-7  | Chart of Accounts + Buku Besar | 🔲 Belum |
| F-8  | Laporan Akuntansi Standar (Neraca, L/R, Arus Kas) | 🔲 Belum |
| F-9  | HPP Otomatis dari Biaya Aktual | 🔲 Belum |
| F-10 | Rekonsiliasi Bank (Import Mutasi) | 🔲 Belum |
| F-11 | Pajak (PPN/PPh) & Faktur Pajak | 🔲 Belum |
| F-12 | Budget & Proyeksi Cash Flow | 🔲 Belum |
| F-13 | Nomor Invoice Otomatis per Tenant | ✅ Selesai |
| F-14 | Multi-Currency Terintegrasi | 🔲 Belum |
| F-15 | Export ke Software Akuntansi | 🔲 Belum |

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
| O-8  | Halaman Distribusi Perlengkapan + Stok Rekonsiliasi | 🔲 Belum |
| O-9  | Visa Tracking (Status Pengajuan) | 🔲 Belum |
| O-10 | Assignment Kursi Pesawat | 🔲 Belum |
| O-11 | Pre-departure Checklist Otomatis | 🔲 Belum |
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

### F-7 — Chart of Accounts (CoA) + Buku Besar

**Prioritas: Tinggi | Estimasi: 2–3 hari**

**Gap saat ini:**
- Tidak ada kode akun (Chart of Accounts)
- Kategori transaksi disimpan di `localStorage` frontend (tidak persisten di DB)
- Tidak ada buku besar per akun
- Tidak ada trial balance

**Rencana schema baru:**
```sql
-- Tabel chart_of_accounts
CREATE TABLE chart_of_accounts (
  id         TEXT PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,       -- misal: 1-1101 (Kas), 4-1001 (Pendapatan Umroh)
  name       TEXT NOT NULL,
  type       TEXT NOT NULL,              -- asset | liability | equity | revenue | expense
  category   TEXT,                       -- sub-grouping
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
);

-- Ubah financial_transactions: tambah account_id FK ke chart_of_accounts
ALTER TABLE financial_transactions ADD COLUMN account_id TEXT REFERENCES chart_of_accounts(id);
```

**Rencana frontend:**
- Halaman `ChartOfAccounts.tsx`: CRUD kode akun, seed data akun standar
- Halaman `GeneralLedger.tsx`: transaksi per akun, filter periode
- Halaman `TrialBalance.tsx`: saldo debit/kredit per akun per periode

**File yang perlu dibuat:**
```
lib/db/src/schema/accounting.ts                         ← schema CoA
artifacts/api-server/src/routes/admin/accounting.ts     ← tambah CoA endpoints
artifacts/umroh-app/src/features/admin/pages/ChartOfAccounts.tsx
artifacts/umroh-app/src/features/admin/pages/GeneralLedger.tsx
artifacts/umroh-app/src/features/admin/pages/TrialBalance.tsx
```

---

### F-8 — Laporan Akuntansi Standar (Neraca, L/R, Arus Kas)

**Prioritas: Tinggi | Estimasi: 2–3 hari**

**Gap saat ini:**
- Hanya ada P&L chart sederhana di `Accounting.tsx` (belum standar PSAK/SAK ETAP)
- Tidak ada Neraca (Balance Sheet)
- Tidak ada Laporan Arus Kas (Cash Flow Statement)

**Rencana (bergantung F-7 selesai dahulu):**

`GET /api/admin/finance/reports/balance-sheet?date=YYYY-MM-DD`
```json
{
  "assets": { "current": [...], "fixed": [...], "total": 0 },
  "liabilities": { "current": [...], "long_term": [...], "total": 0 },
  "equity": { "total": 0 }
}
```

`GET /api/admin/finance/reports/income-statement?from=...&to=...`
```json
{
  "revenue": [...],
  "hpp": [...],
  "gross_profit": 0,
  "operating_expenses": [...],
  "net_income": 0
}
```

`GET /api/admin/finance/reports/cash-flow?from=...&to=...`

**File yang perlu dibuat:**
```
artifacts/api-server/src/routes/admin/reports.ts         ← endpoint laporan
artifacts/umroh-app/src/features/admin/pages/Reports.tsx ← sudah ada, perlu diperluas
```

---

### F-9 — HPP Otomatis dari Biaya Aktual

**Prioritas: Sedang | Estimasi: 1–2 hari**

**Gap saat ini:**
- `package_costs` dientry manual, tidak terhubung ke biaya aktual booking (harga hotel/tiket)
- Tidak ada kolom `actual_amount` (semua dianggap budgeted)
- Tidak ada variance HPP budget vs aktual, tidak ada HPP per jamaah

**Rencana:**

```sql
-- Tambah kolom ke package_costs
ALTER TABLE package_costs ADD COLUMN actual_amount INTEGER;
ALTER TABLE package_costs ADD COLUMN invoice_reference TEXT;
ALTER TABLE package_costs ADD COLUMN paid_at TIMESTAMPTZ;
```

Backend tambahan:
- `GET /api/admin/costs/summary?packageId=X` — budgeted vs actual vs variance
- `PATCH /api/admin/costs/:id` — terima `actualAmount`, `invoiceReference`, `paidAt`

Frontend `PackageCosts.tsx` + halaman baru variance report:
- Kolom: Budgeted | Aktual | Variance | Status
- Filter: Over Budget / Belum Diisi Aktual
- HPP per pax otomatis: sum(actual_amount) / filledSeats

---

### F-10 — Rekonsiliasi Bank (Import Mutasi)

**Prioritas: Sedang | Estimasi: 2–3 hari**

**Gap saat ini:**
- Tab reconciliation di `Accounting.tsx` sudah ada tapi tidak terhubung ke data apapun
- Tidak ada import mutasi bank (CSV/API)
- Tidak ada matching otomatis transaksi gateway ↔ booking_payments

**Rencana:**
```sql
CREATE TABLE bank_mutations (
  id          TEXT PRIMARY KEY,
  date        DATE NOT NULL,
  description TEXT,
  amount      INTEGER NOT NULL,           -- positif = kredit, negatif = debit
  balance     INTEGER,
  ref_number  TEXT,
  matched_to  TEXT,                       -- FK ke booking_payments.id (nullable)
  is_matched  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ
);
```

- Import CSV mutasi (format BCA, Mandiri, BNI)
- Auto-matching: cocokkan amount + tanggal ± 1 hari dengan `booking_payments`
- UI: tabel dua kolom (mutasi bank | pembayaran di sistem), tombol "Match" manual

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

### F-14 — Multi-Currency Terintegrasi

**Prioritas: Rendah | Estimasi: 2 hari**

- Tabel `currencies` sudah ada, belum dipakai di transaksi
- Tambah `currency_code` + `exchange_rate` ke `bookings` dan `package_costs`
- Kurs otomatis via Bank Indonesia API (daily update)
- Laporan dalam IDR + tampilan harga asli mata uang asing

---

### F-15 — Export ke Software Akuntansi

**Prioritas: Rendah | Estimasi: 1–2 hari**

- Export jurnal ke format CSV Jurnal.id / Accurate / Zahir
- Export ke format XML/CSV e-SPT PPh
- API publik laporan keuangan (untuk integrasi eksternal)

---

## 🔲 Backlog — Modul Operasional

---

### O-8 — Halaman Distribusi Perlengkapan + Stok Rekonsiliasi

**Prioritas: Tinggi | Estimasi: 1.5 hari**

**Gap saat ini:**
- Equipment assignment hanya bisa via detail view jamaah (1 per 1)
- `equipment.total_stock` tidak auto-decrement saat status = `distributed`
- Tidak ada laporan stok (tersedia / didistribusikan / dikembalikan)

**Rencana:**

Halaman baru `/admin/equipment-distribution`:
- Pilih keberangkatan → tampilkan semua jamaah
- Bulk assign item perlengkapan (ceklis per jamaah, item per item)
- Status per item: pending → distributed → returned
- Auto-decrement `total_stock` saat mark distributed
- Laporan: stok tersedia vs terdistribusi vs dikembalikan per item

**File yang perlu dibuat/diubah:**
```
artifacts/api-server/src/routes/admin/pilgrim-equipment.ts  ← tambah bulk assign + stok update
artifacts/umroh-app/src/features/admin/pages/EquipmentDistribution.tsx  ← halaman baru
lib/db/src/schema/masterdata.ts                              ← trigger/logic stok
```

---

### O-9 — Visa Tracking (Status Pengajuan)

**Prioritas: Tinggi | Estimasi: 1.5 hari**

**Gap saat ini:** Visa hanya berupa upload dokumen. Tidak ada tracking status pengajuan visa ke kedutaan/imigrasi.

**Rencana schema:**
```sql
CREATE TABLE visa_applications (
  id              TEXT PRIMARY KEY,
  booking_id      TEXT NOT NULL REFERENCES bookings(id),
  pilgrim_id      TEXT NOT NULL REFERENCES booking_pilgrims(id),
  status          TEXT NOT NULL DEFAULT 'draft',
  -- draft | submitted | processing | approved | rejected | expired
  submitted_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  expiry_date     DATE,
  rejection_reason TEXT,
  visa_number     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ
);
```

**Rencana frontend:**

Halaman `/admin/visa-tracking`:
- Tabel jamaah + status visa (badge berwarna per status)
- Bulk update status (misal: select semua "submitted" → mark "processing")
- Filter per keberangkatan + status
- Alert: visa expired / expiring 90 hari sebelum keberangkatan
- Statistik: berapa % sudah approved per departure

---

### O-10 — Assignment Kursi Pesawat

**Prioritas: Sedang | Estimasi: 1 hari**

**Gap saat ini:** Tidak ada assignment kursi pesawat per jamaah.

**Rencana schema:**
```sql
-- Tambah ke booking_pilgrims
ALTER TABLE booking_pilgrims ADD COLUMN seat_number TEXT;   -- misal: 14A
ALTER TABLE booking_pilgrims ADD COLUMN flight_segment TEXT; -- MH-1234 (GO) / SV-7654 (RETURN)
```

**Rencana frontend:**

Tambah kolom kursi di `RoomAssignment.tsx` atau halaman terpisah `/admin/seat-assignment`:
- Grid peta kursi pesawat (visual) per flight
- Drag-drop atau input manual nomor kursi
- Validasi: kursi tidak double-assign, gender consideration (bila ada kebijakan)
- Export daftar kursi ke manifest airline

---

### O-11 — Pre-departure Checklist Otomatis

**Prioritas: Sedang | Estimasi: 1.5 hari**

**Gap saat ini:** Tidak ada sistem checklist otomatis H-N sebelum keberangkatan.

**Rencana:**

Cron job harian yang memeriksa semua departure dalam 60 hari ke depan dan membuat task checklist:

| H- | Item Checklist |
|----|---------------|
| H-60 | Cek kelengkapan dokumen jamaah (passport, visa) |
| H-30 | Konfirmasi hotel & tiket, cek sisa piutang |
| H-14 | Distribusi perlengkapan, manifest final |
| H-7  | Briefing/manasik reminder, cek cicilan overdue |
| H-3  | Konfirmasi transportasi, cek check-in |

**Schema baru:**
```sql
CREATE TABLE departure_checklists (
  id            TEXT PRIMARY KEY,
  departure_id  TEXT NOT NULL REFERENCES package_departures(id),
  h_minus       INTEGER NOT NULL,    -- 60, 30, 14, 7, 3
  item          TEXT NOT NULL,
  is_done       BOOLEAN DEFAULT false,
  done_by       TEXT,
  done_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ
);
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

## 📌 Prioritas Eksekusi

### Prioritas 1 — Quick Win (dampak langsung, mudah dikerjakan)

| # | Task | Estimasi | Alasan |
|---|------|----------|--------|
| 1 | F-5: Reminder Piutang via WA (bulk) | 0.5 hari | UI sudah ada, tinggal 1 endpoint backend |
| 2 | O-14: Kode Booking Anti-Collision | 0.5 hari | Bug potensial, mudah fix |
| 3 | O-12: Validasi Kapasitas Kamar | 0.5 hari | Cegah kesalahan operasional di lapangan |
| 4 | F-13: Nomor Invoice Otomatis | 0.5 hari | Kebutuhan dasar profesionalisme dokumen |

### Prioritas 2 — Fondasi Keuangan (nilai bisnis tinggi, perlu kerja lebih)

| # | Task | Estimasi | Alasan |
|---|------|----------|--------|
| 5 | F-6: Jurnal Otomatis (Auto-Posting) | 2 hari | Fondasi akuntansi; tanpa ini laporan tidak akurat |
| 6 | F-7: Chart of Accounts + Buku Besar | 2–3 hari | Prasyarat untuk F-8 |
| 7 | F-8: Neraca + L/R + Arus Kas | 2–3 hari | Laporan yang bisa dipakai akuntan/auditor |
| 8 | F-9: HPP Aktual + Variance | 1–2 hari | Kontrol margin nyata per keberangkatan |

### Prioritas 3 — Operasional Lapangan

| # | Task | Estimasi | Alasan |
|---|------|----------|--------|
| 9  | O-8: Distribusi Perlengkapan + Stok | 1.5 hari | Manajemen logistik yang benar |
| 10 | O-9: Visa Tracking | 1.5 hari | Kritis H-60 sebelum keberangkatan |
| 11 | O-11: Pre-departure Checklist | 1.5 hari | Standardisasi persiapan per departure |
| 12 | O-10: Seat Assignment | 1 hari | Koordinasi dengan airline |

### Prioritas 4 — Penguatan & Compliance

| # | Task | Estimasi | Alasan |
|---|------|----------|--------|
| 13 | F-10: Rekonsiliasi Bank | 2–3 hari | Audit trail pembayaran |
| 14 | F-11: PPN/PPh + Faktur Pajak | 3 hari | Kepatuhan pajak |
| 15 | O-13: Manifest Offline Cache | 1 hari | Keandalan di bandara |
| 16 | F-12: Budget & Proyeksi | 2 hari | Perencanaan keuangan |
| 17 | F-14: Multi-Currency | 2 hari | Untuk paket harga USD/SAR |
| 18 | F-15: Export Software Akuntansi | 1–2 hari | Integrasi Jurnal.id/Accurate |

### Estimasi Total

```
Prioritas 1 (Quick Win)          : ~2 hari kerja
Prioritas 2 (Fondasi Keuangan)   : ~9 hari kerja
Prioritas 3 (Operasional Lapangan): ~5.5 hari kerja
Prioritas 4 (Penguatan/Compliance): ~12 hari kerja
─────────────────────────────────────────────────
Total estimasi                   : ~28.5 hari kerja
```

---

## 🗂 Struktur File Referensi Lengkap

```
lib/
├── db/src/schema/
│   ├── bookings.ts          ✅ bookings, booking_pilgrims, check_ins, contracts
│   ├── payments.ts          ✅ payments, installment_schedules, payment_gateway_transactions
│   ├── packages.ts          ✅ packages, package_departures, package_costs, package_prices
│   ├── itineraries.ts       ✅ itineraries, itinerary_days
│   ├── masterdata.ts        ✅ hotels, airlines, airports, muthawifs, equipment, categories
│   ├── pilgrim-equipment.ts ✅ pilgrim_equipment
│   ├── pilgrims.ts          ✅ master_pilgrims, pilgrim_documents
│   ├── agents.ts            ✅ agents, commissions, withdrawals, affiliate_clicks
│   ├── savings.ts           ✅ savings_accounts, savings_transactions
│   ├── crm.ts               ✅ leads, interactions, follow_ups
│   ├── cms.ts               ✅ blog_posts, pages, gallery, testimonials, faqs
│   ├── tenant.ts            ✅ tenant_sites, site_settings, navigation_items
│   ├── accounting.ts        🔲 [F-7: chart_of_accounts — belum ada]
│   └── visa.ts              🔲 [O-9: visa_applications — belum ada]
│
artifacts/
├── api-server/src/routes/admin/
│   ├── finance.ts           ✅ dashboard, piutang, departures P&L
│   ├── accounting.ts        ✅ manual journal CRUD → 🔲 perlu CoA + auto-posting
│   ├── payments.ts          ✅ verify → 🔲 hook ke autoJournal
│   ├── costs.ts             ✅ package_costs → 🔲 tambah actual_amount
│   ├── installments.ts      ✅ monitoring + mark paid
│   ├── bookings.ts          ✅ lifecycle → 🔲 kode anti-collision
│   ├── pilgrim-equipment.ts ✅ assign → 🔲 bulk + stok auto-update
│   ├── room-assignment.ts   ✅ bulk edit → 🔲 validasi kapasitas
│   └── [visa.ts]            🔲 [O-9: belum ada]
│
└── umroh-app/src/features/admin/pages/
    ├── FinanceDashboard.tsx  ✅
    ├── Piutang.tsx           ✅ → 🔲 F-5 endpoint remind
    ├── Accounting.tsx        ✅ → 🔲 F-7 CoA, F-6 auto-posting
    ├── PackageCosts.tsx      ✅ → 🔲 F-9 actual + variance
    ├── Installments.tsx      ✅
    ├── Reports.tsx           ✅ → 🔲 F-8 neraca, L/R, arus kas
    ├── Pilgrims.tsx          ✅
    ├── RoomAssignment.tsx    ✅ → 🔲 O-12 validasi kapasitas
    ├── Manifest.tsx          ✅ → 🔲 O-13 offline cache
    ├── CheckIn.tsx           ✅
    ├── [ChartOfAccounts.tsx] 🔲 [F-7: belum ada]
    ├── [GeneralLedger.tsx]   🔲 [F-7: belum ada]
    ├── [TrialBalance.tsx]    🔲 [F-7: belum ada]
    ├── [EquipmentDistribution.tsx] 🔲 [O-8: belum ada]
    └── [VisaTracking.tsx]    🔲 [O-9: belum ada]
```
