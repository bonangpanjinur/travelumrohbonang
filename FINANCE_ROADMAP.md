# Roadmap Modul Keuangan — Umroh App

> Dokumen ini mencatat semua rencana, progres, dan backlog fitur keuangan.
> Update setiap kali ada perubahan signifikan.
>
> **Terakhir diperbarui:** 20 Juli 2026

---

## Status Ringkasan

| Fase | Nama | Status |
|------|------|--------|
| Fase 0 | Sistem Pembayaran Dasar | ✅ Selesai |
| Fase 1A | Dashboard Keuangan & Piutang | ✅ Selesai |
| Fase 1B | Invoice + QR Tracking | ✅ Selesai |
| Fase 1C | Cicilan (Installment) Otomatis | ✅ Selesai |
| Fase 2 | Keuangan Per Keberangkatan | ✅ Selesai |
| Fase 3 | Auto-Alert Deadline Lunas | ✅ Selesai |
| Fase 4 | Biaya Operasional Per Paket | ✅ Selesai |
| Fase 5 | Reminder Piutang via WA | 🔲 Belum |

---

## ✅ Fase 0 — Sistem Pembayaran Dasar

**Sudah selesai sejak awal proyek.**

### Yang Ada
- Tabel `bookings`, `booking_payments` — pencatatan pembayaran manual
- Upload bukti bayar jemaah (`booking_payment_proofs`)
- Verifikasi pembayaran oleh admin (approve/reject)
- Payment gateway: **Midtrans** (VA + QRIS) dan **Xendit** (VA)
- Webhook handler Midtrans & Xendit → update status otomatis
- Halaman admin: `Payments.tsx` — daftar pembayaran, filter status, verifikasi manual
- Halaman jemaah: `Payment.tsx` — upload bukti, lihat status
- Log akses bukti bayar (`PaymentProofAccessLogs.tsx`)

### File Utama
```
artifacts/api-server/src/routes/admin/payments.ts
artifacts/api-server/src/routes/payment-gateway-webhooks.ts
artifacts/api-server/src/lib/paymentSync.ts
artifacts/umroh-app/src/features/admin/pages/Payments.tsx
artifacts/umroh-app/src/features/booking/pages/Payment.tsx
```

---

## ✅ Fase 1A — Dashboard Keuangan & Piutang Jemaah

**Selesai: 20 Juli 2026**

### Dashboard Keuangan (`/admin/finance-dashboard`)

**Backend** — `GET /api/admin/finance/dashboard`

Menghitung secara real-time dari `bookings` + `booking_payments`:
- **Total pemasukan bulan ini** (sum `booking_payments` bulan berjalan)
- **Total piutang aktif** — sum `total_price - total_paid` untuk booking belum lunas
- **Jumlah booking belum lunas** vs sudah lunas
- **Arus kas bulanan 12 bulan** — breakdown DP / cicilan / pelunasan (stacked bar chart)
- **Keberangkatan mendatang 90 hari** — target revenue, terkumpul, outstanding, % bayar per keberangkatan
- **Aging buckets** — distribusi piutang berdasarkan jarak ke tanggal berangkat
- **Breakdown tipe pembayaran** bulan ini (dp / installment / full)

**Frontend** — `FinanceDashboard.tsx`
- 4 stat card: Pemasukan Bulan Ini, Total Piutang, Piutang Kritis, Booking Lunas
- Stacked bar chart (recharts) arus kas 12 bulan
- Tabel keberangkatan mendatang + progress bar % terkumpul
- Banner alert merah untuk keberangkatan < 30 hari yang masih punya outstanding
- Aging donut breakdown (overdue / kritis / mendesak / perhatian / normal)

### Piutang Jemaah (`/admin/piutang`)

**Backend** — `GET /api/admin/finance/piutang`

Query join `bookings + profiles + packages + package_departures + booking_payments`:
- Field computed: `payStatus` (belum_bayar / baru_dp / sebagian / hampir_lunas)
- Field computed: `agingBucket` (overdue / kritis / mendesak / perhatian / normal)
- Filter: `package_id`, `departure_id`, `bucket`, `status`
- Meta: `totalOutstanding`, `kritisCount`

