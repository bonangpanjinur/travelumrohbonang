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
  packageCommissions,
  agentCommissions,
  profiles,
  branches,
  agents,
  currencies,
  eq,
  and,
  or,
  ilike,
  isNull,
  inArray,
  desc,
  sql,
} from "@workspace/db";
import { generatePassportRecommendationPdf } from "../../lib/pdf/passportRecommendation";
import { sbGetBooking, sbGetBookingByCode, sbGetPilgrims, sbGetPayments, sbGetPackage, sbGetDeparture, sbGetBranch, sbGetProfile } from "../../lib/supabaseFallback";
import {
  BookingListResponse,
  BookingWithDetailsSchema,
  AdminUpdateBookingStatusRequest,
  type AdminUpdateBookingStatusInput,
} from "@workspace/api-zod";
import { validate } from "../../middlewares/validate";
import { isSeatReservedStatus, syncDepartureQuota } from "../../lib/seatQuota";
import { getApprovalExpiryDate } from "../../lib/bookingApprovalExpiry";
import { sendAdminError } from "../../lib/adminApiError";
import { awardLoyaltyPointsForBooking } from "../../lib/loyalty";
import { requireSuperAdmin, requireStaff } from "../../middlewares/requireAdmin";
import { resolveUserScope } from "../../lib/scopeGuard";
import { buildBookingScopeCondition, isBookingInScope, scopeDeniedMessage } from "../../lib/scopeConditions";
import { buildBookingPaymentSnapshots } from "../../lib/paymentPolicyBooking";
import { addBrandingHeader, getExcelBranding, styleTableBody, styleTableHeader } from "../../lib/excelBranding";

const router = Router();

// ── PIC options — agents + branches list for the "Ubah PIC" dialog ──────────
// Gated by requireStaff so super_admin/owner/admin/branch_manager/staff can use it.
router.get("/pic-options", requireStaff, async (req, res) => {
  try {
    const [agentRows, branchRows] = await Promise.all([
      db.select({ id: agents.id, name: agents.name }).from(agents).orderBy(agents.name),
      db.select({ id: branches.id, name: branches.name }).from(branches).orderBy(branches.name),
    ]);
    res.json({ agents: agentRows, branches: branchRows });
  } catch (e) {
    console.error("[GET /api/admin/bookings/pic-options]", e);
    res.status(500).json({ error: "Gagal memuat opsi PIC" });
  }
});

router.get("/export.xlsx", async (req, res) => {
  try {
    const { status, search, branchId, packageId: exportPackageId, startDate, endDate } = req.query;

    const scope = await resolveUserScope(req);
    const conditions: ReturnType<typeof sql>[] = [buildBookingScopeCondition(scope)];
    if (status && typeof status === "string" && status !== "all") conditions.push(sql`b.status = ${status}`);
    if (search && typeof search === "string") conditions.push(sql`b.booking_code ILIKE ${"%" + search + "%"}`);
    if (scope.type === "global" && branchId && typeof branchId === "string" && branchId !== "__all__") {
      if (branchId === "__none__") conditions.push(sql`b.branch_id IS NULL`);
      else conditions.push(sql`b.branch_id = ${branchId}`);
    }
    if (exportPackageId && typeof exportPackageId === "string" && exportPackageId !== "__all__") {
      conditions.push(sql`b.package_id = ${exportPackageId}`);
    }
    if (startDate && typeof startDate === "string") conditions.push(sql`dep.departure_date >= ${startDate}`);
    if (endDate && typeof endDate === "string") conditions.push(sql`dep.departure_date <= ${endDate}`);

    const whereClause = sql`WHERE ${sql.join(conditions, sql` AND `)}`;

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
      LEFT JOIN profiles           prof ON prof.id::text = b.user_id::text
      LEFT JOIN branches           br   ON br.id   = b.branch_id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT 5000
    `);

    const rows = (dataResult as any).rows ?? dataResult;
    const ExcelJSMod = await import("exceljs");
    const ExcelJSCtor = (ExcelJSMod as any).default ?? ExcelJSMod;
    const wb = new ExcelJSCtor.Workbook();
    const ws = wb.addWorksheet("Booking", { views: [{ state: "frozen", ySplit: 5 }] });
    const branding = await getExcelBranding();
    const columns = rows.length > 0 ? Object.keys(rows[0]) : ["Kode Booking", "Nama Jamaah", "Email", "Telepon", "Paket", "Tgl Berangkat", "Cabang", "Status", "Total Harga", "Skema", "Dibuat"];
    ws.columns = columns.map((key) => ({ key, width: Math.max(16, Math.min(28, key.length + 8)) }));
    await addBrandingHeader(wb, ws, branding, columns.length);
    const headerRow = 5;
    ws.getRow(headerRow).values = columns;
    styleTableHeader(ws, headerRow, columns.length);
    rows.forEach((r: any) => ws.addRow(r));
    if (rows.length > 0) styleTableBody(ws, headerRow + 1, headerRow + rows.length, columns.length);
    ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow + Math.max(rows.length, 1), column: columns.length } };
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
    const { status, paymentStatus, userId, search, branchId, packageId, departureId: departureIdFilter, limit, offset, startDate, endDate } = req.query;

    // ── Data isolation: resolve scope for this user ──────────────────────────
    const scope = await resolveUserScope(req);
    const scopeCondition = buildBookingScopeCondition(scope);

    // Build WHERE conditions with Drizzle sql template (parameterised, injection-safe)
    const conditions: ReturnType<typeof sql>[] = [scopeCondition];

    if (status && typeof status === "string" && status !== "all") {
      conditions.push(sql`b.status = ${status}`);
    }

    // P0: Payment status filter — separate from booking status
    if (paymentStatus && typeof paymentStatus === "string" && paymentStatus !== "all") {
      if (paymentStatus === "paid") {
        conditions.push(sql`(b.total_price > 0 AND COALESCE((SELECT SUM(pt.amount) FROM booking_payments pt WHERE pt.booking_id = b.id AND NOT pt.is_voided), 0) >= b.total_price)`);
      } else if (paymentStatus === "partial") {
        conditions.push(sql`(COALESCE((SELECT SUM(pt.amount) FROM booking_payments pt WHERE pt.booking_id = b.id AND NOT pt.is_voided), 0) > 0 AND (b.total_price <= 0 OR COALESCE((SELECT SUM(pt.amount) FROM booking_payments pt WHERE pt.booking_id = b.id AND NOT pt.is_voided), 0) < b.total_price))`);
      } else if (paymentStatus === "unpaid") {
        conditions.push(sql`COALESCE((SELECT SUM(pt.amount) FROM booking_payments pt WHERE pt.booking_id = b.id AND NOT pt.is_voided), 0) = 0`);
      }
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
        OR b.pemesan_name ILIKE ${term}
        OR b.group_name ILIKE ${term}
      )`);
    }
    // branchId filter from client is only honoured for global-scope users.
    // Branch-scoped and agent-scoped users are already restricted by scopeCondition above.
    if (scope.type === "global" && branchId && typeof branchId === "string") {
      if (branchId === "__none__") {
        conditions.push(sql`b.branch_id IS NULL`);
      } else if (branchId !== "__all__") {
        conditions.push(sql`b.branch_id = ${branchId}`);
      }
    }
    if (packageId && typeof packageId === "string" && packageId !== "__all__") {
      conditions.push(sql`b.package_id = ${packageId}`);
    }
    if (departureIdFilter && typeof departureIdFilter === "string" && departureIdFilter !== "__all_dep__") {
      conditions.push(sql`b.departure_id = ${departureIdFilter}`);
    }
    if (startDate && typeof startDate === "string") {
      conditions.push(sql`dep.departure_date >= ${startDate}`);
    }
    if (endDate && typeof endDate === "string") {
      conditions.push(sql`dep.departure_date <= ${endDate}`);
    }

    const whereClause = sql`WHERE ${sql.join(conditions, sql` AND `)}`;

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
          COALESCE(b.pic_name,
            CASE b.pic_type
              WHEN 'agen'     THEN (SELECT a.name  FROM agents   a  WHERE a.id  = b.pic_id LIMIT 1)
              WHEN 'cabang'   THEN (SELECT br2.name FROM branches br2 WHERE br2.id = b.pic_id LIMIT 1)
              WHEN 'karyawan' THEN (SELECT p2.name FROM profiles p2 WHERE p2.id::text = b.pic_id LIMIT 1)
              ELSE NULL
            END
          )                     AS "picName",
          b.pic_phone           AS "picPhone",
          b.pic_email           AS "picEmail",
          COALESCE(b.pemesan_name, b.pic_name, prof.name) AS "pemesanName",
          COALESCE(b.pemesan_phone, b.pic_phone, prof.phone) AS "pemesanPhone",
          b.pemesan_email       AS "pemesanEmail",
          pkg.title             AS "packageTitle",
          pkg.slug              AS "packageSlug",
          dep.departure_date    AS "departureDate",
          prof.name             AS "userName",
          prof.email            AS "userEmail",
          br.name               AS "branchName",
          (SELECT COUNT(*)::int FROM booking_pilgrims bp WHERE bp.booking_id = b.id) AS "pilgrimsCount",
          (SELECT bp.name FROM booking_pilgrims bp WHERE bp.booking_id = b.id ORDER BY bp.created_at LIMIT 1) AS "firstJamaahName",
          (SELECT CASE
            WHEN b.total_price > 0 AND COALESCE(SUM(pt.amount), 0) >= b.total_price THEN 'paid'
            WHEN COALESCE(SUM(pt.amount), 0) > 0 THEN 'partial'
            ELSE 'unpaid' END
           FROM booking_payments pt WHERE pt.booking_id = b.id AND pt.is_voided = false
          ) AS "paymentStatus"
        FROM bookings b
        LEFT JOIN packages           pkg  ON pkg.id  = b.package_id
        LEFT JOIN package_departures dep  ON dep.id  = b.departure_id
        LEFT JOIN profiles           prof ON prof.id::text = b.user_id::text
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
        LEFT JOIN profiles           prof ON prof.id::text = b.user_id::text
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
  } catch (e) { console.error("[route error]", e);
    res.status(500).json({ error: "Failed to fetch recent bookings" });
  }
});

