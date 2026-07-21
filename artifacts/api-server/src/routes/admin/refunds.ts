import { Router } from "express";
import {
  db,
  refundRequests,
  bookings,
  eq,
  desc,
} from "@workspace/db";
import { sendAdminError, isTableMissing } from "../../lib/adminApiError";
import { journalRefundApproved, journalRefundProcessed } from "../../lib/autoJournal";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = await db
      .select({
        id: refundRequests.id,
        userId: refundRequests.userId,
        bookingId: refundRequests.bookingId,
        reason: refundRequests.reason,
        amount: refundRequests.amount,
        bankName: refundRequests.bankName,
        bankAccount: refundRequests.bankAccount,
        accountHolder: refundRequests.accountHolder,
        status: refundRequests.status,
        adminNotes: refundRequests.adminNotes,
        processedBy: refundRequests.processedBy,
        processedAt: refundRequests.processedAt,
        approvedAt: refundRequests.approvedAt,
        refundedAt: refundRequests.refundedAt,
        createdAt: refundRequests.createdAt,
        bookingCode: bookings.bookingCode,
        totalPrice: bookings.totalPrice,
      })
      .from(refundRequests)
      .leftJoin(bookings, eq(refundRequests.bookingId, bookings.id))
      .orderBy(desc(refundRequests.createdAt));
    res.json(data);
  } catch (e) {
    if (isTableMissing(e)) { console.warn("[refunds] table missing — returning []"); return res.json([]); }
    sendAdminError(res, "GET /api/admin/refunds", e);
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { status, adminNotes, processedBy } = req.body;
    const adminId = (req as any).user?.id as string | undefined;
    const now = new Date();

    // Ambil data refund sebelum update (butuh amount & bookingId untuk jurnal)
    const [before] = await db
      .select({
        bookingId: refundRequests.bookingId,
        amount:    refundRequests.amount,
        status:    refundRequests.status,
      })
      .from(refundRequests)
      .where(eq(refundRequests.id, id))
      .limit(1);

    const [updated] = await db
      .update(refundRequests)
      .set({
        status,
        adminNotes,
        processedBy,
        processedAt: now,
        // Track individual transition timestamps for the user-facing timeline
        ...(status === "approved" ? { approvedAt: now } : {}),
        ...(status === "refunded" ? { refundedAt: now } : {}),
      })
      .where(eq(refundRequests.id, id))
      .returning();

    // F-6: Auto-posting jurnal keuangan (fire-and-forget — jangan block response)
    if (before?.bookingId && before?.amount != null) {
      if (status === "approved" && before.status !== "approved") {
        void journalRefundApproved({
          bookingId: before.bookingId,
          amount:    Number(before.amount),
          refundId:  id,
          adminId,
        });
      } else if (status === "refunded" && before.status !== "refunded") {
        void journalRefundProcessed({
          bookingId: before.bookingId,
          amount:    Number(before.amount),
          refundId:  id,
          adminId,
        });
      }
    }

    res.json(updated);
  } catch (e) {
    sendAdminError(res, "PATCH /api/admin/refunds/:id", e);
  }
});

export default router;
