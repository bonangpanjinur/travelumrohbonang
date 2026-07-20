# Analisis Menu Keuangan — UmrohPlus

> Dibuat: 20 Juli 2026  
> Cakupan: 6 sub-menu Keuangan (Pembayaran, Cicilan, HPP & Profitabilitas, Akuntansi & Keuangan, Payment Gateway, Dashboard Analitik)  
> Metode: Code audit lengkap frontend + backend

---

## Ringkasan Eksekutif

| Menu | Status | Bug Kritis | Bug Minor | Fitur Kurang |
|------|--------|-----------|-----------|-------------|
| Pembayaran | ✅ Baik | 0 | 3 | 3 |
| Cicilan | ⚠️ Parsial | 1 | 3 | 4 |
| HPP & Profitabilitas | ✅ Baik | 0 | 3 | 3 |
| Akuntansi & Keuangan | 🔴 Kritis | 1 | 2 | 5 |
| Payment Gateway | ⚠️ Parsial | 1 | 3 | 4 |
| Dashboard Analitik | ⚠️ Parsial | 1 | 1 | 3 |

---

## 1. Pembayaran (Verifikasi Pembayaran Manual)

**File:** `artifacts/umroh-app/src/features/admin/pages/Payments.tsx`  
**Backend:** `artifacts/api-server/src/routes/admin/payments.ts`

### ✅ Yang Sudah Baik
- Approve + reject dengan alasan bekerja dengan baik
- Idempotency check saat verify (cek `bookingPayments` sebelum insert)
- Sinkronisasi status booking otomatis setelah verifikasi
- Notifikasi in-app + email + WhatsApp (fire-and-forget)
- Preview + zoom bukti foto pembayaran
- Export CSV berfungsi

### 🐛 Bug / Masalah
1. **[Minor] Search hanya by kode booking** — Tidak bisa cari berdasarkan nama jamaah, nominal, atau metode pembayaran. Filter jadi terbatas untuk admin yang tahu nama jamaah tapi tidak tahu kode booking.
   - File: `Payments.tsx` line 70: `p.booking?.bookingCode?.toLowerCase().includes(search.toLowerCase())`
   
2. **[Minor] Status "refunded" tidak ada di filter tab** — Tab filter hanya ada: Semua / Menunggu / Terverifikasi / Ditolak. Kalau ada pembayaran yang direfund, tidak ada cara memfilternya.
   - File: `Payments.tsx` lines 230–239: array filter hanya 4 status
   
3. **[Minor] Export CSV pakai raw status** — Kolom status di CSV menampilkan nilai internal (`"verified"`, `"rejected"`) bukan label bahasa Indonesia (`"Terverifikasi"`, `"Ditolak"`).
   - File: `Payments.tsx` line 213: `p.status || "pending"` (tidak melalui `getPaymentTypeLabel`)

### ❌ Fitur Yang Kurang
1. **Filter tanggal** — Tidak ada date range picker. Kalau data pembayaran sudah ribuan, tidak bisa filter periode tertentu.
2. **Summary cards di atas tabel** — Tidak ada ringkasan: berapa total pending, total diverifikasi hari ini, total nominal menunggu verifikasi.
3. **Batch approve** — Tidak ada checkbox multi-select untuk verifikasi massal (misal 10 pembayaran sekaligus).

---

## 2. Cicilan (Monitoring Cicilan)

**File:** `artifacts/umroh-app/src/features/admin/pages/Installments.tsx`  
**Backend:** `artifacts/api-server/src/routes/admin/installments.ts`

### ✅ Yang Sudah Baik
- Summary cards (belum bayar / jatuh tempo / lunas) dengan total nominal
- Filter per status + search kode booking/nama
- Highlight row merah untuk overdue

### 🐛 Bug / Masalah

