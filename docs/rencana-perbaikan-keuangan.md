# 🛠️ Rencana Perbaikan Modul Keuangan — Vins Tour Travel

**Dibuat:** 30 Juli 2026  
**Berdasarkan:** [Laporan Analisis Modul Keuangan](./laporan-analisis-keuangan.md)  
**Total item:** 16 perbaikan dalam 3 fase  

---

## Peta Prioritas

```
FASE 1 (P0) ──► FASE 2 (P1) ──► FASE 3 (P2)
  Segera           Jangka          Kualitas &
  (minggu 1)       Menengah        Pemeliharaan
                   (minggu 2–4)    (bulan 2+)
```

| Fase | Label | Fokus | Jumlah item |
|------|-------|-------|-------------|
| 1 | 🔴 Segera | Risiko finansial langsung — uang bisa hilang/salah | 5 |
| 2 | 🟠 Menengah | Integritas data — data bisa tidak konsisten | 7 |
| 3 | 🟡 Kualitas | UX, pemeliharaan, keamanan lanjutan | 4 |

---

## FASE 1 — Risiko Finansial Langsung 🔴

> **Target:** Selesai dalam 1 minggu pertama.  
> Semua item di fase ini berpotensi menyebabkan kerugian uang nyata.

### F1-01 · Validasi sisa pembayaran (overpayment prevention)

**Modul:** Pembayaran manual & payment gateway  
**Masalah:** `POST /api/bookings/:id/payments` hanya cek `amount > totalPrice`, bukan sisa setelah semua payment verified/pending sebelumnya.  
**Perbaikan:**
- Sebelum insert payment baru, query SUM semua payment dengan status `verified` + `pending` untuk booking tersebut
- Hitung `sisaHutang = totalPrice - totalSudahDibayar`
- Tolak jika `amount > sisaHutang`
- Seluruh operasi dalam satu DB transaction

**File:** `artifacts/api-server/src/routes/bookings.ts` (POST `/:id/payments`)  
**Estimasi:** 0.5 hari

---

### F1-02 · Tabungan: row lock + validasi kepemilikan

**Modul:** Tabungan Umroh  
**Masalah:** `POST /savings/:id/use` membaca saldo lalu mengurangi tanpa row lock; tidak ada cek kepemilikan.  
**Perbaikan:**
- Gunakan `SELECT ... FOR UPDATE` (Drizzle: `.for('update')`) dalam transaksi sebelum membaca saldo
- Tambah `WHERE userId = req.user.id` pada query rekening
- Cek status rekening (`active`) sebelum memproses
- Seluruh debit saldo + insert ledger dalam satu transaksi

**File:** `artifacts/api-server/src/routes/savings.ts`  
**Estimasi:** 0.5 hari

---

### F1-03 · Refund: validasi server-side lengkap + state-machine

**Modul:** Refund  
**Masalah:** Admin `POST/PATCH /refunds` tidak validasi amount ≤ paid; tidak ada state-machine; duplikat refund bisa masuk.  
**Perbaikan:**
- `POST`: Hitung total pembayaran verified untuk booking; tolak jika `amount > totalVerified`
- `POST`: Cek tidak ada refund pending/approved untuk booking yang sama
- `PATCH`: Terapkan state-machine: `pending → approved → refunded` atau `pending → rejected`; transisi lain ditolak
- `PATCH`: Bungkus update status + insert jurnal dalam satu transaksi DB

**File:** `artifacts/api-server/src/routes/admin/refunds.ts`  
**Estimasi:** 1 hari

---

### F1-04 · Cicilan: paksa urutan pembayaran

**Modul:** Cicilan (Installment)  
**Masalah:** Jamaah bisa bayar cicilan ke-3 sebelum ke-1 dan ke-2 lunas.  
**Perbaikan:**
- Sebelum memproses pembayaran cicilan nomor `N`, query apakah semua cicilan dengan `installmentNumber < N` sudah berstatus `paid`
- Jika belum, kembalikan error 409 dengan pesan cicilan mana yang harus dibayar dulu

**File:** `artifacts/api-server/src/routes/bookings.ts` (POST `/:id/installments/:n/pay`)  
**Estimasi:** 0.5 hari

---

### F1-05 · Akuntansi: validasi double-entry + kunci periode

**Modul:** Akuntansi & Ledger  
**Masalah:** `POST/PATCH /financial-transactions` tidak memvalidasi debit = kredit; tidak ada penguncian periode akuntansi.  
**Perbaikan:**
- Tambah validasi: `SUM(debit) === SUM(kredit)` di semua entry sebelum insert/update
- Tambah tabel `accounting_periods` (bulan/tahun, status: `open`/`closed`)
- Tolak insert/update/delete jika tanggal transaksi jatuh di periode `closed`
- Endpoint admin untuk menutup/membuka periode

