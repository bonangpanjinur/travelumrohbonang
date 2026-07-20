import { Router } from "express";
import {
  db,
  bookings,
  bookingStatusLogs,
  bookingPayments,
  packages,
  packageDepartures,
  departurePrices,
  siteSettings,
  bookingRooms,
  bookingPilgrims,
  profiles,
  branches,
  agents,
  eq,
  and,
  ilike,
  isNull,
  inArray,
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

router.get("/export.xlsx", async (req, res) => {
  try {
    const { status, search, branchId, packageId: exportPackageId, startDate, endDate } = req.query;

    const conditions: ReturnType<typeof sql>[] = [];
    if (status && typeof status === "string" && status !== "all") conditions.push(sql`b.status = ${status}`);
    if (search && typeof search === "string") conditions.push(sql`b.booking_code ILIKE ${"%" + search + "%"}`);
    if (branchId && typeof branchId === "string" && branchId !== "__all__") {
      if (branchId === "__none__") conditions.push(sql`b.branch_id IS NULL`);
      else conditions.push(sql`b.branch_id = ${branchId}`);
    }
    if (exportPackageId && typeof exportPackageId === "string" && exportPackageId !== "__all__") {
      conditions.push(sql`b.package_id = ${exportPackageId}`);
    }
    if (startDate && typeof startDate === "string") conditions.push(sql`dep.departure_date >= ${startDate}`);
    if (endDate && typeof endDate === "string") conditions.push(sql`dep.departure_date <= ${endDate}`);

    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

    const dataResult = await db.execute(sql`
      SELECT
        b.booking_code AS "Kode Booking",
        prof.name      AS "Nama Jamaah",
        prof.email     AS "Email",
        prof.phone     AS "Telepon",
        pkg.title      AS "Paket",
        dep.departure_date AS "Tgl Berangkat",
        br.name        AS "Cabang",
        b.status       AS "Status",
        b.total_price  AS "Total Harga",
        b.payment_scheme AS "Skema",
        b.created_at   AS "Dibuat"
      FROM bookings b
      LEFT JOIN packages           pkg  ON pkg.id  = b.package_id
      LEFT JOIN package_departures dep  ON dep.id  = b.departure_id
      LEFT JOIN profiles           prof ON prof.id = b.user_id
      LEFT JOIN branches           br   ON br.id   = b.branch_id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT 5000
    `);

    const rows = (dataResult as any).rows ?? dataResult;
    const ExcelJSMod = await import("exceljs");
    const ExcelJSCtor = (ExcelJSMod as any).default ?? ExcelJSMod;
    const wb = new ExcelJSCtor.Workbook();
    const ws = wb.addWorksheet("Booking");
    if (rows.length > 0) {
      ws.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k, width: 22 }));
      ws.getRow(1).font = { bold: true };
      rows.forEach((r: any) => ws.addRow(r));
    }
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="bookings-export.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    sendAdminError(res, "GET /api/admin/bookings/export.xlsx", e);
  }
});

