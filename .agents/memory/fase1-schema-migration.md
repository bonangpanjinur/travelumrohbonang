---
name: FASE 1 schema migration
description: DB schema changes for packages/departures architecture — hotel & airline moved from packages to package_departures
---

# FASE 1 — Migrasi Database Schema

## What changed
- `packages` table: dropped `hotel_makkah_id`, `hotel_madinah_id`, `airline_id`, `airport_id`
- `package_departures` table: added `hotel_makkah_id`, `hotel_madinah_id` (nullable FK → hotels)
- `package_hotels` table: DROPPED — replaced by new `departure_hotels` table (FK → `package_departures` not `packages`)

## Files changed
- `lib/db/src/schema/packages.ts` — Drizzle schema updated; `departureHotels` export replaces `packageHotels`
- `lib/db/src/schema/masterdata.ts` — `packageHotels` removed
- `lib/api-zod/src/schemas/admin.ts` — `AdminCreatePackageRequest` no longer has hotel/airline; `AdminCreateDepartureRequest` gained them
- `lib/api-zod/src/schemas/packages.ts` — `PackageDepartureSchema` gained hotel/airline fields
- `supabase/migrations/20260723000002_fase1_schema_migration.sql` — SQL to run against the DB

## Why
Paket = template produk. Keberangkatan = instansi nyata dengan hotel & maskapai spesifik.
One package → many departures, each can have different hotels.

## How to apply the DB migration
Run `supabase/migrations/20260723000002_fase1_schema_migration.sql` against the live DB,
or `cd lib/db && DATABASE_URL=... pnpm drizzle-kit push`.

## Backend patterns post-FASE 1
- `packageHotels` is gone from `@workspace/db` exports → import `departureHotels` instead
- `packages` Drizzle object no longer has `hotelMakkahId`, `hotelMadinahId`, `airlineId`, `airportId` fields
- Public packages route (`GET /api/packages/` and `GET /api/packages/:slug`) now returns hotel/airline nested inside each departure object, not at the package level
- Social kit now queries hotel/airline from first departure of each package
- Extra-hotels admin endpoint (`POST /:id/extra-hotels`) returns 501 until FASE 2 implements departure-level endpoints