**File:** `artifacts/api-server/src/routes/admin/accounting.ts`; schema baru `lib/db/src/schema/accounting.ts`  
**Estimasi:** 1.5 hari

---

## FASE 2 — Integritas Data 🟠

> **Target:** Selesai dalam 2–4 minggu.  
> Item ini mencegah data tidak konsisten yang sulit dideteksi dan lama kelamaan merusak laporan.

### F2-01 · Idempotency key untuk webhook gateway

**Modul:** Payment gateway webhook  
**Masalah:** Callback dari Midtrans/Xendit bisa dikirim lebih dari satu kali; tidak ada idempotency guard.  
**Perbaikan:**
- Tambah kolom `idempotencyKey` (unique) di tabel `booking_payments` / `installment_schedules`
- Sebelum proses webhook, cek apakah `idempotencyKey` sudah ada; jika ya, return 200 tanpa proses ulang
- Key = `{gateway}:{orderId}:{event}`

**File:** `artifacts/api-server/src/routes/payment-gateway-webhooks.ts`; migration schema  
**Estimasi:** 1 hari

---

### F2-02 · Pindahkan bukti pembayaran ke object storage

**Modul:** Pembayaran  
**Masalah:** Bukti pembayaran disimpan di filesystem lokal — hilang saat redeploy.  
**Perbaikan:**
- Gunakan Supabase Storage (bucket `payment-proofs`) via object storage skill
- Upload endpoint simpan file ke Supabase Storage, simpan URL di DB
- Endpoint akses bukti redirect ke signed URL Supabase (TTL 1 jam)
- Endpoint auth-gated: hanya admin atau pemilik booking

**File:** `artifacts/api-server/src/routes/admin/payments.ts`, `artifacts/api-server/src/lib/paymentProofs.ts`  
**Estimasi:** 1 hari

---

### F2-03 · Auto-jurnal dalam transaksi yang sama dengan event pemicunya

**Modul:** Akuntansi  
**Masalah:** Auto-jurnal (payment verified, refund approved) berjalan di query terpisah setelah update status, bisa gagal tanpa rollback.  
**Perbaikan:**
- Refaktor semua handler yang memanggil `insertJurnal()` setelah update status: bungkus keduanya dalam `db.transaction()`
- Jika jurnal gagal, seluruh operasi rollback — status tidak berubah

**File:** `admin/payments.ts`, `admin/refunds.ts`, `admin/installments.ts`  
**Estimasi:** 1 hari

---

### F2-04 · Constraint DB: CoA unique, komisi positif, bank matching FK

**Modul:** Akuntansi, Komisi, Rekonsiliasi Bank  
**Masalah:** Beberapa constraint penting hilang di level database.  
**Perbaikan (1 migration):**
- CoA: `code` jadi `UNIQUE NOT NULL`
- `agent_commissions.amount`: tambah `CHECK (amount >= 0)`
- `agent_commissions`: tambah unique constraint `(booking_id, agent_id)`
- Bank reconciliation `matchedTo`: ubah jadi FK ke `financial_transactions.id` + `UNIQUE`

**File:** Migration SQL baru di `supabase/migrations/`  
**Estimasi:** 0.5 hari

---

### F2-05 · Verifikasi pembayaran: transaction + concurrency lock

**Modul:** Pembayaran admin  
**Masalah:** Dua admin bisa verifikasi payment yang sama bersamaan — duplikat jurnal & status.  
**Perbaikan:**
- Endpoint `PATCH /verify/:id`: tambah `SELECT ... FOR UPDATE` pada `booking_payments` sebelum update
- Cek status saat ini = `pending` sebelum lanjut; jika bukan, return 409
- Update status + insert jurnal dalam satu transaksi

**File:** `artifacts/api-server/src/routes/admin/payments.ts`  
**Estimasi:** 0.5 hari

---

### F2-06 · Audit & pastikan semua route admin keuangan terlindungi auth

**Modul:** Semua route admin keuangan  
**Masalah:** Beberapa file route tidak memanggil middleware auth secara eksplisit (bergantung pada mounting).  
**Perbaikan:**
- Audit semua file: `admin/refunds.ts`, `admin/finance.ts`, `admin/accounting.ts`, `admin/coa.ts`, `admin/bank-reconciliation.ts`, `admin/budget.ts`, `admin/costs.ts`, `admin/savings.ts`
- Pastikan setiap router menggunakan `requireAuth` + `requireRole('admin')` atau dipastikan mount-nya sudah terlindungi
- Dokumentasikan di masing-masing file

