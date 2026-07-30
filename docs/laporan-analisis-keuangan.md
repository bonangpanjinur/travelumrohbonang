# 📊 Laporan Analisis Modul Keuangan — Vins Tour Travel

**Tanggal analisis:** 30 Juli 2026  
**Scope:** Seluruh modul keuangan pada stack Express + Drizzle + React (monorepo Umroh App)  
**Metodologi:** Code review statis — tidak ada perubahan file  

---

## Ringkasan Eksekutif

| Level | Jumlah | Kategori |
|-------|--------|----------|
| 🔴 **P0 — Risiko finansial langsung** | 7 bug | Overpayment kumulatif, refund melebihi pembayaran, tabungan race condition, double-entry tidak terjaga |
| 🟠 **P1 — Integritas data** | 11 bug | Concurrency tanpa lock, file storage tidak aman, PII plaintext, FK/constraint hilang |
| 🟡 **P2 — Kualitas & UX** | 6 bug | Timezone laporan, data stale di frontend, komisi duplikat |

---

## 1. Pembayaran Manual & Payment Gateway

**File utama:**
- `artifacts/api-server/src/routes/admin/payments.ts`
- `artifacts/api-server/src/routes/admin/payment-gateway.ts`
- `artifacts/api-server/src/routes/payment-gateway-webhooks.ts`
- `artifacts/umroh-app/src/features/admin/pages/Payments.tsx`
- `artifacts/umroh-app/src/features/booking/pages/Payment.tsx`

### ✅ Yang Sudah Berjalan
- Upload bukti pembayaran, daftar/filter/export
- Verifikasi & reject manual, bulk verify
- Auto-journal dan notifikasi setelah verifikasi
- Integrasi Midtrans/Xendit, webhook signature check
- Pembuatan `booking_payments`, sinkronisasi status booking

### 🐛 Bug & Masalah

| Prioritas | Masalah | Lokasi | Dampak |
|-----------|---------|--------|--------|
| 🔴 P0 | Validasi nominal hanya cek `amount > totalPrice`, **bukan** sisa setelah semua payment verified/pending sebelumnya | `payments.ts` ~681 | Kumulatif pembayaran bisa melebihi harga — overpayment |
| 🟠 P1 | Verifikasi manual tidak menggunakan transaction DB + row lock; dua admin bisa verifikasi bersamaan | `payments.ts` ~247–273 | Jurnal & status booking duplikat |
| 🟠 P1 | Bukti pembayaran disimpan di **filesystem lokal** (bukan object storage) | `payments.ts` ~72–96 | File hilang saat redeploy; potensi akses tanpa auth jika scope mount tidak tepat |
| 🟠 P1 | Frontend `Payment.tsx` menghitung progress pembayaran dari data client, bukan dari DB | `Payment.tsx` ~113–116 | Race condition & manipulasi nominal dari browser |
| 🟡 P2 | Model `payments` dan `booking_payments` terpisah tanpa idempotensi kuat antar keduanya | Schema | Rekonsiliasi dan audit rawan divergen |

---

## 2. Refund

**File utama:**
- `artifacts/api-server/src/routes/admin/refunds.ts`
- `artifacts/umroh-app/src/features/admin/pages/Refunds.tsx`
- `artifacts/umroh-app/src/features/booking/pages/RefundRequest.tsx`

### ✅ Yang Sudah Berjalan
- Pengajuan refund oleh jamaah
- Daftar refund di admin, transisi status approved/rejected/refunded
- Audit log di UI
- Auto-jurnal saat refund diapproved

### 🐛 Bug & Masalah

| Prioritas | Masalah | Lokasi | Dampak |
|-----------|---------|--------|--------|
| 🔴 P0 | Admin `POST /refunds` tidak memvalidasi bahwa amount ≤ total yang sudah dibayar; tidak cek refund sebelumnya yang pending/approved | `admin/refunds.ts` | Refund melebihi jumlah yang sudah dibayar jamaah |
| 🔴 P0 | PATCH status refund tidak menggunakan state-machine ketat (bisa transisi dari `refunded` → `approved`); update + jurnal tidak dalam satu transaksi DB | `admin/refunds.ts` ~78–107 | Pengeluaran ganda / status bisa mundur |
| 🟠 P1 | Tidak ada concurrency lock — dua admin bisa klik "Proses Refund" bersamaan | `admin/refunds.ts` | Transfer keluar ganda |
| 🟠 P1 | Data rekening bank (nomor rekening, nama pemilik) disimpan plaintext di tabel `refund_requests` | Schema | Risiko PII bocor via query tanpa masking/enkripsi |

---

## 3. Cicilan (Installment)

**File utama:**
- `artifacts/api-server/src/routes/admin/installments.ts`
- `artifacts/api-server/src/routes/bookings.ts` (bagian cicilan, ~745–963)
- `artifacts/umroh-app/src/features/booking/components/InstallmentSchedule.tsx`
- `artifacts/umroh-app/src/features/booking/components/InstallmentCalculator.tsx`
- `lib/db/src/schema/payments.ts` (tabel `installment_schedules`)

