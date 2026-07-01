import { Router } from "express";
import { db, bookings, packages, packageDepartures, bookingRooms, bookingPilgrims } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  BookingListResponse,
  BookingWithDetailsSchema,
  BookingSchema,
  CreateBookingRequest,
  CreateBookingRoomsRequest,
  CreateBookingPilgrimsRequest,
  BookingRoomSchema,
  BookingPilgrimSchema,
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

router.post("/:id/rooms", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .limit(1);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const parsed = CreateBookingRoomsRequest.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const rows = parsed.data.rooms.map((r) => ({
      id: crypto.randomUUID(),
      bookingId: id,
      roomType: r.roomType,
      price: String(r.price),
      quantity: r.quantity,
      subtotal: String(r.subtotal),
    }));

    const created = await db.insert(bookingRooms).values(rows).returning();

    res.status(201).json({ data: created.map((r) => BookingRoomSchema.parse(r)) });
  } catch (err) {
    res.status(500).json({ error: "Failed to create booking rooms" });
  }
});

router.post("/:id/pilgrims", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .limit(1);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const parsed = CreateBookingPilgrimsRequest.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const rows = parsed.data.pilgrims.map((p) => ({
      id: crypto.randomUUID(),
      bookingId: id,
      name: p.name,
      phone: p.phone ?? null,
      email: p.email ?? null,
      gender: p.gender,
      nik: p.nik ?? null,
    }));

    const created = await db.insert(bookingPilgrims).values(rows).returning();

    res.status(201).json({ data: created.map((p) => BookingPilgrimSchema.parse(p)) });
  } catch (err) {
    res.status(500).json({ error: "Failed to create booking pilgrims" });
  }
});

export default router;
