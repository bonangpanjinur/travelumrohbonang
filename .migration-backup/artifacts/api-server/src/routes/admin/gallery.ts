import { Router } from "express";
import {
  db,
  departureGallery,
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

export default router;
