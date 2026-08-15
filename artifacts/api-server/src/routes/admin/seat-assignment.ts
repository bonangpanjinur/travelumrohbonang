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
import { resolveUserScope } from "../../lib/scopeGuard";

const router = Router();

async function departureScopeCondition(req: any) {
  const scope = await resolveUserScope(req);
  if (scope.type === "global") return sql`TRUE`;
  if (scope.type === "branch" && scope.branchId) return sql`EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_pilgrims.booking_id AND b.branch_id = ${scope.branchId})`;
  if (scope.type === "agent" && scope.agentId) return sql`EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_pilgrims.booking_id AND (b.agent_id = ${scope.agentId} OR (b.pic_type = 'agen' AND b.pic_id = ${scope.agentId})))`;
  return sql`FALSE`;
}

async function canAccessPilgrim(req: any, pilgrimId: string) {
  const scope = await resolveUserScope(req);
  if (scope.type === "global") return true;
  const rows = await db.execute(sql`SELECT 1 FROM booking_pilgrims bp JOIN bookings b ON b.id = bp.booking_id WHERE bp.id = ${pilgrimId} AND ${scope.type === "branch" ? sql`b.branch_id = ${scope.branchId ?? ""}` : sql`(b.agent_id = ${scope.agentId ?? ""} OR (b.pic_type = 'agen' AND b.pic_id = ${scope.agentId ?? ""}))`} LIMIT 1`);
  return ((rows as any).rows ?? rows).length > 0;
}

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
      .where(and(eq(bookings.departureId, departureId), await departureScopeCondition(req)))
      .orderBy(asc(bookingPilgrims.seatNumber), asc(bookingPilgrims.name));

    // Stats
    const assigned = rows.filter((r: any) => r.seatNumber).length;
    res.json({ data: rows, stats: { total: rows.length, assigned, unassigned: rows.length - assigned } });
  } catch (err) {
    sendAdminError(res, "GET /api/admin/seat-assignment", err);
  }
});

// ── PATCH /:pilgrimId — update kursi satu jemaah ─────────────────────────────

router.patch("/:pilgrimId", async (req, res) => {
  try {
    const { seatNumber, flightSegment } = req.body;
    if (!(await canAccessPilgrim(req, req.params.pilgrimId))) return res.status(403).json({ error: "Jemaah berada di luar scope Anda" });
    const patch: Record<string, unknown> = {};
    if (seatNumber !== undefined) patch.seatNumber = seatNumber ?? null;
    if (flightSegment !== undefined) patch.flightSegment = flightSegment ?? null;

    if (!Object.keys(patch).length) return res.status(400).json({ error: "No fields to update" });

    const [updated] = await db
      .update(bookingPilgrims)
      .set(patch)
      .where(and(eq(bookingPilgrims.id, req.params.pilgrimId), await departureScopeCondition(req)))
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

    const allowed = await Promise.all(assignments.map((a) => canAccessPilgrim(req, a.pilgrimId)));
    if (allowed.some((ok) => !ok)) return res.status(403).json({ error: "Salah satu jemaah berada di luar scope Anda" });

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
        .where(and(eq(bookingPilgrims.id, a.pilgrimId), await departureScopeCondition(req)));
      updated++;
    }

    res.json({ ok: true, updated });
  } catch (err) {
    sendAdminError(res, "POST /api/admin/seat-assignment/bulk", err);
  }
});

export default router;
