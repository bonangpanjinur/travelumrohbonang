import { Router } from "express";
import { db, bookings } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  BookingListResponse,
  BookingSchema,
  CreateBookingRequest,
} from "@workspace/api-zod";

const router = Router();

function generateBookingCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return `BNG-${random}`;
}

router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      res.status(400).json({ error: "userId query parameter is required" });
      return;
    }

    const data = await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId));

    res.json(BookingListResponse.parse({ data, total: data.length }));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    res.json(BookingSchema.parse(booking));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateBookingRequest.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const { userId, packageId, departureId, totalPrice, currency, paymentScheme, notes } =
      parsed.data;

    const bookingCode = generateBookingCode();

    const [created] = await db
      .insert(bookings)
      .values({
        id: crypto.randomUUID(),
        bookingCode,
        userId,
        packageId,
        departureId,
        totalPrice,
        currency,
        paymentScheme: paymentScheme ?? null,
        notes: notes ?? null,
        status: "pending",
      })
      .returning();

    res.status(201).json(BookingSchema.parse(created));
  } catch (err) {
    res.status(500).json({ error: "Failed to create booking" });
  }
});

export default router;
