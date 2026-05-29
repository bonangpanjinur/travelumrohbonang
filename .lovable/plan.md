# PRD — Umroh Gateway / Travel Umroh Bonang

> Catatan housekeeping: file `plan.md`, `HASIL_PERBAIKAN_AUTH_DASHBOARD.md`, `RENCANA_PERBAIKAN_AUTH_DASHBOARD.md`, `SUMMARY_FIX_ADMIN.md`, `TESTING_GUIDE.md` akan **dihapus**. Hanya `PRD.md` (+ `README.md`) yang dipertahankan, sesuai permintaan.

---

## 0. Status Cepat (hasil analisis)

- **bpanjinur63@gmail.com** sudah terdaftar sebagai `super_admin` di `user_roles` (user_id `37ad3abe-…`). Tidak perlu migrasi role. Yang perlu dipastikan: setelah login, menu Admin tampil di Navbar/Dashboard untuk role `super_admin`. Akan diverifikasi pada `Navbar.tsx` / `useAuth` dan diperbaiki bila ada gating yang salah (mis. hanya cek `admin`, bukan `super_admin`).
- **Leaderboard agen** & **Impersonate** sudah ada (`/admin/leaderboard`, edge function `admin-impersonate`). Akan di-audit & disempurnakan (filter periode, ekspor, pencatatan audit, UX tombol "Login as").
- **SEO**: `SEO.tsx` (react-helmet-async) sudah ada tapi belum dipakai di banyak route, `index.html` masih generik, **tidak ada `sitemap.xml`**, `robots.txt` tidak menunjuk sitemap, tidak ada hreflang, tidak ada breadcrumb JSON-LD, gambar OG masih placeholder Unsplash.

---

## 1. Tujuan Produk

Menjadi platform travel umroh **all-in-one** (B2C + B2B agen + multi-tenant) dengan: booking online lengkap, manajemen jamaah & dokumen, pembayaran fleksibel (DP / cicilan / gateway), program agen + komisi, CRM lead, AI analytics, dan SEO yang kuat untuk akuisisi organik.

## 2. Audiens

1. Jamaah (buyer) — cari paket, booking, bayar, e-ticket, dokumen.
2. Agen / Mitra — referral, komisi, withdrawal, leaderboard.
3. Admin / Super Admin — kelola operasional, keuangan, konten, tenant.
4. Branch Manager — operasional cabang.
5. Calon jamaah dari pencarian Google — landing SEO.

---

## 3. PEKERJAAN TAHAP INI (yang dikerjakan setelah PRD disetujui)

### 3.1 Akses Super Admin (bpanjinur63@gmail.com)
- Verifikasi `useAuth` / `AdminRoute` menerima `super_admin` (bukan hanya `admin`).
- Tampilkan menu **Admin** di Navbar untuk role `super_admin` & `admin`.
- Pastikan menu khusus super admin (Role Management, Audit Logs, Impersonate) hanya muncul untuk `super_admin`.

### 3.2 Penguatan SEO (PRIORITAS UTAMA)

**On-page**
- Tulis ulang `index.html`: title & description spesifik per brand, canonical relatif, OG image yang relevan, JSON-LD `Organization` + `WebSite` (dengan `SearchAction`).
- Pasang komponen `<SEO />` di setiap route publik yang belum: `Auth`, `ForgotPassword`, `NotFound` (noindex), dan halaman jamaah privat (noindex).
- Per-page metadata yang unik untuk: `Index`, `Paket`, `PackageDetail` (judul = `{paket} — {durasi} hari • Berangkat {bulan}`), `Blog`, `BlogDetail`, `Gallery`, `DynamicPage`, `TenantSite`.
- JSON-LD per tipe halaman:
  - `Product` / `TouristTrip` untuk PackageDetail (price, currency, availability, image, aggregateRating bila ada testimoni).
  - `Article` untuk BlogDetail (sudah ada, dilengkapi `BreadcrumbList`).
  - `BreadcrumbList` global via helper.
  - `FAQPage` di Index/PackageDetail dari tabel `faqs`.
  - `Review`/`AggregateRating` dari `pilgrim_testimonials`.
- Heading semantik (1 H1 per page), `alt` text wajib di Gallery/Blog/Package images.

