import { Router } from "express";
import {
  db,
  packageReviews,
  profiles,
  eq,
  desc,
} from "@workspace/db";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const data = await db
      .select({
        id: packageReviews.id,
        packageId: packageReviews.packageId,
        userId: packageReviews.userId,
        rating: packageReviews.rating,
        title: packageReviews.title,
        comment: packageReviews.comment,
        isApproved: packageReviews.isApproved,
        createdAt: packageReviews.createdAt,
        userName: profiles.name,
      })
      .from(packageReviews)
      .leftJoin(profiles, eq(packageReviews.userId, profiles.id))
      .orderBy(desc(packageReviews.createdAt));
    
    res.json({ data, total: data.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

router.patch("/:id/approve", async (req, res) => {
  try {
    const { isApproved } = req.body;
    const [updated] = await db
      .update(packageReviews)
      .set({ isApproved })
      .where(eq(packageReviews.id, req.params.id))
      .returning();
    
    if (!updated) return res.status(404).json({ error: "Review not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update review" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(packageReviews).where(eq(packageReviews.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Review not found" });
    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete review" });
  }
});

export default router;
