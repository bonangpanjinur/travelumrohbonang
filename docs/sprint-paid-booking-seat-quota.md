# Sprint: Seat Berkurang Setelah Pembayaran

## Tujuan Sprint

Memastikan kuota seat pada setiap jadwal keberangkatan hanya berkurang berdasarkan booking yang sudah memiliki pembayaran sah. Booking yang masih unpaid, pending, rejected, cancelled, atau payment-nya void tidak boleh mengurangi seat.

## Masalah Bisnis

Jika sebuah jadwal memiliki kuota 45 dan terdapat 1 booking yang belum dibayar, sistem harus tetap menampilkan:

```text
Kuota       : 45 seat
Booking     : 1 booking unpaid
Seat terisi : 0
Sisa seat   : 45
```

Setelah booking tersebut dibayar dan pembayaran dinyatakan sah:

```text
Kuota       : 45 seat
Seat terisi : sesuai paxCount booking
Sisa seat   : 45 - paxCount
```

## Ruang Lingkup Sprint

### Termasuk

- Perhitungan seat berdasarkan booking yang sudah dibayar.
- Dukungan booking single dan booking grup berdasarkan `paxCount`.
- Sinkronisasi seat setelah pembayaran manual diverifikasi.
- Sinkronisasi seat setelah pembayaran gateway berstatus paid.
- Pengembalian seat setelah booking dibatalkan.
- Pengembalian seat setelah pembayaran dibatalkan atau di-void.
- Konsistensi angka seat di endpoint publik, admin, dan analytics.
- Pengujian regresi untuk status booking dan pembayaran.

### Tidak Termasuk

- Perubahan struktur tabel database.
- Migrasi dari Drizzle, Supabase, atau PostgreSQL ke teknologi lain.
- Perubahan desain checkout.
- Penentuan ulang apakah pembayaran DP dianggap cukup untuk mengunci seat.
- Fitur pemilihan kursi pesawat individual.

## Definisi Pembayaran Sah

Booking dihitung sebagai seat terisi apabila memenuhi salah satu kondisi berikut:

- Booking berstatus `paid`, `lunas`, `completed`, atau `confirmed`.
- Booking memiliki pembayaran non-void dengan nominal lebih dari 0 yang telah tercatat sebagai pembayaran sah.

Booking tidak dihitung apabila:

- Belum memiliki pembayaran.
- Pembayaran masih `pending`.
- Bukti pembayaran berstatus `rejected`.
- Pembayaran dibatalkan atau `is_voided = true`.
- Booking berstatus `cancelled`.

> Catatan: kebijakan apakah pembayaran sebagian/DP langsung mengunci seat harus mengikuti aturan bisnis yang telah disepakati. Sprint ini tidak mengubah kebijakan tersebut, tetapi memastikan implementasinya konsisten di semua jalur.

## Backlog Sprint

### SQ-01 — Standarisasi aturan seat terbayar

**Prioritas:** P0  
**Area:** Backend

- Jadikan satu kondisi pembayaran sebagai sumber perhitungan seat.
- Pastikan status `cancelled` selalu dikecualikan.
- Gunakan `SUM(paxCount)`, bukan jumlah baris booking.
- Tangani nilai `paxCount` booking grup dengan benar.
- Hindari penggunaan langsung `remaining_quota` tersimpan sebagai sumber utama.

**Kriteria selesai:**

- Semua perhitungan real-time menggunakan aturan seat terbayar yang sama.
- Booking unpaid tidak masuk ke jumlah seat terisi.

### SQ-02 — Sinkronisasi setelah perubahan pembayaran

**Prioritas:** P0  
**Area:** Backend pembayaran

- Verifikasi pembayaran manual memicu sinkronisasi kuota.
- Webhook gateway dengan status paid memicu sinkronisasi kuota.
- Pembayaran installment yang ditandai paid memicu sinkronisasi kuota.
- Pembayaran rejected, pending, expired, atau cancelled tidak mengurangi seat.
- Void atau reversal pembayaran menghitung ulang seat.
- Proses harus idempotent ketika webhook dikirim lebih dari satu kali.

**Kriteria selesai:**

- Seat berubah setelah pembayaran sah tercatat.
- Seat tidak berubah akibat webhook pending atau duplikat.
- Seat kembali tersedia setelah pembayaran yang sebelumnya dihitung dibatalkan/void.

### SQ-03 — Sinkronisasi setelah perubahan booking

**Prioritas:** P0  
**Area:** Backend booking

- Pembuatan booking unpaid tidak mengurangi seat.
- Pembatalan booking mengembalikan seat.
- Penghapusan atau perubahan status booking tidak meninggalkan angka kuota yang stale.
- Validasi kapasitas saat membuat booking hanya memperhitungkan seat yang sudah terbayar.
- Status jadwal `penuh` hanya diterapkan ketika seat terbayar mencapai quota.

**Kriteria selesai:**