**Technical SEO**
- `public/sitemap.xml` dinamis: paket aktif, blog publish, dynamic pages, kategori, tenant. Diregenerasi via edge function `generate-sitemap` (dijalankan cron harian + on-demand setelah publish).
- `robots.txt` ditambah `Sitemap: https://umroh-gateway.lovable.app/sitemap.xml`, disallow `/admin`, `/dashboard`, `/my-*`, `/agent`, `/payment`.
- `lang="id"` pada `<html>`, tambahkan `hreflang="id"` & `hreflang="en"` (siap multi-bahasa yang sudah ada).
- Canonical menggunakan domain publish (`umroh-gateway.lovable.app`) atau custom domain dari `site_settings`.
- Performance: lazy-load image (`loading="lazy"`), `width/height` eksplisit, preconnect ke Supabase Storage, font display swap.
- 404 page mengembalikan status logical noindex + link ke sitemap.

**Off-page / content**
- Halaman pilar: `/paket`, `/paket/umroh-reguler`, `/paket/umroh-plus`, `/paket/haji-plus`, `/blog/kategori/*`.
- Internal linking otomatis: PackageDetail → blog terkait (by category tag) dan testimonial.
- `og:image` per paket = `image_url` paket (sudah ada di DB).

**Tracking**
- Field GA4/GSC verification di `site_settings`, di-render di `<SEO/>`.
- Event tracking dasar (booking_started, booking_paid) — disiapkan hook `useAnalytics`.

### 3.3 Penyempurnaan Leaderboard Agen
- Filter periode: 7d / 30d / 90d / YTD / custom (sudah ada — tambah custom range picker).
- Kolom: ranking, nama, total booking, total nilai, total komisi, konversi (lead→booking).
- Badge "Top Performer" + medali untuk top 3.
- Ekspor CSV.
- Catat akses di `audit_logs` (`view_leaderboard`).

### 3.4 Penyempurnaan Impersonate
- Konfirmasi modal sebelum impersonate.
- Banner kuning persisten di seluruh app saat sesi impersonate aktif: "Anda sedang login sebagai {nama}. [Keluar]".
- Edge function mencatat `impersonate_start` & `impersonate_end` ke `audit_logs`.
- Batasi `super_admin` saja; tolak impersonate ke `super_admin` lain.

---

## 4. ANALISIS KEKURANGAN & ROADMAP FITUR

### 4.1 Yang sudah ada (tidak perlu dibangun ulang)
Auth + roles (buyer/agent/admin/super_admin/branch_manager), packages + departures + pricing + hotels + airlines + airports + muthawif, bookings 3-step + rooms + pilgrims, payments (DP/installment/full) + proof + gateway (Midtrans/Xendit), invoice, e-ticket QR, refund request, chat realtime, notifications, CRM (leads + follow-ups), agent portal + commissions + withdrawals, leaderboard, multi-branch, multi-tenant (Classic/Modern/Premium + billing), pilgrim documents (passport/visa), AI analytics, multi-currency, multi-language, audit logs, role management.

### 4.2 Kekurangan yang perlu diperbaiki (P1)
1. **SEO** lemah (lihat 3.2).
2. **Email transaksional** belum ada: konfirmasi booking, reminder DP/cicilan jatuh tempo, e-ticket, refund status. → Edge function + template via Resend/SMTP.
3. **WhatsApp notification** (Indonesia-first): integrasi Fonnte/Wablas opsional.
4. **Reminder otomatis** (pg_cron): DP jatuh tempo H-3, cicilan H-7/H-1, dokumen visa kadaluarsa.
5. **Search & filter** di halaman `/paket`: filter harga, durasi, bulan keberangkatan, hotel, maskapai, kategori. Saat ini terbatas.
6. **Wishlist / Save package** untuk jamaah.
7. **Review & rating publik** di PackageDetail (sudah ada `pilgrim_testimonials`, tapi belum ditampilkan dengan rating agregat + JSON-LD).
8. **Galeri per paket / per keberangkatan** (foto dokumentasi).
9. **Halaman "Tentang Kami", "Kontak", "Syarat & Ketentuan", "Privacy Policy", "Tata Cara Pembayaran"** — gunakan `pages` CMS yang sudah ada, isi konten default.
10. **Sticky CTA mobile** ("Pesan Sekarang" / "Chat WA") di PackageDetail.
11. **Rate limiting & captcha** di Auth & form publik (`leads`, `RefundRequest`).
12. **Backup & export data** (CSV) untuk semua tabel admin (bookings, jamaah, pembayaran).
13. **Manifest keberangkatan** lebih lengkap: PDF print-ready dengan QR per jamaah.
14. **Akses dokumen jamaah** dengan signed URL + watermark + log akses (struktur log sudah ada untuk payment proof, replikasi).