### ✅ Yang Sudah Berjalan
- Jadwal cicilan otomatis dibuatkan saat booking dengan scheme DP/cicilan
- Overdue sync harian via cron
- Reminder otomatis, admin bisa tandai lunas manual
- Pembayaran cicilan via Midtrans/Xendit dengan virtual account
- Progress bar di frontend jamaah

### 🐛 Bug & Masalah

| Prioritas | Masalah | Lokasi | Dampak |
|-----------|---------|--------|--------|
| 🔴 P0 | Bayar cicilan tidak memvalidasi apakah cicilan dengan nomor lebih kecil sudah lunas — jamaah bisa bayar cicilan ke-3 sebelum ke-1 & ke-2 | `bookings.ts` ~820 | Urutan pembayaran tidak terkontrol; saldo tidak cocok |
| 🟠 P1 | Tidak ada idempotency key pada callback gateway — webhook bisa trigger pembayaran cicilan dua kali untuk transaksi yang sama | `payment-gateway-webhooks.ts` | Kelebihan pembayaran cicilan tercatat |
| 🟠 P1 | Nominal cicilan dihitung saat booking dibuat; jika `totalPrice` berubah (upgrade kamar, perubahan admin), schedule lama tidak di-recalculate | `lib/installments.ts` | Total cicilan tidak cocok dengan harga aktual |
| 🟡 P2 | Status cicilan bisa diupdate dari dua jalur (admin manual & webhook gateway) tanpa sinkronisasi/lock | `admin/installments.ts` + `webhooks.ts` | Ketidakkonsistenan status jadwal |

---

## 4. Tabungan Umroh (Savings)

**File utama:**
- `artifacts/api-server/src/routes/savings.ts` (publik)
- `artifacts/api-server/src/routes/admin/savings.ts`
- `artifacts/umroh-app/src/features/booking/pages/MySavings.tsx`

### ✅ Yang Sudah Berjalan
- Buka rekening tabungan, setor saldo
- Cek saldo dan histori transaksi
- Penggunaan saldo untuk booking
- Laporan tabungan di admin

### 🐛 Bug & Masalah

| Prioritas | Masalah | Lokasi | Dampak |
|-----------|---------|--------|--------|
| 🔴 P0 | `POST /savings/:id/use` — baca saldo lalu kurangi tanpa row lock / transaksi DB atomik | `savings.ts` | Race condition: dua request bersamaan bisa pakai saldo yang sama dua kali (double spending) |
| 🔴 P0 | Tidak ada validasi kepemilikan rekening — user A bisa menggunakan saldo rekening user B jika tahu ID-nya | `savings.ts` | Pencurian saldo tabungan |
| 🟠 P1 | Tidak ada pengecekan status rekening (aktif/ditutup/dibekukan) sebelum memproses transaksi | `savings.ts` | Transaksi masuk ke rekening non-aktif |
| 🟡 P2 | Progress persentase target di frontend dihitung dari data client, bukan dari ledger di DB | `MySavings.tsx` ~268–273 | Tampilan bisa menyesatkan bila ledger tidak konsisten |

---

## 5. Akuntansi, Ledger, Chart of Accounts & Laporan Keuangan

**File utama:**
- `artifacts/api-server/src/routes/admin/accounting.ts`
- `artifacts/api-server/src/routes/admin/finance.ts`
- `artifacts/api-server/src/routes/admin/reports.ts`
- `artifacts/api-server/src/routes/admin/coa.ts`
- `artifacts/api-server/src/routes/admin/bank-reconciliation.ts`
- `artifacts/api-server/src/routes/admin/budget.ts`
- `artifacts/api-server/src/routes/admin/costs.ts`
- `artifacts/umroh-app/src/features/admin/pages/Accounting.tsx`
- `artifacts/umroh-app/src/features/admin/pages/FinancialReports.tsx`
- `artifacts/umroh-app/src/features/admin/pages/FinanceDashboard.tsx`

### ✅ Yang Sudah Berjalan
- CRUD jurnal keuangan, Chart of Accounts
- Dashboard piutang dan cashflow
- Income statement, neraca, cash flow, summary PPh, cost-vs-actual
- Export PDF & XLSX
- Matching mutasi bank manual
- Anggaran (budget) dan biaya per keberangkatan
- Auto-jurnal saat payment diverifikasi dan refund diapproved

### 🐛 Bug & Masalah