**Aging bucket logic:**
| Bucket | Kondisi |
|--------|---------|
| `overdue` | Tanggal keberangkatan sudah lewat |
| `kritis` | ≤ 14 hari ke keberangkatan |
| `mendesak` | 15–30 hari |
| `perhatian` | 31–60 hari |
| `normal` | > 60 hari atau belum ada keberangkatan |

**Frontend** — `Piutang.tsx`
- Tabel lengkap dengan search nama/kode booking
- Filter chip: aging bucket + status bayar
- Progress bar per baris (% sudah bayar)
- Expand row → detail: kontak WA langsung, histori pembayaran, tanggal keberangkatan
- Bulk select → kirim reminder (UI ada, endpoint belum — lihat Fase 5)
- Export CSV (BOM, Excel-ready)

### File Utama
```
artifacts/api-server/src/routes/admin/finance.ts
artifacts/umroh-app/src/features/admin/pages/FinanceDashboard.tsx
artifacts/umroh-app/src/features/admin/pages/Piutang.tsx
```

---

## ✅ Fase 1B — Invoice + QR Code Tracking Pembayaran

**Selesai: sebelum 20 Juli 2026**

### Yang Dibangun
- **`GET /api/admin/bookings/:id/invoice-data`** — endpoint baru dengan raw SQL join (menggantikan query Supabase lama yang salah tabel)
- **`InvoiceGenerator.ts`** — ditulis ulang: pakai `apiFetch`, generate QR code async via library `qrcode`
- **QR code** di invoice mengarah ke `{origin}/track/{bookingCode}` — halaman tracking publik
- **`GET /api/track/:code`** (publik, tanpa auth) — return status booking + ringkasan pembayaran
- **`/track/:code`** — halaman publik `TrackBooking.tsx` untuk jemaah cek status tanpa login

### File Utama
```
artifacts/api-server/src/routes/track.ts
artifacts/api-server/src/routes/index.ts  (mount /track sebelum auth middleware)
artifacts/umroh-app/src/features/admin/components/InvoiceGenerator.ts
artifacts/umroh-app/src/pages/TrackBooking.tsx
```

---

## ✅ Fase 1C — Cicilan (Installment) Otomatis

**Selesai: sebelum 20 Juli 2026**

### Yang Dibangun

**Schema DB baru:**
- Tabel `installment_schedules` — id, bookingId, installmentNumber (0=DP, 1..n), dueDate, amount, status (pending/paid/overdue), paidAt, paymentGatewayOrderId
- Kolom `installmentScheduleId` di `payment_gateway_transactions`

**Backend logic (`lib/installments.ts`):**
- `generateInstallmentSchedule()` — buat jadwal dari data paket (minimumDp, dpDeadlineDays, fullDeadlineDays)
- `markInstallmentPaid()` — dipanggil dari webhook Midtrans/Xendit
- `syncOverdueStatus()` — sync status overdue secara lazy (saat read)

**Cron job** (`installmentReminderCron.ts`) — setiap hari jam 08:00 WIB:
- Cari installment `status='pending'` dengan dueDate dalam 7 hari ke depan
- Kirim reminder via WA + email

**Routes:**
- `GET /api/bookings/:id/installments` — jadwal cicilan jemaah
- `POST /api/bookings/:id/installments/:n/pay` — buat transaksi VA/QRIS untuk cicilan ke-n
- `GET /api/admin/installments` — semua installment (admin)
- `GET /api/admin/installments/overdue` — daftar overdue
- `POST /api/admin/installments/send-reminders` — trigger manual

**Frontend:**
- `InstallmentSchedule.tsx` — kartu cicilan di MyBookings jemaah
- `UpcomingInstallmentCard` di Dashboard jemaah

