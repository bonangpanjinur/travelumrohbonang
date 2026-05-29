# Rencana Eksekusi 2 Batch

Scope-nya besar (10 fitur). Saya pecah jadi 2 batch supaya tiap batch bisa di-review & dipakai sebelum lanjut.

---

## BATCH 1 — Operasional Jamaah & B2B/Agen

### Operasional
1. **Galeri per-keberangkatan**
   - Tabel `departure_gallery` (departure_id, image_url, caption, sort_order)
   - Admin upload di `/admin/departures/:id/gallery`
   - Tampil di halaman detail keberangkatan & dashboard jamaah

2. **Watermark via Signed URL**
   - Edge function `watermark-image`: ambil image dari storage, overlay teks (nama brand + kode booking) pakai `npm:@napi-rs/canvas` atau SVG composite
   - Bucket `gallery` jadi private + signed URL 1 jam
   - Helper `getWatermarkedUrl(path, label)` di frontend

3. **Scanner QR Check-in**
   - Page `/admin/checkin` pakai `html5-qrcode`
   - Tabel `check_ins` (pilgrim_id, departure_id, checked_in_at, checked_in_by, location)
   - Scan QR (sudah ada di Manifest) → record check-in, toast hasil

4. **Manasik Kit**
   - Tabel `manasik_materials` (title, type [pdf|video|ebook], file_url, description, sort_order)
   - Admin CRUD `/admin/manasik`
   - Jamaah lihat di `/manasik` (filter per paket opsional)

### B2B/Agen
5. **PDF Promosi Auto-generated**
   - Tombol "Download Materi Promosi" di detail paket (untuk agen login)
   - Generate PDF client-side pakai `jspdf` + `html2canvas`: cover paket, harga, itinerary, kode referral agen, QR ke link affiliate

6. **Target & Forecast Komisi**
   - Kolom `monthly_target` di `agents`
   - Dashboard agen: progress bar target bulan ini, forecast = pending commissions + paid bulan ini, chart trend 6 bulan

7. **Affiliate Cookie 30 Hari**
   - Route handler `/r/:referralCode` → set cookie `aff_ref` 30 hari → redirect home
   - Saat booking dibuat: baca cookie, set `agent_id` otomatis kalau kosong
   - Tabel `affiliate_clicks` untuk analytics

---

## BATCH 2 — Keamanan (setelah Batch 1 selesai)

8. **2FA TOTP** — pakai `otpauth` lib, kolom `totp_secret` & `totp_enabled` di profiles, page `/account/2fa` enroll dengan QR, gate login step kedua
9. **Rate Limit + Captcha** — Cloudflare Turnstile (gratis) di form login/register/lead; rate limit per-IP via tabel `request_log` di edge function auth-sensitive
10. **E-signature Kontrak** — tabel `contracts` (booking_id, html_content, signed_at, signature_data_url, ip), canvas signature pad di portal jamaah
11. **HIBP Check** — aktifkan `password_hibp_enabled: true` via configure_auth
12. **Error Tracking** — integrasi Sentry (butuh DSN dari user) atau fallback ke tabel `error_logs` + edge function logger

---

## Catatan Teknis
- Semua tabel baru pakai pola standar: GRANT + RLS (admin manage, public/auth read sesuai konteks)
- Bucket `gallery` perlu dipindah ke private — perlu konfirmasi karena akan break URL existing
- Watermark butuh font; pakai default sans-serif dari canvas
- PDF promosi: tidak butuh server, full client untuk hemat fungsi

---

## Yang Saya Butuhkan Konfirmasi
1. **Bucket `gallery` saat ini public.** Untuk watermark signed URL, lebih aman jadi private. OK pindah private? (URL lama yang sudah tertanam di blog/posting akan break — perlu migrasi)
2. **Batch 2 keamanan**: Sentry butuh DSN dari kamu. Atau pakai logger internal saja?
3. Lanjut sekuensial Batch 1 → Batch 2, atau ada urutan prioritas lain?

Kalau setuju, saya mulai Batch 1 — urutan: galeri → watermark → check-in → manasik → PDF promosi → target komisi → affiliate cookie.