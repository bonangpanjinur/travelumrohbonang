# PRD — Fitur Operasional yang Belum Ada
> Umroh App · Versi 2.0 · Juli 2026  
> Dokumen ini mendefinisikan **apa yang harus dibangun**, **mengapa**, dan **bagaimana arsitekturnya**.  
> Semua item di sini berdasarkan audit kode nyata — bukan asumsi.

---

## Konteks & Tujuan

Umroh App sudah punya fondasi kuat: booking flow, payment gateway (Midtrans/Xendit), admin CRUD lengkap, agent/komisi, multi-tenant, CMS. Tapi ada **lubang kritis** di lapisan operasional yang menyebabkan:

1. **Transaksi tidak closed-loop** — jamaah bayar tapi status booking tidak update otomatis
2. **Komunikasi 100% manual** — tidak ada email, tidak ada WA otomatis
3. **Cicilan tidak bisa dijalankan** — tabel ada, logic tidak ada
4. **Laporan tidak bisa dikirim ke orang lain** — hanya CSV kasar

Tujuan dokumen ini: mendefinisikan 9 fitur yang menutup lubang tersebut, dengan arsitektur yang bisa langsung dikerjakan.

---

## F-01 · Payment Status Sync (Webhook → Booking)

### Problem Statement
Webhook dari Midtrans dan Xendit sudah diterima dan disimpan ke `paymentGatewayTransactions`, tapi **tidak ada kode yang meneruskan status lunas ke tabel `bookings`**. Artinya booking tetap `pending` meskipun jamaah sudah bayar. Staff harus update manual via Supabase dashboard.

### User Stories
- Sebagai **jamaah**, saya ingin status booking saya otomatis berubah menjadi "Dikonfirmasi" setelah saya berhasil bayar, tanpa harus menunggu konfirmasi manual.
- Sebagai **admin**, saya ingin melihat booking yang sudah lunas langsung tanda "Confirmed" tanpa harus cek payment gateway secara terpisah.

### Acceptance Criteria
- [ ] Webhook Midtrans: ketika `transaction_status = 'settlement'` → booking status update ke `confirmed`
- [ ] Webhook Xendit: ketika `status = 'PAID'` → booking status update ke `confirmed`
- [ ] Webhook partial payment (DP): booking status update ke `dp_paid`
- [ ] Setiap perubahan status membuat record di `financial_transactions`
- [ ] Jika webhook gagal (DB error), response 500 agar gateway retry
- [ ] Idempotent: webhook yang sama tidak boleh double-update

### Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│  payment-gateway-webhooks.ts                            │
│                                                         │
│  POST /payments/webhook/midtrans                        │
│  ├── 1. Verify Midtrans signature (existing ✅)         │
│  ├── 2. Update paymentGatewayTransactions (existing ✅) │
│  ├── 3. [NEW] Resolve bookingId dari pgTransactionId    │
│  ├── 4. [NEW] Hitung total paid vs total harga          │
│  ├── 5. [NEW] Update bookings.status                    │
│  │      full paid  → 'confirmed'                        │
│  │      partial    → 'dp_paid'                          │
│  │      expired    → 'payment_expired'                  │
│  ├── 6. [NEW] Insert financial_transactions record      │
│  └── 7. [NEW] Dispatch notificationJob                  │
│                                                         │
│  POST /payments/webhook/xendit  (sama)                  │
└─────────────────────────────────────────────────────────┘

Booking Status State Machine:
  pending → dp_paid → confirmed → departed → completed
         ↘ payment_expired
         ↘ cancelled
```

### Schema Changes
```sql
-- Tidak perlu tabel baru. Gunakan yang sudah ada:
-- bookings.status (sudah ada kolom)
-- financial_transactions (sudah ada tabel)
-- payment_gateway_transactions (sudah ada, tambah kolom booking_id FK)

