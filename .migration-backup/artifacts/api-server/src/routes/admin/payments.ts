import { Router } from "express";
import {
  db,
  bookings,
  bookingPayments,
  payments,
  eq,
  and,
  sql,
  desc,
} from "@workspace/db";
import {
  AdminRecordPaymentRequest,
  AdminUpdatePaymentRequest,
  BookingPaymentSchema,
  BookingPaymentSummarySchema,
  type AdminRecordPaymentInput,
  type AdminUpdatePaymentInput,
} from "@workspace/api-zod";
import { validate } from "../../middlewares/validate";
import {
  computePaymentStatus,
  syncBookingStatus,
  recordFinancialTransaction,
  createNotification,
} from "../../lib/paymentSync";
import { emailNotifications } from "../../lib/notifications/emailNotifications";
import { waNotifications } from "../../lib/notifications/waNotifications";

const router = Router({ mergeParams: true });

router.get("/all", async (req, res) => {
  try {
    const data = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        status: payments.status,
        proofUrl: payments.proofUrl,
        paymentMethod: payments.paymentMethod,
        paymentType: payments.paymentType,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
        booking: {
          id: bookings.id,
          bookingCode: bookings.bookingCode,
          status: bookings.status,
          totalPrice: bookings.totalPrice,
          userId: bookings.userId,
        },
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .orderBy(desc(payments.createdAt));
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch all payments" });
  }
});

router.get("/recent-pending", async (req, res) => {
  try {
    const data = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        status: payments.status,
        createdAt: payments.createdAt,
        bookingCode: bookings.bookingCode,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(eq(payments.status, "pending"))
      .orderBy(desc(payments.createdAt))
      .limit(20);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch recent pending payments" });
  }
});

// ── PATCH /verify/:id ─────────────────────────────────────────────────────────
// Admin confirms a manual payment proof (bank transfer upload).
// Flow:
//   1. Update payments.status → 'verified'
//   2. Create bookingPayments record so computePaymentStatus sees it
//   3. Sync bookings.status via paymentSync helpers
//   4. Record financial_transactions entry
//   5. Send in-app notification to jamaah

router.patch("/verify/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const adminId = (req as any).user?.id as string | undefined;

    // Fetch the payment to get bookingId and amount.
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status === "verified") {
      return res.status(409).json({ error: "Payment already verified" });
    }

    // 1. Update the payments record.
    const now = new Date();
    const [updated] = await db
      .update(payments)
      .set({
        status: "verified",
        verifiedBy: adminId ?? null,
        verifiedAt: now,
        paidAt: payment.paidAt ?? now,
      })
      .where(eq(payments.id, id))
      .returning();

    // 2. Create a bookingPayments record so payment status computation is accurate.
    // Idempotency: check if a record for this payment already exists before inserting.
    const alreadyRecorded = await db
      .select({ id: bookingPayments.id })
      .from(bookingPayments)
      .where(
        and(
          eq(bookingPayments.bookingId, payment.bookingId),
          eq(bookingPayments.referenceNumber, `manual-${payment.id}`),
          eq(bookingPayments.isVoided, false),
        ),
      )
      .limit(1);

    if (alreadyRecorded.length === 0) {
      await db.insert(bookingPayments).values({
        id: crypto.randomUUID(),
        bookingId: payment.bookingId,
        type: payment.paymentType ?? "manual",
        amount: payment.amount,
        paidAt: payment.paidAt ?? now,
        method: payment.paymentMethod ?? "transfer",
        referenceNumber: `manual-${payment.id}`,
        notes: `Verified by admin (payment proof: ${payment.proofUrl ?? "n/a"})`,
        recordedBy: adminId ?? null,
        isVoided: false,
        createdAt: now,
      });
    }

    // 3. Sync booking status.
    const { paymentStatus, totalPrice, totalPaid, remaining } =
      await computePaymentStatus(payment.bookingId);
    await syncBookingStatus(payment.bookingId, paymentStatus);

    // 4. Record financial transaction.
    await recordFinancialTransaction({
      bookingId: payment.bookingId,
      amount: payment.amount,
      type: "income",
      category: "booking_payment",
      description: `Manual payment verified by admin (${id})`,
      referenceNumber: `manual-${id}`,
      recordedBy: adminId,
    });

    // 5. In-app notification — fetch userId from booking.
    const [booking] = await db
      .select({ userId: bookings.userId })
      .from(bookings)
      .where(eq(bookings.id, payment.bookingId))
      .limit(1);

    if (booking?.userId) {
      const isFullyPaid = paymentStatus === "paid";
      await createNotification({
        userId: booking.userId,
        title: isFullyPaid ? "Pembayaran Lunas ✓" : "Pembayaran Dikonfirmasi",
        message: isFullyPaid
          ? "Selamat! Pembayaran Anda telah diverifikasi dan booking sudah dikonfirmasi."
          : `Pembayaran sebesar Rp${payment.amount.toLocaleString("id-ID")} telah diverifikasi. Sisa pembayaran: Rp${remaining.toLocaleString("id-ID")}.`,
      });
    }

    res.json({
      payment: updated,
      summary: { totalPrice, totalPaid, remaining, paymentStatus },
    });

    // Fire-and-forget: email/WA failure must never affect the verify response.
    void emailNotifications.paymentReceived(payment.bookingId, payment.amount);
    void waNotifications.paymentReceived(payment.bookingId, payment.amount);
  } catch (e) {
    console.error("[admin/payments] verify error:", e);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// ── PATCH /reject/:id ─────────────────────────────────────────────────────────
// Admin rejects a manual payment proof (e.g. blurry image, wrong amount).
// Booking status is NOT changed — jamaah should re-upload.

router.patch("/reject/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const adminId = (req as any).user?.id as string | undefined;
    const { reason } = req.body as { reason?: string };

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status === "verified") {
      return res.status(409).json({ error: "Cannot reject an already-verified payment" });
    }

    const now = new Date();
    const [updated] = await db
      .update(payments)
      .set({
        status: "rejected",
        verifiedBy: adminId ?? null,
        verifiedAt: now,
        rejectionReason: reason ?? null,
      })
      .where(eq(payments.id, id))
      .returning();

    // In-app notification to jamaah.
    const [booking] = await db
      .select({ userId: bookings.userId })
      .from(bookings)
      .where(eq(bookings.id, payment.bookingId))
      .limit(1);

    if (booking?.userId) {
      await createNotification({
        userId: booking.userId,
        title: "Bukti Pembayaran Ditolak",
        message: reason
          ? `Bukti pembayaran Anda ditolak: ${reason}. Silakan upload ulang.`
          : "Bukti pembayaran Anda ditolak. Silakan upload ulang bukti yang valid.",
      });
    }

    res.json({ payment: updated });
  } catch (e) {
    console.error("[admin/payments] reject error:", e);
    res.status(500).json({ error: "Failed to reject payment" });
  }
});

