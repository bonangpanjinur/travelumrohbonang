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
  db, pilgrimEquipment, equipment, bookingPilgrims, bookings,
  eq, and, sql, inArray,
} from "@workspace/db";

const router = Router();

// GET /api/admin/pilgrim-equipment?bookingId=X
// GET /api/admin/pilgrim-equipment?masterPilgrimId=X  ← JM-DB02: by master pilgrim
router.get("/", async (req, res) => {
  const { bookingId, masterPilgrimId } = req.query as {
    bookingId?: string;
    masterPilgrimId?: string;
  };

  if (!bookingId && !masterPilgrimId) {
    res.status(400).json({ error: "bookingId or masterPilgrimId query param required" });
    return;
  }

  try {
    // JM-DB02: When masterPilgrimId supplied, first resolve all booking_pilgrims rows
    // for this master pilgrim (one master → many bookings → many booking_pilgrims rows),
    // then fetch all equipment assigned to any of those booking_pilgrims.
    if (masterPilgrimId) {
      const bpRows = await db
        .select({ id: bookingPilgrims.id })
        .from(bookingPilgrims)
        .where(eq(bookingPilgrims.pilgrimId, masterPilgrimId));

      if (bpRows.length === 0) {
        res.json({ data: [] });
        return;
      }

      const bpIds = bpRows.map((r) => r.id);
      const rows = await db
        .select({
          id: pilgrimEquipment.id,
          pilgrimId: pilgrimEquipment.pilgrimId,
          equipmentId: pilgrimEquipment.equipmentId,
          bookingId: pilgrimEquipment.bookingId,
          status: pilgrimEquipment.status,
          size: pilgrimEquipment.size,
          quantity: pilgrimEquipment.quantity,
          distributedAt: pilgrimEquipment.distributedAt,
          distributedBy: pilgrimEquipment.distributedBy,
          returnedAt: pilgrimEquipment.returnedAt,
          notes: pilgrimEquipment.notes,
          createdAt: pilgrimEquipment.createdAt,
          equipmentName: equipment.name,
          equipmentCategory: equipment.category,
          equipmentImageUrl: equipment.imageUrl,
          pilgrimName: bookingPilgrims.name,
          bookingCode: bookings.bookingCode,
        })
        .from(pilgrimEquipment)
        .leftJoin(equipment, eq(pilgrimEquipment.equipmentId, equipment.id))
        .leftJoin(bookingPilgrims, eq(pilgrimEquipment.pilgrimId, bookingPilgrims.id))
        .leftJoin(bookings, eq(pilgrimEquipment.bookingId, bookings.id))
        .where(inArray(pilgrimEquipment.pilgrimId, bpIds));

      res.json({ data: rows });
      return;
    }

    // Original path: filter by bookingId
    const rows = await db
      .select({
        id: pilgrimEquipment.id,
        pilgrimId: pilgrimEquipment.pilgrimId,
        equipmentId: pilgrimEquipment.equipmentId,
        bookingId: pilgrimEquipment.bookingId,
        status: pilgrimEquipment.status,
        size: pilgrimEquipment.size,
        quantity: pilgrimEquipment.quantity,
        distributedAt: pilgrimEquipment.distributedAt,
        distributedBy: pilgrimEquipment.distributedBy,
        returnedAt: pilgrimEquipment.returnedAt,
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
      .where(eq(pilgrimEquipment.bookingId, bookingId!));

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

// ── O-8: GET /by-departure/:departureId — semua assignments untuk departure ──
// Dipakai oleh halaman EquipmentDistribution
router.get("/by-departure/:departureId", async (req, res) => {
  try {
    const { departureId } = req.params;

    // Get all pilgrims for this departure
    const pilgrims = await db
      .select({
        id: bookingPilgrims.id,
        name: bookingPilgrims.name,
        gender: bookingPilgrims.gender,
        bookingId: bookingPilgrims.bookingId,
        bookingCode: bookings.bookingCode,
      })
      .from(bookingPilgrims)
      .leftJoin(bookings, eq(bookingPilgrims.bookingId, bookings.id))
      .where(eq(bookings.departureId, departureId));

    // Get equipment assignments for those pilgrims
    const pilgrimIds = pilgrims.map((p) => p.id);
    const assignments = pilgrimIds.length > 0
      ? await db
          .select({
            id: pilgrimEquipment.id,
            pilgrimId: pilgrimEquipment.pilgrimId,
            equipmentId: pilgrimEquipment.equipmentId,
            bookingId: pilgrimEquipment.bookingId,
            status: pilgrimEquipment.status,
            size: pilgrimEquipment.size,
            quantity: pilgrimEquipment.quantity,
            distributedAt: pilgrimEquipment.distributedAt,
            returnedAt: pilgrimEquipment.returnedAt,
            notes: pilgrimEquipment.notes,
            equipmentName: equipment.name,
            equipmentCategory: equipment.category,
          })
          .from(pilgrimEquipment)
          .leftJoin(equipment, eq(pilgrimEquipment.equipmentId, equipment.id))
          .where(inArray(pilgrimEquipment.pilgrimId, pilgrimIds))
      : [];

    // Get all equipment items for the dropdown
    const equipmentList = await db
      .select()
      .from(equipment)
      .where(eq(equipment.isActive, true));

    // Merge: each pilgrim with their assignments
    const pilgrimsWithAssignments = pilgrims.map((p) => ({
      ...p,
      assignments: assignments.filter((a) => a.pilgrimId === p.id),
    }));

    const distributedCount = assignments.filter((a) => a.status === "distributed").length;
    const returnedCount = assignments.filter((a) => a.status === "returned").length;

    res.json({
      pilgrims: pilgrimsWithAssignments,
      equipment: equipmentList,
      stats: {
        totalPilgrims: pilgrims.length,
        totalAssignments: assignments.length,
        distributed: distributedCount,
        returned: returnedCount,
        pending: assignments.length - distributedCount - returnedCount,
      },
    });
  } catch (e) {
    console.error("[pilgrim-equipment GET /by-departure]", e);
    res.status(500).json({ error: "Failed to fetch departure equipment" });
  }
});

// ── O-8: POST /bulk-assign — bulk assign equipment ke banyak jemaah ───────────
router.post("/bulk-assign", async (req, res) => {
  try {
    const { assignments } = req.body as {
      assignments: Array<{
        pilgrimId: string;
        equipmentId: string;
        bookingId: string;
        quantity?: number;
        size?: string;
        notes?: string;
      }>;
    };

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: "assignments array required" });
    }

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const a of assignments) {
      if (!a.pilgrimId || !a.equipmentId || !a.bookingId) {
        errors.push(`Missing required fields for assignment`);
        continue;
      }
      try {
        await db.insert(pilgrimEquipment).values({
          id: crypto.randomUUID(),
          pilgrimId: a.pilgrimId,
          equipmentId: a.equipmentId,
          bookingId: a.bookingId,
          status: "pending",
          quantity: a.quantity ?? 1,
          size: a.size ?? null,
          notes: a.notes ?? null,
          createdAt: new Date(),
        });
        inserted++;
      } catch (e: any) {
        if (e?.code === "23505") { skipped++; continue; }
        errors.push(e.message);
      }
    }

    res.json({ ok: true, inserted, skipped, errors: errors.slice(0, 10) });
  } catch (e) {
    console.error("[pilgrim-equipment POST /bulk-assign]", e);
    res.status(500).json({ error: "Failed to bulk assign" });
  }
});

// ── O-8: POST /update-stock — update stok equipment setelah distribusi ────────
// Auto-decrement saat status → distributed, increment saat → returned
router.post("/update-stock", async (req, res) => {
  try {
    const { equipmentId, delta } = req.body as { equipmentId: string; delta: number };
    if (!equipmentId || delta === undefined) {
      return res.status(400).json({ error: "equipmentId and delta required" });
    }

    const [updated] = await db
      .update(equipment)
      .set({ totalStock: sql`GREATEST(0, ${equipment.totalStock} + ${delta})` })
      .where(eq(equipment.id, equipmentId))
      .returning({ id: equipment.id, totalStock: equipment.totalStock });

    if (!updated) return res.status(404).json({ error: "Equipment not found" });
    res.json(updated);
  } catch (e) {
    console.error("[pilgrim-equipment POST /update-stock]", e);
    res.status(500).json({ error: "Failed to update stock" });
  }
});

export default router;