1. **[KRITIS] `markAsPaid` tidak sync ke ledger keuangan** — Saat admin klik "Tandai Lunas", frontend hanya memanggil `PATCH /api/admin/installments/:id` yang update kolom `status` di tabel `installment_schedules`. **Tidak ada** pembuatan record di `bookingPayments` dan **tidak ada** sinkronisasi `bookings.status`. Akibatnya:
   - Cicilan "lunas" di menu Cicilan, tapi di Pembayaran booking masih terlihat kurang bayar
   - `financial_transactions` tidak diisi → laporan keuangan tidak akurat
   - File backend: `installments.ts` lines 74–103 — hanya `db.update(installmentSchedules).set({status})`, tidak ada `insertBookingPayment` atau `syncBookingStatus`

2. **[Minor] Logika overdue di summary card tidak konsisten dengan filter tab** — Summary card "Jatuh Tempo" menghitung: `status === "overdue" || (status === "pending" && dueDate < new Date())`. Tapi filter dropdown "Jatuh Tempo" hanya meneruskan `?status=overdue` ke backend, yang hanya akan match row dengan `status === "overdue"`. Backend tidak auto-update status ke "overdue" saat jatuh tempo, jadi filter tab "Jatuh Tempo" selalu kosong, sedangkan summary card bisa menampilkan angka.
   - File frontend: `Installments.tsx` lines 83, 163

3. **[Minor] Tidak ada konfirmasi sebelum "Tandai Lunas"** — Tombol langsung execute tanpa dialog konfirmasi. Risiko klik tidak sengaja.

4. **[Minor] Tidak ada pagination** — Semua cicilan dimuat sekaligus (`GET /api/admin/installments` tanpa limit). Kalau ratusan booking dengan masing-masing 3–6 termin cicilan, bisa ribuan baris.

### ❌ Fitur Yang Kurang
1. **Trigger reminder manual dari UI** — Endpoint `POST /api/admin/installments/send-reminders` sudah ada di backend, tapi tidak ada tombol di frontend untuk memicunya.
2. **Export Excel/CSV** — Tidak ada export daftar cicilan (berguna untuk rekap bulanan).
3. **Timeline cicilan per booking** — Saat ini flat list semua cicilan semua booking. Tidak ada view per-booking untuk melihat progress cicilan satu jamaah.
4. **Filter by tanggal jatuh tempo** — Tidak bisa filter "cicilan jatuh tempo bulan ini".

---

## 3. HPP & Profitabilitas

**File:** `artifacts/umroh-app/src/features/admin/pages/PackageCosts.tsx`  
**Backend:** `artifacts/api-server/src/routes/admin/costs.ts`

### ✅ Yang Sudah Baik
- Struktur komponen biaya lengkap (per-pax vs fixed, multi-currency)
- Kalkulasi laba bersih dengan deduction komisi agen + PIC + marketing
- Overview semua paket dalam satu tabel ringkasan
- Bulk copy biaya antar paket/keberangkatan
- Filter per kategori, jenis paket, keberangkatan

### 🐛 Bug / Masalah

1. **[Minor] N+1 API calls di overview** — `useEffect` untuk load overview memanggil `apiFetch('/api/admin/costs/profitability/:pid')` untuk **setiap** paket secara paralel (`Promise.all`). Kalau ada 30 paket aktif, ini menghasilkan 30 request serentak ke database. Pada database yang sedang sibuk bisa timeout atau overload.
   - File: `PackageCosts.tsx` lines 219–253

2. **[Minor] `toIDR` dipanggil sebelum `currencies` loaded** — `currencies` state diisi secara async, tapi fungsi `toIDR` dipakai dalam `useEffect` overview yang berjalan bersamaan. Pada render pertama, `currencies` masih `[]`, sehingga semua konversi mata uang asing menghasilkan nilai asli (tanpa konversi), dan overview menampilkan HPP yang salah sesaat.
   - File: `PackageCosts.tsx` lines 153–156 dan 219

3. **[Minor] Margin negatif tidak ada warning visual** — Kalau paket mengalami kerugian (margin < 0), tabel hanya menampilkan angka merah tapi tidak ada badge peringatan atau highlight khusus.