router.get("/", async (req, res) => {
  try {
    const { status, userId, search, branchId, packageId, limit, offset, startDate, endDate } = req.query;

    // Build WHERE conditions with Drizzle sql template (parameterised, injection-safe)
    const conditions: ReturnType<typeof sql>[] = [];

    if (status && typeof status === "string" && status !== "all") {
      conditions.push(sql`b.status = ${status}`);
    }
    if (userId && typeof userId === "string") {
      conditions.push(sql`b.user_id = ${userId}`);
    }
    if (search && typeof search === "string") {
      const term = "%" + search + "%";
      conditions.push(sql`(
        b.booking_code ILIKE ${term}
        OR prof.name  ILIKE ${term}
        OR prof.email ILIKE ${term}
        OR b.pic_name ILIKE ${term}
      )`);
    }
    if (branchId && typeof branchId === "string") {
      if (branchId === "__none__") {
        conditions.push(sql`b.branch_id IS NULL`);
      } else if (branchId !== "__all__") {
        conditions.push(sql`b.branch_id = ${branchId}`);
      }
    }
    if (packageId && typeof packageId === "string" && packageId !== "__all__") {
      conditions.push(sql`b.package_id = ${packageId}`);
    }
    if (startDate && typeof startDate === "string") {
      conditions.push(sql`dep.departure_date >= ${startDate}`);
    }
    if (endDate && typeof endDate === "string") {
      conditions.push(sql`dep.departure_date <= ${endDate}`);
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
        LEFT JOIN package_departures dep  ON dep.id  = b.departure_id
        LEFT JOIN profiles           prof ON prof.id = b.user_id
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

    // BK-DB01: Validate agentId exists if provided
    if (agentId) {
      const [agentRow] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.id, agentId))
        .limit(1);
      if (!agentRow) {
        res.status(400).json({ error: "Agen tidak ditemukan" });
        return;
      }
    }

    // BK-DB02: Check remaining quota before creating booking
    if (departureId) {
      const [dep] = await db
        .select({ remainingQuota: packageDepartures.remainingQuota })
        .from(packageDepartures)
        .where(eq(packageDepartures.id, departureId))
        .limit(1);
      if (dep && dep.remainingQuota <= 0) {
        res.status(409).json({ error: "Kuota keberangkatan penuh, tidak dapat membuat booking baru" });
        return;
      }
    }

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

      // BK-DB02: decrement remaining quota inside transaction
      if (departureId) {
        await tx.execute(sql`
          UPDATE package_departures
          SET remaining_quota = GREATEST(0, remaining_quota - 1)
          WHERE id = ${departureId}
        `);
      }

      return newBooking;
    });

    // KB-F02: Log peringatan saat kuota hampir penuh (sisa ≤ 5)
    if (departureId) {
      const [depAfter] = await db
        .select({ remainingQuota: packageDepartures.remainingQuota, quota: packageDepartures.quota })
        .from(packageDepartures)
        .where(eq(packageDepartures.id, departureId))
        .limit(1);
      if (depAfter && depAfter.remainingQuota <= 5) {
        console.warn(
          `[KB-F02] QUOTA WARNING: departure ${departureId} — sisa ${depAfter.remainingQuota}/${depAfter.quota} tempat`,
        );
      }
    }

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
      const { status: newStatus, notes } = req.body as AdminUpdateBookingStatusInput;

      // ── State-machine validation ───────────────────────────────────────────
      // Prevent illegal transitions (e.g. cancelled → completed).
      const VALID_TRANSITIONS: Record<string, string[]> = {
        pending:   ["confirmed", "cancelled"],
        confirmed: ["completed", "cancelled"],
        completed: [],   // terminal — tidak bisa balik
        cancelled: [],   // terminal — tidak bisa balik
      };

      const [current] = await db
        .select({ status: bookings.status, departureId: bookings.departureId })
        .from(bookings)
        .where(eq(bookings.id, id))
        .limit(1);

      if (!current) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }

      const allowed = VALID_TRANSITIONS[current.status] ?? [];
      if (current.status !== newStatus && !allowed.includes(newStatus)) {
        res.status(400).json({
          error: "Transisi status tidak valid",
          detail: `Status '${current.status}' tidak bisa diubah ke '${newStatus}'. Transisi yang diizinkan: ${allowed.length ? allowed.join(", ") : "tidak ada (status final)"}`,
        });
        return;
      }
      // ──────────────────────────────────────────────────────────────────────

      const updateData: Record<string, any> = { status: newStatus };
      if (notes !== undefined) updateData.notes = notes;

      // BK-DB02: wrap status update + quota restoration in a single transaction
      // BK-03: log the status change inside the same transaction
      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(bookings)
          .set(updateData)
          .where(eq(bookings.id, id))
          .returning();

        if (!row) return null;

        // Restore quota when booking transitions to cancelled
        if (newStatus === "cancelled" && current.status !== "cancelled" && current.departureId) {
          await tx.execute(sql`
            UPDATE package_departures
            SET remaining_quota = remaining_quota + 1
            WHERE id = ${current.departureId}
          `);
        }

        // BK-03: Log status change audit trail
        await tx.insert(bookingStatusLogs).values({
          id: crypto.randomUUID(),
          bookingId: id,
          fromStatus: current.status,
          toStatus: newStatus,
          changedBy: (req as any).user?.id ?? "admin",
          notes: notes ?? null,
        });

        return row;
      });

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

