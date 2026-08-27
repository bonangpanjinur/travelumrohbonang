# GitHub Actions → Vercel Deployment

Workflow deployment otomatis berada di `.github/workflows/deploy-vercel-main.yml`.

Workflow berjalan pada dua kondisi:

| Trigger | Perilaku |
|---|---|
| Push ke `main` | Menjalankan verify, build, deploy, lalu smoke test. |
| `workflow_dispatch` | Menjalankan alur yang sama secara manual dari tab Actions. |

## Tahapan workflow

Job `verify` melakukan checkout repository, memasang Node.js 22 dan pnpm 10.4.1, menjalankan `pnpm install --frozen-lockfile`, typecheck, seluruh test, dan production build. Jika salah satu tahap gagal, job deployment tidak dijalankan.

Job `deploy` membuat linkage Vercel secara ephemeral pada runner menggunakan `VERCEL_ORG_ID` dan `VERCEL_PROJECT_ID`, mengambil environment production Vercel, membuat artifact dengan `vercel build --prod`, lalu melakukan `vercel deploy --prebuilt --prod`. Setelah URL deployment diperoleh, workflow menjalankan smoke test ke root aplikasi dan `/api/healthz`.

> Walaupun workflow berada pada GitHub Environment bernama `production` karena `vercel.json` saat ini mengarahkan deployment utama ke production, gunakan project Vercel terpisah atau konfigurasi environment staging jika target yang diinginkan bukan production. Jangan memasukkan credential production ke secret staging.

## Secret yang dibutuhkan

Buka **GitHub repository → Settings → Secrets and variables → Actions**, lalu tambahkan:

| Secret | Sumber | Keterangan |
|---|---|---|
| `VERCEL_TOKEN` | Vercel account settings | Token deployment; simpan sebagai secret, jangan di-commit. |
| `VERCEL_ORG_ID` | Vercel project/team settings | Organization/team ID. |
| `VERCEL_PROJECT_ID` | Vercel project settings | Project ID target deployment. |

Untuk deployment staging, sebaiknya gunakan **Vercel project staging terpisah** dan simpan secret di GitHub Environment `staging`, kemudian ubah workflow memakai `environment: staging` dan `--environment=preview` sesuai strategi Vercel Anda. Workflow yang tersedia sekarang sengaja menargetkan deployment utama karena permintaan awal adalah push ke branch `main`.

## Pengaturan Vercel

Pastikan project Vercel target memiliki konfigurasi build yang kompatibel dengan `vercel.json`:

```json
{
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/umroh-app run build",
  "outputDirectory": "artifacts/umroh-app/dist"
}
```

Environment variables aplikasi harus diatur pada Vercel project target, bukan di file workflow. Untuk deployment yang dapat menjalankan booking, payment, dan auto-issue certificate, environment target harus memiliki database/Supabase staging, authentication configuration, storage configuration, dan payment gateway sandbox credentials.

## Smoke test

Workflow memeriksa dua endpoint:

```text
GET /
GET /api/healthz
```

Keduanya harus mengembalikan HTTP 2xx. Endpoint `/api/healthz` dipakai sebagai liveness check ringan; status ini tidak membuktikan database, authentication, payment gateway, atau certificate automation siap sepenuhnya. Setelah staging runtime tersedia, tambahkan smoke test khusus dependency dan endpoint read-only yang tidak mengubah transaksi.

## Rekomendasi keamanan

Gunakan branch protection pada `main`, wajibkan job `verify` lulus sebelum deployment, aktifkan environment protection rule jika diperlukan, dan batasi token Vercel pada project yang tepat. Jangan menaruh `DATABASE_URL`, service role key, payment gateway secret, atau token admin dalam source code maupun output log. Jika deployment ditujukan ke staging, gunakan project dan database staging terpisah agar callback pembayaran tidak pernah menyentuh data production.
