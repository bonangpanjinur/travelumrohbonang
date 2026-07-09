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

// Single-key get/set helpers used by feature-specific admin pages (e.g. SEO defaults).
router.get("/seo", async (req, res) => {
  try {
    const [item] = await db.select().from(siteSettings).where(eq(siteSettings.key, "seo")).limit(1);
    res.json({ data: item ?? { key: "seo", category: "general", value: {} } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch SEO settings" });
  }
});

router.put("/seo", async (req, res) => {
  try {
    const { category, value } = req.body;
    const [existing] = await db.select().from(siteSettings).where(eq(siteSettings.key, "seo")).limit(1);

    let item;
    if (existing) {
      [item] = await db
        .update(siteSettings)
        .set({ category: category ?? existing.category, value })
        .where(eq(siteSettings.key, "seo"))
        .returning();
    } else {
      [item] = await db
        .insert(siteSettings)
        .values({
          id: crypto.randomUUID(),
          key: "seo",
          category: category ?? "general",
          value,
          createdAt: new Date(),
        })
        .returning();
    }

    res.json({ data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save SEO settings" });
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
