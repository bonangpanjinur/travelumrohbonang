import { Router } from "express";
import { db, coupons, eq, desc } from "@workspace/db";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

router.post("/", async (req, res) => {
  try {
    const id = uuidv4();
    const [data] = await db.insert(coupons).values({
      ...req.body,
      id,
      createdAt: new Date(),
    }).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create coupon" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const [data] = await db.update(coupons).set(req.body).where(eq(coupons.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Coupon not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update coupon" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(coupons).where(eq(coupons.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete coupon" });
  }
});

export default router;