### File Utama
```
artifacts/api-server/src/lib/installments.ts
artifacts/api-server/src/lib/installmentReminderCron.ts
artifacts/umroh-app/src/features/booking/components/InstallmentSchedule.tsx
artifacts/umroh-app/src/features/booking/hooks/useInstallments.ts
```

---

## 🔲 Fase 2 — Keuangan Per Keberangkatan

**Prioritas: Tinggi | Estimasi: 1–2 hari kerja**

### Tujuan
Halaman P&L (Profit & Loss) per keberangkatan — berapa revenue terkumpul vs HPP (Harga Pokok Paket) vs biaya operasional aktual.

### Rencana Backend

**`GET /api/admin/finance/departure/:departureId`**

Data yang dikembalikan:
```
{
  departure: { id, date, packageTitle, quota, filledSeats },
  revenue: {
    target: total booking × harga,
    collected: total bayar masuk,
    outstanding: belum bayar,
    pctCollected: %
  },
  hpp: {
    perPax: dari packages.base_price atau cost fields,
    total: hpp × filledSeats
  },
  operationalCosts: [   // dari tabel package_costs (sudah ada)
    { category, item, budgeted, actual, variance }
  ],
  grossProfit: collected - hpp.total - sum(actual costs),
  pilgrims: [  // ringkasan per jemaah
    { name, bookingCode, totalPrice, paid, outstanding, status }
  ]
}
```

**`GET /api/admin/finance/departures`** — overview semua keberangkatan (P&L summary list)

### Rencana Frontend

Halaman baru: `/admin/departure-finance`

- Dropdown pilih keberangkatan
- Card: Revenue target vs terkumpul (gauge/donut)
- Card: HPP total vs gross margin
- Tabel biaya operasional: budgeted vs aktual vs selisih
- Tabel jemaah: status bayar masing-masing
- Export PDF laporan keuangan per keberangkatan

### Catatan Implementasi
- `package_costs` sudah ada di DB (dari PackageCosts page yang sudah ada)
- HPP bisa dari `packages.base_price` atau dari sum `package_costs` per kategori
- Perlu diskusi: apakah HPP = base_price atau = sum biaya aktual?

---

## 🔲 Fase 3 — Auto-Alert Deadline Lunas

**Prioritas: Tinggi | Estimasi: 1 hari kerja**

### Tujuan
Cron job harian yang mendeteksi booking belum lunas dengan keberangkatan H-30, H-14, H-7 — otomatis kirim notifikasi in-app + WA ke jemaah dan admin.

### Rencana Backend

**File baru:** `artifacts/api-server/src/lib/paymentDeadlineAlertCron.ts`

```typescript
// Pola sama dengan installmentReminderCron.ts
// Fires: daily 08:00 WIB (01:00 UTC)
// Logic:
//   1. Query bookings dengan departure_date IN [H-30, H-14, H-7] ± 1 hari
//   2. Filter: outstanding > 0
//   3. Per booking:
//      a. createNotification(userId, "payment_deadline_alert", {...})
//      b. sendPaymentDeadlineWA(phone, { name, outstanding, dueDate, bookingCode })
//      c. Log ke audit trail (untuk mencegah double-kirim)
```

**Anti-duplicate kirim:**
- Tambah kolom `last_deadline_alert_sent_at` di bookings, ATAU
- Cek tabel notifications apakah sudah ada notifikasi tipe `payment_deadline_alert` dengan `referenceId = bookingId` dalam 24 jam terakhir

**WA template baru** (`lib/whatsapp/src/templates.ts`):
```
paymentDeadlineAlertWA(name, outstanding, daysLeft, bookingCode)
```

**Admin alert:**
- Saat ada booking kritis (H-7, outstanding > 0), kirim summary ke nomor WA admin
- Atau tampilkan sebagai banner di Dashboard Keuangan (sudah ada UI-nya, tinggal data)

### Catatan
- Gunakan pola `setInterval` + UTC hour check (sudah ada di installmentReminderCron)
- Register di `index.ts` setelah server boot (sama seperti cron yang sudah ada)

---

## 🔲 Fase 4 — Biaya Operasional Per Paket (Peningkatan)

