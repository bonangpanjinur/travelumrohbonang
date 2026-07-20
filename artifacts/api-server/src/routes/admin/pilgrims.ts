import { Router } from "express";
import {
  db,
  bookingPilgrims,
  bookings,
  packages,
  packageDepartures,
  pilgrimDocuments,
  checkIns,
  eq,
  and,
  or,
  ilike,
  desc,
  inArray,
} from "@workspace/db";

const router = Router();

// Only these columns may be written via the admin pilgrim form. Without this
// whitelist, `...req.body` spread straight into insert/update let a caller
// set arbitrary bookingPilgrims columns (e.g. bookingId, id) via the API.
const PILGRIM_WRITABLE_FIELDS = [
  "bookingId",
  "name",
  "nik",
  "phone",
  "email",
  "gender",
  "birthDate",
  "nationality",
  "passportNumber",
  "passportExpiry",
  "roomType",
] as const;

function pickPilgrimFields(body: unknown): Record<string, unknown> {
  const source = (body ?? {}) as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const field of PILGRIM_WRITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      result[field] = source[field];
    }
  }
  return result;
}

router.get("/", async (req: any, res) => {
  try {
    const { search } = req.query;
    
    let query = db
      .select({
        id: bookingPilgrims.id,
        name: bookingPilgrims.name,
        nik: bookingPilgrims.nik,
        phone: bookingPilgrims.phone,
        email: bookingPilgrims.email,
        gender: bookingPilgrims.gender,
        birthDate: bookingPilgrims.birthDate,
        passportNumber: bookingPilgrims.passportNumber,
        passportExpiry: bookingPilgrims.passportExpiry,
        bookingId: bookingPilgrims.bookingId,
        createdAt: bookingPilgrims.createdAt,
        booking: {
          id: bookings.id,
          bookingCode: bookings.bookingCode,
          status: bookings.status,
          totalPrice: bookings.totalPrice,
          packageTitle: packages.title,
          departureDate: packageDepartures.departureDate,
        }
      })
      .from(bookingPilgrims)
      .leftJoin(bookings, eq(bookingPilgrims.bookingId, bookings.id))
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(packageDepartures, eq(bookings.departureId, packageDepartures.id));

    if (search && typeof search === "string") {
      const s = `%${search}%`;
      query = query.where(
        or(
          ilike(bookingPilgrims.name, s),
          ilike(bookingPilgrims.nik, s),
          ilike(bookingPilgrims.passportNumber, s),
          ilike(bookingPilgrims.phone, s),
          ilike(bookingPilgrims.email, s),
          ilike(bookings.bookingCode, s)
        )
      ) as any;
    }

    const data = await query.orderBy(desc(bookingPilgrims.createdAt));
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch pilgrims" });
  }
});

router.post("/", async (req: any, res) => {
    try {
        const values = pickPilgrimFields(req.body);
        if (!values.name) {
          return res.status(400).json({ error: "name is required" });
        }
        const id = crypto.randomUUID();
        const [inserted] = await db.insert(bookingPilgrims).values({
            id,
            ...values,
            createdAt: new Date(),
        } as typeof bookingPilgrims.$inferInsert).returning();
        res.json(inserted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create pilgrim" });
    }
});

router.patch("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    const values = pickPilgrimFields(req.body);
    if (Object.keys(values).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    const [updated] = await db
      .update(bookingPilgrims)
      .set(values)
      .where(eq(bookingPilgrims.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Pilgrim not found" });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update pilgrim" });
  }
});

// ── POST /bulk — import banyak jemaah sekaligus (maks 500) ──────────────────
router.post("/bulk", async (req: any, res) => {
  try {
    const { pilgrims: rows } = req.body ?? {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "Array 'pilgrims' wajib diisi" });
    }
    if (rows.length > 500) {
      return res.status(400).json({ error: "Maksimal 500 jemaah per import" });
    }

    const errors: string[] = [];
    const inserts: (typeof bookingPilgrims.$inferInsert)[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const values = pickPilgrimFields(row);
      if (!values.name || !(values.name as string).trim()) {
        errors.push(`Baris ${i + 1}: kolom 'nama' wajib diisi`);
        continue;
      }
      inserts.push({
        id: crypto.randomUUID(),
        ...values,
        name: (values.name as string).trim(),
        createdAt: new Date(),
      } as typeof bookingPilgrims.$inferInsert);
    }

    if (errors.length > 0) {
      return res.status(422).json({ error: "Validasi gagal", errors });
    }

    const inserted = await db.insert(bookingPilgrims).values(inserts).returning();
    res.status(201).json({ inserted: inserted.length, pilgrims: inserted });
  } catch (err: any) {
    console.error("[pilgrims] POST /bulk", err.message);
    res.status(500).json({ error: "Gagal import massal", detail: err.message });
  }
});