**File:** Semua file route admin keuangan  
**Estimasi:** 0.5 hari

---

### F2-07 · Masking data rekening bank di refund

**Modul:** Refund  
**Masalah:** Nomor rekening dan nama pemilik rekening disimpan plaintext, bisa bocor via API.  
**Perbaikan:**
- Endpoint `GET /refunds` (list): hilangkan `bankAccount` dari response atau mask menjadi `****1234`
- Endpoint `GET /refunds/:id` (detail): tampilkan lengkap hanya untuk admin dengan role tertentu
- Dokumentasikan kebijakan akses di kode

**File:** `artifacts/api-server/src/routes/admin/refunds.ts`  
**Estimasi:** 0.5 hari

---

## FASE 3 — Kualitas & Pemeliharaan 🟡

> **Target:** Bulan kedua ke atas.  
> Item ini meningkatkan keandalan jangka panjang dan kenyamanan operasional.

### F3-01 · Konsistensi timezone untuk filter tanggal laporan

**Modul:** Laporan keuangan  
**Masalah:** Filter tanggal di beberapa query tidak konsisten timezone — angka bisa off-by-one hari.  
**Perbaikan:**
- Standarkan semua filter tanggal ke UTC atau WIB (UTC+7) secara eksplisit
- Helper function `toStartOfDayWIB(date)` dan `toEndOfDayWIB(date)` yang dipakai konsisten
- Tambah unit test untuk kasus batas hari

**File:** `admin/finance.ts`, `admin/reports.ts`  
**Estimasi:** 0.5 hari

---

### F3-02 · Konsolidasi model `payments` vs `booking_payments`

**Modul:** Pembayaran  
**Masalah:** Dua tabel menyimpan data pembayaran yang sebagian tumpang tindih tanpa idempotensi kuat.  
**Perbaikan:**
- Audit mana yang menjadi "sumber kebenaran" (source of truth)
- Tambah unique constraint atau FK antara keduanya
- Atau: migrasi ke satu model jika memang redundan (butuh analisis lebih dalam)

**File:** Schema, migration, routes payment  
**Estimasi:** 2 hari (termasuk analisis)

---

### F3-03 · Rekonsiliasi otomatis (scheduled job)

**Modul:** Rekonsiliasi Bank  
**Masalah:** Matching mutasi bank saat ini manual 100%.  
**Perbaikan:**
- Cron harian: match mutasi bank berdasarkan nominal + tanggal ± 1 hari terhadap `booking_payments` yang belum di-match
- Flag kandidat match dengan confidence score; admin cukup konfirmasi
- Log semua auto-match untuk audit

**File:** Cron baru di `artifacts/api-server/src/cron/`; `admin/bank-reconciliation.ts`  
**Estimasi:** 2 hari

---

### F3-04 · Status komisi & withdrawal jadi enum di DB

**Modul:** Komisi Agen  
**Masalah:** Status komisi dan withdrawal adalah text bebas tanpa enum.  
**Perbaikan:**
- Tambah enum type `commission_status` dan `withdrawal_status` di Drizzle schema
- Migration dengan `ALTER TYPE` / cast kolom existing
- Validasi di endpoint sebelum update status

**File:** `lib/db/src/schema/agents.ts`; migration SQL; `admin/reports.ts`  
**Estimasi:** 0.5 hari

---

## Ringkasan Estimasi

| Fase | Item | Total Estimasi |
|------|------|---------------|
| Fase 1 🔴 | 5 item | ~4 hari |
| Fase 2 🟠 | 7 item | ~5 hari |
| Fase 3 🟡 | 4 item | ~5 hari |
| **Total** | **16 item** | **~14 hari kerja** |

---

## Dependensi Antar Item

```
F1-01 (sisa payment) ──► F2-05 (lock verifikasi) — saling melengkapi
F1-05 (double-entry) ──► F2-03 (auto-jurnal atomic) — harus berurutan
F2-01 (idempotency) ──► F2-03 (auto-jurnal atomic) — paralel boleh
F2-04 (constraint DB) ──► bebas, bisa paralel dengan apapun
F3-02 (konsolidasi payment) ──► sebaiknya setelah F1-01 + F2-05 selesai
```

---

*Rencana ini mengacu pada laporan analisis tanggal 30 Juli 2026. Estimasi bisa berubah setelah implementasi dimulai dan detail kode diperiksa lebih dalam.*
