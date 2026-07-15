---
name: apiFetch auto auth token
description: apiClient.ts must retrieve the Supabase session token and attach it as Authorization header automatically.
---

# apiFetch must attach Supabase Bearer token automatically

## Rule
`artifacts/umroh-app/src/shared/lib/apiClient.ts` must call `supabaseAuth.auth.getSession()` on every request and set `Authorization: Bearer <token>` if a session exists and the header isn't already set.

**Why:** The Express auth middleware (`requireAuth`) reads the token from `Authorization: Bearer` header. Without this, all `apiFetch` calls to `/api/admin/*` routes fail with 401 — even though the user is logged in. The bug is silent because the error is caught and the component just shows empty data.

**How to apply:** Any time apiClient.ts is modified, confirm the auto-token logic is still present. Callers should NOT manually pass Authorization headers unless overriding.
