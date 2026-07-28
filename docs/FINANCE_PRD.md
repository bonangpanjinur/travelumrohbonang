# PRD — Modul Keuangan (Finance Module)
**Vins Tour Travel — Admin Panel**
_Tanggal: 2026-07-28 | Status: Draft v1_

---

## 1. Ringkasan Eksekutif

Modul Keuangan adalah sekumpulan fitur admin yang mengelola arus kas, piutang, akuntansi double-entry, rekonsiliasi bank, cicilan, tabungan, dan pelaporan keuangan biro umroh. Modul ini menjadi fondasi transparansi finansial antara tim admin, akuntan, dan manajemen.

---

## 2. Peta Menu Keuangan

### Tampilan di Sidebar Admin (`KEUANGAN`)

```
KEUANGAN
 ├── Dashboard Keuangan          /admin/finance-dashboard
 ├── Keuangan Keberangkatan      /admin/departure-finance
 ├── Pembayaran Jemaah           /admin/payments
 ├── Cicilan                     /admin/installments
 ├── Tabungan Umroh              /admin/savings
 ├── Piutang Jemaah              /admin/piutang
 ├── [Biaya Paket]               /admin/package-costs       (di bawah menu Paket)
 ├── Akuntansi & Keuangan        /admin/accounting
 ├── Chart of Accounts           /admin/chart-of-accounts
 ├── Buku Besar                  /admin/general-ledger
 ├── Trial Balance               /admin/trial-balance
 ├── Laporan Keuangan            /admin/financial-reports
 ├── Rekonsiliasi Bank           /admin/bank-reconciliation
 ├── Budget & Cash Flow          /admin/budget-cashflow
 └── Export Akuntansi            /admin/accounting-export
```

**Hak Akses:** Semua menu finance memerlukan role `finance`, `admin`, atau `super_admin`. Sebagian (`accounting`, `chart-of-accounts`, `export`) hanya untuk `super_admin`/`admin`.

---

## 3. Detail Fitur per Menu

### 3.1 Dashboard Keuangan (`/admin/finance-dashboard`)
**Tujuan:** Ringkasan kesehatan keuangan biro satu halaman.

**Konten:**
- **4 kartu statistik:**
  - Pemasukan bulan ini (dari `booking_payments`)
  - Total piutang aktif (booking belum lunas × sisa bayar)
  - Jumlah piutang (count booking belum lunas)
  - Booking sudah lunas (count)
- **Bar chart arus kas** 12 bulan terakhir (DP / cicilan / pelunasan per bulan)
- **Tabel keberangkatan mendatang** 90 hari (target vs terkumpul, % lunas)
- **Aging buckets** (overdue / kritis / mendesak / perhatian / normal)

**API:** `GET /api/admin/finance/dashboard`

**Alur:** Load saat halaman dibuka → refresh manual via tombol Refresh.

---

### 3.2 Keuangan Keberangkatan (`/admin/departure-finance`)
**Tujuan:** Pantau revenue, HPP, dan laba kotor per keberangkatan.

**Konten:**
- List semua keberangkatan + ringkasan finansial (target, terkumpul, outstanding, HPP, gross profit, margin %)
- Klik satu baris → drawer detail: biaya operasional, daftar jemaah + status bayar

**API:**
- `GET /api/admin/finance/departures` — list semua
- `GET /api/admin/finance/departure/:departureId` — detail 1 keberangkatan

---

### 3.3 Pembayaran Jemaah (`/admin/payments`)
**Tujuan:** Verifikasi & manajemen bukti bayar booking.

**Konten:**
- List semua pembayaran pending/verified/rejected
- Tombol verifikasi / tolak + upload bukti
- Bulk verify

**API:** `GET|POST|PATCH /api/admin/payments/*`

---

### 3.4 Cicilan (`/admin/installments`)
**Tujuan:** Kelola jadwal cicilan otomatis per booking.

