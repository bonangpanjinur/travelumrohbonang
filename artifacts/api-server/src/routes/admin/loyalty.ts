import { Router } from "express";
import { db, loyaltyBalances, loyaltyPoints, eq, desc } from "@workspace/db";

const router = Router();

router.get("/balances", async (req, res) => {
  try {
    const data = await db.select().from(loyaltyBalances);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch loyalty balances" });
  }
});

router.get("/points", async (req, res) => {
  try {
    const data = await db.select().from(loyaltyPoints).orderBy(desc(loyaltyPoints.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch loyalty points" });
  }
});

router.post("/points", async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const { userId, points } = req.body;
    
    // Use transaction to update balance
    const result = await db.transaction(async (tx) => {
      const [lp] = await tx.insert(loyaltyPoints).values({
        ...req.body,
        id,
        createdAt: new Date(),
      }).returning();
      
      const [balance] = await tx.select().from(loyaltyBalances).where(eq(loyaltyBalances.userId, userId)).limit(1);
      if (balance) {
        await tx.update(loyaltyBalances).set({
          totalPoints: balance.totalPoints + points
        }).where(eq(loyaltyBalances.userId, userId));
      } else {
        await tx.insert(loyaltyBalances).values({
          id: crypto.randomUUID(),
          userId,
          totalPoints: points,
          createdAt: new Date(),
        });
      }
      return lp;
    });
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to add loyalty points" });
  }
});

export default router;
