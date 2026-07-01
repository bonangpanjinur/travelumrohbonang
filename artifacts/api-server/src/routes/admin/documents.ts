import { Router } from "express";
import { db, bookingPilgrims, pilgrimDocuments, bookings, eq, and } from "@workspace/db";
import {
  AdminUpsertDocumentRequest,
  PilgrimDocumentSchema,
  PilgrimChecklistSchema,
  BookingDocumentChecklistSchema,
  REQUIRED_DOCUMENT_TYPES,
  type AdminUpsertDocumentInput,
} from "@workspace/api-zod";
import { validate } from "../../middlewares/validate";

const router = Router({ mergeParams: true });

function computePilgrimCompletion(docs: { documentType: string; status: string }[]): number {
  const verifiedRequired = REQUIRED_DOCUMENT_TYPES.filter((type) =>
    docs.some((d) => d.documentType === type && d.status === "verified"),
  ).length;
  return Math.round((verifiedRequired / REQUIRED_DOCUMENT_TYPES.length) * 100);
}

router.get("/", async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;

    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const pilgrims = await db
      .select({ id: bookingPilgrims.id, name: bookingPilgrims.name })
      .from(bookingPilgrims)
      .where(eq(bookingPilgrims.bookingId, bookingId));

    const allDocs = await db
      .select()
      .from(pilgrimDocuments)
      .where(eq(pilgrimDocuments.bookingId, bookingId));

    const pilgrimChecklists = pilgrims.map((pilgrim) => {
      const docs = allDocs.filter((d) => d.pilgrimId === pilgrim.id);
      const completionPct = computePilgrimCompletion(docs);
      return PilgrimChecklistSchema.parse({
        pilgrimId: pilgrim.id,
        pilgrimName: pilgrim.name,
        completionPct,
        documents: docs.map((d) => PilgrimDocumentSchema.parse(d)),
      });
    });

    const totalRequired = pilgrims.length * REQUIRED_DOCUMENT_TYPES.length;
    const totalVerified = allDocs.filter(
      (d) =>
        d.status === "verified" &&
        (REQUIRED_DOCUMENT_TYPES as readonly string[]).includes(d.documentType),
    ).length;
    const overallCompletionPct =
      totalRequired > 0 ? Math.round((totalVerified / totalRequired) * 100) : 0;

    const fullyCompletedPilgrims = pilgrimChecklists.filter((p) => p.completionPct === 100).length;

    res.json(
      BookingDocumentChecklistSchema.parse({
        bookingId,
        overallCompletionPct,
        totalPilgrims: pilgrims.length,
        fullyCompletedPilgrims,
        pilgrims: pilgrimChecklists,
      }),
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch document checklist" });
  }
});

router.get("/pilgrims/:pilgrimId", async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;
    const pilgrimId = req.params.pilgrimId as string;

    const [pilgrim] = await db
      .select({ id: bookingPilgrims.id, name: bookingPilgrims.name })
      .from(bookingPilgrims)
      .where(and(eq(bookingPilgrims.id, pilgrimId), eq(bookingPilgrims.bookingId, bookingId)))
      .limit(1);

    if (!pilgrim) {
      res.status(404).json({ error: "Pilgrim not found" });
      return;
    }

    const docs = await db
      .select()
      .from(pilgrimDocuments)
      .where(
        and(eq(pilgrimDocuments.pilgrimId, pilgrimId), eq(pilgrimDocuments.bookingId, bookingId)),
      );

    const completionPct = computePilgrimCompletion(docs);

    res.json(
      PilgrimChecklistSchema.parse({
        pilgrimId: pilgrim.id,
        pilgrimName: pilgrim.name,
        completionPct,
        documents: docs.map((d) => PilgrimDocumentSchema.parse(d)),
      }),
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch pilgrim documents" });
  }
});

router.put(
  "/pilgrims/:pilgrimId/:documentType",
  validate(AdminUpsertDocumentRequest),
  async (req, res) => {
    try {
      const bookingId = (req.params as Record<string, string>).bookingId;
      const pilgrimId = req.params.pilgrimId as string;
      const documentType = req.params.documentType as string;
      const body = req.body as AdminUpsertDocumentInput;
      const adminId = req.user?.id;

      const [pilgrim] = await db
        .select({ id: bookingPilgrims.id })
        .from(bookingPilgrims)
        .where(and(eq(bookingPilgrims.id, pilgrimId), eq(bookingPilgrims.bookingId, bookingId)))
        .limit(1);

      if (!pilgrim) {
        res.status(404).json({ error: "Pilgrim not found" });
        return;
      }

      const [existing] = await db
        .select({ id: pilgrimDocuments.id })
        .from(pilgrimDocuments)
        .where(
          and(
            eq(pilgrimDocuments.pilgrimId, pilgrimId),
            eq(pilgrimDocuments.documentType, documentType),
          ),
        )
        .limit(1);

      const now = new Date();
      const isVerified = body.status === "verified";
      const isSubmitted = body.status === "submitted" || isVerified;

      const values = {
        pilgrimId,
        bookingId,
        documentType,
        status: body.status,
        fileUrl: body.fileUrl ?? null,
        notes: body.notes ?? null,
        submittedAt: isSubmitted ? (body.submittedAt ? new Date(body.submittedAt) : now) : null,
        verifiedAt: isVerified ? now : null,
        verifiedBy: isVerified ? (adminId ?? null) : null,
        createdAt: now,
      };

      let upserted;
      if (existing) {
        const [updated] = await db
          .update(pilgrimDocuments)
          .set(values)
          .where(eq(pilgrimDocuments.id, existing.id))
          .returning();
        upserted = updated;
      } else {
        const [created] = await db
          .insert(pilgrimDocuments)
          .values({ id: crypto.randomUUID(), ...values })
          .returning();
        upserted = created;
      }

      const allDocs = await db
        .select({ documentType: pilgrimDocuments.documentType, status: pilgrimDocuments.status })
        .from(pilgrimDocuments)
        .where(
          and(eq(pilgrimDocuments.pilgrimId, pilgrimId), eq(pilgrimDocuments.bookingId, bookingId)),
        );

      const completionPct = computePilgrimCompletion(allDocs);

      res.json({
        document: PilgrimDocumentSchema.parse(upserted),
        pilgrimCompletionPct: completionPct,
      });
    } catch {
      res.status(500).json({ error: "Failed to upsert document" });
    }
  },
);

router.delete("/pilgrims/:pilgrimId/:documentType", async (req, res) => {
  try {
    const bookingId = (req.params as Record<string, string>).bookingId;
    const pilgrimId = req.params.pilgrimId as string;
    const documentType = req.params.documentType as string;

    const [deleted] = await db
      .delete(pilgrimDocuments)
      .where(
        and(
          eq(pilgrimDocuments.pilgrimId, pilgrimId),
          eq(pilgrimDocuments.bookingId, bookingId),
          eq(pilgrimDocuments.documentType, documentType),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Document record not found" });
      return;
    }

    const remaining = await db
      .select({ documentType: pilgrimDocuments.documentType, status: pilgrimDocuments.status })
      .from(pilgrimDocuments)
      .where(
        and(eq(pilgrimDocuments.pilgrimId, pilgrimId), eq(pilgrimDocuments.bookingId, bookingId)),
      );

    const completionPct = computePilgrimCompletion(remaining);

    res.json({ message: "Document record reset successfully", pilgrimCompletionPct: completionPct });
  } catch {
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
