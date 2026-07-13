# BUG_TRACKER.md
> Daftar bug dan technical debt yang ditemukan saat audit.
> Terakhir diperbarui: 2026-07-13 (lihat juga `docs/ADMIN_PANEL_AUDIT_2026-07-13.md` untuk audit panel admin lengkap)

---

## Legend Prioritas

| Priority | Arti |
|----------|------|
| P0 🔴 | Blocker — sistem tidak bisa berjalan atau ada security breach |
| P1 🟠 | High — fitur utama tidak berfungsi |
| P2 🟡 | Medium — fitur ada tapi tidak lengkap |
| P3 🟢 | Low — kualitas & maintainability |

---

## P0 — Blocker

### B1 — `SESSION_SECRET` di secrets tapi tidak dipakai
| | |
|---|---|
| **Severity** | P0 |
| **Lokasi** | Replit Secrets |
| **Dampak** | Secret yang tidak dipakai bisa menyebabkan kebingungan |
| **Solusi** | Verifikasi apakah ada kode yang membutuhkan `SESSION_SECRET`. Jika tidak, hapus dari secrets. |
| **Status** | ✅ Closed — SESSION_SECRET ada di Replit Secrets dan tersedia di env, tidak perlu action |

---

### B2 — Admin routes return 401 tanpa pesan jelas jika `SUPABASE_SERVICE_ROLE_KEY` tidak di-set
| | |
|---|---|
| **Severity** | P0 |
| **Lokasi** | `artifacts/api-server/src/middlewares/authMiddleware.ts` |
| **Dampak** | Admin tidak bisa login, tidak ada pesan error yang membantu debugging |
| **Solusi** | SUPABASE_SERVICE_ROLE_KEY dijadikan optional di envValidation.ts. System fallback ke local Postgres via DATABASE_URL. |
| **Status** | ✅ Fixed — envValidation.ts diupdate, SUPABASE_SERVICE_ROLE_KEY = optional |

---

### B3 — Redirect loop: user ada di Supabase Auth tapi tidak ada di `user_roles`
| | |
|---|---|
| **Severity** | P0 |
| **Lokasi** | `artifacts/umroh-app/src/features/admin/AdminRoute.tsx`, `AuthRoute.tsx` |
| **Dampak** | User baru atau user yang role-nya terhapus akan terjebak di redirect loop |
| **Root Cause** | Trigger `create_user_profile` mungkin belum dijalankan |
| **Solusi** | Trigger `trg_handle_new_local_user` sudah dibuat di local PostgreSQL. Non-admin fallback ke role `buyer` di authMiddleware. |
| **Status** | ✅ Fixed — trigger baru + fallback buyer role di authMiddleware |

---

### B4 — Trigger konflik Replit Auth vs Supabase Auth
| | |
|---|---|
| **Severity** | P0 |
| **Lokasi** | `scripts/migrations/business_logic_triggers.sql` |
| **Dampak** | Auth inconsistency di production |
| **Root Cause** | Project pernah menggunakan Replit Auth |
| **Solusi** | business_logic_triggers.sql ditulis ulang dari scratch tanpa referensi Replit Auth schema. Semua trigger menggunakan public.users bukan auth.users. |
| **Status** | ✅ Fixed — trigger file ditulis ulang, diapply ke Replit PostgreSQL |

---

### B5 — `add_new_user_profile_trigger.sql` gagal di local dev
| | |
|---|---|
| **Severity** | P0 |
| **Lokasi** | `scripts/migrations/add_new_user_profile_trigger.sql` |
| **Dampak** | Migration gagal jika dijalankan di environment lokal |
| **Root Cause** | Trigger ini attach ke `auth.users` yang hanya ada di Supabase cloud |
| **Solusi** | `trg_handle_new_local_user` di `business_logic_triggers.sql` meng-handle local user creation di public.users. File Supabase-only tetap ada untuk cloud deployment. |
| **Status** | ✅ Fixed — local trigger dibuat terpisah di business_logic_triggers.sql |

---

## P0 🔒 — Security

### B6 — `/cms/chat-messages` tidak ada auth/ownership check
| | |
|---|---|
| **Severity** | P0 🔒 SECURITY |
| **Lokasi** | `artifacts/api-server/src/routes/cms.ts` baris 216 |
| **Dampak** | Data leak — siapapun bisa membaca pesan chat booking orang lain |
| **Solusi** | `requireAuth` middleware + ownership check (userId match atau isAdmin) sudah ditambahkan |
| **Status** | ✅ Fixed — route sudah ada requireAuth + ownership/staff check |

---

## P1 — High

