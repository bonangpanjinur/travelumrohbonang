# Skema Database dan Workflow Production untuk Log Retention dan Error Handling

**Proyek:** travelumrohbonang  
**Status:** Rancangan arsitektur  
**Cakupan:** audit log, request log, error log, retention policy, purge job, retry, dead-letter, alerting, dan recovery  
**Penulis:** Manus AI

## 1. Tujuan desain

Rancangan ini memisahkan tiga kebutuhan yang sering tercampur: **observability**, **auditability**, dan **operational recovery**. Error teknis harus dapat didiagnosis, aksi sensitif harus dapat dibuktikan, dan pekerjaan asynchronous yang gagal harus dapat dicoba ulang tanpa membuat duplikasi atau kehilangan data.

Prinsip utamanya adalah sebagai berikut:

1. Log operasional boleh dihapus sesuai retention policy, sedangkan audit log tidak boleh dihapus melalui tombol UI biasa.
2. Data sensitif tidak boleh disimpan di message, stack trace, atau metadata tanpa redaction.
3. Purge harus berjalan dalam batch kecil, idempotent, dapat dilanjutkan setelah gagal, dan meninggalkan jejak audit.
4. Retry hanya dilakukan untuk kegagalan transient. Error permanen masuk ke dead-letter queue dan membutuhkan tindakan operator.
5. Error pada notifikasi atau job latar belakang tidak boleh menggagalkan transaksi bisnis utama.
6. Semua workflow production harus memiliki correlation ID agar satu request dapat ditelusuri dari API sampai job, notifikasi, dan audit event.

## 2. Pilihan pendekatan operasional

Karena retention dan retry merupakan proses deterministik yang perlu berjalan berkala, ada dua pendekatan yang layak.

| Pendekatan | Trade-off | Biaya | Kompleksitas setup |
|---|---|---:|---:|
| **Cron production pada aplikasi yang sudah berjalan** | Paling sedikit komponen baru; perlu memastikan job tidak berjalan ganda pada banyak instance dan harus memakai database lock | Rendah | Rendah–menengah |
| **Worker terpisah dengan queue database** | Isolasi lebih baik, retry dan dead-letter lebih rapi, tetapi menambah proses deployment dan monitoring | Menengah | Menengah–tinggi |
| **Purge manual terjadwal oleh operator** | Ringan untuk fase awal, tetapi retention tidak konsisten dan risiko lupa tinggi; hanya cocok sebagai fallback sementara | Rendah | Rendah |

Rekomendasi arsitektur adalah memakai **cron production yang memanggil worker idempotent berbasis database** pada tahap awal. Jika volume log atau jumlah integrasi meningkat, worker dapat dipisahkan tanpa mengubah schema utama. Polling menit-level tidak diperlukan; purge harian dan retry periodik cukup untuk retention, sedangkan error request dicatat secara sinkron.

## 3. Klasifikasi log dan default retention

Retention harus configurable per kategori dan tidak boleh hanya mengandalkan satu angka global.

| Kategori | Contoh sumber | Isi | Retention default | Boleh purge otomatis? |
|---|---|---|---:|---|
| Request log | `request_log` | Method, endpoint, status, latency, request ID | 30 hari | Ya |
| Application error | `error_logs` | Error ter-redact, stack, route, severity | 90 hari | Ya, setelah archive/approval |
| Job execution | Worker/job runner | Status job, attempts, duration, error code | 90 hari | Ya |
| Notification delivery | WhatsApp/email/outbox | Provider response, status, retry count | 180 hari | Ya, setelah agregasi |
| Security audit | `audit_logs` | Impersonation, test-send, role change, override | 2 tahun atau policy organisasi | Tidak melalui UI biasa |
| Proof access audit | `payment_proof_access_logs`, dokumen | Akses bukti pembayaran/dokumen | 2 tahun atau policy organisasi | Hanya retention job khusus |
| Data deletion audit | Retention/purge event | Apa yang dihapus, kapan, batch, operator/job | 2 tahun atau lebih | Tidak sebelum retention event kedaluwarsa |

Angka di atas adalah **default arsitektur**, bukan keputusan kepatuhan hukum. Nilai final harus disesuaikan dengan kebijakan organisasi, kewajiban akuntansi, kontrak, dan kebutuhan investigasi.

## 4. Skema database

Schema existing `request_log`, `error_logs`, dan `audit_logs` sudah menyediakan fondasi dasar. Tambahkan metadata operasional yang konsisten, lalu buat tabel policy, run, queue, dan alert.

### 4.1 `log_retention_policies`

