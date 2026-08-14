import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabaseAuth } from './auth-client';

// REST and storage requests go through the Vite proxy in development so they
// hit the local Replit database instead of the real Supabase project.
// In production, VITE_SUPABASE_URL is the real Supabase project URL.
const RAW_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
// Realtime membutuhkan URL Supabase asli agar koneksi WebSocket menuju
// endpoint realtime/v1, bukan ke origin aplikasi yang hanya mem-proxy REST.
const SUPABASE_URL = RAW_URL;

// Placeholder prevents createClient from throwing when env vars are absent.
// All /rest/v1 requests will simply return errors rather than crashing at init.
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!import.meta.env.DEV && (!RAW_URL || !SUPABASE_KEY)) {
  const missing = [
    !RAW_URL && 'VITE_SUPABASE_URL',
    !SUPABASE_KEY && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ');
  console.error(
    `[supabase] Production build tanpa env var: ${missing}. ` +
    `Semua request /rest/v1 akan 401. Cek Vercel Environment Variables ` +
    `(hindari duplikat / scope Preview yang override Production) lalu redeploy tanpa cache.`,
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    // Attach the user's session token so RLS policies can identify the caller.
    fetch: async (url, options = {}) => {
      const { data: { session } } = await supabaseAuth.auth.getSession();
      const headers = new Headers((options as RequestInit)?.headers);
      headers.set('apikey', SUPABASE_KEY);
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
      }
      return fetch(url as string, { ...(options as RequestInit), headers });
    },
  },
});

// Realtime sengaja aktif di semua environment. Hook chat memiliki fallback
// polling adaptif apabila koneksi WebSocket gagal atau sedang reconnect.
