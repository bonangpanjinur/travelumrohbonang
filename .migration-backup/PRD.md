# PRD — Umroh Gateway / Travel Umroh Raka 

Snapshot status produk. Diperbarui: Mei 2026.

---

## 1. Tujuan & Audiens

Platform travel umroh all-in-one (B2C + B2B agen + multi-tenant): booking online, manajemen jamaah & dokumen, pembayaran fleksibel (DP / cicilan / gateway), program agen + komisi, CRM lead, AI analytics, SEO kuat.

Audiens:
1. **Jamaah** — cari paket, booking, bayar, e-ticket, dokumen.
2. **Agen / Mitra** — referral, komisi, withdrawal, leaderboard.
3. **Admin / Super Admin** — operasional, keuangan, konten, tenant.
4. **Branch Manager** — operasional cabang.
5. **Pengunjung organik** — landing SEO.

---

## 2. Status Inti per Modul

Legenda: ✅ selesai • 🟡 sebagian • ❌ belum • 🔑 butuh kredensial/keputusan user.

| Area | Status | Catatan |
|------|--------|---------|
| **Auth & Role** | ✅ | buyer / agent / admin / super_admin / branch_manager + AdminRoute & AuthRoute. |
| **2FA TOTP** | ✅ | `/account/2fa` (enrol), gate login langkah-2, force-enroll untuk staff. |
| **HIBP password** | ✅ | `password_hibp_enabled` aktif via configure_auth. |
| **Captcha & rate limit** | 🟡 | Turnstile + rate-limit di Auth & Booking. Form leads / refund belum. |
| **E-signature kontrak** | 🟡 | `/contract/:bookingId` aktif, tombol di My Bookings. Belum jadi prasyarat pelunasan. |
| **Error tracking (Sentry)** | 🟡 🔑 | SDK terpasang & ErrorBoundary aktif. No-op tanpa `VITE_SENTRY_DSN`. |
| **Paket, departures, hotels, airlines, muthawif** | ✅ | CRUD admin lengkap + extra hotels per paket. |
| **Booking 3-step + rooms + pilgrims** | ✅ | Validasi Zod (NIK 16 digit). |
| **Payments (DP / Cicilan / Lunas) + proof** | ✅ | Verifikasi terpusat di `/admin/payments` + access log. |
| **Payment gateway Midtrans/Xendit** | 🟡 | Edge function + webhook ada. Rekonsiliasi otomatis belum. |
| **Multi-currency** | 🟡 | Admin lengkap, tampilan publik belum konsisten. |
| **Akuntansi & laporan keuangan** | 🟡 | `/admin/accounting` ada; ekspor jurnal / neraca komisi belum. |
| **Komisi agen + withdrawal** | ✅ | Per pilgrim per paket, leaderboard, target & forecast. |
| **Affiliate cookie 30 hari** | ✅ | `/r/:code` set cookie, auto-assign saat booking. |
| **PDF promosi agen** | ✅ | `PromoPdfButton` client-side. |
| **CRM lead + follow-up** | ✅ | Pipeline, task, conversion tracking. |
| **Chat realtime (jamaah↔admin)** | ✅ | Supabase Realtime. |
| **Notifikasi admin in-app** | ✅ | Polling 60s. |
| **Email transaksional (Resend)** | ❌ 🔑 | Butuh `RESEND_API_KEY`. |
| **WhatsApp notif (Fonnte/Wablas)** | ❌ 🔑 | Butuh API key. |
| **Web Push** | ❌ | Belum. |
| **Live chat publik (Crisp/Tawk/in-house)** | ❌ | Hanya chat dalam konteks booking. |
| **Reminder pg_cron** | ✅ | Daily 09:00 → `payment-reminder`, `follow-up-reminder`. |
| **Manifest keberangkatan + QR jamaah** | ✅ | Print-ready, QR per jamaah. |
| **Scanner QR check-in** | ✅ | `/admin/checkin` + tabel `check_ins`. |
| **Galeri per-keberangkatan** | ✅ | `admin/DepartureGallery`. |
| **Manasik kit** | ✅ | Admin CRUD + halaman publik. |
| **Dokumen jamaah (passport/visa)** | 🟡 | Bucket private + tracking. Signed URL + access log seperti payment-proofs belum. |
| **Watermark gambar** | 🟡 | Client-side overlay (`lib/watermark.ts`). Bucket `gallery` masih public; signed-URL flow belum. |
| **CMS (Pages, Blog, FAQ, Testimonials, Reviews, Gallery)** | ✅ | Struktur lengkap. |
| **Halaman default (Tentang, Kontak, T&C, Privacy, Tata Cara Bayar)** | ❌ | Template/seed konten belum disiapkan. |
| **Filter paket di `/paket`** | 🟡 | Dasar saja (harga/durasi/bulan/hotel/maskapai/kategori belum lengkap). |
| **Wishlist, review publik + rating, sticky CTA mobile, kalkulator cicilan, compare paket** | ✅ | |
| **Loyalty poin** | ✅ | Admin adjust. |
| **Export data PDP** | ✅ | Edge `export-user-data`. |
| **SEO on-page** | ✅ | `<SEO/>` tenant-aware, JSON-LD Org/WebSite/Product/Article/FAQ/Breadcrumb/LocalBusiness per cabang, og:image dinamis per paket & artikel. |
| **Sitemap & robots** | ✅ | Sitemap main + multi-tenant via edge function `sitemap`, robots.txt + Sitemap directive. |
| **301 slug redirect** | ✅ | `/admin/slug-redirects` + helper. |
| **Google Search Console verification per tenant** | ✅ | Meta verification per `tenant_sites`. |
| **Multi-tenant (Classic/Modern/Premium) + billing** | ✅ | Termasuk tier free subdomain vs paid custom domain. |
| **Multi-branch** | ✅ | Dashboard cabang. |
| **AI analytics (Gemini)** | ✅ | Predictive. |
| **Multi-language ID/EN** | ✅ | Edge `translate`. |
| **Audit logs** | 🟡 | View + filter dasar. Ekspor & filter lanjutan belum. |
| **Role management & impersonate** | ✅ | Banner aktif, audit start/end tercatat. |
| **Backup terjadwal DB** | ❌ | Belum. |
| **Export CSV terstandar semua tabel admin** | 🟡 | Hanya leaderboard + sebagian. |