ALTER TABLE payment_gateway_transactions 
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id);
```

### File yang Diubah
- `artifacts/api-server/src/routes/payment-gateway-webhooks.ts` — tambah step 3-7
- `lib/db/src/schema/payments.ts` — tambah `booking_id` ke `paymentGatewayTransactions`
- `sql/migrations/` — migration baru untuk kolom `booking_id`

---

## F-02 · Admin Payment Verification Endpoint

### Problem Statement
Jamaah yang bayar manual (transfer bank) mengupload bukti. Admin bisa lihat bukti di UI, tapi tidak ada tombol "Verifikasi" yang aman dengan audit trail. Admin terpaksa edit langsung di Supabase atau tabel tanpa log.

### User Stories
- Sebagai **admin**, saya ingin menekan tombol "Konfirmasi Pembayaran" setelah melihat bukti transfer, dan sistem otomatis update status booking + kirim notifikasi ke jamaah.
- Sebagai **admin keuangan**, saya ingin setiap konfirmasi pembayaran tercatat siapa yang mengkonfirmasi dan kapan.

### Acceptance Criteria
- [ ] `PATCH /api/admin/payments/:id/verify` — ubah status payment ke `verified`, update booking status
- [ ] `PATCH /api/admin/payments/:id/reject` — tolak pembayaran dengan catatan alasan
- [ ] Setiap action simpan `verifiedBy` (admin userId) dan `verifiedAt` timestamp
- [ ] Setelah verifikasi: trigger notifikasi ke jamaah (in-app + WA/email jika tersedia)
- [ ] Endpoint dilindungi `requireFinance` atau `requireAdmin` middleware

### Arsitektur

```
Frontend (AdminPayments.tsx)
  └── Tombol "Verifikasi" / "Tolak"
        └── PATCH /api/admin/payments/:id/verify
              └── admin/payments.ts (route handler)
                    ├── requireAuth + requireFinance middleware
                    ├── db.update(payments).set({ status: 'verified', verifiedBy, verifiedAt })
                    ├── Recalculate total paid for booking
                    ├── db.update(bookings).set({ status: newStatus })
                    ├── db.insert(financialTransactions)
                    ├── db.insert(auditLogs)
                    └── notificationService.send(bookingId, 'payment_verified')
```

### Schema Changes
```sql
-- Tambah kolom ke payments table (jika belum ada):
ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;
```

---

## F-03 · Email Notification System

### Problem Statement
Tidak ada satupun baris kode email di seluruh codebase. Ini di bawah standar minimum bisnis travel — jamaah tidak dapat konfirmasi booking, receipt, atau reminder apapun via email.

### Provider yang Dipilih: **Resend**
- Free tier: 3.000 email/bulan (cukup untuk MVP)
- SDK TypeScript native
- Template HTML yang mudah
- Tidak perlu konfigurasi SMTP

### User Stories
- Sebagai **jamaah**, saya ingin mendapat email konfirmasi setelah booking berhasil, berisi ringkasan booking dan langkah selanjutnya.
- Sebagai **jamaah**, saya ingin mendapat email receipt setiap kali pembayaran dikonfirmasi.
- Sebagai **jamaah**, saya ingin mendapat reminder H-7 sebelum keberangkatan.

### Acceptance Criteria
- [ ] 5 template email wajib tersedia (lihat tabel di bawah)
- [ ] Email terkirim dalam 30 detik setelah event terjadi
- [ ] Jika Resend error, event tidak hilang (retry via queue atau at-least-once pattern)
- [ ] Admin bisa preview template dari settings
- [ ] Email memiliki unsubscribe link (CAN-SPAM compliance)

### Template Email Wajib

| ID | Trigger | Penerima | Subjek |
|---|---|---|---|
| `booking_created` | Booking baru dibuat | Jamaah | Konfirmasi Pemesanan #{booking_code} |
| `payment_received` | Payment diverifikasi | Jamaah | Pembayaran Diterima — {package_name} |
| `installment_reminder` | H-7 sebelum jatuh tempo cicilan | Jamaah | Pengingat Cicilan ke-{n} Jatuh Tempo |
| `departure_reminder` | H-14 sebelum keberangkatan | Jamaah | Persiapan Keberangkatan {departure_date} |
| `documents_complete` | Semua dokumen diverifikasi admin | Jamaah | Dokumen Anda Lengkap ✓ |

### Arsitektur

```
lib/
└── email/                          [PAKET BARU]
    ├── package.json                (dep: resend)
    ├── src/
    │   ├── client.ts               (Resend instance, singleton)
    │   ├── templates/
    │   │   ├── booking-created.tsx (React Email template)
    │   │   ├── payment-received.tsx
    │   │   ├── installment-reminder.tsx
    │   │   ├── departure-reminder.tsx
    │   │   └── documents-complete.tsx
    │   ├── emailService.ts         (send() wrapper dengan retry)
    │   └── index.ts
    └── tsconfig.json

