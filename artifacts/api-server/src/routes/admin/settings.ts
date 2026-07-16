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

// Single-key get — used by feature pages (LoginSettings, etc.)
router.get("/:key", async (req, res) => {
  // Guard against shadowing specific named routes above (e.g. /seo)
  const reserved = ["seo"];
  if (reserved.includes(req.params.key)) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const [item] = await db.select().from(siteSettings).where(eq(siteSettings.key, req.params.key)).limit(1);
    res.json({ data: item ?? null });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch setting" });
  }
});

// Upsert by key — atomic check-then-insert-or-update by key name.
// Called by Settings.tsx and LoginSettings.tsx instead of the old
// non-atomic supabase select+insert/update pattern.
router.put("/:key", async (req, res) => {
  const reserved = ["seo"];
  if (reserved.includes(req.params.key)) {
    return res.status(404).json({ error: "Use the dedicated /seo endpoint" });
  }
  try {
    const { category, value } = req.body;
    const key = req.params.key;
    const [existing] = await db.select({ id: siteSettings.id }).from(siteSettings).where(eq(siteSettings.key, key)).limit(1);

    let item;
    if (existing) {
      [item] = await db
        .update(siteSettings)
        .set({ value, ...(category ? { category } : {}) })
        .where(eq(siteSettings.key, key))
        .returning();
    } else {
      [item] = await db
        .insert(siteSettings)
        .values({ id: crypto.randomUUID(), key, category: category ?? "general", value, createdAt: new Date() })
        .returning();
    }
    res.json({ data: item });
  } catch (err) {
    console.error("[settings PUT/:key]", err);
    res.status(500).json({ error: "Failed to upsert setting" });
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
