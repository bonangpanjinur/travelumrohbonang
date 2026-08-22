/**
 * Shared payment synchronisation helpers.
 *
 * Used by:
 *  - payment-gateway-webhooks.ts  (automated gateway callbacks)
 *  - admin/payments.ts            (manual admin verification)
 *
 * These functions should be called inside a try/catch in the caller — they
 * throw on unexpected DB errors so the caller can return HTTP 500 and let the
 * gateway retry.
 */

import { syncDepartureQuota } from "./seatQuota";
import {
  db,
  bookings,
  bookingPayments,
  branches,
  financialTransactions,
  accountingPeriods,
  notifications,
  eq,
  and,
  sum,
} from "@workspace/db";
import { emailNotifications } from "./notifications/emailNotifications";

type DbRunner = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function assertOpenAccountingPeriod(date: Date, runner: DbRunner = db): Promise<void> {
  const [period] = await runner
    .select({ status: accountingPeriods.status })
    .from(accountingPeriods)
    .where(and(
      eq(accountingPeriods.year, date.getFullYear()),
      eq(accountingPeriods.month, date.getMonth() + 1),
    ))
    .limit(1);
  if (period?.status === "closed") {
    throw new Error(`Accounting period ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")} is closed`);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface PaymentSummary {
  totalPrice: number;
  totalPaid: number;
  remaining: number;
  paymentStatus: PaymentStatus;
}

// ── computePaymentStatus ─────────────────────────────────────────────────────
// Calculates how much has been paid for a booking (from bookingPayments).

export async function computePaymentStatus(
  bookingId: string,
  runner: DbRunner = db,
): Promise<PaymentSummary> {
  const [booking] = await runner
    .select({ totalPrice: bookings.totalPrice })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  const totalPrice = booking?.totalPrice ?? 0;

  const [result] = await runner
    .select({ total: sum(bookingPayments.amount) })
    .from(bookingPayments)
    .where(
      and(
        eq(bookingPayments.bookingId, bookingId),
        eq(bookingPayments.isVoided, false),
      ),
    );

  const totalPaid = Number(result?.total ?? 0);
  const remaining = totalPrice - totalPaid;

  let paymentStatus: PaymentStatus;
  if (totalPaid <= 0) {
    paymentStatus = "unpaid";
  } else if (totalPaid >= totalPrice) {
    paymentStatus = "paid";
  } else {
    paymentStatus = "partial";
  }

  return { totalPrice, totalPaid, remaining, paymentStatus };
}

// ── syncBookingStatus ─────────────────────────────────────────────────────────
// Maps payment status → booking status and updates the bookings table.
// Skips if booking is already cancelled or completed (terminal states).

export async function syncBookingStatus(
  bookingId: string,
  paymentStatus: PaymentStatus,
  runner: DbRunner = db,
  skipQuotaSync = false,
): Promise<void> {
  const [current] = await runner
    .select({ status: bookings.status })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (
    !current ||
    current.status === "cancelled" ||
    current.status === "completed"
  ) {
    return;
  }

  let newStatus: string | null = null;

  if (paymentStatus === "paid" && current.status !== "confirmed") {
    newStatus = "confirmed";
  } else if (paymentStatus === "partial" && current.status === "draft") {
    newStatus = "pending";
  } else if (paymentStatus === "unpaid" && current.status === "pending") {
    newStatus = "draft";
  }

  if (newStatus) {
    await runner
      .update(bookings)
      .set({ status: newStatus })
      .where(eq(bookings.id, bookingId));
  }

  // Seat mengikuti status approval booking, bukan status pembayaran;
  // hitung ulang tetap dilakukan agar quota tidak stale setelah perubahan payment.
  const [depRow] = await runner
    .select({ departureId: bookings.departureId })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!skipQuotaSync) await syncDepartureQuota(depRow?.departureId ?? null);
}

// ── recordFinancialTransaction ─────────────────────────────────────────────────
// Inserts a record into financial_transactions for audit / accounting.

export async function recordFinancialTransaction({
  bookingId,
  amount,
  type,
  category,
  description,
  referenceNumber,
  recordedBy,
  accountId,
  entryType,
  runner,
}: {
  bookingId?: string | null;
  amount: number;
  type: "income" | "refund" | "expense";
  category: string;
  description: string;
  referenceNumber?: string;
  recordedBy?: string;
  accountId?: string | null;
  entryType?: "debit" | "credit";
  runner?: DbRunner;
}): Promise<void> {
  const dbRunner = runner ?? db;
  await assertOpenAccountingPeriod(new Date(), dbRunner);

  let branchId: string | null = null;
  if (bookingId) {
    const [booking] = await dbRunner
      .select({ branchId: bookings.branchId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    branchId = booking?.branchId ?? null;
  }
  if (!branchId) {
    const [hq] = await dbRunner
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.id, "hq"))
      .limit(1);
    if (!hq?.id) throw new Error("Branch HQ belum tersedia; jalankan migration 20260815000006 terlebih dahulu");
    branchId = hq.id;
  }

  if (referenceNumber) {
    const [existing] = await dbRunner
      .select({ id: financialTransactions.id })
      .from(financialTransactions)
      .where(eq(financialTransactions.referenceNumber, referenceNumber))
      .limit(1);
    if (existing) return;
  }

  await dbRunner.insert(financialTransactions).values({
    id: crypto.randomUUID(),
    bookingId: bookingId ?? null,
    branchId,
    amount: String(amount),
    type,
    category,
    description,
    referenceNumber: referenceNumber ?? null,
    transactionDate: new Date(),
    recordedBy: recordedBy ?? null,
    accountId: accountId ?? null,
    entryType: entryType ?? null,
    createdAt: new Date(),
  });
}

// ── createNotification ────────────────────────────────────────────────────────
// Inserts an in-app notification for the user linked to the booking.

export async function createNotification({
  userId,
  title,
  message,
}: {
  userId: string;
  title: string;
  message: string;
}): Promise<void> {
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    userId,
    title,
    message,
    isRead: false,
    createdAt: new Date(),
  });
}