```sql
CREATE TABLE log_retention_policies (
  id text PRIMARY KEY,
  log_type text NOT NULL UNIQUE,
  retention_days integer NOT NULL CHECK (retention_days > 0),
  archive_before_delete boolean NOT NULL DEFAULT false,
  archive_target text,
  legal_hold_supported boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  policy_version integer NOT NULL DEFAULT 1,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

`log_type` minimal: `request`, `application_error`, `job_execution`, `notification`, `security_audit`, `proof_access`, dan `purge_audit`.

### 4.2 `log_retention_holds`

Legal hold atau investigation hold harus mencegah penghapusan baris yang relevan.

```sql
CREATE TABLE log_retention_holds (
  id text PRIMARY KEY,
  log_type text NOT NULL,
  entity_id text,
  correlation_id text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_by text NOT NULL,
  released_by text,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_log_holds_lookup
  ON log_retention_holds(log_type, entity_id, correlation_id, status);
```

Hold dapat berlaku pada satu entity, satu correlation ID, atau seluruh kategori log. Jika organisasi membutuhkan global hold, gunakan `entity_id IS NULL` dan dokumentasikan dampaknya.

### 4.3 `log_retention_runs`

Tabel ini membuat purge dapat dilanjutkan dan diaudit.

```sql
CREATE TABLE log_retention_runs (
  id text PRIMARY KEY,
  log_type text NOT NULL,
  policy_version integer NOT NULL,
  cutoff_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  last_cursor text,
  scanned_count integer NOT NULL DEFAULT 0,
  archived_count integer NOT NULL DEFAULT 0,
  deleted_count integer NOT NULL DEFAULT 0,
  skipped_hold_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  error_message text,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_retention_runs_status ON log_retention_runs(status, started_at);
```

### 4.4 `retention_purge_audit`

Jangan menyimpan seluruh payload log yang telah dihapus. Simpan bukti agregat dan hash batch.

```sql
CREATE TABLE retention_purge_audit (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES log_retention_runs(id),
  log_type text NOT NULL,
  batch_start_id text,
  batch_end_id text,
  row_count integer NOT NULL,
  content_hash text,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  executed_by text NOT NULL DEFAULT 'system',
  correlation_id text NOT NULL
);
```

`content_hash` dapat berupa hash atas ID, timestamp, dan tipe log dalam batch. Tujuannya adalah membuktikan batch mana yang diproses, bukan memulihkan isi log.

### 4.5 `error_events`

`error_logs` tetap dapat dipakai sebagai log teknis. `error_events` menjadi entitas error yang dapat dikelompokkan, di-alert, dan di-resolve.

```sql
CREATE TABLE error_events (
  id text PRIMARY KEY,
  fingerprint text NOT NULL,
  severity text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  source text NOT NULL,
  route text,
  operation text,
  correlation_id text,
  request_id text,
  user_id text,
  branch_id text,
  message_redacted text NOT NULL,
  stack_redacted text,
  metadata jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  occurrence_count integer NOT NULL DEFAULT 1,
  acknowledged_by text,
  acknowledged_at timestamptz,
  resolved_by text,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_error_events_fingerprint_open
  ON error_events(fingerprint, status)
  WHERE status IN ('open', 'acknowledged');
CREATE INDEX idx_error_events_last_seen ON error_events(last_seen_at DESC);
CREATE INDEX idx_error_events_severity_status ON error_events(severity, status);
```

Fingerprint harus dibentuk dari error class, route, operation, dan normalized message; jangan memasukkan ID user, nomor booking, token, atau data pribadi yang membuat fingerprint terfragmentasi.

### 4.6 `job_queue` dan `job_attempts`

```sql
CREATE TABLE job_queue (
  id text PRIMARY KEY,
  job_type text NOT NULL,
  dedupe_key text,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  priority integer NOT NULL DEFAULT 100,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  completed_at timestamptz,
  failed_at timestamptz,
  last_error_code text,
  last_error_message text,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_job_queue_dedupe
  ON job_queue(job_type, dedupe_key)
  WHERE dedupe_key IS NOT NULL AND status IN ('queued', 'running');
CREATE INDEX idx_job_queue_pick
  ON job_queue(status, available_at, priority);

CREATE TABLE job_attempts (
  id text PRIMARY KEY,
  job_id text NOT NULL REFERENCES job_queue(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,
  status text NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  error_code text,
  error_message text,
  provider_request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 4.7 `alert_events`

```sql
CREATE TABLE alert_events (
  id text PRIMARY KEY,
  alert_key text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  source text NOT NULL,
  fingerprint text NOT NULL,
  summary text NOT NULL,
  details jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  occurrence_count integer NOT NULL DEFAULT 1,
  acknowledged_by text,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_alert_open ON alert_events(fingerprint, status)
  WHERE status IN ('open', 'acknowledged');
```

## 5. Metadata standar pada semua log

Tambahkan atau standarkan field berikut pada request/error/audit/job log:

| Field | Fungsi |
|---|---|
| `correlation_id` | Menghubungkan request, job, provider call, dan audit event |
| `request_id` | Identitas satu request HTTP |
| `service` | Nama aplikasi/worker |
| `environment` | `production`, `staging`, atau `development` |
| `severity` | `debug`, `info`, `warn`, `error`, `critical` |
| `route` dan `operation` | Lokasi operasi |
| `actor_id` | User atau `system` |
| `branch_id` | Scope tenant/cabang bila relevan |
| `duration_ms` | Latency |
| `redaction_version` | Versi sanitizer yang digunakan |

Jangan log `Authorization`, cookie, access token, refresh token, password, OTP secret, nomor kartu, atau file binary. Nomor paspor, nomor rekening, dan nomor telepon harus dimasking jika benar-benar diperlukan untuk diagnosis.

## 6. Workflow error handling request HTTP

### 6.1 Klasifikasi error

| Kategori | Contoh | HTTP | Perlakuan |
|---|---|---:|---|
| Validation | Payload salah atau field wajib hilang | 400/422 | Tidak retry; tampilkan error aman |
| Authentication | Token invalid/expired | 401 | Tidak retry otomatis kecuali refresh session frontend |
| Authorization | Role/scope tidak sesuai | 403 | Tidak retry; audit event bila sensitif |
| Not found/conflict | Entity hilang atau state conflict | 404/409 | Tidak retry tanpa perubahan input |
| Rate limit | Terlalu banyak request | 429 | Retry dengan backoff dari client/provider bila sesuai |
| Transient dependency | Timeout DB/provider, connection reset | 502/503/504 | Retry terbatas pada job; request sinkron memakai timeout |
| Internal | Bug atau invariant rusak | 500 | Catat error event, alert sesuai threshold, jangan bocorkan stack |

### 6.2 Urutan middleware production

1. Buat `request_id` dan `correlation_id` sedini mungkin.
2. Jalankan request logging dengan redaction.
3. Jalankan auth dan scope guard.
4. Validasi input menggunakan schema.
5. Jalankan handler dalam transaction bila menyentuh beberapa tabel.
6. Tangkap error melalui centralized error handler.
7. Map error internal ke response publik yang aman.
8. Upsert `error_events` menggunakan fingerprint.
9. Jadwalkan alert atau notification secara asynchronous.
10. Catat audit log untuk operasi sensitif, baik sukses maupun gagal.

Response production tidak boleh mengembalikan stack trace, query SQL, connection string, atau provider credential.

## 7. Workflow retry dan dead-letter

Pekerjaan yang memanggil WhatsApp, email, storage, atau provider pembayaran sebaiknya masuk `job_queue` setelah transaksi bisnis utama committed.

### 7.1 Aturan retry

Retry hanya untuk error yang kemungkinan berubah jika dicoba lagi, seperti timeout, `429`, connection reset, atau `5xx` provider. Gunakan exponential backoff dengan jitter, misalnya 1 menit, 5 menit, 20 menit, 1 jam, lalu 4 jam. Batas final harus disimpan di `max_attempts` dan dapat berbeda per `job_type`.

Error seperti invalid recipient, invalid payload, unauthorized credential, atau business rejection tidak boleh di-retry tanpa perubahan data. Error tersebut langsung menjadi `failed` atau `dead_letter`.

### 7.2 Lease dan worker crash

Worker mengambil job dengan transaksi singkat menggunakan row lock dan lease. Jika `locked_at` melebihi lease timeout, job berstatus `running` dapat dikembalikan ke `queued` oleh recovery job. `locked_by` harus menyimpan identitas worker agar dua worker tidak memproses job yang sama secara bersamaan.

### 7.3 Idempotency

Setiap job yang mengirim efek eksternal harus memiliki `dedupe_key`. Sebelum mengirim, worker memeriksa apakah operasi sudah berhasil. Untuk test-send, impersonation, reminder, dan webhook processing, simpan provider request ID atau operation ID bila tersedia.

### 7.4 Dead-letter workflow

Setelah `max_attempts` tercapai, status menjadi `dead_letter`, error terakhir disimpan, dan `alert_event` dibuat. Operator dapat memilih:

- **Retry now** setelah memperbaiki konfigurasi atau data.
- **Retry from attempt** bila provider sempat down.
- **Cancel** bila job tidak lagi relevan.
- **Resolve as ignored** dengan alasan wajib.

Semua aksi operator harus masuk `audit_logs`.

## 8. Workflow retention purge

### 8.1 Jadwal

Jalankan retention purge **sekali sehari** pada jam beban rendah. Job mengambil policy aktif, membuat `log_retention_runs`, kemudian memproses setiap `log_type` secara terpisah.

### 8.2 Algoritme batch

1. Ambil policy dan hitung `cutoff_at = now - retention_days`.
2. Cek apakah ada retention run `running` untuk `log_type` yang sama. Jika ada, gunakan database advisory lock atau skip.
3. Pilih batch ID/timestamp yang lebih tua dari cutoff dengan ukuran terbatas, misalnya 500–2.000 baris.
4. Keluarkan baris yang terkena active hold.
5. Jika `archive_before_delete = true`, kirim batch ke archive sebelum delete dan verifikasi hasilnya.
6. Catat batch hash dan jumlah pada `retention_purge_audit`.
7. Hapus batch dalam transaction singkat.
8. Update cursor dan counter pada `log_retention_runs`.
9. Ulangi hingga batch kosong atau time budget habis.
10. Tandai run `completed`; jika gagal, tandai `failed` dan kirim alert.

Jangan menjalankan `DELETE` besar tanpa batch karena dapat menahan lock database dan mengganggu traffic production.

### 8.3 Recovery purge

Jika purge berhenti di tengah jalan, run berikutnya boleh melanjutkan berdasarkan cutoff dan cursor. Karena item yang sudah terhapus tidak lagi muncul, operasi tetap idempotent. Jika archive gagal, batch tidak boleh dihapus.

### 8.4 Dry-run dan approval

Sediakan mode:

```http
POST /api/admin/log-retention/dry-run
POST /api/admin/log-retention/runs
```

Dry-run hanya menghitung kandidat dan estimasi jumlah, tanpa delete. Untuk security audit dan proof-access log, perubahan policy dan purge sebaiknya memerlukan Super Admin approval serta audit event.

## 9. Alerting dan operational dashboard

Dashboard admin atau monitoring eksternal minimal menampilkan:

| Metric | Alert condition contoh |
|---|---|
| Error rate per route | Melampaui baseline selama beberapa interval |
| Critical error count | Ada error critical baru |
| 5xx rate | Melampaui threshold production |
| Queue depth | Job queued terus meningkat |
| Dead-letter count | Ada dead-letter baru |
| Oldest queued job age | Melebihi SLA job |
| Purge duration | Lebih lama dari time budget |
| Purge failed runs | Ada run gagal |
| Database readiness | Health dependency gagal |
| Auth failure burst | Melampaui threshold per IP/user |

Gunakan deduplication berdasarkan `fingerprint` dan cooldown agar satu incident tidak mengirim ratusan alert. Alert resolve harus menutup `alert_event`, bukan menghapus histori.

## 10. Database indexing dan partisi

Pada tahap awal, gunakan index pada timestamp dan status:

```sql
CREATE INDEX idx_request_log_created_at ON request_log(created_at);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

Jika volume meningkat besar, pertimbangkan range partition bulanan berdasarkan `created_at`. Retention kemudian dapat dilakukan dengan detach/drop partition untuk kategori yang boleh dihapus, tetapi audit dan legal hold tetap memerlukan mekanisme pengecualian. Jangan mengaktifkan partisi sebelum menguji query existing, migration, dan backup/restore.

## 11. Keamanan retention dan error data

Purge endpoint tidak boleh terbuka untuk seluruh admin. Role minimal adalah Super Admin atau role khusus `log_retention_admin`. Endpoint harus memerlukan reason, mengeluarkan dry-run summary, dan mencatat approval.

Data yang sudah dikenai legal hold tidak boleh dihapus. Perubahan hold, release hold, perubahan retention policy, purge start, purge completion, dan purge failure wajib menjadi audit event. Audit log purge tidak boleh berada pada kategori yang sama dengan log yang sedang dihapus tanpa pengecualian retention yang lebih panjang.

## 12. Roadmap implementasi

### Tahap 1 — Standardisasi metadata dan centralized handler

Tambahkan request/correlation ID, redaction utility, error classification, dan centralized error handler. Pastikan response production aman serta error teknis masuk ke `error_events`.

### Tahap 2 — Schema retention dan job execution

Buat migration untuk policy, holds, runs, purge audit, job queue, attempts, dan alerts. Seed policy default hanya setelah backup dan staging validation.

### Tahap 3 — Retention dry-run dan purge harian

Implementasikan dry-run, advisory lock, batch delete, hold check, progress cursor, dan recovery. Jalankan dry-run di production terlebih dahulu dan bandingkan hasil dengan kebutuhan tim.

### Tahap 4 — Retry dan dead-letter

Migrasikan reminder, email, WhatsApp, dan job integrasi ke queue. Tambahkan backoff, lease recovery, dedupe key, dead-letter dashboard, dan audit action.

### Tahap 5 — Alert dan production verification

Aktifkan alert threshold, uji failure dependency, uji worker crash, uji purge partial failure, uji restore staging, dan lakukan authenticated smoke test. Rollout menggunakan feature flag.

## 13. Migration production workflow

Sebelum migration:

1. Pastikan backup database terbaru tersedia dan restore test berhasil pada lingkungan staging.
2. Review migration SQL dan pastikan semuanya idempotent dengan `IF NOT EXISTS` bila sesuai.
3. Cek index creation agar tidak mengunci tabel besar terlalu lama; gunakan strategi online/concurrent jika didukung deployment.
4. Deploy schema terlebih dahulu, lalu deploy code yang menggunakannya.
5. Jalankan seed policy dengan retention conservative, bukan purge agresif.
6. Jalankan dry-run dan simpan hasilnya.
7. Aktifkan purge hanya setelah operator menyetujui hasil dry-run.
8. Monitor error rate, database latency, queue depth, dan purge run.
9. Sediakan rollback code dan kill switch untuk job purge/retry.

Rollback purge tidak berarti mengembalikan baris yang telah dihapus. Karena itu, archive, backup, dan dry-run adalah kontrol pencegahan; fitur kill switch hanya menghentikan batch berikutnya.

## 14. Kriteria penerimaan

| Area | Kriteria penerimaan |
|---|---|
| Redaction | Token, cookie, password, dan data sensitif tidak muncul di log production |
| Correlation | Satu request dapat ditelusuri ke error event, job, provider call, dan audit event |
| Error response | Client menerima error aman tanpa stack trace atau detail database |
| Retry | Hanya transient error yang diulang; retry menggunakan backoff dan jitter |
| Idempotency | Re-run job tidak menggandakan reminder, audit event, atau efek eksternal |
| Dead-letter | Job gagal permanen terlihat, dapat di-retry/cancel, dan setiap aksi diaudit |
| Retention | Policy per kategori, dry-run, batch delete, hold, cursor, dan audit tersedia |
| Recovery | Worker crash dan purge partial failure dapat dilanjutkan tanpa korupsi |
| Security | Hanya role khusus yang dapat mengubah policy, hold, atau purge |
| Production | Migration diuji di staging, backup diverifikasi, dan rollout memiliki kill switch |

## 15. Rekomendasi akhir

Mulai dengan **centralized error handler + schema retention + dry-run purge** sebelum mengaktifkan delete otomatis. Ini memberikan observability dan kontrol tanpa langsung mengambil risiko kehilangan data. Setelah hasil dry-run stabil, aktifkan purge harian untuk `request_log` terlebih dahulu, kemudian `error_logs` dan notification logs. `audit_logs`, proof-access logs, dan purge audit harus memiliki retention lebih panjang dan perlindungan hold.

Untuk sistem yang sekarang, cron production pada API server sudah cukup untuk purge harian selama job memakai database lock dan batch. Queue database dapat menjadi fondasi retry/dead-letter tanpa menambah vendor eksternal. Jika volume meningkat, worker dapat dipisahkan ke proses background yang selalu aktif; keputusan itu baru diperlukan ketika queue latency atau kebutuhan integrasi tidak lagi cocok dengan request/cron worker biasa.

## Referensi internal

[1]: `artifacts/api-server/src/routes/admin/logs.ts` — endpoint audit/error log dan filter server-side.

[2]: `lib/db/src/schema/logs.ts` — schema `request_log`, `error_logs`, `audit_logs`, dan proof-access logs.

[3]: `artifacts/api-server/src/lib/securityAudit.ts` — structured security audit logging.

[4]: `artifacts/api-server/src/middlewares/sensitiveActionLimiter.ts` — rate limiting untuk aksi sensitif.

[5]: `artifacts/api-server/src/app.ts` — middleware pipeline, CORS, dan centralized application wiring.

[6]: `vercel.json` — konfigurasi deployment dan cron yang perlu diselaraskan dengan job retention production.
