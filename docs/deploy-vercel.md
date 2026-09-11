# Deploy Frontend Vite ke Vercel

Project ini sekarang dikonfigurasi sebagai **frontend React + Vite** untuk Vercel. Vercel tidak perlu menjalankan API server atau membuat Vercel Function pada deployment frontend ini.

## Pengaturan Vercel

Hubungkan repository `bonangpanjinur/travelumrohbonang` ke Vercel dengan pengaturan berikut:

| Pengaturan | Nilai |
|---|---|
| Root Directory | `.` (root repository) |
| Framework Preset | `Vite` atau `Other` |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm run build:vercel` |
| Output Directory | `artifacts/umroh-app/dist` |
| Node.js | 22 atau versi yang kompatibel dengan project |

`vercel.json` sudah berisi nilai tersebut, sehingga pengaturan dashboard dapat dibiarkan otomatis setelah repository di-import.

## Environment Variables

Salin nama variabel dari `.env.example` ke **Vercel Project Settings → Environment Variables**. Nilai `VITE_*` akan masuk ke browser bundle, jadi hanya gunakan nilai public/publishable. Jangan masukkan service role key, database URL, payment secret, atau token server ke variabel berawalan `VITE_`.

Jika API dideploy pada service/domain terpisah, isi `VITE_API_URL` dengan URL API tersebut, misalnya `https://api.example.com`. Jika API menggunakan domain yang sama, biarkan kosong.

## Deploy

Setelah konfigurasi pertama selesai, deployment berikutnya cukup dilakukan dengan push ke branch yang terhubung, biasanya `main`. Pull request akan menghasilkan Preview Deployment.

## Catatan API

Deployment ini hanya men-deploy frontend Vite. Halaman yang memanggil `/api/*` tetap membutuhkan backend yang aktif. Backend dapat dideploy terpisah dan alamatnya diberikan melalui `VITE_API_URL`. Jika backend belum tersedia, halaman publik yang hanya membutuhkan Supabase tetap dapat dibuild, tetapi fitur yang memanggil API akan gagal saat runtime.

## Verifikasi lokal

```bash
pnpm install --frozen-lockfile
pnpm run build:vercel
```

Hasil yang wajib ada adalah `artifacts/umroh-app/dist/index.html`.