### B7 — Payment gateway tidak terintegrasi
| | |
|---|---|
| **Severity** | P1 |
| **Lokasi** | `artifacts/api-server/src/routes/`, `artifacts/umroh-app/src/features/booking/Payment.tsx` |
| **Dampak** | Customer hanya bisa bayar manual (transfer bank + upload bukti) |
| **Solusi** | Integrasi Midtrans atau Xendit. MIDTRANS_SERVER_KEY dan XENDIT_API_KEY sudah ada di env spec. |
| **Status** | 🟡 Partially fixed (2026-07-13) — UI untuk input kredensial payment gateway (Midtrans/Xendit: server key, client key, callback token, mode sandbox/production) sudah ada dan berfungsi (`PaymentGatewaySettings.tsx`, tab "Pengaturan API" di halaman Payment Gateway admin), tersimpan aman via `/api/admin/integrations` (gated `requireSuperAdmin`, nilai secret di-redact saat dibaca). **Belum**: logika integrasi live (create transaction, callback/webhook handling, status sync) — masih menunggu API key produksi dari user sebelum bisa diuji end-to-end. |

---

### B8 — Potensi schema drift antara Drizzle ORM dan manual SQL migrations
| | |
|---|---|
| **Severity** | P1 |
| **Lokasi** | Drizzle schema vs supabase_schema.sql |
| **Dampak** | Schema di production bisa berbeda dengan kode |
| **Solusi** | `pnpm --filter @workspace/db run push` sudah dijalankan — schema Drizzle di-push ke Replit PostgreSQL. Drizzle adalah single source of truth. |
| **Status** | ✅ Fixed — schema pushed ke Replit PostgreSQL via drizzle-kit |

---

## P2 — Medium

### B9 — `lib/replit-auth-web` legacy package masih ada
| | |
|---|---|
| **Severity** | P2 |
| **Lokasi** | `lib/replit-auth-web/` |
| **Dampak** | Dead code yang membingungkan |
| **Solusi** | Referensi di `artifacts/umroh-app/tsconfig.json` sudah dihapus. Package folder masih ada tapi tidak direferensikan. |
| **Status** | ✅ Fixed — tsconfig.json tidak lagi mereferensikan replit-auth-web |

---

### B10 — `AnalyticsAI.tsx` komponen tanpa backend
| | |
|---|---|
| **Severity** | P2 |
| **Lokasi** | `artifacts/umroh-app/src/features/admin/AnalyticsAI.tsx` |
| **Dampak** | Halaman admin Analytics AI ada tapi tidak fungsional |
| **Solusi** | Pilih: (A) Implementasi koneksi ke AI model, atau (B) Sembunyikan menu ini sampai siap. |
| **Status** | ✅ Partially fixed (2026-07-13) — opsi B dipilih: menu "Analitik AI" disembunyikan dari sidebar admin (`adminMenuConfig.ts`) sampai backend-nya dibangun. Halaman/route lama masih ada di kode tapi tidak lagi ditautkan. |

---

### B11 — `admin/contracts.ts` flow CRUD belum lengkap
| | |
|---|---|
| **Severity** | P2 |
| **Lokasi** | `artifacts/api-server/src/routes/admin/`, `features/admin/pages/AdminContracts.tsx` |
| **Dampak** | Fitur kontrak tidak bisa digunakan sepenuhnya |
| **Solusi** | Backend sudah punya create/read/update/delete di `admin/contracts.ts`; yang hilang adalah UI untuk edit (PATCH). Ditambahkan dialog "Edit" di `AdminContracts.tsx` yang memanggil `PATCH /api/admin/contracts/:id` untuk mengoreksi nama penandatangan / tanggal TTD. |
| **Status** | ✅ Fixed (2026-07-13) — full CRUD (create, read, edit, delete) tersedia di UI admin |

---

## P3 — Low

### B12 — Tidak ada global React Error Boundary
| | |
|---|---|
| **Severity** | P3 |
| **Lokasi** | `artifacts/umroh-app/src/App.tsx` |
| **Dampak** | Blank white screen saat unhandled error |
| **Solusi** | ErrorBoundary wrapper sudah ada di App.tsx (baris 115, 259) |
| **Status** | ✅ Fixed — ErrorBoundary sudah ada |

---

### B13 — `console.error` di `faqs.ts` tanpa proper error response
| | |
|---|---|
| **Severity** | P3 |
| **Lokasi** | `artifacts/api-server/src/routes/faqs.ts` baris 40 |
| **Dampak** | Error response format tidak konsisten |
| **Solusi** | Route ini sudah mengirim `res.status(500).json({ error, message, stack })` dengan `message`/`stack` hanya di `NODE_ENV=development` (tidak ada leak di production). Ini bukan route `/api/admin/*` sehingga skema `sendAdminError` (lihat `ADMIN_API_ERROR_SCHEMA.md`) tidak berlaku di sini — format legacy `{ error }` sudah cukup konsisten dengan route publik lain (`services.ts`, `pages.ts`, dst). |
| **Status** | ✅ Closed (2026-07-13) — response sudah proper untuk route publik, tidak perlu migrasi ke schema admin |

---

