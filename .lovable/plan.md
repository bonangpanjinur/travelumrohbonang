# Konsistensi Keuangan: Hanya Uang Masuk yang Dihitung

## Jawaban singkat
Booking yang belum dikonfirmasi pembayarannya **tidak boleh** menambah pendapatan (revenue/kas/laba). Booking seperti itu hanya boleh muncul sebagai **potensi/piutang (AR)**. Aturannya sama persis dengan aturan kursi yang baru: sumber kebenaran adalah pembayaran tercatat & tidak di-void di `booking_payments`.

## Aturan baku (dipakai semua modul)
```text
Uang Masuk (revenue kas) = SUM(booking_payments.amount) WHERE is_voided = false
Potensi Pendapatan       = SUM(bookings.total_price) untuk booking aktif (bukan cancelled)
Piutang (AR)             = Potensi - Uang Masuk
Kursi terpakai           = booking dengan Uang Masuk > 0 (sudah berlaku)
```

## Kondisi saat ini
- Sudah benar (basis kas): dashboard analytics, tren pendapatan, revenue per paket/cabang, laporan arus kas, `financial_transactions` (dicatat saat pembayaran disetujui).
- Masih rancu:
  1. Halaman HPP & Profitabilitas menghitung `revenue` dari `total_price` booking berstatus "paid", bukan dari uang yang benar-benar masuk. Booking DP/belum lunas ikut dihitung penuh, sehingga laba & margin terlalu besar.
  2. Ringkasan keuangan per keberangkatan memakai label `target_revenue` yang di UI kadang tampil seperti "Pendapatan", padahal itu potensi.
  3. Komisi agen dibuat saat status booking menjadi `paid`, bukan saat pembayaran benar-benar diverifikasi — bisa memunculkan beban komisi atas uang yang belum masuk.

## Rencana perbaikan

### Tahap 1 — Perbaiki dasar perhitungan HPP & Profitabilitas
- Ubah sumber `revenue` di halaman HPP menjadi total pembayaran non-void per booking (bukan `total_price`).
- Tampilkan dua kolom terpisah: **Revenue Diterima** dan **Potensi (Belum Tertagih)**, plus **Margin (kas)**.
- `sold_pax` dihitung dari booking yang punya pembayaran > 0, agar konsisten dengan aturan kursi.

### Tahap 2 — Penegasan istilah di seluruh UI keuangan
- Ganti label ambigu: `target_revenue` → "Potensi Pendapatan", `collected` → "Sudah Diterima", `outstanding` → "Piutang".
- Tambahkan keterangan kecil pada kartu ringkasan: "Berdasarkan pembayaran terverifikasi".

### Tahap 3 — Komisi agen mengikuti uang masuk
- Pindahkan pemicu komisi dari perubahan status booking ke pencatatan/persetujuan pembayaran.
- Opsi perhitungan: komisi proporsional terhadap porsi yang sudah dibayar, atau baru terbit saat lunas. Perlu keputusan pemilik bisnis.

### Tahap 4 — Verifikasi
- Uji skenario: booking baru tanpa bayar (revenue 0, kursi tetap, muncul di piutang), DP 30% (revenue 30%, kursi berkurang), lunas, void pembayaran, dan pembatalan.
- Cek angka dashboard, laporan keuangan, HPP, dan keberangkatan saling cocok.

## Catatan teknis
- Helper kondisi bayar dipusatkan seperti `PAID_SEAT_CONDITION` di `artifacts/api-server/src/lib/seatQuota.ts`; dibuat helper serupa untuk keuangan agar tidak ada query yang menghitung sendiri.
- Titik sentuh utama: `routes/admin/finance.ts`, `routes/admin/costs.ts`, `features/admin/pages/PackageCosts.tsx`, `features/admin/pages/DepartureFinance.tsx`, trigger `create_agent_commission_on_paid`.

## Perlu keputusan Anda
Untuk komisi agen (Tahap 3): terbit proporsional mengikuti pembayaran, atau hanya saat booking lunas?
