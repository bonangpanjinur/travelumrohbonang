/**
 * F-05: Admin Installment Schedule Routes
 *
 * GET  /api/admin/installments          — all installments (filterable by status/bookingId)
 * GET  /api/admin/installments/overdue  — overdue installments only
 * POST /api/admin/installments/send-reminders — manually trigger H-7 reminders
 * PATCH /api/admin/installments/:id     — update installment status (marks paid → syncs ledger)
 */

import { Router } from "express";
import {
  db,
  installmentSchedules,
  bookingPayments,
  bookings,
  packages,
  profiles,
  eq,
  and,
  desc,
  asc,
} from "@workspace/db";
import { sendInstallmentReminders } from "../../lib/installmentReminderCron";
import {
  computePaymentStatus,
  syncBookingStatus,
  recordFinancialTransaction,
  createNotification,
} from "../../lib/paymentSync";

const router = Router();

// ── GET /overdue — must be before /:id to avoid route shadowing ───────────────
router.get("/overdue", async (req, res) => {
  try {
    const now = new Date();

    const rows = await db
      .select({
        id: installmentSchedules.id,
        bookingId: installmentSchedules.bookingId,
        installmentNumber: installmentSchedules.installmentNumber,
        dueDate: installmentSchedules.dueDate,
        amount: installmentSchedules.amount,
        status: installmentSchedules.status,
        paidAt: installmentSchedules.paidAt,
        bookingCode: bookings.bookingCode,
        packageName: packages.title,
        jamaahName: profiles.name,
        jamaahEmail: profiles.email,
        jamaahPhone: profiles.phone,
      })
      .from(installmentSchedules)
      .leftJoin(bookings, eq(bookings.id, installmentSchedules.bookingId))
      .leftJoin(packages, eq(packages.id, bookings.packageId))
      .leftJoin(profiles, eq(profiles.id, bookings.userId))
      .where(eq(installmentSchedules.status, "pending"))
      .orderBy(asc(installmentSchedules.dueDate));

    // Filter past due in JS (avoids raw sql)
    const overdue = rows.filter((r) => r.dueDate && r.dueDate < now);

    res.json({ data: overdue, total: overdue.length });
  } catch (err) {
    console.error("[admin/installments] overdue:", err);
    res.status(500).json({ error: "Failed to fetch overdue installments" });
  }
});

// ── POST /send-reminders — manual trigger ─────────────────────────────────────
router.post("/send-reminders", async (_req, res) => {
  try {
    await sendInstallmentReminders();
    res.json({ ok: true, message: "Reminder job triggered" });
  } catch (err) {
    console.error("[admin/installments] send-reminders:", err);
    res.status(500).json({ error: "Failed to trigger reminders" });
  }
});

