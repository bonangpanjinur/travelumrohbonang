---
name: Supabase backend auth on Node 20
description: How to verify Supabase JWT on the Express API server without crashing due to missing WebSocket.
---

# Supabase backend auth — Node.js 20

## The rule
Do NOT `import { createClient } from '@supabase/supabase-js'` on the API server when running Node.js 20.

## Why
`@supabase/supabase-js` always initialises a `RealtimeClient` which requires WebSocket. Node.js 20 has no native WebSocket. On startup the process throws:
```
Error: Node.js 20 detected without native WebSocket support.
```
and exits immediately.

## How to apply
Verify Supabase JWTs on the backend using a plain `fetch` call to the Supabase Auth REST endpoint instead of the SDK:

```typescript
const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
  headers: {
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON_KEY,
  },
});
const user = await res.json();
```

Cache results with a short TTL (60 s) keyed by token to avoid making a network call on every request.

**Why fetch, not SDK:** The SDK bundles Realtime which needs WebSocket. Direct fetch to `/auth/v1/user` is exactly what the SDK does internally for `getUser(token)`, minus the WebSocket overhead.
