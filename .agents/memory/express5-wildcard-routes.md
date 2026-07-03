---
name: Express 5 wildcard routes
description: How to write catch-all wildcard routes in Express 5 / path-to-regexp v8
---

In Express 5 (path-to-regexp v8), unnamed wildcards (`*`) are rejected at startup.

**Rule:** Use `*name` syntax (no colon) for named wildcards that capture slashes.

```ts
// ❌ Express 4 — throws PathError on startup in Express 5
router.get('/object/:bucket/*', handler);

// ✅ Express 5 / path-to-regexp v8
router.get('/object/:bucket/*filePath', handler);
// Access via: req.params.filePath (may be string | string[])
```

**Why:** path-to-regexp v8 removed unnamed wildcard support. Unnamed `*` or trailing `*` after `:param` both throw `Missing parameter name`.

**How to apply:** Any route using `/*` or `/:param*` must be rewritten to `/*name`. Read the captured value defensively (`Array.isArray(p) ? p.join('/') : p`).