### ❌ Fitur Yang Kurang
1. **Export Excel per paket** — Tidak ada export breakdown HPP lengkap per paket ke Excel (berguna untuk presentasi ke manajemen).
2. **Harga jual vs HPP side-by-side** — Kolom "harga jual paket" tidak tampil di tabel overview. Admin harus buka tab lain untuk melihat harga jual, tidak bisa langsung bandingkan.
3. **History perubahan harga komponen** — Tidak ada audit trail. Kalau komponen biaya diubah, tidak ada catatan siapa yang mengubah dan kapan.

---

## 4. Akuntansi & Keuangan ⚠️ KRITIS

**File:** `artifacts/umroh-app/src/features/admin/pages/Accounting.tsx`  
**Backend:** Tidak ada (langsung ke Supabase)

### 🐛 Bug / Masalah

1. **[KRITIS] Bypass api-server — akses langsung ke Supabase** — `Accounting.tsx` mengimport `supabase` client dan memanggil `supabase.from("financial_transactions")` langsung untuk semua operasi baca/tulis. Ini **bypass seluruh business logic** di `api-server`. Konsekuensi:
   - Di environment **Replit dev** (tanpa `VITE_SUPABASE_URL`): Supabase client tidak terkonfigurasi → **semua operasi gagal**, halaman akuntansi tidak bisa digunakan sama sekali
   - Duplikasi data: `api-server` juga menulis ke `financial_transactions` otomatis saat verifikasi pembayaran (`recordFinancialTransaction`). Kalau admin juga entry manual, tidak ada deduplication
   - File: `Accounting.tsx` lines 3, 77–84 (baca) dan 121–130 (tulis)

2. **[Minor] Tidak ada filter tanggal** — Semua transaksi dimuat sekaligus. Filter hanya by tipe (masuk/keluar) dan search teks. Tidak bisa melihat transaksi bulan tertentu saja.

3. **[Minor] Kategori hardcoded** — Kategori pemasukan (`incomeCategories`) dan pengeluaran (`expenseCategories`) hardcoded di frontend (`Accounting.tsx` lines 26–44). Tidak bisa dikustomisasi per tenant. Juga berbeda dengan kategori yang dipakai di backend (`"booking_payment"`, `"refund"`) sehingga transaksi otomatis dari sistem tidak masuk ke kategori yang sama dengan entri manual.

### ❌ Fitur Yang Kurang
1. **Export laporan Laba Rugi (P&L)** — Tidak ada export ke Excel/PDF untuk laporan keuangan bulanan/tahunan formal.
2. **Rekonsiliasi otomatis** — Tidak ada fitur untuk mencocokkan transaksi keuangan manual dengan pembayaran booking yang sudah diverifikasi.
3. **Filter periode (date range)** — Harus melihat semua data sekaligus, tidak bisa lihat "keuangan bulan Januari saja".
4. **Kategori yang bisa dikustomisasi** — Setiap travel agent punya struktur akun berbeda.
5. **Laporan per kategori** — Tidak ada breakdown pengeluaran per kategori (biaya tiket berapa, hotel berapa, marketing berapa).

---

## 5. Payment Gateway

**File:** `artifacts/umroh-app/src/features/admin/pages/PaymentGateway.tsx`  
**Backend:** `artifacts/api-server/src/routes/admin/payment-gateway.ts`

### ✅ Yang Sudah Baik
- Integrasi Midtrans (bank transfer + QRIS) dan Xendit (virtual account) berfungsi
- Webhook handler sudah benar: signature verification + sync ke `bookingPayments` + `financial_transactions`
- Detail transaksi dengan VA number copyable
- Tab Transaksi + Pengaturan API terpisah

### 🐛 Bug / Masalah

1. **[KRITIS] Manual "Check Status" tidak sync ke booking/ledger** — Ketika admin klik tombol "Check Status" dan gateway mengembalikan status `paid`, backend di `POST /transactions/:id/check` (lines 258–262) hanya update kolom `status` di `payment_gateway_transactions` tapi **tidak memanggil `syncFromGatewayTransaction`**. Bandingkan dengan webhook handler yang sudah benar. Akibatnya: booking masih pending meski sudah dibayar via gateway.
   - File backend: `payment-gateway.ts` lines 217–269

