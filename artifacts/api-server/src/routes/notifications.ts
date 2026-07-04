import { Router } from "express";
import { db, notifications, eq, and, desc } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const data = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.patch("/:id/read", async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notification" });
  }
});

export default router;
