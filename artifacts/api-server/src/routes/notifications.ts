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
  } catch (error: any) {
    console.error("[notifications] DB error:", error?.message, error?.code);
    // Return empty list instead of 500 — table may not exist in this environment yet
    res.json([]);
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
  } catch (error: any) {
    console.error("[notifications] patch DB error:", error?.message, error?.code);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

export default router;
