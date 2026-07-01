# Feature List
**Umroh Gateway** | Diperbarui: 2026-07-01

Status berdasarkan audit kode + PRD Mei 2026.

**Legenda:**  
✅ Selesai — kode lengkap, siap digunakan  
🟡 Sebagian — kode ada tapi belum sempurna atau butuh konfigurasi  
❌ Belum — belum diimplementasi  
🔑 Butuh kredensial — perlu API key / keputusan eksternal  

---

## AUTH & KEAMANAN

| Fitur | Status | Catatan |
|-------|--------|---------|
| Login / Logout | ✅ | Supabase Auth |
| Register | ✅ | |
| Forgot / Reset Password | ✅ | |
| Role: buyer / agent / admin / super_admin / branch_manager | ✅ | Tabel `user_roles` + RLS |
| Route guard `AuthRoute` | ✅ | |
| Route guard `AdminRoute` | ✅ | |
| 2FA TOTP (authenticator app) | ✅ | Enroll di `/account/2fa`, gate login step-2 |
| Force-enroll 2FA untuk staff | ✅ | Flag `totp_force_enroll` di profiles |
| HIBP password check | ✅ | Aktif via `configure_auth` |
| Captcha Turnstile (auth + booking) | 🟡 | Auth & booking sudah. Form lead/refund belum. |
| Rate limiting (auth + booking) | 🟡 | Sudah di Auth & Booking. Endpoint lain belum. |
| Admin Impersonation | ✅ | Edge Function `admin-impersonate`, log ke audit |
| Export data pribadi (PDP) | ✅ | Edge Function `export-user-data` |

---

## PAKET & KATALOG

| Fitur | Status | Catatan |
|-------|--------|---------|
| CRUD paket (admin) | ✅ | Nama, slug, harga, durasi, DP setting |
| CRUD kategori paket (hierarki) | ✅ | parent_id support |
| CRUD jadwal keberangkatan | ✅ | Kuota, airline, status |
| CRUD hotel per paket | ✅ | Makkah + Madinah |
| CRUD airline & airport | ✅ | |
| CRUD muthawif (pembimbing) | ✅ | |
| CRUD itinerary per paket | ✅ | |
| CRUD HPP / biaya pokok | ✅ | View summary HPP |
| Daftar paket publik `/paket` | 🟡 | Filter dasar saja (harga/durasi). Filter hotel/maskapai/bulan belum lengkap. |
| Detail paket publik | ✅ | |
| Bandingkan paket (compare) | ✅ | Side-by-side comparison |
| Wishlist / simpan paket | ✅ | Per user, persistent |
| Kalkulator cicilan | ✅ | Client-side |
| Multi-currency display | 🟡 | Admin lengkap. Tampilan publik belum konsisten. |
| Halaman SEO paket | ✅ | react-helmet-async + JSON-LD |
| OG Image dinamis | ✅ | Edge Function `og-image` |

---

## BOOKING

| Fitur | Status | Catatan |
|-------|--------|---------|
| Booking 3-step (pilih paket → isi data → konfirmasi) | ✅ | |
| Pilih tipe kamar (quad/triple/double) | ✅ | |
| Input data jamaah (NIK 16 digit, passport, dll) | ✅ | Validasi Zod |
| Kode booking unik | ✅ | Auto-generate via fungsi DB |
| Afiliasi cookie 30 hari | ✅ | `/r/:code` set cookie, auto-assign saat booking |
| Status booking (pending/dp_paid/installment/paid/cancelled) | ✅ | |
| My Bookings (daftar booking user) | ✅ | |
| Detail booking | ✅ | |
| E-Ticket digital | ✅ | |
| QR Code per jamaah | ✅ | `qrcode.react` |
| Refund request | 🟡 | Form ada. Captcha belum. |
| E-signature kontrak | 🟡 | Halaman aktif. Belum jadi prasyarat pelunasan. |

---

## PEMBAYARAN

