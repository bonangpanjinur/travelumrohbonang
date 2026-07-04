import { Router } from "express";
import {
  db,
  bookings,
  packages,
  packageDepartures,
  bookingRooms,
  bookingPilgrims,
  payments,
  paymentProofAccessLogs,
  refundRequests,
  eq,
  and,
  desc,
} from "@workspace/db";
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
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
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
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));

    res.json(BookingListResponse.parse({ data, total: data.length }));
  } catch {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// --- Refunds (must be before /:id to avoid /:id swallowing "refunds" as an id) ---

router.get("/refunds", async (req, res) => {
  try {
    const userId = req.user!.id;
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
        createdAt: refundRequests.createdAt,
        bookingCode: bookings.bookingCode,
      })
      .from(refundRequests)
      .leftJoin(bookings, eq(refundRequests.bookingId, bookings.id))
      .where(eq(refundRequests.userId, userId))
      .orderBy(desc(refundRequests.createdAt));

    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch refunds" });
  }
});

router.post("/refunds", async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      bookingId,
      reason,
      amount,
      bankName,
      bankAccount,
      accountHolder,
    } = req.body;

    const [created] = await db
      .insert(refundRequests)
      .values({
        id: crypto.randomUUID(),
        userId,
        bookingId,
        reason,
        amount,
        bankName,
        bankAccount,
        accountHolder,
        status: "pending",
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: "Failed to create refund request" });
  }
});

// --- Single booking (after static sub-routes) ---

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
        returnDate: packageDepartures.returnDate,
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

    const rooms = await db
      .select()
      .from(bookingRooms)
      .where(eq(bookingRooms.bookingId, id));

    const pilgrims = await db
      .select()
      .from(bookingPilgrims)
      .where(eq(bookingPilgrims.bookingId, id));

    res.json({
      ...BookingWithDetailsSchema.parse(row),
      rooms,
      pilgrims,
    });
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

    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
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
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json(BookingSchema.parse(created));
  } catch {
    res.status(500).json({ error: "Failed to create booking" });
  }
});

router.post(
  "/:id/rooms",
  validate(CreateBookingRoomsRequest),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      if (!req.isAuthenticated()) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
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
        createdAt: new Date(),
      }));

      const created = await db.insert(bookingRooms).values(rows).returning();

      res
        .status(201)
        .json({ data: created.map((r) => BookingRoomSchema.parse(r)) });
    } catch {
      res.status(500).json({ error: "Failed to create booking rooms" });
    }
  },
);

router.post(
  "/:id/pilgrims",
  validate(CreateBookingPilgrimsRequest),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      if (!req.isAuthenticated()) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
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
        createdAt: new Date(),
      }));

      const created = await db.insert(bookingPilgrims).values(rows).returning();

      res
        .status(201)
        .json({ data: created.map((p) => BookingPilgrimSchema.parse(p)) });
    } catch {
      res.status(500).json({ error: "Failed to create booking pilgrims" });
    }
  },
);

// --- Payments ---

router.get("/:id/payments", async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user!.id;

    // Verify ownership before fetching any data
    const [booking] = await db
      .select({ userId: bookings.userId })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking || booking.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const data = await db
      .select()
      .from(payments)
      .where(and(eq(payments.bookingId, id)))
      .orderBy(desc(payments.createdAt));

    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.post("/:id/payments", async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user!.id;
    const { amount, paymentMethod, paymentType, proofUrl } = req.body;

    const [booking] = await db
      .select({ userId: bookings.userId })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking || booking.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [created] = await db
      .insert(payments)
      .values({
        id: crypto.randomUUID(),
        bookingId: id,
        amount,
        paymentMethod,
        paymentType,
        proofUrl,
        status: "pending",
        createdAt: new Date(),
      })
      .returning();

    await db
      .update(bookings)
      .set({ status: "waiting_payment" })
      .where(eq(bookings.id, id));

    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: "Failed to create payment" });
  }
});

router.post("/payments/proof-access-log", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookingId, paymentId, context } = req.body;

    await db.insert(paymentProofAccessLogs).values({
      id: crypto.randomUUID(),
      userId,
      bookingId,
      paymentId,
      context,
      createdAt: new Date(),
    });

    res.status(204).end();
  } catch {
    res.status(500).json({ error: "Failed to log access" });
  }
});

export default router;
