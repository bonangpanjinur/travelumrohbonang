# BUG_TRACKER.md
> Daftar bug dan technical debt yang ditemukan saat audit.
> Terakhir diperbarui: 2026-07-08

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
| **Dampak** | Secret yang tidak dipakai bisa menyebabkan kebingungan; jika ada kode yang expect-nya ada tapi tidak ditemukan, bisa menyebabkan silent bug |
| **Solusi** | Verifikasi apakah ada kode yang membutuhkan `SESSION_SECRET`. Jika tidak, hapus dari secrets. Jika ada, tambahkan kodenya. |
| **Status** | 🔲 Open |

---

### B2 — Admin routes return 401 tanpa pesan jelas jika `SUPABASE_SERVICE_ROLE_KEY` tidak di-set
| | |
|---|---|
| **Severity** | P0 |
| **Lokasi** | `artifacts/api-server/src/middlewares/authMiddleware.ts` |
| **Dampak** | Admin tidak bisa login, tidak ada pesan error yang membantu debugging |
| **Solusi** | Set `SUPABASE_SERVICE_ROLE_KEY` di Replit Secrets. Tambahkan startup check yang throw error jelas jika key tidak ada. |
| **Status** | 🔲 Open |

---

### B3 — Redirect loop: user ada di Supabase Auth tapi tidak ada di `user_roles`
| | |
|---|---|
| **Severity** | P0 |
| **Lokasi** | `artifacts/umroh-app/src/features/admin/AdminRoute.tsx`, `AuthRoute.tsx` |
| **Dampak** | User baru atau user yang role-nya terhapus akan terjebak di redirect loop antara `/admin` dan `/dashboard` |
| **Root Cause** | Trigger `create_user_profile` mungkin belum dijalankan, atau trigger gagal |
| **Solusi** | Pastikan trigger aktif di Supabase. Tambahkan fallback: jika role = null, assign role `buyer` secara default. |
| **Status** | 🔲 Open |

---

### B4 — Trigger konflik Replit Auth vs Supabase Auth
| | |
|---|---|
| **Severity** | P0 |
| **Lokasi** | `scripts/migrations/business_logic_triggers.sql` |
| **Dampak** | Auth inconsistency di production — trigger bisa gagal atau membuat data yang salah |
| **Root Cause** | Project pernah menggunakan Replit Auth, kemudian migrasi ke Supabase Auth. Beberapa trigger masih merujuk schema Replit Auth. |
| **Solusi** | Audit setiap trigger di file tersebut. Hapus atau update referensi ke Replit Auth schema. Test ulang setelah fix. |
| **Status** | 🔲 Open |

---

### B5 — `add_new_user_profile_trigger.sql` gagal di local dev
| | |
|---|---|
| **Severity** | P0 |
| **Lokasi** | `scripts/migrations/add_new_user_profile_trigger.sql` |
| **Dampak** | Migration gagal jika dijalankan di environment lokal (butuh Supabase `auth` schema) |
| **Root Cause** | Trigger ini attach ke `auth.users` yang hanya ada di Supabase cloud |
| **Solusi** | Jalankan file ini **hanya** di Supabase SQL editor, bukan via Drizzle migrations. Dokumentasikan ini dengan jelas. |
| **Status** | 🔲 Open |

---

## P0 🔒 — Security

### B6 — `/cms/chat-messages` tidak ada auth/ownership check
| | |
|---|---|
| **Severity** | P0 🔒 SECURITY |
| **Lokasi** | `artifacts/api-server/src/routes/cms.ts` baris 212 |
| **Dampak** | **Data leak** — siapapun yang mengetahui `booking_id` bisa membaca semua pesan chat booking tersebut, termasuk pesan milik orang lain |
| **Bukti** | Kode bahkan memiliki komentar: *"If it's a public route, we should probably check if the user is authorized for this booking"* |
| **Solusi** | 1. Tambahkan middleware `requireAuth` ke route ini. 2. Tambahkan ownership check: `req.user.id` harus match dengan `booking.userId` ATAU user punya role admin. |
| **Fix Code** | ```typescript // Tambahkan di atas router.get("/chat-messages") router.get("/chat-messages", requireAuth, async (req, res) => { const { booking_id } = req.query; // Verify ownership const booking = await db.select().from(bookings).where(eq(bookings.id, booking_id)).limit(1); if (!booking.length) return res.status(404).json({ error: "Booking not found" }); if (booking[0].userId !== req.user.id && !req.user.isAdmin) { return res.status(403).json({ error: "Forbidden" }); } // ... lanjut fetch messages }); ``` |
| **Status** | 🔲 Open |

---

## P1 — High

### B7 — Payment gateway tidak terintegrasi
| | |
|---|---|
| **Severity** | P1 |
| **Lokasi** | `artifacts/api-server/src/routes/`, `artifacts/umroh-app/src/features/booking/Payment.tsx` |
| **Dampak** | Customer hanya bisa bayar manual (transfer bank + upload bukti). Tidak ada automated payment confirmation. |
| **Solusi** | Integrasi Midtrans (recommended untuk Indonesia). Lihat [ROADMAP.md Sprint 5](./ROADMAP.md). |
| **Status** | 🔲 Open |

---

### B8 — Potensi schema drift antara Drizzle ORM dan manual SQL migrations
| | |
|---|---|
| **Severity** | P1 |
| **Lokasi** | `supabase-schema.sql` vs `scripts/migrations/supabase_schema.sql` |
| **Dampak** | Schema di production database bisa berbeda dengan apa yang kode expect, menyebabkan error query |
| **Solusi** | 1. Jadikan `supabase-schema.sql` (generated dari Drizzle) sebagai **single source of truth**. 2. Hapus atau archive `scripts/migrations/supabase_schema.sql`. 3. Setiap perubahan schema dilakukan via Drizzle, lalu regenerate. |
| **Status** | 🔲 Open |

