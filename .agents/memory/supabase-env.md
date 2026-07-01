---
name: Supabase missing env vars
description: App berjalan tapi VITE_SUPABASE_URL belum dikonfigurasi — error ini pre-existing bukan regresi
---

## Status
`VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` belum di-set di Replit Secrets.  
Browser console menampilkan: `Missing Supabase environment variables.` + `supabaseUrl is required.`

**Why it's pre-existing:** Error ini ada sejak awal port dari Vercel. Vercel punya env vars via Vercel dashboard, Replit belum dikonfigurasi.

## Cara fix
User perlu set di Replit Secrets tab:
- `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = anon/public key dari Supabase dashboard

## Impact saat ini
- Frontend HTTP 200 (app serve statis normal)
- Fitur yang butuh Supabase (login, paket, booking, dll) tidak akan berfungsi hingga secrets dikonfigurasi
- Ini bukan regresi dari refactor — tidak perlu fix di kode