- Booking baru dapat dibuat selama masih ada seat terbayar yang tersedia.
- Booking unpaid tidak membuat jadwal menjadi penuh.
- Booking cancelled tidak lagi menghalangi booking baru.

### SQ-04 — Konsistensi endpoint dan laporan

**Prioritas:** P1  
**Area:** API dan admin

- Endpoint jadwal publik menampilkan `remainingQuota` real-time.
- Detail paket menggunakan perhitungan seat terbayar.
- Daftar keberangkatan admin menampilkan seat terisi dan sisa seat yang benar.
- Filter `minQuota` memakai sisa seat real-time.
- Dashboard analytics menghitung `booked` dari booking terbayar, bukan hanya dari kolom tersimpan.
- Semua endpoint mengembalikan hasil yang sama untuk departure yang sama.

**Kriteria selesai:**

- Angka pada halaman publik dan admin konsisten.
- Data lama dengan kolom `remaining_quota` yang stale tidak menghasilkan angka yang salah.

### SQ-05 — Validasi tampilan frontend

**Prioritas:** P1  
**Area:** Frontend

- Tampilkan sisa seat sesuai response API terbaru.
- Pastikan label penuh/hampir penuh mengikuti seat terbayar.
- Pastikan dialog pemilihan jadwal tidak menyembunyikan jadwal yang sebenarnya masih tersedia.
- Refresh data setelah status pembayaran berubah jika halaman sedang terbuka.

**Kriteria selesai:**

- Kasus 45 seat + 1 booking unpaid menampilkan 45 seat.
- Setelah pembayaran sah, tampilan berkurang sesuai jumlah pax.
- Setelah pembatalan/void, tampilan kembali bertambah.

### SQ-06 — Pengujian regresi

**Prioritas:** P0  
**Area:** Quality assurance

- Tambahkan pengujian unit untuk kondisi seat terbayar.
- Tambahkan pengujian integrasi untuk endpoint jadwal dan admin.
- Uji booking single dengan `paxCount = 1`.
- Uji booking grup dengan `paxCount > 1`.
- Uji pembayaran manual, gateway, installment, rejected, pending, cancelled, dan void.
- Uji status jadwal penuh dan filter `minQuota`.
- Uji webhook duplikat agar tidak menggandakan seat atau pembayaran.

## Skenario Penerimaan Utama

| Skenario | Kuota | Status booking | Status pembayaran | Seat terisi | Sisa seat |
|---|---:|---|---|---:|---:|
| Belum ada booking | 45 | - | - | 0 | 45 |
| Booking belum bayar | 45 | `draft` | Tidak ada | 0 | 45 |
| Pembayaran pending | 45 | `pending` | `pending` | 0 | 45 |
| Bukti ditolak | 45 | `draft/pending` | `rejected` | 0 | 45 |
| Booking single sudah bayar | 45 | `confirmed/paid` | Sah | 1 | 44 |
| Booking grup 5 pax sudah bayar | 45 | `confirmed/paid` | Sah | 5 | 40 |
| Booking dibatalkan | 45 | `cancelled` | Sebelumnya sah | 0 | 45 |
| Pembayaran di-void | 45 | Tidak cancelled | `is_voided = true` | 0 | 45 |

## Urutan Pelaksanaan

1. Tetapkan dan uji aturan seat terbayar pada helper backend.
2. Audit seluruh jalur pembayaran, booking, pembatalan, dan void.
3. Perbaiki endpoint publik, admin, dan analytics yang masih membaca kuota tersimpan.
4. Validasi frontend pada jadwal, detail paket, dan dialog booking.
5. Jalankan pengujian regresi dan verifikasi skenario penerimaan.
6. Dokumentasikan hasil dan risiko yang tersisa.

## Definition of Done

- [ ] Semua backlog P0 selesai.
- [ ] Backlog P1 selesai atau memiliki alasan pengecualian yang terdokumentasi.
- [ ] Booking unpaid tidak mengurangi seat.
- [ ] Pembayaran sah mengurangi seat sesuai `paxCount`.
- [ ] Pembatalan/void mengembalikan seat.
- [ ] Endpoint publik, admin, dan analytics konsisten.
- [ ] Skenario 45 seat telah diuji.
- [ ] Tidak ada regresi pada validasi kapasitas booking.
- [ ] Pengujian build dan test selesai tanpa error yang berkaitan dengan perubahan ini.

## File Terkait

- `artifacts/api-server/src/lib/seatQuota.ts`
- `artifacts/api-server/src/routes/bookings.ts`
- `artifacts/api-server/src/routes/packages.ts`
- `artifacts/api-server/src/routes/admin/departures.ts`
- `artifacts/api-server/src/routes/admin/payments.ts`
- `artifacts/api-server/src/routes/admin/installments.ts`
- `artifacts/api-server/src/lib/paymentSync.ts`
- `artifacts/api-server/src/routes/admin/analytics.ts`
- `lib/db/src/schema/bookings.ts`
- `lib/db/src/schema/packages.ts`