---

## P2 — Medium

### B9 — `lib/replit-auth-web` legacy package masih ada
| | |
|---|---|
| **Severity** | P2 |
| **Lokasi** | `lib/replit-auth-web/` |
| **Dampak** | Dead code yang membingungkan; developer baru mungkin mengira Replit Auth masih dipakai |
| **Solusi** | Hapus package `lib/replit-auth-web/` dan semua referensinya di `pnpm-workspace.yaml`. |
| **Status** | 🔲 Open |

---

### B10 — `AnalyticsAI.tsx` komponen tanpa backend
| | |
|---|---|
| **Severity** | P2 |
| **Lokasi** | `artifacts/umroh-app/src/features/admin/AnalyticsAI.tsx` |
| **Dampak** | Halaman admin Analytics AI ada tapi tidak fungsional |
| **Solusi** | Pilih: (A) Implementasi koneksi ke AI model (OpenAI, Gemini, dll.), atau (B) Sembunyikan menu ini sampai siap. |
| **Status** | 🔲 Open |

---

### B11 — `admin/contracts.ts` flow CRUD belum lengkap
| | |
|---|---|
| **Severity** | P2 |
| **Lokasi** | `artifacts/api-server/src/routes/admin/`, `features/admin/AdminContracts.tsx` |
| **Dampak** | Fitur kontrak tidak bisa digunakan sepenuhnya |
| **Solusi** | Implementasi create/update/delete operations di backend route. |
| **Status** | 🔲 Open |

---

## P3 — Low

### B12 — Tidak ada global React Error Boundary
| | |
|---|---|
| **Severity** | P3 |
| **Lokasi** | `artifacts/umroh-app/src/App.tsx` |
| **Dampak** | Jika ada JavaScript error yang tidak tertangani, user melihat blank white screen tanpa pesan apapun |
| **Solusi** | Tambahkan `<ErrorBoundary>` wrapper di root `App.tsx` yang menampilkan pesan error yang user-friendly. |
| **Status** | 🔲 Open |

---

### B13 — `console.error` di `faqs.ts` tanpa proper error response
| | |
|---|---|
| **Severity** | P3 |
| **Lokasi** | `artifacts/api-server/src/routes/faqs.ts` baris 40 |
| **Dampak** | Error response format tidak konsisten dengan route lain |
| **Solusi** | Ganti dengan format error standard yang dipakai di seluruh app. |
| **Status** | 🔲 Open |

---

### B14 — Stale `.tsbuildinfo` bisa menyembunyikan TypeScript errors
| | |
|---|---|
| **Severity** | P3 |
| **Lokasi** | Semua packages (monorepo) |
| **Dampak** | `pnpm run typecheck` bisa melaporkan 0 error padahal error nyata ada, karena cache stale |
| **Solusi** | Sebelum percaya pada hasil typecheck setelah perubahan besar, jalankan: `find . -name "*.tsbuildinfo" -delete && pnpm typecheck` |
| **Status** | 🔲 Open |

---

## Technical Debt

| # | Debt | Severity | Keterangan |
|---|------|----------|------------|
| TD1 | Dua jalur DB (Drizzle vs Supabase direct) tanpa abstraksi | High | Frontend langsung `supabase.from()` di beberapa tempat, bypass business logic |
| TD2 | OpenAPI spec bisa drift dari implementasi Express routes | High | `lib/api-client-react` dan `lib/api-zod` mungkin stale |
| TD3 | Tidak ada integration tests / e2e tests | High | Tidak bisa detect regresi secara otomatis |
| TD4 | Schema drift: Drizzle ORM vs manual SQL migrations | High | Sulit maintain jika ada dua sumber kebenaran |
| TD5 | `rest.ts` proxy — RLS policies di Supabase belum diverifikasi untuk semua tabel di ALLOWED_TABLES | Low | Defense-in-depth |
| TD6 | Tidak ada error boundary di frontend | Medium | UX buruk saat unhandled error |
| TD7 | `SESSION_SECRET` di Replit Secrets tidak dipakai | Low | Unnecessary secret |
| TD8 | `AnalyticsAI.tsx` tanpa backend | Low | Dead UI code |
| TD9 | Bahasa campur Indonesia/English di kode dan komentar | Low | Maintainability |
| TD10 | `lib/replit-auth-web` legacy package | Medium | Dead code, confusion |

---

## Status Tracker

| ID | Status | Assignee | Sprint |
|----|--------|----------|--------|
| B1 | 🔲 Open | — | Sprint 1 |
| B2 | 🔲 Open | — | Sprint 1 |
| B3 | 🔲 Open | — | Sprint 2 |
| B4 | 🔲 Open | — | Sprint 1 |
| B5 | 🔲 Open | — | Sprint 1 |
| B6 🔒 | 🔲 Open | — | Sprint 3 |
| B7 | 🔲 Open | — | Sprint 5 |
| B8 | 🔲 Open | — | Sprint 1 |
| B9 | 🔲 Open | — | Sprint 7 |
| B10 | 🔲 Open | — | Sprint 7 |
| B11 | 🔲 Open | — | Sprint 4 |
| B12 | 🔲 Open | — | Sprint 3 |
| B13 | 🔲 Open | — | Sprint 7 |
| B14 | 🔲 Open | — | Sprint 7 |
