import { Router } from "express";
import {
  db,
  itineraries,
  itineraryDays,
  packageDepartures,
  packages,
  eq,
  desc,
  asc,
} from "@workspace/db";

const router = Router();

// ── GET /api/admin/itineraries ───────────────────────────────────────────────
// List all itineraries with nested departure + days
router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: itineraries.id,
        departureId: itineraries.departureId,
        title: itineraries.title,
        notes: itineraries.notes,
        isActive: itineraries.isActive,
        createdAt: itineraries.createdAt,
        departureDate: packageDepartures.departureDate,
        packageTitle: packages.title,
      })
      .from(itineraries)
      .leftJoin(packageDepartures, eq(itineraries.departureId, packageDepartures.id))
      .leftJoin(packages, eq(packageDepartures.packageId, packages.id))
      .orderBy(desc(itineraries.createdAt));

    // Fetch days for all itineraries in one query
    const itineraryIds = rows.map((r) => r.id);
    let daysMap: Record<string, any[]> = {};
    if (itineraryIds.length > 0) {
      const allDays = await db
        .select()
        .from(itineraryDays)
        .where(
          itineraryIds.length === 1
            ? eq(itineraryDays.itineraryId, itineraryIds[0])
            : (itineraryDays.itineraryId as any).inArray(itineraryIds)
        )
        .orderBy(asc(itineraryDays.dayNumber));
      for (const day of allDays) {
        if (!daysMap[day.itineraryId]) daysMap[day.itineraryId] = [];
        daysMap[day.itineraryId].push(day);
      }
    }

    const result = rows.map((r) => ({
      id: r.id,
      departure_id: r.departureId,
      title: r.title,
      notes: r.notes,
      is_active: r.isActive,
      created_at: r.createdAt,
      departure: {
        id: r.departureId,
        departure_date: r.departureDate,
        package: r.packageTitle ? { title: r.packageTitle } : null,
      },
      days: (daysMap[r.id] ?? []).map((d) => ({
        id: d.id,
        itinerary_id: d.itineraryId,
        day_number: d.dayNumber,
        title: d.title,
        description: d.description,
        image_url: d.imageUrl,
        created_at: d.createdAt,
      })),
    }));

    res.json(result);
  } catch (err: any) {
    console.error("[admin/itineraries] GET /", err.message);
    res.status(500).json({ error: "Gagal memuat itinerary", detail: err.message });
  }
});

// ── POST /api/admin/itineraries ──────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { departure_id, title, notes } = req.body ?? {};
    if (!departure_id) {
      return res.status(400).json({ error: "departure_id wajib diisi" });
    }
    const [row] = await db
      .insert(itineraries)
      .values({
        id: crypto.randomUUID(),
        departureId: departure_id,
        title: title || null,
        notes: notes || null,
        isActive: true,
        createdAt: new Date(),
      })
      .returning();
    res.status(201).json(row);
  } catch (err: any) {
    console.error("[admin/itineraries] POST /", err.message);
    res.status(500).json({ error: "Gagal membuat itinerary", detail: err.message });
  }
});

// ── PATCH /api/admin/itineraries/:id ────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { departure_id, title, notes, is_active } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (departure_id !== undefined) updates.departureId = departure_id;
    if (title !== undefined) updates.title = title || null;
    if (notes !== undefined) updates.notes = notes || null;
    if (is_active !== undefined) updates.isActive = Boolean(is_active);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Tidak ada field yang diupdate" });
    }

    const [updated] = await db
      .update(itineraries)
      .set(updates)
      .where(eq(itineraries.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Itinerary tidak ditemukan" });
    // IT-02: kembalikan snake_case konsisten dengan GET /
    res.json({
      id: updated.id,
      departure_id: updated.departureId,
      title: updated.title,
      notes: updated.notes,
      is_active: updated.isActive,
      created_at: updated.createdAt,
    });
  } catch (err: any) {
    console.error("[admin/itineraries] PATCH /:id", err.message);
    res.status(500).json({ error: "Gagal mengupdate itinerary", detail: err.message });
  }
});

// ── PATCH /api/admin/itineraries/:id/reorder-days ───────────────────────────
// Body: { days: [{ id: string, day_number: number }] }
router.patch("/:id/reorder-days", async (req, res) => {
  try {
    const { days } = req.body ?? {};
    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ error: "days harus berupa array" });
    }
    // Update day_number for each day in a transaction
    await db.transaction(async (tx) => {
      for (const { id, day_number } of days) {
        if (!id || day_number == null) continue;
        await tx
          .update(itineraryDays)
          .set({ dayNumber: Number(day_number) })
          .where(eq(itineraryDays.id, id));
      }
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[admin/itineraries] PATCH /:id/reorder-days", err.message);
    res.status(500).json({ error: "Gagal menyimpan urutan hari", detail: err.message });
  }
});

