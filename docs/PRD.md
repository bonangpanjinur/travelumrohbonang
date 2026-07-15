# Product Requirements Document (PRD)
## UmrohPlus — Platform Manajemen Perjalanan Umroh

**Versi:** 1.4 (audit codebase langsung per 2026-07-15 — status F-03 s/d F-08 diperbarui)  
**Tanggal:** 15 Juli 2026  
**Status:** Draft Aktif  
**Pemilik Produk:** Tim UmrohPlus

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Kondisi Produk Saat Ini](#2-kondisi-produk-saat-ini)
3. [Visi & Strategi Produk](#3-visi--strategi-produk)
4. [Pengguna & Persona](#4-pengguna--persona)
5. [Roadmap Pengembangan Bahasa](#5-roadmap-pengembangan-bahasa)
6. [Roadmap Pengembangan UI/UX](#6-roadmap-pengembangan-uiux)
7. [Roadmap Pengembangan Fitur](#7-roadmap-pengembangan-fitur)
8. [Prioritas & Timeline](#8-prioritas--timeline)
9. [Metrik Keberhasilan](#9-metrik-keberhasilan)
10. [Dependensi & Risiko](#10-dependensi--risiko)

---

## 1. Ringkasan Eksekutif

UmrohPlus adalah platform SaaS full-stack untuk travel agent perjalanan umroh Indonesia. Platform ini mengelola seluruh siklus: dari pemasaran paket, pemesanan, pembayaran, manajemen jemaah, hingga laporan keuangan dan CRM.

Saat ini platform sudah memiliki fondasi teknis yang solid (React 19, TypeScript, Supabase, Express 5, Drizzle ORM) dan fitur-fitur inti yang fungsional. PRD ini mendokumentasikan rencana pengembangan komprehensif untuk menjadikan UmrohPlus platform #1 untuk travel umroh di Indonesia.

---

## 2. Kondisi Produk Saat Ini

### 2.1 Fitur yang Sudah Ada

#### Frontend (Jemaah)
| Fitur | Status | Keterangan |
|-------|--------|------------|
| Landing page CMS | ✅ Aktif | Hero, About, Services, Testimonials |
| Listing paket umroh | ✅ Aktif | Dengan filter dan perbandingan paket |
| Detail paket | ✅ Aktif | Itinerary, hotel, maskapai |
| Pemesanan multi-step | ✅ Aktif | Pilih kamar → data pilgrim → konfirmasi |
| Upload bukti pembayaran | ✅ Aktif | Manual proof upload |
| Cicilan | ⚠️ Parsial | Kalkulator ada di UI, tapi tabel `installment_schedules` **belum ada di Drizzle schema** — alur end-to-end belum jalan sama sekali — lihat [F-05](#f-05--installment-system-end-to-end) |
| E-Tiket | ✅ Aktif | Bisa dicetak |
| Permintaan refund | ⚠️ Parsial | Form pengajuan ada, tapi approval flow & status tracking backend belum lengkap — lihat `AdminRefunds.tsx` |
| Wishlist | ✅ Aktif | Simpan paket favorit |
| Profil & dokumen jemaah | ✅ Aktif | Passport, visa |
| Blog & galeri | ✅ Aktif | CMS-driven |
| Notifikasi | ✅ Aktif | In-app notifications |
| Dark mode | ✅ Aktif | Tailwind-based |
| Bilingual ID/EN | ⚠️ Parsial | Terjemahan statis, belum semua halaman |

#### Frontend (Admin)
| Fitur | Status | Keterangan |
|-------|--------|------------|
| Dashboard analytics | ✅ Aktif | Chart, KPI |
| Manajemen paket | ✅ Aktif | CRUD lengkap |
| Manajemen booking | ✅ Aktif | Status tracking |
| Verifikasi pembayaran | ✅ Aktif | Approve/reject bukti |
| CRM | ✅ Aktif | Data jemaah |
| Manajemen agen | ✅ Aktif | Komisi & withdrawal |
| CMS editor | ✅ Aktif | Landing page, blog |
| Manajemen hotel & maskapai | ✅ Aktif | |
| SEO management | ✅ Aktif | Meta tags |
| System health monitor | ✅ Aktif | |
| 2FA enforcement | ✅ Aktif | TOTP untuk admin |
| Manajemen role | ✅ Aktif | Admin, user |
| Multi-branch | ⚠️ Parsial | Branch dashboard ada |

#### Backend API
- Auth: Supabase Auth (JWT) — lihat catatan di §2.2
- Paket, booking, pembayaran, profil, notifikasi, wishlist
- Payment gateway Midtrans/Xendit: kode create transaction + webhook → update status booking sudah aktif (✅ Selesai — lihat [F-01](#f-01--payment-status-sync-webhook--booking)), **tapi transaksi live masih ❌ Broken** karena env `MIDTRANS_SERVER_KEY`/`MIDTRANS_CLIENT_KEY` atau `XENDIT_API_KEY` belum diisi di environment — lihat §10.1
- Verifikasi pembayaran manual oleh admin dengan audit trail (✅ Aktif — lihat [F-02](#f-02--admin-payment-verification-endpoint))
- Rekening bank transfer manual dikonfigurasi dari Settings, bukan hardcode (✅ Aktif — lihat [F-09](#f-09--konfigurasi-rekening-bank-dari-settings))
- Admin: paket, booking, user, departure, pembayaran, dokumen, CRM, system health

#### Gap Tambahan dari Audit Kode (`docs/FEATURE_STATUS.md`)
| Fitur | Status | Keterangan |
|-------|--------|------------|
| Analytics AI (admin) | 🔲 Unused | Komponen `AnalyticsAI.tsx` ada di UI tapi tidak terhubung ke model AI apapun |
| Contracts (admin) | ⚠️ Parsial | Permission check ada, CRUD kontrak belum diimplementasi |
| Agent Withdrawals | ⚠️ Parsial | UI penarikan komisi ada, approval flow belum jalan |
| Kelola Biaya / Costs (admin) | ⚠️ Parsial | Belum diverifikasi penuh end-to-end |

### 2.2 Stack Teknologi
- **Frontend:** React 19, Vite, Tailwind CSS 4, shadcn/ui, TanStack Query, Framer Motion
- **Backend:** Express 5, TypeScript, Drizzle ORM, PostgreSQL (Supabase)
- **Auth:** Supabase Auth (JWT) — satu-satunya sumber identitas untuk web & API
- **Deployment:** Vercel (API serverless + frontend static)
- **Monorepo:** pnpm workspaces

---

## 3. Visi & Strategi Produk

### 3.1 Visi
> Menjadi platform manajemen perjalanan umroh terlengkap dan paling terpercaya di Indonesia, yang memudahkan travel agent melayani jemaah dari pendaftaran hingga kepulangan.

### 3.2 Proposisi Nilai
- **Untuk Travel Agent:** Satu platform untuk semua — pemasaran, operasional, keuangan
- **Untuk Jemaah:** Pengalaman booking yang transparan, mudah, dan aman
- **Untuk Agen Pemasaran:** Sistem referral dan komisi yang terukur

### 3.3 Prinsip Pengembangan
1. **Indonesia-first** — bahasa, regulasi, dan kebutuhan lokal jadi prioritas utama
2. **Mobile-first** — mayoritas pengguna Indonesia mengakses via HP
3. **Kepercayaan** — transparansi harga, status booking real-time, bukti pembayaran
4. **Skalabilitas** — multi-tenant, multi-branch sejak awal

---

## 4. Pengguna & Persona

### 4.1 Persona Utama

**🕌 Pak Hasan — Jemaah Calon Umroh**
- Usia 45–65 tahun, familier dengan WhatsApp
- Kebutuhan: informasi paket jelas, proses daftar mudah, bisa dipantau status-nya
- Pain point: bingung syarat dokumen, takut kena penipuan, mau cicil

**👩‍💼 Bu Siti — Staff Admin Travel Agent**
- Usia 25–40 tahun, terbiasa pakai spreadsheet
- Kebutuhan: input data cepat, laporan otomatis, notifikasi pembayaran
- Pain point: rekap manual, koordinasi dokumen via WA

**📱 Mas Budi — Agen Pemasaran Freelance**
- Usia 20–35 tahun, aktif di media sosial
- Kebutuhan: link referral, pantau komisi real-time, materi promosi siap pakai
- Pain point: komisi tidak transparan, harus follow-up manual

**🏢 Pak Direktur — Pemilik Travel Agent**
- Kebutuhan: laporan keuangan, performa agen, pertumbuhan booking
- Pain point: tidak ada data terpusat

---

## 5. Roadmap Pengembangan Bahasa

### 5.1 Kondisi Saat Ini
- Bahasa didukung: Indonesia (`id`) dan Inggris (`en`)
- Mekanisme: `LanguageContext` + `translations.ts` (statis) + Supabase Edge Function untuk terjemahan dinamis
- Masalah: terjemahan belum konsisten di semua halaman, konten CMS (blog, FAQ) masih satu bahasa

### 5.2 Fase 1 — Penyempurnaan Bilingual ID/EN (Q3 2026) — ⏳ Belum Selesai

**Tujuan:** Semua halaman dan komponen 100% bilingual tanpa teks hardcoded.

**Deliverables:**
- [ ] Audit seluruh komponen — identifikasi teks yang masih hardcoded (Indonesian)
- [ ] Lengkapi `translations.ts` untuk semua key yang hilang
- [ ] Halaman admin juga diterjemahkan (saat ini masih Indonesia saja)
- [ ] Error messages, validasi form, dan toast notifications diterjemahkan
- [ ] Email notifikasi bilingual (template per bahasa)
- [ ] Language preference tersimpan di profil user (bukan hanya localStorage)
- [ ] SEO: `hreflang` tag dan sitemap terpisah per bahasa

**Kriteria Penerimaan:**
- Switching bahasa di manapun langsung efek ke semua elemen halaman
- Tidak ada teks Bahasa Indonesia yang muncul saat EN dipilih (vice versa)
- Language preference persist setelah login ulang

### 5.3 Fase 2 — Dukungan Bahasa Arab (Q4 2026) — ⏳ Belum Dimulai

**Tujuan:** Tambah Bahasa Arab sebagai bahasa ketiga, dengan dukungan RTL penuh.

**Deliverables:**
- [ ] Tambah `ar` ke `LanguageContext` dan `translations.ts`
- [ ] RTL layout: CSS `dir="rtl"` dan `text-align: right` via Tailwind plugin
- [ ] Font Arab: tambah Google Fonts Noto Naskh Arabic / Amiri
- [ ] Komponen yang butuh penyesuaian RTL: Navbar, Sidebar, Cards, Form fields, Table
- [ ] Terjemahan halaman-halaman publik (landing, paket, booking)
- [ ] Admin UI: cukup ID/EN (admin umumnya berbahasa Indonesia)

**Catatan Teknis:**
- Tailwind 4 support RTL dengan class `rtl:` prefix
- Perlu review komponen `framer-motion` agar animasi tidak terbalik di RTL
- Halaman e-tiket perlu layout terpisah untuk RTL

**Kriteria Penerimaan:**
- Seluruh halaman publik tampil benar di mode RTL Arab
- Teks campuran (angka, nama Latin) render dengan benar di dalam teks Arab

### 5.4 Fase 3 — Bahasa Melayu & Lokalisasi Regional (2027) — ⏳ Belum Dimulai

**Tujuan:** Ekspansi ke Malaysia dan Brunei dengan dukungan Bahasa Melayu.

**Deliverables:**
- [ ] Tambah `ms` (Melayu Malaysia) ke sistem terjemahan
- [ ] Lokalisasi format: mata uang (MYR), nomor telepon (+60), tanggal
- [ ] Tenant-level language setting: setiap travel agent bisa set bahasa default
- [ ] Multi-currency display: IDR, MYR, SGD (display only, bukan konversi real-time)

---

## 6. Roadmap Pengembangan UI/UX

### 6.1 Prinsip Desain

- **Kepercayaan visual:** Warna emas dan hijau islami yang menenangkan
- **Kejelasan:** Informasi paket tidak ambigu — harga all-in, fasilitas eksplisit
- **Kecepatan:** Core Web Vitals LCP < 2.5s, TTI < 3.5s
- **Aksesibilitas:** WCAG 2.1 AA — penting untuk segmen usia 45+

### 6.2 Fase 1 — Audit & Perbaikan Dasar (Q3 2026) — ⏳ Belum Selesai

**6.2.1 Mobile Experience**
- [ ] Audit semua halaman di viewport 375px (iPhone SE) dan 390px (iPhone 14)
- [ ] Bottom navigation bar untuk mobile (Home, Paket, Booking, Profil)
- [ ] Sticky CTA "Pesan Sekarang" pada halaman detail paket di mobile
- [ ] Form booking: step indicator yang lebih jelas di mobile
- [ ] Touch target minimum 44×44px di semua tombol dan link

**6.2.2 Performa & Loading**
- [ ] Skeleton loading untuk semua data-fetching (ganti spinner global)
- [ ] Image lazy loading dan `next-gen` format (WebP/AVIF) untuk foto paket/hotel
- [ ] Infinite scroll atau pagination yang lebih smooth pada listing paket
- [ ] Service Worker untuk offline-first pada halaman yang tidak butuh data real-time

**6.2.3 Aksesibilitas**
- [ ] Semua tombol punya label ARIA
- [ ] Contrast ratio minimal 4.5:1 untuk body text
- [ ] Focus ring yang terlihat (penting untuk keyboard navigation)
- [ ] Alt text untuk semua gambar paket dan galeri

### 6.3 Fase 2 — Peningkatan Konversi (Q4 2026) — ⏳ Belum Dimulai

**6.3.1 Halaman Paket & Detail**
- [ ] **Social proof strip:** Total jemaah yang sudah berangkat + rating
- [ ] **Urgency indicator:** "Sisa X kursi" dan "X orang sedang melihat paket ini"
- [ ] **Price breakdown modal:** Rincian biaya all-in yang transparan
- [ ] **Comparison tool enhancement:** Bandingkan hingga 3 paket side-by-side dengan highlight perbedaan
- [ ] **Virtual tour:** Embed Google Street View hotel di Mekkah/Madinah
- [ ] **Itinerary timeline:** Tampilan visual hari per hari (bukan list biasa)

**6.3.2 Proses Booking**
- [ ] **Progress bar** yang lebih jelas dengan estimasi waktu ("~5 menit lagi")
- [ ] **Auto-save draft:** Booking tidak hilang jika browser ditutup
- [ ] **Smart form:** NIK validasi format, nomor paspor validasi checksum
- [ ] **Pilihan kamar visual:** Tampilkan denah/foto tipe kamar
- [ ] **Ringkasan booking sticky** di sidebar (desktop) / collapsible (mobile)

**6.3.3 Dashboard Jemaah**
- [ ] **Timeline perjalanan:** Visualisasi status (Mendaftar → Lunas → Dokumen Lengkap → Berangkat)
- [ ] **Checklist dokumen:** Dengan progress bar dan reminder
- [ ] **Countdown keberangkatan:** Timer visual
- [ ] **Manasik digital:** Materi persiapan umroh built-in

**6.3.4 Admin Dashboard**
- [ ] **Kanban booking:** Drag-and-drop status booking (mirip Trello)
- [ ] **Heat map booking:** Kalender visual kapan keberangkatan padat
- [ ] **Quick actions:** Keyboard shortcuts untuk operasi admin yang sering dilakukan
- [ ] **Bulk operations:** Approve/reject multiple pembayaran sekaligus
- [ ] **Collapse/expand sidebar:** Lebih banyak ruang kerja di layar kecil

### 6.4 Fase 3 — Personalisasi & Delight (2027) — ⏳ Belum Dimulai

- [ ] **Onboarding jemaah baru:** Guided tour interaktif saat pertama login
- [ ] **Rekomendasi paket:** Berdasarkan budget dan tanggal preferensi
- [ ] **Dark/Light mode sync:** Ikuti system preference secara otomatis
- [ ] **Animasi micro-interaction:** Konfirmasi booking, pembayaran verified, dll.
- [ ] **Print-friendly:** Semua dokumen (e-tiket, invoice, itinerary) punya tampilan cetak yang rapi
- [ ] **PWA full:** Install ke homescreen, push notification native

---

## 7. Roadmap Pengembangan Fitur

### 7.0 Audit Operasional Detail (F-01–F-09)

> Sumber: audit kode nyata (bukan asumsi), digabung dari bekas `PRD_OPERASIONAL.md`.
> Setiap item bertanda ✅ **Selesai** sudah diverifikasi berjalan di kode; ⏳ **Belum** artinya spek/arsitektur di bawah ini masih perlu dibangun.

Konteks: fondasi transaksi (booking, payment gateway, admin CRUD, agent/komisi, multi-tenant, CMS) sudah solid, tapi ada beberapa lubang operasional. Dokumen ini mendefinisikan 9 item yang menutup lubang tersebut.

#### F-01 · Payment Status Sync (Webhook → Booking) — ✅ Selesai
Webhook Midtrans/Xendit meneruskan status pembayaran ke `bookings.status` secara otomatis (`artifacts/api-server/src/routes/payment-gateway-webhooks.ts`) — jamaah tidak perlu lagi menunggu update manual dari staff.

#### F-02 · Admin Payment Verification Endpoint — ✅ Selesai
`PATCH /api/admin/payments/verify/:id` dan `.../reject/:id` (`artifacts/api-server/src/routes/admin/payments.ts`) sudah tersedia dengan audit trail (`verifiedBy`/`verifiedAt`).

#### F-03 · Email Notification System — ✅ Selesai (kode), ⏳ Butuh kredensial
**Status terkini (diverifikasi 2026-07-15):** Sudah terimplementasi di kode — paket `lib/email` (client, service, **4 dari 5 template**) sudah ada dan sudah dipanggil dari `bookings.ts`, `admin/payments.ts`, `admin/documents.ts`, `payment-gateway-webhooks.ts`, dan `paymentSync.ts` lewat dispatcher `emailNotifications.ts`. Retry logic (MAX_ATTEMPTS=2, exponential backoff) sudah ada. Yang belum ada: template `installment_reminder`, unsubscribe link, dan admin preview template. Kredensial (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`) belum diisi — tanpa itu, pengiriman email di-skip secara graceful (tidak crash, hanya log).

**Provider yang dipilih:** Resend (free tier 3.000 email/bulan, SDK TypeScript native, tidak perlu SMTP).

**User stories:**
- Jamaah dapat email konfirmasi setelah booking berhasil.
- Jamaah dapat email receipt setiap kali pembayaran dikonfirmasi.
- Jamaah dapat reminder H-7 sebelum keberangkatan.

**Acceptance criteria:**
- [x] 4 template email sudah ada: `booking_created`, `payment_received`, `documents_complete`, `departure_reminder`
- [ ] Template ke-5: `installment_reminder` (belum dibuat — menunggu F-05)
- [ ] Email terkirim dalam 30 detik setelah event terjadi
- [x] Jika Resend error, event tidak hilang — retry MAX_ATTEMPTS=2 dengan exponential backoff sudah ada
- [ ] Admin bisa preview template dari Settings
- [ ] Email punya unsubscribe link (CAN-SPAM compliance)

| ID | Trigger | Penerima | Subjek |
|---|---|---|---|
| `booking_created` | Booking baru dibuat | Jamaah | Konfirmasi Pemesanan #{booking_code} |
| `payment_received` | Payment diverifikasi | Jamaah | Pembayaran Diterima — {package_name} |
| `installment_reminder` | H-7 sebelum jatuh tempo cicilan | Jamaah | Pengingat Cicilan ke-{n} Jatuh Tempo |
| `departure_reminder` | H-14 sebelum keberangkatan | Jamaah | Persiapan Keberangkatan {departure_date} |
| `documents_complete` | Semua dokumen diverifikasi admin | Jamaah | Dokumen Anda Lengkap ✓ |

**Arsitektur:**
```
lib/
└── email/                          [PAKET BARU]
    ├── package.json                (dep: resend)
    ├── src/
    │   ├── client.ts               (Resend instance, singleton)
    │   ├── templates/               (React Email templates × 5)
    │   ├── emailService.ts         (send() wrapper dengan retry)
    │   └── index.ts

artifacts/api-server/src/lib/notifications/emailNotifications.ts  (dispatch per event)
```

**Env baru:** `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`

#### F-04 · WhatsApp Automation (Fonnte) — ✅ Selesai (kode), ⏳ Butuh kredensial
**Status terkini (diverifikasi 2026-07-15):** Sudah terimplementasi penuh di kode — paket `lib/whatsapp` (client, service, template) sudah ada dan sudah dipanggil dari rute booking/payment/dokumen/chat lewat dispatcher `waNotifications.ts`, termasuk endpoint blast (`POST /api/admin/chats/blast/:departureId`). Yang belum ada hanya kredensial (`FONNTE_API_TOKEN`, `WA_SENDER_NUMBER`) — tanpa itu, pengiriman WA di-skip secara graceful (tidak crash, hanya log).

**Provider yang dipilih:** Fonnte (REST sederhana, tidak perlu WhatsApp Business API resmi, umum dipakai travel agent Indonesia).

**User stories:**
- Jamaah dapat WA otomatis saat booking dikonfirmasi.
- Jamaah dapat WA reminder H-7 keberangkatan.
- Admin bisa kirim WA blast ke semua jamaah satu keberangkatan.

**Acceptance criteria:**
- [ ] WA terkirim dalam 60 detik setelah event
- [ ] Template pesan disimpan di `site_settings` (bisa diubah admin) — ⚠️ saat ini masih hardcoded di `templates.ts`
- [x] Nomor tidak valid → dicatat ke log, tidak crash (normalisasi nomor + retry MAX_ATTEMPTS=2 sudah ada)
- [ ] Admin bisa kirim WA manual dari halaman detail booking
- [x] Admin bisa kirim WA blast per keberangkatan — endpoint `POST /api/admin/chats/blast/:departureId` sudah ada

**Arsitektur:**
```
lib/whatsapp/            [PAKET BARU] — client.ts, templates.ts, waService.ts
artifacts/api-server/src/routes/admin/chats.ts   [TAMBAH] POST /blast/:departureId
artifacts/api-server/src/lib/notifications/waNotifications.ts
```

**Env baru:** `FONNTE_API_TOKEN`, `WA_SENDER_NUMBER`

#### F-05 · Installment System (End-to-End) — ⏳ Belum
**Problem:** Tabel `installment_schedules` ada di Supabase tapi (1) tidak ada di Drizzle schema, (2) tidak ada business logic auto-generate, (3) tidak ada payment gateway per cicilan, (4) tidak ada reminder otomatis.

**Acceptance criteria:**
- [ ] Booking dengan payment type `dp`/`installment` → generate jadwal cicilan otomatis (DP + n cicilan bulanan dari config paket)
- [ ] User lihat jadwal cicilan di `/my-bookings` dan `/dashboard`
- [ ] Admin lihat semua cicilan di halaman Installments
- [ ] Reminder otomatis H-7 via WA + email
- [ ] Payment gateway bisa generate VA/QRIS per cicilan
- [ ] `installment_schedules` masuk ke Drizzle schema (`lib/db/src/schema/bookings.ts`)

**Endpoint baru:** `GET /api/bookings/:id/installments`, `POST /api/bookings/:id/installments/:n/pay`, `GET /api/admin/installments`, `GET /api/admin/installments/overdue`.

**Reminder cron:** tiap hari 08:00 WIB, cari `due_date = CURRENT_DATE + 7 AND status='pending'`, kirim WA+email.

#### F-06 · PDF Export — ⚠️ Parsial
**Status terkini (diverifikasi 2026-07-15):** Dua dari tiga deliverable sudah ada di `artifacts/api-server/src/lib/pdf/` — `bookingConfirmation.ts` dan `manifest.ts` sudah terimplementasi server-side. Yang belum ada: Excel laporan komisi (`exceljs`) dan tombol download dari UI jemaah belum terhubung penuh.

**Library:** `@react-pdf/renderer` (PDF, server-side), `exceljs` (Excel).

**Acceptance criteria:**
- [x] PDF konfirmasi booking — `bookingConfirmation.ts` sudah ada (`GET /api/bookings/:id/confirmation.pdf`)
- [x] PDF manifest per keberangkatan — `manifest.ts` sudah ada (`GET /api/admin/departures/:id/manifest.pdf`)
- [ ] Excel laporan komisi agen (per periode/agen, subtotal) — `exceljs` belum diimplementasi
- [x] Semua digenerate server-side untuk keamanan data

#### F-07 · User-Facing Loyalty System — ⚠️ Parsial
**Status terkini (diverifikasi 2026-07-15):** UI sudah ada — `LoyaltyWidget.tsx` di dashboard dan halaman `/loyalty` (`Loyalty.tsx`) sudah terimplementasi. Yang belum ada: logika auto-award poin saat booking completed dan opsi "Gunakan Poin" saat checkout.

**Acceptance criteria:**
- [x] Widget "Poin Saya" di `/dashboard` user — `LoyaltyWidget.tsx` sudah ada
- [x] Halaman `/loyalty` dengan riwayat poin — `Loyalty.tsx` sudah ada
- [ ] Poin otomatis bertambah saat booking `status → completed` (1 poin / Rp 100.000)
- [ ] Opsi "Gunakan Poin" untuk diskon saat booking (min. tukar 100 poin = Rp 10.000)

**Arsitektur:** trigger DB atau event API saat booking selesai → `fn_award_loyalty_points(booking_id)` → hitung dari `total_harga` → insert `loyalty_points` → upsert `loyalty_balances`.

#### F-08 · Manasik — Sesi & Absensi — ⚠️ Parsial
**Status terkini (diverifikasi 2026-07-15):** Manajemen **materi** manasik (upload PDF/video, CMS public GET) sudah ada di `admin/content.ts` dan `cms.ts`. Yang belum ada: penjadwalan sesi tatap muka, absensi, dan notifikasi otomatis.

**Acceptance criteria:**
- [x] Upload dan akses materi manasik (PDF/video) — sudah ada via `admin/content.ts`
- [ ] CRUD jadwal sesi manasik per departure (tanggal, waktu, lokasi, kapasitas)
- [ ] Daftar hadir per sesi (centang manual atau scan QR dari manifest)
- [ ] Notifikasi WA otomatis H-1 sebelum sesi
- [ ] Jamaah lihat jadwal manasik di `/my-bookings/:id`; admin lihat rekap kehadiran

**Schema baru (masih dibutuhkan):** tabel `manasik_sessions` (departure_id, title, session_date, start_time, end_time, location, notes) dan `manasik_attendances` (session_id, booking_id, pilgrim_id, attended, attended_at, notes).

#### F-09 · Konfigurasi Rekening Bank dari Settings — ✅ Selesai
Rekening bank transfer manual sekarang disimpan di `site_settings` (key `bank_accounts`) dan diatur lewat `GET`/`PUT /api/misc/payment-settings` (`artifacts/api-server/src/routes/misc.ts`) — admin bisa ubah tanpa deploy ulang, mendukung banyak rekening sekaligus.

---

### 7.1 Fase 1 — Penyelesaian & Penguatan Inti (Q3 2026) — ⚠️ Sebagian Selesai

Prioritas: Fitur yang sudah ada tapi belum sempurna.

**7.1.1 Pembayaran & Keuangan**
- [x] **Payment gateway integration:** Midtrans/Xendit sudah aktif untuk pembayaran online (kartu kredit, transfer bank, e-wallet, QRIS) — lihat [F-01](#f-01--payment-status-sync-webhook--booking)
- [ ] **Cicilan otomatis end-to-end** + reminder jatuh tempo via WhatsApp — lihat [F-05](#f-05--installment-system-end-to-end)
- [ ] **Refund workflow:** Status tracking refund yang bisa diikuti jemaah (Diajukan → Diproses → Ditransfer)
- [ ] **Invoice/konfirmasi booking PDF otomatis** — lihat [F-06](#f-06--pdf-export)
- [ ] **Laporan keuangan:** Export ke Excel/PDF, rekonsiliasi otomatis — lihat [F-06](#f-06--pdf-export)

**7.1.2 Manajemen Dokumen**
- [ ] **Checklist dokumen per paket:** Admin bisa tentukan dokumen apa yang wajib
- [ ] **Upload dokumen jemaah:** Scan paspor, KTP, foto, vaksin
- [ ] **Validasi dokumen:** Masa berlaku paspor minimal 6 bulan otomatis dicek
- [ ] **Reminder dokumen:** Notifikasi H-60, H-30, H-14 sebelum keberangkatan
- [ ] **Sertifikat keberangkatan:** Generate otomatis setelah perjalanan selesai

**7.1.3 Notifikasi & Komunikasi**
- [x] **WhatsApp integration (Fonnte):** Kode selesai — tinggal isi `FONNTE_API_TOKEN` & `WA_SENDER_NUMBER` — lihat [F-04](#f-04--whatsapp-automation-fonnte)
- [x] **Email transaksional:** Kode selesai (4/5 template) — tinggal isi `RESEND_API_KEY` — lihat [F-03](#f-03--email-notification-system)
- [ ] **Push notification:** Via PWA untuk update status booking real-time
- [ ] **Notification center:** Riwayat semua notifikasi dengan filter (baca/belum baca)

### 7.2 Fase 2 — Fitur Pertumbuhan (Q4 2026) — ⏳ Belum Dimulai

**7.2.1 Sistem Agen & Referral**
- [ ] **Dashboard agen yang lengkap:** Statistik booking dari referral, pendapatan, konversi
- [ ] **Materi promosi:** Download banner, flyer digital siap pakai per paket
- [ ] **Multi-level komisi:** Agen bisa punya sub-agen dengan komisi berjenjang
- [ ] **Withdrawal otomatis:** Transfer komisi ke rekening setelah threshold terpenuhi
- [ ] **Leaderboard agen:** Gamifikasi untuk mendorong performa
- [ ] **Landing page agen:** Setiap agen punya microsite dengan URL custom (`agen.umrohplus.com/budi`)

**7.2.2 Manajemen Grup & Multi-Jemaah**
- [ ] **Booking grup:** Satu booking untuk banyak jemaah (family package, grup masjid)
- [ ] **PIC grup:** Satu orang sebagai koordinator, bisa kelola data anggota grup
- [ ] **Room assignment:** Admin bisa assign jemaah ke kamar hotel tertentu
- [ ] **Manifest penumpang:** Generate daftar penumpang untuk maskapai (format standar)

**7.2.3 CRM & Manajemen Leads**
- [ ] **Pipeline leads:** Tracking calon jemaah dari interest → booking
- [ ] **Follow-up scheduler:** Reminder otomatis untuk follow-up calon jemaah yang belum booking
- [ ] **Segmentasi:** Tag jemaah berdasarkan paket, status, asal daerah
- [ ] **Riwayat interaksi:** Catatan semua percakapan, panggilan, email dengan jemaah
- [ ] **Repeat customer:** Identifikasi dan berikan penawaran khusus untuk jemaah yang sudah pernah umroh

**7.2.4 Konten & Pemasaran**
- [ ] **Blog dengan SEO tools:** Saran keyword, readability score, preview Google snippet
- [ ] **Galeri foto perjalanan:** Upload foto keberangkatan per batch/departure
- [ ] **Video testimoni:** Upload dan embed video testimoni jemaah
- [ ] **Countdown package:** Timer keberangkatan yang bisa di-embed di landing page
- [ ] **Social media kit:** Generate konten siap post untuk Instagram/Facebook

### 7.3 Fase 3 — Fitur Lanjutan & Inovasi (2027) — ⏳ Belum Dimulai

**7.3.1 Operasional Lapangan**
- [ ] **Mobile app untuk musyrif/guide:** Check-in jemaah, absensi, lokasi GPS
- [ ] **Tracking keberangkatan:** Jemaah dan keluarga bisa pantau posisi grup (opt-in)
- [ ] **Emergency contact system:** Tombol darurat yang langsung notifikasi admin dan keluarga
- [ ] **Manasik online:** Modul belajar manasik berbasis video, quiz interaktif

**7.3.2 Integrasi Eksternal**
- [ ] **Integrasi BPIH/Ditjen PHU:** Sinkronisasi data dengan sistem pemerintah (jika API tersedia)
- [ ] **API maskapai:** Cek ketersediaan kursi dan harga real-time (Garuda, Saudi Arabian Airlines)
- [ ] **API hotel:** Tarif dan ketersediaan hotel di Mekkah/Madinah
- [ ] **Integrasi imigrasi:** Verifikasi status visa (jika API tersedia)

**7.3.3 Analytics & Business Intelligence**
- [ ] **AI-powered forecasting:** Prediksi tren booking per kuartal
- [ ] **Analisis konversi funnel:** Di mana calon jemaah drop-off
- [ ] **Cohort analysis:** Retensi dan repeat booking per agen/paket
- [ ] **Heatmap interaksi:** Elemen mana di landing page yang paling banyak diklik
- [ ] **Laporan eksekutif otomatis:** Email ringkasan mingguan ke pemilik travel agent

**7.3.4 Multi-Tenant SaaS**
- [ ] **White-label:** Travel agent lain bisa pakai platform ini dengan branding sendiri
- [ ] **Custom domain per tenant:** `booking.travelhajiumroh.com`
- [ ] **Tier pricing:** Basic (1 branch), Pro (unlimited branch + agen), Enterprise (custom)
- [ ] **Tenant isolation:** Data per tenant benar-benar terpisah
- [ ] **Super admin:** Dashboard untuk kelola semua tenant dari satu tempat

---

## 8. Prioritas & Timeline

### 8.1 Ringkasan Status & Prioritas per Fase

| Area | Fase | Status | Prioritas | Alasan |
|---|---|---|---|---|
| Fitur | Fase 1 — Penyelesaian & Penguatan Inti (§7.1) | ⚠️ Sebagian Selesai | **P0** | Payment gateway & F-01/F-02/F-09 sudah aktif; F-03/F-04 kode selesai tinggal kredensial; sisanya (refund tracking, PDF invoice, checklist dokumen) belum — ini fondasi transaksi, harus dituntaskan dulu sebelum fitur baru |
| UI/UX | Fase 1 — Audit & Perbaikan Dasar (§6.2) | ⏳ Belum Selesai | **P0** | Mobile UX, performa, dan aksesibilitas dasar berdampak langsung ke seluruh basis pengguna (45+ tahun, mayoritas mobile) |
| Bahasa | Fase 1 — Penyempurnaan Bilingual ID/EN (§5.2) | ⏳ Belum Selesai | **P1** | Kualitas produk saat ini, tapi tidak seblocking transaksi/mobile UX |
| Fitur | F-05 Cicilan End-to-End | ⏳ Belum | **P1** | Revenue driver untuk paket mahal, banyak jemaah pakai cicilan |
| Fitur | F-06 PDF Export | ⚠️ Parsial | **P1** | PDF booking & manifest sudah ada; Excel laporan komisi belum |
| Fitur | Manajemen Dokumen (checklist, validasi, reminder) (§7.1.2) | ⏳ Belum | **P1** | Wajib untuk kepatuhan syarat keberangkatan (paspor, visa) |
| Fitur | Dashboard Agen Lengkap (§7.2.1) | ⏳ Belum | **P1** | Mendorong pertumbuhan booking lewat agen yang sudah ada |
| Fitur | F-07 Loyalty User-Facing | ⚠️ Parsial | **P2** | UI (widget + halaman) sudah ada; auto-award & redeem saat checkout belum |
| Fitur | F-08 Manasik — Sesi & Absensi | ⚠️ Parsial | **P2** | Materi upload sudah ada; sesi, absensi, dan notifikasi H-1 belum |
| UI/UX | Fase 2 — Peningkatan Konversi (§6.3) | ⏳ Belum Dimulai | **P2** | Baru relevan setelah fondasi (Fase 1 UI/UX & fitur) selesai |
| Fitur | Booking Grup & Room Assignment (§7.2.2) | ⏳ Belum | **P2** | Effort tinggi, dibutuhkan untuk segmen grup/keluarga |
| Fitur | CRM Pipeline & Leads (§7.2.3) | ⏳ Belum | **P2** | Mendukung pertumbuhan, tapi CRM dasar (data jemaah) sudah ada |
| Bahasa | Fase 2 — Bahasa Arab + RTL (§5.3) | ⏳ Belum Dimulai | **P2** | Effort tinggi (RTL layout), nilai strategis tapi bukan kebutuhan mendesak |
| Fitur | Konten & Pemasaran (§7.2.4) | ⏳ Belum | **P2** | Mendukung akuisisi, bisa berjalan paralel dengan tim marketing |
| UI/UX | Fase 3 — Personalisasi & Delight (§6.4) | ⏳ Belum Dimulai | **P3** | Polish jangka panjang, butuh fondasi konversi selesai dulu |
| Bahasa | Fase 3 — Bahasa Melayu & Regional (§5.4) | ⏳ Belum Dimulai | **P3** | Ekspansi pasar baru (Malaysia/Brunei), bukan kebutuhan pasar saat ini |
| Fitur | Fase 3 — Fitur Lanjutan & Inovasi (§7.3) | ⏳ Belum Dimulai | **P3** | Operasional lapangan, integrasi eksternal, multi-tenant white-label — semua butuh fondasi P0–P2 selesai lebih dulu |

**Legenda:** ✅ Selesai · ⚠️ Sebagian Selesai · ⏳ Belum Dimulai/Belum Selesai · **P0** = blocker inti bisnis, kerjakan sekarang · **P1** = dampak tinggi, kerjakan berikutnya · **P2** = pertumbuhan, setelah fondasi kuat · **P3** = jangka panjang/ekspansi

### 8.2 Matriks Prioritas

| Fitur | Impact | Effort | Prioritas | Status |
|-------|--------|--------|-----------|--------|
| Payment gateway (Midtrans/Xendit) | 🔴 Tinggi | 🟡 Sedang | P0 | ✅ Selesai |
| Email transaksional (F-03) | 🔴 Tinggi | 🟢 Rendah | P0 | ✅ Kode selesai — butuh `RESEND_API_KEY` |
| WhatsApp notifikasi (F-04) | 🔴 Tinggi | 🟢 Rendah | P0 | ✅ Kode selesai — butuh `FONNTE_API_TOKEN` |
| Mobile UX audit & fix | 🔴 Tinggi | 🟡 Sedang | P0 | ⏳ Belum |
| Cicilan end-to-end (F-05) | 🔴 Tinggi | 🟡 Sedang | P1 | ⏳ Belum |
| PDF export (F-06) | 🟡 Sedang | 🟢 Rendah | P1 | ⚠️ Parsial — PDF booking & manifest selesai; Excel komisi belum |
| Bilingual ID/EN sempurna | 🟡 Sedang | 🟢 Rendah | P1 | ⏳ Belum |
| Checklist & upload dokumen | 🔴 Tinggi | 🟡 Sedang | P1 | ⏳ Belum |
| Dashboard agen lengkap | 🟡 Sedang | 🟡 Sedang | P1 | ⏳ Belum |
| Loyalty user-facing (F-07) | 🟡 Sedang | 🟢 Rendah | P2 | ⚠️ Parsial — UI sudah ada; auto-award & redeem belum |
| Manasik sesi & absensi (F-08) | 🟡 Sedang | 🟡 Sedang | P2 | ⚠️ Parsial — materi upload ada; sesi & absensi belum |
| Booking grup | 🟡 Sedang | 🔴 Tinggi | P2 | ⏳ Belum |
| Bahasa Arab + RTL | 🟡 Sedang | 🔴 Tinggi | P2 | ⏳ Belum |
| CRM pipeline | 🟡 Sedang | 🟡 Sedang | P2 | ⏳ Belum |
| Multi-tenant white-label | 🔴 Tinggi | 🔴 Tinggi | P3 | ⏳ Belum |
| Mobile app lapangan | 🟡 Sedang | 🔴 Tinggi | P3 | ⏳ Belum |

### 8.3 Timeline Indikatif

```
2026
├── Q3 (Jul–Sep)
│   ├── [BAHASA]  Audit & penyempurnaan bilingual ID/EN
│   ├── [UX]      Mobile audit, skeleton loading, aksesibilitas dasar
│   ├── [FITUR]   Payment gateway Midtrans/Xendit
│   ├── [FITUR]   WhatsApp notifikasi
│   └── [FITUR]   Manajemen dokumen jemaah
│
├── Q4 (Okt–Des)
│   ├── [BAHASA]  Dukungan Bahasa Arab + RTL
│   ├── [UX]      Peningkatan konversi: urgency, social proof, comparison
│   ├── [UX]      Kanban & bulk operations di admin
│   ├── [FITUR]   Cicilan otomatis + reminder
│   ├── [FITUR]   Dashboard agen yang lengkap
│   └── [FITUR]   CRM pipeline & leads management
│
2027
├── Q1 (Jan–Mar)
│   ├── [BAHASA]  Bahasa Melayu + lokalisasi regional
│   ├── [UX]      PWA full + push notification
│   ├── [FITUR]   Booking grup & room assignment
│   └── [FITUR]   Analitik lanjutan & laporan eksekutif
│
└── Q2+ (Apr–Des)
    ├── [FITUR]   Integrasi API maskapai & hotel
    ├── [FITUR]   Mobile app lapangan (musyrif)
    ├── [FITUR]   Multi-tenant white-label SaaS
    └── [FITUR]   Manasik digital & tracking perjalanan
```

### 8.4 Sprint Plan — Gap Operasional (F-01–F-09)

| Sprint | Fokus | Item | Status |
|---|---|---|---|
| Sprint 1 — Stabilitasi Transaksi | Kritis: tanpa ini transaksi tidak aman | F-01, F-02, F-09 | ✅ Selesai |
| Sprint 2 — Komunikasi Dasar | Tinggi: standar minimum bisnis travel | F-03, F-04 | ✅ Kode selesai — tinggal isi kredensial provider |
| Sprint 3 — Cicilan & Dokumen | Tinggi: revenue driver paket mahal | F-05 (belum), F-06 (parsial — Excel komisi saja yang sisa) | ⚠️ Parsial |
| Sprint 4 — Engagement & Operasional | Sedang: kualitas layanan | F-07 (parsial — auto-award & redeem belum), F-08 (parsial — sesi & absensi belum) | ⚠️ Parsial |

### 8.5 Library & Environment Variables Baru (untuk F-03–F-08)

| Library | Paket Target | Kegunaan |
|---|---|---|
| `resend` | `lib/email` (baru) | Email API — F-03 |
| `@react-email/components` | `lib/email` | Template email React — F-03 |
| Fonnte REST client (tanpa SDK) | `lib/whatsapp` (baru) | WhatsApp API — F-04 |
| `@react-pdf/renderer` | `artifacts/api-server` | PDF generation server-side — F-06 |
| `exceljs` | `artifacts/api-server` | Excel export — F-06 |
| `node-cron` | `artifacts/api-server` | Scheduler reminder cicilan/manasik |

| Variable | Keterangan | Untuk |
|---|---|---|
| `RESEND_API_KEY` | API key dari resend.com | F-03 |
| `EMAIL_FROM` | Alamat email pengirim | F-03 |
| `EMAIL_FROM_NAME` | Nama pengirim | F-03 |
| `FONNTE_API_TOKEN` | Token dari fonnte.com | F-04 |
| `WA_SENDER_NUMBER` | Nomor WA pengirim (format 628xxx) | F-04 |

---

## 9. Metrik Keberhasilan

### 9.1 Metrik Produk (OKR)

**Konversi & Booking**
- Conversion rate halaman paket → booking: target **>5%** (baseline TBD)
- Booking completion rate (mulai → selesai bayar): target **>70%**
- Waktu rata-rata dari registrasi ke booking pertama: target **<15 menit**

**Retensi & Kepuasan**
- NPS (Net Promoter Score) jemaah: target **>50**
- Repeat booking rate: target **>15%** dalam 2 tahun
- Churn travel agent: target **<5% per tahun**

**Operasional Admin**
- Waktu verifikasi pembayaran: target **<4 jam** (dari upload ke konfirmasi)
- Dokumen lengkap H-30 keberangkatan: target **>95% jemaah**

**Teknis**
- Uptime: **>99.5%**
- Core Web Vitals LCP: **<2.5 detik**
- Error rate API: **<0.1%**

### 9.2 Metrik Bahasa
- Persentase komponen yang bilingual penuh: target **100%** pada akhir Q3 2026
- Pengguna yang aktif pakai EN: diukur via language preference di profil
- Pengguna Arab (setelah launch): diukur via browser locale analytics

---

## 10. Dependensi & Risiko

### 10.1 Dependensi Teknis

| Dependensi | Tujuan | Status |
|------------|--------|--------|
| Supabase PostgreSQL | Database utama | ✅ Aktif |
| Vercel | Deployment API & frontend | ✅ Aktif |
| Midtrans / Xendit | Payment gateway | ❌ Broken — kode webhook aktif, tapi `MIDTRANS_SERVER_KEY`/`MIDTRANS_CLIENT_KEY`/`XENDIT_API_KEY` belum diisi |
| Resend | Email transaksional (F-03) | ⏳ Belum integrasi |
| Fonnte | WhatsApp API (F-04) | ⏳ Belum integrasi |
| Cloudinary / Supabase Storage | Upload foto jemaah & paket | ⏳ Evaluasi |

### 10.2 Risiko & Mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|--------|-------------|--------|----------|
| Regulasi izin travel (Kemenag) berubah | Sedang | Tinggi | Monitor peraturan, desain sistem fleksibel |
| Payment gateway downtime | Rendah | Tinggi | Fallback ke manual transfer + bukti upload |
| Data jemaah leak | Rendah | Sangat Tinggi | Enkripsi at-rest, audit log, HTTPS only |
| Skalabilitas saat peak haji season | Sedang | Tinggi | Auto-scaling Vercel, optimasi query DB |
| Terjemahan Arab tidak akurat | Tinggi | Sedang | Review oleh native speaker sebelum rilis |

### 10.3 Asumsi
- Travel agent memiliki tim admin minimal 1 orang yang familiar dengan browser
- Jemaah memiliki smartphone Android/iOS dengan koneksi internet memadai
- Integrasi pemerintah (BPIH) masih belum tersedia API-nya di 2026

---

## Appendix

### A. Glosarium

| Istilah | Definisi |
|---------|----------|
| Jemaah | Peserta perjalanan umroh |
| Musyrif | Pembimbing/guide perjalanan umroh |
| Departure | Satu jadwal keberangkatan untuk satu paket |
| PIC | Person In Charge — koordinator grup atau pemesanan |
| BPIH | Biaya Penyelenggaraan Ibadah Haji (regulasi Kemenag) |
| Manasik | Pelatihan tata cara ibadah umroh sebelum keberangkatan |
| Mahram | Wali yang wajib mendampingi jemaah perempuan |

### B. Referensi

- [Shadcn/ui Documentation](https://ui.shadcn.com)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS RTL Guide](https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support)
- [Midtrans Integration Guide](https://docs.midtrans.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- Peraturan Menteri Agama tentang Penyelenggaraan Umroh

---

*Dokumen ini adalah living document — diperbarui setiap sprint planning dan quarterly review.*  
*Bekas `docs/PRD_OPERASIONAL.md` sudah digabung ke dalam §7.0, §8.3, dan §8.4 di atas agar tidak ada dua PRD terpisah.*  
*Terakhir diperbarui: 15 Juli 2026 — v1.4: audit codebase langsung (bukan asumsi). F-06 diperbarui ke ⚠️ Parsial (PDF booking & manifest ada, Excel komisi belum). F-07 diperbarui ke ⚠️ Parsial (UI widget & halaman ada, auto-award & redeem belum). F-08 diperbarui ke ⚠️ Parsial (materi upload ada, sesi & absensi belum). F-03 diperbarui: 4/5 template ada, retry ada, installment_reminder & unsubscribe belum. F-04 diperbarui: blast endpoint ada, template masih hardcoded (belum di site_settings). installment_schedules dikonfirmasi belum ada di Drizzle schema.*