| Fitur | Status | Catatan |
|-------|--------|---------|
| Upload bukti bayar (manual transfer) | ✅ | Storage bucket `payment-proofs` |
| Verifikasi pembayaran (admin) | ✅ | Terpusat di `/admin/payments` |
| Pembayaran DP | ✅ | |
| Pembayaran cicilan | ✅ | Jadwal cicilan (`installment_schedules`) |
| Pembayaran lunas | ✅ | |
| Access log bukti bayar | ✅ | Tabel `payment_proof_access_logs` |
| Payment gateway Midtrans | 🟡 🔑 | Edge Function ada. Rekonsiliasi otomatis belum. |
| Payment gateway Xendit | 🟡 🔑 | Edge Function ada. Rekonsiliasi otomatis belum. |
| Webhook notifikasi gateway | 🟡 | Sudah ada. Belum production-tested. |
| Rekonsiliasi otomatis | ❌ | Belum diimplementasi. |

---

## JAMAAH & DOKUMEN

| Fitur | Status | Catatan |
|-------|--------|---------|
| Input data jamaah per booking | ✅ | |
| Upload dokumen (passport, visa, foto) | 🟡 | Bucket private + tracking. Signed URL + access log belum. |
| Tracking status dokumen | 🟡 | Ada tabel, belum ada UI notifikasi lengkap. |
| Manifest keberangkatan | ✅ | Print-ready |
| QR Scanner check-in | ✅ | `/admin/checkin` + tabel `check_ins` |
| Materi manasik (admin CRUD + publik) | ✅ | |
| Upgrade paket (template upgrade) | ✅ | `template_upgrade_orders` |

---

## AGEN & KOMISI

| Fitur | Status | Catatan |
|-------|--------|---------|
| Portal agen | ✅ | |
| Komisi per jamaah per paket | ✅ | |
| Withdrawal komisi | ✅ | |
| Leaderboard agen | ✅ | |
| Target & forecast bulanan | ✅ | |
| Afiliasi link `/r/:code` | ✅ | Cookie 30 hari |
| PDF promosi agen | ✅ | `PromoPdfButton` client-side |
| Multi-cabang (branch manager) | ✅ | Isolasi data per cabang |

---

## CRM & LEAD

| Fitur | Status | Catatan |
|-------|--------|---------|
| Pipeline lead | ✅ | Status: new/contacted/hot/converted/lost |
| Task / follow-up lead | ✅ | |
| Tracking konversi | ✅ | |
| Reminder follow-up otomatis | ✅ | pg_cron + Edge Function |
| Assign lead ke agen | ✅ | |

---

## CMS & KONTEN

| Fitur | Status | Catatan |
|-------|--------|---------|
| Blog (CRUD admin + publik) | ✅ | |
| Galeri (admin + publik) | ✅ | Galeri keberangkatan |
| Testimoni (CRUD + publik) | ✅ | |
| FAQ (CRUD + publik) | ✅ | |
| Review & rating paket | ✅ | |
| Halaman dinamis (CMS Pages) | ✅ | |
| Navigasi (CRUD) | ✅ | |
| SEO override per halaman | ✅ | Tabel `seo_overrides` |
| Sitemap dinamis | ✅ | Edge Function `sitemap` |
| Watermark gambar | 🟡 | Client-side overlay. Bucket gallery masih public; signed URL belum. |
| Halaman default (Tentang, T&C, Privacy, dll) | ❌ | Template/seed konten belum disiapkan. |
| Filter paket lengkap | 🟡 | Hotel/maskapai/bulan belum. |

---

## DASHBOARD & LAPORAN

| Fitur | Status | Catatan |
|-------|--------|---------|
| Dashboard admin | ✅ | Stats, chart |
| Dashboard user (jamaah) | ✅ | |
| Dashboard branch manager | ✅ | Isolasi per cabang |
| Laporan keuangan | 🟡 | `/admin/accounting` ada. Export jurnal/neraca belum. |
| Laporan booking | ✅ | |
| AI Analytics | ✅ | Edge Function `analytics-ai` |
| Audit logs | 🟡 | View + filter dasar. Ekspor & filter lanjutan (per actor, per action, range tanggal) belum. |
| Error logs | ✅ | |

