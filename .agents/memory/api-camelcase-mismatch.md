---
name: Admin API camelCase vs frontend snake_case mismatch
description: Recurring bug pattern in the Umroh app where /api/admin/* Express+Drizzle routes return camelCase but some admin pages expect snake_case, causing silently-undefined fields.
---

Two parallel data-access layers exist in this app: the legacy `/rest/v1/*` PostgREST-style shim (auto-converts to snake_case, safe) and the newer `/api/admin/*` and `/api/packages` Express+Drizzle routes (return raw Drizzle rows or Zod-validated objects, which are camelCase). Admin pages were written across different sessions — roughly a third use camelCase correctly, the rest still have snake_case TypeScript interfaces/JSX left over from the old shim, so `item.is_active`, `item.some_field` etc. are silently `undefined`.

**Why:** no global fix is safe — adding case conversion to `apiFetch` would break the pages already written correctly for camelCase. Must be fixed per-page.

**How to apply:** when a bug report or audit touches an admin page calling `/api/admin/*` or `/api/packages`, check the corresponding Express route's response shape (raw `db.select()` = camelCase columns) against the page's TypeScript interface. If mismatched, add a small `mapXFromApi` function converting the response to the snake_case shape the JSX/interfaces expect, and camelCase the outgoing payload in create/update calls. Already fixed: Bookings, Packages, CRM (unrelated flatMap bug), Currencies, Branches, Muthawifs, PackageCategories, PackageCosts, Agents (added mapAgentFromApi + camelCase payload), Airlines (logo_url→logoUrl), Hotels (star→stars). Not yet audited: remaining ~20 admin pages under `artifacts/umroh-app/src/features/admin/pages/` that call `/api/admin/*`.
