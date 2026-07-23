# FASE 2 — Fondasi Akuntansi

> Estimasi: **~5–6 hari kerja**  
> Prasyarat: Fase 1 selesai  
> Status: 🔲 Belum dimulai

---

## Ringkasan

Fase ini membangun fondasi sistem akuntansi yang bisa dipakai akuntan/auditor: Chart of Accounts (kode akun), Buku Besar, dan tiga laporan standar (Neraca, Laba/Rugi, Arus Kas).

---

## F-7 — Chart of Accounts (CoA) + Buku Besar

**Estimasi: 2–3 hari | Prioritas: Tinggi**

### Gap Saat Ini
- Tidak ada kode akun (Chart of Accounts)
- Kategori transaksi disimpan di `localStorage` frontend (tidak persisten di DB)
- Tidak ada buku besar per akun, tidak ada trial balance

### Schema Baru

```sql
-- lib/db/src/schema/accounting.ts (file baru)
CREATE TABLE chart_of_accounts (
  id         TEXT PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,    -- contoh: 1-1101 (Kas), 4-1001 (Pendapatan Umroh)
  name       TEXT NOT NULL,
  type       TEXT NOT NULL,           -- asset | liability | equity | revenue | expense
  category   TEXT,                    -- sub-grouping
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tambah FK ke financial_transactions
ALTER TABLE financial_transactions
  ADD COLUMN account_id TEXT REFERENCES chart_of_accounts(id);
```

### Seed Data Akun Standar (minimal)

| Kode | Nama | Tipe |
|------|------|------|
| 1-1101 | Kas & Bank | asset |
| 1-1201 | Piutang Jemaah | asset |
| 2-1101 | Hutang Vendor | liability |
| 3-1001 | Modal | equity |
| 4-1001 | Pendapatan Umroh | revenue |
| 4-1002 | Pendapatan Haji | revenue |
| 5-1001 | HPP — Hotel | expense |
| 5-1002 | HPP — Tiket Pesawat | expense |
| 5-1003 | HPP — Visa | expense |
| 5-2001 | Biaya Operasional | expense |
| 5-2002 | Biaya Komisi Agen | expense |

### Backend yang Perlu Dibuat/Diubah

**File: `artifacts/api-server/src/routes/admin/accounting.ts`** (sudah ada, perlu tambah):
- `GET /api/admin/coa` — list semua akun, filter by type
- `POST /api/admin/coa` — buat akun baru
- `PUT /api/admin/coa/:id` — edit akun
- `DELETE /api/admin/coa/:id` — nonaktifkan akun (soft delete)
- `GET /api/admin/coa/seed` — seed akun standar sekali jalan
- `GET /api/admin/ledger?accountId=X&from=Y&to=Z` — buku besar per akun
- `GET /api/admin/trial-balance?date=YYYY-MM-DD` — saldo debit/kredit per akun

### Frontend yang Perlu Dibuat

```
artifacts/umroh-app/src/features/admin/pages/ChartOfAccounts.tsx  ← BARU
artifacts/umroh-app/src/features/admin/pages/GeneralLedger.tsx    ← BARU
artifacts/umroh-app/src/features/admin/pages/TrialBalance.tsx      ← BARU
```

**ChartOfAccounts.tsx:**
- Tabel kode akun + nama + tipe (dengan warna per tipe)
- Tombol tambah/edit/nonaktifkan
- Tombol "Seed Akun Standar" (muncul sekali jika CoA masih kosong)
- Filter by tipe akun

**GeneralLedger.tsx:**
- Pilih akun → tampilkan semua transaksi dalam periode
- Kolom: tanggal, deskripsi, debit, kredit, saldo berjalan
- Filter periode (bulan/tahun)
- Export CSV

**TrialBalance.tsx:**
- Tabel semua akun dengan saldo debit/kredit per tanggal tertentu
- Total debit harus = total kredit (validasi balance)

---

## F-8 — Laporan Akuntansi Standar

**Estimasi: 2–3 hari | Prioritas: Tinggi | Prasyarat: F-7 selesai**

### Gap Saat Ini
- Hanya ada P&L chart sederhana di `Accounting.tsx` (belum standar PSAK/SAK ETAP)
- Tidak ada Neraca (Balance Sheet)
- Tidak ada Laporan Arus Kas (Cash Flow Statement)

### Backend yang Perlu Dibuat

**File: `artifacts/api-server/src/routes/admin/reports.ts`** (file baru):

```
GET /api/admin/reports/income-statement?from=YYYY-MM-DD&to=YYYY-MM-DD
```
Response:
```json
{
  "revenue": [{ "accountCode": "4-1001", "name": "Pendapatan Umroh", "amount": 0 }],
  "hpp": [{ "accountCode": "5-1001", "name": "HPP Hotel", "amount": 0 }],
  "gross_profit": 0,
  "operating_expenses": [...],
  "net_income": 0
}
```

```
GET /api/admin/reports/balance-sheet?date=YYYY-MM-DD
```
Response:
```json
{
  "assets": { "current": [...], "fixed": [...], "total": 0 },
  "liabilities": { "current": [...], "long_term": [...], "total": 0 },
  "equity": { "total": 0 }
}
```

```
GET /api/admin/reports/cash-flow?from=YYYY-MM-DD&to=YYYY-MM-DD
```
Response:
```json
{
  "operating": [...],
  "investing": [...],
  "financing": [...],
  "net_change": 0,
  "opening_balance": 0,
  "closing_balance": 0
}
```

### Frontend yang Perlu Diubah

**File: `artifacts/umroh-app/src/features/admin/pages/Reports.tsx`** (sudah ada, perlu diperluas):
- Tab: Laba/Rugi | Neraca | Arus Kas
- Filter periode (date picker range)
- Tampilan tabel hierarkis (group by tipe akun)
- Tombol Export PDF dan Export Excel per laporan

---

## Checklist Selesai

### F-7
- [ ] Schema `chart_of_accounts` dibuat di Drizzle & push ke DB
- [ ] Kolom `account_id` ditambah ke `financial_transactions`
- [ ] Seed data akun standar tersedia
- [ ] CRUD endpoint CoA berjalan
- [ ] Endpoint buku besar (`/ledger`) berjalan
- [ ] Endpoint trial balance berjalan
- [ ] Halaman `ChartOfAccounts.tsx` bisa CRUD akun
- [ ] Halaman `GeneralLedger.tsx` tampilkan transaksi per akun
- [ ] Halaman `TrialBalance.tsx` tampilkan saldo per akun

### F-8
- [ ] Endpoint income statement berjalan
- [ ] Endpoint balance sheet berjalan
- [ ] Endpoint cash flow berjalan
- [ ] Halaman Reports.tsx punya 3 tab laporan
- [ ] Export PDF/Excel berfungsi untuk setiap laporan

---

*Setelah fase ini selesai → lanjut ke [Fase 4](FASE_4_KEUANGAN_LANJUTAN.md)*
