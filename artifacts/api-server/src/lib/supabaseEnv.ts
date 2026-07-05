/**
 * Konfigurasi Supabase untuk server (Express).
 *
 * Supaya tidak perlu mengisi environment variable dua kali di Vercel,
 * server ini menerima nilai dari `SUPABASE_URL`/`SUPABASE_ANON_KEY` ATAU
 * fallback ke `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (variabel yang
 * sama yang sudah wajib diisi untuk frontend). Isi salah satu saja.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` TIDAK punya varian VITE_ — ini rahasia
 * server-only dan tidak boleh pernah diberi prefix VITE_ (akan ikut
 * ter-bundle ke frontend publik jika demikian).
 */

export const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/** Key server prefers for privileged operations, falls back to anon key. */
export const SUPABASE_SERVER_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
