import { Router } from "express";
import {
  db,
  manifests,
  packageDepartures,
  departurePrices,
  packages,
  hotels,
  airlines,
  airports,
  muthawifs,
  bookings,
  bookingPilgrims,
  bookingPayments,
  checkIns,
  pilgrimDocuments,
  profiles,
  eq,
  and,
  gte,
  ne,
  inArray,
  sql,
  count,
} from "@workspace/db";
import { generateManifestPdf } from "../../lib/pdf/manifest";
import { sendAdminError } from "../../lib/adminApiError";

// mergeParams: true so req.params.packageId from parent router is accessible here
const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  try {
    // When mounted under /packages/:packageId/departures, filter by that package.
    const { packageId } = req.params as Record<string, string>;

    const baseQuery = db
      .select({
        id: packageDepartures.id,
        packageId: packageDepartures.packageId,
        departureDate: packageDepartures.departureDate,
        returnDate: packageDepartures.returnDate,
        quota: packageDepartures.quota,
        remainingQuota: packageDepartures.remainingQuota,
        status: packageDepartures.status,
        muthawifId: packageDepartures.muthawifId,
        // KB-F03: flight info
        airlineId: packageDepartures.airlineId,
        flightNumber: packageDepartures.flightNumber,
        departureAirportId: packageDepartures.departureAirportId,
        arrivalAirportId: packageDepartures.arrivalAirportId,
        packageTitle: packages.title,
      })
      .from(packageDepartures)
      .leftJoin(packages, eq(packageDepartures.packageId, packages.id));

    // Optional filters: status and minQuota (used by booking dialog)
    const { status: statusFilter, minQuota } = req.query as Record<string, string | undefined>;
    const conditions: ReturnType<typeof eq>[] = [];
    if (packageId) conditions.push(eq(packageDepartures.packageId, packageId));
    if (statusFilter) conditions.push(eq(packageDepartures.status, statusFilter as any));
    if (minQuota) conditions.push(gte(packageDepartures.remainingQuota, Number(minQuota)));

    const data = conditions.length
      ? await baseQuery.where(and(...conditions)).orderBy(packageDepartures.departureDate)
      : await baseQuery.orderBy(packageDepartures.departureDate);

    const departureIds = data.map((dep: any) => dep.id);

    // Hitung booking aktif (non-cancelled) per keberangkatan secara real-time
    // agar remaining_quota tidak bergantung pada kolom stored yang bisa tidak sinkron.
    const filledCountMap = new Map<string, number>();
    if (departureIds.length) {
      const counts = await db
        .select({
          departureId: bookings.departureId,
          filled: count(bookings.id),
        })
        .from(bookings)
        .where(
          and(
            inArray(bookings.departureId, departureIds),
            ne(bookings.status, "cancelled"),
          ),
        )
        .groupBy(bookings.departureId);
      for (const row of counts) {
        if (row.departureId) filledCountMap.set(row.departureId, Number(row.filled));
      }
    }

    const allPrices = departureIds.length
      ? await db
          .select({
            id: departurePrices.id,
            departureId: departurePrices.departureId,
            roomType: departurePrices.roomType,
            price: departurePrices.price,
          })
          .from(departurePrices)
          .where(inArray(departurePrices.departureId, departureIds))
      : [];

    const pricesByDeparture = new Map<string, typeof allPrices>();
    for (const price of allPrices) {
      const list = pricesByDeparture.get(price.departureId) ?? [];
      list.push(price);
      pricesByDeparture.set(price.departureId, list);
    }

    // Return camelCase — matches Drizzle default and frontend interface.
    const departuresWithPrices = data.map((dep: any) => {
      const filled = filledCountMap.get(dep.id) ?? 0;
      const realRemainingQuota = Math.max(0, (dep.quota ?? 0) - filled);
      return {
        id: dep.id,
        packageId: dep.packageId,
        departureDate: dep.departureDate,
        returnDate: dep.returnDate ?? null,
        quota: dep.quota,
        remainingQuota: realRemainingQuota,
        status: dep.status,
        muthawifId: dep.muthawifId ?? null,
        // KB-F03: flight info
        airlineId: dep.airlineId ?? null,
        flightNumber: dep.flightNumber ?? null,
        departureAirportId: dep.departureAirportId ?? null,
        arrivalAirportId: dep.arrivalAirportId ?? null,
        package: dep.packageTitle ? { id: dep.packageId, title: dep.packageTitle } : null,
        prices: (pricesByDeparture.get(dep.id) ?? []).map((p) => ({
          id: p.id,
          roomType: p.roomType,
          price: Number(p.price),
        })),
      };
    });

    res.json({ data: departuresWithPrices, total: departuresWithPrices.length });
  } catch (err) {
    sendAdminError(res, "GET /api/admin/departures", err);
  }
});

