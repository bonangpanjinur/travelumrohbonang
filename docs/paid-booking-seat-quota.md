# Seat Hanya Berkurang Setelah Bayar

## What & Why
Perbaiki aturan kuota keberangkatan agar booking yang baru dibuat tetapi belum memiliki pembayaran terverifikasi tidak mengurangi seat. Dengan begitu, jadwal berkuota 45 tetap menampilkan 45 seat ketika baru ada satu booking unpaid, dan baru berkurang setelah pembayaran yang sah tercatat.

## Done looks like
- Booking baru berstatus draft/pending/unpaid tidak mengurangi `remainingQuota`.
- Pembayaran yang sudah terverifikasi atau gateway yang berstatus paid mengurangi seat sesuai `paxCount` booking, termasuk booking grup.
- Pembayaran pending, ditolak, dibatalkan, atau di-void tidak mengurangi seat.
- Pembatalan booking atau pembatalan/void pembayaran mengembalikan seat melalui hitungan ulang.
- Endpoint publik jadwal, detail paket, endpoint admin keberangkatan, dialog pemilihan jadwal, dan dashboard analytics menampilkan angka yang konsisten.
- Status penuh hanya muncul ketika seat terbayar benar-benar mencapai quota; booking unpaid tidak membuat jadwal terlihat penuh.
- Ada pengujian regresi untuk kasus 45 seat + 1 booking unpaid = 45 seat, pembayaran terverifikasi mengurangi sesuai jumlah pax, dan pembayaran dibatalkan mengembalikan seat.

## Out of scope
- Mengubah struktur database atau memindahkan tabel booking/pembayaran.
- Mengubah kebijakan bisnis apakah pembayaran DP sudah cukup untuk mengunci seat; implementasi mengikuti definisi pembayaran sah yang telah dipakai sistem, yaitu pembayaran non-void yang tercatat/terverifikasi atau status booking paid/confirmed.
- Mengubah tampilan atau alur checkout di luar informasi kuota yang ditampilkan.

## Steps
1. **Tetapkan satu aturan seat terbayar** -- Audit semua jalur pembacaan dan penulisan kuota agar memakai kondisi yang sama: booking cancelled, pembayaran pending/rejected/void, dan booking tanpa pembayaran tidak dihitung; pembayaran sah dihitung berdasarkan `paxCount`.
2. **Perbaiki seluruh jalur sinkronisasi** -- Pastikan pembuatan booking unpaid tidak mengurangi kuota, verifikasi pembayaran dan pembayaran gateway memicu sinkronisasi, serta pembatalan/void/reversal memicu sinkronisasi pengembalian seat.
3. **Samakan endpoint dan laporan** -- Ganti perhitungan yang masih memakai `remaining_quota` tersimpan secara langsung dengan hasil perhitungan real-time dari booking terbayar, termasuk analytics dan data admin yang menampilkan booked/remaining.
4. **Tambahkan pengujian regresi** -- Uji booking single dan grup, pembayaran manual dan gateway, status unpaid/paid/rejected/void/cancelled, serta validasi bahwa kondisi penuh dan filter minQuota memakai seat terbayar saja.
5. **Verifikasi di UI** -- Pastikan jadwal publik, kartu/detail paket, daftar keberangkatan admin, dan dashboard menampilkan angka yang sama setelah status pembayaran berubah.

## Relevant files
- `artifacts/api-server/src/lib/seatQuota.ts`
- `artifacts/api-server/src/routes/bookings.ts:400-490`
- `artifacts/api-server/src/routes/packages.ts:28-40,441-517,519-549`
- `artifacts/api-server/src/routes/admin/departures.ts:50-188`
- `artifacts/api-server/src/lib/paymentSync.ts:76-123`
- `artifacts/api-server/src/routes/admin/payments.ts:450-533`
- `artifacts/api-server/src/routes/admin/installments.ts:134-221`
- `artifacts/api-server/src/routes/admin/analytics.ts:163-214`
- `lib/db/src/schema/bookings.ts:9-45,129-144`
- `lib/db/src/schema/packages.ts:31-56`