---

## 3. Backlog Aktif

### P1 — Wajib sebelum scale produksi
1. **Email transaksional Resend** 🔑 — booking confirm, reminder DP/cicilan H-7/H-1, e-ticket, refund. Trigger via DB hook atau frontend.
2. **WhatsApp notif Fonnte/Wablas** 🔑 — paralel dengan email.
3. **Halaman default CMS** — seed `Tentang`, `Kontak`, `T&C`, `Privacy`, `Tata Cara Bayar` (struktur sudah ada di Pages, isi belum).
4. **Filter lengkap `/paket`** — harga (range), durasi, bulan keberangkatan, hotel, maskapai, kategori, kuota tersisa.
5. **Kontrak digital sebagai prasyarat pelunasan** — block tombol bayar lunas jika `contracts.signed_at` null.
6. **Rate limit + captcha** di form leads (CRM publik) & refund request.
7. **Signed URL + log akses** untuk bucket `pilgrim-documents` (mirip `payment_proof_access_logs`).
8. **Sentry DSN production** 🔑 — user isi `VITE_SENTRY_DSN`.

### P2 — Operasional & keuangan
9. **Rekonsiliasi otomatis** Midtrans/Xendit ↔ booking payments (cron harian + report mismatch).
10. **Export keuangan**: jurnal harian, neraca komisi agen, laporan refund, semua → CSV/XLSX.
11. **Export CSV terstandar** untuk semua tabel admin (helper `exportCsv.ts` sudah ada, perlu di-wire ke setiap tabel).
12. **Audit logs export + filter** lanjutan (per actor, per action, range tanggal).
13. **Multi-currency display publik** — konversi rate harian di PackageDetail.
14. **Watermark signed-URL flow** — pindah bucket `gallery` ke private, edge function `watermark-image`.
15. **Backup terjadwal** — pg_dump → Supabase Storage harian, retensi 30 hari.

### P3 — Pertumbuhan
16. **Web Push** (jamaah + admin).
17. **Live chat widget publik** (Crisp/Tawk atau in-house global).
18. **Materi promosi tambahan** — brosur PDF print A4, video pendek auto-generate.
19. **Affiliate analytics dashboard** — chart conversion per agen, sumber traffic.

### Dependensi user (🔑)
| Item | Kebutuhan |
|------|-----------|
| Email transaksional | `RESEND_API_KEY` + verified sender domain |
| WhatsApp notif | `FONNTE_API_KEY` atau `WABLAS_API_KEY` |
| Sentry | `VITE_SENTRY_DSN` (Sentry Settings → Projects → Client Keys) |
| Watermark private | Konfirmasi: bucket `gallery` boleh dipindah ke private? URL lama akan break. |

