---
name: Supabase dev/prod REST split
description: Pattern seen in apps ported from Supabase-backed Vercel/Lovable exports where dev and prod point at different backends for REST/Storage vs Auth.
---

Apps originally built against Supabase (via Lovable/Vercel-style scaffolds) sometimes keep a client split like:

- REST/Storage client (`.../integrations/supabase/client.ts`): in dev, routes same-origin to a local Express shim that mimics the Supabase REST API (`/:table`, `/rpc/:funcname`, `/object/:bucket`) backed by Drizzle/Postgres; in production build, points at the real external Supabase project via `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.
- Auth client (`.../integrations/supabase/auth-client.ts`): always points at the real external Supabase project in both dev and prod, since PKCE login/signup needs Supabase's actual Auth service — the local shim only exposes read-only `/auth/user` and `/logout`.

**Why:** This lets local dev work against the Replit-native Postgres DB without needing real Supabase credentials, while production keeps using the user's real Supabase project (data, RLS, and Auth) if that's what they choose to keep.

**How to apply:** When porting/restoring such an app, don't unify the two paths without asking — confirm with the user whether production should keep using real Supabase (request `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` as secrets) or fully switch to the local shim in production too.