**Konten:**
- List jadwal cicilan (no cicilan, jatuh tempo, status: pending/paid/overdue)
- Filter per booking / status / tanggal
- Kirim reminder overdue

**API:** `GET|PATCH /api/admin/installments/*`

**DB:** Tabel `installment_schedules` — di-generate otomatis saat booking dibuat dengan skema DP/cicilan.

---

### 3.5 Tabungan Umroh (`/admin/savings`)
**Tujuan:** Kelola rekening tabungan jemaah yang menabung untuk biaya umroh.

**Konten:**
- Statistik: total rekening, total saldo, rekening aktif, setoran pending
- List rekening tabungan per jemaah
- Detail rekening: mutasi masuk/keluar, verifikasi setoran, proses refund/penarikan

**API:** `GET /api/admin/savings/*`, `POST /api/admin/savings/:id/verify/:txId`

**DB:** Tabel `savings_accounts` + `savings_transactions`.

---

### 3.6 Piutang Jemaah (`/admin/piutang`)
**Tujuan:** Pantau dan tagih booking belum lunas.

**Konten:**
- List booking dengan outstanding > 0
- Filter: aging bucket, status bayar (belum_bayar/baru_dp/sebagian/hampir_lunas)
- Kirim reminder WA massal
- Total outstanding + count kritis

**API:** `GET /api/admin/finance/piutang`, `POST /api/admin/finance/piutang/remind`

---

### 3.7 Biaya Paket (`/admin/package-costs`)
**Tujuan:** Input komponen biaya HPP per paket/keberangkatan.

**Konten:**
- CRUD komponen biaya (kategori, nama item, qty, unit, harga satuan, per-pax flag)
- Copy komponen antar paket/keberangkatan (bulk-copy)
- Profitabilitas per paket

**API:** `GET|POST|PATCH|DELETE /api/admin/costs/*`

---

### 3.8 Akuntansi & Keuangan (`/admin/accounting`)
**Tujuan:** Pencatatan transaksi keuangan manual (pemasukan/pengeluaran).

**Konten:**
- List transaksi dengan filter type/tanggal/kategori
- Form tambah/edit transaksi
- Chart ringkasan income vs expense
- Export CSV

**API:** `GET|POST|PATCH|DELETE /api/admin/accounting`

**DB:** Tabel `financial_transactions`

**Catatan:** Saat ini single-entry (belum full double-entry). `accountId` dan `entryType` tersedia tapi belum wajib diisi.

---

### 3.9 Chart of Accounts (`/admin/chart-of-accounts`)
**Tujuan:** Kelola kode akun standar akuntansi (COA).

**Konten:**
- List akun dikelompokkan per tipe (Aset/Kewajiban/Ekuitas/Pendapatan/Beban)
- Seed akun standar 30 akun (1 klik)
- CRUD akun
- Filter search + tipe

**API:** `GET|POST|PATCH|DELETE /api/admin/coa`, `POST /api/admin/coa/seed`

**DB:** Tabel `chart_of_accounts`

---

### 3.10 Buku Besar (`/admin/general-ledger`)
**Tujuan:** Riwayat transaksi per akun dengan saldo berjalan.

**Konten:**
- Pilih akun dari COA
- Filter tanggal
- Tabel transaksi: tanggal, deskripsi, debit, kredit, saldo
- Export CSV

**API:** `GET /api/admin/coa/ledger?accountId=&from=&to=`

---

### 3.11 Trial Balance (`/admin/trial-balance`)
**Tujuan:** Neraca saldo verifikasi — total debit harus = total kredit.

**Konten:**
- Table semua akun: debit, kredit, saldo
- Baris total: harus seimbang (balanced = true/false)

**API:** `GET /api/admin/coa/trial-balance?from=&to=`

---

### 3.12 Laporan Keuangan (`/admin/financial-reports`)
**Tujuan:** Laporan akuntansi standar (Laba Rugi, Neraca, Arus Kas).

