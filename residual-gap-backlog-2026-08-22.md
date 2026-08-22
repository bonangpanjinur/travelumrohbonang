# Residual Gap Backlog — Production Readiness

## Ringkasan eksekutif

Setelah hardening sebelumnya, aplikasi sudah memiliki fondasi yang lebih aman untuk authentication bridge, rate limiting, server-side KPI, readiness dasar, feature route gate, filtering log, dan template upgrade. Namun aplikasi belum sebaiknya dianggap **fully production-ready** karena beberapa kontrol masih berupa fondasi, belum dimigrasikan/diaktifkan di production, atau belum memiliki verifikasi end-to-end.

Gap terbesar bukan lagi sekadar bug UI. Risiko utama berpindah ke **operasional production, konsistensi finansial, workflow exception, dan kemampuan recovery**.

## Prioritas perbaikan

| Prioritas | Gap | Dampak | Tindakan utama |
|---|---|---|---|
| P0 | Migration database dan seed policy belum dibuktikan aktif di production | Code dapat memakai tabel/kolom yang belum ada; job production dapat gagal | Backup, restore test, staging migration, production migration, schema smoke test |
| P0 | Authenticated production verification belum selesai | Fix `apiFetch`/JWT/CORS belum terbukti pada sesi admin nyata | Deploy commit terbaru, login admin uji, test read-only dan audit persistence |
| P0 | Retention purge belum menjadi job production terkontrol | Log tumbuh tanpa batas atau purge manual berisiko menghapus data salah | Implement dry-run, lock, hold, batch purge, audit run, kill switch |
| P0 | Rekonsiliasi pembayaran belum menjadi double-entry exception workflow penuh | Saldo booking, ledger, refund, komisi, dan mutasi bank dapat berbeda | Buat reconciliation snapshot, unmatched rules, approval, dan audit trail |
| P1 | Control Tower belum mencakup semua domain | Operator belum melihat hotel, visa detail, manifest, perlengkapan, dan room readiness dalam satu status | Tambah readiness item per domain dan policy-driven blocker engine |
| P1 | Privileged Supabase access masih perlu audit menyeluruh | Direct URL atau child component dapat mempertahankan bypass frontend | Static scan zero direct privileged call; pindahkan semua operasi ke API |
| P1 | Template upgrade belum memiliki verifikasi pembayaran provider/ledger | `proof_submitted` aman, tetapi approval masih dapat menjadi proses manual tanpa settlement proof | Hubungkan approval ke payment verification dan immutable audit |
| P1 | Job retry/dead-letter belum lengkap | WhatsApp/email/provider failure dapat hilang atau dikirim ganda | Queue, dedupe key, exponential backoff, lease recovery, dead-letter |
| P1 | Alerting dan observability belum memiliki SLO | Error ada di database tetapi tidak ada escalation yang terjamin | Alert error rate, queue age, purge failure, database readiness, auth burst |
| P1 | Backup/restore dan rollback belum diuji rutin | Migration atau purge dapat menyebabkan kehilangan data yang sulit dipulihkan | Restore drill berkala, migration rollback plan, archive-before-delete |
| P1 | Role/scope backend perlu contract test lebih luas | Menu frontend bukan batas keamanan; salah scope dapat membocorkan cabang/booking | Matrix test per role × endpoint × branch/agent |
| P2 | Test frontend masih tipis untuk workflow kompleks | Regression dapat lolos walau typecheck/build lulus | Component/integration test untuk finance, departure, tenant, logs, upgrade |
| P2 | Pagination dan export besar belum distandardisasi | Dashboard dan laporan dapat lambat atau memotong data | Cursor pagination, server-side export job, limits, progress |
| P2 | UX error/loading/empty state belum konsisten | Operator dapat mengira data kosong sebagai tidak ada masalah | Standard query-state component dan error correlation ID |

## 1. P0 — Migration dan production activation

### Yang masih kurang

Perubahan source dan migration file tidak otomatis berarti schema production sudah berubah. Kolom template upgrade, tabel retention, readiness item, job queue, dan policy harus diverifikasi terhadap database target. Health endpoint juga hanya membuktikan konektivitas, bukan bahwa seluruh tabel dan index yang dibutuhkan tersedia.

### Perbaikan yang harus dilakukan

