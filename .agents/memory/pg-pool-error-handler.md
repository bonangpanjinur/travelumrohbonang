---
name: pg.Pool unhandled error on Vercel
description: pg.Pool must have an error handler or background connection failures crash serverless functions
---

# pg.Pool must have an error handler

## Rule
Always add `pool.on("error", (err) => { console.error(...) })` immediately after creating a `pg.Pool`. Without it, any background client error (failed connection, idle client drop) is an unhandled `EventEmitter` error → Node.js crashes the process → `FUNCTION_INVOCATION_FAILED` on Vercel for every request, including ones that never touch the DB.

**Why:** pg.Pool occasionally creates background clients for health-checks or connection warmup even when `min: 0`. When the connection string is `postgres://localhost/placeholder` (fallback on Vercel where DATABASE_URL is absent), those background attempts fail with ECONNREFUSED or ENOTFOUND and emit an unhandled error event.

**How to apply:** In `lib/db/src/index.ts`, add after `export const pool = new Pool(...)`:
```ts
pool.on("error", (err) => {
  console.error("[db] pool background error (ignored):", err.message);
});
```

## Companion fix: fetch timeouts
All `fetch()` calls to Supabase (in `authMiddleware.ts`, `rest.ts`) must use `AbortSignal.timeout(ms)`. Without a timeout, network hangs on Vercel kill the serverless function after the platform timeout (10s–30s), returning `FUNCTION_INVOCATION_FAILED` just like the pool error.

```ts
const res = await fetch(url, { signal: AbortSignal.timeout(8_000), ... });
```