/**
 * GET /api/admin/bookings/stats
 * 4 KPI counts for the booking list summary cards.
 */
router.get("/stats", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const scopeCond = buildBookingScopeCondition(scope);
    const result = await db.execute(sql`
      SELECT
        (COUNT(*) FILTER (WHERE b.status NOT IN ('cancelled', 'completed')))::int
          AS active,
        (COUNT(*) FILTER (WHERE b.status NOT IN ('cancelled', 'completed')
            AND COALESCE(
              (SELECT SUM(pt.amount) FROM booking_payments pt
               WHERE pt.booking_id = b.id AND pt.is_voided = false), 0) = 0))::int
          AS waiting_payment,
        (COUNT(*) FILTER (WHERE b.total_price > 0
            AND COALESCE(
              (SELECT SUM(pt.amount) FROM booking_payments pt
               WHERE pt.booking_id = b.id AND pt.is_voided = false), 0) >= b.total_price))::int
          AS paid,
        (COUNT(*) FILTER (WHERE b.status NOT IN ('cancelled', 'completed')
            AND EXISTS (
              SELECT 1 FROM package_departures pd
              WHERE pd.id = b.departure_id
                AND CASE
                  WHEN pd.departure_date ~ '^\\d{4}-\\d{2}-\\d{2}$'
                    THEN pd.departure_date::date
                  ELSE NULL
                END BETWEEN CURRENT_DATE AND (CURRENT_DATE + 30)
            )))::int
          AS departing_soon
      FROM bookings b
      WHERE ${scopeCond}
    `);
    const row = (result.rows?.[0] ?? {}) as Record<string, unknown>;
    res.json({
      active:          Number(row.active          ?? 0),
      waitingPayment:  Number(row.waiting_payment  ?? 0),
      paid:            Number(row.paid             ?? 0),
      departingSoon:   Number(row.departing_soon   ?? 0),
    });
  } catch (e) {
    sendAdminError(res, "GET /api/admin/bookings/stats", e);
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
        isGroupBooking: bookings.isGroupBooking,
        packageTitle: packages.title,
        packageSlug: packages.slug,
        departureDate: packageDepartures.departureDate,
        // Extra fields for detail page
        picName: bookings.picName,
        picPhone: bookings.picPhone,
        picEmail: bookings.picEmail,
        pemesanName: bookings.pemesanName,
        pemesanPhone: bookings.pemesanPhone,
        pemesanEmail: bookings.pemesanEmail,
        groupName: bookings.groupName,
        branchName: branches.name,
      })
      .from(bookings)
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(packageDepartures, eq(bookings.departureId, packageDepartures.id))
      .leftJoin(branches, eq(bookings.branchId, branches.id))
      .where(or(eq(bookings.id, id), eq(bookings.bookingCode, id.toUpperCase())))
      .limit(1);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    // ── Data isolation: verify this booking is within the user's scope ───────
    const scope = await resolveUserScope(req);
    if (!isBookingInScope({ branchId: booking.branchId, agentId: (booking as any).agentId ?? null, picType: booking.picType, picId: booking.picId }, scope)) {
      res.status(403).json({ error: scopeDeniedMessage(scope) });
      return;
    }

    const rooms = await db
      .select()
      .from(bookingRooms)
      .where(eq(bookingRooms.bookingId, id));

    const pilgrims = await db
      .select({
        id: bookingPilgrims.id,
        bookingId: bookingPilgrims.bookingId,
        pilgrimId: bookingPilgrims.pilgrimId,
        name: bookingPilgrims.name,
        phone: bookingPilgrims.phone,
        email: bookingPilgrims.email,
        gender: bookingPilgrims.gender,
        nik: bookingPilgrims.nik,
        birthDate: bookingPilgrims.birthDate,
        nationality: bookingPilgrims.nationality,
        passportNumber: bookingPilgrims.passportNumber,
        passportExpiry: bookingPilgrims.passportExpiry,
        roomType: bookingPilgrims.roomType,
        roomNumber: bookingPilgrims.roomNumber,
        seatNumber: bookingPilgrims.seatNumber,
        flightSegment: bookingPilgrims.flightSegment,
        createdAt: bookingPilgrims.createdAt,
      })
      .from(bookingPilgrims)
      .where(eq(bookingPilgrims.bookingId, id));

    const [user] = booking.userId
      ? await db
          .select({
            id: profiles.id,
            name: profiles.name,
            email: profiles.email,
            phone: profiles.phone,
          })
          .from(profiles)
          .where(eq(profiles.id, booking.userId))
          .limit(1)
      : [];

    // Compute paymentStatus for the detail page
    const payRes = await db.execute(sql`
      SELECT CASE
        WHEN ${booking.totalPrice} > 0 AND COALESCE(SUM(pt.amount), 0) >= ${booking.totalPrice} THEN 'paid'
        WHEN COALESCE(SUM(pt.amount), 0) > 0 THEN 'partial'
        ELSE 'unpaid' END AS "paymentStatus"
      FROM booking_payments pt
      WHERE pt.booking_id = ${id} AND pt.is_voided = false
    `);
    const paymentStatus = (payRes.rows[0] as any)?.paymentStatus ?? "unpaid";

    res.json({
      ...BookingWithDetailsSchema.parse(booking),
      // Extra fields not in schema — passed through explicitly
      picName: booking.picName ?? null,
      picPhone: booking.picPhone ?? null,
      picEmail: booking.picEmail ?? null,
      pemesanName: booking.pemesanName ?? null,
      pemesanPhone: booking.pemesanPhone ?? null,
      pemesanEmail: booking.pemesanEmail ?? null,
      groupName: booking.groupName ?? null,
      branchName: booking.branchName ?? null,
      paymentStatus,
      rooms,
      pilgrims,
      user: user ?? null,
    });
  } catch (err) {
    sendAdminError(res, "GET /api/admin/bookings/:id", err);
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

    // Task #5: If requester is an agent, override PIC fields — cannot be spoofed from frontend
    const singleScope = await resolveUserScope(req);
    let effectiveAgentId = agentId;
    let effectivePicType = "admin";
    let effectivePicId: string | null = null;
    if (singleScope.type === "agent" && singleScope.agentId) {
      effectiveAgentId = singleScope.agentId;
      effectivePicType = "agen";
      effectivePicId = singleScope.agentId;
    }

    // BK-DB01: Validate agentId exists if provided
    if (effectiveAgentId) {
      const [agentRow] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.id, effectiveAgentId))
        .limit(1);
      if (!agentRow) {
        res.status(400).json({ error: "Agen tidak ditemukan" });
        return;
      }
    }

    // P0: Validate departure — existence, package relation, active status, not past
    if (!departureId) {
      res.status(400).json({ error: "departureId wajib diisi" });
      return;
    }
    const [depRow] = await db
      .select({
        remainingQuota: packageDepartures.remainingQuota,
        status: packageDepartures.status,
        packageId: packageDepartures.packageId,
        departureDate: packageDepartures.departureDate,
      })
      .from(packageDepartures)
      .where(eq(packageDepartures.id, departureId))
      .limit(1);
    if (!depRow) {
      res.status(404).json({ error: "Keberangkatan tidak ditemukan" });
      return;
    }
    if (packageId && depRow.packageId !== packageId) {
      res.status(400).json({ error: "Keberangkatan tidak sesuai dengan paket yang dipilih" });
      return;
    }
    // NOTE: Admin/super admin may book past or full departures (record-keeping, late registrations).
    // Status check and past-date check intentionally skipped for admin routes.

    // P0: Lookup price from DB — do not trust totalPrice from frontend
    let calculatedPrice = 0;
    if (roomType) {
      const [priceRow] = await db
        .select({ price: departurePrices.price })
        .from(departurePrices)
        .where(and(eq(departurePrices.departureId, departureId), eq(departurePrices.roomType, roomType)))
        .limit(1);
      if (!priceRow) {
        res.status(400).json({ error: `Tipe kamar '${roomType}' tidak tersedia untuk keberangkatan ini` });
        return;
      }
      if (priceRow.price <= 0) {
        res.status(400).json({ error: `Tipe kamar '${roomType}' belum memiliki harga. Lengkapi harga terlebih dahulu.` });
        return;
      }
      calculatedPrice = priceRow.price;
    }

    // O-14: Anti-collision booking code — crypto-random, no Math.random()
    // Format: BNG-{YYMM}-{8 char hex} — e.g. BNG-2607-A3F2C19E
    const now = new Date();
    const yymm = `${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const bookingCode = `BNG-${yymm}-${hex}`;

    // F-14: Snapshot exchange rate at booking time
    const bookingCurrency = currency || "IDR";
    let exchangeRate = 1;
    if (bookingCurrency !== "IDR") {
      const [currRow] = await db
        .select({ rateToIdr: currencies.rateToIdr })
        .from(currencies)
        .where(eq(currencies.code, bookingCurrency))
        .limit(1);
      if (currRow?.rateToIdr) exchangeRate = currRow.rateToIdr;
    }

    const paymentSnapshots = await buildBookingPaymentSnapshots(packageId, calculatedPrice, depRow.departureDate);
    // Pemesan name: from explicit pemesanName field, else from customerName
    const resolvedPemesanName = (req.body.pemesanName || customerName || null) as string | null;
    const resolvedPemesanPhone = (req.body.pemesanPhone || null) as string | null;
    const resolvedPemesanEmail = (req.body.pemesanEmail || customerEmail || null) as string | null;

    const booking = await db.transaction(async (tx) => {
      // Admin routes may insert into full departures (late registrations, record-keeping).
      // Bypass the DB-level quota trigger for this transaction; quota is reconciled below.
      await tx.execute(sql`SET LOCAL app.skip_quota_check = 'true'`);

      const [newBooking] = await tx
        .insert(bookings)
        .values({
          id: crypto.randomUUID(),
          bookingCode,
          packageId,
          departureId,
          totalPrice: calculatedPrice,
          currency: bookingCurrency,
          exchangeRate,
          paymentScheme: paymentScheme || "full",
          paymentPolicySnapshot: paymentSnapshots.paymentPolicySnapshot,
          paymentScheduleSnapshot: paymentSnapshots.paymentScheduleSnapshot,
          notes,
          branchId,
          agentId: effectiveAgentId,
          userId,
          status: "confirmed",
          approvedAt: new Date(),
          approvalExpiresAt: getApprovalExpiryDate(),
          picType: effectivePicType,
          picId: effectivePicId,
          pemesanName: resolvedPemesanName,
          pemesanPhone: resolvedPemesanPhone,
          pemesanEmail: resolvedPemesanEmail,
          paxCount: 1,
          createdAt: new Date(),
        })
        .returning();

      await tx.insert(bookingRooms).values({
        id: crypto.randomUUID(),
        bookingId: newBooking.id,
        roomType,
        price: String(calculatedPrice),
        quantity: 1,
        subtotal: String(calculatedPrice),
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

      // Booking admin dibuat confirmed, jadi sinkronisasi ini langsung mencadangkan seat.
      await syncDepartureQuota(departureId, tx);

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
  } catch (e: any) {
    if (e?.code === "CAPACITY_FULL") {
      res.status(409).json({ error: e.message });
      return;
    }
    console.error("[POST /api/admin/bookings]", e);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// ── Group Booking — satu booking bersama, berisi banyak jamaah ────────────────
router.post("/group", async (req, res) => {
  try {
    const {
      packageId,
      departureId,
      paymentScheme,
      notes,
      branchId,
      agentId,
      userId,
      pemesanName,
      pemesanPhone,
      pemesanEmail,
      groupName,
      currency,
      jamaah, // Array<{ name, phone, email, gender, roomType }>
    } = req.body;

    if (!packageId || !departureId) {
      res.status(400).json({ error: "packageId dan departureId wajib diisi" });
      return;
    }
    if (!pemesanName || !pemesanName.trim()) {
      res.status(400).json({ error: "Nama pemesan wajib diisi" });
      return;
    }
    if (!Array.isArray(jamaah) || jamaah.length === 0) {
      res.status(400).json({ error: "Minimal 1 jamaah harus ditambahkan" });
      return;
    }
    for (let i = 0; i < jamaah.length; i++) {
      if (!jamaah[i].name || !jamaah[i].name.trim()) {
        res.status(400).json({ error: `Nama jamaah ke-${i + 1} wajib diisi` });
        return;
      }
      if (!jamaah[i].roomType) {
        res.status(400).json({ error: `Tipe kamar jamaah ke-${i + 1} wajib dipilih` });
        return;
      }
    }

    // Task #5: If requester is an agent, override PIC fields — cannot be spoofed from frontend
    const groupScope = await resolveUserScope(req);
    let groupAgentId = agentId;
    let groupPicType = "admin";
    let groupPicId: string | null = null;
    if (groupScope.type === "agent" && groupScope.agentId) {
      groupAgentId = groupScope.agentId;
      groupPicType = "agen";
      groupPicId = groupScope.agentId;
    }

    // P0: Validate departure — existence, package relation, active status, not past
    const [dep] = await db
      .select({
        remainingQuota: packageDepartures.remainingQuota,
        quota: packageDepartures.quota,
        status: packageDepartures.status,
        packageId: packageDepartures.packageId,
        departureDate: packageDepartures.departureDate,
      })
      .from(packageDepartures)
      .where(eq(packageDepartures.id, departureId))
      .limit(1);
    if (!dep) {
      res.status(404).json({ error: "Keberangkatan tidak ditemukan" });
      return;
    }
    if (packageId && dep.packageId !== packageId) {
      res.status(400).json({ error: "Keberangkatan tidak sesuai dengan paket yang dipilih" });
      return;
    }
    // NOTE: Admin/super admin may book past or full departures (record-keeping, late registrations).
    // Status check and past-date check intentionally skipped for admin routes.

    // P0: Lookup all departure prices from DB — do not trust roomPrice from frontend
    const depPricesRows = await db
      .select({ roomType: departurePrices.roomType, price: departurePrices.price })
      .from(departurePrices)
      .where(eq(departurePrices.departureId, departureId));
    const priceMap = new Map(depPricesRows.map((p) => [p.roomType, p.price]));

    // Validate each jamaah's room type has a valid price in this departure
    for (let i = 0; i < jamaah.length; i++) {
      const price = priceMap.get(jamaah[i].roomType);
      if (price === undefined) {
        res.status(400).json({ error: `Tipe kamar '${jamaah[i].roomType}' tidak tersedia untuk keberangkatan ini` });
        return;
      }
      if (price <= 0) {
        res.status(400).json({ error: `Tipe kamar '${jamaah[i].roomType}' belum memiliki harga yang valid` });
        return;
      }
    }

    // P0: Calculate total price from DB prices — ignore totalPrice from frontend
    const calculatedGroupTotal = jamaah.reduce((sum: number, j: any) => sum + (priceMap.get(j.roomType) ?? 0), 0);

    // Generate booking code
    const now = new Date();
    const yymm = `${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const bookingCode = `BNG-${yymm}-${hex}`;

    const groupPaymentSnapshots = await buildBookingPaymentSnapshots(packageId, calculatedGroupTotal, dep.departureDate);
    // F-14: Snapshot exchange rate at booking time
    const groupCurrency = currency || "IDR";
    let groupExchangeRate = 1;
    if (groupCurrency !== "IDR") {
      const [currRow] = await db
        .select({ rateToIdr: currencies.rateToIdr })
        .from(currencies)
        .where(eq(currencies.code, groupCurrency))
        .limit(1);
      if (currRow?.rateToIdr) groupExchangeRate = currRow.rateToIdr;
    }

    const booking = await db.transaction(async (tx) => {
      // Admin routes may insert into full departures (late registrations, record-keeping).
      // Bypass the DB-level quota trigger for this transaction; quota is reconciled below.
      await tx.execute(sql`SET LOCAL app.skip_quota_check = 'true'`);

      const [newBooking] = await tx
        .insert(bookings)
        .values({
          id: crypto.randomUUID(),
          bookingCode,
          packageId,
          departureId,
          userId: userId || null,
          totalPrice: calculatedGroupTotal,
          currency: groupCurrency,
          exchangeRate: groupExchangeRate,
          paymentScheme: paymentScheme || "full",
          paymentPolicySnapshot: groupPaymentSnapshots.paymentPolicySnapshot,
          paymentScheduleSnapshot: groupPaymentSnapshots.paymentScheduleSnapshot,
          notes: notes || null,
          branchId: branchId || null,
          agentId: groupAgentId || null,
          status: "confirmed",
          approvedAt: now,
          approvalExpiresAt: getApprovalExpiryDate(now),
          picType: groupPicType,
          picId: groupPicId,
          isGroupBooking: true,
          groupName: groupName || null,
          pemesanName: pemesanName.trim(),
          pemesanPhone: pemesanPhone || null,
          pemesanEmail: pemesanEmail || null,
          picName: pemesanName.trim(),
          picPhone: pemesanPhone || null,
          paxCount: jamaah.length,
          createdAt: now,
        })
        .returning();

      // Insert booking_pilgrims for each jamaah
      for (const j of jamaah) {
        await tx.insert(bookingPilgrims).values({
          id: crypto.randomUUID(),
          bookingId: newBooking.id,
          name: j.name.trim(),
          phone: j.phone || null,
          email: j.email || null,
          gender: j.gender || null,
          roomType: j.roomType,
          createdAt: now,
        });
      }

      // Aggregate booking_rooms by room type — use DB prices, not frontend roomPrice
      const roomAgg: Record<string, { count: number; price: number }> = {};
      for (const j of jamaah) {
        const dbPrice = priceMap.get(j.roomType) ?? 0;
        if (!roomAgg[j.roomType]) roomAgg[j.roomType] = { count: 0, price: dbPrice };
        roomAgg[j.roomType].count += 1;
      }
      for (const [rt, { count, price }] of Object.entries(roomAgg)) {
        await tx.insert(bookingRooms).values({
          id: crypto.randomUUID(),
          bookingId: newBooking.id,
          roomType: rt,
          price: String(price),
          quantity: count,
          subtotal: String(price * count),
          createdAt: now,
        });
      }

      // Booking admin dibuat confirmed, jadi sinkronisasi ini langsung mencadangkan seat.
      await syncDepartureQuota(departureId, tx);

      return newBooking;
    });

    // Quota warning
    const [depAfter] = await db
      .select({ remainingQuota: packageDepartures.remainingQuota, quota: packageDepartures.quota })
      .from(packageDepartures)
      .where(eq(packageDepartures.id, departureId))
      .limit(1);
    if (depAfter && depAfter.remainingQuota <= 5) {
      console.warn(`[KB-F02] QUOTA WARNING: departure ${departureId} — sisa ${depAfter.remainingQuota}/${depAfter.quota} tempat`);
    }

    res.status(201).json({ ...booking, jamaahCount: jamaah.length });
  } catch (e: any) {
    if (e?.code === "CAPACITY_FULL") {
      res.status(409).json({ error: e.message });
      return;
    }
    console.error("[POST /api/admin/bookings/group]", e);
    res.status(500).json({ error: "Gagal membuat booking rombongan" });
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
        draft:     ["confirmed", "cancelled"],  // draft bisa langsung dikonfirmasi atau dibatalkan
        pending:   ["confirmed", "cancelled"],
        confirmed: ["completed", "cancelled"],
        completed: [],   // terminal — tidak bisa balik
        cancelled: [],   // terminal — tidak bisa balik
        expired: [],     // terminal — pembayaran terlambat tidak mengaktifkan kembali
      };

      const [current] = await db
        .select({
          status: bookings.status,
          departureId: bookings.departureId,
          paxCount: bookings.paxCount,
          branchId: bookings.branchId,
          agentId: bookings.agentId,
          picType: bookings.picType,
          picId: bookings.picId,
        })
        .from(bookings)
        .where(eq(bookings.id, id))
        .limit(1);

      if (!current) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }

      const scope = await resolveUserScope(req);
      if (!isBookingInScope(current, scope)) {
        res.status(403).json({ error: scopeDeniedMessage(scope) });
        return;
      }

      const currentStatus = current.status ?? "draft";
      const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
      if (currentStatus !== newStatus && !allowed.includes(newStatus)) {
        res.status(400).json({
          error: "Transisi status tidak valid",
          detail: `Status '${currentStatus}' tidak bisa diubah ke '${newStatus}'. Transisi yang diizinkan: ${allowed.length ? allowed.join(", ") : "tidak ada (status final)"}`,
        });
        return;
      }
      // ──────────────────────────────────────────────────────────────────────

      const updateData: Record<string, any> = { status: newStatus };
      if (newStatus === "confirmed" && currentStatus !== "confirmed") {
        const approvedAt = new Date();
        updateData.approvedAt = approvedAt;
        updateData.approvalExpiresAt = getApprovalExpiryDate(approvedAt);
      } else if (newStatus === "cancelled") {
        updateData.approvalExpiresAt = null;
      }
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

        // Recalculate quota whenever a booking starts/stops holding seats.
        // `confirmed` is the approval point; payment status is intentionally
        // not consulted, so approved unpaid bookings still reserve seats.
        const wasSeatReserved = isSeatReservedStatus(current.status);
        const isSeatReserved = isSeatReservedStatus(newStatus);
        if (current.departureId && wasSeatReserved !== isSeatReserved) {
          await syncDepartureQuota(current.departureId, tx);
        }

        // BK-03: Log status change audit trail
        await tx.insert(bookingStatusLogs).values({
          id: crypto.randomUUID(),
          bookingId: id,
          fromStatus: currentStatus,
          toStatus: newStatus,
          changedBy: req.user?.id ?? null,
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
      // Fetch paxCount + departureId BEFORE updating so we can restore correct quota
      const preUpdate = await tx
        .select({ id: bookings.id, departureId: bookings.departureId, paxCount: bookings.paxCount })
        .from(bookings)
        .where(inArray(bookings.id, ids));

      const rows = await tx
        .update(bookings)
        .set(
          newStatus === "confirmed"
            ? {
                status: newStatus,
                approvedAt: new Date(),
                approvalExpiresAt: getApprovalExpiryDate(),
              }
            : { status: newStatus, approvalExpiresAt: null },
        )
        .where(inArray(bookings.id, ids))
        .returning({ id: bookings.id, departureId: bookings.departureId });

      // Build a lookup of paxCount by booking id
      const paxMap = new Map(preUpdate.map((r) => [r.id, r.paxCount ?? 1]));

      // Log each change + restore quota for cancelled (using actual paxCount)
      for (const row of rows) {
        await tx.insert(bookingStatusLogs).values({
          id: crypto.randomUUID(),
          bookingId: row.id,
          fromStatus: null, // bulk — kita tidak fetch status lama satu-satu
          toStatus: newStatus,
          changedBy: (req as any).user?.id ?? "admin-bulk",
          notes: "Bulk status update",
        });
        // Bulk approval must reserve seats just like single-booking approval;
        // cancellation recalculates and releases seats when appropriate.
        if (row.departureId && ["confirmed", "cancelled"].includes(newStatus)) {
          await syncDepartureQuota(row.departureId, tx);
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

/**
 * POST /api/admin/bookings/backfill-pemesan
 * One-time: fill pemesan_name from profiles or first booking_pilgrim for bookings where it is null.
 */
router.post("/backfill-pemesan", async (req, res) => {
  try {
    const withUser = await db.execute(sql`
      UPDATE bookings b
      SET pemesan_name = p.name,
          pemesan_phone = COALESCE(b.pemesan_phone, p.phone)
      FROM profiles p
      WHERE b.user_id::text = p.id::text
        AND (b.pemesan_name IS NULL OR TRIM(b.pemesan_name) = '')
        AND p.name IS NOT NULL AND TRIM(p.name) != ''
    `);

    const walkIn = await db.execute(sql`
      UPDATE bookings b
      SET pemesan_name = bp.name,
          pemesan_phone = COALESCE(b.pemesan_phone, bp.phone)
      FROM (
        SELECT DISTINCT ON (booking_id) booking_id, name, phone
        FROM booking_pilgrims
        ORDER BY booking_id, created_at ASC
      ) bp
      WHERE b.id = bp.booking_id
        AND (b.pemesan_name IS NULL OR TRIM(b.pemesan_name) = '')
        AND bp.name IS NOT NULL AND TRIM(bp.name) != ''
    `);

    const count1 = (withUser as any).rowCount ?? 0;
    const count2 = (walkIn as any).rowCount ?? 0;
    res.json({ ok: true, updatedFromProfile: count1, updatedFromPilgrim: count2, total: count1 + count2 });
  } catch (err) {
    console.error("[bookings] backfill-pemesan error:", err);
    res.status(500).json({ error: "Failed to backfill pemesan names" });
  }
});

// ── POST /:id/pilgrims — tambah jamaah ke booking yang sudah ada ──────────────
router.post("/:id/pilgrims", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, gender, email, nik, birthDate, nationality, passportNumber, passportExpiry } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: "Nama jamaah wajib diisi" });
      return;
    }

    // Verify booking exists + fetch scope fields
    const [booking] = await db
      .select({
        id: bookings.id,
        departureId: bookings.departureId,
        paxCount: bookings.paxCount,
        branchId: bookings.branchId,
        agentId: bookings.agentId,
        picType: bookings.picType,
        picId: bookings.picId,
      })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    if (!booking) {
      res.status(404).json({ error: "Booking tidak ditemukan" });
      return;
    }

    // B-1: Guard — only allow adding pilgrim to a booking within scope
    const scope = await resolveUserScope(req);
    if (!isBookingInScope(booking, scope)) {
      res.status(403).json({ error: scopeDeniedMessage(scope) });
      return;
    }

    // Check departure quota
    if (booking.departureId) {
      const [dep] = await db
        .select({ remainingQuota: packageDepartures.remainingQuota })
        .from(packageDepartures)
        .where(eq(packageDepartures.id, booking.departureId))
        .limit(1);
      if (dep && dep.remainingQuota <= 0) {
        res.status(409).json({ error: "Kuota keberangkatan penuh" });
        return;
      }
    }

    const pilgrim = await db.transaction(async (tx) => {
      const [newPilgrim] = await tx.insert(bookingPilgrims).values({
        id: crypto.randomUUID(),
        bookingId: id,
        name: name.trim(),
        phone: phone?.trim()          || null,
        gender: gender                || null,
        email: email?.trim()          || null,
        nik: nik?.trim()              || null,
        birthDate: birthDate          || null,
        nationality: nationality?.trim() || null,
        passportNumber: passportNumber?.trim() || null,
        passportExpiry: passportExpiry || null,
        createdAt: new Date(),
      }).returning();

      // Update paxCount on booking
      await tx.execute(sql`
        UPDATE bookings SET pax_count = COALESCE(pax_count, 0) + 1 WHERE id = ${id}
      `);

      // Decrement quota
      if (booking.departureId) {
        await tx.execute(sql`
          UPDATE package_departures
          SET remaining_quota = GREATEST(0, remaining_quota - 1)
          WHERE id = ${booking.departureId}
        `);
      }

      return newPilgrim;
    });

    res.status(201).json(pilgrim);
  } catch (e) {
    console.error("[POST /api/admin/bookings/:id/pilgrims]", e);
    res.status(500).json({ error: "Gagal menambahkan jamaah" });
  }
});