1. Buat backup dan lakukan restore test pada staging.
2. Jalankan migration di staging dengan versi database yang sama dengan production.
3. Jalankan schema smoke test untuk tabel, kolom, index, constraint, dan seed policy.
4. Deploy code yang kompatibel dengan schema lama dan baru bila memungkinkan.
5. Jalankan migration production pada window terkontrol.
6. Jalankan endpoint `health`, `readiness`, `retention dry-run`, dan `audit write/read`.
7. Simpan migration version, operator, timestamp, dan hasil pada deployment record.
8. Jangan mengaktifkan feature flag sampai smoke test lolos.

## 2. P0 — Authenticated production verification

Status anonymous 401 sudah merupakan perilaku yang diharapkan. Yang belum selesai adalah request dengan sesi admin nyata. Verifikasi minimal harus mencakup:

| Test | Hasil yang diharapkan |
|---|---|
| Admin membuka dashboard | Tidak 401/403 dan data sesuai scope |
| `apiFetch` mengirim Bearer token | Backend membaca user dan role yang sama |
| CORS preflight | Origin production mendapat response yang benar |
| Endpoint tenant | Tidak ada direct Supabase privileged call |
| Endpoint readiness | Confirmed unpaid tetap tampil sebagai blocker |
| Endpoint logs | Filter server-side dan scope benar |
| Sensitive action | Rate limit dan audit event tersimpan |
| Error internal | Client mendapat response aman, server punya correlation ID |

## 3. P0 — Retention production

Retention belum selesai hanya dengan schema. Implementasi wajib memiliki dry-run, advisory/database lock, batch delete, legal hold, progress cursor, retry, dan audit event. Purge harus dapat dihentikan tanpa merusak transaksi lain.

Urutan aktivasi yang aman adalah `request_log` terlebih dahulu, lalu `error_logs`, notification logs, dan kategori lain. `audit_logs`, proof-access logs, serta purge audit tidak boleh masuk purge biasa sebelum policy organisasi dan hold workflow disepakati.

## 4. P0/P1 — Rekonsiliasi finansial

Exception Center saat ini memberi ringkasan, tetapi belum menggantikan rekonsiliasi akuntansi penuh. Masih diperlukan:

- satu snapshot rekonsiliasi per periode;
- aturan matching berdasarkan payment ID, reference number, amount, tanggal, dan branch;
- status `matched`, `ambiguous`, `unmatched`, `reversed`, dan `disputed`;
- approval untuk manual match;
- hubungan booking payment dengan bank mutation, ledger entry, refund, dan komisi;
- pencegahan duplicate match;
- laporan selisih debit/kredit dan aging exception;
- audit event untuk match, unmatch, override, refund, dan commission settlement.

Status `confirmed` tidak boleh dimasukkan sebagai revenue. Revenue, receivable, cash received, refund liability, dan commission payable harus dipisahkan.

## 5. P1 — Departure Control Tower penuh

Readiness dasar sudah mencakup payment, document, seat, dan check-in. Yang masih kurang adalah domain berikut:

| Domain | Blocker yang perlu ditambahkan |
|---|---|
| Visa | Belum submit, rejected, deadline risk, approved tetapi expiry risk |
| Hotel/room | Hotel belum ditetapkan, room allocation belum lengkap, mismatch occupancy |
| Flight/manifest | Flight segment belum lengkap, manifest belum final, data passport mismatch |
| Equipment | Perlengkapan belum dialokasikan atau belum diserahkan |
| Policy | Syarat khusus paket/keberangkatan belum terpenuhi |
| Exception | Override aktif, alasan, approver, dan tanggal kedaluwarsa |

Score hanya untuk orientasi. Keputusan `ready` dan `lock` harus berbasis blocker policy, bukan rata-rata persentase.

## 6. P1 — Privileged access dan scope

Audit berikutnya harus menggunakan static scan dan endpoint matrix. Cari seluruh pemanggilan Supabase dari frontend, bukan hanya file yang sudah ditemukan. Operasi yang harus selalu melalui backend meliputi CRUD tenant, pricing, upload proof, feature flag write, role/user management, impersonation, test-send, refund approval, payment verification, dan branch configuration.

Setiap endpoint perlu diuji dengan kombinasi:

| Actor | Global data | Branch lain | Agent lain | Data sendiri |
|---|---:|---:|---:|---:|
| Super Admin | Allow | Allow | Allow | Allow |
| Admin cabang | Scope sesuai | Deny | Deny | Allow |
| Finance | Finance scope | Deny bila beda branch | Sesuai policy | Allow |
| Operational | Operational scope | Deny bila beda branch | Sesuai policy | Allow |
| Agent | Read-only scope | Deny | Deny | Terbatas |

