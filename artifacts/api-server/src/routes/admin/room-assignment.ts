import { Router } from "express";
import { db, bookingPilgrims, bookings, packageDepartures, packages, eq, desc, and, asc } from "@workspace/db";

const router = Router();

/**
 * GET /api/admin/room-assignment/departures
 * List upcoming departures for the room-assignment selector
 */
router.get("/departures", async (_req, res) => {
  try {
    const data = await db
      .select({
        id: packageDepartures.id,
        departureDate: packageDepartures.departureDate,
        returnDate: packageDepartures.returnDate,
        quota: packageDepartures.quota,
        packageId: packageDepartures.packageId,
        packageTitle: packages.title,
      })
      .from(packageDepartures)
      .leftJoin(packages, eq(packageDepartures.packageId, packages.id))
      .orderBy(asc(packageDepartures.departureDate));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data keberangkatan" });
  }
});

/**
 * GET /api/admin/room-assignment/:departureId/pilgrims
 * Get all pilgrims for a departure, grouped by room type, with current room assignment
 */
router.get("/:departureId/pilgrims", async (req, res) => {
  try {
    const { departureId } = req.params;
    const data = await db
      .select({
        pilgrimId: bookingPilgrims.id,
        pilgrimName: bookingPilgrims.name,
        gender: bookingPilgrims.gender,
        phone: bookingPilgrims.phone,
        roomType: bookingPilgrims.roomType,
        roomNumber: bookingPilgrims.roomNumber,
        bookingId: bookingPilgrims.bookingId,
        bookingCode: bookings.bookingCode,
      })
      .from(bookingPilgrims)
      .innerJoin(bookings, eq(bookingPilgrims.bookingId, bookings.id))
      .where(eq(bookings.departureId, departureId))
      .orderBy(asc(bookingPilgrims.roomType), asc(bookingPilgrims.name));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data jemaah" });
  }
});

/**
 * PATCH /api/admin/room-assignment/pilgrims/:pilgrimId
 * Assign room type and/or room number to a pilgrim
 */
router.patch("/pilgrims/:pilgrimId", async (req, res) => {
  try {
    const { pilgrimId } = req.params;
    const { roomType, roomNumber } = req.body as { roomType?: string; roomNumber?: string };

    const updateData: Record<string, unknown> = {};
    if (roomType !== undefined) updateData.roomType = roomType;
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Tidak ada data yang diupdate" });
    }

    const [updated] = await db
      .update(bookingPilgrims)
      .set(updateData)
      .where(eq(bookingPilgrims.id, pilgrimId))
      .returning();

    if (!updated) return res.status(404).json({ error: "Jemaah tidak ditemukan" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Gagal update kamar jemaah" });
  }
});

/**
 * POST /api/admin/room-assignment/:departureId/bulk
 * Bulk assign room numbers to multiple pilgrims at once
 */
router.post("/:departureId/bulk", async (req, res) => {
  try {
    const assignments = req.body as Array<{ pilgrimId: string; roomNumber: string; roomType?: string }>;
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: "Data assignment tidak valid" });
    }

    const results = await Promise.all(
      assignments.map(({ pilgrimId, roomNumber, roomType }) => {
        const updateData: Record<string, unknown> = { roomNumber };
        if (roomType) updateData.roomType = roomType;
        return db
          .update(bookingPilgrims)
          .set(updateData)
          .where(eq(bookingPilgrims.id, pilgrimId))
          .returning();
      }),
    );

    res.json({ updated: results.flat().length });
  } catch (err) {
    res.status(500).json({ error: "Gagal bulk update kamar" });
  }
});

export default router;