// ── Ubah PIC booking ────────────────────────────────────────────────────────
// Allowed roles: super_admin, owner, admin, branch_manager, staff (requireStaff)
const VALID_PIC_TYPES = new Set(["pusat", "agen", "cabang", "karyawan"]);

router.patch("/:id/pic", requireStaff, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { picType, picId } = req.body as { picType?: string | null; picId?: string | null };

    // Validate picType
    const resolvedType = picType || "pusat";
    if (!VALID_PIC_TYPES.has(resolvedType)) {
      res.status(400).json({ error: `picType diterima: ${[...VALID_PIC_TYPES].join(", ")}` });
      return;
    }

    // picId required when not pusat
    if (resolvedType !== "pusat" && !picId) {
      res.status(400).json({ error: "picId wajib diisi jika picType bukan pusat" });
      return;
    }

    // Check booking exists
    const [existing] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Booking tidak ditemukan" });
      return;
    }

    // Resolve picName from the correct entity table
    let picName: string | null = null;
    if (picId && resolvedType !== "pusat") {
      if (resolvedType === "agen") {
        const [row] = await db.select({ name: agents.name }).from(agents).where(eq(agents.id, picId)).limit(1);
        if (!row) { res.status(404).json({ error: "Agen tidak ditemukan" }); return; }
        picName = row.name;
      } else if (resolvedType === "cabang") {
        const [row] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, picId)).limit(1);
        if (!row) { res.status(404).json({ error: "Cabang tidak ditemukan" }); return; }
        picName = row.name;
      } else if (resolvedType === "karyawan") {
        const [row] = await db.select({ name: profiles.name }).from(profiles).where(eq(profiles.id, picId)).limit(1);
        if (!row) { res.status(404).json({ error: "Karyawan tidak ditemukan" }); return; }
        picName = row.name;
      }
    }

    await db
      .update(bookings)
      .set({
        picType: resolvedType === "pusat" ? null : resolvedType,
        picId: resolvedType === "pusat" ? null : (picId ?? null),
        picName: picName,
      })
      .where(eq(bookings.id, id));

    res.status(204).end();
  } catch (e) {
    console.error("[PATCH /api/admin/bookings/:id/pic]", e);
    res.status(500).json({ error: "Failed to update PIC" });
  }
});

