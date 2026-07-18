import { Router } from "express";
import {
  db,
  packageDepartures,
  departurePrices,
  packages,
  hotels,
  airlines,
  airports,
  muthawifs,
  bookings,
  bookingPilgrims,
  pilgrimDocuments,
  eq,
  and,
  gte,
  inArray,
} from "@workspace/db";
import { generateManifestPdf } from "../../lib/pdf/manifest";

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

    // Shape the response to match the snake_case + nested format the frontend expects.
    const departuresWithPrices = data.map((dep: any) => ({
      id: dep.id,
      package_id: dep.packageId,
      departure_date: dep.departureDate,
      return_date: dep.returnDate ?? null,
      quota: dep.quota,
      remaining_quota: dep.remainingQuota,
      status: dep.status,
      muthawif_id: dep.muthawifId ?? null,
      package: dep.packageTitle ? { id: dep.packageId, title: dep.packageTitle } : null,
      prices: (pricesByDeparture.get(dep.id) ?? []).map((p) => ({
        id: p.id,
        room_type: p.roomType,
        price: Number(p.price),
      })),
    }));

    res.json({ data: departuresWithPrices, total: departuresWithPrices.length });
  } catch (err) {
    console.error("[departures] GET / error:", err);
    res.status(500).json({ error: "Failed to fetch departures" });
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
          b.pic_name      AS "picName"
        FROM booking_pilgrims bp
        JOIN bookings b ON b.id = bp.booking_id
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
      // accept camelCase too in case callers are updated
      packageId: _pkgId, departureDate: _depDate, returnDate: _retDate,
      muthawifId: _mId,
    } = req.body;

    const resolvedPackageId   = package_id   ?? _pkgId;
    const resolvedDepDate     = departure_date ?? _depDate;
    const resolvedRetDate     = return_date   ?? _retDate ?? null;
    const resolvedMuthawifId  = muthawif_id  ?? _mId ?? null;
    const resolvedQuota       = Number(quota) || 45;

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
          packageId:      resolvedPackageId,
          departureDate:  resolvedDepDate,
          returnDate:     resolvedRetDate,
          quota:          resolvedQuota,
          remainingQuota: resolvedQuota,
          status:         status ?? "active",
          muthawifId:     resolvedMuthawifId || null,
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
      packageId: _pkgId, departureDate: _depDate, returnDate: _retDate, muthawifId: _mId,
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