**Prioritas: Sedang | Estimasi: 1 hari kerja**

### Kondisi Saat Ini
- Halaman `PackageCosts` sudah ada
- CRUD biaya per kategori sudah bisa
- Tapi belum ada kolom "Aktual vs Budget" — semua dianggap budgeted

### Rencana Peningkatan

**Schema perubahan** (`package_costs` atau tabel baru `package_cost_actuals`):
- Tambah kolom `actual_amount` (nullable) — diisi setelah keberangkatan
- Tambah kolom `invoice_reference` (string, nullable) — nomor faktur vendor
- Tambah kolom `paid_at` (timestamp, nullable)

**Backend:**
- `PATCH /api/admin/package-costs/:id` — tambah field `actualAmount`, `invoiceReference`, `paidAt`
- `GET /api/admin/package-costs/summary?packageId=X` — budgeted vs actual vs variance

**Frontend peningkatan `PackageCosts.tsx`:**
- Kolom tambahan: Aktual, Variance (warna merah jika over budget)
- Filter tampilkan: "Semua" / "Over Budget" / "Belum Diisi Aktual"
- Progress bar per kategori
- Total row: sum budgeted vs sum actual

---

## 🔲 Fase 5 — Reminder Piutang via WA (Bulk)

**Prioritas: Sedang | Estimasi: 0.5 hari kerja**

### Kondisi Saat Ini
- Tombol "Kirim Reminder" di `Piutang.tsx` sudah ada (UI + bulk select)
- Endpoint `POST /api/admin/finance/piutang/remind` **belum dibuat**

### Rencana Backend

**`POST /api/admin/finance/piutang/remind`**

```typescript
// Body: { bookingIds: string[] }
// Untuk setiap bookingId:
//   1. Ambil data booking + kontak jemaah
//   2. Hitung outstanding
//   3. Kirim WA via waNotifications.paymentReminder(...)
//   4. Log ke audit / notifications tabel
// Return: { sent: number, failed: number, errors: [...] }
```

**WA template** (gunakan yang sudah ada atau buat baru):
```
Yth. {name},
Kami mengingatkan sisa pembayaran paket umroh Anda:
Kode booking: {bookingCode}
Sisa: Rp {outstanding}
Keberangkatan: {departureDate}
Harap segera melunasi sebelum tanggal keberangkatan.
Info: {trackUrl}
```

### Catatan
- Rate limiting: max 10 WA per batch untuk hindari spam Twilio/WA provider
- Tombol UI sudah ada di `Piutang.tsx` line ~210 — tinggal uncomment / connect endpoint

---

## 📋 Backlog Lanjutan (Belum Diprioritaskan)

### BL-01 — Laporan Keuangan Bulanan (PDF/Excel)
Export rekap keuangan per bulan: total pemasukan, breakdown per paket, piutang, HPP.

### BL-02 — Rekonsiliasi Payment Gateway
Halaman perbandingan: transaksi di Midtrans/Xendit vs yang tercatat di DB — untuk mendeteksi gap.

### BL-03 — Multi-Currency Support
Untuk paket internasional yang harganya bisa dalam USD/SAR. Tabel `currencies` sudah ada, belum dipakai.

### BL-04 — Refund Tracking
Pencatatan refund yang lebih terstruktur — saat ini refund manual, belum ada trail audit yang jelas.

### BL-05 — Budget vs Realisasi Dashboard (Tahunan)
Perbandingan target revenue tahunan vs realisasi, per paket, per bulan.

### BL-06 — Komisi Agen Terintegrasi ke Laporan Keuangan
Saat ini komisi agen ada di modul affiliate — belum muncul sebagai pengurang revenue di laporan keuangan.

---

## 🗂️ Struktur File Keuangan (Referensi)

