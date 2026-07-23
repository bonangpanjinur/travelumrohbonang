# FASE 4 — Keuangan Lanjutan

> Estimasi: **~4–5 hari kerja**  
> Prasyarat: Fase 2 selesai  
> Status: 🔲 Belum dimulai

---

## Ringkasan

Fase ini memperdalam kontrol keuangan dengan HPP aktual (bukan hanya budgeted) dan rekonsiliasi mutasi bank otomatis.

---

## F-9 — HPP Otomatis dari Biaya Aktual

**Estimasi: 1–2 hari | Prioritas: Sedang**

### Gap Saat Ini
- `package_costs` dientry manual, tidak terhubung ke biaya aktual booking
- Tidak ada kolom `actual_amount` (semua dianggap budgeted)
- Tidak ada variance HPP budget vs aktual
- Tidak ada HPP per jamaah (per pax)

### Schema yang Perlu Diubah

```sql
-- Tambah kolom ke package_costs (lib/db/src/schema/packages.ts)
ALTER TABLE package_costs
  ADD COLUMN actual_amount      INTEGER,
  ADD COLUMN invoice_reference  TEXT,
  ADD COLUMN paid_at            TIMESTAMPTZ;
```

### Backend yang Perlu Diubah/Dibuat

**File: `artifacts/api-server/src/routes/admin/costs.ts`** (sudah ada):
- `PATCH /api/admin/costs/:id` — tambah support `actualAmount`, `invoiceReference`, `paidAt`
- `GET /api/admin/costs/summary?departureId=X` — summary budgeted vs aktual vs variance
  ```json
  {
    "totalBudgeted": 0,
    "totalActual": 0,
    "variance": 0,
    "filledSeats": 0,
    "hppPerPax": 0,
    "items": [
      {
        "category": "Hotel",
        "budgeted": 0,
        "actual": 0,
        "variance": 0,
        "status": "over_budget | under_budget | on_track | not_filled"
      }
    ]
  }
  ```

### Frontend yang Perlu Diubah

**File: `artifacts/umroh-app/src/features/admin/pages/PackageCosts.tsx`** (sudah ada):
- Tambah kolom: **Budgeted** | **Aktual** | **Variance** | **Status**
- Inline edit kolom Aktual + Referensi Invoice + Tanggal Dibayar
- Badge status: `Over Budget` (merah) / `Under Budget` (hijau) / `Belum Diisi` (abu)
- Card summary di atas tabel: HPP per pax otomatis = `sum(actual) / filledSeats`
- Filter: tampilkan hanya item Over Budget atau Belum Diisi Aktual

---

## F-10 — Rekonsiliasi Bank (Import Mutasi)

**Estimasi: 2–3 hari | Prioritas: Sedang**

### Gap Saat Ini
- Tab reconciliation di `Accounting.tsx` sudah ada tapi tidak terhubung ke data apapun
- Tidak ada import mutasi bank (CSV/API)
- Tidak ada matching otomatis transaksi gateway ↔ `booking_payments`

### Schema Baru

```sql
-- lib/db/src/schema/accounting.ts (tambah ke file yang sudah ada)
CREATE TABLE bank_mutations (
  id          TEXT PRIMARY KEY,
  date        DATE NOT NULL,
  description TEXT,
  amount      INTEGER NOT NULL,    -- positif = kredit, negatif = debit
  balance     INTEGER,
  ref_number  TEXT,
  matched_to  TEXT REFERENCES booking_payments(id),
  is_matched  BOOLEAN DEFAULT false,
  source_bank TEXT,               -- BCA | Mandiri | BNI | BRI | dll
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Backend yang Perlu Dibuat

**File: `artifacts/api-server/src/routes/admin/accounting.ts`** (sudah ada, tambah):
- `POST /api/admin/bank-mutations/import` — import CSV mutasi bank
  - Support format: BCA, Mandiri, BNI, BRI (parser per bank)
  - Idempoten: cek `ref_number` + `date` + `amount` sebelum insert (hindari duplikat)
- `GET /api/admin/bank-mutations?from=&to=&isMatched=` — list mutasi
- `POST /api/admin/bank-mutations/auto-match` — auto-matching
  - Cocokkan `amount` + `date ± 1 hari` dengan `booking_payments` yang belum diverifikasi
  - Return: `{ matched: N, unmatched: M, ambiguous: K }`
- `PATCH /api/admin/bank-mutations/:id/match` — manual match ke booking_payment
- `DELETE /api/admin/bank-mutations/:id` — hapus mutasi (jika salah import)

### Frontend yang Perlu Diubah

**File: `artifacts/umroh-app/src/features/admin/pages/Accounting.tsx`** (sudah ada):
- Tab **Rekonsiliasi** (sudah ada placeholder) → implementasi penuh:
  - Upload CSV mutasi bank (drag-and-drop atau file picker)
  - Pilih bank (BCA / Mandiri / BNI / BRI)
  - Tombol "Auto-Match" → tampilkan hasil
  - Tabel dua kolom: **Mutasi Bank** | **Pembayaran di Sistem**
  - Tombol "Match Manual" jika auto-match tidak berhasil
  - Highlight merah: mutasi yang belum ter-match setelah 7 hari
  - Export rekap rekonsiliasi ke PDF/Excel

### Format CSV yang Didukung

| Bank | Format Kolom |
|------|-------------|
| BCA  | Tanggal, Keterangan, Cabang, Jumlah, Saldo |
| Mandiri | Tanggal, Deskripsi, Nominal, Tipe, Saldo |
| BNI  | Tanggal, Keterangan, Debit, Kredit, Saldo |
| BRI  | Tanggal, Uraian, Debit, Kredit, Saldo |

---

## Checklist Selesai

### F-9
- [ ] Kolom `actual_amount`, `invoice_reference`, `paid_at` ditambah ke `package_costs`
- [ ] Endpoint summary HPP berjalan (budgeted vs aktual vs variance)
- [ ] Halaman PackageCosts.tsx tampilkan 4 kolom (budgeted/aktual/variance/status)
- [ ] HPP per pax dihitung otomatis
- [ ] Filter over budget & belum diisi berfungsi

### F-10
- [ ] Schema `bank_mutations` dibuat & push ke DB
- [ ] Endpoint import CSV berjalan (support 4 bank)
- [ ] Auto-match berjalan (cocokkan amount + tanggal ± 1 hari)
- [ ] Endpoint manual match berjalan
- [ ] Tab Rekonsiliasi di Accounting.tsx fungsional
- [ ] Export rekap rekonsiliasi berjalan

---

*Setelah fase ini selesai → lanjut ke [Fase 5](FASE_5_COMPLIANCE_PENGUATAN.md)*
