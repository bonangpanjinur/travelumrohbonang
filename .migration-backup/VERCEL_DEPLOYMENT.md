# Panduan Deployment Vercel

Dokumen ini menjelaskan cara melakukan deployment aplikasi Travel Umroh Bonang ke Vercel dengan konfigurasi environment variables yang dinamis.

## Persiapan Environment Variables

Aplikasi ini telah direfactor untuk menggunakan environment variables secara dinamis, sehingga tidak ada lagi nilai hardcoded (seperti URL fallback) di dalam kode. Semua konfigurasi dikelola melalui file `src/lib/env.ts`.

Berikut adalah daftar environment variables yang perlu Anda atur di dashboard Vercel:

### Wajib (Required)

| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `VITE_SUPABASE_URL` | URL project Supabase Anda | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Anon/Publishable key Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Opsional (Optional)

| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `VITE_SUPABASE_PROJECT_ID` | ID project Supabase (digunakan untuk fallback OG Image) | `xyz` |
| `VITE_APP_ORIGIN` | URL utama aplikasi Anda (digunakan untuk SEO dan canonical URL saat SSR) | `https://travelumrohbonang.com` |
| `VITE_TURNSTILE_SITE_KEY` | Site key untuk Cloudflare Turnstile Captcha | `0x4AAAAAA...` |
| `VITE_SENTRY_DSN` | DSN untuk tracking error dengan Sentry | `https://...` |
| `VITE_ENVIRONMENT` | Environment aplikasi (development/production) | `production` |

## Langkah-langkah Deployment di Vercel

1. Login ke akun [Vercel](https://vercel.com/) Anda.
2. Klik tombol **Add New...** dan pilih **Project**.
3. Import repository GitHub `bonangpanjinur/travelumrohbonang`.
4. Pada bagian **Configure Project**:
   - **Framework Preset**: Pilih `Vite` (Vercel biasanya akan mendeteksinya secara otomatis).
   - **Build Command**: Biarkan default (`bun run build` atau `npm run build`).
   - **Output Directory**: Biarkan default (`dist`).
5. Buka bagian **Environment Variables** dan tambahkan semua variabel yang disebutkan di atas.
6. Klik tombol **Deploy**.

## Catatan Penting

- File `vercel.json` telah ditambahkan ke repository untuk memastikan Vercel menggunakan konfigurasi yang benar.
- Jika Anda menggunakan custom domain di Vercel, pastikan untuk mengatur `VITE_APP_ORIGIN` ke custom domain Anda (misalnya `https://www.domainanda.com`) agar SEO dan canonical URL berfungsi dengan baik.
- Untuk pengembangan lokal, Anda dapat menyalin file `.env.example` menjadi `.env` dan mengisi nilai-nilainya.
