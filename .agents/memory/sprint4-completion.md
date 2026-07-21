---
name: Sprint 4 completion
description: Status Sprint 4 — semua 15 item selesai termasuk PK-01 camelCase standardization
---

Sprint 4 is 100% complete (15/15).

PK-01 (camelCase standardization) — completed:
- **Backend changes:**
  - `departures.ts` GET `/` — changed response from manual snake_case mapping to direct camelCase (packageId, departureDate, returnDate, remainingQuota, muthawifId, roomType)
  - `pilgrims-db.ts` GET `/` — added SQL column aliases to return camelCase (bookingId, birthDate, passportNumber, passportExpiry, roomType, createdAt, bookingCode, bookingStatus, packageTitle, departureDate)

- **Frontend changes:**
  - `Departures.tsx` — full rewrite: Departure/DeparturePrice interfaces and all form state now camelCase
  - `BookingTable.tsx` — full rewrite: Booking interface now camelCase (bookingCode, totalPrice, createdAt, packageId, departureId, picType, picId, branchId, isGroupBooking, groupName, picName, picPhone, departure.departureDate)
  - `Bookings.tsx` — updated mapper to produce camelCase Booking objects; CSV export uses camelCase
  - `Agents.tsx` — removed `mapAgentFromApi`; Agent interface now camelCase (referralCode, userId, branchId, commissionPercent, isActive); form state also camelCase
  - `Pilgrims.tsx` — BookingOption interface uses `bookingCode` not `booking_code`
  - `PilgrimsDatabase.tsx` — PilgrimRow interface fully camelCase
  - `PaymentGateway.tsx`, `Accounting.tsx`, `AgentPortal.tsx` — removed `?? b.booking_code` / `?? b.total_price` defensive fallbacks
  - `useAdminNotifications.ts` — reads `b.bookingCode` not `b.booking_code`

- **Files intentionally left unchanged (use Supabase client directly → snake_case from DB):**
  - CommissionReport.tsx, BranchDashboard.tsx, AgentCommissions.tsx, Documents.tsx

**Why:** PK-01 was previously deferred as too risky; the actual scope was well-bounded once analyzed file-by-file. The critical insight was separating "files using apiFetch (need camelCase)" from "files using Supabase client directly (keep snake_case from DB)".
