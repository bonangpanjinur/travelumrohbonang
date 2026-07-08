---
name: Generic REST proxy table-level auth is not row-level auth
description: Why AUTH_TABLES in the /rest/v1 proxy is insufficient for user-scoped data, and the rule for adding new tables to it.
---

`artifacts/api-server/src/routes/rest.ts` exposes a generic `/rest/v1/:table` proxy (Supabase-PostgREST-compatible). Its `AUTH_TABLES` set only gates on `req.isAuthenticated()` — it has no per-row ownership filtering. Any table added there is fully readable/writable by *any* authenticated user, not just the owner.

**Why:** `chat_messages` was added to `AUTH_TABLES` at some point, silently reintroducing an IDOR even after the dedicated `/api/cms/chat-messages` route was given a proper booking-ownership check — any authenticated user could still read others' chat rows via the generic proxy.

**How to apply:** Before adding any user-scoped table (bookings, documents, chats, payments, etc.) to `AUTH_TABLES`/`ALLOWED_TABLES` in `rest.ts`, check whether row-level ownership matters for that table. If it does, either (a) don't add it — force access through a dedicated route with an explicit ownership/staff check, or (b) add real per-row filtering to the generic proxy itself (not just table-level auth). `chat_messages` is deliberately excluded from `rest.ts` for this reason — see the comment above `AUTH_TABLES` there.