2. **[Minor] Label "(Sandbox)" hardcoded di form create** — Dropdown Gateway menampilkan `"Midtrans (Sandbox)"` dan `"Xendit (Sandbox)"` hardcoded, tidak peduli `MIDTRANS_IS_PRODUCTION` env. Membingungkan di production.
   - File: `PaymentGateway.tsx` line 334: `<SelectItem value="midtrans">Midtrans (Sandbox)</SelectItem>`

3. **[Minor] Check Status hanya untuk "pending"** — Button check status tidak muncul untuk transaksi `expired` atau `cancelled`, padahal admin mungkin ingin re-check transaksi yang expired di gateway.
   - File: `PaymentGateway.tsx` line 300: `{tx.status === "pending" && (...)}`

4. **[Minor] Tidak ada pagination di daftar transaksi** — Semua transaksi dimuat sekaligus dari DB.

### ❌ Fitur Yang Kurang
1. **Auto-refresh / polling** — Tidak ada auto-refresh untuk transaksi pending. Admin harus manual klik refresh.
2. **Link ke detail booking** — Kolom "Booking" di tabel hanya menampilkan kode booking teks, tidak bisa diklik untuk navigasi ke detail booking.
3. **Filter tanggal** — Tidak bisa filter transaksi per periode.
4. **Bulk check status** — Tidak ada cara untuk check status semua transaksi pending sekaligus.

---

## 6. Dashboard Analitik

**File:** `artifacts/umroh-app/src/features/admin/pages/AnalyticsDashboard.tsx`  
**Backend:** `artifacts/api-server/src/routes/admin/analytics.ts`

### ✅ Yang Sudah Baik
- KPI cards dengan trend vs periode sebelumnya
- Trend chart pendapatan + booking (area chart)
- Pendapatan per paket (horizontal bar chart)
- Distribusi status pembayaran (donut chart)
- Distribusi status booking (progress bars)
- Keberangkatan mendatang dengan occupancy rate
- Performa paket (tabel dengan kontribusi %)

### 🐛 Bug / Masalah

1. **[KRITIS] TrendBadge "Rata-rata Booking" selalu pakai nilai pendapatan** — Komponen `TrendBadge` di KPI card "Rata-rata Booking" menghitung persentase menggunakan nilai yang salah:
   ```tsx
   // Payments.tsx line 293
   current={typeof kpi.value === "number" ? kpi.value : kpis[...kpi.label === "Total Jemaah" ? "pilgrims" : "revenue"]}
   ```
   Untuk "Rata-rata Booking", `kpi.value` adalah string format IDR (bukan number), sehingga fallback ke `kpis.revenue` (total pendapatan), bukan `kpis.avgValue`. Persentase trend "Rata-rata Booking" selalu tampil sama dengan trend "Total Pendapatan".
   - File: `AnalyticsDashboard.tsx` line 293

2. **[Minor] Tidak ada auto-refresh** — Data hanya di-fetch saat halaman dibuka atau tombol refresh diklik manual. Untuk dashboard real-time, ini kurang ideal.

### ❌ Fitur Yang Kurang
1. **Custom date range** — Hanya ada preset (7 hari, 30 hari, 3 bulan, dll). Tidak bisa pilih range spesifik misal "1 Jan – 31 Mar 2026".
2. **Export laporan ke PDF/Excel** — Tidak ada cara export data analitik dari dashboard.
3. **Target vs Aktual** — Tidak ada fitur untuk set target bulanan dan bandingkan dengan aktual.

---

## Temuan Tambahan: Reports.tsx (Laporan)

**File:** `artifacts/umroh-app/src/features/admin/pages/Reports.tsx`

**Bug KRITIS:** Sama dengan `Accounting.tsx`, halaman Laporan juga menggunakan `supabase` client langsung (line 2: `import { supabase }`) untuk semua query data booking, payments, agen. Ini bypass api-server dan tidak berfungsi di Replit dev tanpa Supabase URL.

