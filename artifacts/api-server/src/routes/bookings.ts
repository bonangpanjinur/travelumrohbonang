import { Router } from "express";
import { db, bookings, packages, packageDepartures } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  BookingListResponse,
  BookingWithDetailsSchema,
  BookingSchema,
  CreateBookingRequest,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

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
    const userId = req.user!.id;

    const data = await db
      .select({
        id: bookings.id,
        bookingCode: bookings.bookingCode,
        userId: bookings.userId,
        packageId: bookings.packageId,
        departureId: bookings.departureId,
        branchId: bookings.branchId,
        status: bookings.status,
        totalPrice: bookings.totalPrice,
        currency: bookings.currency,
        paymentScheme: bookings.paymentScheme,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        packageTitle: packages.title,
        packageSlug: packages.slug,
        departureDate: packageDepartures.departureDate,
      })
      .from(bookings)
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(
        packageDepartures,
        eq(bookings.departureId, packageDepartures.id),
      )
      .where(eq(bookings.userId, userId));

    res.json(BookingListResponse.parse({ data, total: data.length }));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [row] = await db
      .select({
        id: bookings.id,
        bookingCode: bookings.bookingCode,
        userId: bookings.userId,
        packageId: bookings.packageId,
        departureId: bookings.departureId,
        branchId: bookings.branchId,
        status: bookings.status,
        totalPrice: bookings.totalPrice,
        currency: bookings.currency,
        paymentScheme: bookings.paymentScheme,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        packageTitle: packages.title,
        packageSlug: packages.slug,
        departureDate: packageDepartures.departureDate,
      })
      .from(bookings)
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(
        packageDepartures,
        eq(bookings.departureId, packageDepartures.id),
      )
      .where(and(eq(bookings.id, id), eq(bookings.userId, req.user!.id)))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    res.json(BookingWithDetailsSchema.parse(row));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateBookingRequest.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid request body",
        details: parsed.error.flatten(),
      });
      return;
    }

    const { packageId, departureId, totalPrice, currency, paymentScheme, notes, picType, picId, agentId } =
      parsed.data;

    const userId = req.user!.id;
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
        status: "draft",
        picType: picType ?? null,
        picId: picId ?? null,
        agentId: agentId ?? null,
      })
      .returning();

    res.status(201).json(BookingSchema.parse(created));
  } catch (err) {
    res.status(500).json({ error: "Failed to create booking" });
  }
});

export default router;
