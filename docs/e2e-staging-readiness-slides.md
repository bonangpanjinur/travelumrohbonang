# Ringkasan E2E Testing & Kesiapan Deploy Staging

## Cover
E2E Testing & Staging Readiness
Alur Booking → Pembayaran → Sertifikat Otomatis
28 Agustus 2026 · Travel Umroh Bonang

## Slide 1
### Executive verdict: siap masuk staging, belum siap production-like sign-off
- Regression suite lulus: **83 test** — 56 backend/API dan 27 frontend.
- Typecheck dan production build lulus.
- Code path booking, payment schedule, fully paid detection, dan auto-issue sudah terhubung.
- Full E2E belum dapat diberi status PASS karena runtime database, session test, gateway sandbox, dan browser harness belum tersedia.

## Slide 2
### Cakupan alur bisnis yang diuji
- Booking menggunakan harga departure server-side; `totalPrice` dari client tidak dipercaya.
- Policy pembayaran wajib disetujui sebelum booking dibuat dan snapshot disimpan.
- DP, cicilan, dan pelunasan divalidasi terhadap `paymentScheduleSnapshot`.
- Status fully paid memicu penerbitan sertifikat untuk setiap jemaah.

## Slide 3
### Hasil regression menunjukkan fondasi aplikasi stabil
- **56/56** test API/backend lulus.
- **27/27** test frontend lulus.
- **PASS:** TypeScript typecheck.
- **PASS:** production build; catatan non-blocking berupa chunk frontend besar.

## Slide 4
### Kontrol transaksi mencegah manipulasi nominal
- Harga kamar dan total booking dihitung ulang dari harga departure resmi.
- DP harus sama dengan nominal tahap yang ditentukan.
- Cicilan harus mengikuti urutan schedule.
- Overpayment, nominal invalid, wrong sequence, dan pending duplicate ditolak.

## Slide 5
### Pelunasan otomatis mengaktifkan certificate workflow
- Ketika akumulasi payment mencapai total booking, `paymentStatus` menjadi `paid`.
- Payment sync menjalankan auto-issue setelah transaksi database selesai.
- Satu sertifikat Umroh dibuat untuk setiap jemaah.
- Unique index booking–pilgrim–certificate type menjaga idempotensi callback ganda.

## Slide 6
### Status kesiapan staging: tiga dependency masih harus disiapkan
| Dependency | Status | Dampak |
|---|---|---|
| Database staging + migration | Belum tersedia di sandbox | Tidak dapat membuat booking/payment nyata |
| Payment gateway sandbox | Belum tersedia | Callback settlement belum dapat diuji |
| Browser E2E harness | Belum tersedia | Journey customer belum diverifikasi via browser |

## Slide 7
### Checklist go/no-go untuk staging
- Jalankan seluruh migration termasuk unique index certificate.
- Siapkan test user, paket, departure, harga kamar, policy, template certificate, dan fixture jemaah.
- Gunakan gateway sandbox dengan signature/callback secret non-production.
- Jalankan 12 skenario: booking, acceptance, DP, manipulasi nominal, cicilan, pelunasan, auto-issue, replay callback, scope branch.
- Tambahkan cleanup berdasarkan `testRunId` dan assertion database.

## Slide 8
### Rekomendasi eksekusi: staging verification sebelum production sign-off
- **Gate 1:** semua migration dan seed fixture berhasil.
- **Gate 2:** browser journey customer dan admin lulus.
- **Gate 3:** payment gateway callback dan replay test lulus.
- **Gate 4:** jumlah payment, status booking, schedule, dan certificate terverifikasi di database.
- Keputusan saat ini: **GO untuk menyiapkan staging; NO-GO untuk klaim production-ready sebelum full E2E nyata lulus.**