// ── Departure recap: who has / hasn't checked in ────────────────────────────
router.get("/departure-recap", async (req: any, res) => {
  try {
    const { departureId } = req.query as Record<string, string>;
    if (!departureId) {
      res.status(400).json({ error: "departureId is required" });
      return;
    }

    // All pilgrims for this departure (via bookings.departureId)
    const pilgrims = await db
      .select({
        id:             bookingPilgrims.id,
        name:           bookingPilgrims.name,
        nik:            bookingPilgrims.nik,
        phone:          bookingPilgrims.phone,
        gender:         bookingPilgrims.gender,
        bookingId:      bookingPilgrims.bookingId,
        bookingCode:    bookings.bookingCode,
      })
      .from(bookingPilgrims)
      .innerJoin(bookings, eq(bookingPilgrims.bookingId, bookings.id))
      .where(eq(bookings.departureId, departureId));

    if (!pilgrims.length) {
      res.json({ total: 0, checkedIn: 0, notCheckedIn: 0, pilgrims: [] });
      return;
    }

    const pilgrimIds = pilgrims.map((p) => p.id);
    const ciRows = pilgrimIds.length
      ? await db
          .select({
            pilgrimId:   checkIns.pilgrimId,
            checkedInAt: checkIns.checkedInAt,
            location:    checkIns.location,
          })
          .from(checkIns)
          .where(
            and(
              inArray(checkIns.pilgrimId, pilgrimIds),
              eq(checkIns.departureId, departureId),
            ),
          )
          .orderBy(desc(checkIns.checkedInAt))
      : [];

    // Latest check-in per pilgrim
    const ciMap = new Map<string, { checkedInAt: Date; location: string | null }>();
    for (const r of ciRows) {
      if (!ciMap.has(r.pilgrimId)) {
        ciMap.set(r.pilgrimId, { checkedInAt: r.checkedInAt, location: r.location });
      }
    }

    const result = pilgrims.map((p) => {
      const ci = ciMap.get(p.id);
      return { ...p, checkedIn: !!ci, checkedInAt: ci?.checkedInAt ?? null, location: ci?.location ?? null };
    });

    const checkedIn = result.filter((p) => p.checkedIn).length;
    res.json({
      total:        result.length,
      checkedIn,
      notCheckedIn: result.length - checkedIn,
      pilgrims:     result,
    });
  } catch (e) {
    console.error("[pilgrims GET /departure-recap]", e);
    res.status(500).json({ error: "Failed to fetch departure recap" });
  }
});

// ── Manual check-in by search ─────────────────────────────────────────────
router.get("/search", async (req: any, res) => {
  try {
    const { q = "", departureId } = req.query as Record<string, string>;
    if (!q.trim()) { res.json([]); return; }
    const s = `%${q}%`;

    let base = db
      .select({
        id:          bookingPilgrims.id,
        name:        bookingPilgrims.name,
        nik:         bookingPilgrims.nik,
        phone:       bookingPilgrims.phone,
        gender:      bookingPilgrims.gender,
        bookingId:   bookingPilgrims.bookingId,
        bookingCode: bookings.bookingCode,
        departureId: bookings.departureId,
        packageTitle: packages.title,
        departureDate: packageDepartures.departureDate,
      })
      .from(bookingPilgrims)
      .leftJoin(bookings,          eq(bookingPilgrims.bookingId,    bookings.id))
      .leftJoin(packages,          eq(bookings.packageId,           packages.id))
      .leftJoin(packageDepartures, eq(bookings.departureId,         packageDepartures.id))
      .where(
        and(
          or(ilike(bookingPilgrims.name, s), ilike(bookingPilgrims.nik, s)),
          departureId ? eq(bookings.departureId, departureId) : undefined,
        ),
      )
      .$dynamic();

    const rows = await base.limit(20);
    res.json(rows);
  } catch (e) {
    console.error("[pilgrims GET /search]", e);
    res.status(500).json({ error: "Failed to search pilgrims" });
  }
});

// Check-ins
router.get("/check-ins", async (req: any, res) => {
  try {
    const data = await db
      .select({
        id: checkIns.id,
        pilgrimId: checkIns.pilgrimId,
        bookingId: checkIns.bookingId,
        departureId: checkIns.departureId,
        location: checkIns.location,
        notes: checkIns.notes,
        checkedInBy: checkIns.checkedInBy,
        checkedInAt: checkIns.checkedInAt,
        pilgrimName: bookingPilgrims.name,
      })
      .from(checkIns)
      .leftJoin(bookingPilgrims, eq(checkIns.pilgrimId, bookingPilgrims.id))
      .orderBy(desc(checkIns.checkedInAt))
      .limit(100);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch check-ins" });
  }
});

router.post("/check-in", async (req: any, res) => {
  try {
    const { pilgrimId, departureId, bookingId, location, notes } = req.body;
    if (!pilgrimId) {
      return res.status(400).json({ error: "pilgrimId is required" });
    }

    const [pilgrim] = await db
      .select({ id: bookingPilgrims.id, bookingId: bookingPilgrims.bookingId })
      .from(bookingPilgrims)
      .where(eq(bookingPilgrims.id, pilgrimId))
      .limit(1);

    if (!pilgrim) {
      return res.status(404).json({ error: "Pilgrim not found" });
    }

    const [created] = await db
      .insert(checkIns)
      .values({
        id: crypto.randomUUID(),
        pilgrimId,
        bookingId: bookingId ?? pilgrim.bookingId ?? null,
        departureId: departureId ?? null,
        location: location ?? null,
        notes: notes ?? null,
        checkedInBy: req.user?.id ?? null,
        checkedInAt: new Date(),
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to record check-in" });
  }
});

export default router;
