import { Router } from "express";
import { db, bookingPilgrims, bookings, packageDepartures, packages, eq, desc, and, asc, sql } from "@workspace/db";

/** O-12: Kapasitas maksimum per tipe kamar */
const ROOM_CAPACITY: Record<string, number> = {
  single: 1,
  double: 2,
  triple: 3,
  quad: 4,
};

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
 * Assign room type and/or room number to a pilgrim.
 * O-12: Validates room capacity and gender conflict before saving.
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

    // O-12: Validasi kapasitas dan konflik gender jika room number diset
    if (roomNumber && roomType) {
      // Cari departure_id dari pilgrim ini
      const [pilgrim] = await db
        .select({ bookingId: bookingPilgrims.bookingId, gender: bookingPilgrims.gender })
        .from(bookingPilgrims)
        .where(eq(bookingPilgrims.id, pilgrimId))
        .limit(1);

      if (pilgrim) {
        const [booking] = await db
          .select({ departureId: bookings.departureId })
          .from(bookings)
          .where(eq(bookings.id, pilgrim.bookingId))
          .limit(1);

        if (booking?.departureId) {
          // Cari semua jamaah di departure yang sama dengan room number yang sama (exclude diri sendiri)
          const roommates = await db
            .select({ gender: bookingPilgrims.gender })
            .from(bookingPilgrims)
            .innerJoin(bookings, eq(bookingPilgrims.bookingId, bookings.id))
            .where(
              and(
                eq(bookings.departureId, booking.departureId),
                eq(bookingPilgrims.roomNumber, roomNumber),
                sql`${bookingPilgrims.id} != ${pilgrimId}`,
              ),
            );

          const capacity = ROOM_CAPACITY[roomType.toLowerCase()] ?? 4;
          if (roommates.length >= capacity) {
            return res.status(409).json({
              error: `Kamar ${roomNumber} sudah penuh — maks ${capacity} orang untuk tipe ${roomType}`,
            });
          }

          // Cek konflik gender (jika ada penghuni lain dan berbeda gender)
          if (pilgrim.gender && roommates.length > 0) {
            const genders = new Set(roommates.map((r) => r.gender).filter(Boolean));
            genders.add(pilgrim.gender);
            if (genders.size > 1) {
              return res.status(409).json({
                error: `Kamar ${roomNumber} memiliki konflik gender — tidak boleh mencampur jemaah pria dan wanita`,
              });
            }
          }
        }
      }
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
 * Bulk assign room numbers to multiple pilgrims at once.
 * O-12: Validates capacity and gender conflict per room number across the entire batch.
 */
router.post("/:departureId/bulk", async (req, res) => {
  try {
    const { departureId } = req.params;
    const assignments = req.body as Array<{ pilgrimId: string; roomNumber: string; roomType?: string }>;
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: "Data assignment tidak valid" });
    }

    // O-12: Validasi kapasitas — group by roomNumber dalam batch ini
    // Ambil data gender semua pilgrim dalam batch
    const pilgrimIds = assignments.map((a) => a.pilgrimId);
    const existingPilgrims = await db
      .select({ id: bookingPilgrims.id, gender: bookingPilgrims.gender, roomNumber: bookingPilgrims.roomNumber })
      .from(bookingPilgrims)
      .innerJoin(bookings, eq(bookingPilgrims.bookingId, bookings.id))
      .where(eq(bookings.departureId, departureId));

    // Build map dari pilgrimId → gender (dari data existing)
    const genderMap = new Map(existingPilgrims.map((p) => [p.id, p.gender]));

    // Group assignments by roomNumber → cek kapasitas + gender
    const byRoom = new Map<string, Array<{ pilgrimId: string; roomType: string; gender?: string | null }>>();
    for (const a of assignments) {
      if (!a.roomNumber) continue;
      if (!byRoom.has(a.roomNumber)) byRoom.set(a.roomNumber, []);
      byRoom.get(a.roomNumber)!.push({
        pilgrimId: a.pilgrimId,
        roomType: a.roomType || "quad",
        gender: genderMap.get(a.pilgrimId) ?? null,
      });
    }

    const validationErrors: string[] = [];
    for (const [roomNo, occupants] of byRoom) {
      const roomType = occupants[0].roomType;
      const capacity = ROOM_CAPACITY[roomType.toLowerCase()] ?? 4;

      if (occupants.length > capacity) {
        validationErrors.push(
          `Kamar ${roomNo}: ${occupants.length} orang melebihi kapasitas ${capacity} (tipe ${roomType})`,
        );
      }

      const genders = new Set(occupants.map((o) => o.gender).filter(Boolean));
      if (genders.size > 1) {
        validationErrors.push(`Kamar ${roomNo}: ada konflik gender (campur pria & wanita)`);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(409).json({ error: "Validasi kamar gagal", details: validationErrors });
    }

    // Simpan semua assignment
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
