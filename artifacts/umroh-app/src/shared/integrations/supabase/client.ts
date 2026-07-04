import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabaseAuth } from './auth-client';

const DATA_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:5000');

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'local-dev-key';

export const supabase = createClient<Database>(DATA_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
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
