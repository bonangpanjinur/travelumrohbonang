# Product Requirements Document (PRD)
## UmrohPlus — Platform Manajemen Perjalanan Umroh

**Versi:** 1.0  
**Tanggal:** Juli 2026  
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
| Cicilan | ✅ Aktif | InstallmentCalculator |
| E-Tiket | ✅ Aktif | Bisa dicetak |
| Permintaan refund | ✅ Aktif | Form pengajuan refund |
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
- Auth: Replit OIDC + session-based
- Paket, booking, pembayaran, profil, notifikasi, wishlist
- Admin: paket, booking, user, departure, pembayaran, dokumen, CRM, system health

### 2.2 Stack Teknologi
- **Frontend:** React 19, Vite, Tailwind CSS 4, shadcn/ui, TanStack Query, Framer Motion
- **Backend:** Express 5, TypeScript, Drizzle ORM, PostgreSQL (Supabase)
- **Auth:** Replit OIDC (web), Supabase (data)
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

### 5.2 Fase 1 — Penyempurnaan Bilingual ID/EN (Q3 2026)

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

### 5.3 Fase 2 — Dukungan Bahasa Arab (Q4 2026)

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

### 5.4 Fase 3 — Bahasa Melayu & Lokalisasi Regional (2027)

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

### 6.2 Fase 1 — Audit & Perbaikan Dasar (Q3 2026)

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

### 6.3 Fase 2 — Peningkatan Konversi (Q4 2026)

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

### 6.4 Fase 3 — Personalisasi & Delight (2027)

- [ ] **Onboarding jemaah baru:** Guided tour interaktif saat pertama login
- [ ] **Rekomendasi paket:** Berdasarkan budget dan tanggal preferensi
- [ ] **Dark/Light mode sync:** Ikuti system preference secara otomatis
- [ ] **Animasi micro-interaction:** Konfirmasi booking, pembayaran verified, dll.
- [ ] **Print-friendly:** Semua dokumen (e-tiket, invoice, itinerary) punya tampilan cetak yang rapi
- [ ] **PWA full:** Install ke homescreen, push notification native

---

## 7. Roadmap Pengembangan Fitur

### 7.1 Fase 1 — Penyelesaian & Penguatan Inti (Q3 2026)

Prioritas: Fitur yang sudah ada tapi belum sempurna.

**7.1.1 Pembayaran & Keuangan**
- [ ] **Payment gateway integration:** Midtrans atau Xendit untuk pembayaran online langsung (kartu kredit, transfer bank, e-wallet GoPay/OVO/DANA, QRIS)
- [ ] **Cicilan otomatis:** Jadwal cicilan yang dihasilkan otomatis + reminder H-3 jatuh tempo via WhatsApp
- [ ] **Refund workflow:** Status tracking refund yang bisa diikuti jemaah (Diajukan → Diproses → Ditransfer)
- [ ] **Invoice otomatis:** PDF invoice tergenerate saat pembayaran dikonfirmasi
- [ ] **Laporan keuangan:** Export ke Excel/PDF, rekonsiliasi otomatis

**7.1.2 Manajemen Dokumen**
- [ ] **Checklist dokumen per paket:** Admin bisa tentukan dokumen apa yang wajib
- [ ] **Upload dokumen jemaah:** Scan paspor, KTP, foto, vaksin
- [ ] **Validasi dokumen:** Masa berlaku paspor minimal 6 bulan otomatis dicek
- [ ] **Reminder dokumen:** Notifikasi H-60, H-30, H-14 sebelum keberangkatan
- [ ] **Sertifikat keberangkatan:** Generate otomatis setelah perjalanan selesai

**7.1.3 Notifikasi & Komunikasi**
- [ ] **WhatsApp integration (Fonnte/Wablas):** Notifikasi booking, pembayaran, keberangkatan via WA
- [ ] **Email transaksional:** Konfirmasi booking, payment receipt, reminder dokumen
- [ ] **Push notification:** Via PWA untuk update status booking real-time
- [ ] **Notification center:** Riwayat semua notifikasi dengan filter (baca/belum baca)

### 7.2 Fase 2 — Fitur Pertumbuhan (Q4 2026)

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

### 7.3 Fase 3 — Fitur Lanjutan & Inovasi (2027)

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

### 8.1 Matriks Prioritas

| Fitur | Impact | Effort | Prioritas |
|-------|--------|--------|-----------|
| Payment gateway (Midtrans) | 🔴 Tinggi | 🟡 Sedang | P0 |
| WhatsApp notifikasi | 🔴 Tinggi | 🟢 Rendah | P0 |
| Mobile UX audit & fix | 🔴 Tinggi | 🟡 Sedang | P0 |
| Bilingual ID/EN sempurna | 🟡 Sedang | 🟢 Rendah | P1 |
| Checklist & upload dokumen | 🔴 Tinggi | 🟡 Sedang | P1 |
| Dashboard agen lengkap | 🟡 Sedang | 🟡 Sedang | P1 |
| Invoice PDF otomatis | 🟡 Sedang | 🟢 Rendah | P1 |
| Booking grup | 🟡 Sedang | 🔴 Tinggi | P2 |
| Bahasa Arab + RTL | 🟡 Sedang | 🔴 Tinggi | P2 |
| CRM pipeline | 🟡 Sedang | 🟡 Sedang | P2 |
| Multi-tenant white-label | 🔴 Tinggi | 🔴 Tinggi | P3 |
| Mobile app lapangan | 🟡 Sedang | 🔴 Tinggi | P3 |

### 8.2 Timeline Indikatif

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
| Midtrans / Xendit | Payment gateway | ⏳ Belum integrasi |
| Fonnte / Wablas | WhatsApp API | ⏳ Belum integrasi |
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
*Terakhir diperbarui: Juli 2026*
