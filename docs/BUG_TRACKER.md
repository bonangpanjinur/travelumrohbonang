# BUG_TRACKER.md
> Daftar bug dan technical debt yang ditemukan saat audit.
> Terakhir diperbarui: 2026-07-10

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
| **Status** | 🔲 Open — butuh API keys dari payment provider |

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
| **Status** | 🔲 Open — future feature |

---

### B11 — `admin/contracts.ts` flow CRUD belum lengkap
| | |
|---|---|
| **Severity** | P2 |
| **Lokasi** | `artifacts/api-server/src/routes/admin/`, `features/admin/AdminContracts.tsx` |
| **Dampak** | Fitur kontrak tidak bisa digunakan sepenuhnya |
| **Solusi** | Implementasi create/update/delete operations di backend route. |
| **Status** | 🔲 Open — future sprint |

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
| **Status** | 🔲 Open — low priority |

---

### B14 — Stale `.tsbuildinfo` bisa menyembunyikan TypeScript errors
| | |
|---|---|
| **Severity** | P3 |
| **Lokasi** | Semua packages (monorepo) |
| **Dampak** | `pnpm run typecheck` bisa melaporkan 0 error padahal error nyata ada |
| **Solusi** | Jalankan: `find . -name "*.tsbuildinfo" -delete && pnpm typecheck` sebelum percaya pada hasil typecheck |
| **Status** | 🔲 Open — known limitation, documented |

---

## Technical Debt

| # | Debt | Severity | Status |
|---|------|----------|--------|
| TD1 | Dua jalur DB (Drizzle vs Supabase direct) tanpa abstraksi | High | Partially fixed — authMiddleware sudah local-first |
| TD2 | OpenAPI spec bisa drift dari implementasi Express routes | High | 🔲 Open |
| TD3 | Tidak ada integration tests / e2e tests | High | 🔲 Open |
| TD4 | Schema drift: Drizzle ORM vs manual SQL migrations | High | ✅ Fixed — drizzle push dijalankan |
| TD5 | `rest.ts` proxy — RLS policies belum diverifikasi untuk semua tabel | Low | 🔲 Open |
| TD6 | Tidak ada error boundary di frontend | Medium | ✅ Fixed |
| TD7 | `SESSION_SECRET` di Replit Secrets tidak dipakai | Low | ✅ Closed — tersedia via env |
| TD8 | `AnalyticsAI.tsx` tanpa backend | Low | 🔲 Open |
| TD9 | Bahasa campur Indonesia/English di kode | Low | 🔲 Open — stylistic |
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
| B7 | 🔲 Open (needs payment keys) |
| B8 | ✅ Fixed |
| B9 | ✅ Fixed |
| B10 | 🔲 Open |
| B11 | 🔲 Open |
| B12 | ✅ Fixed |
| B13 | 🔲 Open |
| B14 | 🔲 Open |
