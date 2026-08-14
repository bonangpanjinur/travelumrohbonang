# Sprint 5 — Release dan End-to-End Checklist

## Status ringkas

| Check | Status | Catatan |
|---|---|---|
| API production build | PASS | `pnpm --filter @workspace/api-server run build` berhasil |
| Frontend production build | PASS | `pnpm --filter @workspace/umroh-app run build` berhasil |
| API smoke tests | PASS | 15 test lulus; readiness 503 di local diterima ketika dependency belum dikonfigurasi |
| Frontend tests | PASS | 22 test lulus setelah Vitest ditambahkan sebagai dev dependency |
| Liveness probe | PASS | `GET /api/healthz` tidak bergantung pada database |
| Readiness probe | PASS secara kontrak | `GET /api/health` mengembalikan 200 bila dependency siap dan 503 bila belum siap |
| Repository cleanliness | Wajib | Jalankan `git diff --check` dan pastikan working tree bersih sebelum release |
| Workspace typecheck | BLOCKED | Masih ada error legacy di backend, termasuk `routes/packages.ts`, `routes/rest.ts`, dan `routes/savings.ts` |
| Production E2E dengan credential nyata | BLOCKED UNTIL STAGING | Belum dapat dijalankan tanpa Supabase/database dan credential provider yang valid |

## Perintah release gate

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/umroh-app run build
pnpm run typecheck
```

`pnpm test` sekarang menjalankan suite API dan frontend secara berurutan. Typecheck tetap harus dijalankan terpisah karena saat ini menemukan technical debt legacy yang tidak memblokir proses bundling tetapi harus dibereskan sebelum menyatakan release benar-benar green.

## Probe deployment

Gunakan `/api/healthz` sebagai **liveness probe** untuk memeriksa apakah proses server hidup. Gunakan `/api/health` sebagai **readiness probe** untuk memeriksa database dan Supabase. Status 503 pada readiness harus dianggap sebagai release blocker bila terjadi di staging atau production, meskipun liveness masih 200.

## Checklist staging end-to-end

Di staging dengan environment lengkap, jalankan alur berikut menggunakan akun dan data uji yang tidak terkait produksi:

1. Buka halaman publik, daftar/login, dan refresh session.
2. Buat booking, cek detail booking, dan verifikasi kalkulasi total.
3. Upload bukti pembayaran, baca signed URL, lalu verifikasi payment sebagai finance.
4. Kirim webhook payment dengan nominal valid, nominal mismatch, duplicate reference, dan signature invalid.
5. Periksa booking status, payment ledger, financial transaction, audit log, dan idempotensi.
6. Uji scope branch/agent dengan akun di luar scope dan pastikan mendapat 403.
7. Uji perubahan status booking yang valid dan invalid.
8. Uji refund, void, period lock, laporan laba-rugi, budget, dan cash-flow.
9. Uji import/export jemaah serta file oversize dan MIME spoofing.
10. Pastikan error response production tidak mengandung stack trace, SQL, filesystem path, secret, atau detail provider.

## Keputusan deployment

Jangan menyatakan deployment production **fully ready** hanya karena build berhasil. Vercel dapat membangun artifact meskipun typecheck workspace masih gagal. Release production sebaiknya menunggu error legacy dibereskan atau secara eksplisit menggunakan quality gate terpisah yang memblokir release jika `pnpm run typecheck` gagal. Sebelum deployment, jalankan audit integritas Sprint 0 dan pastikan migration Sprint 1 sudah diterapkan di staging lalu production melalui proses migration resmi.
