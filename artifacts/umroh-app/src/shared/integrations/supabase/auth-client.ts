import { createClient } from '@supabase/supabase-js';

// Fall back to a non-routable placeholder so createClient doesn't throw on
// missing env vars in dev/preview. All API calls will simply fail gracefully.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  const missing = [
    !SUPABASE_URL && 'VITE_SUPABASE_URL',
    !SUPABASE_KEY && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ');
  const msg =
    `[supabase] Missing env var(s): ${missing}. ` +
    `Build production tidak menerima value ini. Cek Vercel → Settings → Environment Variables ` +
    `(pastikan tidak ada duplikat / scope Preview override Production), lalu redeploy tanpa cache.`;
  console.error(msg);
  if (typeof document !== 'undefined') {
    const banner = document.createElement('div');
    banner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:99999;background:#b91c1c;color:#fff;' +
      'padding:12px 16px;font:14px/1.4 system-ui;text-align:center;';
    banner.textContent = `Konfigurasi Supabase belum lengkap: ${missing}. Cek env var di Vercel lalu redeploy.`;
    document.addEventListener('DOMContentLoaded', () => document.body.prepend(banner));
  }
}

export const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sb-auth-session',
    flowType: 'pkce',
  },
});