## 7. P1 — Error handling, retry, dan recovery

Centralized error handler perlu dilengkapi dengan queue dan dead-letter agar integrasi provider tidak bergantung pada request HTTP. Khusus WhatsApp/email, gunakan dedupe key untuk mencegah pesan ganda. Job yang crash harus kembali dari lease timeout. Job permanent failure harus terlihat pada dashboard dan dapat di-retry setelah operator memperbaiki sumber masalah.

Wajib ada kill switch untuk purge, blast notification, retry provider, dan migration-sensitive jobs. Kill switch harus diaudit dan tidak boleh hanya berupa environment variable yang tidak terdokumentasi.

## 8. P1 — Observability dan SLO

Log database tanpa alert belum cukup. Minimal tetapkan target operasional internal untuk:

- error rate dan 5xx per route;
- latency p95 endpoint admin;
- authentication failure burst;
- queue depth dan umur job tertua;
- dead-letter count;
- purge duration dan failed run;
- database readiness;
- WhatsApp/email provider failure;
- stale readiness snapshot.

Setiap alert harus mempunyai owner, severity, cooldown, deduplication fingerprint, acknowledgement, resolution, dan escalation path.

## 9. P2 — Test coverage

Typecheck dan build hanya memeriksa integritas kompilasi. Tambahkan test:

1. unit test policy readiness dan payment calculation;
2. integration test role/scope matrix;
3. integration test migration schema smoke;
4. test retention dry-run, hold, batch delete, resume, dan failure;
5. test queue retry, dedupe, lease recovery, dan dead-letter;
6. UI test filter blocker, empty state, error state, dan permission redirect;
7. production-like smoke test dengan admin session;
8. load test untuk dashboard, logs, dan pagination.

## 10. Urutan eksekusi yang disarankan

| Urutan | Pekerjaan | Definition of done |
|---:|---|---|
| 1 | Backup/restore drill dan schema migration staging | Restore berhasil; schema smoke test lolos |
| 2 | Deploy dan verifikasi session bridge/CORS | Admin session berhasil memanggil API production |
| 3 | Centralized error handler + redaction | Tidak ada secret di log; error punya correlation ID |
| 4 | Retention dry-run + legal hold | Kandidat purge dapat direview dan hold terlindungi |
| 5 | Purge batch + audit run | Purge dapat resume dan kill switch bekerja |
| 6 | Queue/retry/dead-letter | Job transient retry, permanent failure masuk DLQ |
| 7 | Financial reconciliation snapshot | Selisih dapat ditelusuri ke source dan approver |
| 8 | Control Tower visa/hotel/manifest/equipment | Semua blocker domain tampil dalam satu departure |
| 9 | Role matrix dan workflow tests | Tidak ada scope leakage pada endpoint utama |
| 10 | Production rollout bertahap | Feature flag, monitoring, rollback, dan runbook tersedia |

## Kesimpulan

Yang paling perlu diperbaiki sekarang bukan menambah halaman baru, melainkan menutup **production control gap**: migration yang benar-benar aktif, authenticated verification, retention yang dapat dihentikan/dilanjutkan, rekonsiliasi finansial yang dapat diaudit, serta Control Tower yang mencakup seluruh blocker keberangkatan. Setelah lima area tersebut selesai, pekerjaan berikutnya dapat difokuskan pada test coverage, UX, dan optimasi performa.

## Referensi internal

[1]: `artifacts/api-server/src/routes/admin/departures.ts` — readiness dan departure API.

[2]: `artifacts/api-server/src/routes/admin/bank-reconciliation.ts` — bank reconciliation dan exception center.

[3]: `artifacts/api-server/src/routes/admin/logs.ts` — filter audit/error logs.

[4]: `lib/db/src/schema/logs.ts` — schema log yang sudah ada.

[5]: `artifacts/api-server/src/routes/admin/tenant.ts` — tenant dan template upgrade API.

[6]: `artifacts/umroh-app/src/features/admin/pages/DepartureReadiness.tsx` — UI readiness saat ini.

[7]: `departure-control-tower-architecture.md` — rancangan Control Tower.

[8]: `log-retention-error-handling-architecture.md` — rancangan retention dan error handling.
