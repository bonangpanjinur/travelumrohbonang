import { Router } from "express";
import { db, wishlists, packages, eq, and } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const data = await db
      .select({
        packageId: wishlists.packageId,
      })
      .from(wishlists)
      .where(eq(wishlists.userId, userId));
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch wishlist" });
  }
});

router.post("/toggle", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { packageId } = req.body;

    const [existing] = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.packageId, packageId)))
      .limit(1);

    if (existing) {
      await db.delete(wishlists).where(eq(wishlists.id, existing.id));
      res.json({ added: false });
    } else {
      const id = Math.random().toString(36).substring(2, 15);
      await db.insert(wishlists).values({
        id,
        userId,
        packageId,
        createdAt: new Date(),
      });
      res.json({ added: true });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle wishlist" });
  }
});

export default router;
