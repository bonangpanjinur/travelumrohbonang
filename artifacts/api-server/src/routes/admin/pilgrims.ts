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
  like,
  desc,
} from "@workspace/db";

const router = Router();

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
          like(bookingPilgrims.name, s),
          like(bookingPilgrims.nik, s),
          like(bookingPilgrims.passportNumber, s),
          like(bookingPilgrims.phone, s),
          like(bookingPilgrims.email, s),
          like(bookings.bookingCode, s)
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
        const values = req.body;
        const id = Math.random().toString(36).substring(2, 15);
        const [inserted] = await db.insert(bookingPilgrims).values({
            id,
            ...values,
            createdAt: new Date(),
        }).returning();
        res.json(inserted);
    } catch (error) {
        res.status(500).json({ error: "Failed to create pilgrim" });
    }
});

router.patch("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    const values = req.body;
    const [updated] = await db
      .update(bookingPilgrims)
      .set(values)
      .where(eq(bookingPilgrims.id, id))
      .returning();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update pilgrim" });
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