**Konten:**
- Tab 1: Laba Rugi (Income Statement) — pendapatan, beban, laba bersih
- Tab 2: Neraca (Balance Sheet) — aset, kewajiban, ekuitas
- Tab 3: Arus Kas (Cash Flow) — inflow, outflow, net per bulan

**API:**
- `GET /api/admin/finance/reports/income-statement?from=&to=`
- `GET /api/admin/finance/reports/balance-sheet?date=`
- `GET /api/admin/finance/reports/cash-flow?from=&to=`

---

### 3.13 Rekonsiliasi Bank (`/admin/bank-reconciliation`)
**Tujuan:** Cocokkan mutasi rekening koran dengan booking payment.

**Konten:**
- Import CSV mutasi bank
- List mutasi (matched/unmatched)
- Auto-match berdasarkan nominal + tanggal
- Manual match ke booking payment

**API:** `GET|POST /api/admin/bank-reconciliation/*`

**DB:** Tabel `bank_mutations`

---

### 3.14 Budget & Cash Flow (`/admin/budget-cashflow`)
**Tujuan:** Rencanakan dan pantau anggaran vs realisasi.

**Konten:**
- CRUD budget per tahun/bulan per kategori
- Chart target vs aktual per kategori
- Proyeksi arus kas ke depan

**API:** `GET|POST|PATCH|DELETE /api/admin/budget/*`

**DB:** Tabel `budgets`

---

### 3.15 Export Akuntansi (`/admin/accounting-export`)
**Tujuan:** Export data ke format software akuntansi eksternal.

**Konten:**
- Export ke Jurnal.id (JSON)
- Export ke Accurate (CSV)
- Export ke Zahir (CSV)
- Export General Journal
- Export eSPT PPh

**API:** `GET /api/admin/accounting-export/*`

---

## 4. Alur Utama

### 4.1 Alur Penerimaan Pembayaran
```
Jemaah upload bukti → Admin terima notifikasi →
/admin/payments → Verifikasi → Booking status = paid →
Otomatis dicatat di financial_transactions → Muncul di Dashboard Keuangan
```

### 4.2 Alur Piutang
```
Booking created → Jatuh tempo otomatis via installment_schedules →
Cron harian jam 08:00 WIB cek overdue →
Reminder WA otomatis / manual dari /admin/piutang
```

### 4.3 Alur Akuntansi Double-Entry (Ideal)
```
Transaksi dibuat di /admin/accounting →
Pilih akun debit (COA) + akun kredit (COA) →
Tersimpan di financial_transactions (2 baris: debit + credit) →
Muncul di Buku Besar per akun → Trial Balance seimbang
```

### 4.4 Alur Rekonsiliasi Bank
```
Download mutasi rekening koran → Upload CSV →
/admin/bank-reconciliation → Auto-match / manual match →
Mutasi tercocokkan → Laporan rekonsiliasi bersih
```

---

## 5. Analisis Bug

Lihat `docs/FINANCE_BUG_REPORT.md` untuk daftar lengkap.

---

## 6. Gap & Peluang Perbaikan

| # | Gap | Prioritas |
|---|-----|-----------|
| G-1 | Double-entry belum wajib — user bisa input single-entry | Tinggi |
| G-2 | Budget vs-actual: income actual tidak ter-link ke kategori budget | Tinggi |
| G-3 | COA harus di-seed manual — seharusnya auto-seed saat pertama kali deploy | Sedang |
| G-4 | Laporan Keuangan belum bisa export PDF | Sedang |
| G-5 | Rekonsiliasi bank: belum support multi-bank | Rendah |
| G-6 | Tidak ada audit trail untuk perubahan data keuangan | Tinggi |
| G-7 | Tidak ada approval flow untuk transaksi keuangan besar | Sedang |

---

_Dokumen ini dibuat berdasarkan analisis kode pada 2026-07-28._
