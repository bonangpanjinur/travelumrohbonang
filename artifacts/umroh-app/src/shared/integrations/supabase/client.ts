import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// In dev: point to the local Express server via Vite proxy (/rest/v1 → localhost:8080).
// VITE_SUPABASE_URL can override this (e.g. for Vercel deployment with real Supabase).
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'local-dev-key';

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
