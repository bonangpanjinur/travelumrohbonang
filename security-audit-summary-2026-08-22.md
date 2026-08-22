# Security Audit Summary — Travel Umroh Bonang Admin Panel

**Tanggal:** 22 Agustus 2026  
**Cakupan:** session bridge Supabase–Express, role authorization, sensitive-action rate limiting, structured audit logging, API regression checks, dan production smoke verification.  
**Status keseluruhan:** **Partially Verified**.

## Executive summary

Hardening pada endpoint administratif telah diverifikasi secara lokal dan melalui regression suite repository. Simulasi burst brute-force terhadap endpoint impersonation lulus: dari 20 request paralel pada actor dan IP yang sama, tiga request pertama diizinkan dan 17 request berikutnya diblokir dengan HTTP 429. Role gate juga menolak request tanpa autentikasi dan role `admin`, serta hanya mengizinkan `super_admin`.

Commit session bridge sebelumnya (`d055c465`) tetap menjadi basis perubahan autentikasi, dan test brute-force tambahan telah disimpan dalam commit `f5856e5f` pada branch `main`. API server berhasil melewati typecheck, frontend berhasil dibuild, dan seluruh test API yang tersedia lulus. Namun, verifikasi authenticated flow dan persistensi audit log pada deployment production belum dapat dinyatakan final karena host yang tercantum di konfigurasi lama tidak lagi aktif atau tidak lagi dimiliki aplikasi.

## Verification results

| Area | Test or evidence | Result | Interpretation |
|---|---|---:|---|
| Unauthenticated impersonation | `security-actions.pentest.test.ts` | PASS | HTTP 401 diberikan sebelum aksi privileged berjalan. |
| Role bypass | `admin` mencoba endpoint impersonation | PASS | HTTP 403 diberikan. |
| Authorized role | `super_admin` mencoba endpoint impersonation | PASS | HTTP 200 diberikan. |
| Sequential rate limit | Empat request dengan limit tiga | PASS | Status berurutan `200, 200, 200, 429`. |
| Concurrent brute-force | 20 request paralel | PASS | 3 allowed dan 17 blocked dengan HTTP 429. |
| API regression suite | 7 test files, 42 tests | PASS | Tidak ada regresi pada test API yang tersedia. |
| API TypeScript | `pnpm --filter @workspace/api-server typecheck` | PASS | Tidak ada error typecheck. |
| Frontend production build | `pnpm --filter @workspace/umroh-app run build` | PASS | Vite menghasilkan `dist/index.html` dan asset production. |
| Production health | `https://umrohplus.vercel.app/api/health` | NOT VERIFIED | Vercel mengembalikan `DEPLOYMENT_NOT_FOUND`. |
| Alternate public domain | `https://www.umrohplus.com/api/health` | NOT VERIFIED | Domain mengarah ke halaman penjualan domain, bukan aplikasi. |
| Production audit-log persistence | Database production | PENDING | Belum ada authenticated request resmi atau akses query audit log production. |

## Rate-limit assessment

Middleware memakai window 15 menit dengan limit yang dikonfigurasi per action. Key rate limit menggabungkan identitas user dan subnet IPv6 yang dinormalisasi melalui helper library, sehingga actor berbeda tidak berbagi bucket hanya karena berasal dari IP yang sama, sementara variasi alamat IPv6 dalam subnet tidak mudah digunakan untuk melewati limit.

Test tambahan yang dijalankan adalah burst paralel, bukan hanya request serial. Ini penting karena race condition pada limiter sering hanya terlihat ketika request tiba hampir bersamaan. Hasil aktual konsisten dengan threshold tiga request per window untuk actor/IP yang sama.

> Hasil burst: **20 total request → 3 HTTP 200 + 17 HTTP 429**.

## Audit logging assessment

Endpoint sensitive action memanggil structured audit logger untuk hasil `success`, `failure`, dan `blocked`. Logger menyimpan action, user ID, entity context, metadata hasil, alasan, provider, user-agent terbatas 500 karakter, dan IP. Target email atau nomor telepon direduksi sebelum disimpan sehingga nilai penuh tidak masuk ke metadata audit.

