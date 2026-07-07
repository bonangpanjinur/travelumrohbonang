---
name: Unregistered routes pattern
description: Several route files in artifacts/api-server/src/routes/ were not mounted in index.ts; also notes on IDOR fix and rate-limiter consolidation.
---

## Rule
When adding a new route file to `artifacts/api-server/src/routes/`, always mount it in `artifacts/api-server/src/routes/index.ts`. Previously 7 files were orphaned.

**Currently registered routes (index.ts as of 2026-07-07):**
- healthRouter (no prefix)
- authRouter (no prefix)
- packagesRouter → /packages
- faqsRouter → /faqs
- cmsRouter → /cms  ← newly added
- miscRouter → / (root, serves /currencies, /tenant-site)  ← newly added
- adminRouter → /admin (strictLimiter)
- bookingsRouter → /bookings (strictLimiter + writeLimiter on POST)
- profileRouter → /profile (strictLimiter + writeLimiter on PATCH)
- contractsRouter → /contracts (strictLimiter)  ← newly added
- pilgrimDocumentsRouter → /pilgrim-documents (strictLimiter + writeLimiter on POST)  ← newly added
- notificationsRouter → /notifications (strictLimiter)  ← newly added
- wishlistsRouter → /wishlists (strictLimiter + writeLimiter on POST /toggle)  ← newly added
- logsRouter → /logs (writeLimiter at router level, no auth)  ← newly added

**Already mounted in app.ts (NOT in index.ts):**
- restRouter → /rest/v1 and /rest/v1/rpc
- storageRouter → /storage/v1

## Why
app.ts mounts restRouter and storageRouter directly because they mirror the Supabase API path structure (Vercel rewrites /rest/v1/* → /api which resolves to Express app, not /api/rest/v1). All other routes go through index.ts at /api.

## IDOR fix in pilgrim-documents.ts
`POST /pilgrim-documents` now verifies that `pilgrimId` belongs to the `bookingId` (joined check) before update/insert. Without this, any user with a valid booking could overwrite another user's pilgrim document.

## Rate-limiter pattern
Apply `writeLimiter` at the router.use() call, not as separate per-verb handlers before the router, to avoid fragile dual-registration.
