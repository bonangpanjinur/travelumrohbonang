---
name: Supabase project-ref mismatch after re-import
description: Env vars pointed at a stale/wrong Supabase project after a Replit re-import, causing 401s straight from supabase.co and downstream admin 500s.
---

After a Replit re-import, `VITE_SUPABASE_URL` / `SUPABASE_URL` / `*_ANON_KEY` / `*_PROJECT_ID` can silently point at the **wrong Supabase project** (a stale one baked into `.env.example` or seeded by an earlier session), while `SUPABASE_SERVICE_ROLE_KEY` is also always wiped on re-import (this part was already known).

**Why this matters:** The failure signature looks like a backend bug (500s on admin routes, JWT/role resolution failing) but is actually a config/identity mismatch — the browser calls the correct anon key against the correct-looking domain, but it's the wrong Supabase project, so RLS/auth reject everything with 401 at the Supabase edge, before app code ever runs.

**How to apply:** When a user reports 401s coming directly from a `*.supabase.co` URL (not from the app's own API), don't assume RLS/policy misconfiguration first — diff the project ref embedded in the JWT `anon` key (`iss`/`ref` claim, base64-decode the payload) against the project ref in `VITE_SUPABASE_URL`, and ask the user to confirm which Supabase project is authoritative before touching any middleware code. Also watch for the URL being pasted as a Supabase **dashboard** link (`https://supabase.com/dashboard/project/<ref>`) instead of the actual API host (`https://<ref>.supabase.co`) — same mistake, different symptom (fetches to a non-API domain).
