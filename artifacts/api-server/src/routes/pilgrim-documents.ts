import { Router } from "express";
import crypto from "crypto";
import { db, pilgrimDocuments, pilgrimDocAccessLogs, bookings, bookingPilgrims, packageDepartures, eq, and, inArray } from "@workspace/db";
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
      .where(inArray(bookingPilgrims.bookingId, bookingIds));
      
    if (pilgrims.length === 0) {
        return res.json([]);
    }
    
    const pilgrimIds = pilgrims.map(p => p.id);

    const docs = await db
      .select()
      .from(pilgrimDocuments)
      .where(inArray(pilgrimDocuments.pilgrimId, pilgrimIds));

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
    const { pilgrimId, bookingId, documentType, fileUrl, fileName, notes, passportExpiryDate } = req.body;

    // Verify ownership
    const [booking] = await db
      .select({ id: bookings.id, departureId: bookings.departureId })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)))
      .limit(1);

    if (!booking) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Verify pilgrimId belongs to this specific booking (prevents IDOR overwrite)
    const [pilgrim] = await db
      .select({ id: bookingPilgrims.id })
      .from(bookingPilgrims)
      .where(and(eq(bookingPilgrims.id, pilgrimId), eq(bookingPilgrims.bookingId, bookingId)))
      .limit(1);

    if (!pilgrim) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // §7.1.2: Passport expiry validation — must be valid ≥6 months from departure
    if (documentType === "paspor" && passportExpiryDate) {
      const expiry = new Date(passportExpiryDate);
      if (isNaN(expiry.getTime())) {
        return res.status(422).json({ error: "Format tanggal kadaluarsa paspor tidak valid" });
      }
      let referenceDate = new Date();
      if (booking.departureId) {
        const [dep] = await db
          .select({ departureDate: packageDepartures.departureDate })
          .from(packageDepartures)
          .where(eq(packageDepartures.id, booking.departureId))
          .limit(1);
        if (dep?.departureDate) referenceDate = new Date(dep.departureDate);
      }
      const minExpiry = new Date(referenceDate);
      minExpiry.setMonth(minExpiry.getMonth() + 6);
      if (expiry < minExpiry) {
        const fmt = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" });
        return res.status(422).json({
          error: `Paspor harus berlaku ≥6 bulan dari tanggal keberangkatan (${fmt.format(referenceDate)}). Minimum kadaluarsa: ${fmt.format(minExpiry)}.`,
        });
      }
      // Persist expiry to pilgrim record
      await db
        .update(bookingPilgrims)
        .set({ passportExpiry: passportExpiryDate })
        .where(eq(bookingPilgrims.id, pilgrimId));
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
      const id = crypto.randomUUID();
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
    const id = crypto.randomUUID();
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
