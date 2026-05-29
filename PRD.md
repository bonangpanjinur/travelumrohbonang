# PRD — Umroh Gateway / Travel Umroh Bonang

Satu-satunya dokumen perencanaan produk. Diperbarui: Mei 2026.

---

## 0. Status Cepat

- `bpanjinur63@gmail.com` sudah `super_admin` di tabel `user_roles`. Gating role di `useAuth` / `AdminRoute` sudah menerima `super_admin`. Menu Admin tampil di Navbar untuk role admin & super_admin.
- Leaderboard agen & Impersonate sudah ada di `/admin/leaderboard` dan edge function `admin-impersonate`. Penyempurnaan: ekspor CSV, audit log akses, banner impersonate aktif.
- SEO: komponen `SEO.tsx` (react-helmet-async) sudah ada. Yang ditambah pada sprint ini: rewrite `index.html` default, `sitemap.xml` dinamis, `robots.txt` dengan `Sitemap:` directive, JSON-LD per tipe halaman.

## 1. Tujuan Produk
Platform travel umroh all-in-one (B2C + B2B agen + multi-tenant): booking online, manajemen jamaah & dokumen, pembayaran fleksibel (DP / cicilan / gateway), program agen + komisi, CRM lead, AI analytics, SEO kuat.

## 2. Audiens
1. Jamaah (buyer) — cari paket, booking, bayar, e-ticket, dokumen.
2. Agen / Mitra — referral, komisi, withdrawal, leaderboard.
3. Admin / Super Admin — operasional, keuangan, konten, tenant.
4. Branch Manager — operasional cabang.
5. Pengunjung dari Google — landing SEO.

---

## 3. Sprint A — Sekarang

### 3.1 Akses Super Admin
- Role `super_admin` masuk daftar admin di `useAuth` (`isAdmin = ['admin','superadmin','super_admin'].includes(role)`).
- Menu Admin & link `/admin` muncul di Navbar.
- Menu eksklusif super admin (`Role Management`, `Audit Logs`, `Impersonate`) hanya muncul untuk super_admin.

### 3.2 SEO Menyeluruh
On-page:
- `index.html` di-rewrite: title brand, description deskriptif, OG image relevan, JSON-LD `Organization` + `WebSite` dengan `SearchAction`, canonical relatif, `lang="id"`.
- Komponen `<SEO />` di pasang di halaman publik yang belum (Auth/ForgotPassword/NotFound = noindex). Metadata unik per route: Index, Paket, PackageDetail, Blog, BlogDetail, Gallery, DynamicPage, TenantSite.
- JSON-LD per tipe: `Product/TouristTrip` (PackageDetail), `Article + BreadcrumbList` (BlogDetail), `FAQPage` (Index/PackageDetail), `Review/AggregateRating` (testimoni).
- Satu H1 per halaman; `alt` wajib pada Gallery/Blog/Package image.

Technical:
- `public/sitemap.xml` dibangkitkan `scripts/generate-sitemap.ts` (predev + prebuild) berisi rute statis + paket aktif + blog publish + dynamic pages.
- `robots.txt` ditambah `Sitemap:` + disallow rute privat (`/admin`, `/dashboard`, `/my-*`, `/agent-*`, `/booking`, `/payment`, `/profile`, `/e-ticket`).
- `lang="id"`, `hreflang` `id` & `en`.
- Canonical ke `https://umroh-gateway.lovable.app`.
- Performance: `loading="lazy"`, `decoding="async"` di image, preconnect ke Supabase Storage, font display swap.

### 3.3 Leaderboard
- Filter periode preset & custom date (sudah ada).
- Kolom: rank, nama, booking, total komisi, dibayar.
- Top 3 medali (sudah ada).
- **Tambahan**: ekspor CSV, log akses ke `audit_logs` (`view_leaderboard`).

### 3.4 Impersonate
- Konfirmasi modal sebelum eksekusi.
- Banner kuning persisten saat sesi impersonate (tab baru) — flag di URL (`?impersonated=1`) + label "Keluar".
- Edge function `admin-impersonate` mencatat `impersonate_user` di `audit_logs` (sudah ada). Tolak impersonate ke super_admin lain.

