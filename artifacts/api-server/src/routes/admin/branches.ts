import { Router } from "express";
import { db, branches, eq } from "@workspace/db";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(branches);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch branches" });
  }
});

router.post("/", async (req, res) => {
  try {
    const id = uuidv4();
    const [data] = await db.insert(branches).values({
      ...req.body,
      id,
      createdAt: new Date(),
    }).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create branch" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const [data] = await db.update(branches).set(req.body).where(eq(branches.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Branch not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update branch" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(branches).where(eq(branches.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete branch" });
  }
});

export default router;
