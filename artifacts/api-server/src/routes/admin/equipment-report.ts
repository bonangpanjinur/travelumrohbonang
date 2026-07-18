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
        ei.id          AS "itemId",
        ei.name        AS "itemName",
        ei.category    AS "category",
        COUNT(pe.id)                                            AS "totalAssigned",
        COUNT(pe.id) FILTER (WHERE pe.status = 'pending')      AS "pending",
        COUNT(pe.id) FILTER (WHERE pe.status = 'distributed')  AS "distributed",
        COUNT(pe.id) FILTER (WHERE pe.status = 'returned')     AS "returned"
      FROM equipment_items ei
      LEFT JOIN pilgrim_equipment pe ON pe.equipment_item_id = ei.id
      GROUP BY ei.id, ei.name, ei.category
      ORDER BY ei.category, ei.name
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
    const where = itemId ? sql`AND pe.equipment_item_id = ${itemId}` : sql``;
    const rows = await db.execute(sql`
      SELECT
        pe.id          AS "assignmentId",
        pe.status,
        pe.distributed_at AS "distributedAt",
        pe.returned_at    AS "returnedAt",
        pe.notes,
        bp.name        AS "pilgrimName",
        b.booking_code AS "bookingCode",
        ei.name        AS "itemName",
        ei.category    AS "category",
        pe.size,
        pe.quantity
      FROM pilgrim_equipment pe
      JOIN booking_pilgrims bp ON bp.id = pe.pilgrim_id
      JOIN bookings b ON b.id = pe.booking_id
      JOIN equipment_items ei ON ei.id = pe.equipment_item_id
      WHERE 1=1 ${where}
      ORDER BY ei.name, bp.name
    `);
    res.json(rows.rows ?? rows);
  } catch (e) {
    console.error("[GET /api/admin/equipment-report/detail]", e);
    res.status(500).json({ error: "Gagal memuat detail distribusi" });
  }
});

export default router;
