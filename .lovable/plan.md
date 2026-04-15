

# Analisis Gap & Rencana Pengembangan Sistem Umroh

## Analisis Kondisi Saat Ini

Sistem sudah memiliki fondasi yang solid:
- **Operasional**: Paket, keberangkatan, booking 3-step, itinerary, jemaah, dokumen
- **Keuangan**: Pembayaran DP/Full, verifikasi, akuntansi, payment gateway, laporan, komisi
- **Pemasaran**: CRM, kupon, analitik AI, blog, galeri, testimoni
- **Multi-tenant**: Template classic/modern/premium, billing upgrade, tenant packages
- **Infrastruktur**: Multi-cabang, multi-bahasa, agen, muthawif

---

## Gap yang Teridentifikasi

### A. Operasional (Admin/Owner)

| # | Fitur | Deskripsi |
|---|-------|-----------|
| A1 | **Manifest Keberangkatan** | Cetak daftar jemaah per keberangkatan (nama, paspor, kamar hotel, penerbangan) dalam format PDF untuk diberikan ke maskapai/hotel |
| A2 | **Rooming List** | Pembagian kamar hotel otomatis berdasarkan tipe kamar yang dibooking, bisa di-assign manual per jemaah |
| A3 | **Checklist Perlengkapan Jemaah** | Daftar item yang harus disiapkan jemaah sebelum berangkat (koper, ihram, dll), bisa di-track per jemaah |
| A4 | **Manajemen Penerbangan** | Detail flight number, jadwal, terminal untuk setiap keberangkatan, notifikasi perubahan jadwal |
| A5 | **Log Aktivitas/Audit Trail** | Catatan siapa melakukan apa dan kapan di sistem (ubah status booking, verifikasi pembayaran, dll) |

### B. Kebutuhan Cabang & Agen

| # | Fitur | Deskripsi |
|---|-------|-----------|
| B1 | **Dashboard Khusus Cabang** | Cabang login dan hanya melihat data booking/jemaah milik cabangnya, bukan seluruh data |
| B2 | **Target & Performa Agen** | Sistem target bulanan per agen, tracking pencapaian, dan leaderboard agen terbaik |
| B3 | **Komisi Otomatis per Agen** | Kalkulasi dan laporan komisi otomatis berdasarkan booking yang di-close oleh agen, termasuk status pencairan |
| B4 | **Referral Link Agen** | Setiap agen punya link unik untuk tracking booking yang masuk dari referralnya |
| B5 | **Portal Agen** | Halaman khusus agen untuk melihat daftar jemaah yang direferensikan, status booking, dan komisi |

### C. Keuangan

| # | Fitur | Deskripsi |
|---|-------|-----------|
| C1 | **Cicilan/Installment** | Skema pembayaran cicilan dengan jadwal dan reminder otomatis per termin |
| C2 | **Laporan Piutang (Aging)** | Daftar jemaah yang belum lunas dengan aging (30/60/90 hari), prioritas penagihan |
| C3 | **Rekonsiliasi Bank** | Cocokkan bukti transfer dengan mutasi rekening, tandai yang sudah match |
| C4 | **Refund Management** | Proses pengembalian dana untuk booking yang dibatalkan, dengan perhitungan potongan |
| C5 | **Laporan Laba-Rugi per Paket** | Hitung pendapatan vs biaya operasional per paket keberangkatan |

### D. Fitur untuk Jemaah (User-facing)

| # | Fitur | Deskripsi |
|---|-------|-----------|
| D1 | **Tracking Status Real-time** | Jemaah bisa pantau status booking, pembayaran, visa, dan keberangkatan secara real-time dengan notifikasi |
| D2 | **Upload Dokumen Mandiri** | Jemaah upload paspor, KTP, foto sendiri dari dashboard mereka, admin tinggal verifikasi |
| D3 | **E-Ticket & Boarding Info** | Jemaah bisa lihat/download e-ticket, info hotel, jadwal penerbangan dari dashboard |
| D4 | **Doa & Panduan Manasik** | Konten digital panduan manasik umroh, doa-doa, dan tata cara ibadah |
| D5 | **Feedback & Rating** | Setelah pulang, jemaah bisa memberikan rating dan feedback untuk paket yang diikuti |
| D6 | **Notifikasi WhatsApp/Email** | Reminder pembayaran, perubahan jadwal, dan info penting via WhatsApp/email |

---

## Rencana Pengembangan (Prioritas)

### Fase 1 — Kebutuhan Kritis (Minggu 1-2)
1. **D1 — Tracking Status Real-time Jemaah** — Upgrade dashboard jemaah dengan progress tracker real-time dan push notification
2. **D2 — Upload Dokumen Mandiri** — Portal upload dokumen dari sisi jemaah (paspor, KTP, foto) dengan status verifikasi
3. **C1 — Sistem Cicilan** — Tabel `installment_schedules`, reminder otomatis, tracking pembayaran per termin
4. **A1 — Manifest Keberangkatan** — Generate & cetak PDF manifest per keberangkatan

### Fase 2 — Efisiensi Operasional (Minggu 3-4)
5. **B1 — Dashboard Khusus Cabang** — Role-based filtering, cabang hanya lihat data miliknya
6. **B5 — Portal Agen** — Halaman khusus agen: daftar jemaah, komisi, performa
7. **A2 — Rooming List** — Pembagian & manajemen kamar per keberangkatan
8. **C2 — Laporan Piutang Aging** — Dashboard piutang dengan aging dan prioritas tagihan

### Fase 3 — Growth & Experience (Minggu 5-6)
9. **C4 — Refund Management** — Alur pengembalian dana dengan approval workflow
10. **B2 — Target & Performa Agen** — Target bulanan, leaderboard, grafik pencapaian
11. **D4 — Panduan Manasik Digital** — Konten doa dan panduan ibadah
12. **D5 — Feedback & Rating** — Rating pasca-perjalanan

### Fase 4 — Optimasi (Minggu 7-8)
13. **A5 — Audit Trail** — Log semua perubahan penting di sistem
14. **B4 — Referral Link Agen** — Tracking sumber booking via link unik
15. **C5 — Laba-Rugi per Paket** — Laporan profitabilitas
16. **D3 — E-Ticket & Boarding Info** — Info penerbangan di dashboard jemaah
17. **D6 — Notifikasi WhatsApp** — Integrasi WhatsApp API untuk reminder

---

## Detail Teknis

### Database Tables Baru
- `installment_schedules` — jadwal cicilan per booking
- `agent_targets` — target bulanan per agen
- `agent_commissions` — pencairan komisi agen
- `refund_requests` — pengajuan refund
- `activity_logs` — audit trail
- `rooming_assignments` — assignment kamar per jemaah
- `pilgrim_feedback` — rating & feedback jemaah
- `manasik_content` — konten panduan ibadah
- `flight_details` — info penerbangan per keberangkatan

### Perubahan Tabel Existing
- `bookings`: tambah `payment_scheme` (full/installment)
- `profiles`: tambah `agent_referral_code`

### Edge Functions Baru
- `installment-reminder` — cron reminder cicilan jatuh tempo
- `manifest-generator` — generate PDF manifest

### Halaman Baru
- `/my-documents` — upload dokumen mandiri jemaah
- `/my-tickets` — e-ticket & info keberangkatan
- `/agent-portal` — portal khusus agen
- `/admin/manifest/:departureId` — manifest keberangkatan
- `/admin/rooming/:departureId` — rooming list
- `/admin/refunds` — manajemen refund
- `/admin/installments` — monitoring cicilan
- `/admin/agent-performance` — performa & target agen

