import { Router } from "express";
import { db, sql } from "@workspace/db";

const router = Router();

// Public endpoint — no auth required. Returns booking tracking info by booking code.
// Used by the QR code on printed invoices.
router.get("/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const result = await db.execute(sql`
      SELECT
        b.id, b.booking_code, b.total_price, b.status, b.created_at,
        b.payment_scheme,
        pkg.title        AS package_title,
        dep.departure_date,
        dep.return_date,
        prof.name        AS customer_name
      FROM bookings b
      LEFT JOIN packages           pkg  ON pkg.id  = b.package_id
      LEFT JOIN package_departures dep  ON dep.id  = b.departure_id
      LEFT JOIN profiles           prof ON prof.id = b.user_id
      WHERE b.booking_code = ${code}
      LIMIT 1
    `);

    const rows = (result as any).rows ?? result;
    const booking = rows[0];

    if (!booking) {
      res.status(404).json({ error: "Booking tidak ditemukan" });
      return;
    }

    const paymentsResult = await db.execute(sql`
      SELECT type, amount, paid_at, method
      FROM booking_payments
      WHERE booking_id = ${booking.id} AND is_voided = false
      ORDER BY paid_at ASC NULLS LAST
    `);
    const payments = (paymentsResult as any).rows ?? paymentsResult;

    const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const totalPrice = Number(booking.total_price) || 0;

    res.json({
      bookingCode: booking.booking_code,
      status: booking.status,
      paymentScheme: booking.payment_scheme,
      packageTitle: booking.package_title || "-",
      departureDate: booking.departure_date || null,
      returnDate: booking.return_date || null,
      customerName: booking.customer_name || "-",
      totalPrice,
      totalPaid,
      remaining: Math.max(0, totalPrice - totalPaid),
      createdAt: booking.created_at,
      payments: payments.map((p: any) => ({
        type: p.type,
        amount: Number(p.amount),
        paidAt: p.paid_at,
        method: p.method,
      })),
    });
  } catch (e) {
    console.error("[GET /api/track/:code]", e);
    res.status(500).json({ error: "Gagal memuat data tracking" });
  }
});

export default router;