| Prioritas | Masalah | Lokasi | Dampak |
|-----------|---------|--------|--------|
| 🔴 P0 | `POST/PATCH/DELETE /financial-transactions` tidak memvalidasi prinsip **double-entry** (total debit harus = total kredit); tidak ada penguncian periode akuntansi | `admin/accounting.ts` | Ledger bisa tidak balance; laporan keuangan tidak dapat diaudit/dipertanggungjawabkan |
| 🟠 P1 | Schema `financial_transactions` tidak ada constraint debit/kredit/akun di level DB; CoA `code` hanya indexed tapi tidak `UNIQUE` | `lib/db/src/schema/accounting.ts` | Akun duplikat, jurnal ambigu, nilai CoA tidak konsisten |
| 🟠 P1 | Auto-jurnal (payment, refund, settlement) tidak selalu berjalan dalam satu transaksi DB yang sama dengan event pemicunya | Beberapa handler | Penerimaan tercatat di payment tapi hilang dari ledger, atau sebaliknya |
| 🟠 P1 | Bank matching: field `matchedTo` hanya text bebas tanpa FK dan tanpa unique constraint | `admin/bank-reconciliation.ts` | Satu mutasi bank bisa di-match ke dua transaksi berbeda — saldo rekonsiliasi salah |
| 🟡 P2 | Laporan bergantung pada `financial_transactions` yang sudah diposting; UI menampilkan peringatan manual "pastikan jurnal payment sudah diposting" | `FinancialReports.tsx` ~106 | Laporan kosong/tidak lengkap jika auto-jurnal gagal tanpa diketahui |
| 🟡 P2 | Filter tanggal di beberapa query tidak konsisten timezone; end-date bisa off-by-one | `admin/finance.ts` ~1181–1386 | Angka periode bisa meleset satu hari |

---

## 6. Komisi Agen

**File utama:**
- `artifacts/api-server/src/routes/admin/reports.ts`
- `artifacts/umroh-app/src/features/agent/pages/AgentCommissions.tsx`
- `artifacts/umroh-app/src/features/admin/components/CommissionReport.tsx`
- `lib/db/src/schema/agents.ts`

### ✅ Yang Sudah Berjalan
- Pencatatan komisi per booking
- Withdrawal request oleh agen
- Laporan XLSX komisi
- UI histori komisi dan status withdrawal agen

### 🐛 Bug & Masalah

| Prioritas | Masalah | Lokasi | Dampak |
|-----------|---------|--------|--------|
| 🟠 P1 | `agentCommissions.amount` tidak ada constraint positif di DB; tidak ada unique constraint kombinasi booking-agent | `agents.ts` | Komisi bisa bernilai negatif atau dicatat dua kali untuk satu booking |
| 🟠 P1 | `agents.userId` sengaja tanpa FK ke tabel users (didokumentasikan di schema) | `agents.ts` ~11, 29 | Komisi bisa terkait user yang sudah dihapus tanpa cascade/cleanup |
| 🟡 P2 | Status commission dan withdrawal adalah text bebas tanpa enum/state-machine di DB | `agents.ts` | Transisi `paid` → `pending` bisa dilakukan tanpa audit yang kuat |

---

## 🔐 Catatan Keamanan Lintas Modul

| Temuan | Area | Risiko |
|--------|------|--------|
| Route `admin/refunds.ts` tidak memanggil middleware auth secara eksplisit di file-nya — keamanan bergantung sepenuhnya pada mounting di `routes/index.ts` | Refund admin | Jika mounting berubah, endpoint bisa terbuka tanpa auth |
| Beberapa endpoint admin keuangan perlu diverifikasi bahwa sudah memanggil `requireAuth` + role check | Finance, CoA, Accounting | Akses data keuangan tanpa autentikasi |
| Data rekening bank (nomor rekening, nama pemilik) disimpan plaintext | Refund | PII bocor via SQL dump / akses DB langsung |
| Bukti pembayaran di filesystem lokal tanpa auth middleware eksplisit di endpoint `/proof-files/:filename` | Payment proofs | Akses bukti tanpa login jika URL diketahui |

---

## 📋 Roadmap Perbaikan yang Disarankan

### Fase 1 — Segera (P0, risiko finansial langsung)
1. Hitung sisa hutang dari verified+pending payments dalam DB transaction + row lock sebelum menerima payment baru
2. Validasi refund: amount ≤ total yang sudah dibayar; cek refund pending yang sudah ada; state-machine ketat
3. `savings.use` — row lock + transaction atomik + validasi kepemilikan
4. Validasi urutan cicilan (cicilan ke-N hanya bisa dibayar setelah ke-(N-1) lunas)
5. Tambah double-entry validation di endpoint akuntansi + kunci periode

### Fase 2 — Jangka Menengah (P1, integritas data)
6. Idempotency key untuk semua webhook gateway (payment & cicilan)
7. Pindahkan file bukti ke object storage (Supabase Storage / S3)
8. Tambah FK, unique constraint, dan check constraint yang hilang di schema DB
9. Semua auto-jurnal dalam satu transaksi DB dengan event pemicunya
10. Bank matching: tambah FK + unique constraint pada `matchedTo`
11. Audit & pastikan semua route admin keuangan terlindungi `requireAuth` + role check
12. Masking/enkripsi data rekening bank di tabel refund

### Fase 3 — Kualitas (P2)
13. Konsistensi timezone untuk filter tanggal laporan
14. Konsolidasi model `payments` vs `booking_payments`
15. Rekonsiliasi otomatis (scheduled job)
16. Status commission/withdrawal jadi enum di DB

---

*Laporan ini dihasilkan dari code review statis pada 30 Juli 2026. Tidak ada perubahan kode yang dilakukan.*
