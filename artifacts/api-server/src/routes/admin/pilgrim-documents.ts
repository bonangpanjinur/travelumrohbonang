/**
 * Admin Pilgrim Documents — P3-04
 * Admin dapat melihat, menyimpan, dan menghapus catatan dokumen jemaah
 * tanpa batasan kepemilikan (admin bypass).
 */
import { Router } from "express";
import { db, pilgrimDocuments, eq, and } from "@workspace/db";

const router = Router();

/** GET /api/admin/pilgrim-documents?pilgrimId=:id */
router.get("/", async (req: any, res) => {
  const { pilgrimId } = req.query as Record<string, string | undefined>;
  if (!pilgrimId) return res.status(400).json({ error: "pilgrimId diperlukan" });
  try {
    const docs = await db
      .select()
      .from(pilgrimDocuments)
      .where(eq(pilgrimDocuments.pilgrimId, pilgrimId));
    return res.json({ data: docs });
  } catch (err) {
    console.error("[admin/pilgrim-documents] GET error:", err);
    return res.status(500).json({ error: "Gagal memuat dokumen" });
  }
});

/**
 * PUT /api/admin/pilgrim-documents
 * Body: { pilgrimId, bookingId?, documentType, fileUrl, status?, notes? }
 * Upsert: buat baru atau timpa dokumen yang sudah ada untuk kombinasi pilgrimId+documentType.
 */
router.put("/", async (req: any, res) => {
  const { pilgrimId, bookingId, documentType, fileUrl, status, notes } = req.body as Record<string, string | undefined>;
  if (!pilgrimId || !documentType) {
    return res.status(400).json({ error: "pilgrimId dan documentType diperlukan" });
  }
  try {
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

    if (existing) {
      const [updated] = await db
        .update(pilgrimDocuments)
        .set({
          fileUrl: fileUrl || null,
          status: (status || "submitted") as any,
          notes: notes || null,
          submittedAt: new Date(),
        })
        .where(eq(pilgrimDocuments.id, existing.id))
        .returning();
      return res.json(updated);
    } else {
      const [inserted] = await db
        .insert(pilgrimDocuments)
        .values({
          id: crypto.randomUUID(),
          pilgrimId,
          bookingId: bookingId || null,
          documentType,
          fileUrl: fileUrl || null,
          status: (status || "submitted") as any,
          notes: notes || null,
          submittedAt: new Date(),
          createdAt: new Date(),
        })
        .returning();
      return res.json(inserted);
    }
  } catch (err) {
    console.error("[admin/pilgrim-documents] PUT error:", err);
    return res.status(500).json({ error: "Gagal menyimpan dokumen" });
  }
});

/** DELETE /api/admin/pilgrim-documents/:docId */
router.delete("/:docId", async (req: any, res) => {
  try {
    const [deleted] = await db
      .delete(pilgrimDocuments)
      .where(eq(pilgrimDocuments.id, req.params.docId))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Dokumen tidak ditemukan" });
    return res.json({ message: "Dokumen dihapus" });
  } catch (err) {
    console.error("[admin/pilgrim-documents] DELETE error:", err);
    return res.status(500).json({ error: "Gagal menghapus dokumen" });
  }
});

export default router;
