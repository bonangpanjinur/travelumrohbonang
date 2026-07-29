# Analisis Bug & Rencana Perbaikan — Modul Keuangan UmrohPlus

> Dibuat: 2026-07-29  
> Berdasarkan: inspeksi kode + log error produksi

---

## RINGKASAN EKSEKUTIF

Modul keuangan UmrohPlus memiliki **8 bug aktif** yang mengakibatkan:
- Halaman Piutang error di produksi
- Laporan Komisi selalu error (`column pic_type does not exist`)
- Laporan Agen di Analytics selalu kosong (0 data)
- Neraca Saldo, Laporan Laba/Rugi, Neraca, dan Arus Kas selalu menampilkan angka 0 atau tidak sinkron
- Tidak ada double-entry accounting → laporan tidak bisa balance

Bug dibagi 3 tingkat keparahan: 🔴 **KRITIS** (crash/data salah), 🟡 **SEDANG** (fitur tidak berfungsi), 🟢 **MINOR** (data tidak akurat).

---

## BAGIAN 1 — INVENTARIS FITUR KEUANGAN

### Fitur yang Sudah Ada di Backend & Frontend

| Fitur | Backend Endpoint | Frontend Page | Status |
|-------|-----------------|---------------|--------|
| Dashboard Keuangan | `GET /api/admin/finance/dashboard` | `FinanceDashboard.tsx` | ⚠️ Sebagian berfungsi |
| Piutang (AR) List | `GET /api/admin/finance/piutang` | `FinanceDashboard.tsx` | 🔴 Error di produksi |
| WA Reminder Piutang | `POST /api/admin/finance/piutang/remind` | `FinanceDashboard.tsx` | ✅ Berfungsi (jika token WA ada) |
| Keuangan per Keberangkatan | `GET /api/admin/finance/departures` | `DepartureFinance.tsx` | ✅ Berfungsi |
| Detail per Keberangkatan | `GET /api/admin/finance/departure/:id` | `DepartureFinance.tsx` | ✅ Berfungsi |
| Laporan Laba/Rugi | `GET /api/admin/finance/reports/income-statement` | `FinancialReports.tsx` | 🟡 Selalu 0 (lihat Bug #4) |
| Neraca (Balance Sheet) | `GET /api/admin/finance/reports/balance-sheet` | `FinancialReports.tsx` | 🟡 Selalu 0 (lihat Bug #4) |
| Arus Kas (Cash Flow) | `GET /api/admin/finance/reports/cash-flow` | `FinancialReports.tsx` | 🟡 Data tidak sinkron (Bug #5) |
| Chart of Accounts | `GET/POST/PATCH/DELETE /api/admin/coa` | `ChartOfAccounts.tsx` | ✅ Berfungsi |
| Seed Akun Standar | `POST /api/admin/coa/seed` | `ChartOfAccounts.tsx` | ✅ Berfungsi |
| Buku Besar | `GET /api/admin/coa/ledger` | `GeneralLedger.tsx` | 🟡 Kosong jika belum ada entri manual |
| Neraca Saldo (Trial Balance) | `GET /api/admin/coa/trial-balance` | `TrialBalance.tsx` | 🟡 Selalu 0 (Bug #4) |
| Jurnal Transaksi Manual | `GET/POST/PATCH/DELETE /api/admin/accounting` | `Accounting.tsx` | ✅ Berfungsi |
| Export Jurnal | `GET /api/admin/accounting-export` | `AccountingExport.tsx` | ✅ Berfungsi |
| Verifikasi Pembayaran Manual | `PATCH /api/admin/payments/verify/:id` | `Payments.tsx` | ✅ Berfungsi |
| Tolak Pembayaran | `PATCH /api/admin/payments/reject/:id` | `Payments.tsx` | ✅ Berfungsi |
| Bulk Verify Pembayaran | `POST /api/admin/payments/bulk-verify` | `Payments.tsx` | ✅ Berfungsi |
| Payment Gateway (Midtrans/Xendit) | `GET /api/admin/payment-gateway` | `PaymentGateway.tsx` | 🟡 Unconfigured (tidak ada API key) |
| Laporan Komisi Agen | ❌ Tidak ada endpoint | `CommissionReport.tsx` | 🔴 Error (Bug #1) |
| Analytics Agent Stats | `GET /api/admin/analytics/agent-stats` | `Reports.tsx` | 🔴 Selalu kosong (Bug #3) |
| Rekonsiliasi Bank | `GET /api/admin/bank-reconciliation` | — | 🟡 Backend ada, frontend belum |
| Jurnal Otomatis (Auto-journal) | `lib/autoJournal.ts` | — | 🟡 Single-entry saja (Bug #4) |

---

## BAGIAN 2 — DAFTAR BUG DETAIL

---

### 🔴 BUG #1 — KRITIS: `CommissionReport.tsx` query kolom `pic_type` yang tidak ada di DB

**Error yang muncul:**
```
column package_commissions.pic_type does not exist
```

**Lokasi:** `artifacts/umroh-app/src/features/admin/components/CommissionReport.tsx:93`

**Kode bermasalah:**
```typescript
// SALAH — kolom pic_type tidak ada di tabel package_commissions
supabase
  .from("package_commissions")
  .select("package_id, pic_type, commission_amount")
  .in("package_id", packageIds as string[])
```

**Root Cause:**
Tabel `package_commissions` di DB saat ini memiliki kolom: `id`, `package_id`, `label`, `commission_amount`, `created_at`.  
Kolom `pic_type` **tidak pernah ada** — yang digunakan sebagai pengganti adalah kolom `label` (lihat `packages.ts` route baris 363).

File `types.ts` (Supabase type definitions) masih menyebut `pic_type` karena belum diperbarui setelah skema berubah:
```
# lib/db/src/schema/packages.ts — skema aktual
packageCommissions = {
  id, packageId, label,   ← LABEL bukan pic_type
  commissionAmount, createdAt
}
```

Selain itu, komponen ini menggunakan **Supabase client langsung** (bukan API server), sehingga:
- Tidak ada scope guard (semua admin bisa lihat semua komisi tanpa pembatasan cabang)
- Tidak melewati middleware auth server

**Perbaikan:**
1. Tambah endpoint `/api/admin/finance/commission-report?from=&to=`
2. Ubah `CommissionReport.tsx` untuk fetch dari API server, bukan Supabase langsung
3. Mapping di query backend: `package_commissions.label AS pic_type`

---

### 🔴 BUG #2 — KRITIS: Piutang endpoint error di produksi — `b.pic_name` / `dep.departure_date::timestamp`

**Error yang muncul (dari log produksi):**
```
[GET /admin/finance/piutang] _DrizzleQueryError: Failed query
```

**Lokasi:** `artifacts/api-server/src/routes/admin/finance.ts:211-247`

**Dua masalah:**

**2a. Kolom `b.pic_name` mungkin belum ada di DB produksi**
```sql
-- Kode:
COALESCE(b.pemesan_name, b.pic_name, p.name) AS pemesan_name
```
Kolom `pic_name` ada di schema Drizzle (`bookings.ts` baris 29), tapi jika DB produksi belum di-push dengan `drizzle-kit push`, kolom ini tidak ada di DB produksi → error.

**2b. Cast `::timestamp` pada kolom `departure_date` bertipe TEXT**
```sql
-- Bermasalah: departure_date adalah TEXT bukan TIMESTAMP
EXTRACT(DAY FROM (dep.departure_date::timestamp - NOW()))::int
ORDER BY dep.departure_date::timestamp ASC NULLS LAST
```
Skema: `departureDate: text("departure_date")` di `packages.ts` baris 35.  
Jika nilai departure_date bukan format ISO yang valid, PostgreSQL akan lempar error saat cast.

**Perbaikan:**
1. Jalankan `drizzle-kit push` ke DB produksi untuk kolom yang kurang
2. Perbaiki query: ganti `dep.departure_date::timestamp` → `dep.departure_date::date` atau simpan sebagai `TO_DATE(dep.departure_date, 'YYYY-MM-DD')` dengan fallback `TRY_CAST` (PostgreSQL: gunakan `TO_TIMESTAMP` dengan COALESCE)

---

### 🔴 BUG #3 — KRITIS: Analytics Agent Stats selalu kosong — nilai enum salah

**Error:** Tidak ada error, tapi data selalu 0 / empty array.

**Lokasi:** `artifacts/api-server/src/routes/admin/analytics.ts:232`

**Kode bermasalah:**
```sql
-- SALAH: menggunakan 'agent' (bahasa Inggris)
JOIN agents a ON a.id = b.pic_id AND b.pic_type = 'agent'
```

**Semua kode lain** menggunakan `'agen'` (bahasa Indonesia):
- `scopeConditions.ts:28` → `pic_type = 'agen'`
- `scopeConditions.ts:54` → `pic_type = 'agen'`
- `scopeConditions.ts:85` → `picType === "agen"`
- Zod validation → `z.enum(["pusat", "cabang", "agen"])`

Karena nilai di DB adalah `'agen'`, JOIN dengan `pic_type = 'agent'` tidak pernah match → 0 baris → statistik agen selalu kosong.

**Perbaikan:**
```sql
-- BENAR:
JOIN agents a ON a.id = b.pic_id AND b.pic_type = 'agen'
```

---

### 🟡 BUG #4 — SEDANG: Auto-journal tidak menyimpan `account_id` dan `entry_type` → Trial Balance, Neraca, Laba/Rugi selalu nol

**Gejala:** Neraca Saldo, Laporan Laba/Rugi, Neraca semua menampilkan 0.

**Lokasi:** `artifacts/api-server/src/lib/autoJournal.ts` + `artifacts/api-server/src/lib/paymentSync.ts`

**Root Cause:**

Setiap kali pembayaran diverifikasi, `journalPaymentVerified()` dipanggil yang memanggil `recordFinancialTransaction()` — tapi **tidak pernah menyimpan** `accountId` atau `entryType`:

```typescript
// autoJournal.ts — tidak ada accountId, tidak ada entryType
await recordFinancialTransaction({
  bookingId: opts.bookingId,
  amount: opts.amount,
  type: "income",          // ← hanya type umum
  category: "booking_payment",
  // accountId: ???        ← tidak di-set → NULL di DB
  // entryType: ???        ← tidak di-set → NULL di DB
  ...
});
```

**Dampak pada setiap laporan:**

| Laporan | Query | Dampak Bug #4 |
|---------|-------|----------------|
| **Neraca Saldo** | Aggregate debit/credit per account | Semua entry punya `accountId = NULL` → tidak match ke akun CoA manapun → balance = 0 |
| **Laporan Laba/Rugi** | JOIN ke `chart_of_accounts` via `accountId` | LEFT JOIN tidak menghasilkan match → `account_code = ''`, grouping hanya per category |
| **Neraca (Balance Sheet)** | `WHERE ft.account_id = coa.id` | NULL tidak match → semua asset/liability/equity = 0 |
| **Buku Besar** | Filter per `accountId` | Hanya entri manual (yang set `accountId`) yang muncul |

**Perbaikan (pendekatan double-entry yang benar):**
Setiap event pembayaran harus mencatat **dua entri** (debit + kredit):

```
Penerimaan DP / Cicilan / Pelunasan:
  DEBIT  → akun Kas/Bank (1-1101 atau 1-1102)    amount = X
  CREDIT → akun Pendapatan Umroh (4-1001)         amount = X

Refund dicairkan:
  DEBIT  → akun Beban Refund (5-2xxx)             amount = X
  CREDIT → akun Kas/Bank (1-1101)                 amount = X

Komisi agen dibayar:
  DEBIT  → akun Komisi Agen (5-2004)              amount = X
  CREDIT → akun Kas/Bank (1-1101)                 amount = X
```

---

### 🟡 BUG #5 — SEDANG: Laporan Arus Kas mencampur dua sumber data yang tidak sinkron

**Lokasi:** `artifacts/api-server/src/routes/admin/finance.ts:848-871`

**Masalah:**
```typescript
// Inflow: dari booking_payments (kas nyata diterima)
SELECT SUM(bp.amount) FROM booking_payments ...

// Outflow: dari financial_transactions WHERE type = 'expense'
SELECT SUM(ft.amount) FROM financial_transactions WHERE type = 'expense' ...
```

`booking_payments` dan `financial_transactions` adalah **dua sistem terpisah**:
- `booking_payments` = ledger kas aktual dari pemrosesan booking
- `financial_transactions` = jurnal akuntansi manual + auto-journal

Jika admin belum input pengeluaran ke `financial_transactions`, outflow = 0.  
Jika ada pembayaran yang diverifikasi tapi auto-journal belum berjalan, angka tidak konsisten.

**Dampak:** Net cash flow tidak akurat — biasanya menunjukkan angka inflow besar dengan outflow nol.

**Perbaikan:** Laporan arus kas harus:
- Inflow: `booking_payments` yang tidak di-void (kas masuk nyata)
- Outflow: `financial_transactions` type=`expense` dengan `entryType='debit'` (setelah Bug #4 diperbaiki)
- Atau: semua dari `financial_transactions` (setelah semua payment otomatis di-journal dengan benar)

---

### 🟡 BUG #6 — SEDANG: Analytics KPI Revenue menggunakan `payments` bukan `booking_payments` — data tidak konsisten

**Lokasi:** `artifacts/api-server/src/routes/admin/analytics.ts:79`

```sql
-- analytics/summary: menggunakan tabel payments (bukti transfer manual)
SELECT coalesce(sum(amount), 0) FROM payments WHERE status = 'verified'

-- finance/dashboard: menggunakan booking_payments (ledger aktual)
SELECT coalesce(sum(bp.amount), 0) FROM booking_payments WHERE is_voided = false
```

Dua tabel berbeda untuk hal yang sama:
- `payments` = form upload bukti transfer → status `pending/verified/rejected`
- `booking_payments` = ledger yang di-insert setelah payment diverifikasi

Revenue di Analytics dan Finance Dashboard akan **selalu berbeda** karena menggunakan sumber yang berbeda.

**Perbaikan:** Standarkan semua revenue queries menggunakan `booking_payments WHERE is_voided = false` sebagai single source of truth.

---

### 🟡 BUG #7 — SEDANG: `CommissionReport.tsx` tidak menggunakan API server — tidak ada scope enforcement

**Lokasi:** `artifacts/umroh-app/src/features/admin/components/CommissionReport.tsx:63-98`

Seluruh komponen `CommissionReport` mengquery Supabase langsung:
```typescript
// Bypass API server sepenuhnya
const { data: bookings } = await supabase.from("bookings").select(...)
const commissionsRes = await supabase.from("package_commissions").select(...)
```

**Dampak:**
- Admin cabang bisa lihat komisi dari cabang lain (tidak ada scope filtering)
- Perubahan skema DB tidak tercermin (types.ts stale)
- Row Level Security (RLS) Supabase yang sudah disabled di setup lokal = tidak ada proteksi

---

### 🟢 BUG #8 — MINOR: `departure_date` cast ke timestamp tanpa validasi — crash pada data kotor

**Lokasi:** Multiple queries di `finance.ts` dan `analytics.ts`

```sql
-- Berbahaya jika departure_date bukan format timestamp-compatible
dep.departure_date::timestamp
ORDER BY dep.departure_date::timestamp ASC
```

`packageDepartures.departureDate` adalah `text("departure_date")` di skema Drizzle. Nilai seperti `"2026-08-15"` akan berhasil di-cast, tapi nilai `"15 Agustus 2026"` atau kosong akan crash.

**Perbaikan:** Gunakan:
```sql
-- Aman dengan fallback
NULLIF(dep.departure_date, '')::date
-- atau
TO_DATE(dep.departure_date, 'YYYY-MM-DD')
```

---

## BAGIAN 3 — ALUR DATA SAAT INI vs YANG SEHARUSNYA

### Alur Pembayaran Saat Ini (Aktual)

```
Jemaah upload bukti bayar
        ↓
payments (status=pending)
        ↓
Admin PATCH /payments/verify/:id
        ↓
payments.status = 'verified'
  + booking_payments (INSERT)        ← kas ledger diperbarui ✅
  + syncBookingStatus()              ← status booking diperbarui ✅
  + journalPaymentVerified()         ← financial_transactions (INSERT)
      accountId = NULL  ← BUG #4
      entryType = NULL  ← BUG #4
```

### Alur Pembayaran yang Seharusnya

```
Admin PATCH /payments/verify/:id
        ↓
payments.status = 'verified'
  + booking_payments (INSERT)        ← kas ledger
  + syncBookingStatus()              ← status booking
  + journalPaymentVerified()
      ↓ INSERT dua baris:
      [DEBIT]  accountId=kas_account, entryType='debit',  amount=X
      [CREDIT] accountId=revenue_account, entryType='credit', amount=X
```

### Alur Laporan Keuangan yang Seharusnya

```
financial_transactions (dengan accountId + entryType terisi)
        ↓
Trial Balance: aggregate debit/credit per account → harus balance
        ↓
Income Statement: sum revenue accounts - sum expense accounts
        ↓
Balance Sheet:    asset = liability + equity (accounting equation)
        ↓
Cash Flow:        semua entry dengan akun kas + bank (1-1xxx)
```

---

## BAGIAN 4 — RENCANA PERBAIKAN PRIORITAS

### FASE A — Perbaikan Bug Kritis (langsung bisa dikerjakan)

| # | Bug | File | Effort |
|---|-----|------|--------|
| A1 | Fix enum `'agent'` → `'agen'` di analytics | `analytics.ts:232` | 5 menit |
| A2 | Fix cast `departure_date::timestamp` → `::date` atau aman | `finance.ts` | 30 menit |
| A3 | Fix `CommissionReport.tsx` — ganti Supabase query ke API endpoint baru | `CommissionReport.tsx` + new route | 3-4 jam |

### FASE B — Perbaikan Data Integrity Sedang

| # | Bug | File | Effort |
|---|-----|------|--------|
| B1 | Implementasi double-entry di `autoJournal.ts` — setiap payment buat 2 entri | `autoJournal.ts`, `paymentSync.ts` | 4-6 jam |
| B2 | Lookup akun CoA default saat startup (Kas, Pendapatan Umroh, dll) | `autoJournal.ts` | 1 jam |
| B3 | Standarkan revenue source ke `booking_payments` di analytics | `analytics.ts:79` | 1 jam |
| B4 | Perbaiki Arus Kas — pisahkan inflow/outflow berdasarkan account type | `finance.ts:848` | 2 jam |

### FASE C — Fitur Baru / Refactor

| # | Fitur | Effort |
|---|-------|--------|
| C1 | Endpoint `/api/admin/finance/commission-report` (gantikan Supabase direct) | 3 jam |
| C2 | Frontend Commission Report pakai API endpoint (hapus Supabase direct) | 2 jam |
| C3 | Rekonsiliasi Bank — hubungkan frontend ke `bank-reconciliation` backend | 4 jam |
| C4 | Budget vs Aktual — bandingkan `package_costs.unit_cost` vs `actual_amount` | 4 jam |
| C5 | Laporan Pajak PPN/PPh — kalkulasi otomatis | 6 jam |
| C6 | Export PDF laporan keuangan | 4 jam |

---

## BAGIAN 5 — RINGKASAN PERUBAHAN PER FILE

```
PERLU DIUBAH:
├── artifacts/api-server/src/routes/admin/analytics.ts
│   ├── Line 232: 'agent' → 'agen'              [BUG #3]
│   └── Line 79: payments → booking_payments    [BUG #6]
│
├── artifacts/api-server/src/routes/admin/finance.ts
│   ├── Line 110,113,246,500: ::timestamp → ::date  [BUG #2b]
│   └── Line 865: perbaiki outflow source          [BUG #5]
│
├── artifacts/api-server/src/lib/autoJournal.ts
│   └── Semua functions: tambah double-entry debit+credit  [BUG #4]
│
├── artifacts/api-server/src/lib/paymentSync.ts
│   └── recordFinancialTransaction: support accountId + entryType [BUG #4]
│
├── artifacts/umroh-app/src/features/admin/components/CommissionReport.tsx
│   └── Ganti semua Supabase direct calls ke API endpoint  [BUG #1, #7]
│
PERLU DITAMBAH:
├── artifacts/api-server/src/routes/admin/finance.ts
│   └── GET /commission-report?from=&to=  [BUG #1 fix]
│
└── supabase/migrations/ (jika kolom DB belum ada di produksi)
    └── Pastikan pic_name, pic_phone, pic_email ada di bookings table [BUG #2a]
```

---

## BAGIAN 6 — CARA VERIFIKASI SETELAH PERBAIKAN

```bash
# 1. Test agent-stats tidak kosong lagi
curl "http://localhost:PORT/api/admin/analytics/agent-stats?period=30days"

# 2. Test piutang tidak error
curl "http://localhost:PORT/api/admin/finance/piutang"

# 3. Test trial balance tidak semua nol (butuh data payment dulu)
curl "http://localhost:PORT/api/admin/coa/trial-balance"

# 4. Test commission report endpoint baru
curl "http://localhost:PORT/api/admin/finance/commission-report?from=2026-01-01&to=2026-07-29"

# 5. Verifikasi double-entry: setelah verify 1 payment,
#    cek financial_transactions — harus ada 2 baris (1 debit + 1 credit)
SELECT id, entry_type, account_id, amount, category
FROM financial_transactions
ORDER BY created_at DESC
LIMIT 4;
```

---

*Dokumen ini adalah living document — update setiap kali bug diperbaiki atau fitur baru ditambahkan.*