```
artifacts/
├── api-server/src/
│   ├── routes/
│   │   ├── admin/
│   │   │   ├── finance.ts              ✅ dashboard + piutang
│   │   │   ├── payments.ts             ✅ verifikasi manual
│   │   │   └── payment-gateway.ts      ✅ gateway settings
│   │   ├── payment-gateway-webhooks.ts ✅ Midtrans + Xendit
│   │   └── track.ts                    ✅ public tracking
│   └── lib/
│       ├── installments.ts             ✅ jadwal cicilan
│       ├── installmentReminderCron.ts  ✅ cron cicilan
│       ├── paymentSync.ts              ✅ sync gateway
│       └── paymentDeadlineAlertCron.ts 🔲 [Fase 3 - belum ada]
│
└── umroh-app/src/
    ├── features/admin/pages/
    │   ├── FinanceDashboard.tsx         ✅ dashboard keuangan
    │   ├── Piutang.tsx                  ✅ daftar piutang
    │   ├── Payments.tsx                 ✅ verifikasi pembayaran
    │   └── PaymentGateway.tsx           ✅ setting gateway
    ├── features/booking/
    │   ├── pages/Payment.tsx            ✅ upload bukti jemaah
    │   └── components/InstallmentSchedule.tsx ✅ jadwal cicilan
    └── pages/
        └── TrackBooking.tsx             ✅ tracking publik
```

---

## 📌 Daftar Prioritas

### Prioritas 1 — Segera (dampak langsung, mudah dikerjakan)

| # | Fitur | Fase | Estimasi | Alasan |
|---|-------|------|----------|--------|
| P1 | Reminder Piutang via WA (bulk) | Fase 5 | 0.5 hari | Tombol UI sudah ada, hanya perlu endpoint backend. Langsung bisa dipakai admin untuk tagih jemaah. |
| P2 | Auto-Alert Deadline Lunas (cron) | Fase 3 | 1 hari | Pola cron sudah ada (`installmentReminderCron`), tinggal duplikasi logika. Mencegah jemaah lupa bayar mendekati keberangkatan. |

### Prioritas 2 — Penting (nilai bisnis tinggi, perlu lebih banyak kerja)

| # | Fitur | Fase | Estimasi | Alasan |
|---|-------|------|----------|--------|
| P3 | Keuangan Per Keberangkatan | Fase 2 | 2 hari | Manajer perlu tahu P&L tiap keberangkatan — revenue vs HPP vs biaya aktual. Data sudah ada di DB, tinggal agregasi dan UI. |
| P4 | Biaya Operasional Aktual vs Budget | Fase 4 | 1 hari | Saat ini semua biaya dianggap "budgeted". Menambah kolom aktual + variance membuat kontrol pengeluaran jadi bermakna. |

### Prioritas 3 — Backlog (nilai jangka panjang, bisa ditunda)

| # | Fitur | Estimasi | Alasan Tunda |
|---|-------|----------|--------------|
| B1 | Laporan Keuangan Bulanan PDF/Excel | 2 hari | Berguna tapi bisa diekspor manual dari piutang dulu |
| B2 | Rekonsiliasi Payment Gateway | 2 hari | Penting untuk skala besar; belum ada keluhan gap saat ini |
| B3 | Multi-Currency | 3 hari | Hanya relevan jika ada paket harga USD/SAR |
| B4 | Refund Tracking Terstruktur | 1 hari | Refund saat ini masih jarang; prosedur manual cukup |
| B5 | Budget vs Realisasi Tahunan | 2 hari | Butuh data historis yang cukup dulu |
| B6 | Komisi Agen di Laporan Keuangan | 1 hari | Modul komisi sudah ada; integrasi ke laporan bisa belakangan |

### Urutan Eksekusi Rekomendasi

```
1. Fase 5  → Reminder WA          (0.5 hari)  — quick win
2. Fase 3  → Auto-Alert Cron      (1 hari)    — automasi tagihan
3. Fase 2  → Keuangan Keberangkatan(2 hari)   — insight P&L
4. Fase 4  → Biaya Aktual         (1 hari)    — kontrol pengeluaran
── total estimasi: ~4.5 hari kerja ──
5. Backlog — sesuai kebutuhan bisnis
```
