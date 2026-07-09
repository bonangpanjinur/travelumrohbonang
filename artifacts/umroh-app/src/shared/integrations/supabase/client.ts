import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabaseAuth } from './auth-client';

// REST and storage requests go through the Vite proxy in development so they
// hit the local Replit database instead of the real Supabase project.
// In production, VITE_SUPABASE_URL is the real Supabase project URL.
const SUPABASE_URL = import.meta.env.DEV
  ? window.location.origin   // same-origin → Vite proxies /rest/v1 to local API
  : (import.meta.env.VITE_SUPABASE_URL ?? '');

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

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