router.patch("/:id/branch", async (req, res) => {
  try {
    const id = String(req.params.id);
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

// BKG-F03: Update catatan/notes booking
router.patch("/:id/notes", async (req, res) => {
  try {
    const id = String(req.params.id);
    const { notes } = req.body as { notes?: string | null };
    await db
      .update(bookings)
      .set({ notes: notes ?? null })
      .where(eq(bookings.id, id));
    res.status(204).end();
  } catch (e) {
    console.error("[PATCH /api/admin/bookings/:id/notes]", e);
    res.status(500).json({ error: "Failed to update notes" });
  }
});

// ── Invoice data — full data for client-side invoice generation ───────────────
router.get("/:id/invoice-data", async (req, res) => {
  try {
    const { id } = req.params;

    // A-4: Resolve scope early — needed for both local-DB and Supabase-fallback paths
    const scope = await resolveUserScope(req);

    const [bookingResult, pilgrimsResult, roomsResult, paymentsResult, brandingResult, seqResult] =
      await Promise.all([
        db.execute(sql`
          SELECT
            b.id, b.booking_code, b.package_id, b.total_price, b.status, b.created_at,
            b.payment_policy_snapshot, b.payment_schedule_snapshot,
            b.branch_id, b.agent_id, b.pic_type, b.pic_id,
            pkg.title      AS package_title,
            dep.departure_date,
            COALESCE(b.pemesan_name, prof.name) AS customer_name,
            COALESCE(b.pemesan_email, prof.email) AS customer_email,
            COALESCE(b.pemesan_phone, b.pic_phone) AS customer_phone
          FROM bookings b
          LEFT JOIN packages           pkg  ON pkg.id  = b.package_id
          LEFT JOIN package_departures dep  ON dep.id  = b.departure_id
          LEFT JOIN profiles           prof ON prof.id::text = b.user_id::text
          WHERE b.id = ${id} OR b.booking_code = ${id.toUpperCase()}
          LIMIT 1
        `),
        db.select({
          name: bookingPilgrims.name,
          gender: bookingPilgrims.gender,
        }).from(bookingPilgrims).where(eq(bookingPilgrims.bookingId, id)),
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
        // F-13: Hitung urutan booking ini dalam tahun pembuatannya (rank by created_at)
        db.execute(sql`
          SELECT COUNT(*) AS seq
          FROM bookings b2
          WHERE DATE_PART('year', b2.created_at) = DATE_PART('year', (
            SELECT created_at FROM bookings WHERE id = ${id}
          ))
          AND b2.created_at <= (SELECT created_at FROM bookings WHERE id = ${id})
        `),
      ]);

    const bRows = (bookingResult as any).rows ?? bookingResult;
    let booking = bRows[0];

    // A-4: Guard — scope check on local DB booking
    if (booking && !isBookingInScope({
      branchId: booking.branch_id,
      agentId:  booking.agent_id,
      picType:  booking.pic_type,
      picId:    booking.pic_id,
    }, scope)) {
      res.status(403).json({ error: scopeDeniedMessage(scope) });
      return;
    }

    // Fallback: jika booking tidak ada di local DB, coba Supabase
    if (!booking) {
      const userToken = (req.headers.authorization || "").replace("Bearer ", "");
      // Support both UUID and booking_code lookups
      let sbBooking = await sbGetBooking(id, userToken);
      if (!sbBooking) {
        sbBooking = await sbGetBookingByCode(id.toUpperCase(), userToken);
      }
      if (!sbBooking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }
      // A-4: Guard — scope check on Supabase-fallback booking
      if (!isBookingInScope({
        branchId: sbBooking.branch_id ?? null,
        agentId:  sbBooking.agent_id  ?? null,
        picType:  sbBooking.pic_type  ?? null,
        picId:    sbBooking.pic_id    ?? null,
      }, scope)) {
        res.status(403).json({ error: scopeDeniedMessage(scope) });
        return;
      }
      // Use the real UUID from sbBooking for related-data lookups
      const realId = sbBooking.id;
      // Ambil data tambahan dari Supabase
      const [sbPkg, sbDep, sbProfile, sbPilgrims, sbPayRows, sbRooms] = await Promise.all([
        sbGetPackage(sbBooking.package_id, userToken),
        sbGetDeparture(sbBooking.departure_id, userToken),
        sbGetProfile(sbBooking.user_id, userToken),
        sbGetPilgrims(realId, userToken),
        sbGetPayments(realId, userToken),
        (async () => {
          const { sbRest } = await import("../../lib/supabaseFallback");
          return sbRest<any[]>(`/rest/v1/booking_rooms?booking_id=eq.${encodeURIComponent(realId)}&select=*`, userToken) ?? [];
        })(),
      ]);

      let fallbackPolicySnapshot = sbBooking.payment_policy_snapshot ?? null;
      let fallbackScheduleSnapshot = sbBooking.payment_schedule_snapshot ?? [];
      if (!fallbackPolicySnapshot || !Array.isArray(fallbackPolicySnapshot.rules) || fallbackPolicySnapshot.rules.length === 0) {
        const fallback = await buildBookingPaymentSnapshots(sbBooking.package_id ?? null, Number(sbBooking.total_price || 0), sbDep?.departure_date ?? null);
        fallbackPolicySnapshot = fallback.paymentPolicySnapshot;
        fallbackScheduleSnapshot = fallback.paymentScheduleSnapshot;
      }
      const brandRows2 = (brandingResult as any).rows ?? brandingResult;
      const branding2: any = brandRows2[0]?.value ?? {};
      const createdAt = sbBooking.created_at;
      const invoiceYear2 = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();

      return res.json({
        invoiceNumber: `INV/${invoiceYear2}/0001`,
        bookingCode: sbBooking.booking_code,
        customerName: sbBooking.pemesan_name || sbProfile?.name || "-",
        customerEmail: sbBooking.pemesan_email || sbProfile?.email || "-",
        customerPhone: sbBooking.pemesan_phone || sbProfile?.phone || null,
        packageTitle: sbPkg?.title || "-",
        departureDate: sbDep?.departure_date || null,
        totalPrice: Number(sbBooking.total_price || 0),
        createdAt,
        status: sbBooking.status,
        paymentPolicySnapshot: fallbackPolicySnapshot,
        paymentScheduleSnapshot: fallbackScheduleSnapshot,
        pilgrims: sbPilgrims.map((p: any) => ({ name: p.name, gender: p.gender })),
        rooms: (Array.isArray(sbRooms) ? sbRooms : []).map((r: any) => ({
          room_type: r.room_type,
          quantity: r.quantity,
          price: Number(r.price || 0),
          subtotal: Number(r.subtotal || 0),
        })),
        payments: sbPayRows
          .filter((p: any) => !p.is_voided)
          .map((p: any) => ({
            payment_type: p.type,
            amount: Number(p.amount),
            status: "paid",
            paid_at: p.paid_at,
          })),
        companyName: branding2.company_name || "UmrohPlus",
        companyTagline: branding2.tagline || "Travel & Tours",
        logoUrl: branding2.logo_url || "",
      });
    }

    let paymentPolicySnapshot = booking.payment_policy_snapshot ?? null;
    let paymentScheduleSnapshot = booking.payment_schedule_snapshot ?? [];
    if (!paymentPolicySnapshot || !Array.isArray(paymentPolicySnapshot.rules) || paymentPolicySnapshot.rules.length === 0) {
      const fallback = await buildBookingPaymentSnapshots(booking.package_id ?? null, Number(booking.total_price || 0), booking.departure_date ?? null);
      paymentPolicySnapshot = fallback.paymentPolicySnapshot;
      paymentScheduleSnapshot = fallback.paymentScheduleSnapshot;
    }
    const payRows = (paymentsResult as any).rows ?? paymentsResult;
    const brandRows = (brandingResult as any).rows ?? brandingResult;
    const branding: any = brandRows[0]?.value ?? {};

    // F-13: Nomor invoice sequential — INV/{YYYY}/{SEQ:04d}  e.g. INV/2026/0042
    const seqRows = (seqResult as any).rows ?? seqResult;
    const invoiceSeq = Number(seqRows[0]?.seq ?? 1);
    const invoiceYear = booking.created_at ? new Date(booking.created_at).getFullYear() : new Date().getFullYear();
    const invoiceNumber = `INV/${invoiceYear}/${String(invoiceSeq).padStart(4, "0")}`;

    res.json({
      invoiceNumber,
      bookingCode: booking.booking_code,
      customerName: booking.customer_name || "-",
      customerEmail: booking.customer_email || "-",
      customerPhone: booking.customer_phone || null,
      packageTitle: booking.package_title || "-",
      departureDate: booking.departure_date || null,
      totalPrice: Number(booking.total_price) || 0,
      createdAt: booking.created_at,
      status: booking.status,
      paymentPolicySnapshot,
      paymentScheduleSnapshot,
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

// ── GET /:id/passport-recommendation-data  (JSON, for frontend HTML print) ─────
router.get("/:id/passport-recommendation-data", async (req, res) => {
  try {
    const id = req.params.id as string;

    // A-4: Resolve scope early — checked on both local-DB and Supabase-fallback paths
    const scope = await resolveUserScope(req);

    const [bookingRows, brandingResult] = await Promise.all([
      db.execute(sql`
        SELECT
          b.id, b.booking_code,
          b.branch_id, b.agent_id, b.pic_type, b.pic_id,
          pkg.title   AS package_title,
          dep.departure_date
        FROM bookings b
        LEFT JOIN packages           pkg ON pkg.id = b.package_id
        LEFT JOIN package_departures dep ON dep.id = b.departure_id
        WHERE b.id = ${id} OR b.booking_code = ${id.toUpperCase()}
        LIMIT 1
      `),
      db.execute(sql`
        SELECT value FROM site_settings
        WHERE key = 'branding' AND category = 'general'
        LIMIT 1
      `),
    ]);

    const bRows = (bookingRows as any).rows ?? bookingRows;
    const localBooking = bRows[0];
    const brandRows = (brandingResult as any).rows ?? brandingResult;
    const branding: any = brandRows[0]?.value ?? {};

    // A-4: Guard — scope check on local DB booking
    if (localBooking && !isBookingInScope({
      branchId: localBooking.branch_id,
      agentId:  localBooking.agent_id,
      picType:  localBooking.pic_type,
      picId:    localBooking.pic_id,
    }, scope)) {
      res.status(403).json({ error: scopeDeniedMessage(scope) });
      return;
    }

    let bookingId: string;
    let bookingCode: string;
    let packageTitle: string | null;
    let departureDate: string | null;
    let pilgrims: { name: string; nik: string | null; birthDate: string | null; gender: string | null }[];

    if (localBooking) {
      bookingId = localBooking.id;
      bookingCode = localBooking.booking_code;
      packageTitle = localBooking.package_title ?? null;
      departureDate = localBooking.departure_date ?? null;
      const pilgrimRows = await db
        .select({
          name: bookingPilgrims.name,
          nik: bookingPilgrims.nik,
          birthDate: bookingPilgrims.birthDate,
          gender: bookingPilgrims.gender,
        })
        .from(bookingPilgrims)
        .where(eq(bookingPilgrims.bookingId, bookingId));
      pilgrims = pilgrimRows.map((p) => ({
        name: p.name,
        nik: p.nik ?? null,
        birthDate: p.birthDate ? String(p.birthDate) : null,
        gender: p.gender ?? null,
      }));
    } else {
      // Supabase fallback
      const userToken = (req.headers.authorization || "").replace("Bearer ", "");
      let sbBooking = await sbGetBooking(id, userToken);
      if (!sbBooking) sbBooking = await sbGetBookingByCode(id.toUpperCase(), userToken);
      if (!sbBooking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }
      // A-4: Guard — scope check on Supabase-fallback booking
      if (!isBookingInScope({
        branchId: sbBooking.branch_id ?? null,
        agentId:  sbBooking.agent_id  ?? null,
        picType:  sbBooking.pic_type  ?? null,
        picId:    sbBooking.pic_id    ?? null,
      }, scope)) {
        res.status(403).json({ error: scopeDeniedMessage(scope) });
        return;
      }
      const [sbPkg, sbDep, sbPilgrimsRaw] = await Promise.all([
        sbGetPackage(sbBooking.package_id, userToken),
        sbGetDeparture(sbBooking.departure_id, userToken),
        sbGetPilgrims(sbBooking.id, userToken),
      ]);
      bookingCode = sbBooking.booking_code;
      packageTitle = sbPkg?.title ?? null;
      departureDate = sbDep?.departure_date ?? null;
      pilgrims = sbPilgrimsRaw.map((p: any) => ({
        name: p.name,
        nik: p.nik ?? null,
        birthDate: p.birth_date ? String(p.birth_date) : null,
        gender: p.gender ?? null,
      }));
    }

    res.json({
      bookingCode,
      packageTitle,
      departureDate,
      companyName: branding.company_name || "UmrohPlus",
      companyTagline: branding.tagline || "Travel & Tours",
      logoUrl: branding.logo_url || "",
      pilgrims,
    });
  } catch (e) {
    sendAdminError(res, "GET /api/admin/bookings/:id/passport-recommendation-data", e);
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
/**
 * PATCH /api/admin/bookings/bulk-departure
 * Pindah banyak booking ke keberangkatan lain sekaligus (BKG-F05)
 */
router.patch("/bulk-departure", async (req, res) => {
  try {
    const { ids, departureId } = req.body as { ids: string[]; departureId: string };

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids wajib diisi" });
      return;
    }
    if (!departureId) {
      res.status(400).json({ error: "departureId wajib diisi" });
      return;
    }

    // Validasi keberangkatan tujuan
    const [newDep] = await db
      .select({ remainingQuota: packageDepartures.remainingQuota, departureDate: packageDepartures.departureDate })
      .from(packageDepartures)
      .where(eq(packageDepartures.id, departureId))
      .limit(1);

    if (!newDep) {
      res.status(404).json({ error: "Keberangkatan tidak ditemukan" });
      return;
    }

    // Ambil data booking saat ini
    const currentBookings = await db
      .select({ id: bookings.id, departureId: bookings.departureId, paxCount: bookings.paxCount })
      .from(bookings)
      .where(inArray(bookings.id, ids));

    if (currentBookings.length === 0) {
      res.status(404).json({ error: "Tidak ada booking yang ditemukan" });
      return;
    }

    // Hanya booking yang BENAR-BENAR berpindah (departure saat ini ≠ tujuan)
    const movingBookings = currentBookings.filter((b) => b.departureId !== departureId);
    const movingSeats = movingBookings.reduce((sum, b) => sum + (b.paxCount ?? 1), 0);

    // Validasi kuota hanya untuk kursi yang akan benar-benar masuk ke departure tujuan
    if (movingSeats > 0 && newDep.remainingQuota < movingSeats) {
      res.status(409).json({
        error: `Kuota keberangkatan tidak cukup. Sisa ${newDep.remainingQuota} kursi, dibutuhkan ${movingSeats} kursi untuk ${movingBookings.length} booking yang dipindah.`,
      });
      return;
    }

    await db.transaction(async (tx: any) => {
      if (movingSeats > 0) {
        // Kembalikan kuota per keberangkatan lama (hanya booking yang berpindah)
        const oldDepMap = new Map<string, number>();
        for (const b of movingBookings) {
          if (b.departureId) {
            const seats = b.paxCount ?? 1;
            oldDepMap.set(b.departureId, (oldDepMap.get(b.departureId) ?? 0) + seats);
          }
        }
        for (const [oldDepId, seats] of oldDepMap) {
          await tx.execute(
            sql`UPDATE package_departures SET remaining_quota = remaining_quota + ${seats} WHERE id = ${oldDepId}`
          );
        }
        // Kurangi kuota keberangkatan baru — hanya kursi yang benar-benar pindah
        await tx.execute(
          sql`UPDATE package_departures SET remaining_quota = GREATEST(0, remaining_quota - ${movingSeats}) WHERE id = ${departureId}`
        );
      }
      // Update semua booking (termasuk yang sudah di tujuan — idempoten)
      await tx.update(bookings).set({ departureId }).where(inArray(bookings.id, ids));
      // Audit log hanya untuk yang benar-benar berpindah
      if (movingBookings.length > 0) {
        const logs = movingBookings.map((b) => ({
          id: crypto.randomUUID(),
          bookingId: b.id,
          fromStatus: null,
          toStatus: "departure_changed",
          changedBy: (req as any).user?.id ?? "admin-bulk",
          notes: `[Bulk] Keberangkatan diubah ke ${newDep.departureDate}`,
        }));
        await tx.insert(bookingStatusLogs).values(logs);
      }
    });

    res.json({ message: "Keberangkatan berhasil diubah", updated: currentBookings.length, departureDate: newDep.departureDate });
  } catch (e) {
    sendAdminError(res, "PATCH /api/admin/bookings/bulk-departure", e);
  }
});

router.patch("/:id/departure", async (req, res) => {
  try {
    const { id } = req.params;
    const { departureId } = req.body;

    if (!departureId) {
      res.status(400).json({ error: "departureId wajib diisi" });
      return;
    }

    // Get current booking's departure + paxCount
    const [current] = await db
      .select({ departureId: bookings.departureId, status: bookings.status, paxCount: bookings.paxCount })
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
    const seats = current.paxCount ?? 1;
    if (newDep.remainingQuota < seats) {
      res.status(409).json({ error: `Kuota keberangkatan tidak cukup. Sisa ${newDep.remainingQuota} kursi, dibutuhkan ${seats} kursi.` });
      return;
    }

    await db.transaction(async (tx: any) => {
      // Restore quota on the old departure (using paxCount for group bookings)
      if (current.departureId && current.departureId !== departureId) {
        await tx.execute(
          sql`UPDATE package_departures SET remaining_quota = remaining_quota + ${seats} WHERE id = ${current.departureId}`
        );
      }
      // Consume quota on the new departure
      await tx.execute(
        sql`UPDATE package_departures SET remaining_quota = GREATEST(0, remaining_quota - ${seats}) WHERE id = ${departureId}`
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

// ── Pic info: commission rate + PIC name ──────────────────────────────────────
// Replaces the /rest/v1/ direct Supabase calls from the frontend.
router.get("/:id/pic-info", async (req, res) => {
  try {
    const { id } = req.params;

    const [booking] = await db
      .select({
        packageId: bookings.packageId,
        picType: bookings.picType,
        picId: bookings.picId,
      })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    // Commission: first row for this package (commission is per-package, not per-picType)
    let commissionRate = 0;
    if (booking.packageId) {
      const [comm] = await db
        .select({ commissionAmount: packageCommissions.commissionAmount })
        .from(packageCommissions)
        .where(eq(packageCommissions.packageId, booking.packageId))
        .limit(1);
      commissionRate = Number(comm?.commissionAmount ?? 0);
    }

    // PIC name — look up from the correct table based on picType
    let picName: string | null = null;
    if (booking.picId && booking.picType && booking.picType !== "pusat") {
      if (booking.picType === "agen") {
        const [row] = await db
          .select({ name: agents.name })
          .from(agents)
          .where(eq(agents.id, booking.picId))
          .limit(1);
        picName = row?.name ?? null;
      } else if (booking.picType === "cabang") {
        const [row] = await db
          .select({ name: branches.name })
          .from(branches)
          .where(eq(branches.id, booking.picId))
          .limit(1);
        picName = row?.name ?? null;
      } else {
        // karyawan / other → profiles
        const [row] = await db
          .select({ name: profiles.name })
          .from(profiles)
          .where(eq(profiles.id, booking.picId))
          .limit(1);
        picName = row?.name ?? null;
      }
    }

    // Commission payout status from agent_commissions
    let agentCommission: { id: string; status: string; amount: number } | null = null;
    if (booking.picType === "agen" && booking.picId) {
      const [commEntry] = await db
        .select({
          id: agentCommissions.id,
          status: agentCommissions.status,
          amount: agentCommissions.amount,
        })
        .from(agentCommissions)
        .where(eq(agentCommissions.bookingId, id))
        .limit(1);
      agentCommission = commEntry ?? null;
    }

    res.json({ commissionRate, picName, agentCommission });
  } catch (e) {
    sendAdminError(res, "GET /api/admin/bookings/:id/pic-info", e);
  }
});

// ── GET /:id/passport-recommendation — Surat Rekomendasi Pembuatan Paspor ─────
router.get("/:id/passport-recommendation", async (req, res) => {
  try {
    const id = req.params.id as string;

    // Fetch booking
    const [booking] = await db
      .select({
        id: bookings.id,
        bookingCode: bookings.bookingCode,
        packageTitle: packages.title,
        departureDate: packageDepartures.departureDate,
        branchName: branches.name,
      })
      .from(bookings)
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(packageDepartures, eq(bookings.departureId, packageDepartures.id))
      .leftJoin(branches, eq(bookings.branchId, branches.id))
      .where(or(eq(bookings.id, id), eq(bookings.bookingCode, id.toUpperCase())))
      .limit(1);

    if (!booking) {
      // Fallback: cek Supabase jika booking tidak ada di local DB
      const userToken = (req.headers.authorization || "").replace("Bearer ", "");
      const sbBooking = await sbGetBooking(id, userToken);
      if (!sbBooking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }
      const [sbPkg, sbDep, sbPilgrims, brandingRowSb] = await Promise.all([
        sbGetPackage(sbBooking.package_id, userToken),
        sbGetDeparture(sbBooking.departure_id, userToken),
        sbGetPilgrims(sbBooking.id, userToken),
        db.select({ key: siteSettings.key, value: siteSettings.value })
          .from(siteSettings)
          .where(inArray(siteSettings.key, ["company_name", "company_city"])),
      ]);
      const brandingSb = Object.fromEntries(brandingRowSb.map((r) => [r.key, r.value]));
      const pdfBufferSb = await generatePassportRecommendationPdf({
        bookingCode: sbBooking.booking_code,
        packageTitle: sbPkg?.title ?? null,
        departureDate: sbDep?.departure_date ?? null,
        pilgrims: sbPilgrims.map((p: any) => ({
          name: p.name,
          nik: p.nik ?? null,
          birthDate: p.birth_date ? String(p.birth_date) : null,
          gender: p.gender ?? null,
        })),
        tenantName: String(brandingSb.company_name ?? "UmrohPlus"),
        city: String(brandingSb.company_city ?? "Jakarta"),
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="surat-rekomendasi-paspor-${sbBooking.booking_code}.pdf"`,
      );
      return res.send(pdfBufferSb);
    }

    // Fetch pilgrims
    const pilgrims = await db
      .select({
        name: bookingPilgrims.name,
        nik: bookingPilgrims.nik,
        birthDate: bookingPilgrims.birthDate,
        gender: bookingPilgrims.gender,
      })
      .from(bookingPilgrims)
      .where(eq(bookingPilgrims.bookingId, booking.id));

    // Fetch tenant branding
    const brandingRow = await db
      .select({ key: siteSettings.key, value: siteSettings.value })
      .from(siteSettings)
      .where(inArray(siteSettings.key, ["company_name", "company_city"]));

    const branding = Object.fromEntries(brandingRow.map((r) => [r.key, r.value]));

    const pdfBuffer = await generatePassportRecommendationPdf({
      bookingCode: booking.bookingCode,
      packageTitle: booking.packageTitle,
      departureDate: booking.departureDate,
      pilgrims: pilgrims.map((p) => ({
        name: p.name,
        nik: p.nik ?? null,
        birthDate: p.birthDate ? String(p.birthDate) : null,
        gender: p.gender ?? null,
      })),
      tenantName: String(branding.company_name ?? "UmrohPlus"),
      city: String(branding.company_city ?? "Jakarta"),
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="surat-rekomendasi-paspor-${booking.bookingCode}.pdf"`,
    );
    res.send(pdfBuffer);
  } catch (e) {
    sendAdminError(res, "GET /api/admin/bookings/:id/passport-recommendation", e);
  }
});

// ── DELETE /:id — hapus booking permanen (super admin only) ──────────────────
router.delete("/bulk", requireSuperAdmin, async (req, res) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids diperlukan (array)" });
      return;
    }

    // Restore quota for each booking yang punya departure
    const toDelete = await db
      .select({ id: bookings.id, departureId: bookings.departureId })
      .from(bookings)
      .where(inArray(bookings.id, ids));

    const departureGroups = new Map<string, number>();
    for (const b of toDelete) {
      if (b.departureId) {
        departureGroups.set(b.departureId, (departureGroups.get(b.departureId) ?? 0) + 1);
      }
    }

    await db.transaction(async (tx) => {
      // Hapus semua booking sekaligus (cascade via DB constraints)
      await tx.delete(bookings).where(inArray(bookings.id, ids));
      // Kursi dihitung ulang dari booking confirmed/completed yang tersisa
      for (const depId of departureGroups.keys()) {
        await syncDepartureQuota(depId, tx);
      }
    });

    res.json({ success: true, deleted: toDelete.length });
  } catch (e) {
    sendAdminError(res, "DELETE /api/admin/bookings/bulk", e);
  }
});

router.delete("/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);

    const [existing] = await db
      .select({ id: bookings.id, bookingCode: bookings.bookingCode, departureId: bookings.departureId })
      .from(bookings)
      .where(eq(bookings.id, id));

    if (!existing) {
      res.status(404).json({ error: "Booking tidak ditemukan" });
      return;
    }

    // Delete booking — cascades to bookingRooms, bookingPilgrims,
    // bookingPayments, bookingStatusLogs, pilgrimDocuments via DB constraints
    await db.delete(bookings).where(eq(bookings.id, id));

    // Kursi dikembalikan otomatis setelah booking dihapus
    await syncDepartureQuota(existing.departureId);

    res.json({ success: true, message: `Booking ${existing.bookingCode} berhasil dihapus` });
  } catch (e) {
    sendAdminError(res, "DELETE /api/admin/bookings/:id", e);
  }
});

export default router;
