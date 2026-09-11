# Audit Deployment Vercel — Travel Umroh Bonang

**Tanggal audit:** 11 September 2026  
**Repository:** `bonangpanjinur/travelumrohbonang`  
**Branch yang diaudit:** `main`  
**Ruang lingkup:** konfigurasi build, Vercel Functions, GitHub Actions, environment variables, dan kemudahan deployment.

## Ringkasan eksekutif

Repository ini dapat diarahkan ke Vercel, tetapi jalur deployment saat ini **belum sederhana untuk pengguna**. Proyek menggunakan pnpm workspace/monorepo dengan dua artefak utama: frontend Vite di `artifacts/umroh-app` dan backend Express yang dibungkus sebagai Vercel Function melalui `api/[...all].mjs`. Deployment production saat ini bergantung pada GitHub Actions dan tiga secret GitHub (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, dan `VERCEL_PROJECT_ID`), bukan sekadar menghubungkan repository di dashboard Vercel.

Temuan paling penting adalah sebagai berikut:

1. **P0 — `.env` terlacak di Git.** File ini berisi konfigurasi Supabase dan telah muncul di banyak commit. Walaupun nama variabel yang terlihat saat audit adalah variabel client/public Supabase, praktik ini tetap berisiko dan membuat pengelolaan environment membingungkan.
2. **P1 — Ada dua jalur deployment yang tumpang tindih.** `vercel.json` mendefinisikan build, sedangkan workflow GitHub melakukan verify, `vercel pull`, `vercel build`, dan `vercel deploy --prebuilt`. Pengguna yang hanya melakukan “Import Git Repository” di Vercel tidak otomatis mengikuti alur workflow tersebut.
3. **P1 — Tidak ada `.env.example` atau checklist environment yang bisa langsung dipakai.** Backend memiliki banyak integrasi opsional/production, tetapi konfigurasi yang dibutuhkan tersebar di kode dan dokumentasi.
4. **P1 — Build Vercel lebih longgar daripada build repository.** Workflow melakukan root `pnpm run build` dan test/typecheck, sedangkan `vercel.json` hanya menjalankan build API dan frontend. Ini dapat membuat Vercel menerima artefak yang belum melewati seluruh pemeriksaan repository.
5. **P2 — Arsitektur API serverless cukup rapuh untuk dipelihara.** Entry point mengimpor bundle `artifacts/api-server/dist/vercel.mjs` secara dinamis dan mengandalkan `includeFiles`. Ini bisa bekerja, tetapi error runtime akan lebih sulit dipahami dibanding adapter Vercel yang langsung dibuild sebagai function.

## Bukti konfigurasi saat ini

| Area | Kondisi saat audit | Dampak |
|---|---|---|
| Package manager | Root menetapkan `pnpm@10.28.0`; `preinstall` menolak npm/yarn | Deployment harus memakai pnpm yang benar |
| Frontend | Vite di `artifacts/umroh-app`; output `artifacts/umroh-app/dist` | Root directory harus tetap repository root |
| Backend | Express dibuild menjadi `artifacts/api-server/dist/vercel.mjs` | Runtime membutuhkan artefak backend dan env server |
| Vercel config | `installCommand`, `buildCommand`, `outputDirectory`, function catch-all, routes, cron | Konfigurasi relatif kompleks untuk dashboard import |
| GitHub Actions | Push ke `main` memicu verify lalu deploy prebuilt | Memerlukan tiga secret Vercel di GitHub |
| Environment file | `.env` terlacak, tidak ada `.env.example` | Risiko secret/config leakage dan onboarding membingungkan |
| Database/runtime | Kode mendukung Supabase HTTP proxy atau `DATABASE_URL` | Pilihan runtime belum disederhanakan untuk Vercel |

## Temuan detail dan rekomendasi

### P0 — `.env` masuk repository

File `.env` tercatat oleh Git (`git ls-files --stage .env` mengembalikan file tersebut), dan riwayat menunjukkan file itu pernah diubah dalam banyak commit. `.gitignore` saat ini tidak memiliki aturan `.env` atau `.env.*`.

**Risiko:**

- konfigurasi environment mudah tersebar melalui clone, fork, cache, atau artefak CI;
- developer dapat mengira `.env` adalah sumber konfigurasi resmi production;
- jika pernah ada secret server-side di file tersebut, secret tersebut harus dianggap terekspos karena riwayat Git menyimpannya.

**Tindakan wajib:**