// ── PATCH /:id — mark a single installment (e.g. "paid") ─────────────────────
// K-01 FIX: when status → "paid", also create a bookingPayments record,
// sync bookings.status, and record a financial_transactions entry so the
// ledger stays consistent with the manual verify flow.
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paidAt } = req.body as { status?: string; paidAt?: string };
    const adminId = (req as any).user?.id as string | undefined;

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const now = new Date();
    const paidAtDate = paidAt ? new Date(paidAt) : now;

    // Fetch the installment first so we have bookingId + amount for the sync.
    const [existing] = await db
      .select()
      .from(installmentSchedules)
      .where(eq(installmentSchedules.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Installment not found" });
    }

    const [updated] = await db
      .update(installmentSchedules)
      .set({
        status,
        ...(status === "paid"
          ? { paidAt: paidAtDate }
          : { paidAt: null }),
      })
      .where(eq(installmentSchedules.id, id))
      .returning();

    // ── K-01: sync ledger when marking paid ───────────────────────────────────
    if (status === "paid" && existing.bookingId) {
      const bookingId = existing.bookingId;
      const amount = Number(existing.amount ?? 0);
      const referenceNumber = `installment-${id}`;

      // Idempotency: skip if we already have a bookingPayments record for this installment.
      const alreadyRecorded = await db
        .select({ id: bookingPayments.id })
        .from(bookingPayments)
        .where(
          and(
            eq(bookingPayments.bookingId, bookingId),
            eq(bookingPayments.referenceNumber, referenceNumber),
            eq(bookingPayments.isVoided, false),
          ),
        )
        .limit(1);

      if (alreadyRecorded.length === 0) {
        await db.insert(bookingPayments).values({
          id: crypto.randomUUID(),
          bookingId,
          type: "installment",
          amount,
          paidAt: paidAtDate,
          method: "manual",
          referenceNumber,
          notes: `Installment #${existing.installmentNumber ?? ""} marked paid by admin`,
          recordedBy: adminId ?? null,
          isVoided: false,
          createdAt: now,
        });
      }

      // Sync booking status based on total paid so far.
      const { paymentStatus, remaining } = await computePaymentStatus(bookingId);
      await syncBookingStatus(bookingId, paymentStatus);

      // Record in financial ledger.
      await recordFinancialTransaction({
        bookingId,
        amount,
        type: "income",
        category: "installment_payment",
        description: `Installment #${existing.installmentNumber ?? ""} paid (admin: ${referenceNumber})`,
        referenceNumber,
        recordedBy: adminId,
      });

      // In-app notification to jamaah.
      const [booking] = await db
        .select({ userId: bookings.userId })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

      if (booking?.userId) {
        await createNotification({
          userId: booking.userId,
          title: paymentStatus === "paid" ? "Cicilan Lunas ✓" : `Cicilan #${existing.installmentNumber ?? ""} Dikonfirmasi`,
          message: paymentStatus === "paid"
            ? "Selamat! Semua cicilan Anda telah lunas dan booking sudah dikonfirmasi."
            : `Cicilan sebesar Rp${amount.toLocaleString("id-ID")} telah dikonfirmasi. Sisa pembayaran: Rp${remaining.toLocaleString("id-ID")}.`,
        });
      }
    }

    res.json(updated);
  } catch (err) {
    console.error("[admin/installments] patch:", err);
    res.status(500).json({ error: "Failed to update installment" });
  }
});

// ── GET / — all installments with optional filters ───────────────────────────
router.get("/", async (req, res) => {
  try {
    const { status, bookingId } = req.query as {
      status?: string;
      bookingId?: string;
    };

    const isOverdueFilter = status === "overdue";
    const conditions: Parameters<typeof and>[0][] = [];
    // "overdue" is not a real DB status; query pending rows and post-filter by date.
    if (isOverdueFilter) {
      conditions.push(eq(installmentSchedules.status, "pending"));
    } else if (status) {
      conditions.push(eq(installmentSchedules.status, status));
    }
    if (bookingId) conditions.push(eq(installmentSchedules.bookingId, bookingId));

    const rows = await db
      .select({
        id: installmentSchedules.id,
        bookingId: installmentSchedules.bookingId,
        installmentNumber: installmentSchedules.installmentNumber,
        dueDate: installmentSchedules.dueDate,
        amount: installmentSchedules.amount,
        status: installmentSchedules.status,
        paidAt: installmentSchedules.paidAt,
        paymentGatewayOrderId: installmentSchedules.paymentGatewayOrderId,
        createdAt: installmentSchedules.createdAt,
        bookingCode: bookings.bookingCode,
        packageName: packages.title,
        jamaahName: profiles.name,
        jamaahEmail: profiles.email,
        jamaahPhone: profiles.phone,
      })
      .from(installmentSchedules)
      .leftJoin(bookings, eq(bookings.id, installmentSchedules.bookingId))
      .leftJoin(packages, eq(packages.id, bookings.packageId))
      .leftJoin(profiles, eq(profiles.id, bookings.userId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(installmentSchedules.dueDate));

    // Post-filter: "overdue" = pending rows whose dueDate is in the past.
    const now = new Date();
    const filtered = isOverdueFilter
      ? rows.filter((r) => r.dueDate && r.dueDate < now)
      : rows;

    res.json({ data: filtered, total: filtered.length });
  } catch (err) {
    console.error("[admin/installments] list:", err);
    res.status(500).json({ error: "Failed to fetch installments" });
  }
});

export default router;
