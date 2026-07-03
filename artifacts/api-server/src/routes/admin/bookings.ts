import { Router } from "express";
import {
  db,
  bookings,
  packages,
  packageDepartures,
  bookingRooms,
  bookingPilgrims,
  profiles,
  eq,
  and,
} from "@workspace/db";
import {
  BookingListResponse,
  BookingWithDetailsSchema,
  AdminUpdateBookingStatusRequest,
  type AdminUpdateBookingStatusInput,
} from "@workspace/api-zod";
import { validate } from "../../middlewares/validate";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { status, userId } = req.query;

    const conditions = [];

    if (status && typeof status === "string") {
      conditions.push(eq(bookings.status, status));
    }

    if (userId && typeof userId === "string") {
      conditions.push(eq(bookings.userId, userId));
    }

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
      .leftJoin(packageDepartures, eq(bookings.departureId, packageDepartures.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json(BookingListResponse.parse({ data, total: data.length }));
  } catch {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id as string;

    const [booking] = await db
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
      .leftJoin(packageDepartures, eq(bookings.departureId, packageDepartures.id))
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const rooms = await db
      .select()
      .from(bookingRooms)
      .where(eq(bookingRooms.bookingId, id));

    const pilgrims = await db
      .select()
      .from(bookingPilgrims)
      .where(eq(bookingPilgrims.bookingId, id));

    const [user] = await db
      .select({ id: profiles.id, name: profiles.name, email: profiles.email, phone: profiles.phone })
      .from(profiles)
      .where(eq(profiles.id, booking.userId ?? ""))
      .limit(1);

    res.json({
      ...BookingWithDetailsSchema.parse(booking),
      rooms,
      pilgrims,
      user: user ?? null,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

router.patch("/:id/status", validate(AdminUpdateBookingStatusRequest), async (req, res) => {
  try {
    const id = req.params.id as string;
    const { status, notes } = req.body as AdminUpdateBookingStatusInput;

    const updateData: Record<string, string | null> = { status };
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    res.json({ id: updated.id, status: updated.status, notes: updated.notes });
  } catch {
    res.status(500).json({ error: "Failed to update booking status" });
  }
});

export default router;