1. Tambahkan `.env`, `.env.*`, dan pengecualian aman untuk `.env.example` ke `.gitignore`.
2. Hapus `.env` dari tracking Git, tanpa menghapus file lokal developer.
3. Audit seluruh riwayat untuk secret server-side. Jika pernah ada `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `MIDTRANS_SERVER_KEY`, `XENDIT_API_KEY`, `RESEND_API_KEY`, `SESSION_SECRET`, atau `VERCEL_TOKEN`, lakukan rotasi sebelum production.
4. Buat `.env.example` yang hanya berisi nama variabel dan komentar, tanpa nilai asli.

### P1 — Jalur deployment saat ini tidak “one-click”

Workflow `.github/workflows/deploy-vercel-main.yml` mensyaratkan `VERCEL_TOKEN`, `VERCEL_ORG_ID`, dan `VERCEL_PROJECT_ID`. Workflow juga membuat `.vercel/project.json` secara ephemeral, menjalankan `vercel pull`, `vercel build`, lalu `vercel deploy --prebuilt`.

Ini adalah jalur CI/CD yang valid, tetapi bukan jalur paling mudah bagi pengguna yang mengharapkan: **connect GitHub → isi environment variables → push**. Saat ini pengguna perlu memahami dua sistem sekaligus: Vercel Project Settings dan GitHub Actions Secrets/Environment.

**Rekomendasi utama:** pilih satu jalur resmi.

- **Pilihan paling mudah:** gunakan Vercel Git Integration sebagai jalur production. Project Vercel diarahkan ke repository ini, Root Directory tetap `/`, dan Vercel membaca `vercel.json`. Workflow GitHub dipertahankan hanya untuk verify (typecheck/test/build), tanpa melakukan deploy kedua.
- **Pilihan CI terkontrol:** pertahankan workflow sekarang, tetapi dokumentasikan bahwa deployment hanya dilakukan GitHub Actions dan siapkan ketiga secret secara eksplisit. Jangan meminta pengguna melakukan deploy manual dari dashboard karena itu menciptakan dua sumber kebenaran.

Untuk kebutuhan “mudah saat deploy”, pilihan pertama lebih sesuai.

### P1 — Build command tidak identik

Root `package.json` mendefinisikan `pnpm run build` sebagai typecheck lalu build seluruh workspace. Namun `vercel.json` menggunakan:

```text
pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/umroh-app run build
```

Artinya build Vercel tidak menjalankan root typecheck dan tidak menjalankan seluruh pemeriksaan yang dijalankan workflow verify. Akibatnya, build lokal/CI dapat gagal lebih dulu, atau Vercel dapat membangun artefak yang belum tervalidasi penuh.

**Rekomendasi:** buat satu script deployment resmi, misalnya `build:vercel`, yang menjalankan pemeriksaan yang memang aman di lingkungan Vercel dan menghasilkan frontend + backend. Referensikan script tersebut baik dari workflow maupun `vercel.json`. Jika root typecheck sengaja tidak dijalankan di Vercel demi waktu, jalankan secara wajib di CI sebelum merge ke `main` dan nyatakan itu sebagai kebijakan.

### P1 — Environment variables belum memiliki kontrak yang jelas

Kode backend mendukung banyak variabel: Supabase, database, CORS, session, admin, Midtrans, Xendit, Resend, dan cron. Di `envValidation.ts`, semua item saat ini ditandai optional, padahal fitur production tertentu tidak akan berfungsi tanpa pasangan variabelnya.

**Rekomendasi:** bagi environment menjadi tiga kelompok:

| Kelompok | Contoh | Penempatan |
|---|---|---|
| Public build-time | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Vercel Production/Preview sesuai kebutuhan |
| Server wajib | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` atau konfigurasi server equivalent, `SESSION_SECRET`, `CRON_SECRET` | Vercel server-only; jangan gunakan prefix `VITE_` |
| Integrasi opsional | `MIDTRANS_*`, `XENDIT_*`, `RESEND_*`, `EMAIL_FROM`, `ALLOWED_ORIGINS` | Diisi hanya jika fitur diaktifkan |

Tambahkan endpoint/readiness check yang membedakan **deployment hidup** dari **fitur belum dikonfigurasi**, tanpa mengungkap nilai secret. Smoke test CI sebaiknya memanggil readiness endpoint tersebut.

### P1 — `.env.example` dan panduan deploy belum menjadi “jalan bahagia”

Saat ini tidak ditemukan `.env.example`. Dokumentasi `docs/github-actions-vercel-deployment.md` sudah menjelaskan secret GitHub dan environment secara teknis, tetapi belum menyederhanakan keputusan bagi pengguna baru.

**Rekomendasi:** sediakan tiga artefak onboarding:

1. `.env.example` dengan komentar singkat per variabel.
2. `docs/deploy-vercel.md` satu halaman berisi langkah dashboard Vercel, environment variables, dan verifikasi.
3. `scripts/verify-vercel-env.mjs` atau perintah setara yang memeriksa nama variabel wajib, bukan nilainya, sebelum deploy.

### P2 — Adapter API Vercel bergantung pada dynamic import bundle

