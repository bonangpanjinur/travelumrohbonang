import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const isDev = import.meta.env.DEV;

// In dev: fall back to local Express server via Vite proxy (/rest/v1 → localhost:8080).
// In production: VITE_SUPABASE_URL must be set — fail fast if missing.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || (() => {
  if (!isDev) throw new Error('VITE_SUPABASE_URL must be set in production.');
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
})();

const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || (() => {
    if (!isDev) throw new Error('VITE_SUPABASE_ANON_KEY must be set in production.');
    return 'local-dev-key';
  })();

// Auth is handled by Replit Auth (server-side sessions).
// Disable Supabase Auth to prevent it from making /auth/v1/* requests.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      apikey: SUPABASE_KEY,
    },
  },
});
