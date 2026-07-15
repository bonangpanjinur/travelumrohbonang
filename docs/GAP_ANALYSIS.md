# Gap Analysis — Umroh App Operasional
> Diperbarui: Juli 2026 | Berdasarkan audit kode menyeluruh

---

## Ringkasan Eksekutif

Dari **audit penuh** seluruh codebase (frontend, backend, skema DB, migrasi), ditemukan bahwa:

- **~85% fitur admin CRUD** sudah real dan terhubung ke DB
- **~60% alur operasional end-to-end** sudah berjalan
- **4 gap kritis** yang menyebabkan transaksi nyata tidak bisa diselesaikan dengan aman
- **5 gap tinggi** yang membuat operasional tidak efisien dan bergantung pada proses manual

---

## Status Fitur — Ringkasan Cepat

| Area | Status | Keterangan |
|---|---|---|
| Booking (input data) | ✅ Berjalan | Pilgrim data, room selection, referral |
| Quota seat | ✅ Berjalan | DB trigger row-level locking |
| Payment initiation (Midtrans/Xendit) | ✅ Berjalan | QRIS, VA, bank transfer |
| Payment proof upload (manual) | ✅ Berjalan | Upload ke Supabase Storage |
| **Webhook → update booking status** | ❌ **TIDAK ADA** | Bug kritis — booking tidak pernah auto-lunas |
| **Admin approve manual payment** | ❌ **TIDAK ADA** | Tidak ada endpoint untuk konfirmasi |
| **Email notifikasi** | ❌ **TIDAK ADA** | Nol infrastruktur email |
| **WhatsApp automation** | ⚠️ Manual saja | wa.me links; Fonnte/Wablas belum ada |
| In-app notifikasi | ✅ Berjalan | Supabase-backed, admin focused |
| Package management | ✅ Berjalan | Full CRUD |
| Departure management | ✅ Berjalan | Termasuk muthawif assignment |
| Muthawif assignment | ✅ Berjalan | End-to-end |
| Agent/komisi/withdrawal | ✅ Berjalan | Full end-to-end |
| CRM (leads + follow-up) | ✅ Berjalan | Real implementation |
| Manifest jamaah | ✅ Berjalan | Print + CSV + QR code per jamaah |
| Check-in jamaah | ✅ Berjalan | Admin side |
| Loyalty poin (admin) | ⚠️ Parsial | Admin bisa kelola; user tidak bisa lihat/tukar |
| **Installment/cicilan** | ⚠️ Stub | Tabel ada di Supabase, logic bisnis belum ada |
| **Export laporan PDF/Excel** | ⚠️ CSV saja | Server-side PDF generation belum ada |
| **Push notifikasi** | ❌ **TIDAK ADA** | Tidak ada PWA/FCM/OneSignal |
| Manasik (konten) | ✅ Berjalan | Upload materi, CMS |
| **Manasik (sesi & absensi)** | ❌ **TIDAK ADA** | Tidak ada jadwal sesi, absensi jamaah |
| Multi-tenant | ✅ Berjalan | Subdomain detection, tenant sites |
| SEO & CMS | ✅ Berjalan | Blog, FAQ, halaman dinamis |
| Audit log | ✅ Berjalan | Tersimpan ke DB |

---

## Gap Kritis (Operasional Bisa Macet)

### GAP-01 · Webhook Tidak Sinkron ke Status Booking
**Dampak:** Setelah jamaah bayar via Midtrans/Xendit, booking status di DB **tidak pernah berubah otomatis**. Staff harus update manual atau booking tetap `pending` selamanya.

**Akar masalah:** `payment-gateway-webhooks.ts` hanya update tabel `paymentGatewayTransactions` — tidak ada kode yang menyentuh tabel `bookings`.

**Yang seharusnya terjadi:**
```
Webhook masuk (paid) → 
  1. Verifikasi signature
  2. Update paymentGatewayTransactions.status = 'paid'
  3. Update payments.status = 'verified'
  4. Update bookings.status = 'confirmed' (jika total lunas)
  5. Kurangi remaining_quota di package_departures
  6. Kirim notifikasi in-app + email/WA ke jamaah
```

---

### GAP-02 · Tidak Ada Endpoint Konfirmasi Pembayaran Manual
**Dampak:** Jamaah upload bukti transfer → admin lihat bukti → tidak ada tombol "Konfirmasi" yang aman di backend. Admin mungkin langsung edit DB atau pakai Supabase dashboard.

**Yang dibutuhkan:** `PATCH /api/admin/payments/:id/verify` yang:
1. Update `payments.status = 'verified'`
2. Update `bookings.status` sesuai logika (dp/lunas)
3. Generate/trigger notifikasi ke jamaah
4. Create `financial_transactions` record

---

### GAP-03 · Nol Infrastruktur Email
**Dampak:** Tidak ada konfirmasi booking, tidak ada receipt pembayaran, tidak ada reminder keberangkatan. Standar minimum bisnis travel tidak terpenuhi.

