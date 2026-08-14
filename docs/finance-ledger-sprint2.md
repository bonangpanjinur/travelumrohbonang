# Sprint 2 — Ledger dan Reporting

Sprint 2 memperbaiki cara aplikasi membaca financial ledger dan payment ledger. Perubahan ini tidak mengubah transaksi historis secara otomatis; perubahan hanya memperbaiki posting baru dan cara laporan mengagregasikan data.

## Aturan Pelaporan

| Komponen | Aturan yang digunakan |
|---|---|
| Pendapatan pada income statement | Hanya baris `income` dengan `entry_type = credit`; legacy row tanpa `entry_type` tetap dibaca sebagai satu baris |
| Beban pada income statement | Hanya baris `expense` atau `cost` dengan `entry_type = debit`; legacy row tanpa `entry_type` tetap dibaca sebagai satu baris |
| Cash inflow | Payment aktif dari `booking_payments`, bukan kedua sisi jurnal |
| Cash outflow | Financial transaction expense/cost pada sisi debit |
| Booking lunas | Total payment aktif minimal sama dengan `bookings.total_price` |
| Profitabilitas | Booking dianggap paid berdasarkan payment ledger aktif, bukan hanya `bookings.status = 'paid'` |
| Marketing cost per package | Dialokasikan berdasarkan proporsi omzet booking lunas per package agar biaya global tidak dikalikan penuh ke setiap package |
| Budget income multi-kategori | Tidak dipaksa ke kategori income pertama; ditampilkan sebagai `unallocatedIncome` karena data transaksi belum memiliki dimensi budget category yang dapat dipercaya |

## Period Lock

Auto-journal pembayaran dan financial transaction gateway sekarang memeriksa `accounting_periods`. Jika periode transaksi berstatus `closed`, posting otomatis ditolak. Jika baris accounting period belum dibuat, perilaku tetap kompatibel dengan sistem lama dan transaksi diizinkan.

## Cash Flow Forecast

Saldo booking outstanding yang jatuh tempo pada bulan keberangkatan dikurangi cicilan pending yang jatuh tempo sebelum keberangkatan. Hal ini mencegah cicilan yang sama dihitung sebagai proyeksi cicilan sekaligus pelunasan menjelang keberangkatan.

## Batasan dan Rekonsiliasi

Laporan tetap memerlukan rekonsiliasi terhadap bank statement, settlement gateway, dan dokumen biaya vendor. Legacy financial transaction tanpa `entry_type` masih diperbolehkan untuk backward compatibility, tetapi perlu dimigrasikan secara bertahap. `unallocatedIncome` menunjukkan bahwa budget income perlu memiliki dimensi kategori atau cost center agar variance per kategori dapat dianggap akurat.