router.get("/", async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;

    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const paymentRows = await db
      .select()
      .from(bookingPayments)
      .where(eq(bookingPayments.bookingId, bookingId))
      .orderBy(sql`${bookingPayments.paidAt} asc`);

    const { totalPrice, totalPaid, remaining, paymentStatus } =
      await computePaymentStatus(bookingId);

    const payments = paymentRows.map((p) => BookingPaymentSchema.parse(p));

    res.json(
      BookingPaymentSummarySchema.parse({
        totalPrice,
        totalPaid,
        remaining,
        paymentStatus,
        payments,
      }),
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.post("/", validate(AdminRecordPaymentRequest), async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;
    const body = req.body as AdminRecordPaymentInput;
    const adminId = req.user?.id;

    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const [created] = await db
      .insert(bookingPayments)
      .values({
        id: crypto.randomUUID(),
        bookingId,
        type: body.type,
        amount: body.amount,
        paidAt: new Date(body.paidAt),
        method: body.method ?? null,
        referenceNumber: body.referenceNumber ?? null,
        notes: body.notes ?? null,
        recordedBy: adminId ?? null,
        isVoided: false,
        createdAt: new Date(),
      })
      .returning();

    const { totalPrice, totalPaid, remaining, paymentStatus } =
      await computePaymentStatus(bookingId);
    await syncBookingStatus(bookingId, paymentStatus);

    res.status(201).json({
      payment: BookingPaymentSchema.parse(created),
      summary: { totalPrice, totalPaid, remaining, paymentStatus },
    });
  } catch {
    res.status(500).json({ error: "Failed to record payment" });
  }
});

router.get("/:paymentId", async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;
    const paymentId = req.params.paymentId as string;

    const [payment] = await db
      .select()
      .from(bookingPayments)
      .where(
        and(
          eq(bookingPayments.id, paymentId),
          eq(bookingPayments.bookingId, bookingId),
        ),
      )
      .limit(1);

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    res.json(BookingPaymentSchema.parse(payment));
  } catch {
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});

router.patch(
  "/:paymentId",
  validate(AdminUpdatePaymentRequest),
  async (req, res) => {
    try {
      const bookingId = (req.params as Record<string, string>).bookingId;
      const paymentId = req.params.paymentId as string;
      const updates = req.body as AdminUpdatePaymentInput;

      const setValues: Record<string, unknown> = {};
      if (updates.type !== undefined) setValues.type = updates.type;
      if (updates.amount !== undefined) setValues.amount = updates.amount;
      if (updates.paidAt !== undefined)
        setValues.paidAt = new Date(updates.paidAt);
      if (updates.method !== undefined) setValues.method = updates.method;
      if (updates.referenceNumber !== undefined)
        setValues.referenceNumber = updates.referenceNumber;
      if (updates.notes !== undefined) setValues.notes = updates.notes;

      const [updated] = await db
        .update(bookingPayments)
        .set(setValues)
        .where(
          and(
            eq(bookingPayments.id, paymentId),
            eq(bookingPayments.bookingId, bookingId),
          ),
        )
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Payment not found" });
        return;
      }

      const { totalPrice, totalPaid, remaining, paymentStatus } =
        await computePaymentStatus(bookingId);
      await syncBookingStatus(bookingId, paymentStatus);

      res.json({
        payment: BookingPaymentSchema.parse(updated),
        summary: { totalPrice, totalPaid, remaining, paymentStatus },
      });
    } catch {
      res.status(500).json({ error: "Failed to update payment" });
    }
  },
);

router.delete("/:paymentId", async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;
    const paymentId = req.params.paymentId as string;

    const [voided] = await db
      .update(bookingPayments)
      .set({ isVoided: true })
      .where(
        and(
          eq(bookingPayments.id, paymentId),
          eq(bookingPayments.bookingId, bookingId),
        ),
      )
      .returning();

    if (!voided) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const { totalPrice, totalPaid, remaining, paymentStatus } =
      await computePaymentStatus(bookingId);
    await syncBookingStatus(bookingId, paymentStatus);

    res.json({
      message: "Payment voided successfully",
      summary: { totalPrice, totalPaid, remaining, paymentStatus },
    });
  } catch {
    res.status(500).json({ error: "Failed to void payment" });
  }
});

export default router;
