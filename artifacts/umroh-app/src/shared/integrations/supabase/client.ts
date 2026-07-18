import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabaseAuth } from './auth-client';

// REST and storage requests go through the Vite proxy in development so they
// hit the local Replit database instead of the real Supabase project.
// In production, VITE_SUPABASE_URL is the real Supabase project URL.
const RAW_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_URL = import.meta.env.DEV
  ? window.location.origin   // same-origin → Vite proxies /rest/v1 to local API
  : RAW_URL;

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

// Di development (Replit), matikan Supabase Realtime agar tidak ada
// WebSocket retry loop ke supabase.co yang menyebabkan noise di console
// dan overhead jaringan. Semua data di dev sudah lewat REST proxy lokal.
if (import.meta.env.DEV) {
  supabase.realtime.disconnect();
}
