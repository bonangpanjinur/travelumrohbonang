import { Router } from "express";
import { db, pilgrimDocuments, pilgrimDocAccessLogs, bookings, bookingPilgrims, eq, and } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  }
}

const router = Router();

router.use(requireAuth);

// Get pilgrim documents for a user's pilgrims
router.get("/", async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // Get all pilgrim IDs for this user's bookings
    const userBookings = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.userId, userId));
    
    if (userBookings.length === 0) {
      return res.json([]);
    }

    const bookingIds = userBookings.map(b => b.id);
    
    const pilgrims = await db
      .select({ id: bookingPilgrims.id })
      .from(bookingPilgrims)
      .where(and(...bookingIds.map(id => eq(bookingPilgrims.bookingId, id))));
      
    if (pilgrims.length === 0) {
        return res.json([]);
    }
    
    const pilgrimIds = pilgrims.map(p => p.id);

    const docs = await db
      .select()
      .from(pilgrimDocuments)
      .where(and(...pilgrimIds.map(id => eq(pilgrimDocuments.pilgrimId, id))));

    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch pilgrim documents" });
  }
});

// Create or update a document
router.post("/", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { pilgrimId, bookingId, documentType, fileUrl, fileName, notes } = req.body;

    // Verify ownership
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
      .from(pilgrimDocuments)
      .where(and(eq(pilgrimDocuments.pilgrimId, pilgrimId), eq(pilgrimDocuments.documentType, documentType)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(pilgrimDocuments)
        .set({
          fileUrl,
          status: "submitted",
          submittedAt: new Date(),
          notes: notes || null,
        })
        .where(eq(pilgrimDocuments.id, existing.id))
        .returning();
      return res.json(updated);
    } else {
      const id = Math.random().toString(36).substring(2, 15);
      const [inserted] = await db
        .insert(pilgrimDocuments)
        .values({
          id,
          pilgrimId,
          bookingId,
          documentType,
          fileUrl,
          status: "submitted",
          submittedAt: new Date(),
          notes: notes || null,
          createdAt: new Date(),
        })
        .returning();
      return res.json(inserted);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save pilgrim document" });
  }
});

// Access log
router.post("/access-log", async (req: any, res) => {
  try {
    const { pilgrimId, docType, storagePath, context } = req.body;
    const id = Math.random().toString(36).substring(2, 15);
    await db.insert(pilgrimDocAccessLogs).values({
      id,
      userId: req.user.id,
      pilgrimId,
      docType,
      storagePath,
      context,
      createdAt: new Date(),
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to log access" });
  }
});

export default router;