artifacts/api-server/src/
└── lib/
    └── notifications/
        └── emailNotifications.ts  (import emailService, dispatch per event)
```

### Integrasi dengan Event System

```typescript
// Setiap route yang trigger email memanggil:
import { emailNotifications } from '../lib/notifications/emailNotifications';

// Contoh di webhooks:
await emailNotifications.bookingConfirmed({ bookingId, jamaahEmail, bookingCode });
```

### Env Variables Baru
```
RESEND_API_KEY=re_xxxx
EMAIL_FROM=noreply@namaperusahaan.com
EMAIL_FROM_NAME=Nama Travel Umroh
```

---

## F-04 · WhatsApp Automation (Fonnte)

### Problem Statement
Di Indonesia, WhatsApp adalah channel komunikasi utama. Jamaah mengharapkan notifikasi WA, bukan hanya email. Saat ini hanya ada link `wa.me` manual yang tidak bisa dikirim otomatis oleh sistem.

### Provider yang Dipilih: **Fonnte**
- API sederhana (REST, tidak perlu webhook server)
- Harga terjangkau untuk skala UMKM
- Sudah umum dipakai oleh travel agent Indonesia
- Tidak memerlukan WhatsApp Business API resmi

### User Stories
- Sebagai **jamaah**, saya ingin mendapat pesan WA otomatis saat booking dikonfirmasi, berisi kode booking dan info selanjutnya.
- Sebagai **jamaah**, saya ingin mendapat WA reminder H-7 keberangkatan.
- Sebagai **admin**, saya ingin bisa kirim WA blast ke semua jamaah satu keberangkatan (pengumuman mendadak).

### Acceptance Criteria
- [ ] WA terkirim ke nomor jamaah dalam 60 detik setelah event
- [ ] Template pesan disimpan di `site_settings` (bisa diubah admin)
- [ ] Jika nomor tidak valid atau WA tidak aktif, error dicatat ke log (tidak crash)
- [ ] Admin bisa kirim WA manual ke satu jamaah dari halaman detail booking
- [ ] Admin bisa kirim WA blast ke jamaah per keberangkatan

### Template WA Wajib

| Event | Pesan |
|---|---|
| Booking dibuat | "Halo {nama}, booking Anda untuk paket {paket} berhasil dibuat. Kode booking: {kode}. Segera lakukan pembayaran sebelum {deadline}." |
| Payment dikonfirmasi | "Alhamdulillah, pembayaran Anda telah kami terima. Booking {kode} sudah dikonfirmasi. Pantau status di: {link}" |
| Cicilan jatuh tempo H-7 | "Pengingat: cicilan ke-{n} sebesar Rp{amount} jatuh tempo {date}. Harap segera melakukan pembayaran." |
| Keberangkatan H-7 | "InsyaAllah {tanggal} Anda berangkat bersama rombongan {paket}. Harap berkumpul di {lokasi} pukul {jam}." |

### Arsitektur

```
lib/
└── whatsapp/                       [PAKET BARU]
    ├── package.json
    ├── src/
    │   ├── client.ts               (Fonnte REST client)
    │   ├── templates.ts            (template builder dari site_settings)
    │   ├── waService.ts            (send(), broadcast())
    │   └── index.ts

artifacts/api-server/src/
├── routes/admin/
│   └── chats.ts                   [TAMBAH] POST /blast/:departureId
└── lib/notifications/
    └── waNotifications.ts         (dispatch per event)
```

### Admin WA Blast Flow
```
Admin → Admin Departures page
  → Pilih departure
  → Tombol "Kirim Pengumuman WA"
  → Input pesan (atau pilih template)
  → Konfirmasi jumlah penerima
  → POST /api/admin/chats/blast/:departureId
  → waService.broadcast(phones[], message)
