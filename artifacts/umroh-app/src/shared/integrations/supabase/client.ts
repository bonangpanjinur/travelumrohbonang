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

// Realtime MUST connect to the real Supabase project — not the Vercel/Express
// proxy, which does not support WebSockets. supabase-js derives its realtime
// endpoint from the client's base URL (there is no supported `realtime.url`
// override option), so when a real Supabase project is configured we create
// the client pointed at that project directly, and rewrite outgoing
// REST/storage `fetch` calls back to the local proxy (`DATA_URL`) below.
// Without a configured project, everything (including realtime, which will
// simply fail to connect) falls back to the proxy origin.
const REAL_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || undefined;
const CLIENT_BASE_URL = REAL_SUPABASE_URL || DATA_URL;

export const supabase = createClient<Database>(CLIENT_BASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: async (url, options = {}) => {
      let targetUrl = url as string;
      if (REAL_SUPABASE_URL && targetUrl.startsWith(REAL_SUPABASE_URL)) {
        targetUrl = DATA_URL + targetUrl.slice(REAL_SUPABASE_URL.length);
      }
      const { data: { session } } = await supabaseAuth.auth.getSession();
      const headers = new Headers((options as RequestInit)?.headers);
      headers.set('apikey', SUPABASE_KEY);
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
      }
      return fetch(targetUrl, { ...(options as RequestInit), headers });
    },
  },
});