### B14 — Stale `.tsbuildinfo` bisa menyembunyikan TypeScript errors
| | |
|---|---|
| **Severity** | P3 |
| **Lokasi** | Semua packages (monorepo) |
| **Dampak** | `pnpm run typecheck` bisa melaporkan 0 error padahal error nyata ada |
| **Solusi** | Ditambahkan script `typecheck:clean` (root `package.json`) yang menghapus semua `*.tsbuildinfo` secara otomatis sebelum `typecheck:libs` berjalan — tidak perlu lagi diingat manual. |
| **Status** | ✅ Fixed (2026-07-13) — `pnpm run typecheck` sekarang selalu bersih dari cache basi |

---

## Technical Debt

| # | Debt | Severity | Status |
|---|------|----------|--------|
| TD1 | Dua jalur DB (Drizzle vs Supabase direct) tanpa abstraksi | High | Partially fixed — authMiddleware sudah local-first |
| TD2 | OpenAPI spec bisa drift dari implementasi Express routes | High | 🔲 Open — ~295 route terdaftar vs spec yang hanya mendokumentasikan sebagian kecil endpoint; regenerasi penuh spec 1:1 di luar scope perbaikan kali ini, butuh keputusan terpisah (generate otomatis dari route table vs tulis manual) sebelum dikerjakan |
| TD3 | Tidak ada integration tests / e2e tests | High | ✅ Partially fixed (2026-07-13) — `vitest` + `supertest` ditambahkan ke `api-server` (`pnpm --filter @workspace/api-server run test`, juga `pnpm run test` dari root). 14 test baru: unit test untuk logika ownership-scoping di `rest.ts` (lihat TD5) + smoke test black-box (tabel publik vs AUTH_TABLE, tabel tidak dikenal, health check). Test ini langsung menangkap bug nyata (placeholder SQL `$N` hilang) sebelum sempat jalan di production. Masih terbatas ke api-server; frontend (`umroh-app`) belum punya test runner terpasang. |
| TD4 | Schema drift: Drizzle ORM vs manual SQL migrations | High | ✅ Fixed — drizzle push dijalankan |
| TD5 | `rest.ts` proxy — RLS policies belum diverifikasi untuk semua tabel | Low | ✅ Fixed (2026-07-13) — proxy generik `/rest/v1/:table` sebelumnya hanya mengecek `req.isAuthenticated()` untuk AUTH_TABLES, tanpa ownership check per baris: buyer/agent mana pun bisa baca/ubah booking, payment, dokumen, notifikasi milik user lain. Ditambahkan scoping berbasis peran: staff (admin/super_admin/branch_manager/staff) tetap akses penuh (perilaku lama tidak berubah); non-staff dibatasi ke baris miliknya sendiri via kolom `user_id` langsung (bookings, wishlists, notifications, dst) atau lewat `booking_id → bookings.user_id` (booking_rooms, booking_payments, pilgrim_documents, dst); tabel manajemen tanpa use-case non-staff (audit_logs, financial_transactions, agent_commissions, dst) ditolak total untuk non-staff. Diterapkan di GET/PATCH/DELETE (filter WHERE tambahan) dan POST (validasi kepemilikan sebelum insert, termasuk untuk batch insert). Di-cover oleh test di TD3. |
| TD6 | Tidak ada error boundary di frontend | Medium | ✅ Fixed |
| TD7 | `SESSION_SECRET` di Replit Secrets tidak dipakai | Low | ✅ Closed — tersedia via env |
| TD8 | `AnalyticsAI.tsx` tanpa backend | Low | ✅ Closed — duplikat dari B10, sudah ditangani (menu disembunyikan dari sidebar, lihat B10) |
| TD9 | Bahasa campur Indonesia/English di kode | Low | ✅ Won't fix — bukan bug fungsional; campuran Indonesia (UI/copy, sesuai audiens pengguna) dan English (kode/komentar teknis, konvensi umum) konsisten dan disengaja di seluruh codebase, bukan sisa kelalaian. Tidak ada dampak ke pengguna atau maintainability yang cukup untuk membenarkan refactor besar-besaran. |
| TD10 | `lib/replit-auth-web` legacy package | Medium | ✅ Fixed — tsconfig ref dihapus |

---

## Status Tracker

| ID | Status |
|----|--------|
| B1 | ✅ Closed |
| B2 | ✅ Fixed |
| B3 | ✅ Fixed |
| B4 | ✅ Fixed |
| B5 | ✅ Fixed |
| B6 🔒 | ✅ Fixed |
| B7 | 🟡 Partially fixed (UI kredensial selesai, logika integrasi butuh API keys) |
| B8 | ✅ Fixed |
| B9 | ✅ Fixed |
| B10 | ✅ Partially fixed (menu hidden) |
| B11 | ✅ Fixed |
| B12 | ✅ Fixed |
| B13 | ✅ Closed |
| B14 | ✅ Fixed |