---

## 4. Roadmap Sprint Berikutnya (usulan)

- **Sprint F — Komunikasi**: Email Resend → WhatsApp → templating notifikasi konsisten.
- **Sprint G — Keuangan**: rekonsiliasi gateway, export jurnal/neraca, multi-currency publik.
- **Sprint H — Konten & Konversi**: seed CMS default + filter `/paket` lengkap + kontrak sebagai prasyarat pelunasan.
- **Sprint I — Hardening**: signed URL dokumen jamaah + watermark private + rate-limit form publik + Sentry production + backup terjadwal.
- **Sprint J — Growth**: Web Push, live chat publik, affiliate analytics.

---

## 5. Definition of Done — item P1

1. **Email Resend**: 5 template terkirim end-to-end (sandbox + production), retry on failure, dicatat di `email_logs`.
2. **WhatsApp**: opt-in per user di profile, fallback ke email jika gagal.
3. **CMS default**: 5 halaman publish, link di footer, lulus lighthouse SEO ≥ 90.
4. **Filter paket**: 6 filter aktif, URL query-string, share-able, hasil < 300 ms p95.
5. **Kontrak prasyarat**: badge "Wajib tanda tangan" di booking, tombol pelunasan disabled + tooltip.
6. **Rate limit leads/refund**: 5 req / 15 menit per IP, captcha appear ≥ 3 req.
7. **Signed URL dokumen**: semua akses dokumen lewat edge function + tercatat di `pilgrim_document_access_logs`.
8. **Sentry**: error production tercatat dengan release tag + user context (tanpa PII).

---

## 6. Teknis — referensi file kunci

- **Auth/2FA**: `src/pages/Auth.tsx`, `src/pages/Account2FA.tsx`.
- **Captcha & rate-limit**: `src/components/TurnstileCaptcha.tsx`, `src/lib/rateLimit.ts`.
- **Error tracking**: `src/lib/sentry.ts`, `src/lib/errorLogger.ts`, `src/main.tsx`.
- **E-sign**: `src/components/SignaturePad.tsx`, `src/pages/ContractSign.tsx`.
- **SEO**: `src/components/SEO.tsx`, `src/components/BreadcrumbJsonLd.tsx`, `src/components/PageFAQ.tsx`, `src/components/RelatedPackages.tsx`, `src/components/RelatedArticles.tsx`, `src/components/LocalBusinessJsonLd.tsx`.
- **Sitemap**: `scripts/generate-sitemap.ts` (main) + edge function `supabase/functions/sitemap` (per tenant).
- **Affiliate**: `src/lib/affiliate.ts`, route `/r/:code`.
- **Promo PDF**: `src/lib/promoPdf.ts`.
- **Watermark**: `src/lib/watermark.ts` (client-side; flow signed-URL belum).
- **Audit**: `src/lib/audit.ts`.
- **Pembayaran**: edge `payment-gateway`, `payment-webhook`, `payment-reminder`.
- **AI**: edge `analytics-ai`, `translate`.
- **Skema DB**: `database-full-schema.sql` (idempoten, IF NOT EXISTS).

Stack: React 18 + Vite + Tailwind + shadcn + Supabase (Lovable Cloud) + Edge Functions Deno.

---

## 7. Riwayat Selesai (ringkas)

- **Sprint A** — gating super admin, SEO menyeluruh, leaderboard CSV, impersonate banner.
- **Sprint B** — pg_cron daily reminder (edge `payment-reminder`).
- **Sprint C** — wishlist, review publik + JSON-LD, sticky CTA mobile, kalkulator cicilan.
- **Sprint D** — compare paket, loyalty admin, export data PDP.
- **Sprint E** — FAQ JSON-LD per scope, BreadcrumbList konsisten, internal linking otomatis, canonical/og/hreflang tenant-aware.
- **Sprint Operasional & B2B** — galeri keberangkatan, watermark client-side, QR check-in, manasik kit, PDF promosi agen, target & forecast komisi, affiliate cookie 30 hari.
- **Sprint Keamanan** — 2FA TOTP + gate login, Turnstile + rate limit Auth/Booking, e-signature kontrak, HIBP, Sentry SDK.
- **Sprint SEO lanjutan** — og:image dinamis, sitemap multi-tenant, 301 slug redirect, GSC verification per tenant, LocalBusiness per cabang.
