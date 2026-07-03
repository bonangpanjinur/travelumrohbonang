import { Router } from "express";
import { db, bookings, packages, packageDepartures, bookingRooms, bookingPilgrims, eq, and } from "@workspace/db";
import {
  BookingListResponse,
  BookingWithDetailsSchema,
  BookingSchema,
  CreateBookingRequest,
  CreateBookingRoomsRequest,
  CreateBookingPilgrimsRequest,
  BookingRoomSchema,
  BookingPilgrimSchema,
  type CreateBookingInput,
  type BookingRoom,
  type BookingPilgrim,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";

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
    if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
    const userId = req.user.id;

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
  } catch {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const id = req.params.id as string;

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
      .where(and(eq(bookings.id, id), eq(bookings.userId, req.user.id)))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    res.json(BookingWithDetailsSchema.parse(row));
  } catch {
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

router.post("/", validate(CreateBookingRequest), async (req, res) => {
  try {
    const {
      packageId,
      departureId,
      totalPrice,
      currency,
      paymentScheme,
      notes,
      picType,
      picId,
      agentId,
    } = req.body as CreateBookingInput;

    if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
    const userId = req.user.id;
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
  } catch {
    res.status(500).json({ error: "Failed to create booking" });
  }
});

router.post("/:id/rooms", validate(CreateBookingRoomsRequest), async (req, res) => {
  try {
    const id = req.params.id as string;
    if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
    const userId = req.user.id;

    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .limit(1);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const { rooms } = req.body as { rooms: BookingRoom[] };

    const rows = rooms.map((r) => ({
      id: crypto.randomUUID(),
      bookingId: id,
      roomType: r.roomType,
      price: String(r.price),
      quantity: r.quantity,
      subtotal: String(r.subtotal),
    }));

    const created = await db.insert(bookingRooms).values(rows).returning();

    res.status(201).json({ data: created.map((r) => BookingRoomSchema.parse(r)) });
  } catch {
    res.status(500).json({ error: "Failed to create booking rooms" });
  }
});

router.post("/:id/pilgrims", validate(CreateBookingPilgrimsRequest), async (req, res) => {
  try {
    const id = req.params.id as string;
    if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
    const userId = req.user.id;

    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .limit(1);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const { pilgrims } = req.body as { pilgrims: BookingPilgrim[] };

    const rows = pilgrims.map((p) => ({
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
  } catch {
    res.status(500).json({ error: "Failed to create booking pilgrims" });
  }
});

export default router;
