# FASE 5 — Compliance & Penguatan

> Estimasi: **~8–9 hari kerja**  
> Prasyarat: Fase 3 & Fase 4 selesai  
> Status: 🔲 Belum dimulai

---

## Ringkasan

Fase terakhir ini mencakup fitur compliance (pajak, multi-currency), penguatan keandalan (manifest offline, export akuntansi), dan proyeksi keuangan.

---

## F-11 — Pajak (PPN/PPh) & Faktur Pajak

**Estimasi: 3 hari | Prioritas: Sedang**

### Gap Saat Ini
- Tidak ada kalkulasi PPN/PPh di invoice
- Tidak ada nomor faktur pajak
- Tidak ada export ke format e-Faktur DJP Online

### Schema Baru

```sql
-- Konfigurasi tarif pajak per tenant (tambah ke site_settings atau tabel baru)
CREATE TABLE tax_settings (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  ppn_rate    NUMERIC(5,2) DEFAULT 11.00,   -- % PPN (default 11%)
  pph_rate    NUMERIC(5,2) DEFAULT 2.00,    -- % PPh 23 (default 2%)
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tax_invoices (
  id              TEXT PRIMARY KEY,
  booking_id      TEXT NOT NULL REFERENCES bookings(id),
  invoice_number  TEXT NOT NULL UNIQUE,  -- format NSFP DJP
  ppn_amount      INTEGER NOT NULL,
  pph_amount      INTEGER NOT NULL,
  base_amount     INTEGER NOT NULL,
  issued_at       DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Backend yang Perlu Dibuat

- `GET /api/admin/tax/settings` — ambil konfigurasi tarif
- `PUT /api/admin/tax/settings` — update tarif PPN/PPh
- `POST /api/admin/tax/invoices` — generate faktur pajak untuk booking
- `GET /api/admin/tax/invoices` — list semua faktur pajak
- `GET /api/admin/tax/export/e-faktur?from=&to=` — export CSV format e-Faktur DJP

### Frontend yang Perlu Dibuat/Diubah

**File baru: `artifacts/umroh-app/src/features/admin/pages/TaxSettings.tsx`**
- Form setting tarif PPN + PPh per tenant
- Preview kalkulasi pajak (contoh: invoice Rp 50.000.000 → PPN berapa?)

**Ubah InvoiceGenerator:**
- Tambah baris PPN + PPh ke template invoice
- Tambah nomor faktur pajak jika sudah digenerate

---

## F-12 — Budget & Proyeksi Cash Flow

**Estimasi: 2 hari | Prioritas: Rendah**

### Gap Saat Ini
- Tidak ada target pendapatan per periode
- Tidak ada proyeksi penerimaan berdasarkan cicilan terjadwal

### Schema Baru

```sql
CREATE TABLE budgets (
  id          TEXT PRIMARY KEY,
  period_year INTEGER NOT NULL,
  period_month INTEGER,            -- NULL = budget tahunan
  category    TEXT NOT NULL,       -- revenue | expense | hpp
  amount      INTEGER NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Backend yang Perlu Dibuat

- `GET/POST/PUT /api/admin/budgets` — CRUD budget per periode
- `GET /api/admin/finance/cash-flow-projection?months=6` — proyeksi
  - Ambil: cicilan terjadwal yang belum dibayar + booking baru estimasi
  - Return: proyeksi per bulan 3–6 bulan ke depan

### Frontend yang Perlu Diubah

**Tambah tab di FinanceDashboard.tsx atau halaman baru `BudgetPlanning.tsx`:**
- Input budget per bulan/kategori
- Grafik: target vs realisasi per bulan
- Proyeksi cash flow 6 bulan (chart area dengan baseline cicilan terjadwal)

---

## O-13 — Manifest Offline Cache

**Estimasi: 1 hari | Prioritas: Sedang**

### Gap Saat Ini
Manifest sangat kritis saat di bandara. Jika internet putus, admin tidak bisa akses.

### Rencana Implementasi

**Service Worker + IndexedDB:**
- Daftarkan service worker di `artifacts/umroh-app/public/sw.js`
- Cache respons `GET /api/admin/departures/:id/manifest` ke IndexedDB
- Strategi: Cache First untuk manifest, Network First untuk data lain

**Tombol "Simpan Offline" di halaman Manifest.tsx:**
- Klik → fetch manifest terbaru + simpan ke IndexedDB
- Tampilkan: *"Tersimpan offline — terakhir sync: {waktu}"*
- Badge indikator offline (abu-abu jika stale > 24 jam)

**Auto-sync saat online:**
- Service worker deteksi koneksi kembali → fetch ulang manifest aktif
- Notifikasi: *"Manifest diperbarui"*

### File yang Perlu Dibuat/Diubah
```
artifacts/umroh-app/public/sw.js                  ← BARU (Service Worker)
artifacts/umroh-app/src/lib/manifestCache.ts       ← BARU (IndexedDB wrapper)
artifacts/umroh-app/src/features/admin/pages/Manifest.tsx  ← tambah tombol & status
artifacts/umroh-app/index.html                     ← daftarkan service worker
```

---

## F-14 — Multi-Currency Terintegrasi

**Estimasi: 2 hari | Prioritas: Rendah**

### Gap Saat Ini
- Tabel `currencies` sudah ada tapi belum dipakai di transaksi
- Harga paket selalu dalam IDR

### Rencana

```sql
-- Tambah ke bookings dan package_costs
ALTER TABLE bookings
  ADD COLUMN currency_code  TEXT DEFAULT 'IDR',
  ADD COLUMN exchange_rate  NUMERIC(12,4) DEFAULT 1;

ALTER TABLE package_costs
  ADD COLUMN currency_code  TEXT DEFAULT 'IDR',
  ADD COLUMN exchange_rate  NUMERIC(12,4) DEFAULT 1;
```

**Kurs otomatis:**
- Cron harian: fetch kurs dari API Bank Indonesia → simpan ke tabel `currencies`
- Endpoint: `GET /api/admin/currencies/rates` — kurs hari ini

**Frontend:**
- Di form biaya paket (`PackageCosts.tsx`): pilih mata uang + input nominal asing → otomatis konversi ke IDR
- Di invoice: tampilkan harga asli (USD/SAR) + equiv IDR

---

## F-15 — Export ke Software Akuntansi

**Estimasi: 1–2 hari | Prioritas: Rendah**

### Rencana

Endpoint export jurnal ke format yang dikenal software akuntansi lokal:

```
GET /api/admin/reports/export/jurnal-id?from=&to=     ← format Jurnal.id CSV
GET /api/admin/reports/export/accurate?from=&to=       ← format Accurate CSV
GET /api/admin/reports/export/zahir?from=&to=          ← format Zahir CSV
GET /api/admin/reports/export/e-spt?year=              ← format XML e-SPT PPh
```

**Frontend:**
- Tambah dropdown "Export ke..." di halaman Reports.tsx atau Accounting.tsx
- Pilihan: Jurnal.id / Accurate / Zahir / e-SPT

---

## Checklist Selesai

### F-11
- [ ] Schema `tax_settings` dan `tax_invoices` dibuat & push ke DB
- [ ] Endpoint CRUD tax settings berjalan
- [ ] Endpoint generate & list faktur pajak berjalan
- [ ] Export CSV e-Faktur DJP berjalan
- [ ] Invoice menampilkan PPN/PPh jika tax settings aktif

### F-12
- [ ] Schema `budgets` dibuat & push ke DB
- [ ] Endpoint CRUD budgets berjalan
- [ ] Endpoint proyeksi cash flow 6 bulan berjalan
- [ ] Grafik target vs realisasi + proyeksi tampil di dashboard

### O-13
- [ ] Service Worker terdaftar dan aktif
- [ ] Manifest tersimpan ke IndexedDB saat klik "Simpan Offline"
- [ ] Manifest bisa dibuka saat offline
- [ ] Auto-sync saat koneksi kembali

### F-14
- [ ] Kolom `currency_code` & `exchange_rate` ditambah ke bookings & package_costs
- [ ] Cron kurs Bank Indonesia berjalan harian
- [ ] Form biaya paket mendukung input multi-currency
- [ ] Invoice tampilkan mata uang asli + ekuivalen IDR

### F-15
- [ ] Endpoint export Jurnal.id berjalan
- [ ] Endpoint export Accurate berjalan
- [ ] Endpoint export Zahir berjalan
- [ ] Endpoint export e-SPT berjalan
- [ ] Dropdown export tersedia di halaman Reports/Accounting

---

*Ini adalah fase terakhir. Setelah semua selesai, sistem UmrohPlus siap untuk audit dan compliance penuh.*