```

### Env Variables Baru
```
FONNTE_API_TOKEN=xxxx
WA_SENDER_NUMBER=628xxxxxxxxxx
```

---

## F-05 · Installment System (End-to-End)

### Problem Statement
Tabel `installment_schedules` sudah ada di Supabase tapi:
1. **Tidak ada di Drizzle schema** — ORM tidak bisa query secara type-safe
2. **Tidak ada business logic** — jadwal tidak auto-generate saat booking DP
3. **Tidak ada payment gateway integration** per cicilan
4. **Tidak ada reminder otomatis** jatuh tempo

### User Stories
- Sebagai **jamaah**, saya ingin bisa pilih metode cicilan saat booking (DP + cicilan bulanan), dan melihat jadwal cicilan saya.
- Sebagai **jamaah**, saya ingin mendapat reminder WA/email 7 hari sebelum cicilan jatuh tempo.
- Sebagai **admin**, saya ingin melihat mana jamaah yang cicilan sudah lunas dan mana yang belum.

### Acceptance Criteria
- [ ] Saat booking dengan payment type `dp` atau `installment`: generate jadwal cicilan otomatis
- [ ] Jadwal cicilan: DP + n cicilan bulanan (n dari konfigurasi paket)
- [ ] User bisa lihat jadwal cicilan di `/my-bookings` dan `/dashboard`
- [ ] Admin bisa lihat semua cicilan di halaman Installments
- [ ] Reminder otomatis H-7 via WA + email
- [ ] Payment gateway bisa bayar per cicilan (generate VA/QRIS per cicilan)
- [ ] `installment_schedules` ada di Drizzle schema

### Arsitektur

```
Booking dibuat dengan type 'dp' / 'installment'
  ↓
installmentService.generateSchedule({
  bookingId,
  totalAmount,
  dpAmount,
  numberOfInstallments,    ← dari package config
  firstDueDate             ← D+30
})
  ↓
INSERT INTO installment_schedules (
  booking_id, installment_number, amount, due_date, status='pending'
) × n rows
```

**Drizzle Schema Baru:**
```typescript
// lib/db/src/schema/bookings.ts — tambahkan:
export const installmentSchedules = pgTable('installment_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id),
  installmentNumber: integer('installment_number').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  dueDate: date('due_date').notNull(),
  paidAt: timestamp('paid_at'),
  paymentId: uuid('payment_id').references(() => payments.id),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  // 'pending' | 'paid' | 'overdue' | 'waived'
  createdAt: timestamp('created_at').defaultNow(),
});
```

**API Endpoints Baru:**
```
GET  /api/bookings/:id/installments          ← user lihat jadwal
POST /api/bookings/:id/installments/:n/pay   ← generate VA/QRIS untuk cicilan ke-n
GET  /api/admin/installments                 ← admin view semua
GET  /api/admin/installments/overdue         ← filter overdue
```

**Reminder Job (Cron):**
```
Setiap hari jam 08:00 WIB:
  SELECT * FROM installment_schedules 
  WHERE due_date = CURRENT_DATE + 7 AND status = 'pending'
  → Kirim WA + email reminder per jamaah
```

---

## F-06 · PDF Export

### Problem Statement
Admin dan jamaah butuh dokumen resmi dalam format PDF:
- **Surat Konfirmasi Booking** — untuk jamaah sebagai bukti resmi
- **Manifest Jamaah** — untuk diserahkan ke maskapai/imigrasi
- **Laporan Keuangan** — untuk pembukuan internal

Saat ini hanya ada `exportToCsv` client-side yang kasar.

### User Stories
- Sebagai **jamaah**, saya ingin bisa download PDF konfirmasi booking saya dengan kop surat perusahaan.
- Sebagai **admin**, saya ingin bisa export manifest jamaah satu keberangkatan sebagai PDF berlogo.
- Sebagai **admin keuangan**, saya ingin export laporan komisi agen dalam format Excel.

### Library yang Dipilih
- **PDF**: `@react-pdf/renderer` (React-based, bisa render di Node.js server-side)
- **Excel**: `exceljs` (lebih lengkap dari xlsx untuk formatting)

### Acceptance Criteria
- [ ] PDF konfirmasi booking: kop surat, data jamaah, paket, harga, status pembayaran
- [ ] PDF manifest: tabel semua jamaah + foto + QR code per jamaah
- [ ] Excel laporan komisi agen: per periode, per agen, subtotal
- [ ] PDF/Excel di-generate server-side (bukan client-side) untuk keamanan data

### Arsitektur

```
artifacts/api-server/src/
└── lib/
    └── pdf/
        ├── templates/
        │   ├── BookingConfirmation.tsx   (React PDF template)
        │   └── ManifestPDF.tsx
        └── pdfService.ts               (renderToBuffer())

