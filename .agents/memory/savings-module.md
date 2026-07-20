---
name: Umroh Tabungan module
description: Implementation notes for the savings (tabungan umroh) feature
---

## Key decisions

**DB Schema**: `savings_accounts` + `savings_transactions` in `lib/db/src/schema/savings.ts`. No FK to `profiles` (uuid/text mismatch) — relation enforced at app level only.

**Why:** Drizzle FK definition requires matching column types; `profiles.id` is `uuid` but most other tables use `text` IDs. Join in SQL with `profiles.id::text = savings_accounts.user_id`.

**ResponsiveTable import:** Must use `@/features/admin/components/ResponsiveTable`, NOT `@/shared/components/ui/responsive-table`.

## Routes
- User portal: `/api/savings` — mounted in `artifacts/api-server/src/routes/index.ts`
- Admin: `/api/admin/savings` — mounted in `artifacts/api-server/src/routes/admin/index.ts` with `requireFinance`

## Frontend pages
- Admin: `artifacts/umroh-app/src/features/admin/pages/Savings.tsx` → `/admin/savings`
- Jamaah: `artifacts/umroh-app/src/features/jamaah/pages/MySavings.tsx` → `/tabungan`
- Menu item added to Keuangan group in `adminMenuConfig.ts`
