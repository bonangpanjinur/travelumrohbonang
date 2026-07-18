---
name: Sprint 4 completion summary
description: What was implemented in Sprint 4, key architectural decisions, and what was deliberately skipped
---

## Sprint 4 — Implemented

**BK-03** — `booking_status_logs` schema table. `INSERT` inside PATCH /:id/status transaction. `GET /:id/status-logs` endpoint. Timeline rendered in `BookingDetailPanel.tsx`.

**BK-F02** — Bulk booking action: `PATCH /api/admin/bookings/bulk-status` (pass `{ids, status}`). `BookingTable.tsx` now accepts `selectedIds` + `onSelectionChange` props (adds checkbox column). `Bookings.tsx` shows floating bulk bar when ids selected.

**JM-F02** — Passport expiry badge in `Pilgrims.tsx` table NIK/Paspor column: red if expired, orange if ≤90 days. Frontend-only, no cron needed.

**MN-F02** — LEFT JOIN `check_ins` in `manifest-data` endpoint. `checkedInAt` and `checkInLocation` returned. `Manifest.tsx` shows check-in column.

**MN-DB01** — `manifests` schema table (`lib/db/src/schema/manifests.ts`). Snapshot inserted after PDF generated (fire-and-forget after `res.send`).

**MN-F01** — QR code was already in the PDF from a prior sprint (lib/pdf/manifest.ts:17).

**IT-F01** — `POST /api/admin/itineraries/:id/copy-to-departure` copies itinerary + all days to another departure in a transaction. Dialog "Salin" button in Itineraries card header.

**IT-F02** — Preview toggle per-itinerary card in `Itineraries.tsx`. State `previewId` controls which card renders read-only view.

**IT-02** — `PATCH /:id`, `POST /days`, `PATCH /days/:id` all now return snake_case to match GET.

**KB-F02** — After booking creation POST /, checks `remainingQuota <= 5` and logs `console.warn`. Full in-app notification skipped because `createNotification` requires a `userId` (string, not null) and no admin userId is available in context.

**PL-F03** — `EquipmentReport.tsx` page + `GET /api/admin/equipment-report` (summary by item) + `GET /api/admin/equipment-report/detail?itemId=X`. Route `/admin/equipment-report`. Menu entry under Operasional.

## Skipped / Deferred

**JM-DB02** — Linking master pilgrims to `pilgrim_equipment` deferred; FK already exists from `pilgrim_equipment.pilgrimId → booking_pilgrims.id`, which is sufficient.

**PK-01** — Broad camelCase standardization across entire API deferred as too risky; do it per-endpoint when touched.

## Key architecture notes

- `bookingStatusLogs` export: lives in `lib/db/src/schema/bookings.ts`, exported via `schema/index.ts` → consumed by api-server.
- `manifests` table: `lib/db/src/schema/manifests.ts`, exported via `schema/index.ts`.
- Equipment report API: `artifacts/api-server/src/routes/admin/equipment-report.ts` registered in `admin/index.ts`.
- `PATCH /bulk-status` must come BEFORE `PATCH /:id` in router to avoid Express routing collision.
