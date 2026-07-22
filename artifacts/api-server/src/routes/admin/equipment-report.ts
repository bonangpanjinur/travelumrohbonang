/**
 * PL-F03: Laporan distribusi perlengkapan
 * GET /api/admin/equipment-report  — ringkasan distribusi per item
 * GET /api/admin/equipment-report/csv  — export CSV
 */
import { Router } from "express";
import { db, sql } from "@workspace/db";

const router = Router();

// GET /api/admin/equipment-report
router.get("/", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        e.id           AS "itemId",
        e.name         AS "itemName",
        e.category     AS "category",
        e.total_stock  AS "totalStock",
        COUNT(pe.id)                                            AS "totalAssigned",
        COUNT(pe.id) FILTER (WHERE pe.status = 'pending')      AS "pending",
        COUNT(pe.id) FILTER (WHERE pe.status = 'distributed')  AS "distributed",
        COUNT(pe.id) FILTER (WHERE pe.status = 'returned')     AS "returned"
      FROM equipment e
      LEFT JOIN pilgrim_equipment pe ON pe.equipment_id = e.id
      GROUP BY e.id, e.name, e.category, e.total_stock
      ORDER BY e.category, e.name
    `);
    res.json(rows.rows ?? rows);
  } catch (e) {
    console.error("[GET /api/admin/equipment-report]", e);
    res.status(500).json({ error: "Gagal memuat laporan distribusi perlengkapan" });
  }
});

// GET /api/admin/equipment-report/detail?itemId=X
router.get("/detail", async (req, res) => {
  try {
    const { itemId } = req.query;
    const where = itemId ? sql`AND pe.equipment_id = ${itemId}` : sql``;
    const rows = await db.execute(sql`
      SELECT
        pe.id             AS "assignmentId",
        pe.status,
        pe.distributed_at AS "distributedAt",
        pe.returned_at    AS "returnedAt",
        pe.size           AS "size",
        pe.quantity       AS "quantity",
        pe.notes,
        bp.name           AS "pilgrimName",
        b.booking_code    AS "bookingCode",
        e.name            AS "itemName",
        e.category        AS "category"
      FROM pilgrim_equipment pe
      JOIN booking_pilgrims bp ON bp.id = pe.pilgrim_id
      JOIN bookings b ON b.id = pe.booking_id
      JOIN equipment e ON e.id = pe.equipment_id
      WHERE 1=1 ${where}
      ORDER BY e.name, bp.name
    `);
    res.json(rows.rows ?? rows);
  } catch (e) {
    console.error("[GET /api/admin/equipment-report/detail]", e);
    res.status(500).json({ error: "Gagal memuat detail distribusi" });
  }
});

export default router;
