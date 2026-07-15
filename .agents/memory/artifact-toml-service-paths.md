---
name: artifact.toml service `paths` must list every URL prefix the service handles
description: A ported Express app that mounts routes at multiple root prefixes (e.g. /api, /rest/v1, /storage/v1) needs all of them listed in the artifact's service `paths`, or the platform proxy silently routes those requests to a different artifact.
---

## Symptom
A backend route works when curled directly against the service's port, but from the browser (through the artifact proxy) it returns the *frontend's* HTML (SPA index.html) instead of JSON — because the request never reached the backend service.

## Root cause
Replit's path-based artifact routing only forwards requests whose prefix is listed in that service's `paths` array (in `.replit-artifact/artifact.toml`). If an Express app (especially one ported from elsewhere, e.g. a Supabase-REST-compatible shim) mounts routers at multiple root-level prefixes — e.g. `app.use("/api", ...)`, `app.use("/rest/v1", ...)`, `app.use("/storage/v1", ...)` — but the artifact's `paths` only lists `["/api"]`, then requests to `/rest/v1/*` or `/storage/v1/*` fall through to whichever artifact owns `previewPath: "/"` (usually the frontend), which returns its SPA fallback HTML.

## Fix
Grep the backend's app/router setup (`app.use("/prefix", ...)`) for every root-mounted prefix, then add all of them to that service's `paths` array via `verifyAndReplaceArtifactToml` (never edit `artifact.toml` directly). Restart the service after.

**Why:** this is easy to miss because the backend itself runs fine and even logs the request in its own log — the failure only shows up in the browser as a JSON-parse error or an unexpected HTML response, not as a backend error.

**How to apply:** when porting a Supabase/Express-shim style backend (routes like `/rest/v1/:table`, `/storage/v1/...`) to Replit's artifact routing, always check the service's `paths` against every `app.use(prefix, ...)` in its entrypoint.
