import { Router } from "express";
import { db, slugRedirects, eq } from "@workspace/db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(slugRedirects);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch slug redirects" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [item] = await db.insert(slugRedirects).values({
      id: crypto.randomUUID(),
      ...req.body,
      createdAt: new Date(),
    }).returning();
    res.status(201).json({ data: item });
  } catch (err) {
    res.status(500).json({ error: "Failed to create slug redirect" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const [item] = await db.update(slugRedirects).set(req.body).where(eq(slugRedirects.id, req.params.id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ data: item });
  } catch (err) {
    res.status(500).json({ error: "Failed to update slug redirect" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [item] = await db.delete(slugRedirects).where(eq(slugRedirects.id, req.params.id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete slug redirect" });
  }
});

export default router;
