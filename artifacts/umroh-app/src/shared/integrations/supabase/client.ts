import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabaseAuth } from './auth-client';

// REST and storage requests are proxied through the Express server on the same
// origin so that we don't expose the service-role key to the browser.
const DATA_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:5000');

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'local-dev-key';

// Realtime MUST connect to the real Supabase project — not the Vercel proxy
// which does not support WebSockets. Fall back gracefully when the URL is not
// set (e.g. local dev without a Supabase project).
const REALTIME_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/realtime/v1`
  : undefined;

export const supabase = createClient<Database>(DATA_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  ...(REALTIME_URL ? { realtime: { url: REALTIME_URL } } : {}),
  global: {
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
