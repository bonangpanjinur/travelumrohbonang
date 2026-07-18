/**
 * PL-F01 — Admin: assign equipment to booking pilgrims
 * Routes:
 *   GET    /api/admin/pilgrim-equipment?bookingId=X  — list assignments for a booking
 *   POST   /api/admin/pilgrim-equipment              — create assignment
 *   PATCH  /api/admin/pilgrim-equipment/:id          — update status
 *   DELETE /api/admin/pilgrim-equipment/:id          — remove assignment
 */
import { Router } from "express";
import {
  db, pilgrimEquipment, equipment, bookingPilgrims,
  eq, and, sql,
} from "@workspace/db";

const router = Router();

// GET /api/admin/pilgrim-equipment?bookingId=X
router.get("/", async (req, res) => {
  const { bookingId } = req.query as { bookingId?: string };
  if (!bookingId) {
    res.status(400).json({ error: "bookingId query param required" });
    return;
  }
  try {
    const rows = await db
      .select({
        id: pilgrimEquipment.id,
        pilgrimId: pilgrimEquipment.pilgrimId,
        equipmentId: pilgrimEquipment.equipmentId,
        bookingId: pilgrimEquipment.bookingId,
        status: pilgrimEquipment.status,
        distributedAt: pilgrimEquipment.distributedAt,
        distributedBy: pilgrimEquipment.distributedBy,
        notes: pilgrimEquipment.notes,
        createdAt: pilgrimEquipment.createdAt,
        equipmentName: equipment.name,
        equipmentCategory: equipment.category,
        equipmentImageUrl: equipment.imageUrl,
        pilgrimName: bookingPilgrims.name,
      })
      .from(pilgrimEquipment)
      .leftJoin(equipment, eq(pilgrimEquipment.equipmentId, equipment.id))
      .leftJoin(bookingPilgrims, eq(pilgrimEquipment.pilgrimId, bookingPilgrims.id))
      .where(eq(pilgrimEquipment.bookingId, bookingId));

    res.json({ data: rows });
  } catch (e) {
    console.error("[pilgrim-equipment GET /]", e);
    res.status(500).json({ error: "Failed to fetch pilgrim equipment" });
  }
});

// POST /api/admin/pilgrim-equipment
router.post("/", async (req, res) => {
  const { pilgrimId, equipmentId, bookingId, notes } = req.body ?? {};
  if (!pilgrimId || !equipmentId || !bookingId) {
    res.status(400).json({ error: "pilgrimId, equipmentId, bookingId required" });
    return;
  }
  try {
    const [row] = await db
      .insert(pilgrimEquipment)
      .values({
        id: crypto.randomUUID(),
        pilgrimId,
        equipmentId,
        bookingId,
        status: "pending",
        notes: notes ?? null,
        createdAt: new Date(),
      })
      .returning();
    res.status(201).json(row);
  } catch (e: any) {
    if (e?.code === "23505") {
      res.status(409).json({ error: "Perlengkapan sudah ditetapkan ke jemaah ini" });
      return;
    }
    console.error("[pilgrim-equipment POST /]", e);
    res.status(500).json({ error: "Failed to assign equipment" });
  }
});

// PATCH /api/admin/pilgrim-equipment/:id
router.patch("/:id", async (req, res) => {
  const { status, notes, distributedBy } = req.body ?? {};
  try {
    const patch: Record<string, any> = {};
    if (status !== undefined) patch.status = status;
    if (notes !== undefined) patch.notes = notes;
    if (status === "distributed") {
      patch.distributedAt = new Date();
      if (distributedBy !== undefined) patch.distributedBy = distributedBy;
    }

    const [updated] = await db
      .update(pilgrimEquipment)
      .set(patch)
      .where(eq(pilgrimEquipment.id, req.params.id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (e) {
    console.error("[pilgrim-equipment PATCH /:id]", e);
    res.status(500).json({ error: "Failed to update" });
  }
});

// DELETE /api/admin/pilgrim-equipment/:id
router.delete("/:id", async (req, res) => {
  try {
    await db.delete(pilgrimEquipment).where(eq(pilgrimEquipment.id, req.params.id));
    res.status(204).end();
  } catch (e) {
    console.error("[pilgrim-equipment DELETE /:id]", e);
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