// BK-03: Riwayat perubahan status booking
router.get("/:id/status-logs", async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await db
      .select()
      .from(bookingStatusLogs)
      .where(eq(bookingStatusLogs.bookingId, id))
      .orderBy(desc(bookingStatusLogs.createdAt));
    res.json(logs);
  } catch (e) {
    console.error("[GET /api/admin/bookings/:id/status-logs]", e);
    res.status(500).json({ error: "Failed to fetch status logs" });
  }
});

// BK-F02: Bulk update status banyak booking sekaligus
router.patch("/bulk-status", async (req, res) => {
  try {
    const { ids, status: newStatus } = req.body as { ids: string[]; status: string };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids harus berupa array" });
      return;
    }
    const ALLOWED = ["confirmed", "cancelled"];
    if (!ALLOWED.includes(newStatus)) {
      res.status(400).json({ error: `Status '${newStatus}' tidak didukung untuk bulk action. Gunakan: ${ALLOWED.join(", ")}` });
      return;
    }

    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .update(bookings)
        .set({ status: newStatus })
        .where(inArray(bookings.id, ids))
        .returning({ id: bookings.id, departureId: bookings.departureId, status: bookings.status });

      // Log each change + restore quota for cancelled
      for (const row of rows) {
        await tx.insert(bookingStatusLogs).values({
          id: crypto.randomUUID(),
          bookingId: row.id,
          fromStatus: null, // bulk — kita tidak fetch status lama satu-satu
          toStatus: newStatus,
          changedBy: (req as any).user?.id ?? "admin-bulk",
          notes: "Bulk status update",
        });
        if (newStatus === "cancelled" && row.departureId) {
          await tx.execute(sql`
            UPDATE package_departures SET remaining_quota = remaining_quota + 1 WHERE id = ${row.departureId}
          `);
        }
      }
      return rows.length;
    });

    res.json({ updated, status: newStatus });
  } catch (e) {
    console.error("[PATCH /api/admin/bookings/bulk-status]", e);
    res.status(500).json({ error: "Failed to bulk update status" });
  }
});

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

// ── Invoice data — full data for client-side invoice generation ───────────────
router.get("/:id/invoice-data", async (req, res) => {
  try {
    const { id } = req.params;

    const [bookingResult, pilgrimsResult, roomsResult, paymentsResult, brandingResult] =
      await Promise.all([
        db.execute(sql`
          SELECT
            b.booking_code, b.total_price, b.status, b.created_at,
            pkg.title      AS package_title,
            dep.departure_date,
            prof.name      AS customer_name,
            prof.email     AS customer_email
          FROM bookings b
          LEFT JOIN packages           pkg  ON pkg.id  = b.package_id
          LEFT JOIN package_departures dep  ON dep.id  = b.departure_id
          LEFT JOIN profiles           prof ON prof.id = b.user_id
          WHERE b.id = ${id}
          LIMIT 1
        `),
        db.select().from(bookingPilgrims).where(eq(bookingPilgrims.bookingId, id)),
        db.select().from(bookingRooms).where(eq(bookingRooms.bookingId, id)),
        db.execute(sql`
          SELECT type, amount, paid_at, method, is_voided
          FROM booking_payments
          WHERE booking_id = ${id} AND is_voided = false
          ORDER BY paid_at ASC NULLS LAST
        `),
        db.execute(sql`
          SELECT value FROM site_settings
          WHERE key = 'branding' AND category = 'general'
          LIMIT 1
        `),
      ]);

    const bRows = (bookingResult as any).rows ?? bookingResult;
    const booking = bRows[0];
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const payRows = (paymentsResult as any).rows ?? paymentsResult;
    const brandRows = (brandingResult as any).rows ?? brandingResult;
    const branding: any = brandRows[0]?.value ?? {};

    res.json({
      bookingCode: booking.booking_code,
      customerName: booking.customer_name || "-",
      customerEmail: booking.customer_email || "-",
      packageTitle: booking.package_title || "-",
      departureDate: booking.departure_date || null,
      totalPrice: Number(booking.total_price) || 0,
      createdAt: booking.created_at,
      status: booking.status,
      pilgrims: (pilgrimsResult || []).map((p: any) => ({
        name: p.name,
        gender: p.gender,
      })),
      rooms: (roomsResult || []).map((r: any) => ({
        room_type: r.roomType,
        quantity: r.quantity,
        price: Number(r.price),
        subtotal: Number(r.subtotal),
      })),
      payments: payRows.map((p: any) => ({
        payment_type: p.type,
        amount: Number(p.amount),
        status: "paid",
        paid_at: p.paid_at,
      })),
      companyName: branding.company_name || "UmrohPlus",
      companyTagline: branding.tagline || "Travel & Tours",
      logoUrl: branding.logo_url || "",
    });
  } catch (e) {
    sendAdminError(res, "GET /api/admin/bookings/:id/invoice-data", e);
  }
});