Endpoints baru:
GET /api/bookings/:id/confirmation.pdf    ← user download sendiri
GET /api/admin/departures/:id/manifest.pdf ← admin download manifest
GET /api/admin/reports/commissions.xlsx   ← admin download Excel
```

---

## F-07 · User-Facing Loyalty System

### Problem Statement
Admin sudah bisa kelola poin jamaah (tambah/kurang manual), tapi jamaah sama sekali tidak bisa melihat poin mereka. Loyalty program tidak berguna jika user tidak tahu poin mereka ada.

### User Stories
- Sebagai **jamaah**, saya ingin melihat saldo poin saya di dashboard.
- Sebagai **jamaah**, saya ingin mendapat poin otomatis setelah booking saya selesai (status `completed`).
- Sebagai **jamaah**, saya ingin bisa tukar poin untuk diskon di booking berikutnya.

### Acceptance Criteria
- [ ] Widget "Poin Saya" di `/dashboard` user
- [ ] Halaman `/loyalty` dengan riwayat poin
- [ ] Poin otomatis ditambah saat booking status → `completed` (1 poin per Rp 100.000)
- [ ] Di halaman booking: bisa pilih "Gunakan Poin" untuk diskon
- [ ] Minimum tukar: 100 poin = Rp 10.000 diskon

### Auto-accrual Architecture
```
DB Trigger atau API event:
  UPDATE bookings SET status = 'completed'
    → fn_award_loyalty_points(booking_id)
    → Hitung poin dari total_harga
    → INSERT INTO loyalty_points
    → UPSERT loyalty_balances
```

---

## F-08 · Manasik — Sesi & Absensi

### Problem Statement
Materi manasik (PDF, video) sudah bisa diupload dan diakses jamaah. Tapi tidak ada sistem untuk:
- Menjadwalkan sesi manasik tatap muka
- Mencatat kehadiran jamaah
- Mengirim undangan ke jamaah yang terdaftar di keberangkatan tersebut

### User Stories
- Sebagai **admin**, saya ingin membuat jadwal sesi manasik untuk satu keberangkatan, lengkap dengan lokasi dan jam.
- Sebagai **admin**, saya ingin bisa input absensi jamaah saat sesi berlangsung (scan QR atau centang manual).
- Sebagai **jamaah**, saya ingin mendapat notifikasi WA undangan manasik H-1 sebelum sesi.

### Acceptance Criteria
- [ ] CRUD jadwal sesi manasik per departure (tanggal, waktu, lokasi, kapasitas)
- [ ] Daftar hadir per sesi: centang manual atau scan QR dari manifest
- [ ] Notifikasi WA otomatis H-1 sebelum sesi
- [ ] User bisa lihat jadwal manasik di `/my-bookings/:id`
- [ ] Admin bisa lihat rekap kehadiran per keberangkatan

### Schema Baru
```sql
CREATE TABLE manasik_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id uuid REFERENCES package_departures(id),
  title text NOT NULL,
  session_date date NOT NULL,
  start_time time NOT NULL,
  end_time time,
  location text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE manasik_attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES manasik_sessions(id),
  booking_id uuid REFERENCES bookings(id),
  pilgrim_id uuid REFERENCES booking_pilgrims(id),
  attended boolean DEFAULT false,
  attended_at timestamptz,
  notes text
);
```

---

## F-09 · Konfigurasi Rekening Bank dari Settings

### Problem Statement
Di `Payment.tsx`, detail bank untuk transfer manual dikodekan langsung dalam kode:
```jsx
// Hardcoded - tidak bisa diubah tanpa deploy
bankName: "Mandiri", accountNumber: "1234567890", accountName: "PT ..."
```

### Acceptance Criteria
- [ ] Rekening bank tersimpan di `site_settings` (sudah ada tabelnya)
- [ ] `GET /api/misc/payment-settings` endpoint untuk frontend
- [ ] Admin bisa ubah rekening bank dari halaman Settings tanpa deploy ulang
- [ ] Bisa ada multiple rekening bank (BCA, Mandiri, BNI)

### Schema Change
```sql
-- Di site_settings, tambah key-value:
INSERT INTO site_settings (key, value) VALUES
  ('manual_bank_accounts', '[
    {"bank": "Mandiri", "number": "xxx", "name": "PT xxx"},
    {"bank": "BCA", "number": "yyy", "name": "PT xxx"}
  ]');
