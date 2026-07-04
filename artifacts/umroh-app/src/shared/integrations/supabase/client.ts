import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Data queries go through the local Express proxy:
//   dev:  Vite proxies /rest/v1 → localhost:8080 → Replit PostgreSQL
//   prod: Vercel rewrites /rest/v1 → /api (serverless function) → Supabase PG
const DATA_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:5000');

// Realtime (WebSocket) must connect to the actual Supabase project — our
// Express proxy does not handle WebSocket upgrades. Falls back gracefully if
// VITE_SUPABASE_URL is not set (realtime simply won't connect, no 500 errors).
const REALTIME_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/realtime/v1`
  : undefined;

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'local-dev-key';

// Auth is handled by Replit Auth (server-side sessions).
// Supabase Auth is disabled — this client is data-only via our Express proxy.
export const supabase = createClient<Database>(DATA_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  ...(REALTIME_URL
    ? {
        realtime: {
          url: REALTIME_URL,
          accessToken: async () => SUPABASE_KEY,
        },
      }
    : {}),
  global: {
    headers: {
      apikey: SUPABASE_KEY,
    },
  },
});