Test brute-force lokal menggunakan mock logger agar tidak menggantung ketika database sandbox tidak dikonfigurasi. Hal ini memverifikasi bahwa handler rate limit dipanggil dan menghasilkan 429, tetapi **tidak membuktikan write ke tabel `audit_logs` pada production**. Implementasi logger secara eksplisit tidak menggagalkan operasi protected ketika insert audit gagal; perilaku ini menjaga availability, tetapi berarti monitoring database/logging perlu dipantau agar kegagalan persistensi tidak diam-diam berlangsung lama.

## Production verification findings

Catatan monitoring sebelumnya menunjukkan bahwa pada sample production yang tersedia, endpoint health merespons normal dan anonymous test-send menerima HTTP 401 tanpa memanggil provider WhatsApp. Bukti tersebut mendukung availability dan anonymous denial pada saat sample diambil, tetapi tidak mencakup JWT authenticated flow, successful privileged action, atau query langsung ke `audit_logs`.

Re-verifikasi terhadap host lama tidak dapat dilanjutkan: `umrohplus.vercel.app` sekarang mengembalikan `DEPLOYMENT_NOT_FOUND`, sedangkan `www.umrohplus.com` mengarah ke marketplace domain. Dengan demikian, tidak aman untuk menyimpulkan bahwa commit `d055c465` sudah terobservasi di deployment production aktif.

## Residual risks and required follow-up

| Priority | Residual risk | Required action |
|---|---|---|
| High | Production URL/alias aktif belum teridentifikasi | Berikan canonical production URL terbaru atau perbarui konfigurasi deployment. |
| High | Authenticated session bridge belum diuji di production aktif | Login sebagai admin uji, panggil endpoint read-only admin, dan pastikan Bearer token diterima middleware. |
| High | Persistensi `audit_logs` belum dibuktikan di database production | Jalankan satu aksi blocked dan satu aksi authorized pada akun uji, lalu verifikasi row audit tanpa mengekspos target sensitif. |
| Medium | Observability audit logger hanya memakai `console.error` saat insert gagal | Tambahkan alert/metric untuk kegagalan insert audit agar tidak hanya bergantung pada log text. |
| Medium | Test brute-force lokal menggunakan mock audit logger | Pertahankan test unit ini, lalu tambahkan integration test dengan database test atau staging terisolasi untuk membuktikan persistence. |

## Changed repository artifacts

| Artifact | Change |
|---|---|
| `artifacts/api-server/src/security-actions.pentest.test.ts` | Menambahkan mock audit logger untuk test isolation dan skenario 20 request paralel. |
| Commit `f5856e5f` | `test: cover concurrent impersonation brute force`; sudah dipush ke `main`. |
| Commit `d055c465` | Basis perubahan session bridge Supabase access token ke Express Bearer authentication. |

## Final conclusion

Secara lokal, kontrol authorization dan rate limiting untuk endpoint impersonation **berfungsi sesuai requirement**. Build dan seluruh API regression test juga lulus. Security posture codebase meningkat dibanding baseline karena privileged Supabase operations dipindahkan ke backend, akses role dibatasi, dan event sensitive action dicatat secara terstruktur.

Status belum dapat dinaikkan menjadi fully verified sampai canonical production URL tersedia dan authenticated smoke test serta audit-log persistence test berhasil dijalankan pada environment production/staging yang benar. Tidak ada perubahan data bisnis atau pengiriman WhatsApp yang dilakukan selama verifikasi lanjutan ini.

## References

[1]: `artifacts/api-server/src/security-actions.pentest.test.ts` — Automated authorization and brute-force penetration tests.  
[2]: `artifacts/api-server/src/middlewares/sensitiveActionLimiter.ts` — Sensitive-action rate limiting middleware.  
[3]: `artifacts/api-server/src/lib/securityAudit.ts` — Structured security audit logger.  
[4]: `production-auth-monitoring-2026-08-22.md` — Previous production black-box monitoring record.
