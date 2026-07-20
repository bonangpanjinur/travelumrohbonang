---
name: misc route prefix
description: /api/misc/payment-settings vs /api/payment-settings route mounting
---

## Rule
`routes/misc.ts` is mounted **twice** in `routes/index.ts`:
1. `router.use(miscRouter)` — root level (legacy, `/api/currencies`, `/api/payment-settings`)
2. `router.use("/misc", miscRouter)` — prefixed (new canonical, `/api/misc/payment-settings`)

**Why:** Frontend `Payment.tsx` calls `/api/misc/payment-settings` but original mounting had no prefix, giving a 404. Dual-mounting preserves backward compat while fixing the frontend call.

**How to apply:** Any new routes added to `misc.ts` are accessible at both `/api/<route>` and `/api/misc/<route>`.