`api/[...all].mjs` mengimpor `../artifacts/api-server/dist/vercel.mjs`, dan `vercel.json` memakai `includeFiles` untuk memasukkan hasil build tersebut. Pendekatan ini mengurangi bundling ulang, tetapi kegagalan path, output build yang tertinggal, atau perubahan struktur artefak dapat muncul sebagai error runtime Function.

**Rekomendasi:** pertahankan pendekatan ini hanya jika ada smoke test terhadap deployment preview. Tambahkan validasi build yang memastikan file berikut ada dan tidak kosong sebelum deploy:

```text
artifacts/api-server/dist/vercel.mjs
artifacts/umroh-app/dist/index.html
```

Juga tambahkan request test ke `/api/healthz` pada preview deployment, bukan hanya ke deployment production.

### P2 — Konfigurasi SPA dan cron perlu dijaga sebagai kontrak

Routing `vercel.json` sudah mengarahkan `/api/*` ke catch-all function dan fallback route lain ke `/index.html`. Lima cron juga telah dikonfigurasi. Ini baik, tetapi perubahan pada route ordering dapat merusak API atau deep link frontend.

**Rekomendasi:** tambahkan smoke test minimal untuk:

- `/` menghasilkan HTML;
- satu deep link frontend menghasilkan HTML, bukan 404;
- `/api/healthz` menghasilkan response JSON;
- endpoint cron menolak request tanpa authorization yang benar;
- static asset utama merespons 200.

## Jalur deploy yang disarankan

### Opsi A — Vercel Git Integration (disarankan untuk kemudahan)

1. Hubungkan repository `bonangpanjinur/travelumrohbonang` ke satu Vercel Project.
2. Set **Root Directory** ke root repository, bukan `artifacts/umroh-app`.
3. Pastikan package manager memakai pnpm `10.28.0` atau versi yang kompatibel dengan lockfile.
4. Gunakan `vercel.json` sebagai sumber konfigurasi build.
5. Isi environment variables pada Vercel Project Settings untuk **Production** dan **Preview** sesuai kelompok public/server/optional.
6. Deploy preview dari pull request, cek `/api/healthz` dan deep link frontend.
7. Merge ke `main` untuk production.

Jika opsi ini dipilih, GitHub Actions cukup melakukan verify dan tidak perlu menjalankan deploy Vercel kedua.

### Opsi B — GitHub Actions sebagai satu-satunya deployer

1. Buat satu Vercel Project dan catat `orgId` serta `projectId`.
2. Isi `VERCEL_TOKEN`, `VERCEL_ORG_ID`, dan `VERCEL_PROJECT_ID` pada GitHub Environment `production`.
3. Isi application environment variables di Vercel Project Settings.
4. Push ke `main`; job `verify` harus lulus sebelum job `deploy` berjalan.
5. Periksa smoke test root dan `/api/healthz`.

Opsi ini cocok jika approval production harus berada di GitHub, tetapi lebih sulit untuk onboarding dan troubleshooting.

## Checklist acceptance setelah perbaikan

- [ ] `.env` tidak lagi tracked dan aturan ignore telah ditambahkan.
- [ ] Tidak ada server secret di repository atau artefak frontend.
- [ ] `.env.example` tersedia dan tidak mengandung nilai rahasia.
- [ ] Satu jalur deployment resmi dipilih dan jalur lain tidak melakukan deploy ganda.
- [ ] Install memakai `pnpm --frozen-lockfile`.
- [ ] Build menghasilkan `artifacts/umroh-app/dist/index.html`.
- [ ] Build menghasilkan `artifacts/api-server/dist/vercel.mjs`.
- [ ] Preview deployment lulus `/`, deep link, static asset, dan `/api/healthz`.
- [ ] Production environment memiliki server variables yang sesuai.
- [ ] Cron secret dan payment webhook secret diset server-side.
- [ ] Database/Supabase staging dipisahkan dari production untuk preview.
- [ ] Dokumentasi deploy dapat diikuti tanpa membaca source code.

## Kesimpulan

Masalah “deploy Vercel sulit dan membingungkan” terutama disebabkan oleh **kompleksitas alur dan kurangnya kontrak environment**, bukan karena Vercel tidak dapat menjalankan aplikasi ini. Perbaikan paling berdampak adalah: **hapus `.env` dari Git, buat `.env.example`, pilih Vercel Git Integration sebagai jalur default, samakan script build, dan tambahkan preflight/readiness check**. Setelah itu, proses normal dapat diringkas menjadi connect project sekali, isi environment variables sekali, lalu setiap push ke `main` ter-deploy otomatis.

Audit ini bersifat static/configuration audit. Belum dilakukan deploy ke akun Vercel atau perubahan terhadap database, payment gateway, webhook, maupun secret production.
