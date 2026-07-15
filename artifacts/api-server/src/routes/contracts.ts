import { Router } from "express";
import { db, contracts, bookings, eq, and } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

router.get("/:bookingId", async (req: any, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const [contract] = await db
      .select()
      .from(contracts)
      .where(and(eq(contracts.bookingId, bookingId), eq(contracts.userId, userId)))
      .limit(1);

    res.json(contract || null);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contract" });
  }
});

router.post("/", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { bookingId, htmlContent, signatureDataUrl, signerName } = req.body;

    // Verify booking ownership
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)))
      .limit(1);

    if (!booking) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [existing] = await db
      .select()
      .from(contracts)
      .where(and(eq(contracts.bookingId, bookingId), eq(contracts.userId, userId)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(contracts)
        .set({
          htmlContent,
          signatureDataUrl,
          signedAt: new Date(),
          signerName,
        })
        .where(eq(contracts.id, existing.id))
        .returning();
      res.json(updated);
    } else {
      const id = Math.random().toString(36).substring(2, 15);
      const [inserted] = await db
        .insert(contracts)
        .values({
          id,
          bookingId,
          userId,
          htmlContent,
          signatureDataUrl,
          signedAt: new Date(),
          signerName,
          createdAt: new Date(),
        })
        .returning();
      res.json(inserted);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to save contract" });
  }
});

export default router;
