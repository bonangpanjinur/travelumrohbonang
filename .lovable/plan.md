# Audit Status & Update PRD

Sesudah sprint-sprint terakhir, banyak item di PRD lama sebenarnya sudah selesai tapi belum tercoret. Plan ini cuma 1 langkah: rewrite `PRD.md` jadi snapshot status yang akurat per area, plus daftar yang benar-benar tersisa beserta kebutuhannya (API key, keputusan produk, dll).

## Ringkasan audit (hasil scan kode)

### ✅ Sudah selesai (sebelumnya masih "todo" di PRD)
- **SEO**: og:image dinamis per paket/artikel, sitemap multi-tenant (edge function `sitemap`), 301 redirect slug lama (`SlugRedirects` + `slugRedirect.ts`), Google Search Console verification per tenant, `LocalBusinessJsonLd` per cabang, FAQ/Breadcrumb/Related JSON-LD.
- **Operasional**: galeri per-keberangkatan (`admin/DepartureGallery`), watermark image (client-side `lib/watermark.ts`), scanner QR check-in (`admin/CheckIn`), manasik kit publik + admin, QR per jamaah di Manifest.
- **B2B/Agen**: PDF promosi auto-generated (`PromoPdfButton` + `lib/promoPdf.ts`), target & forecast komisi di Agent Portal, affiliate cookie 30 hari (`/r/:code` + `lib/affiliate.ts`).
- **Keamanan**: 2FA TOTP (enrol di `/account/2fa`, gate login + force-enroll untuk staff), Cloudflare Turnstile captcha di Auth & Booking, rate-limit klien via `request_log`, e-signature kontrak (`/contract/:bookingId` + tombol di My Bookings), HIBP aktif, Sentry terintegrasi (no-op tanpa DSN).
- **Konten/CMS**: Pages, Blog, Testimonials, Reviews, FAQ, Gallery, Tenant template (Classic/Modern/Premium) + billing.

### ❌ Masih belum (akan jadi backlog di PRD baru)

**SEO & Konten**
- Halaman CMS default belum disiapkan kontennya (Tentang Kami, Kontak, T&C, Privacy, Tata Cara Bayar) — strukturnya ada, isi belum.

**Pembelian & Keuangan**
- Filter lengkap di `/paket` (harga/durasi/bulan/hotel/maskapai/kategori) — sebagian saja.
- Reconciliation otomatis pembayaran gateway vs booking (manual via `/admin/payments`).
- Export keuangan terstandar (jurnal, neraca komisi) — `Accounting` ada tapi minim ekspor.
- Multi-currency display di harga publik (admin sudah, publik belum konsisten).

**Notifikasi & Komunikasi** (butuh API key user)
- Email transaksional Resend (konfirmasi booking, reminder DP/cicilan, e-ticket, refund).
- WhatsApp notification Fonnte/Wablas.
- Web Push (jamaah + admin).
- Live chat widget global publik (in-house chat untuk booking sudah ada).

**Operasional Admin**
- Watermark berbasis signed-URL (bucket `gallery` masih public; saat ini watermark hanya overlay client-side).
- Log akses + signed URL untuk dokumen jamaah (bucket sudah private, perlu access log seperti payment-proofs).
- Export CSV terstandar untuk semua tabel admin (saat ini hanya leaderboard + sebagian).
- Audit logs: ekspor & filter lanjutan.
- Backup terjadwal dump DB ke storage.
- Rate limit & captcha juga di form leads (CRM) & refund.

**Kepatuhan**
- Penerapan kontrak digital sebagai prasyarat pelunasan (tombol sudah ada di My Bookings, tapi belum mem-block step pelunasan jika kontrak belum ditandatangani).
- DSN Sentry production — perlu user mengisi build secret `VITE_SENTRY_DSN`.

## Yang akan ditulis ulang di PRD.md

Struktur baru ringkas:
1. **Tujuan & Audiens** (tetap)
2. **Status Inti per Modul** — tabel: modul → status (✅/🟡/❌) → catatan
3. **Backlog Aktif** — dikelompokkan P1/P2/P3 dengan dependensi (API key, keputusan)
4. **Roadmap Sprint Berikutnya** — usulan urutan (notifikasi → keuangan → CMS default → operasional admin)
5. **Teknis** — referensi file kunci (sentry.ts, rateLimit.ts, sitemap function, dsb) supaya dev berikut nggak nyari
6. **Definition of Done per item P1** — supaya ada exit criteria jelas

Section "Sprint A-E" lama dihapus karena sudah usang; diganti satu seksi "Riwayat Selesai" ringkas.

## File yang berubah
- `PRD.md` — rewrite penuh
- `.lovable/plan.md` — dihapus (sudah eksekusi, isinya basi)

Tidak ada perubahan kode produk; ini murni dokumentasi.