// ── Change room type ───────────────────────────────────────────────────────────
router.patch("/:id/room", async (req, res) => {
  try {
    const { id } = req.params;
    const { roomType, quantity, price, subtotal } = req.body;

    if (!roomType || !quantity || price === undefined || subtotal === undefined) {
      res.status(400).json({ error: "roomType, quantity, price, subtotal wajib diisi" });
      return;
    }

    await db.transaction(async (tx: any) => {
      // Replace existing rooms with the new one
      await tx.delete(bookingRooms).where(eq(bookingRooms.bookingId, id));
      await tx.insert(bookingRooms).values({
        id: crypto.randomUUID(),
        bookingId: id,
        roomType: String(roomType),
        price: String(price),
        quantity: Number(quantity),
        subtotal: String(subtotal),
        createdAt: new Date(),
      });
      // Update booking total price
      await tx
        .update(bookings)
        .set({ totalPrice: Number(subtotal) })
        .where(eq(bookings.id, id));

      // Audit log
      await tx.insert(bookingStatusLogs).values({
        id: crypto.randomUUID(),
        bookingId: id,
        fromStatus: null,
        toStatus: "room_changed",
        changedBy: (req as any).user?.id ?? "admin",
        notes: `Kamar diubah ke ${roomType} × ${quantity} pax @ Rp ${Number(price).toLocaleString("id-ID")}`,
      });
    });

    res.json({ message: "Kamar berhasil diubah" });
  } catch (e) {
    sendAdminError(res, "PATCH /api/admin/bookings/:id/room", e);
  }
});

// ── Change departure date ─────────────────────────────────────────────────────
router.patch("/:id/departure", async (req, res) => {
  try {
    const { id } = req.params;
    const { departureId } = req.body;

    if (!departureId) {
      res.status(400).json({ error: "departureId wajib diisi" });
      return;
    }

    // Get current booking's departure
    const [current] = await db
      .select({ departureId: bookings.departureId, status: bookings.status })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!current) {
      res.status(404).json({ error: "Booking tidak ditemukan" });
      return;
    }

    // Validate new departure exists and has quota
    const [newDep] = await db
      .select({
        remainingQuota: packageDepartures.remainingQuota,
        departureDate: packageDepartures.departureDate,
      })
      .from(packageDepartures)
      .where(eq(packageDepartures.id, departureId))
      .limit(1);

    if (!newDep) {
      res.status(404).json({ error: "Keberangkatan tidak ditemukan" });
      return;
    }
    if (newDep.remainingQuota <= 0) {
      res.status(409).json({ error: "Kuota keberangkatan penuh" });
      return;
    }

    await db.transaction(async (tx: any) => {
      // Restore quota on the old departure
      if (current.departureId && current.departureId !== departureId) {
        await tx.execute(
          sql`UPDATE package_departures SET remaining_quota = remaining_quota + 1 WHERE id = ${current.departureId}`
        );
      }
      // Consume quota on the new departure
      await tx.execute(
        sql`UPDATE package_departures SET remaining_quota = GREATEST(0, remaining_quota - 1) WHERE id = ${departureId}`
      );
      // Update booking
      await tx.update(bookings).set({ departureId }).where(eq(bookings.id, id));
      // Audit log
      await tx.insert(bookingStatusLogs).values({
        id: crypto.randomUUID(),
        bookingId: id,
        fromStatus: null,
        toStatus: "departure_changed",
        changedBy: (req as any).user?.id ?? "admin",
        notes: `Keberangkatan diubah ke ${newDep.departureDate}`,
      });
    });

    res.json({ message: "Keberangkatan berhasil diubah", departureDate: newDep.departureDate });
  } catch (e) {
    sendAdminError(res, "PATCH /api/admin/bookings/:id/departure", e);
  }
});

export default router;