// ── syncFromGatewayTransaction ─────────────────────────────────────────────────
// Called from webhook handlers after updating paymentGatewayTransactions.
// Creates the bookingPayments record, syncs booking status, records financials,
// and inserts an in-app notification.
//
// Returns silently if the gateway transaction has no bookingId (no-op for
// transactions not linked to a booking, which shouldn't happen in practice).

export async function syncFromGatewayTransaction({
  bookingId,
  amount,
  gateway,
  orderId,
  newStatus,
}: {
  bookingId: string;
  amount: number;
  gateway: string;
  orderId: string;
  newStatus: string; // 'paid' | 'expired' | 'cancelled' | 'pending'
}): Promise<void> {
  // Only sync on terminal paid status — ignore pending/expired/cancelled for
  // booking-status purposes (gateway will retry if needed).
  if (newStatus !== "paid") return;

  // Fetch booking to get userId and current state.
    const [booking] = await db
    .select({ id: bookings.id, userId: bookings.userId, totalPrice: bookings.totalPrice, branchId: bookings.branchId })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    console.warn(`[paymentSync] bookingId=${bookingId} not found — skipping sync`);
    return;
  }

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`Invalid gateway payment amount: ${amount}`);
  }

  const paymentResult = await db.transaction(async (tx) => {
    // Idempotency guard and insert happen under one transaction. The database
    // unique index remains the final protection against concurrent callbacks.
    const existing = await tx
      .select({ id: bookingPayments.id })
      .from(bookingPayments)
      .where(
        and(
          eq(bookingPayments.bookingId, bookingId),
          eq(bookingPayments.referenceNumber, orderId),
          eq(bookingPayments.isVoided, false),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      console.info(`[paymentSync] orderId=${orderId} already recorded — skipping duplicate`);
      return { duplicate: true, paymentStatus: "paid" as PaymentStatus };
    }

    const [paidRow] = await tx
      .select({ total: sum(bookingPayments.amount) })
      .from(bookingPayments)
      .where(and(eq(bookingPayments.bookingId, bookingId), eq(bookingPayments.isVoided, false)));
    const currentPaid = Number(paidRow?.total ?? 0);
    if (currentPaid + amount > booking.totalPrice) {
      throw new Error(`Gateway payment exceeds booking balance for ${bookingId}`);
    }

    await tx.insert(bookingPayments).values({
      id: crypto.randomUUID(),
      bookingId,
      branchId: booking.branchId ?? "hq",
      type: "gateway",
      amount,
      paidAt: new Date(),
      method: gateway,
      referenceNumber: orderId,
      notes: `Auto-recorded from ${gateway} webhook`,
      recordedBy: null,
      isVoided: false,
      createdAt: new Date(),
    });

    const { paymentStatus } = await computePaymentStatus(bookingId, tx);
    await syncBookingStatus(bookingId, paymentStatus, tx, true);
    await recordFinancialTransaction({
      bookingId,
      amount,
      type: "income",
      category: "booking_payment",
      description: `Payment via ${gateway} (${orderId})`,
      referenceNumber: `gateway:${orderId}`,
      runner: tx,
    });
    return { duplicate: false, paymentStatus };
  });

  if (paymentResult.duplicate) return;
  const { paymentStatus } = paymentResult;

  // In-app notification for the jamaah.
  if (booking.userId) {
    const isFullyPaid = paymentStatus === "paid";
    await createNotification({
      userId: booking.userId,
      title: isFullyPaid ? "Pembayaran Lunas ✓" : "Pembayaran Diterima",
      message: isFullyPaid
        ? `Pembayaran Anda telah kami terima dan booking Anda sudah dikonfirmasi.`
        : `Pembayaran sebesar Rp${amount.toLocaleString("id-ID")} telah kami terima. Segera selesaikan pelunasan.`,
    });
  }

  // Fire-and-forget: email failure must never fail the webhook response
  // (the gateway would otherwise interpret a 500 as "retry the webhook").
  void emailNotifications.paymentReceived(bookingId, amount);
}
