/**
 * JM-F01 — Admin: Database Jemaah — master view of all booking_pilgrims
 * Supports server-side search + pagination.
 *
 * GET /api/admin/pilgrims-db
 *   ?search=  — name / nik / passport_number / phone
 *   ?limit=   — default 50, max 200
 *   ?offset=  — default 0
 */
import { Router } from "express";
import { db, sql } from "@workspace/db";

const router = Router();

router.get("/", async (req, res) => {
  const { search = "", limit = "50", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 50, 200);
  const off = parseInt(offset) || 0;
  const q = `%${search}%`;

  const searchCond = search
    ? sql`AND (
        bp.name ILIKE ${q}
        OR bp.nik ILIKE ${q}
        OR bp.passport_number ILIKE ${q}
        OR bp.phone ILIKE ${q}
      )`
    : sql``;

  try {
    const countResult = await db.execute<{ total: string }>(sql`
      SELECT COUNT(*)::int AS total
      FROM booking_pilgrims bp
      JOIN bookings b ON b.id = bp.booking_id
      WHERE 1=1 ${searchCond}
    `);
    const countRow = countResult.rows[0];

    const rowsResult = await db.execute<Record<string, any>>(sql`
      SELECT
        bp.id,
        bp.booking_id       AS "bookingId",
        bp.pilgrim_id       AS "pilgrimId",
        bp.name,
        bp.phone,
        bp.email,
        bp.gender,
        bp.nik,
        bp.birth_date       AS "birthDate",
        bp.nationality,
        bp.passport_number  AS "passportNumber",
        bp.passport_expiry  AS "passportExpiry",
        bp.room_type        AS "roomType",
        bp.created_at       AS "createdAt",
        b.booking_code      AS "bookingCode",
        b.status            AS "bookingStatus",
        pkg.title           AS "packageTitle",
        pd.departure_date   AS "departureDate"
      FROM booking_pilgrims bp
      JOIN bookings b ON b.id = bp.booking_id
      LEFT JOIN packages pkg ON pkg.id = b.package_id
      LEFT JOIN package_departures pd ON pd.id = b.departure_id
      WHERE 1=1 ${searchCond}
      ORDER BY bp.created_at DESC
      LIMIT ${lim} OFFSET ${off}
    `);

    res.json({ data: rowsResult.rows, total: Number(countRow?.total ?? 0) });
  } catch (e) {
    console.error("[pilgrims-db GET /]", e);
    res.status(500).json({ error: "Failed to fetch pilgrims database" });
  }
});

export default router;