**Tidak ada** occurrences dari: `nodemailer`, `sendgrid`, `resend`, `smtp`, `@sendgrid`, `mailgun` di seluruh codebase.

**Email yang dibutuhkan minimal:**
| Template | Trigger |
|---|---|
| Konfirmasi booking | Booking dibuat |
| Receipt pembayaran | Payment dikonfirmasi |
| Reminder pelunasan | H-30/H-7 jatuh tempo |
| Reminder keberangkatan | H-14/H-3 |
| Konfirmasi dokumen lengkap | Semua dokumen diverifikasi |

---

### GAP-04 · Installment Tidak Punya Logic Bisnis
**Dampak:** UI simulasi cicilan ada, tabel `installment_schedules` ada di Supabase — tapi tidak ada kode yang:
- Generate jadwal cicilan otomatis saat booking dengan DP
- Track status per cicilan
- Kirim reminder saat jatuh tempo
- Hubungkan payment gateway ke cicilan spesifik

**Masalah tambahan:** `installment_schedules` ada di Supabase types tapi **tidak ada di Drizzle schema** — artinya ORM tidak bisa query tabel ini secara type-safe.

---

## Gap Tinggi (Operasional Tidak Efisien)

### GAP-05 · WhatsApp Automation Tidak Ada
Mayoritas komunikasi jamaah umroh di Indonesia via WhatsApp. Saat ini hanya ada `wa.me` link manual. Tidak ada integrasi dengan Fonnte, Wablas, atau WhatsApp Business API.

**WA messages yang dibutuhkan:**
- Konfirmasi booking (dengan kode booking)
- Konfirmasi pembayaran diterima
- Reminder jatuh tempo cicilan
- Info keberangkatan (H-7)
- Pengingat manasik

---

### GAP-06 · Loyalty Tidak Ada di Sisi User
Admin bisa kelola poin, tapi user tidak bisa:
- Lihat saldo poin
- Lihat riwayat poin
- Tukar poin untuk diskon booking

Tidak ada halaman `/dashboard/loyalty` atau komponen poin di user dashboard.

---

### GAP-07 · Manasik — Tidak Ada Sesi & Absensi
Konten manasik (PDF, video) bisa diupload dan dilihat jamaah. Tapi tidak ada:
- Jadwal sesi manasik (tanggal, lokasi, jam)
- Daftar kehadiran per sesi
- Tracking jamaah mana yang sudah/belum hadir
- Notifikasi undangan sesi ke jamaah

---

### GAP-08 · Export Laporan Hanya CSV
Admin butuh laporan dalam format:
- **PDF**: Surat konfirmasi booking (untuk jamaah), laporan keuangan, manifest resmi
- **Excel**: Rekap keuangan bulanan, komisi agen, data jamaah per keberangkatan

Saat ini hanya ada `exportToCsv` client-side. Tidak ada server-side PDF generation.

---

### GAP-09 · Konfigurasi Rekening Bank Hardcoded
Di `Payment.tsx`, nomor rekening bank untuk transfer manual dikodekan langsung:
```
Bank Mandiri — [hardcoded account number]
```
Seharusnya diambil dari `site_settings` via API agar bisa diubah admin tanpa deploy ulang.

---

## Gap Sedang (Nice-to-Have Operasional)

### GAP-10 · Push Notification Belum Ada
Tidak ada service worker, tidak ada FCM/OneSignal integration. In-app notification ada, tapi tidak bisa kirim notif saat app tidak dibuka.

### GAP-11 · Midtrans Snap Belum Dipakai
Menggunakan Direct Charge API, bukan Snap popup. UX lebih buruk — user tidak melihat halaman pembayaran Midtrans yang familiar.

### GAP-12 · Xendit QRIS & E-wallet Belum Ada
Xendit hanya implementasi Virtual Account. QRIS dan e-wallet (OVO, GoPay, DANA) belum ada padahal sangat umum dipakai.

### GAP-13 · diagLogs.ts Tidak Ter-mount
File `artifacts/api-server/src/routes/admin/diagLogs.ts` ada tapi tidak di-import di `admin/index.ts`.

---

## Prioritas Pengerjaan

```
SPRINT 1 — Stabilitasi Transaksi (2 minggu)
  GAP-01: Webhook → booking status sync
  GAP-02: Admin payment verification endpoint
  GAP-09: Bank account dari settings API

SPRINT 2 — Komunikasi (2 minggu)  
  GAP-03: Email (Resend/Nodemailer + 5 template dasar)
  GAP-05: WhatsApp automation (Fonnte)

SPRINT 3 — Cicilan & Laporan (2 minggu)
  GAP-04: Installment logic bisnis + Drizzle schema
  GAP-08: PDF export (konfirmasi booking, manifest)

SPRINT 4 — Engagement User (1-2 minggu)
  GAP-06: Loyalty user-facing
  GAP-07: Manasik sesi & absensi
  GAP-10: Push notification (PWA)
  GAP-11: Midtrans Snap
  GAP-12: Xendit QRIS/e-wallet
```
