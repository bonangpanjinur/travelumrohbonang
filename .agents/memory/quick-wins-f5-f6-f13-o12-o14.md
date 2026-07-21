---
name: Quick Wins F-5, F-6, F-13, O-12, O-14
description: Status dan implementasi 5 quick win dari FINANCE_OPERASIONAL_ROADMAP.md
---

## Status per item

**F-5 (Reminder Piutang WA Bulk)** — sudah selesai sebelum task ini.
- Endpoint: `POST /api/admin/finance/piutang/remind` di `finance.ts` baris 300-404.
- Batch 50, delay 300ms, pakai template `paymentDeadlineAlertWA`.

**F-6 (Jurnal Otomatis)** — sudah selesai sebelum task ini.
- `artifacts/api-server/src/lib/autoJournal.ts` — 7 fungsi idempoten.
- Hook: payments.ts (verify), refunds.ts (approve/refunded), agents.ts (withdrawal), installments.ts, savings.

**F-13 (Nomor Invoice Sequential)** — diperbaiki dalam task ini.
- Format: `INV/{YYYY}/{SEQ:04d}` e.g. `INV/2026/0042`.
- Sequence dihitung on-the-fly via COUNT query dalam tahun yang sama (no schema change).
- File: `artifacts/api-server/src/routes/admin/bookings.ts` endpoint `/:id/invoice-data`.

**Why (F-13):** Tidak push schema baru karena DB tidak bisa diakses (secrets belum dikonfigurasi). Count-based rank stabil selama tidak ada delete booking dalam tahun yang sama.

**O-12 (Validasi Kapasitas + Gender)** — bug fix dalam task ini.
- Logika validasi sudah ada tapi `ROOM_CAPACITY` const dan `sql` import tidak ada → runtime error.
- Fix: tambah `sql` ke import dari `@workspace/db`, tambah `const ROOM_CAPACITY = { single:1, double:2, triple:3, quad:4 }`.
- File: `artifacts/api-server/src/routes/admin/room-assignment.ts`.

**O-14 (Anti-Collision Booking Code)** — diperbaiki dalam task ini.
- Sebelumnya pakai `Math.random()` dengan fallback `Date.now()`.
- Fix: pakai `crypto.randomUUID()`, format `BNG-{YYMM}-{8hex}` e.g. `BNG-2607-A3F2C19E`.
- File: `artifacts/api-server/src/routes/admin/bookings.ts` POST / handler.
