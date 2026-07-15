import { Router } from "express";
import {
  db,
  refundRequests,
  bookings,
  eq,
  desc,
} from "@workspace/db";

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
        createdAt: refundRequests.createdAt,
        bookingCode: bookings.bookingCode,
        totalPrice: bookings.totalPrice,
      })
      .from(refundRequests)
      .leftJoin(bookings, eq(refundRequests.bookingId, bookings.id))
      .orderBy(desc(refundRequests.createdAt));
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch refunds" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { status, adminNotes, processedBy } = req.body;
    const [updated] = await db
      .update(refundRequests)
      .set({
        status,
        adminNotes,
        processedBy,
        processedAt: new Date(),
      })
      .where(eq(refundRequests.id, id))
      .returning();
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update refund request" });
  }
});

export default router;