// --- Manifest PDF (F-06) — must come before generic /:id routes ---

/**
 * GET /api/admin/departures/:id/manifest-data
 * Returns full pilgrim manifest data (JSON) for the airline standard manifest page.
 */
router.get("/:id/manifest-data", async (req, res) => {
  try {
    const departureId = req.params.id as string;
    const { search, limit: limitParam, offset: offsetParam } = req.query as Record<string, string | undefined>;
    const limit = Math.min(Number(limitParam) || 50, 200);
    const offset = Number(offsetParam) || 0;
    const searchTerm = search?.trim() || "";

    const [departure] = await db
      .select({
        id: packageDepartures.id,
        departureDate: packageDepartures.departureDate,
        returnDate: packageDepartures.returnDate,
        quota: packageDepartures.quota,
        remainingQuota: packageDepartures.remainingQuota,
        status: packageDepartures.status,
        packageTitle: packages.title,
        muthawifId: packageDepartures.muthawifId,
      })
      .from(packageDepartures)
      .leftJoin(packages, eq(packageDepartures.packageId, packages.id))
      .where(eq(packageDepartures.id, departureId))
      .limit(1);

    if (!departure) {
      res.status(404).json({ error: "Departure not found" });
      return;
    }

    // Use raw SQL join so we can filter + paginate in one query
    const searchFilter = searchTerm
      ? sql`AND (
          bp.name ILIKE ${"%" + searchTerm + "%"}
          OR bp.passport_number ILIKE ${"%" + searchTerm + "%"}
          OR b.booking_code ILIKE ${"%" + searchTerm + "%"}
          OR b.group_name ILIKE ${"%" + searchTerm + "%"}
        )`
      : sql``;

    const [dataResult, countResult] = await Promise.all([
      db.execute(sql`
        SELECT
          bp.id,
          bp.booking_id   AS "bookingId",
          bp.name,
          bp.gender,
          bp.phone,
          bp.email,
          bp.nik,
          bp.birth_date   AS "birthDate",
          bp.nationality,
          bp.passport_number AS "passportNumber",
          bp.passport_expiry AS "passportExpiry",
          bp.room_type    AS "roomType",
          bp.room_number  AS "roomNumber",
          b.booking_code  AS "bookingCode",
          COALESCE(b.is_group_booking, false) AS "isGroupBooking",
          b.group_name    AS "groupName",
          b.pic_name      AS "picName",
          ci.checked_in_at AS "checkedInAt",
          ci.location      AS "checkInLocation"
        FROM booking_pilgrims bp
        JOIN bookings b ON b.id = bp.booking_id
        LEFT JOIN check_ins ci ON ci.pilgrim_id = bp.id AND ci.departure_id = ${departureId}
        WHERE b.departure_id = ${departureId}
          AND b.status IN ('paid','confirmed','processing','completed')
          ${searchFilter}
        ORDER BY bp.name
        LIMIT ${limit} OFFSET ${offset}
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM booking_pilgrims bp
        JOIN bookings b ON b.id = bp.booking_id
        WHERE b.departure_id = ${departureId}
          AND b.status IN ('paid','confirmed','processing','completed')
          ${searchFilter}
      `),
    ]);

    const pilgrimRows = (dataResult as any).rows ?? dataResult;
    const total = Number(((countResult as any).rows ?? countResult)[0]?.count ?? 0);
    const pilgrimIds = pilgrimRows.map((p: any) => p.id);

    // Fetch document status (paspor, visa, vaksin) for this page of pilgrims
    const DOC_TYPES = ["paspor", "visa", "vaksin"];
    const docRows = pilgrimIds.length
      ? await db
          .select({
            pilgrimId: pilgrimDocuments.pilgrimId,
            documentType: pilgrimDocuments.documentType,
            status: pilgrimDocuments.status,
          })
          .from(pilgrimDocuments)
          .where(
            and(
              inArray(pilgrimDocuments.pilgrimId, pilgrimIds),
              inArray(pilgrimDocuments.documentType, DOC_TYPES),
            ),
          )
      : [];

    const docStatusMap: Record<string, Record<string, string>> = {};
    for (const doc of docRows) {
      if (!docStatusMap[doc.pilgrimId]) docStatusMap[doc.pilgrimId] = {};
      docStatusMap[doc.pilgrimId][doc.documentType] = doc.status;
    }

    const rows = pilgrimRows.map((p: any) => ({
      id: p.id,
      bookingCode: p.bookingCode ?? "-",
      isGroupBooking: p.isGroupBooking ?? false,
      groupName: p.groupName ?? null,
      picName: p.picName ?? null,
      name: p.name,
      gender: p.gender,
      phone: p.phone,
      email: p.email,
      nik: p.nik,
      birthDate: p.birthDate,
      nationality: p.nationality,
      passportNumber: p.passportNumber,
      passportExpiry: p.passportExpiry,
      roomType: p.roomType,
      roomNumber: p.roomNumber,
      docStatus: {
        paspor: docStatusMap[p.id]?.paspor ?? null,
        visa:   docStatusMap[p.id]?.visa   ?? null,
        vaksin: docStatusMap[p.id]?.vaksin  ?? null,
      },
    }));

    res.json({
      departure,
      pilgrims: rows,
      total,
    });
  } catch (err) {
    console.error("[departures] manifest-data error:", err);
    res.status(500).json({ error: "Failed to fetch manifest data" });
  }
});

