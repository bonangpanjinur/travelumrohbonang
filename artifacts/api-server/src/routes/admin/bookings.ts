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

    // Build WHERE conditions with Drizzle sql template (parameterised, injection-safe)
    const conditions: ReturnType<typeof sql>[] = [];

    if (status && typeof status === "string" && status !== "all") {
      conditions.push(sql`b.status = ${status}`);
    }
    if (userId && typeof userId === "string") {
      conditions.push(sql`b.user_id = ${userId}`);
    }
    if (search && typeof search === "string") {
      conditions.push(sql`b.booking_code ILIKE ${"%" + search + "%"}`);
    }
    if (branchId && typeof branchId === "string") {
      if (branchId === "__none__") {
        conditions.push(sql`b.branch_id IS NULL`);
      } else if (branchId !== "__all__") {
        conditions.push(sql`b.branch_id = ${branchId}`);
      }
    }

    const whereClause = conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

    // Raw SQL — avoids referencing columns that may not yet exist in the DB
    // (e.g. is_group_booking / group_name added by a later migration).
    // COALESCE guards against NULL where the schema has a default.
    const [dataResult, countResult] = await Promise.all([
      db.execute(sql`
        SELECT
          b.id,
          b.booking_code        AS "bookingCode",
          b.user_id             AS "userId",
          b.package_id          AS "packageId",
          b.departure_id        AS "departureId",
          b.branch_id           AS "branchId",
          b.status,
          b.total_price         AS "totalPrice",
          b.currency,
          b.payment_scheme      AS "paymentScheme",
          b.notes,
          b.created_at          AS "createdAt",
          b.pic_type            AS "picType",
          b.pic_id              AS "picId",
          COALESCE(b.is_group_booking, false) AS "isGroupBooking",
          b.group_name          AS "groupName",
          b.pic_name            AS "picName",
          b.pic_phone           AS "picPhone",
          b.pic_email           AS "picEmail",
          pkg.title             AS "packageTitle",
          pkg.slug              AS "packageSlug",
          dep.departure_date    AS "departureDate",
          prof.name             AS "userName",
          prof.email            AS "userEmail",
          br.name               AS "branchName"
        FROM bookings b
        LEFT JOIN packages           pkg  ON pkg.id  = b.package_id
        LEFT JOIN package_departures dep  ON dep.id  = b.departure_id
        LEFT JOIN profiles           prof ON prof.id = b.user_id
        LEFT JOIN branches           br   ON br.id   = b.branch_id
        ${whereClause}
        ORDER BY b.created_at DESC
        LIMIT ${Number(limit) || 100}
        OFFSET ${Number(offset) || 0}
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM bookings b
        ${whereClause}
      `),
    ]);

    const data = (dataResult as any).rows ?? dataResult;
    const total = Number(((countResult as any).rows ?? countResult)[0]?.count ?? 0);
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