// ── DELETE /api/admin/itineraries/:id ───────────────────────────────────────
// Days cascade-deleted by DB (onDelete: "cascade")
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db
      .delete(itineraries)
      .where(eq(itineraries.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Itinerary tidak ditemukan" });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[admin/itineraries] DELETE /:id", err.message);
    res.status(500).json({ error: "Gagal menghapus itinerary", detail: err.message });
  }
});

// ── POST /api/admin/itineraries/days ────────────────────────────────────────
router.post("/days", async (req, res) => {
  try {
    const { itinerary_id, day_number, title, description, image_url } = req.body ?? {};
    if (!itinerary_id) return res.status(400).json({ error: "itinerary_id wajib diisi" });
    if (!day_number) return res.status(400).json({ error: "day_number wajib diisi" });

    const [row] = await db
      .insert(itineraryDays)
      .values({
        id: crypto.randomUUID(),
        itineraryId: itinerary_id,
        dayNumber: Number(day_number),
        title: title || null,
        description: description || null,
        imageUrl: image_url || null,
        createdAt: new Date(),
      })
      .returning();
    // IT-02: kembalikan snake_case konsisten dengan GET /
    res.status(201).json({
      id: row.id,
      itinerary_id: row.itineraryId,
      day_number: row.dayNumber,
      title: row.title,
      description: row.description,
      image_url: row.imageUrl,
      created_at: row.createdAt,
    });
  } catch (err: any) {
    console.error("[admin/itineraries] POST /days", err.message);
    res.status(500).json({ error: "Gagal menambah hari", detail: err.message });
  }
});

// ── PATCH /api/admin/itineraries/days/:id ───────────────────────────────────
router.patch("/days/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { day_number, title, description, image_url } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (day_number !== undefined) updates.dayNumber = Number(day_number);
    if (title !== undefined) updates.title = title || null;
    if (description !== undefined) updates.description = description || null;
    if (image_url !== undefined) updates.imageUrl = image_url || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Tidak ada field yang diupdate" });
    }

    const [updated] = await db
      .update(itineraryDays)
      .set(updates)
      .where(eq(itineraryDays.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Hari tidak ditemukan" });
    // IT-02: kembalikan snake_case konsisten
    res.json({
      id: updated.id,
      itinerary_id: updated.itineraryId,
      day_number: updated.dayNumber,
      title: updated.title,
      description: updated.description,
      image_url: updated.imageUrl,
      created_at: updated.createdAt,
    });
  } catch (err: any) {
    console.error("[admin/itineraries] PATCH /days/:id", err.message);
    res.status(500).json({ error: "Gagal mengupdate hari", detail: err.message });
  }
});

// ── DELETE /api/admin/itineraries/days/:id ──────────────────────────────────
router.delete("/days/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db
      .delete(itineraryDays)
      .where(eq(itineraryDays.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Hari tidak ditemukan" });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[admin/itineraries] DELETE /days/:id", err.message);
    res.status(500).json({ error: "Gagal menghapus hari", detail: err.message });
  }
});

// IT-F01: Salin itinerary (beserta semua harinya) ke keberangkatan lain
router.post("/:id/copy-to-departure", async (req, res) => {
  try {
    const { id } = req.params;
    const { departure_id } = req.body ?? {};
    if (!departure_id) return res.status(400).json({ error: "departure_id wajib diisi" });

    // Load sumber itinerary + days
    const [source] = await db.select().from(itineraries).where(eq(itineraries.id, id)).limit(1);
    if (!source) return res.status(404).json({ error: "Itinerary tidak ditemukan" });

    const sourceDays = await db
      .select()
      .from(itineraryDays)
      .where(eq(itineraryDays.itineraryId, id))
      .orderBy(asc(itineraryDays.dayNumber));

    // Buat itinerary baru + copy semua hari dalam satu transaksi
    const newItinerary = await db.transaction(async (tx) => {
      const newId = crypto.randomUUID();
      const [created] = await tx
        .insert(itineraries)
        .values({
          id: newId,
          departureId: departure_id,
          title: source.title ?? null,
          notes: source.notes ?? null,
          isActive: true,
          createdAt: new Date(),
        })
        .returning();

      if (sourceDays.length > 0) {
        await tx.insert(itineraryDays).values(
          sourceDays.map((d) => ({
            id: crypto.randomUUID(),
            itineraryId: newId,
            dayNumber: d.dayNumber,
            title: d.title,
            description: d.description,
            imageUrl: d.imageUrl,
            createdAt: new Date(),
          })),
        );
      }
      return created;
    });

    res.status(201).json({
      id: newItinerary.id,
      departure_id: newItinerary.departureId,
      title: newItinerary.title,
      days_copied: sourceDays.length,
    });
  } catch (err: any) {
    console.error("[admin/itineraries] POST /:id/copy-to-departure", err.message);
    res.status(500).json({ error: "Gagal menyalin itinerary", detail: err.message });
  }
});

export default router;
