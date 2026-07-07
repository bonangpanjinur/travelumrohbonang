import { Router } from "express";
import { db, bookingPilgrims, bookings, eq } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

/**
 * GET /api/pilgrims/my
 * Returns all booking_pilgrims rows that belong to the current user's bookings.
 */
router.get("/my", async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Get the user's booking IDs first
    const userBookings = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.userId, userId));

    if (userBookings.length === 0) {
      return res.json([]);
    }

    // Fetch pilgrim rows for those bookings using a join
    const pilgrims = await db
      .select({
        id: bookingPilgrims.id,
        bookingId: bookingPilgrims.bookingId,
        name: bookingPilgrims.name,
        passportNumber: bookingPilgrims.passportNumber,
        gender: bookingPilgrims.gender,
        nik: bookingPilgrims.nik,
        birthDate: bookingPilgrims.birthDate,
        nationality: bookingPilgrims.nationality,
        roomType: bookingPilgrims.roomType,
        passportExpiry: bookingPilgrims.passportExpiry,
        createdAt: bookingPilgrims.createdAt,
      })
      .from(bookingPilgrims)
      .innerJoin(bookings, eq(bookingPilgrims.bookingId, bookings.id))
      .where(eq(bookings.userId, userId));

    res.json(pilgrims);
  } catch (err: any) {
    console.error("[pilgrims/my]", err.message);
    res.status(500).json({ error: "Failed to fetch pilgrims" });
  }
});

export default router;
