import { Router } from "express";
import { db, loyaltyBalances, loyaltyPoints, eq, desc } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

// Current user's loyalty balance + point history ("Poin Saya")
router.get("/my", async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [balance] = await db
      .select()
      .from(loyaltyBalances)
      .where(eq(loyaltyBalances.userId, userId))
      .limit(1);

    const history = await db
      .select()
      .from(loyaltyPoints)
      .where(eq(loyaltyPoints.userId, userId))
      .orderBy(desc(loyaltyPoints.createdAt))
      .limit(100);

    res.json({
      totalPoints: balance?.totalPoints ?? 0,
      history,
    });
  } catch (error) {
    console.error("[loyalty] DB error:", error);
    res.json({ totalPoints: 0, history: [] });
  }
});

export default router;
