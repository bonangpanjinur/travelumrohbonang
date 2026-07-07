import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabaseAuth } from './auth-client';

// REST and storage requests go directly to Supabase using the anon key.
// Row Level Security (RLS) on the Supabase project enforces per-row
// authorization based on the user's JWT token attached below.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? '';

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
