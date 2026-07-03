import { Router } from "express";
import { db, seoOverrides, eq } from "@workspace/db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(seoOverrides);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch SEO overrides" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [item] = await db.insert(seoOverrides).values({
      id: crypto.randomUUID(),
      ...req.body,
      createdAt: new Date(),
    }).returning();
    res.status(201).json({ data: item });
  } catch (err) {
    res.status(500).json({ error: "Failed to create SEO override" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const [item] = await db.update(seoOverrides).set(req.body).where(eq(seoOverrides.id, req.params.id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ data: item });
  } catch (err) {
    res.status(500).json({ error: "Failed to update SEO override" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [item] = await db.delete(seoOverrides).where(eq(seoOverrides.id, req.params.id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete SEO override" });
  }
});

export default router;
