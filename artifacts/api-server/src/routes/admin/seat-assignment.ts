/**
 * O-10: Seat Assignment — penempatan kursi pesawat per jemaah
 *
 * GET   /api/admin/seat-assignment?departureId=X   — list jemaah beserta kursi
 * PATCH /api/admin/seat-assignment/:pilgrimId       — update kursi jemaah
 * POST  /api/admin/seat-assignment/bulk             — bulk update kursi
 */

import { Router } from "express";
import {
  db, bookingPilgrims, bookings, packageDepartures,
  eq, and, inArray, sql, asc, isNull,
} from "@workspace/db";
import { sendAdminError } from "../../lib/adminApiError";

const router = Router();

// ── GET / — list jemaah + kursi per departure ─────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const { departureId } = req.query as { departureId?: string };

    if (!departureId) {
      return res.status(400).json({ error: "departureId query param required" });
    }

    const rows = await db
      .select({
        id: bookingPilgrims.id,
        name: bookingPilgrims.name,
        gender: bookingPilgrims.gender,
        nik: bookingPilgrims.nik,
        passportNumber: bookingPilgrims.passportNumber,
        roomType: bookingPilgrims.roomType,
        roomNumber: bookingPilgrims.roomNumber,
        seatNumber: bookingPilgrims.seatNumber,
        flightSegment: bookingPilgrims.flightSegment,
        bookingId: bookingPilgrims.bookingId,
        bookingCode: bookings.bookingCode,
      })
      .from(bookingPilgrims)
      .leftJoin(bookings, eq(bookingPilgrims.bookingId, bookings.id))
      .where(eq(bookings.departureId, departureId))
      .orderBy(asc(bookingPilgrims.seatNumber), asc(bookingPilgrims.name));

    // Stats
    const assigned = rows.filter((r) => r.seatNumber).length;
    res.json({ data: rows, stats: { total: rows.length, assigned, unassigned: rows.length - assigned } });
  } catch (err) {
    sendAdminError(res, "GET /api/admin/seat-assignment", err);
  }
});

// ── PATCH /:pilgrimId — update kursi satu jemaah ─────────────────────────────

router.patch("/:pilgrimId", async (req, res) => {
  try {
    const { seatNumber, flightSegment } = req.body;
    const patch: Record<string, unknown> = {};
    if (seatNumber !== undefined) patch.seatNumber = seatNumber ?? null;
    if (flightSegment !== undefined) patch.flightSegment = flightSegment ?? null;

    if (!Object.keys(patch).length) return res.status(400).json({ error: "No fields to update" });

    const [updated] = await db
      .update(bookingPilgrims)
      .set(patch)
      .where(eq(bookingPilgrims.id, req.params.pilgrimId))
      .returning();

    if (!updated) return res.status(404).json({ error: "Pilgrim not found" });
    res.json(updated);
  } catch (err) {
    sendAdminError(res, "PATCH /api/admin/seat-assignment/:pilgrimId", err);
  }
});

// ── POST /bulk — bulk update kursi ───────────────────────────────────────────

router.post("/bulk", async (req, res) => {
  try {
    const { assignments } = req.body as {
      assignments: Array<{ pilgrimId: string; seatNumber: string; flightSegment?: string }>;
    };

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: "assignments array required" });
    }

    // Check for duplicate seat numbers within the same flight segment
    const seen = new Map<string, string>();
    for (const a of assignments) {
      if (!a.seatNumber) continue;
      const key = `${a.flightSegment ?? ""}:${a.seatNumber.toUpperCase()}`;
      if (seen.has(key)) {
        return res.status(409).json({
          error: `Kursi ${a.seatNumber} (${a.flightSegment ?? "umum"}) sudah digunakan`,
        });
      }
      seen.set(key, a.pilgrimId);
    }

    let updated = 0;
    for (const a of assignments) {
      await db
        .update(bookingPilgrims)
        .set({
          seatNumber: a.seatNumber ?? null,
          flightSegment: a.flightSegment ?? null,
        })
        .where(eq(bookingPilgrims.id, a.pilgrimId));
      updated++;
    }

    res.json({ ok: true, updated });
  } catch (err) {
    sendAdminError(res, "POST /api/admin/seat-assignment/bulk", err);
  }
});

export default router;
