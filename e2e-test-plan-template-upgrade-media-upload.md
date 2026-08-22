# Rencana Pengujian E2E: Upgrade Template dan Upload Media

**Proyek:** travelumrohbonang  
**Cakupan:** UI admin, API Express, database, storage, authorization, audit log, dan deployment  
**Status:** Rencana pengujian yang dapat diotomatisasi di staging dan dijalankan sebagai smoke test production

## 1. Tujuan dan prinsip pengujian

Pengujian ini memastikan workflow upgrade template dan upload media berjalan benar dari browser sampai database dan storage. Pengujian harus membuktikan bahwa harga dan status order ditentukan oleh server, bukti pembayaran tidak otomatis dianggap lunas, file hanya dapat diakses sesuai scope, operasi duplikat tidak membuat order ganda, serta seluruh kegagalan penting memiliki correlation ID dan jejak audit.

Pengujian production harus bersifat **read-only atau menggunakan data uji yang terisolasi**. Jangan memakai nomor WhatsApp nyata, bukti pembayaran nyata, tenant aktif, atau file bisnis yang masih digunakan. Purge retention, approval finansial nyata, dan perubahan template tenant aktif dilarang dalam smoke test production.

## 2. Environment dan akun uji

| Environment | Tujuan | Data yang diizinkan | Kriteria penggunaan |
|---|---|---|---|
| Local | Fast feedback dan contract test | Database/storage lokal atau mock | Setiap pull request |
| Staging/preview | Full E2E lintas UI/API/DB/storage | Tenant, branch, order, dan file khusus E2E | Setiap release candidate |
| Production | Smoke test minimal | Tenant sandbox dan file disposable | Setelah deploy, tanpa aksi irreversible |

Gunakan sekurang-kurangnya akun berikut:

| Akun | Peran | Tujuan |
|---|---|---|
| `e2e-super-admin` | `super_admin` | Pricing, approval, audit, dan akses global |
| `e2e-branch-admin` | `admin` atau `branch_manager` | Scope tenant/branch dan upload |
| `e2e-staff` | `staff` | Memastikan permission read/write sesuai kebijakan |
| `e2e-agent` | `agent` | Memastikan akses lintas branch tidak bocor |
| Anonymous | Tidak login | Negative authorization test |

Setiap run perlu memiliki `runId`, `tenantSiteId`, `branchId`, dan prefix filename unik. Data dibuat melalui fixture dan dihapus hanya dari staging setelah artefact test tersimpan.

## 3. Observability yang wajib dikumpulkan

Setiap test menyimpan request URL, method, status, response body yang sudah di-redact, `x-correlation-id`, database entity ID, dan path storage. Token, cookie, password, signed URL, nomor rekening, dan isi dokumen pribadi tidak boleh masuk ke report.

Assertion observability minimal:

| Event | Assertion |
|---|---|
| Upload berhasil | Response memiliki correlation ID dan metadata file yang sesuai |
| Order dibuat | Audit event submission tercatat dengan entity order |
| Transisi status | Audit event menyimpan status awal dan tujuan |
| Error server | Response aman, correlation ID tersedia, dan `error_events` terisi atau fallback tidak menggagalkan request |
| Akses ditolak | HTTP 401/403/404 sesuai kebijakan dan tidak membocorkan keberadaan file lintas scope |

## 4. Skenario E2E upload media

### 4.1 Upload file valid melalui UI

**Prasyarat:** akun branch admin login, tenant sandbox aktif, branch fixture tersedia.

1. Buka halaman yang menggunakan upload media, misalnya Template Upgrade atau pengelolaan tenant.
2. Pilih file JPEG, PNG, WebP, PDF, dan satu video yang sesuai batas ukuran endpoint.
3. Submit upload.
4. Pastikan UI menampilkan status berhasil dan URL internal, bukan URL storage eksternal atau path filesystem.
5. Ambil `branchId`, filename, MIME type, dan size dari response.
6. Akses kembali file melalui endpoint internal menggunakan sesi yang sama.
7. Pastikan content type, content length, dan isi file sesuai fixture.
8. Verifikasi audit/correlation metadata bila upload route mencatat event.

**Expected result:** upload berhasil, filename memakai format random/UUID dengan extension yang sesuai MIME, file tersimpan pada folder branch yang benar, dan tidak ada credential di log.

### 4.2 Upload file tidak valid

Uji setiap fixture berikut secara terpisah: executable, HTML/JavaScript, SVG jika tidak diizinkan, file dengan MIME spoofing, nama file `../../secret.txt`, file kosong, file di atas batas 50 MB, multipart tanpa field `file`, dan request tanpa content type multipart.

**Expected result:** request ditolak dengan HTTP 400/413, tidak ada file parsial tertinggal, tidak ada path traversal, dan error response tidak memuat stack trace atau filesystem path.

### 4.3 Validasi MIME spoofing

