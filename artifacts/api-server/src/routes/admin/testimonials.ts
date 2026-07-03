import { Router } from "express";
import { db, testimonials, eq } from "@workspace/db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(testimonials);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [item] = await db.insert(testimonials).values({
      id: crypto.randomUUID(),
      ...req.body,
      createdAt: new Date(),
    }).returning();
    res.status(201).json({ data: item });
  } catch (err) {
    res.status(500).json({ error: "Failed to create testimonial" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const [item] = await db.update(testimonials).set(req.body).where(eq(testimonials.id, req.params.id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ data: item });
  } catch (err) {
    res.status(500).json({ error: "Failed to update testimonial" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [item] = await db.delete(testimonials).where(eq(testimonials.id, req.params.id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete testimonial" });
  }
});

export default router;