### 4.3 Fitur baru yang sebaiknya ada (P2)
1. **Kalkulator simulasi DP & cicilan** di PackageDetail.
2. **Perbandingan paket** (compare 2-3 paket).
3. **Program loyalitas** poin untuk jamaah berulang & referral antar-jamaah.
4. **Dashboard agen B2B**: target bulanan, progress bar, materi promosi (download brosur, link tracking).
5. **Pusat unduhan**: brosur PDF, perlengkapan, panduan manasik per paket.
6. **Live chat support** (selain chat per-booking): widget bawah-kanan ke admin.
7. **Notifikasi push** (Web Push API) untuk status booking & promo.
8. **Tour virtual / video** di PackageDetail.
9. **Affiliate link tracking** dengan cookie 30 hari (saat ini hanya localStorage).
10. **Audit logs export** + filter berdasarkan user/action/date.
11. **Multi-currency display** di harga publik (sudah ada switcher, perlu dipasang di PackageDetail / Paket).
12. **Saved searches & email alert** untuk paket sesuai preferensi.

### 4.4 Kepatuhan & operasional (P3)
1. Halaman **kebijakan refund** & **kontrak digital** ditandatangani sebelum pembayaran final.
2. **Two-factor authentication** untuk admin & super admin.
3. **GDPR/UU PDP**: tombol export data pribadi + delete account untuk jamaah.
4. **Audit security berkala**: aktifkan HIBP (leaked password) di Auth — sudah disebut sebelumnya, tindaklanjuti.
5. **Monitoring**: integrasi error tracking (Sentry) — opsional.

---

## 5. Roadmap Eksekusi (urutan implementasi)

**Sprint A — Sekarang (tahap ini):**
1. Hapus file plan lama (`plan.md`, `HASIL_*`, `RENCANA_*`, `SUMMARY_*`, `TESTING_*`).
2. Pastikan super admin `bpanjinur63@gmail.com` melihat menu Admin (perbaikan `Navbar` & `AdminRoute` bila perlu).
3. SEO menyeluruh (3.2): `index.html`, sitemap edge function + `public/sitemap.xml` placeholder, `robots.txt`, `<SEO/>` di semua route + JSON-LD per tipe.
4. Penyempurnaan Leaderboard (3.3) dan Impersonate (3.4).

**Sprint B:** Email transaksional + WA notification + pg_cron reminders + filter paket lengkap + halaman CMS default (T&C, Privacy, dll).

**Sprint C:** Review publik + wishlist + sticky CTA + galeri keberangkatan + manifest PDF + signed URL dokumen.

**Sprint D:** Loyalitas, compare paket, kalkulator cicilan, push notification, 2FA, export GDPR.

---

## 6. Teknis Singkat (untuk eksekutor)

- Stack: React 18 + Vite + Tailwind + shadcn + Supabase (Lovable Cloud) + Edge Functions Deno.
- Sitemap: edge function `generate-sitemap` membaca `packages`, `blog_posts`, `pages`, `tenant_sites`; menulis ke storage `cms-images/sitemap.xml` atau di-serve langsung; `public/sitemap.xml` redirect via meta jika perlu, atau di-generate ulang ke `public/` lewat skrip build.
- Email: edge function `send-email` (Resend) + template HTML; trigger dari DB (`AFTER INSERT` payments) atau dari frontend.
- Reminder: `pg_cron` job tiap jam → tabel `notifications` + edge function pengirim email/WA.
- Audit logs: helper `logAudit()` sudah ada → wajib dipanggil di semua aksi admin sensitif.
- Tidak ada file `.md` perencanaan baru selain `PRD.md` ini.

---

## 7. Definisi Selesai untuk Sprint A
- File plan lama terhapus, repo bersih (cuma `README.md` + `PRD.md`).
- Login `bpanjinur63@gmail.com` → terlihat menu Admin & bisa buka semua halaman admin termasuk Role Management, Audit Logs, Impersonate.
- Google Rich Results Test pass untuk Organization, Product (PackageDetail), Article (BlogDetail), FAQ, Breadcrumb.
- `sitemap.xml` accessible dan terdaftar di `robots.txt`.
- Leaderboard punya filter custom + ekspor CSV.
- Impersonate punya banner aktif & dicatat di audit logs (start/end).
