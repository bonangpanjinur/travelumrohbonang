# AUTH_ARCHITECTURE.md

> Blueprint arsitektur autentikasi target — Fase 1 (Fondasi).
> Dibuat: 2026-07-08
> Status: **Dokumen desain, belum ada perubahan kode.** Lihat [Bagian 12](#12-checklist-migrasi) untuk urutan implementasi.

Dokumen ini mendefinisikan **satu-satunya flow auth yang sah** untuk Umroh App: **Supabase Auth** sebagai satu-satunya identity provider, dipakai konsisten oleh frontend dan backend. Semua jejak Replit Auth / auth lama dianggap tidak sah dan dijadwalkan untuk dihapus (lihat checklist).

---

## 1. Ringkasan Temuan Audit (as-is)

Audit menyeluruh terhadap frontend (`artifacts/umroh-app`), backend (`artifacts/api-server`, `api/index.ts`), dan database (`lib/db`, `scripts/migrations/*.sql`) menemukan:

**Sudah benar / sesuai target:**
- Backend **tidak pernah** memanggil `@supabase/supabase-js` `createClient()` — selalu raw `fetch()` ke Supabase REST/Auth endpoint. Ini konsisten dan wajib dipertahankan (SDK Supabase crash di Node 20 karena tidak ada native WebSocket).
- Auth backend sepenuhnya **stateless** — tidak ada `express-session`, `cookie-session`, `connect-pg-simple`, atau `jsonwebtoken` lokal. Semua verifikasi token didelegasikan ke Supabase (`GET /auth/v1/user`).
- Frontend punya dua Supabase client yang dipisah dengan jelas: satu untuk auth (persist session), satu untuk data REST (stateless, token disuntik manual). Ini adalah pola yang benar dan harus dipertahankan.
- `apiFetch()` konsisten menyuntik `Authorization: Bearer <token>` dari sesi Supabase pada setiap panggilan API.
- Tidak ditemukan Passport, `express-session`, atau OIDC middleware yang aktif dipakai.

**Menyimpang dari "satu flow auth" / perlu dibereskan:**
- **Dua jalur pembacaan role** (`getLocalRole` via Drizzle Postgres langsung, `getSupabaseRole` via Supabase REST) yang digabung dengan heuristik "role paling ketat menang". Ini bekerja, tapi berarti ada **dua sumber kebenaran role**, bukan satu.
- **Shadow table Replit Auth** (`lib/db/src/schema/auth.ts`: `users`, `sessions`) dan trigger terkait (`trg_handle_new_local_user` di `business_logic_triggers.sql`) — vestigial, tidak dipakai oleh flow aktif, tapi masih ada di schema & migrations dan berpotensi membingungkan/konflik.
- **Package `@workspace/replit-auth-web`** masih ter-link di `pnpm-workspace.yaml`, `tsconfig.json`, dan `package.json` frontend, walau tidak diimpor di flow auth aktif.
- **OpenAPI spec** (`lib/api-spec/openapi.yaml`) masih mendefinisikan endpoint OIDC (`/auth/login`, `/auth/callback`) yang tidak didukung logic aktif di `api-server` — menghasilkan generated client/hooks yang menyesatkan.
- **Env var legacy** (`REPL_ID`, `ISSUER_URL`) masih direferensikan di `.env.example` dan `scripts/verify-deploy-env.mjs`.
- **Schema drift**: tipe kolom `profiles.id` / `user_roles.user_id` berbeda antara `supabase-schema.sql` (Drizzle, `VARCHAR`/`TEXT`) vs `scripts/migrations/supabase_schema.sql` (manual, `UUID`). Ini krusial untuk auth karena kolom ini menyimpan `auth.users.id` Supabase (UUID native).
- **`SESSION_SECRET`** ada di Replit Secrets tapi tidak dipakai di kode manapun — unused, membingungkan.
- **Celah keamanan tidak terkait langsung dengan flow auth**, tapi ditemukan selama audit: `GET /cms/chat-messages` (`routes/cms.ts:212`) tidak menerapkan `requireAuth` atau ownership check — siapapun yang tahu `booking_id` bisa membaca chat booking orang lain. Dicatat di checklist migrasi sebagai perbaikan wajib, meski di luar scope "satu flow auth" secara ketat.
- **2FA state tersimpan di `sessionStorage`** (client-side, per-tab) — bukan bagian dari sesi Supabase, sehingga secara arsitektural terpisah dari JWT lifecycle. Perlu didokumentasikan eksplisit sebagai layer tambahan, bukan pengganti auth utama.

---

## 2. Prinsip Arsitektur Target

1. **Supabase Auth adalah satu-satunya identity provider.** Tidak ada sistem auth paralel (Replit Auth, session cookie custom, JWT yang ditandatangani sendiri).
2. **Backend tidak pernah memanggil Supabase SDK (`createClient()`).** Semua interaksi dengan Supabase Auth/REST dari backend memakai `fetch()` mentah dengan `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY`. (Constraint permanen — Node 20 tidak punya native WebSocket yang dibutuhkan realtime client Supabase-js.)
3. **Backend tidak pernah menyimpan sesi sendiri.** Setiap request diverifikasi ulang terhadap Supabase (dengan cache token pendek sebagai optimisasi, bukan sebagai sumber kebenaran).
4. **Role adalah satu sumber kebenaran**, disimpan di tabel `user_roles` (Postgres yang sama dipakai Supabase & Replit dev DB), dibaca melalui satu fungsi resolver — bukan dua jalur independen yang digabung secara heuristik.
5. **Role hierarchy didefinisikan di satu tempat** dan diimpor oleh middleware backend maupun util frontend — bukan konstanta yang di-duplicate manual di beberapa file.
6. **Semua endpoint yang mengakses data milik user tertentu WAJIB melalui middleware auth + ownership check.** Tidak ada "public route yang kebetulan aman karena butuh tahu ID".
7. **Tidak ada jejak Replit Auth** di schema, migrations, workspace packages, atau OpenAPI spec.

---

## 3. Flow Login (Target)

```
┌─────────┐        1. email+password / OAuth        ┌──────────────────────┐
│ Browser │ ───────────────────────────────────────▶ │ supabaseAuth (client)│
└─────────┘                                           │ auth-client.ts        │
                                                       └──────────┬───────────┘
                                                                  │ POST /auth/v1/token
                                                                  ▼
                                                       ┌──────────────────────┐
                                                       │  Supabase Auth Server │
                                                       └──────────┬───────────┘
                                                                  │ { access_token (JWT),
                                                                  │   refresh_token, user }
                                                                  ▼
                                                       ┌──────────────────────┐
                                                       │ AuthProvider (React)  │
                                                       │ - onAuthStateChange   │
                                                       │ - persist via         │
                                                       │   supabase-js         │
                                                       │   (localStorage,      │
                                                       │   key: sb-auth-session)│
                                                       └──────────┬───────────┘
                                                                  │ GET /api/auth/user
                                                                  │ Authorization: Bearer <jwt>
                                                                  ▼
                                                       ┌──────────────────────┐
                                                       │ Express: authMiddleware│
                                                       │ - fetch /auth/v1/user  │
                                                       │   (verifikasi JWT)     │
                                                       │ - resolveRole(userId)  │◀── SATU resolver,
                                                       │ - req.user = {...role}│    bukan dua jalur
                                                       └──────────┬───────────┘
                                                                  │ { user: {..., role} }
                                                                  ▼
                                                       ┌──────────────────────┐
                                                       │ AuthContext.setUser() │
                                                       │ isAdmin = role-based  │
                                                       └──────────┬───────────┘
                                                                  │ redirect
                                                       ┌──────────┴───────────┐
                                                       │ role ∈ {super_admin,  │
                                                       │ admin,branch_manager, │──▶ /admin (+ 2FA gate
                                                       │ staff}                │     jika enable_2fa)
                                                       │ role ∈ {agent,buyer}  │──▶ /dashboard
                                                       └───────────────────────┘
```

**Catatan implementasi kunci (dipertahankan dari as-is, karena sudah benar):**
- Dua Supabase client di frontend: `auth-client.ts` (persist session, dipakai HANYA untuk operasi auth) dan `client.ts` (stateless, token disuntik manual per-request untuk REST/RLS).
- `apiFetch()` mengambil token dari `supabaseAuth.auth.getSession()` pada setiap panggilan — tidak menyimpan token secara terpisah.
- Fallback client-side JWT-decode (`buildUserFromToken`) hanya dipakai saat backend 5xx/unreachable, TIDAK PERNAH pada 401/403 — mencegah bypass otorisasi sekaligus mencegah redirect loop saat backend down sementara.

---

## 4. Flow Logout (Target)

```
User klik "Logout"
      │
      ▼
signOut() (useAuth)
      │
      ├── supabaseAuth.auth.signOut()
      │      └── Menghapus access_token & refresh_token dari localStorage
      │      └── Trigger onAuthStateChange(SIGNED_OUT)
      │
      ├── setUser(null) — state React direset
      │
      ├── sessionStorage 2FA flag TIDAK otomatis dihapus oleh signOut()
      │   (harus dibersihkan eksplisit — lihat checklist item terkait)
      │
      └── window.location.href = "/" — full reload, memastikan semua state React di-reset
```

Backend tidak punya konsep "logout" — karena stateless, cukup token dibuang di client. Tidak perlu endpoint server-side untuk invalidasi sesi kecuali kita memutuskan untuk mendukung revocation aktif (di luar scope Fase 1).

---

## 5. Session Lifecycle

| Aspek | Perilaku Target |
|---|---|
| Penyimpanan | `localStorage`, key `sb-auth-session`, dikelola sepenuhnya oleh `@supabase/supabase-js` (`auth-client.ts`) |
| Refresh | Otomatis oleh SDK (`autoRefreshToken: true`) selama tab terbuka |
| Flow type | PKCE (`flowType: 'pkce'`) — aman untuk SPA, tidak expose client secret |
| Cross-tab sync | Ditangani oleh `onAuthStateChange` listener SDK (built-in) |
| Sisi server | **Tidak ada sesi.** Setiap request diverifikasi ulang via token; tidak ada session store (Redis/Postgres/cookie) |
| 2FA verified flag | `sessionStorage` (per-tab, hilang saat tab ditutup) — layer terpisah di atas sesi Supabase, BUKAN pengganti session lifecycle. Harus direset saat `signOut()`. |
| Token cache backend | In-memory `Map` di `authMiddleware.ts`, TTL 60 detik — murni optimisasi jaringan, bukan sumber kebenaran sesi. Boleh dibersihkan/expire kapan saja tanpa mempengaruhi correctness. |

---

## 6. JWT Lifecycle

```
1. Issued by:      Supabase Auth server (HS256/ES256 tergantung project setting), saat login/refresh
2. Claims dipakai: sub (user id / UUID), email, app_metadata, user_metadata, exp
3. Disimpan di:    localStorage (client), TIDAK PERNAH di cookie/server-side store
4. Dikirim via:    Header "Authorization: Bearer <token>" pada setiap request ke api-server
5. Diverifikasi:   Backend memanggil GET {SUPABASE_URL}/auth/v1/user dengan token tsb
                   (BUKAN verifikasi signature lokal — tidak ada jwt.verify() dengan secret manapun)
6. Expiry:         Ditangani oleh SDK client (auto-refresh); backend hanya lihat hasil validasi Supabase saat itu
7. Revocation:     Bergantung pada Supabase (mis. logout-semua-device via Supabase Admin API) — tidak ada
                   revocation list lokal
```

**Kenapa verifikasi via network call, bukan verifikasi signature lokal?** Ini pilihan desain yang valid untuk menghindari perlu menyimpan/rotate signing key di backend, dan sudah dioptimalkan dengan cache 60 detik. Ini dipertahankan sebagai bagian dari arsitektur target, bukan technical debt.

---

## 7. Role & Permission Model (Target — Konsolidasi)

### 7.1 Role hierarchy (satu definisi, dipakai semua layer)

```
super_admin (0) > admin (1) > branch_manager (2) > staff (3) > agent (4) > buyer (5) > user (6)
```

Angka = rank (lebih kecil = lebih tinggi privilege). Definisi ini HARUS hidup di **satu tempat** (mis. `lib/db` atau paket shared baru `lib/auth-shared`) dan diimpor oleh:
- Backend: `middlewares/authMiddleware.ts` (`ROLE_RANK`), `middlewares/requireAdmin.ts` (role sets)
- Frontend: `useAuth.tsx` (`AppRole`, `VALID_ROLES`), `adminMenuConfig.ts`, komponen apapun yang melakukan role check manual

Saat ini definisi ini **ter-duplikasi** di ≥3 file berbeda dengan representasi berbeda (Set vs Record vs union type) — target: satu sumber kebenaran yang di-generate/di-share, bukan disalin manual.

### 7.2 Role resolution (satu resolver, bukan dua jalur digabung)

**As-is:** `getUserRole()` menjalankan `getLocalRole()` (Drizzle/Postgres langsung) DAN `getSupabaseRole()` (Supabase REST) secara paralel, lalu memilih role yang **lebih restriktif** di antara keduanya.

**Kenapa ini ada:** mendukung dua environment (`DATABASE_URL` tersedia = Replit/dev; tidak tersedia = Vercel serverless yang harus lewat Supabase REST), sambil memastikan demosi role di Supabase langsung berlaku meski cache lokal stale.

**Keputusan arsitektur untuk Fase 1:** pola ini **dipertahankan secara prinsip** (single resolver function `getUserRole()`, bukan pemanggilan `getLocalRole`/`getSupabaseRole` langsung di tempat lain) — TAPI didokumentasikan eksplisit sebagai "satu resolver dengan dua backing store yang saling redundant", bukan "dua flow auth". Aturan wajib: **tidak ada kode lain yang boleh memanggil `getLocalRole`/`getSupabaseRole` langsung** — semua konsumen role harus lewat `getUserRole()`.

### 7.3 Permission gates (backend)

| Middleware | Roles diizinkan | Dipakai untuk |
|---|---|---|
| `requireAuth` | Semua role terautentikasi | Endpoint user biasa (booking, profile, wishlist) |
| `requireOperational` | super_admin, admin, branch_manager, staff, agent | Endpoint operasional (packages read, booking milik sendiri) |
| `requireStaff` | super_admin, admin, branch_manager, staff | Endpoint staff (manajemen jemaah, dokumen) |
| `requireAdmin` | super_admin, admin | Gate default admin router |
| `requireSuperAdmin` | super_admin saja | Role management, integrasi pihak ketiga |

### 7.4 Permission gates (frontend)

| Guard | Logika |
|---|---|
| `AuthRoute` | Redirect ke `/auth` jika `user === null` |
| `AdminRoute` | Redirect `/auth` jika belum login; redirect `/dashboard` jika `!isAdmin`; gate tambahan 2FA jika `enable_2fa && require_2fa` |
| `isAdmin` | Turunan dari role: `role !== "user" && role !== "buyer"` — **catatan:** ini берarti `agent` dianggap admin di frontend (`isAdmin`) walau di backend `agent` hanya dapat `requireOperational`, bukan `requireAdmin`. **Ini adalah inkonsistensi yang harus diselaraskan** (lihat checklist). |

---

## 8. Middleware Audit (Backend)

| File | Fungsi | Catatan |
|---|---|---|
| `middlewares/authMiddleware.ts` | Extract Bearer token → verifikasi ke Supabase → resolve role → set `req.user` | Global, dipasang di `app.ts`. Mengecualikan literal `"local-dev-key"` sebagai token (harus diverifikasi ini bukan backdoor aktif — lihat checklist). |
| `middlewares/auth.ts` (`requireAuth`) | Cek `req.isAuthenticated()` | Sederhana, hanya gate boolean; tidak cek role |
| `middlewares/requireAdmin.ts` | 4 gate berbasis role Set | Duplikasi definisi role hierarchy relatif terhadap `ROLE_RANK` di `authMiddleware.ts` |
| `lib/adminAllowlist.ts` (`isAdminEmail`) | Override role jadi `super_admin` berdasarkan `ADMIN_EMAILS` env | Jalur bypass role-DB yang sah untuk bootstrap admin pertama — harus didokumentasikan sebagai fitur resmi, bukan backdoor tersembunyi |
| `lib/supabaseEnv.ts` | Resolve `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` dengan fallback ke `VITE_*` | `SUPABASE_SERVICE_ROLE_KEY` sengaja TIDAK punya fallback `VITE_*` (benar — jangan pernah expose service role ke frontend build) |

---

## 9. Frontend Auth Layer

| File | Peran |
|---|---|
| `shared/integrations/supabase/auth-client.ts` | Satu-satunya client yang boleh memanggil `supabase.auth.*` (sign in/out, session) |
| `shared/integrations/supabase/client.ts` | Client data-only (REST/Storage), token disuntik dari `auth-client` per-request, TIDAK persist session sendiri |
| `shared/hooks/useAuth.tsx` | `AuthProvider`/`useAuth` — satu-satunya context yang menyimpan `user`/`role`/`isAdmin` |
| `shared/lib/apiClient.ts` (`apiFetch`) | Satu-satunya wrapper fetch ke backend yang WAJIB dipakai semua panggilan API |
| `shared/components/common/AuthRoute.tsx` | Guard untuk halaman yang butuh login (non-admin) |
| `features/admin/AdminRoute.tsx` | Guard admin + 2FA |
| `features/admin/hooks/useAuthSettings.ts` | Baca konfigurasi `enable_2fa`/`require_2fa` |

**Temuan:** beberapa komponen fitur memanggil `supabase.from()` langsung (mis. `Booking.tsx`, `AgentPortal.tsx`, `AdminDashboard.tsx`) alih-alih lewat backend API. Ini bukan pelanggaran auth (RLS tetap berlaku, token tetap disuntik oleh `client.ts`), tapi berarti **dua jalur akses data** (Drizzle-via-Express vs Supabase-direct) — dicatat sebagai technical debt terpisah di `PROJECT_ANALYSIS.md` (TD1), di luar scope sempit "satu flow auth" tapi relevan untuk konsistensi otorisasi data (RLS vs middleware role check bisa saja tidak sinkron).

---

## 10. API Authentication Contract

```
Setiap request ke api-server:
  Header wajib (kecuali endpoint publik eksplisit):
    Authorization: Bearer <supabase_access_token>

  Endpoint publik (tanpa Authorization):
    GET  /health, /healthz
    GET  /packages, /packages/:slug, /packages/filter-options, /packages/reviews/:id
    GET  /faqs
    GET  /cms/* (blog, gallery, pages, site-settings, navigation)
    GET  /currencies, /tenant-site
    POST /logs/request|error|audit

  Endpoint wajib auth (requireAuth minimum):
    /bookings/*, /profile/:id, /notifications/*, /wishlists/*, /pilgrim-documents/*

  Endpoint wajib role (requireOperational / requireStaff / requireAdmin / requireSuperAdmin):
    /admin/* (lihat Bagian 7.3)
```

**Kontrak yang harus dijaga:** middleware auth selalu berjalan lebih dulu (populate `req.user` jika token valid), lalu setiap router memutuskan sendiri level gate yang dibutuhkan. Tidak boleh ada router baru yang lupa memasang gate — checklist mewajibkan audit ulang setiap penambahan route.

---

## 11. Diagram Lengkap (Arsitektur Target)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (SPA)                                  │
│                                                                              │
│  ┌─────────────────┐        ┌──────────────────┐       ┌────────────────┐  │
│  │ auth-client.ts   │──────▶│ AuthProvider       │──────▶│ AuthRoute /    │  │
│  │ (persist session)│        │ (useAuth context) │       │ AdminRoute     │  │
│  └────────┬─────────┘        └─────────┬────────┘       └───────┬────────┘  │
│           │ token                       │ user/role              │ redirect │
│           ▼                             ▼                        ▼          │
│  ┌─────────────────┐        ┌──────────────────┐                            │
│  │ client.ts        │        │ apiFetch()        │                          │
│  │ (data, RLS-bound)│        │ (Bearer injected) │                          │
│  └────────┬─────────┘        └─────────┬────────┘                          │
└───────────┼─────────────────────────────┼──────────────────────────────────┘
            │ PostgREST (RLS enforced)     │ REST (Express)
            ▼                              ▼
  ┌───────────────────┐        ┌────────────────────────────────────────┐
  │ Supabase PostgREST │        │              api-server (Express 5)     │
  │ (auth.uid() based  │        │  authMiddleware → req.user              │
  │  RLS policies)     │        │        │                                │
  └─────────┬──────────┘        │        ├── getUserRole() [SINGLE        │
            │                   │        │     RESOLVER]                  │
            ▼                   │        │     ├── getLocalRole (Drizzle) │
  ┌───────────────────┐        │        │     └── getSupabaseRole (REST) │
  │  PostgreSQL         │◀──────┤        │                                │
  │  (Replit-managed,   │       │        ▼                                │
  │  same DB Supabase    │       │  requireAuth / requireOperational /    │
  │  points to in prod) │       │  requireStaff / requireAdmin /          │
  └───────────────────┘        │  requireSuperAdmin                      │
                                └──────────────────┬───────────────────────┘
                                                    │ fetch (raw, no SDK)
                                                    ▼
                                         ┌────────────────────────┐
                                         │ Supabase Auth Server     │
                                         │ GET /auth/v1/user        │
                                         │ (verifikasi JWT)         │
                                         └────────────────────────┘
```

---

## 12. Checklist Migrasi

> Urutan disusun dari yang paling murah/aman ke yang paling berdampak. **Tidak ada item yang dieksekusi di Fase 1 ini** — ini adalah rencana untuk fase implementasi berikutnya.

### 12.1 Pembersihan jejak Replit Auth / auth lama (low risk, no behavior change)
- [ ] Hapus package `lib/replit-auth-web/` beserta referensinya di `pnpm-workspace.yaml`, `tsconfig.json` (root & `artifacts/umroh-app`), dan `package.json` frontend.
- [ ] Hapus/arsipkan `lib/db/src/schema/auth.ts` (`users`, `sessions` — remnant Replit Auth) setelah konfirmasi tidak ada FK/kode aktif yang bergantung padanya.
- [ ] Hapus trigger `trg_handle_new_local_user` & `fn_handle_new_local_user` dari `scripts/migrations/business_logic_triggers.sql` (atau isolasi eksplisit di belakang flag "dev-only, non-Supabase" dengan komentar tegas).
- [ ] Hapus endpoint OIDC (`/auth/login`, `/auth/callback`, dst.) dari `lib/api-spec/openapi.yaml`, lalu regenerate `lib/api-zod` & `lib/api-client-react` via Orval agar generated code tidak lagi menyertakan flow auth palsu.
- [ ] Hapus `REPL_ID`, `ISSUER_URL` dari `.env.example` dan `scripts/verify-deploy-env.mjs`.
- [ ] Putuskan nasib `SESSION_SECRET`: hapus dari Replit Secrets jika benar-benar tidak dipakai, atau dokumentasikan alasan mempertahankannya jika ada rencana pemakaian.
- [ ] Update komentar keliru di `useSessionTimeout.ts` yang menyebut Replit Auth.

### 12.2 Konsolidasi role & permission (medium risk — sentuh logic aktif)
- [ ] Ekstrak `ROLE_RANK`/role hierarchy ke satu modul shared (mis. paket `lib/auth-shared` baru atau di `lib/db`) yang diimpor oleh `authMiddleware.ts`, `requireAdmin.ts`, dan `useAuth.tsx` — hilangkan duplikasi definisi role di ≥3 file.
- [ ] Audit ulang setiap pemanggil `getLocalRole`/`getSupabaseRole` — pastikan HANYA `getUserRole()` yang boleh memanggilnya langsung; semua konsumen lain wajib lewat resolver.
- [ ] Selaraskan `isAdmin` frontend (saat ini true untuk `agent`) dengan definisi backend `requireAdmin` (tidak termasuk `agent`) — putuskan satu definisi yang benar dan terapkan di kedua sisi.
- [ ] Selesaikan schema drift `profiles.id` / `user_roles.user_id` (`VARCHAR`/`TEXT` di Drizzle vs `UUID` di migration manual) — pilih `UUID` sebagai tipe kanonik (sesuai `auth.users.id` Supabase) dan sinkronkan Drizzle schema + regenerate `supabase-schema.sql`.
- [ ] Dokumentasikan `ADMIN_EMAILS`/`isAdminEmail` sebagai mekanisme bootstrap resmi (bukan backdoor) dengan panduan operasional kapan dipakai.

### 12.3 Keamanan & kelengkapan gate (high priority, independent dari refactor auth)
- [ ] Tambahkan `requireAuth` + ownership check (`booking.userId === req.user.id` atau role staff+) ke `GET /cms/chat-messages` (`routes/cms.ts:212`).
- [ ] Audit ulang seluruh route di `routes/index.ts` dan `routes/admin/index.ts` satu per satu untuk memastikan setiap route punya gate yang sesuai levelnya (tidak ada yang public "karena lupa", bukan "karena sengaja").
- [ ] Verifikasi literal `"local-dev-key"` di `getTokenFromRequest()` tidak pernah aktif di production (audit semua tempat yang mengirim token ini, pastikan hanya dipakai di script/test lokal, dan pertimbangkan menghapusnya sepenuhnya jika tidak esensial).
- [ ] Pastikan 2FA `sessionStorage` flag dibersihkan saat `signOut()` (saat ini tidak dihapus eksplisit).

### 12.4 Verifikasi end-to-end (setelah semua di atas)
- [ ] Login sebagai masing-masing role (super_admin, admin, branch_manager, staff, agent, buyer) dan verifikasi redirect + akses menu sesuai matriks di Bagian 7.
- [ ] Test demosi role di Supabase (ubah role langsung di `user_roles` via Supabase) dan pastikan efeknya langsung terlihat pada request berikutnya (validasi `moreRestrictiveRole` masih benar setelah konsolidasi).
- [ ] Test 2FA enforcement end-to-end (enable_2fa on/off, require_2fa on/off, backup code, logout membersihkan flag verifikasi).
- [ ] Jalankan `pnpm run typecheck` dengan `.tsbuildinfo` dihapus dulu (lihat memory: stale build cache bisa menyembunyikan error) setelah setiap perubahan schema/tipe role.
- [ ] Update `PROJECT_ANALYSIS.md` dan `docs/BUG_TRACKER.md`/`docs/ROADMAP.md` untuk mencoret item yang sudah selesai dari checklist ini.

---

## 13. Non-Goals (Eksplisit di Luar Scope Fase 1)

- Tidak menambah fitur baru (payment gateway, refunds, contracts — tetap seperti tercatat di `PROJECT_ANALYSIS.md`).
- Tidak migrasi ke session-based auth atau menambah JWT signing lokal — Supabase tetap satu-satunya issuer token.
- Tidak menyatukan "dua jalur akses DB" (Drizzle vs Supabase-direct dari frontend) — itu technical debt terpisah (TD1), didokumentasikan tapi tidak masuk checklist auth ini kecuali berdampak langsung pada RLS/role enforcement.