router.get("/:id/manifest.pdf", async (req, res) => {
  try {
    const departureId = req.params.id as string;

    const [departure] = await db
      .select({
        id: packageDepartures.id,
        departureDate: packageDepartures.departureDate,
        returnDate: packageDepartures.returnDate,
        quota: packageDepartures.quota,
        remainingQuota: packageDepartures.remainingQuota,
        packageTitle: packages.title,
      })
      .from(packageDepartures)
      .leftJoin(packages, eq(packageDepartures.packageId, packages.id))
      .where(eq(packageDepartures.id, departureId))
      .limit(1);

    if (!departure) {
      res.status(404).json({ error: "Departure not found" });
      return;
    }

    const departureBookings = await db
      .select({ id: bookings.id, bookingCode: bookings.bookingCode })
      .from(bookings)
      .where(eq(bookings.departureId, departureId));

    const bookingIds = departureBookings.map((b) => b.id);
    const bookingCodeById = new Map(departureBookings.map((b) => [b.id, b.bookingCode]));

    // Explicit column select — avoids enumerating columns that may not yet exist in DB
    const pilgrims = bookingIds.length
      ? await db
          .select({
            id: bookingPilgrims.id,
            bookingId: bookingPilgrims.bookingId,
            name: bookingPilgrims.name,
            gender: bookingPilgrims.gender,
            nik: bookingPilgrims.nik,
            phone: bookingPilgrims.phone,
            email: bookingPilgrims.email,
            birthDate: bookingPilgrims.birthDate,
            passportNumber: bookingPilgrims.passportNumber,
            passportExpiry: bookingPilgrims.passportExpiry,
            roomType: bookingPilgrims.roomType,
          })
          .from(bookingPilgrims)
          .where(inArray(bookingPilgrims.bookingId, bookingIds))
      : [];

    const photoDocs = pilgrims.length
      ? await db
          .select()
          .from(pilgrimDocuments)
          .where(
            and(
              inArray(pilgrimDocuments.pilgrimId, pilgrims.map((p) => p.id)),
              eq(pilgrimDocuments.documentType, "foto"),
            ),
          )
      : [];
    const photoByPilgrimId = new Map(photoDocs.map((d) => [d.pilgrimId, d.fileUrl]));

    const pdfBuffer = await generateManifestPdf({
      packageTitle: departure.packageTitle,
      departureDate: departure.departureDate,
      returnDate: departure.returnDate,
      quota: departure.quota,
      remainingQuota: departure.remainingQuota,
      pilgrims: pilgrims.map((p) => ({
        id: p.id,
        bookingCode: bookingCodeById.get(p.bookingId) ?? "-",
        name: p.name,
        gender: p.gender,
        nik: p.nik,
        passportNumber: p.passportNumber,
        roomType: p.roomType,
        photoUrl: photoByPilgrimId.get(p.id) ?? null,
      })),
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="manifest-${departure.departureDate}.pdf"`,
    );
    res.send(pdfBuffer);

    // MN-DB01: Simpan snapshot manifest setelah PDF berhasil dikirim
    db.insert(manifests).values({
      id: crypto.randomUUID(),
      departureId,
      printedBy: (req as any).user?.id ?? "admin",
      totalPilgrims: pilgrims.length,
      format: "pdf",
      snapshotJson: JSON.stringify({
        packageTitle: departure.packageTitle,
        departureDate: departure.departureDate,
        pilgrimCount: pilgrims.length,
        pilgrims: pilgrims.map((p) => ({
          id: p.id,
          bookingCode: bookingCodeById.get(p.bookingId) ?? "-",
          name: p.name,
          gender: p.gender,
          passportNumber: p.passportNumber,
          roomType: p.roomType,
          nik: p.nik,
        })),
      }),
    }).catch((err: any) => console.error("[MN-DB01] Failed to save manifest snapshot:", err));
  } catch (err) {
    console.error("[departures] Failed to generate manifest PDF:", err);
    res.status(500).json({ error: "Failed to generate manifest PDF" });
  }
});

router.post("/", async (req, res) => {
  try {
    // Frontend sends snake_case; map to Drizzle camelCase schema keys.
    const {
      prices,
      package_id,       departure_date,  return_date,
      muthawif_id,      quota,           status,
      // KB-F03: flight info — accept both snake_case and camelCase
      airline_id, flight_number, departure_airport_id, arrival_airport_id,
      // accept camelCase too in case callers are updated
      packageId: _pkgId, departureDate: _depDate, returnDate: _retDate,
      muthawifId: _mId,
      airlineId: _airId, flightNumber: _flNum,
      departureAirportId: _depAp, arrivalAirportId: _arrAp,
    } = req.body;

    const resolvedPackageId   = package_id   ?? _pkgId;
    const resolvedDepDate     = departure_date ?? _depDate;
    const resolvedRetDate     = return_date   ?? _retDate ?? null;
    const resolvedMuthawifId  = muthawif_id  ?? _mId ?? null;
    const resolvedQuota       = Number(quota) || 45;
    const resolvedAirlineId   = airline_id   ?? _airId   ?? null;
    const resolvedFlightNum   = flight_number ?? _flNum  ?? null;
    const resolvedDepAirport  = departure_airport_id ?? _depAp ?? null;
    const resolvedArrAirport  = arrival_airport_id   ?? _arrAp ?? null;

    if (!resolvedPackageId)   return res.status(400).json({ error: "package_id diperlukan" });
    if (!resolvedDepDate)     return res.status(400).json({ error: "departure_date diperlukan" });

    // Validasi: tanggal pulang harus setelah tanggal berangkat
    if (resolvedRetDate && new Date(resolvedRetDate) <= new Date(resolvedDepDate)) {
      return res.status(400).json({ error: "Tanggal pulang harus setelah tanggal berangkat" });
    }

    const id = crypto.randomUUID();

    // Wrap in transaction so departure + prices are always consistent.
    const created = await db.transaction(async (tx) => {
      const [dep] = await tx
        .insert(packageDepartures)
        .values({
          id,
          packageId:           resolvedPackageId,
          departureDate:       resolvedDepDate,
          returnDate:          resolvedRetDate,
          quota:               resolvedQuota,
          remainingQuota:      resolvedQuota,
          status:              status ?? "active",
          muthawifId:          resolvedMuthawifId || null,
          airlineId:           resolvedAirlineId,
          flightNumber:        resolvedFlightNum,
          departureAirportId:  resolvedDepAirport,
          arrivalAirportId:    resolvedArrAirport,
        })
        .returning();

      if (prices && typeof prices === "object") {
        const priceInserts = Object.entries(prices)
          .filter(([, p]) => Number(p) > 0)
          .map(([roomType, price]) => ({
            id: crypto.randomUUID(),
            departureId: id,
            roomType,
            price: Number(price),
          }));
        if (priceInserts.length > 0) {
          await tx.insert(departurePrices).values(priceInserts);
        }
      }

      return dep;
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("[departures] POST failed:", err);
    res.status(500).json({ error: "Failed to create departure" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    // Accept both snake_case (from legacy frontend form) and camelCase.
    const {
      prices,
      package_id, departure_date, return_date, muthawif_id,
      // KB-F03: flight info snake_case
      airline_id, flight_number, departure_airport_id, arrival_airport_id,
      packageId: _pkgId, departureDate: _depDate, returnDate: _retDate, muthawifId: _mId,
      // KB-F03: flight info camelCase
      airlineId: _airId, flightNumber: _flNum, departureAirportId: _depAp, arrivalAirportId: _arrAp,
      id: _id, createdAt: _ca, // strip immutable fields
      ...rest
    } = req.body;

    // Build Drizzle-compatible update object (camelCase only)
    const updates: Record<string, unknown> = { ...rest };
    if (package_id   ?? _pkgId)    updates.packageId      = package_id   ?? _pkgId;
    if (departure_date ?? _depDate) updates.departureDate  = departure_date ?? _depDate;
    if ("return_date" in req.body)  updates.returnDate     = return_date ?? _retDate ?? null;
    if (muthawif_id  !== undefined) updates.muthawifId     = muthawif_id  || null;
    else if (_mId    !== undefined) updates.muthawifId     = _mId         || null;
    if (rest.quota !== undefined)   updates.quota          = Number(rest.quota);
    // KB-F03: flight fields
    if (airline_id          !== undefined) updates.airlineId          = airline_id          ?? _airId ?? null;
    else if (_airId         !== undefined) updates.airlineId          = _airId              || null;
    if (flight_number       !== undefined) updates.flightNumber       = flight_number       ?? _flNum ?? null;
    else if (_flNum         !== undefined) updates.flightNumber       = _flNum              || null;
    if (departure_airport_id !== undefined) updates.departureAirportId = departure_airport_id ?? _depAp ?? null;
    else if (_depAp          !== undefined) updates.departureAirportId = _depAp              || null;
    if (arrival_airport_id   !== undefined) updates.arrivalAirportId   = arrival_airport_id  ?? _arrAp ?? null;
    else if (_arrAp          !== undefined) updates.arrivalAirportId   = _arrAp              || null;

    // Validasi tanggal: jika keduanya ada dalam update, cek langsung.
    // Jika hanya satu yang diupdate, ambil nilai yang ada dari DB.
    const newRetDate = updates.returnDate as string | null | undefined;
    const newDepDate = updates.departureDate as string | undefined;
    if (newRetDate) {
      let effectiveDepDate = newDepDate;
      if (!effectiveDepDate) {
        const [existing] = await db
          .select({ departureDate: packageDepartures.departureDate })
          .from(packageDepartures)
          .where(eq(packageDepartures.id, req.params.id))
          .limit(1);
        effectiveDepDate = existing?.departureDate ?? undefined;
      }
      if (effectiveDepDate && new Date(newRetDate) <= new Date(effectiveDepDate)) {
        return res.status(400).json({ error: "Tanggal pulang harus setelah tanggal berangkat" });
      }
    }

    // Wrap in transaction so departure + prices stay consistent.
    const updated = await db.transaction(async (tx) => {
      const [dep] = await tx
        .update(packageDepartures)
        .set(updates)
        .where(eq(packageDepartures.id, req.params.id))
        .returning();

      if (!dep) return null;

      if (prices && typeof prices === "object") {
        for (const [roomType, price] of Object.entries(prices)) {
          const [existing] = await tx
            .select()
            .from(departurePrices)
            .where(and(
              eq(departurePrices.departureId, req.params.id),
              eq(departurePrices.roomType, roomType),
            ))
            .limit(1);

          if (existing) {
            await tx
              .update(departurePrices)
              .set({ price: Number(price) })
              .where(eq(departurePrices.id, existing.id));
          } else {
            await tx.insert(departurePrices).values({
              id: crypto.randomUUID(),
              departureId: req.params.id,
              roomType,
              price: Number(price),
            });
          }
        }
      }

      return dep;
    });

    if (!updated) return res.status(404).json({ error: "Departure not found" });
    res.json(updated);
  } catch (err) {
    console.error("[departures] PATCH failed:", err);
    res.status(500).json({ error: "Failed to update departure" });
  }
});

/** POST /api/admin/departures/:id/clone — duplikat keberangkatan beserta harganya */
router.post("/:id/clone", async (req, res) => {
  try {
    const [original] = await db
      .select()
      .from(packageDepartures)
      .where(eq(packageDepartures.id, req.params.id))
      .limit(1);
    if (!original) return res.status(404).json({ error: "Departure not found" });

    const originalPrices = await db
      .select()
      .from(departurePrices)
      .where(eq(departurePrices.departureId, req.params.id));

    const newId = crypto.randomUUID();

    const cloned = await db.transaction(async (tx) => {
      const [dep] = await tx
        .insert(packageDepartures)
        .values({
          id: newId,
          packageId: original.packageId,
          departureDate: original.departureDate,
          returnDate: original.returnDate,
          quota: original.quota,
          remainingQuota: original.quota, // reset ke penuh
          status: "active",
          muthawifId: original.muthawifId,
        })
        .returning();

      if (originalPrices.length > 0) {
        await tx.insert(departurePrices).values(
          originalPrices.map((p) => ({
            id: crypto.randomUUID(),
            departureId: newId,
            roomType: p.roomType,
            price: p.price,
          }))
        );
      }
      return dep;
    });

    res.status(201).json(cloned);
  } catch (err) {
    console.error("[departures] clone failed:", err);
    res.status(500).json({ error: "Failed to clone departure" });
  }
});

/**
 * POST /api/admin/departures/:id/sync-quota
 * Recalculate remaining_quota dari COUNT booking aktif, perbaiki nilai stored di DB.
 * Gunakan ini untuk memperbaiki data yang tidak sinkron.
 */
router.post("/:id/sync-quota", async (req, res) => {
  try {
    const departureId = req.params.id;

    const [dep] = await db
      .select({ id: packageDepartures.id, quota: packageDepartures.quota })
      .from(packageDepartures)
      .where(eq(packageDepartures.id, departureId))
      .limit(1);

    if (!dep) return res.status(404).json({ error: "Departure not found" });

    const [{ filled }] = await db
      .select({ filled: count(bookings.id) })
      .from(bookings)
      .where(and(
        eq(bookings.departureId, departureId),
        ne(bookings.status, "cancelled"),
      ));

    const realFilled = Number(filled);
    const newRemaining = Math.max(0, (dep.quota ?? 0) - realFilled);
    const newStatus = newRemaining === 0 ? "penuh" : "active";

    const [updated] = await db
      .update(packageDepartures)
      .set({ remainingQuota: newRemaining, status: newStatus })
      .where(eq(packageDepartures.id, departureId))
      .returning();

    console.log(`[sync-quota] departure ${departureId}: quota=${dep.quota}, filled=${realFilled}, remaining=${newRemaining}`);
    res.json({ quota: dep.quota, filled: realFilled, remaining: newRemaining, status: newStatus });
  } catch (err) {
    console.error("[departures] sync-quota error:", err);
    res.status(500).json({ error: "Failed to sync quota" });
  }
});

// ── GET /:id/readiness — dashboard kesiapan per keberangkatan ─────────────────
router.get("/:id/readiness", async (req, res) => {
  try {
    const departureId = req.params.id;

    // Departure + package info and active bookings — run in parallel
    const [[dep], depBookings] = await Promise.all([
      db
        .select({
          id: packageDepartures.id,
          departureDate: packageDepartures.departureDate,
          returnDate: packageDepartures.returnDate,
          quota: packageDepartures.quota,
          packageTitle: packages.title,
        })
        .from(packageDepartures)
        .leftJoin(packages, eq(packageDepartures.packageId, packages.id))
        .where(eq(packageDepartures.id, departureId))
        .limit(1),
      db
        .select({ id: bookings.id, status: bookings.status, totalPrice: bookings.totalPrice })
        .from(bookings)
        .where(and(eq(bookings.departureId, departureId), ne(bookings.status, "cancelled"))),
    ]);

    if (!dep) return res.status(404).json({ error: "Departure not found" });

    const bookingIds = depBookings.map((b) => b.id);

    // Payment stats (no DB needed)
    const paid = depBookings.filter((b) => ["paid", "confirmed", "completed"].includes(b.status ?? "")).length;
    const unpaid = depBookings.length - paid;

    // Days until departure (no DB needed)
    const today = new Date();
    const dDate = dep.departureDate ? new Date(dep.departureDate) : null;
    const daysUntil = dDate ? Math.ceil((dDate.getTime() - today.getTime()) / 86_400_000) : null;

    if (!bookingIds.length) {
      return res.json({
        departure: { id: dep.id, departureDate: dep.departureDate, returnDate: dep.returnDate, quota: dep.quota, packageTitle: dep.packageTitle, daysUntil },
        jemaah: { total: 0, bookings: 0 },
        payment: { total: 0, paid: 0, unpaid: 0 },
        documents: { total: 0, complete: 0, incomplete: 0 },
        seats: { total: 0, assigned: 0, unassigned: 0 },
        checkIn: { total: 0, done: 0, pending: 0 },
      });
    }

    // Run all remaining queries in parallel
    const [pRows, ciRows] = await Promise.all([
      db
        .select({ id: bookingPilgrims.id, seatNumber: bookingPilgrims.seatNumber })
        .from(bookingPilgrims)
        .where(inArray(bookingPilgrims.bookingId, bookingIds)),
      db
        .select({ id: checkIns.id })
        .from(checkIns)
        .where(eq(checkIns.departureId, departureId)),
    ]);

    const totalJemaah = pRows.length;
    const seatAssigned = pRows.filter((p) => !!p.seatNumber).length;
    const checkInDone = ciRows.length;

    // Document stats — fetch docs for all pilgrims in one query
    const DOC_TYPES = ["paspor", "visa", "vaksin"];
    let docComplete = 0, docIncomplete = 0;
    const pilgrimIds = pRows.map((p) => p.id);
    if (pilgrimIds.length) {
      const docs = await db
        .select({ pilgrimId: pilgrimDocuments.pilgrimId, documentType: pilgrimDocuments.documentType, status: pilgrimDocuments.status })
        .from(pilgrimDocuments)
        .where(and(inArray(pilgrimDocuments.pilgrimId, pilgrimIds), inArray(pilgrimDocuments.documentType, DOC_TYPES)));
      for (const p of pRows) {
        const pDocs = docs.filter((d) => d.pilgrimId === p.id);
        const complete = DOC_TYPES.every((dt) => pDocs.some((d) => d.documentType === dt && d.status === "verified"));
        complete ? docComplete++ : docIncomplete++;
      }
    }

    res.json({
      departure: { id: dep.id, departureDate: dep.departureDate, returnDate: dep.returnDate, quota: dep.quota, packageTitle: dep.packageTitle, daysUntil },
      jemaah: { total: totalJemaah, bookings: depBookings.length },
      payment: { total: depBookings.length, paid, unpaid },
      documents: { total: totalJemaah, complete: docComplete, incomplete: docIncomplete },
      seats: { total: totalJemaah, assigned: seatAssigned, unassigned: totalJemaah - seatAssigned },
      checkIn: { total: totalJemaah, done: checkInDone, pending: Math.max(0, totalJemaah - checkInDone) },
    });
  } catch (err) {
    sendAdminError(res, "GET /api/admin/departures/:id/readiness", err);
  }
});

// ── POST /:id/blast — kirim notifikasi massal ke semua jemaah ─────────────────
router.post("/:id/blast", async (req, res) => {
  try {
    const departureId = req.params.id;
    const { message, channel = "both" } = req.body as { message: string; channel?: "wa" | "email" | "both" };

    if (!message?.trim()) return res.status(400).json({ error: "message required" });

    // Get departure + package info
    const [dep] = await db
      .select({ departureDate: packageDepartures.departureDate, packageTitle: packages.title })
      .from(packageDepartures)
      .leftJoin(packages, eq(packageDepartures.packageId, packages.id))
      .where(eq(packageDepartures.id, departureId))
      .limit(1);
    if (!dep) return res.status(404).json({ error: "Departure not found" });

    // Get all active bookings with user profiles
    const rows = await db
      .select({
        bookingCode: bookings.bookingCode,
        userId: bookings.userId,
        pemesanName: bookings.pemesanName,
        pemesanPhone: bookings.pemesanPhone,
        pemesanEmail: bookings.pemesanEmail,
        profileName: profiles.name,
        profilePhone: profiles.phone,
        profileEmail: profiles.email,
      })
      .from(bookings)
      .leftJoin(profiles, eq(profiles.id, bookings.userId))
      .where(and(eq(bookings.departureId, departureId), ne(bookings.status, "cancelled")));

    const depDateStr = dep.departureDate
      ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })
          .format(new Date(dep.departureDate))
      : "-";

    let sentWa = 0, sentEmail = 0, failedWa = 0, failedEmail = 0;

    const { sendWhatsApp } = await import("@workspace/whatsapp");
    const { Resend } = await import("resend");
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    for (const row of rows) {
      const phone = row.pemesanPhone || row.profilePhone;
      const email = row.pemesanEmail || row.profileEmail;
      const name = row.pemesanName || row.profileName || "Jamaah";

      const waBody = `Halo *${name}*,\n\n${message}\n\n📅 Paket: *${dep.packageTitle ?? "Umroh"}*\nTanggal: *${depDateStr}*\nKode Booking: *${row.bookingCode}*\n\n_Tim ${process.env.EMAIL_FROM_NAME ?? "UmrohPlus"}_`;

      if ((channel === "wa" || channel === "both") && phone) {
        try {
          await sendWhatsApp(phone, waBody);
          sentWa++;
        } catch { failedWa++; }
      }
      if ((channel === "email" || channel === "both") && email && resend) {
        try {
          await resend.emails.send({
            from: `${process.env.EMAIL_FROM_NAME ?? "UmrohPlus"} <${process.env.EMAIL_FROM ?? "noreply@example.com"}>`,
            to: email,
            subject: `Informasi Keberangkatan — ${dep.packageTitle ?? "Umroh"}`,
            text: `Halo ${name},\n\n${message}\n\nPaket: ${dep.packageTitle}\nTanggal: ${depDateStr}\nKode Booking: ${row.bookingCode}`,
          });
          sentEmail++;
        } catch { failedEmail++; }
      }
    }

    res.json({ ok: true, total: rows.length, sentWa, sentEmail, failedWa, failedEmail });
  } catch (err) {
    sendAdminError(res, "POST /api/admin/departures/:id/blast", err);
  }
});

/**
 * GET /api/admin/departures/:id/manifest-summary
 * Quick summary: confirmed pilgrims + doc completion counts
 */
router.get("/:id/manifest-summary", async (req, res) => {
  try {
    const departureId = req.params.id as string;

    const [confirmedResult] = await db
      .select({ total: count(bookingPilgrims.id) })
      .from(bookingPilgrims)
      .innerJoin(bookings, eq(bookingPilgrims.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.departureId, departureId),
          inArray(bookings.status, ["paid", "confirmed", "processing", "completed"]),
        ),
      );
    const confirmedPilgrims = Number(confirmedResult?.total ?? 0);

    const docsResult = await db.execute(sql`
      SELECT COUNT(DISTINCT bp.id)::int AS complete_count
      FROM booking_pilgrims bp
      JOIN bookings b ON b.id = bp.booking_id
      WHERE b.departure_id = ${departureId}
        AND b.status IN ('paid','confirmed','processing','completed')
        AND (
          SELECT COUNT(*) FROM pilgrim_documents pd
          WHERE pd.pilgrim_id = bp.id
            AND pd.document_type IN ('paspor','visa','vaksin')
            AND pd.status = 'verified'
        ) >= 3
    `);
    const docsComplete = Number(((docsResult as any).rows ?? docsResult)[0]?.complete_count ?? 0);

    res.json({
      confirmedPilgrims,
      docsComplete,
      docsIncomplete: Math.max(0, confirmedPilgrims - docsComplete),
    });
  } catch (err) {
    console.error("[departures] manifest-summary error:", err);
    res.status(500).json({ error: "Failed to fetch manifest summary" });
  }
});

/**
 * GET /api/admin/departures/:id/manifest-history
 * List of manifest print snapshots for audit trail
 */
router.get("/:id/manifest-history", async (req, res) => {
  try {
    const departureId = req.params.id as string;
    const history = await db
      .select({
        id: manifests.id,
        printedAt: manifests.printedAt,
        printedBy: manifests.printedBy,
        totalPilgrims: manifests.totalPilgrims,
        snapshotJson: manifests.snapshotJson,
      })
      .from(manifests)
      .where(eq(manifests.departureId, departureId))
      .orderBy(manifests.printedAt);
    // Indicate whether each snapshot has full pilgrim data (KB-F08)
    const mapped = history.map((h) => {
      let hasPilgrimData = false;
      try {
        const parsed = h.snapshotJson ? JSON.parse(h.snapshotJson) : null;
        hasPilgrimData = Array.isArray(parsed?.pilgrims) && parsed.pilgrims.length > 0;
      } catch { /* ignore */ }
      return {
        id: h.id,
        printedAt: h.printedAt,
        printedBy: h.printedBy,
        totalPilgrims: h.totalPilgrims,
        hasPilgrimData,
      };
    });
    res.json({ history: mapped });
  } catch (err) {
    console.error("[departures] manifest-history error:", err);
    res.status(500).json({ error: "Failed to fetch manifest history" });
  }
});

/**
 * GET /api/admin/departures/:id/manifest-history/:snapshotId
 * Detail satu snapshot manifest — termasuk daftar jemaah (KB-F08)
 */
router.get("/:id/manifest-history/:snapshotId", async (req, res) => {
  try {
    const { snapshotId } = req.params;
    const [row] = await db
      .select({
        id: manifests.id,
        printedAt: manifests.printedAt,
        printedBy: manifests.printedBy,
        totalPilgrims: manifests.totalPilgrims,
        snapshotJson: manifests.snapshotJson,
      })
      .from(manifests)
      .where(eq(manifests.id, snapshotId))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Snapshot tidak ditemukan" });
      return;
    }

    let parsed: any = {};
    try { parsed = row.snapshotJson ? JSON.parse(row.snapshotJson) : {}; } catch { /* ignore */ }

    res.json({
      snapshot: {
        id: row.id,
        printedAt: row.printedAt,
        printedBy: row.printedBy,
        totalPilgrims: row.totalPilgrims,
        pilgrims: parsed.pilgrims ?? [],
        packageTitle: parsed.packageTitle ?? null,
        departureDate: parsed.departureDate ?? null,
      },
    });
  } catch (err) {
    console.error("[departures] manifest-history detail error:", err);
    res.status(500).json({ error: "Failed to fetch manifest snapshot" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(departurePrices).where(eq(departurePrices.departureId, req.params.id));
    const [deleted] = await db.delete(packageDepartures).where(eq(packageDepartures.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Departure not found" });
    return res.json({ message: "Departure deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete departure" });
  }
});

export default router;