```

---

## Ringkasan Arsitektur Keseluruhan

```
┌─────────────────────────────────────────────────────────────┐
│                    EVENT PIPELINE                           │
│                                                             │
│  Booking Created ──────────────────────────────────────┐   │
│  Payment Verified ─────────────────────────────────┐   │   │
│  Departure H-7 (cron) ─────────────────────────┐   │   │   │
│  Installment Due H-7 (cron) ───────────────┐   │   │   │   │
│                                            ↓   ↓   ↓   ↓   │
│                              ┌─────────────────────────┐   │
│                              │   notificationService   │   │
│                              │                         │   │
│                              │  ├── emailService       │   │
│                              │  │   (Resend)           │   │
│                              │  ├── waService          │   │
│                              │  │   (Fonnte)           │   │
│                              │  └── inAppService       │   │
│                              │       (Supabase)        │   │
│                              └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  PAYMENT PIPELINE                           │
│                                                             │
│  User pays → Gateway → Webhook                             │
│                         │                                   │
│                         ├── paymentGatewayTransactions      │
│                         ├── payments (status: verified)     │
│                         ├── bookings (status: confirmed)    │
│                         ├── installment_schedules (update)  │
│                         ├── financial_transactions          │
│                         └── notificationService.dispatch()  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  DOCUMENT PIPELINE                          │
│                                                             │
│  Request PDF/Excel                                          │
│         │                                                   │
│         ├── pdfService (React PDF → Buffer → Stream)        │
│         └── excelService (ExcelJS → Buffer → Stream)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Paket Library yang Perlu Ditambahkan

| Library | Paket Target | Kegunaan |
|---|---|---|
| `resend` | `lib/email` (baru) | Email API |
| `@react-email/components` | `lib/email` | Template email React |
| `@react-pdf/renderer` | `artifacts/api-server` | PDF generation server-side |
| `exceljs` | `artifacts/api-server` | Excel export |
| `node-cron` | `artifacts/api-server` | Scheduler reminder |

---

## Environment Variables Baru yang Dibutuhkan

| Variable | Keterangan |
|---|---|
| `RESEND_API_KEY` | API key dari resend.com |
| `EMAIL_FROM` | Alamat email pengirim |
| `EMAIL_FROM_NAME` | Nama pengirim |
| `FONNTE_API_TOKEN` | Token dari fonnte.com |
| `WA_SENDER_NUMBER` | Nomor WA pengirim (format: 628xxx) |

---

## Sprint Plan

### Sprint 1 — Stabilitasi Transaksi (1-2 minggu)
**Prioritas: KRITIS. Tanpa ini, transaksi tidak aman.**
- F-01: Payment webhook → booking status sync
- F-02: Admin payment verification endpoint  
- F-09: Bank accounts dari settings

### Sprint 2 — Komunikasi Dasar (1-2 minggu)
**Prioritas: TINGGI. Standar minimum bisnis travel.**
- F-03: Email system (Resend + 5 template)
- F-04: WhatsApp automation (Fonnte + 4 template)

### Sprint 3 — Cicilan & Dokumen (2 minggu)
**Prioritas: TINGGI. Revenue driver utama untuk paket mahal.**
- F-05: Installment system end-to-end
- F-06: PDF export (konfirmasi + manifest)

### Sprint 4 — Engagement & Operasional (1-2 minggu)
**Prioritas: SEDANG. Meningkatkan kualitas layanan.**
- F-07: User-facing loyalty
- F-08: Manasik sesi & absensi
