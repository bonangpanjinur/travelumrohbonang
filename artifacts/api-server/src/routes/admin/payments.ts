import { Router } from "express";
import { db, bookings, bookingPayments, eq, and, sum, sql } from "@workspace/db";
import {
  AdminRecordPaymentRequest,
  AdminUpdatePaymentRequest,
  BookingPaymentSchema,
  BookingPaymentSummarySchema,
  type AdminRecordPaymentInput,
  type AdminUpdatePaymentInput,
} from "@workspace/api-zod";
import { validate } from "../../middlewares/validate";

const router = Router({ mergeParams: true });

async function computePaymentStatus(
  bookingId: string,
): Promise<{ totalPrice: number; totalPaid: number; remaining: number; paymentStatus: "unpaid" | "partial" | "paid" }> {
  const [booking] = await db
    .select({ totalPrice: bookings.totalPrice })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  const totalPrice = booking?.totalPrice ?? 0;

  const [result] = await db
    .select({ total: sum(bookingPayments.amount) })
    .from(bookingPayments)
    .where(and(eq(bookingPayments.bookingId, bookingId), eq(bookingPayments.isVoided, false)));

  const totalPaid = Number(result?.total ?? 0);
  const remaining = totalPrice - totalPaid;

  let paymentStatus: "unpaid" | "partial" | "paid";
  if (totalPaid <= 0) {
    paymentStatus = "unpaid";
  } else if (totalPaid >= totalPrice) {
    paymentStatus = "paid";
  } else {
    paymentStatus = "partial";
  }

  return { totalPrice, totalPaid, remaining, paymentStatus };
}

async function syncBookingStatus(bookingId: string, paymentStatus: "unpaid" | "partial" | "paid") {
  const [current] = await db
    .select({ status: bookings.status })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!current || current.status === "cancelled" || current.status === "completed") return;

  let newStatus: string | null = null;

  if (paymentStatus === "paid" && current.status !== "confirmed") {
    newStatus = "confirmed";
  } else if (paymentStatus === "partial" && current.status === "draft") {
    newStatus = "pending";
  } else if (paymentStatus === "unpaid" && current.status === "pending") {
    newStatus = "draft";
  }

  if (newStatus) {
    await db.update(bookings).set({ status: newStatus }).where(eq(bookings.id, bookingId));
  }
}

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

    const { totalPrice, totalPaid, remaining, paymentStatus } = await computePaymentStatus(bookingId);

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

    const { totalPrice, totalPaid, remaining, paymentStatus } = await computePaymentStatus(bookingId);
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
      .where(and(eq(bookingPayments.id, paymentId), eq(bookingPayments.bookingId, bookingId)))
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

router.patch("/:paymentId", validate(AdminUpdatePaymentRequest), async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;
    const paymentId = req.params.paymentId as string;
    const updates = req.body as AdminUpdatePaymentInput;

    const setValues: Record<string, unknown> = {};
    if (updates.type !== undefined) setValues.type = updates.type;
    if (updates.amount !== undefined) setValues.amount = updates.amount;
    if (updates.paidAt !== undefined) setValues.paidAt = new Date(updates.paidAt);
    if (updates.method !== undefined) setValues.method = updates.method;
    if (updates.referenceNumber !== undefined) setValues.referenceNumber = updates.referenceNumber;
    if (updates.notes !== undefined) setValues.notes = updates.notes;

    const [updated] = await db
      .update(bookingPayments)
      .set(setValues)
      .where(and(eq(bookingPayments.id, paymentId), eq(bookingPayments.bookingId, bookingId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const { totalPrice, totalPaid, remaining, paymentStatus } = await computePaymentStatus(bookingId);
    await syncBookingStatus(bookingId, paymentStatus);

    res.json({
      payment: BookingPaymentSchema.parse(updated),
      summary: { totalPrice, totalPaid, remaining, paymentStatus },
    });
  } catch {
    res.status(500).json({ error: "Failed to update payment" });
  }
});

router.delete("/:paymentId", async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;
    const paymentId = req.params.paymentId as string;

    const [voided] = await db
      .update(bookingPayments)
      .set({ isVoided: true })
      .where(and(eq(bookingPayments.id, paymentId), eq(bookingPayments.bookingId, bookingId)))
      .returning();

    if (!voided) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const { totalPrice, totalPaid, remaining, paymentStatus } = await computePaymentStatus(bookingId);
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