**Backend `reports.ts`:** Hanya ada 1 endpoint: `GET /api/admin/reports/commissions.xlsx`. Tidak ada laporan keuangan, laporan booking, atau laporan penjualan.

---

## Rencana Perbaikan — Prioritas

### 🔴 PRIORITAS 1 — Bug Kritis (Segera)

| ID | Masalah | File | Estimasi |
|----|---------|------|----------|
| K-01 | Cicilan "Tandai Lunas" tidak sync ke bookingPayments + financial ledger | `installments.ts` backend | 2–3 jam |
| K-02 | Akuntansi bypass api-server (pakai supabase direct) | `Accounting.tsx` | 3–4 jam |
| K-03 | Payment Gateway manual "Check Status" tidak sync booking | `payment-gateway.ts` | 1 jam |
| K-04 | TrendBadge "Rata-rata Booking" pakai nilai pendapatan (wrong field) | `AnalyticsDashboard.tsx` | 30 menit |
| K-05 | Reports.tsx bypass api-server (pakai supabase direct) | `Reports.tsx` | 4–5 jam |

### 🟡 PRIORITAS 2 — Perbaikan Penting (Sprint Berikutnya)

| ID | Masalah | File | Estimasi |
|----|---------|------|----------|
| P-01 | Installment filter "Jatuh Tempo" selalu kosong (status tidak di-sync ke "overdue") | `installments.ts` backend + `Installments.tsx` | 2 jam |
| P-02 | Akuntansi: tambah filter tanggal (date range) | `Accounting.tsx` + backend | 2 jam |
| P-03 | Akuntansi: kategori konsisten dengan sistem (tidak hardcode) | `Accounting.tsx` | 1 jam |
| P-04 | Payment Gateway: label "(Sandbox)" harus dinamis per env | `PaymentGateway.tsx` | 30 menit |
| P-05 | Cicilan: konfirmasi dialog sebelum "Tandai Lunas" | `Installments.tsx` | 30 menit |
| P-06 | Cicilan: tambah pagination ke backend + frontend | `installments.ts` + `Installments.tsx` | 2 jam |
| P-07 | HPP: ganti N+1 overview API calls ke satu endpoint bulk | `costs.ts` + `PackageCosts.tsx` | 3 jam |

### 🟢 PRIORITAS 3 — Fitur Baru (Backlog)

| ID | Fitur | Cakupan | Estimasi |
|----|-------|---------|----------|
| F-01 | Pembayaran: filter tanggal + summary cards atas tabel | Frontend only | 2 jam |
| F-02 | Cicilan: tombol trigger reminder manual di UI | Frontend only | 1 jam |
| F-03 | Cicilan: export Excel daftar cicilan | Frontend + backend | 2 jam |
| F-04 | Akuntansi: export laporan P&L ke Excel | Frontend + backend | 4 jam |
| F-05 | Payment Gateway: link klik ke detail booking | Frontend only | 1 jam |
| F-06 | Payment Gateway: auto-refresh pending tiap 60 detik | Frontend only | 1 jam |
| F-07 | Dashboard: custom date range picker | Frontend only | 2 jam |
| F-08 | Dashboard: export PDF/Excel | Frontend + backend | 4 jam |
| F-09 | HPP: export Excel breakdown per paket | Frontend + backend | 3 jam |
| F-10 | Laporan: endpoint backend untuk laporan keuangan + booking | Backend only | 6 jam |

---

## Total Estimasi

| Prioritas | Jumlah Item | Estimasi Total |
|-----------|-------------|----------------|
| 🔴 Kritis | 5 | ~11 jam |
| 🟡 Penting | 7 | ~11 jam |
| 🟢 Backlog | 10 | ~26 jam |

**Rekomendasi urutan pengerjaan:** K-01 → K-03 → K-04 (bug kritis yang paling berdampak ke data) → K-02 + K-05 (refactor Supabase direct) → P-01 → P-02 → P-05 → F-02.