Buat file dengan extension `.png` tetapi magic bytes bukan PNG, dan file dengan MIME header image tetapi isi executable. Jika sistem hanya memvalidasi MIME multipart, tandai sebagai risiko dan tambahkan content sniffing server-side pada tahap hardening berikutnya. Acceptance minimum adalah extension server-side tidak boleh berasal langsung dari nama file pengguna.

### 4.4 Scope akses file

| Skenario | Expected result |
|---|---|
| Branch admin membaca file branch sendiri | HTTP 200 |
| Branch admin membaca file branch lain | HTTP 404 atau 403 tanpa membocorkan keberadaan |
| Agent membaca file yang bukan scope-nya | Ditolak |
| Super admin membaca file lintas branch | Diizinkan bila kebijakan global mengizinkan |
| Anonymous membaca file | Ditolak |
| Filename berisi `../` atau encoded traversal | Ditolak dan tidak keluar dari upload root |
| Legacy flat path oleh non-global admin | Ditolak |

### 4.5 Kegagalan storage dan cleanup

Simulasikan storage penuh, permission denied, write timeout, dan database insert gagal setelah file berhasil ditulis. Pastikan response gagal secara aman dan file orphan ditangani oleh cleanup/reconciliation job. Jika cleanup belum tersedia, test harus membuat issue P1 dan menyimpan orphan count sebagai metric.

## 5. Skenario E2E upgrade template

### 5.1 Membaca pricing dari server

1. Login sebagai admin yang berwenang.
2. Buka Upgrade Dialog.
3. Pastikan daftar template dan harga berasal dari endpoint backend.
4. Ubah harga pada payload browser secara manual sebelum submit.
5. Submit order.

**Expected result:** order memakai harga aktif dari database server, bukan harga yang dikirim browser. Template inactive atau tidak dikenal ditolak.

### 5.2 Membuat order tanpa bukti pembayaran

1. Pilih tenant sandbox dan target template valid.
2. Submit tanpa proof URL.
3. Verifikasi order tersimpan dengan status `pending`.
4. Pastikan status bukan `paid` atau `approved`.
5. Periksa `currentTemplate` berasal dari database bila field browser diubah.

### 5.3 Membuat order dengan bukti internal

1. Upload bukti melalui endpoint upload internal.
2. Gunakan URL response internal pada form upgrade.
3. Submit order.
4. Verifikasi status menjadi `proof_submitted`.
5. Pastikan URL eksternal, `javascript:`, URL domain lain, filesystem path, dan path traversal ditolak.

### 5.4 Idempotency dan double-submit

Jalankan dua submit paralel dengan tenant dan target template yang sama. Ulangi setelah browser refresh dan setelah simulasi timeout response.

**Expected result:** hanya satu order aktif `pending` atau `proof_submitted` yang dibuat. Request berikutnya mengembalikan order aktif dengan indikator deduplicated atau response ekuivalen, tanpa double charge dan tanpa order ganda.

### 5.5 State machine order

| Dari | Ke | Expected |
|---|---|---|
| `pending` | `proof_submitted` | Diizinkan bila bukti valid |
| `pending` | `rejected` | Diizinkan oleh role yang sesuai |
| `pending` | `approved` | Ditolak HTTP 409 |
| `proof_submitted` | `approved` | Diizinkan hanya role approver |
| `proof_submitted` | `rejected` | Diizinkan |
| `approved` | `pending`/`rejected` | Ditolak |
| `rejected` | `pending` | Diizinkan untuk resubmission bila kebijakan mengizinkan |
| status tidak dikenal | apa pun | Ditolak HTTP 400 |

Jalankan update paralel dari dua browser untuk memverifikasi compare-and-set. Salah satu request harus berhasil dan request stale harus menerima HTTP 409 tanpa menimpa perubahan terbaru.

### 5.6 Approval dan audit

1. Submit order dengan `proof_submitted`.
2. Approve sebagai approver yang valid.
3. Coba approve sebagai staff/agent/anonymous.
4. Verifikasi audit event untuk submission dan update.
5. Pastikan audit mencatat actor, entity order, status awal/akhir, correlation ID, dan timestamp tanpa menyimpan proof content atau token.

### 5.7 Database failure dan retry UI

Simulasikan database timeout saat create dan update order. UI harus menampilkan error yang dapat dipahami, tidak menganggap order berhasil, dan menyediakan retry aman. Retry tidak boleh membuat order ganda karena idempotent lookup.

## 6. Skenario negative security bersama

| Test | Expected result |
|---|---|
| Anonymous pricing/order/upload | HTTP 401 |
| Staff mengubah status menjadi approved | HTTP 403 |
| Agent mengakses tenant/branch lain | HTTP 403/404 |
| ID order milik tenant lain | Tidak bocor; HTTP 404/403 |
| Payload dengan field database tambahan | Field diabaikan atau ditolak |
| Payload proof URL eksternal | HTTP 400 |
| SQL-like string pada template/tenant ID | Tidak menghasilkan SQL injection |
| Request berulang pada endpoint sensitif | Rate limit sesuai policy |
| Error response production | Tidak ada stack, token, query, atau filesystem path |
| CORS origin tidak diizinkan | Tidak mendapat credentialed access |

