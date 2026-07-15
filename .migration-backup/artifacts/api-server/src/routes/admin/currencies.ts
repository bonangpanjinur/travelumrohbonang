import { Router } from "express";
import { db, currencies, eq } from "@workspace/db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(currencies);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch currencies" });
  }
});

router.post("/", async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const [data] = await db.insert(currencies).values({
      ...req.body,
      id,
      createdAt: new Date(),
    }).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create currency" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const [data] = await db.update(currencies).set(req.body).where(eq(currencies.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Currency not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update currency" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(currencies).where(eq(currencies.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete currency" });
  }
});

export default router;
