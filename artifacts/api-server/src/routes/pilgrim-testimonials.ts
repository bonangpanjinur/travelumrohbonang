import { Router } from "express";
import { db, pilgrimTestimonials, bookings, eq, and } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

/**
 * GET /pilgrim-testimonials?booking_id=X
 * Returns the current user's testimonials, optionally filtered by booking.
 * Used by the dashboard to check if a testimonial was already submitted.
 */
router.get("/", async (req: any, res) => {
  try {
    const userId = req.user.id as string;
    const bookingId = req.query.booking_id as string | undefined;

    const data = await db
      .select()
      .from(pilgrimTestimonials)
      .where(
        bookingId
          ? and(eq(pilgrimTestimonials.userId, userId), eq(pilgrimTestimonials.bookingId, bookingId))
          : eq(pilgrimTestimonials.userId, userId),
      );

    res.json({ data });
  } catch (err) {
    console.error("[pilgrim-testimonials] GET error:", err);
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

/**
 * POST /pilgrim-testimonials
 * Submit a testimonial for a completed booking.
 * Validates that the authenticated user owns the booking before inserting.
 */
router.post("/", async (req: any, res) => {
  try {
    const userId = req.user.id as string;
    const { bookingId, rating, message } = req.body as {
      bookingId?: string;
      rating?: number;
      message?: string;
    };

    const ratingNum = Number(rating);
    if (!bookingId || !ratingNum) {
      return res.status(400).json({ error: "bookingId and rating are required" });
    }
    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: "rating must be between 1 and 5" });
    }

    // Verify the authenticated user owns this booking (IDOR guard).
    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)))
      .limit(1);

    if (!booking) {
      return res.status(403).json({ error: "You can only submit testimonials for your own bookings" });
    }

    // Idempotency: one testimonial per booking per user.
    const [existing] = await db
      .select({ id: pilgrimTestimonials.id })
      .from(pilgrimTestimonials)
      .where(and(eq(pilgrimTestimonials.bookingId, bookingId), eq(pilgrimTestimonials.userId, userId)))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: "Testimonial already submitted for this booking" });
    }

    // Insert; if a concurrent request races past the read-before-write check,
    // the DB unique index (booking_id, user_id) will throw a conflict error
    // which we catch below and surface as 409.
    const [created] = await db
      .insert(pilgrimTestimonials)
      .values({
        id: crypto.randomUUID(),
        bookingId,
        userId,
        rating: ratingNum,
        message: message?.trim() || null,
        isApproved: false,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (err: any) {
    // PostgreSQL unique-violation code 23505 means a concurrent request
    // already inserted this testimonial — treat as 409 (already exists).
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Testimonial already submitted for this booking" });
    }
    console.error("[pilgrim-testimonials] POST error:", err);
    res.status(500).json({ error: "Failed to submit testimonial" });
  }
});

export default router;