## 7. Kontrak API yang perlu diuji

### Upload

```text
POST /api/admin/uploads/image
POST /api/admin/uploads/file
GET  /api/admin/uploads/files/:branchId/:filename
```

Assertion response upload: status 200, `url` diawali `/api/admin/uploads/files/`, filename tidak berasal langsung dari input, branch scope benar, size sesuai, dan correlation ID tersedia.

### Template upgrade

```text
GET   /api/admin/tenant/pricing
POST  /api/admin/tenant/upgrades
GET   /api/admin/tenant/upgrades
PATCH /api/admin/tenant/upgrades/:id
```

Assertion order: harga server-side, status valid, proof URL internal, tenant valid, duplicate active order tidak dibuat, dan state transition atomik.

## 8. Struktur automation yang disarankan

Gunakan Playwright atau framework browser E2E yang sudah disepakati proyek untuk UI flow. API contract test dapat dijalankan dengan `supertest` atau client HTTP test yang sama dengan auth fixture. Database assertions memakai koneksi staging khusus read-only setelah request selesai. Storage assertions memakai bucket/folder staging dan prefix `e2e-${runId}`.

Contoh struktur:

```text
artifacts/e2e/
  fixtures/auth.ts
  fixtures/database.ts
  fixtures/storage.ts
  upload-media.spec.ts
  template-upgrade.spec.ts
  security-negative.spec.ts
  cleanup.ts
```

Setiap spec harus membuat data dengan `runId`, memakai timeout eksplisit, menangkap trace/screenshot hanya ketika gagal, dan selalu menjalankan cleanup melalui `afterAll` tanpa menghapus data yang bukan milik run tersebut.

## 9. CI/CD gates

| Gate | Kapan | Syarat lulus |
|---|---|---|
| Unit/contract | Pull request | Semua test lulus, typecheck lulus |
| API integration | Pull request | Auth, state machine, scope, dan response contract lulus |
| Full E2E staging | Release candidate | Upload, order, approval, audit, cleanup lulus |
| Migration smoke | Sebelum deploy | Migration apply pada database kosong dan database existing lulus |
| Preview smoke | Setelah deploy preview | Health, login, pricing, upload disposable, order disposable lulus |
| Production smoke | Setelah deploy production | Health, anonymous denial, authenticated read-only, dan route presence lulus |

Kegagalan P0/P1 menghentikan deployment. Flaky test tidak boleh di-retry tanpa menyimpan attempt pertama dan alasan retry.

## 10. Acceptance criteria keseluruhan

Workflow dinyatakan lulus apabila seluruh hal berikut terpenuhi:

1. File valid dapat di-upload dan dibaca kembali hanya oleh scope yang berhak.
2. File invalid, oversized, spoofed, dan traversal ditolak tanpa orphan yang tidak terlacak.
3. Harga upgrade selalu berasal dari server.
4. Bukti upload menghasilkan `proof_submitted`, bukan `paid`.
5. Approval hanya dapat dilakukan dari state yang benar dan role yang benar.
6. Double-submit dan race condition tidak menghasilkan order ganda atau overwrite diam-diam.
7. Tenant/branch scope mencegah cross-tenant dan cross-branch access.
8. Audit event dan correlation ID tersedia untuk aksi penting.
9. Error production aman dan tidak membocorkan secret atau stack trace.
10. Migration staging dapat diulang secara idempotent dan production smoke test tidak menjalankan aksi destructive.

## 11. Runbook pelaksanaan

Sebelum test, buat backup staging, siapkan akun dan fixture, cek storage quota, dan pastikan `RETENTION_PURGE_ENABLED=false`. Jalankan test local/unit, lanjutkan API integration, kemudian full browser E2E pada staging. Setelah deployment preview, ulangi smoke test upload dan upgrade dengan data disposable. Production hanya menjalankan health, anonymous authorization, authenticated read-only, pricing read, dan upload/order sandbox yang telah disetujui.

Setelah test, simpan report, trace, correlation ID, entity IDs, dan hasil database assertion. Hapus fixture staging berdasarkan `runId`. Jika terjadi kegagalan, hentikan rollout, jangan retry operasi finansial secara manual, cari correlation ID pada log, dan periksa apakah request sebenarnya sudah membuat order sebelum melakukan retry.

## 12. Gap yang perlu diperbaiki sebelum automation penuh

Rencana ini mengasumsikan tersedia akun staging, storage disposable, fixture database, dan runner browser. Sebelum menjalankan full E2E, proyek masih perlu menambahkan idempotency key formal pada endpoint order, content sniffing untuk validasi MIME yang kuat, cleanup orphan upload, provider/storage failure injection, serta endpoint atau query read-only untuk verifikasi audit event secara deterministik.
