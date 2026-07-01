# Umroh App

Aplikasi manajemen umroh lengkap — paket, booking, jemaah, pembayaran, dan CMS, dibangun di atas Supabase dan PostgreSQL.

## Run & Operate

- `pnpm --filter @workspace/umroh-app run dev` — frontend React/Vite (port 3000)
- `PORT=8080 pnpm --filter @workspace/api-server run dev` — API server Express (port 8080)
- `pnpm run typecheck` — typecheck seluruh monorepo
- `pnpm run build` — build semua package
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks & Zod schemas dari OpenAPI spec
- `pnpm --filter @workspace/db run push` — push schema DB ke Supabase (dev only)

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- API: Express 5 (di-deploy ke Vercel Functions)
- DB: PostgreSQL (Supabase) + Drizzle ORM
- Auth: Supabase Auth (JWT, diverifikasi di API server)
- Validasi: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (dari OpenAPI spec)
- Build API: esbuild (CJS bundle)

## Where Things Live

```
artifacts/umroh-app/     — React frontend (Vite)
artifacts/api-server/    — Express API server
api/index.ts             — Vercel Function wrapper untuk API server
lib/db/                  — Drizzle schema & koneksi PostgreSQL
lib/api-spec/            — OpenAPI spec (sumber kebenaran API)
lib/api-zod/             — Zod schemas (di-generate dari spec)
lib/api-client-react/    — React Query hooks (di-generate dari spec)
vercel.json              — Konfigurasi deployment Vercel
.env.example             — Template environment variables
```

## Environment Variables

Lihat `.env.example` untuk daftar lengkap. Variabel yang wajib diisi:

| Variabel | Keterangan | Di mana mengisi |
|---|---|---|
| `SUPABASE_URL` | URL project Supabase | Vercel + Replit Secret |
| `SUPABASE_ANON_KEY` | Anon/public key Supabase | Vercel + Replit Secret |
| `DATABASE_URL` | Connection string PostgreSQL Supabase | Vercel + Replit Secret |
| `VITE_SUPABASE_URL` | URL Supabase untuk frontend | Vercel + Replit Secret |
| `VITE_SUPABASE_ANON_KEY` | Anon key untuk frontend | Vercel + Replit Secret |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sama dengan anon key | Vercel + Replit Secret |
| `VITE_SUPABASE_PROJECT_ID` | Subdomain project Supabase | Vercel + Replit Secret |
| `PORT` | Port API server (dev only, default 8080) | Replit env var |

**Cara mendapatkan dari Supabase Dashboard:**
- URL & anon key: _Project Settings → API_
- Database URL: _Project Settings → Database → Connection string (URI)_
- Project ID: subdomain dari URL (mis. `abcdef` dari `abcdef.supabase.co`)

## Deployment ke Vercel

1. Push repository ke GitHub
2. Import project di [vercel.com](https://vercel.com/new)
3. Di **Environment Variables**, tambahkan semua variabel dari tabel di atas (tanpa `PORT`)
4. Klik Deploy

Frontend dan API otomatis di-deploy bersama di satu domain:
- Frontend: `https://your-app.vercel.app/`
- API: `https://your-app.vercel.app/api/*`

`VITE_API_URL` **tidak perlu diisi** di Vercel karena frontend dan API satu domain (same-origin).

## Architecture Decisions

- **Vercel monorepo**: Frontend (static) + API (serverless function) dalam satu repository dan satu domain — menghindari CORS dan menyederhanakan deployment.
- **Supabase sebagai sumber auth**: API server memverifikasi JWT Supabase di setiap request (`requireAuth` middleware), bukan menyimpan session sendiri.
- **Semua fitur premium dibuka**: Flag `premium: true` dihapus dari `adminMenuConfig.ts`; tidak ada route guard berbasis langganan.
- **Drizzle over raw SQL**: Schema sebagai TypeScript, type-safe queries, mudah di-push ke Supabase Postgres.

## User Preferences

_Isi sesuai preferensi pengguna._

## Gotchas

- `VITE_*` vars hanya tersedia di frontend (Vite); server-side tidak bisa membacanya.
- `DATABASE_URL` adalah runtime-managed di Replit; jangan set manual di Replit env.
- Jalankan `pnpm --filter @workspace/db run push` setelah perubahan schema untuk sync ke Supabase.
- Vite dev server mem-proxy `/api/*` ke port 8080 — pastikan API server berjalan lebih dulu.

## Pointers

- Lihat `.env.example` untuk template lengkap environment variables
- Lihat `pnpm-workspace.yaml` untuk struktur workspace
