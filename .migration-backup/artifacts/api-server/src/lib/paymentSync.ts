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

import {
  db,
  bookings,
  bookingPayments,
  financialTransactions,
  notifications,
  eq,
  and,
  sum,
} from "@workspace/db";
import { emailNotifications } from "./notifications/emailNotifications";

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
): Promise<PaymentSummary> {
  const [booking] = await db
    .select({ totalPrice: bookings.totalPrice })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  const totalPrice = booking?.totalPrice ?? 0;

  const [result] = await db
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
): Promise<void> {
  const [current] = await db
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
    await db
      .update(bookings)
      .set({ status: newStatus })
      .where(eq(bookings.id, bookingId));
  }
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
}: {
  bookingId: string;
  amount: number;
  type: "income" | "refund" | "expense";
  category: string;
  description: string;
  referenceNumber?: string;
  recordedBy?: string;
}): Promise<void> {
  await db.insert(financialTransactions).values({
    id: crypto.randomUUID(),
    bookingId,
    amount: String(amount),
    type,
    category,
    description,
    referenceNumber: referenceNumber ?? null,
    transactionDate: new Date(),
    recordedBy: recordedBy ?? null,
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
    .select({ id: bookings.id, userId: bookings.userId, totalPrice: bookings.totalPrice })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    console.warn(`[paymentSync] bookingId=${bookingId} not found — skipping sync`);
    return;
  }

  // Idempotency guard — gateway may deliver duplicate webhooks.
  // Check if we already have a bookingPayments record for this orderId.
  const existing = await db
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
    return;
  }

  // Record the payment in bookingPayments.
  await db.insert(bookingPayments).values({
    id: crypto.randomUUID(),
    bookingId,
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

  // Compute new payment status and sync booking.
  const { paymentStatus } = await computePaymentStatus(bookingId);
  await syncBookingStatus(bookingId, paymentStatus);

  // Record financial transaction.
  await recordFinancialTransaction({
    bookingId,
    amount,
    type: "income",
    category: "booking_payment",
    description: `Payment via ${gateway} (${orderId})`,
    referenceNumber: orderId,
  });

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
