# AUTH_FLOW.md
> Flow autentikasi lengkap — login, JWT, middleware, role, permission.
> Terakhir diperbarui: 2026-07-08

---

## Overview

Sistem autentikasi menggunakan **Supabase Auth** sebagai identity provider, dengan **JWT** yang diverifikasi di setiap request ke API backend.

---

## Flow Login

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Frontend)                        │
│                                                                  │
│  User input email + password                                     │
│          │                                                       │
│          ▼                                                       │
│  supabaseAuth.signInWithPassword({ email, password })           │
│          │                                                       │
└──────────┼───────────────────────────────────────────────────────┘
           │ HTTPS
           ▼
┌──────────────────────────────┐
│      SUPABASE AUTH SERVER    │
│   /auth/v1/token             │
│                              │
│  Verifikasi kredensial       │
│  Generate JWT + refresh token│
└──────────┬───────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Frontend)                        │
│                                                                  │
│  Response: { access_token, refresh_token, user }                │
│          │                                                       │
│          ▼                                                       │
│  AuthContext.setSession()                                        │
│  ├── Simpan di localStorage (Supabase default behavior)         │
│  └── Trigger onAuthStateChange → update React state             │
│          │                                                       │
│          ▼                                                       │
│  Cek role dari useAuth() hook                                   │
│  ├── super_admin / admin / staff → redirect ke /admin           │
│  └── buyer / agent               → redirect ke /dashboard       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flow API Call (Setelah Login)

```
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND — apiFetch()                          │
│                                                                  │
│  1. Ambil token: supabase.auth.getSession()                     │
│  2. Tambahkan header:                                           │
│     Authorization: Bearer <access_token>                        │
│  3. Kirim request ke API server                                 │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│               EXPRESS MIDDLEWARE: authMiddleware.ts              │
│                                                                  │
│  1. Extract Bearer token dari header Authorization              │
│  2. Fetch ke Supabase /auth/v1/user                             │
│     (dengan AbortSignal.timeout(8000ms))                        │
│  3. Jika valid → set req.user = { id, email }                   │
│  4. Jika invalid/expired → return 401                           │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│               MIDDLEWARE: requireAdmin.ts (untuk /admin/*)       │
│                                                                  │
│  1. Query tabel user_roles WHERE userId = req.user.id           │
│  2. Cek role hierarchy:                                         │
│     super_admin > admin > branch_manager > staff                │
│  3. Cek permission berdasarkan route yang diakses               │
│  4. Jika tidak cukup → return 403                               │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
       Route Handler → Response
```

---

## Flow Token Refresh

```
Token expired
      │
      ▼
supabase.auth.onAuthStateChange listener terpanggil
      │
      ▼
Supabase JS SDK otomatis refresh token
  ├── Berhasil → update session, lanjut normal
  └── Gagal (refresh token expired/revoked) → signOut() → redirect ke /auth
```

---

## Role Hierarchy

```
super_admin
    │
    ▼
  admin
    │
    ▼
branch_manager
    │
    ▼
  staff
    │
    ▼
  agent
    │
    ▼
  buyer
```

### Akses per Role

| Menu/Area | super_admin | admin | branch_manager | staff | agent | buyer |
|-----------|:-----------:|:-----:|:--------------:|:-----:|:-----:|:-----:|
| Role Management | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Integrasi & API | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Payments & Finance | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Packages & Bookings | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Departures & Pilgrims | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Customer Dashboard | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## Route Guards (Frontend)

### AdminRoute.tsx
```
/admin/* → AdminRoute
  ├── Cek: isLoading (tampilkan spinner)
  ├── Cek: !user → redirect ke /auth
  ├── Cek: !isAdmin → redirect ke /dashboard
  ├── Cek: 2FA required && !2FAVerified → redirect ke /account/2fa
  └── Render <Outlet> (konten admin)
```

### AuthRoute.tsx
```
/dashboard/*, /booking/* → AuthRoute
  ├── Cek: isLoading (tampilkan spinner)
  ├── Cek: !user → redirect ke /auth
  └── Render <Outlet> (konten customer)
```

---

## Diagram Lengkap Auth + Dashboard

```
Browser
  │
  ├── /auth → signInWithPassword()
  │       │
  │       ▼
  │   Supabase Auth → JWT
  │       │
  │       ▼
  │   setSession() → localStorage
  │       │
  │       ├── role = admin → /admin ──→ AdminRoute ──→ Admin Dashboard
  │       └── role = buyer → /dashboard → AuthRoute → Customer Dashboard
  │
  └── Setiap API call → apiFetch()
          │
          ▼
        Bearer JWT
          │
          ▼
        authMiddleware.ts (verifikasi ke Supabase /auth/v1/user)
          │
          ├── /admin/* → requireAdmin.ts (cek user_roles)
          └── lainnya → route handler langsung
```

---

## Potensi Error & Solusi

| # | Skenario | Error Yang Terjadi | Solusi |
|---|----------|-------------------|--------|
| E1 | `VITE_SUPABASE_URL` tidak di-set | `signIn()` timeout / network error | Set env var |
| E2 | `VITE_SUPABASE_ANON_KEY` tidak di-set | Supabase client gagal inisialisasi | Set env var |
| E3 | `SUPABASE_SERVICE_ROLE_KEY` tidak di-set | Semua `/admin/*` routes → 401 | Set env var di backend |
| E4 | Token expired, auto-refresh gagal | Logout paksa dari frontend | Pastikan refresh token valid; cek Supabase Auth settings |
| E5 | User ada di Supabase Auth tapi tidak ada di `user_roles` | Role = null → redirect loop `/admin` ↔ `/dashboard` | Pastikan trigger `create_user_profile` aktif; tambah fallback role assignment |
| E6 | 2FA enabled di settings tapi user belum setup | Redirect ke `/account/2fa`, tidak bisa masuk dashboard | Nonaktifkan 2FA di site_settings, atau selesaikan setup 2FA |
| E7 | CORS salah konfigurasi (Vercel) | Preflight request → 403 | Periksa CORS origins di `api-server/src/index.ts` |
| E8 | Trigger `business_logic_triggers.sql` masih ada referensi Replit Auth | Auth inconsistency, user tidak terbuat di profiles | Audit dan bersihkan trigger, jalankan ulang di Supabase |

---

## Implementasi Teknis

### apiFetch (Frontend)
File: `artifacts/umroh-app/src/shared/lib/apiClient.ts`
- Auto-attach Supabase Bearer token di setiap request
- Handle 401 → trigger logout
- Base URL dari `VITE_API_URL` (fallback: relative URL)

### authMiddleware (Backend)
File: `artifacts/api-server/src/middlewares/authMiddleware.ts`
- Extract Bearer token
- Fetch ke Supabase `/auth/v1/user` dengan `AbortSignal.timeout(8000)`
- Set `req.user` untuk dipakai route handler
- **Tidak** menggunakan `createClient()` — kompatibel dengan Node.js 20

### requireAdmin (Backend)
File: `artifacts/api-server/src/middlewares/requireAdmin.ts`
- Query `user_roles` table via Drizzle
- Cek apakah role termasuk dalam role yang diizinkan untuk route tersebut

### Role Resolution (Frontend)
File: `artifacts/umroh-app/src/shared/hooks/useAuth.ts`
- Gunakan `getUserRole()` — bukan `getLocalRole()` atau `getSupabaseRole()` langsung
- Local-first dengan Supabase sebagai tiebreaker (demotion wins)