---

## 4. Analisis Kekurangan & Roadmap

### 4.1 Sudah Ada
Auth + roles (buyer/agent/admin/super_admin/branch_manager), packages + departures + pricing + hotels + airlines + airports + muthawif, bookings 3-step + rooms + pilgrims, payments (DP/installment/full) + proof + gateway (Midtrans/Xendit), invoice, e-ticket QR, refund request, chat realtime, notifications, CRM, agent portal + commissions + withdrawals, leaderboard, multi-branch, multi-tenant (Classic/Modern/Premium + billing), pilgrim documents, AI analytics, multi-currency, multi-language, audit logs, role management, impersonate.

### 4.2 P1 — Perlu Diperbaiki
1. SEO lemah (digarap Sprint A).
2. Email transaksional (Resend): konfirmasi booking, reminder DP/cicilan, e-ticket, refund.
3. WhatsApp notification (Fonnte/Wablas) opsional.
4. Reminder otomatis via `pg_cron`: DP H-3, cicilan H-7/H-1, visa kadaluarsa.
5. Filter lengkap di `/paket` (harga/durasi/bulan/hotel/maskapai/kategori).
6. Wishlist paket untuk jamaah.
7. Review publik + rating agregat di PackageDetail + JSON-LD.
8. Galeri per keberangkatan (dokumentasi foto).
9. Halaman CMS default: Tentang Kami, Kontak, T&C, Privacy, Tata Cara Pembayaran.
10. Sticky CTA mobile di PackageDetail (Pesan / Chat WA).
11. Rate limiting & captcha (Auth, form publik leads, refund).
12. Backup & export CSV semua tabel admin.
13. Manifest keberangkatan PDF print-ready dengan QR per jamaah.
14. Akses dokumen jamaah signed URL + watermark + log.

### 4.3 P2 — Fitur Baru
1. Kalkulator simulasi DP & cicilan.
2. Perbandingan 2–3 paket.
3. Loyalitas: poin jamaah + referral antar-jamaah.
4. Dashboard agen B2B: target, materi promosi, brosur PDF.
5. Pusat unduhan (panduan manasik).
6. Live chat support widget global.
7. Web Push notifications.
8. Tour virtual / video di PackageDetail.
9. Affiliate cookie tracking 30 hari.
10. Audit logs export + filter.
11. Multi-currency display di halaman harga publik.
12. Saved searches & email alert.

### 4.4 P3 — Kepatuhan & Operasional
1. Kebijakan refund + kontrak digital sebelum bayar final.
2. 2FA admin & super admin.
3. Export data pribadi + delete account (UU PDP).
4. Aktifkan HIBP (leaked password) di Auth.
5. Error tracking (Sentry) opsional.

---

## 5. Roadmap

**Sprint A (selesai):** housekeeping md, gating super admin, SEO menyeluruh, leaderboard CSV, impersonate banner.

**Sprint B (parsial selesai):** pg_cron daily reminder (memanggil edge `payment-reminder`) ✔︎. Email transaksional (Resend) + WhatsApp belum — menunggu API key user.

**Sprint C (sebagian selesai):** wishlist ✔︎, review publik + JSON-LD ✔︎, sticky CTA mobile ✔︎, kalkulator cicilan ✔︎. Galeri keberangkatan, manifest PDF print-ready, signed URL dokumen belum.

**Sprint D (sebagian selesai):** kalkulator cicilan ✔︎, compare paket ✔︎, loyalty (admin adjust) ✔︎, export data PDP ✔︎. Push, 2FA admin belum.

**Sprint E — SEO Lanjutan (selesai):**
- FAQ JSON-LD per halaman (`PageFAQ`) dengan scope `general` / `paket` / `package` + filter per `package_id` ✔︎.
- BreadcrumbList JSON-LD konsisten (`BreadcrumbJsonLd`) di Paket, PackageDetail, Blog, BlogDetail, Galeri — posisi auto ✔︎.
- Internal linking otomatis (`RelatedPackages` + `RelatedArticles`) di PackageDetail & BlogDetail dengan anchor teks kaya kata kunci ✔︎.
- Canonical, `og:url`, dan hreflang (id/en/x-default) dinamis mengikuti `window.location.origin` agar ranking SEO tidak tercampur antar tenant domain ✔︎; static prod-domain tags di `index.html` dihapus.

