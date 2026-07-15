---
name: F-05 Cicilan (Installment) Implementation
description: Complete record of the installment schedule feature — schema, backend, cron, frontend. What exists, how it fits together, and key design decisions.
---

## What was built

**F-05: Cicilan (Installment) End-to-End** — generates a cicilan schedule when a booking
is created with `paymentScheme = 'dp' | 'installment' | 'cicilan'`.

### Database schema (lib/db/src/schema/payments.ts)
- New table: `installmentSchedules` — id, bookingId, installmentNumber (0=DP, 1..n=cicilan), dueDate, amount, status (pending/paid/overdue), paidAt, paymentGatewayOrderId, notes, createdAt
- Added `installmentScheduleId` nullable column to `paymentGatewayTransactions` to link gateway payments to specific installments

### Backend business logic
- `artifacts/api-server/src/lib/installments.ts` — `generateInstallmentSchedule()`, `computeInstallmentRows()`, `markInstallmentPaid()`, `syncOverdueStatus()`, `requiresInstallmentSchedule()`
- Schedule: DP = minimumDp (package field) or 30% fallback; monthly installments fill remaining amount between dpDeadlineDays and fullDeadlineDays (both from packages table)
- Idempotent: `generateInstallmentSchedule` checks for existing rows before inserting

### Cron job (artifacts/api-server/src/lib/installmentReminderCron.ts)
- `startInstallmentReminderCron()` — hourly setInterval, fires at UTC 01:00 (WIB 08:00)
- `sendInstallmentReminders()` — finds pending installments with dueDate in 7-day window; sends WA + email per installment
- Started in `artifacts/api-server/src/index.ts` after server boot

### Backend routes
- `GET /api/bookings/:id/installments` — user's installments (owner-only, lazy overdue sync)
- `POST /api/bookings/:id/installments/:n/pay` — create VA/QRIS gateway transaction for installment n; supports midtrans and xendit; stores `installmentScheduleId` in gateway transaction
- `GET /api/admin/installments` — all installments with filters (status, bookingId)
- `GET /api/admin/installments/overdue` — overdue list
- `POST /api/admin/installments/send-reminders` — manual trigger for H-7 reminders

### Webhook integration
- Both Midtrans and Xendit webhook handlers now call `markInstallmentPaid(installmentScheduleId, orderId)` when a payment settles, if the gateway transaction has `installmentScheduleId` set

### Notifications
- `lib/whatsapp/src/templates.ts` — `installmentReminderWA()` added
- `lib/whatsapp/src/index.ts` — exports new template
- `artifacts/api-server/src/lib/notifications/waNotifications.ts` — `installmentReminder()` method added
- Email: uses existing `installmentReminderTemplate` (already in lib/email)

### Frontend
- `artifacts/umroh-app/src/features/booking/hooks/useInstallments.ts` — hook: fetches schedule, exposes `createGatewayPayment()`
- `artifacts/umroh-app/src/features/booking/components/InstallmentSchedule.tsx` — collapsible schedule card in MyBookings; Bayar button creates Midtrans VA inline
- `artifacts/umroh-app/src/features/booking/pages/MyBookings.tsx` — `<InstallmentSchedule bookingId={b.id} />` added below itinerary
- `artifacts/umroh-app/src/features/dashboard/pages/Dashboard.tsx` — `<UpcomingInstallmentCard>` shown if booking has dp/installment/cicilan scheme

## Key design decisions

**Why:** The `paymentScheme` field on bookings is already free-text. We treat values 'dp', 'installment', 'cicilan' (case-insensitive) as cicilan bookings.

**Why:** We link gateway transactions to installments via `installmentScheduleId` column (not orderId parsing) because it's type-safe, FK-friendly, and doesn't rely on naming conventions.

**Why:** Overdue status is synced lazily (on read) rather than via a separate cron to keep infrastructure simple. The reminder cron only reads `status='pending'`, so overdue sync doesn't affect reminder accuracy.

**Why:** We use `setInterval` + UTC hour check instead of `node-cron` to avoid adding a new dependency. The check runs every hour; it fires reminders exactly once per calendar day per server instance.

## DB migration note
After implementing, run: `pnpm --filter @workspace/db run push`
(already executed — `installment_schedules` and the `installmentScheduleId` column exist in the live DB)