---

## NOTIFIKASI

| Fitur | Status | Catatan |
|-------|--------|---------|
| Notifikasi admin in-app | ✅ | Polling 60 detik |
| Realtime chat jamaah ↔ admin | ✅ | Supabase Realtime |
| Email transaksional (Resend) | ❌ 🔑 | Butuh `RESEND_API_KEY` |
| WhatsApp (Fonnte/Wablas) | ❌ 🔑 | Butuh API key provider |
| Payment reminder (cron) | ✅ | Daily 09:00 |
| Web Push | ❌ | Belum diimplementasi |
| Live chat publik (Crisp/Tawk) | ❌ | Hanya ada chat dalam konteks booking |

---

## MULTI-TENANT

| Fitur | Status | Catatan |
|-------|--------|---------|
| Tenant site config (nama, logo, warna) | ✅ | Tabel `tenant_sites` |
| Branding per tenant | ✅ | |
| Domain/slug per tenant | ✅ | |
| SEO per tenant | ✅ | |
| Social media links per tenant | ✅ | |
| GSC verification per tenant | ✅ | |
| Maintenance mode | ✅ | Flag `maintenance_mode` di `site_settings` |

---

## LOYALTY & GAMIFIKASI

| Fitur | Status | Catatan |
|-------|--------|---------|
| Loyalty poin | ✅ | Admin adjust |
| Kupon diskon | ✅ | |
| Leaderboard agen | ✅ | |

---

## ADMIN SETTINGS

| Fitur | Status | Catatan |
|-------|--------|---------|
| Pengaturan umum | ✅ | |
| Pengaturan login (HIBP, TOTP) | ✅ | |
| Manajemen role | ✅ | |
| Manajemen integrasi (payment, notif) | ✅ | UI ada. Credential butuh konfigurasi. |
| Multi-currency | ✅ | Admin CRUD. Display publik belum konsisten. |
| Slug redirect | ✅ | |
| Template upgrade orders | ✅ | |
| SEO audit | ✅ | Edge Function |
| Translate CMS | ✅ | Edge Function |

---

## INFRASTRUKTUR

| Item | Status | Catatan |
|------|--------|---------|
| Supabase PostgreSQL + RLS | ✅ | |
| Supabase Auth + 2FA | ✅ | |
| Supabase Storage (5 buckets) | ✅ | |
| Supabase Realtime | ✅ | |
| Edge Functions (13 functions) | ✅ | Beberapa butuh secrets |
| pg_cron (2 cron jobs) | ✅ | |
| Sentry error tracking | 🟡 🔑 | SDK terpasang. Butuh `VITE_SENTRY_DSN`. |
| Cloudflare Turnstile | 🟡 🔑 | Butuh `VITE_TURNSTILE_SITE_KEY`. |
| Vitest testing | ✅ | Setup ada. Coverage perlu ditingkatkan. |

---

## ROADMAP (Belum Diimplementasi)

Fitur yang perlu dikerjakan selanjutnya (prioritas):

1. **Email transaksional** — set `RESEND_API_KEY` + template email
2. **WhatsApp notifikasi** — set API key Fonnte/Wablas
3. **Filter paket lengkap** — hotel, maskapai, bulan keberangkatan
4. **Signed URL dokumen jamaah** — akses private + access log
5. **Rekonsiliasi payment gateway** — otomatis cek status di Midtrans/Xendit
6. **Halaman default** — Tentang, Kontak, T&C, Privacy, Tata Cara Bayar
7. **Captcha di form lead & refund** — tambah Turnstile
8. **E-signature sebagai prasyarat pelunasan**
9. **Web Push notifications**
10. **Export laporan keuangan** — jurnal, neraca komisi
