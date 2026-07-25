import { Router } from "express";
import {
  db,
  departureGallery,
  packageGallery,
  eq,
  asc,
} from "@workspace/db";

const router = Router();

router.get("/departure/:departureId", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(departureGallery)
      .where(eq(departureGallery.departureId, req.params.departureId))
      .orderBy(asc(departureGallery.sortOrder));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [created] = await db
      .insert(departureGallery)
      .values({
        id: crypto.randomUUID(),
        ...req.body,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to upload to gallery" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(departureGallery).where(eq(departureGallery.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Gallery item not found" });
    return res.json({ message: "Item deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete item" });
  }
});

// ── Package-level gallery ────────────────────────────────────────────────────

router.get("/package/:packageId", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(packageGallery)
      .where(eq(packageGallery.packageId, req.params.packageId))
      .orderBy(asc(packageGallery.sortOrder));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch package gallery" });
  }
});

router.post("/package", async (req, res) => {
  try {
    const { package_id, image_url, caption, sort_order } = req.body;
    if (!package_id) return res.status(400).json({ error: "package_id diperlukan" });
    if (!image_url) return res.status(400).json({ error: "image_url diperlukan" });
    const [created] = await db
      .insert(packageGallery)
      .values({
        id: crypto.randomUUID(),
        packageId: package_id,
        imageUrl: image_url,
        caption: caption ?? null,
        sortOrder: sort_order ?? 0,
        createdAt: new Date(),
      })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    console.error("[gallery] POST /package error:", err?.message, err?.code, err?.detail);
    // Table may not exist yet — give a clearer message
    if (err?.code === "42P01") {
      return res.status(500).json({ error: "Tabel package_gallery belum ada. Jalankan: cd lib/db && pnpm drizzle-kit push" });
    }
    res.status(500).json({ error: err?.message ?? "Gagal menyimpan foto galeri" });
  }
});

router.delete("/package/:id", async (req, res) => {
  try {
    const [deleted] = await db
      .delete(packageGallery)
      .where(eq(packageGallery.id, req.params.id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Item not found" });
    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete package gallery item" });
  }
});

export default router;
