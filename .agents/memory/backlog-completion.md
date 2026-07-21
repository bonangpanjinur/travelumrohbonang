---
name: UmrohPlus Backlog D-I Completion
description: Summary of completed backlog items D through I — endpoints, pages, and UI changes implemented.
---

## Items D–I — All Done (21 July 2026)

**D — Manifest Summary in Departure Card**
- `GET /api/admin/departures/:id/manifest-summary` added to `departures.ts` (before DELETE route)
- `Departures.tsx` fetches summaries per page using `paginatedIds` dep string trick
- Mini grid (Terdaftar / Dok✓ / Belum) shown in each card body after QuotaBar

**E — Manifest Link from BookingDetailPanel + Pemesan Column in Manifest**
- `BookingDetailPanel.tsx`: added `useNavigate` + "Lihat Manifest" button (only when departureId present)
- `Manifest.tsx`: "Pemesan" column added between Booking and Nama Lengkap; also in CSV export headers/rows

**F — Public Jadwal Page**
- `GET /api/packages/jadwal?month&year&packageId` added to `packages.ts` (uses `inArray` added to imports)
- `artifacts/umroh-app/src/features/cms/pages/Jadwal.tsx` created (grouped by month, filters, CTA)
- `App.tsx`: import + `<Route path="/jadwal">` added
- `Navbar.tsx`: "Jadwal" added to `defaultLinks` between Paket and Galeri (id "jadwal")

**G — Booking List Column + Filter**
- `BookingTable.tsx`: "Pemesan" column between Nama and Paket; colSpan bumped 8→9 / 9→10
- `Bookings.tsx`: `departureFilter` state, departures fetched from `/api/admin/departures`, departure Select added to Filter Lanjutan grid, URL param `&departureId=...` appended when filter active
- `GET /api/admin/bookings`: added `departureIdFilter` query param → `WHERE b.departure_id = $1`

**H — Manifest Print History UI**
- `GET /api/admin/departures/:id/manifest-history` added (queries `manifests` table by departureId)
- `Manifest.tsx`: `showHistory` state, `historyData` useQuery, "Riwayat Cetak" button, collapsible panel above departure selector; History icon added to lucide imports

**I — Backfill pemesan_name**
- `POST /api/admin/bookings/backfill-pemesan` added BEFORE `POST /:id/pilgrims` to avoid Express routing conflict
- Updates from `profiles` first, then walk-in from first `booking_pilgrims`

**Why (route ordering):**
- Literal string routes (backfill-pemesan, bulk-status, export.xlsx) MUST be registered before `/:id` routes in Express, or they get captured as the `:id` param.
