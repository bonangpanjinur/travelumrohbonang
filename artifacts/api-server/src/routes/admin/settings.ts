import { Router } from "express";
import { db, siteSettings, eq } from "@workspace/db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(siteSettings);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch site settings" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [item] = await db.insert(siteSettings).values({
      id: crypto.randomUUID(),
      ...req.body,
      createdAt: new Date(),
    }).returning();
    res.status(201).json({ data: item });
  } catch (err) {
    res.status(500).json({ error: "Failed to create site setting" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const [item] = await db.update(siteSettings).set(req.body).where(eq(siteSettings.id, req.params.id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ data: item });
  } catch (err) {
    res.status(500).json({ error: "Failed to update site setting" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [item] = await db.delete(siteSettings).where(eq(siteSettings.id, req.params.id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete site setting" });
  }
});

export default router;
