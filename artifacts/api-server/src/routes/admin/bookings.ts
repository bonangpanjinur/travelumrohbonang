import { Router } from "express";
import {
  db,
  bookings,
  packages,
  packageDepartures,
  bookingRooms,
  bookingPilgrims,
  profiles,
  branches,
  agents,
  eq,
  and,
  ilike,
  isNull,
  desc,
  sql,
} from "@workspace/db";
import {
  BookingListResponse,
  BookingWithDetailsSchema,
  AdminUpdateBookingStatusRequest,
  type AdminUpdateBookingStatusInput,
} from "@workspace/api-zod";
import { validate } from "../../middlewares/validate";
import { sendAdminError } from "../../lib/adminApiError";
import { awardLoyaltyPointsForBooking } from "../../lib/loyalty";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { status, userId, search, branchId, limit, offset } = req.query;

    const conditions = [];

    if (status && typeof status === "string" && status !== "all") {
      conditions.push(eq(bookings.status, status));
    }

    if (userId && typeof userId === "string") {
      conditions.push(eq(bookings.userId, userId));
    }

    if (search && typeof search === "string") {
      conditions.push(ilike(bookings.bookingCode, `%${search}%`));
    }

    if (branchId && typeof branchId === "string") {
      if (branchId === "__none__") {
        conditions.push(isNull(bookings.branchId));
      } else if (branchId !== "__all__") {
        conditions.push(eq(bookings.branchId, branchId));
      }
    }

    const baseQuery = db
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
        picType: bookings.picType,
        picId: bookings.picId,
        isGroupBooking: bookings.isGroupBooking,
        groupName: bookings.groupName,
        picName: bookings.picName,
        picPhone: bookings.picPhone,
        picEmail: bookings.picEmail,
        packageTitle: packages.title,
        packageSlug: packages.slug,
        departureDate: packageDepartures.departureDate,
        userName: profiles.name,
        userEmail: profiles.email,
        branchName: branches.name,
      })
      .from(bookings)
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(
        packageDepartures,
        eq(bookings.departureId, packageDepartures.id),
      )
      .leftJoin(profiles, eq(bookings.userId, profiles.id))
      .leftJoin(branches, eq(bookings.branchId, branches.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Run data query and count query in parallel for correct pagination totals
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [data, countResult] = await Promise.all([
      baseQuery
        .orderBy(desc(bookings.createdAt))
        .limit(Number(limit) || 100)
        .offset(Number(offset) || 0),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookings)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    res.json({ data, total });
  } catch (e) {
    sendAdminError(res, "GET /api/admin/bookings", e);
  }
});

router.get("/recent", async (req, res) => {
  try {
    const data = await db
      .select({
        id: bookings.id,
        bookingCode: bookings.bookingCode,
        createdAt: bookings.createdAt,
        userName: profiles.name,
      })
      .from(bookings)
      .leftJoin(profiles, eq(bookings.userId, profiles.id))
      .orderBy(desc(bookings.createdAt))
      .limit(20);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch recent bookings" });
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
        picType: bookings.picType,
        picId: bookings.picId,
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
      .select({
        id: profiles.id,
        name: profiles.name,
        email: profiles.email,
        phone: profiles.phone,
      })
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

router.post("/", async (req, res) => {
  try {
    const {
      packageId,
      departureId,
      totalPrice,
      currency,
      paymentScheme,
      notes,
      branchId,
      agentId,
      userId,
      customerName,
      customerEmail,
      roomType,
    } = req.body;

    let bookingCode = `BNG-ADM-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const existingCode = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.bookingCode, bookingCode)).limit(1);
    if (existingCode.length) {
      bookingCode = `BNG-ADM-${Date.now().toString(36).toUpperCase()}`;
    }

    const booking = await db.transaction(async (tx) => {
      const [newBooking] = await tx
        .insert(bookings)
        .values({
          id: crypto.randomUUID(),
          bookingCode,
          packageId,
          departureId,
          totalPrice,
          currency: currency || "IDR",
          paymentScheme: paymentScheme || "full",
          notes,
          branchId,
          agentId,
          userId,
          status: "confirmed",
          picType: "admin",
          createdAt: new Date(),
        })
        .returning();

      await tx.insert(bookingRooms).values({
        id: crypto.randomUUID(),
        bookingId: newBooking.id,
        roomType,
        price: String(totalPrice),
        quantity: 1,
        subtotal: String(totalPrice),
        createdAt: new Date(),
      });

      if (customerName && !userId) {
        await tx.insert(bookingPilgrims).values({
          id: crypto.randomUUID(),
          bookingId: newBooking.id,
          name: customerName,
          email: customerEmail,
          gender: "male",
          createdAt: new Date(),
        });
      }

      return newBooking;
    });

    res.status(201).json(booking);
  } catch (e) {
    console.error("[POST /api/admin/bookings]", e);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

router.patch(
  "/:id/status",
  validate(AdminUpdateBookingStatusRequest),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const { status, notes } = req.body as AdminUpdateBookingStatusInput;

      const updateData: Record<string, any> = { status };
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

      // Auto-award loyalty points (1 point / Rp 100.000) the first time a
      // booking transitions to "completed". Idempotent — safe on retries.
      if (updated.status === "completed") {
        awardLoyaltyPointsForBooking(
          updated.id,
          updated.userId,
          updated.totalPrice,
        ).catch((err) => {
          console.error("[loyalty] Failed to auto-award points:", err);
        });
      }

      res.json({ id: updated.id, status: updated.status, notes: updated.notes });
    } catch (e) {
      console.error("[PATCH /api/admin/bookings/:id/status]", e);
      res.status(500).json({ error: "Failed to update booking status" });
    }
  },
);

router.patch("/:id/branch", async (req, res) => {
  try {
    const id = req.params.id;
    const { branchId } = req.body;
    await db
      .update(bookings)
      .set({ branchId: branchId || null })
      .where(eq(bookings.id, id));
    res.status(204).end();
  } catch (e) {
    console.error("[PATCH /api/admin/bookings/:id/branch]", e);
    res.status(500).json({ error: "Failed to update branch" });
  }
});

export default router;