---

## 5b. Backlog Aktif (Belum Selesai)

### SEO & Konten
- [ ] og:image dinamis per paket / artikel (generate dari image_url) supaya social preview unik.
- [ ] Sitemap multi-tenant (per domain tenant), saat ini hanya 1 sitemap untuk main domain.
- [ ] Schema `LocalBusiness` per cabang (branches) untuk SEO lokal.
- [ ] Auto-redirect 301 dari URL lama / slug berubah.
- [ ] Google Search Console verification meta per tenant.

### Notifikasi & Komunikasi
- [ ] Email transaksional Resend (konfirmasi booking, DP, cicilan, e-ticket, refund) — butuh `RESEND_API_KEY`.
- [ ] WhatsApp notification via Fonnte/Wablas — butuh API key.
- [ ] Web Push notifications (jamaah + admin).
- [ ] Live chat widget global (Crisp/Tawk.to atau in-house).

### Operasional Jamaah
- [ ] Galeri foto per keberangkatan (dokumentasi alumni).
- [ ] Manifest keberangkatan PDF print-ready dengan QR per jamaah.
- [ ] Signed URL + watermark + log akses dokumen jamaah (passport/visa).
- [ ] Filter lengkap di `/paket` (harga, durasi, bulan, hotel, maskapai, kategori).
- [ ] Halaman CMS default (Tentang Kami, Kontak, T&C, Privacy, Tata Cara Bayar) — template siap pakai.
- [ ] Pusat unduhan panduan manasik.

### B2B / Agen
- [ ] Materi promosi + brosur PDF auto-generate per paket.
- [ ] Target & forecast komisi di dashboard agen.
- [ ] Affiliate cookie tracking 30 hari.

### Keamanan & Kepatuhan
- [ ] 2FA TOTP untuk admin & super_admin.
- [ ] Rate limiting + captcha di Auth & form publik (leads, refund).
- [ ] Kontrak digital + e-signature sebelum pelunasan.
- [ ] Aktifkan HIBP (leaked password protection) di Supabase Auth.
- [ ] Error tracking (Sentry) opsional.

### Operasional Admin
- [ ] Export CSV terstandar untuk semua tabel admin (saat ini hanya leaderboard).
- [ ] Audit logs export + filter lanjutan.
- [ ] Backup terjadwal dump DB ke storage.

---

## 6. Teknis
- Stack: React 18 + Vite + Tailwind + shadcn + Supabase (Lovable Cloud) + Edge Functions Deno.
- Sitemap: skrip `scripts/generate-sitemap.ts` jalan via `predev` & `prebuild`, baca DB Supabase via REST publik (anon key) → tulis `public/sitemap.xml`.
- SEO komponen: `SEO.tsx` (canonical + og + hreflang tenant-aware), `BreadcrumbJsonLd.tsx`, `PageFAQ.tsx`, `RelatedPackages.tsx`, `RelatedArticles.tsx`.
- Email: edge function `send-email` (Resend) + template HTML; trigger via DB hook atau frontend (belum diaktifkan).
- Reminder: pg_cron daily 09:00 → edge `payment-reminder`.
- Audit: helper `logAudit()` di `src/lib/audit.ts` — wajib pada aksi admin sensitif.
- Hanya `PRD.md` (+ `README.md`) sebagai dokumen `.md` repo.

## 7. Definition of Done — Sprint A
- Repo bersih: hanya `README.md` + `PRD.md`.
- `bpanjinur63@gmail.com` login → melihat menu Admin & semua halaman admin.
- `index.html` punya title/description/og/JSON-LD layak.
- `public/sitemap.xml` terbentuk otomatis & terdaftar di `robots.txt`.
- Leaderboard: ekspor CSV + akses tercatat di audit logs.
- Impersonate: banner aktif & audit start/end tercatat.

