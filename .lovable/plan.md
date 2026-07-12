
# Rencana Perbaikan — Error Deployment Vercel

## Diagnosis per error

| Error | Root cause | Layer |
|---|---|---|
| `VITE_TURNSTILE_SITE_KEY not defined` | Opsional, cuma warning | Frontend (harmless) |
| `VITE_SENTRY_DSN not defined` + `Sentry disabled` | Opsional, cuma warning | Frontend (harmless) |
| `HEAD .../rest/v1/ 401 Unauthorized` | `VITE_SUPABASE_ANON_KEY` yang ter-bundle di JS **bukan** key project `yakjpqq...`. Meski di Vercel dashboard sudah benar, kemungkinan besar **duplikat/scope Preview override Production** → build production pakai value lama | Config Vercel |
| `GET /api/admin/bookings 500` | Serverless function crash. Env `DATABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` di **runtime function** tidak sama dengan yang di Build → connect ke DB gagal → timeout → 500 tanpa body | Config Vercel + kode (tidak ada guard) |
| `GET /api/admin/menu-permissions/my 500` | Sama seperti di atas. Handler sudah punya try/catch tapi kalau `db` throw saat **module init** (bukan saat query), catch tidak jalan → 500 blank | Kode API |

**Fakta kunci:** kamu sudah konfirmasi ada **duplikat / scope beda** di Vercel. Itu penyebab utama — value yang ter-bundle ke `index-D1i5tpC2.js` bukan value Production terbaru.

---

## Aksi di sisi kamu (Vercel dashboard) — WAJIB dulu

1. **Settings → Environment Variables**, filter per key ini dan hapus duplikat / samakan value di semua scope (Production, Preview, Development):
   - `VITE_SUPABASE_URL` = `https://yakjpqqobknrmhfmybhe.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = anon key project yakjpqq...
   - `VITE_SUPABASE_PROJECT_ID` = `yakjpqqobknrmhfmybhe`
   - `SUPABASE_URL` = sama dengan VITE_SUPABASE_URL (atau hapus, biar fallback)
   - `SUPABASE_SERVICE_ROLE_KEY` = service role key project yakjpqq...
   - `DATABASE_URL` = Postgres URI **port 6543 (Transaction pooler)**
2. **Redeploy tanpa cache** (Deployments → ⋯ → Redeploy → uncheck "Use existing Build Cache").
3. Buka `https://travelumrohbonang.vercel.app/api/health` sesudahnya untuk verifikasi.

---

## Aksi di codebase (yang saya kerjakan)

Tujuannya: kalau error yang sama muncul lagi, kita dapat pesan konkret, bukan 500 blank atau 401 misterius.

### 1. Frontend guard — `artifacts/umroh-app/src/shared/integrations/supabase/client.ts` & `auth-client.ts`
- Kalau `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` kosong/undefined → lempar error jelas + log `console.error` dengan pesan: "Supabase env vars missing di build production. Cek Vercel Environment Variables."
- Tampilkan banner error di UI (via toast atau alert element di root) supaya tidak silent-fail.

### 2. API guard — `artifacts/api-server/src/lib/supabaseEnv.ts` + middleware baru
- Buat `assertServerEnv()` yang cek `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY`, `DATABASE_URL` saat boot.
- Kalau kurang → return JSON `{ error: "server_env_missing", missing: [...] }` di response, bukan crash 500 blank.

### 3. Diagnostic endpoint — `api/health` (baru)
- Response JSON:
  ```json
  {
    "ok": true|false,
    "env": { "VITE_SUPABASE_URL": "set", "SUPABASE_SERVICE_ROLE_KEY": "missing", ... },
    "db": { "connected": true|false, "error": "..." },
    "supabase": { "reachable": true|false, "status": 200 }
  }
  ```
- Mask semua nilai (hanya `set`/`missing`/last 4 char) — aman untuk publik.

### 4. Fix handler menu-permissions
- Pindah init `db` ke dalam handler (lazy) supaya error konektivitas ke-catch, bukan crash module load.
- Return `503 { error: "db_unavailable", detail: "..." }` bukan `500` blank.

### 5. Fix bookings handler serupa
- Wrap query dengan try/catch → return `503` + `error.message` (dev) atau generic (prod).

---

## Yang TIDAK saya sentuh

- Skema DB Supabase (bukan penyebab 401/500)
- Konfigurasi Turnstile & Sentry (opsional, biarkan warning)
- Logic bisnis / routing

---

## Setelah semua terpasang

1. Kamu redeploy Vercel tanpa cache.
2. Buka `/api/health` → semua field harus `set` / `connected: true`.
3. Kalau ada yang `missing`, kita tahu persis variable mana yang bermasalah di Vercel.
