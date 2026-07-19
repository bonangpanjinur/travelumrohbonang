/**
 * Admin Pilgrim Documents — P3-04
 * Admin dapat melihat, menyimpan, dan menghapus catatan dokumen jemaah
 * tanpa batasan kepemilikan (admin bypass).
 */
import { Router } from "express";
import { db, pilgrimDocuments, eq, and } from "@workspace/db";
import path from "path";
import fs from "fs";
import multer from "multer";

// Resolve upload dir and ensure it exists — called lazily at request time,
// never at module load, so the server can't crash during cold-start on Vercel
// (where /var/task is read-only and mkdirSync throws ENOENT at module scope).
function getUploadDir(): string {
  const dir =
    process.env.VERCEL === "1" || process.cwd().startsWith("/var/task")
      ? "/tmp/uploads/pilgrim-docs"
      : path.join(process.cwd(), "uploads", "pilgrim-docs");
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return dir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, getUploadDir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".bin";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

/**
 * POST /api/admin/pilgrim-documents/upload
 * Multipart upload: menerima file dan menyimpan ke disk lokal.
 * Returns { url } — URL relatif yang bisa diakses lewat /api/admin/pilgrim-documents/files/:filename
 */
router.post("/upload", upload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File tidak diterima atau format tidak didukung (JPG/PNG/PDF)" });
    const url = `/api/admin/pilgrim-documents/files/${req.file.filename}`;
    return res.json({ url, filename: req.file.filename, size: req.file.size });
  } catch (err) {
    console.error("[pilgrim-documents] upload error:", err);
    return res.status(500).json({ error: "Gagal upload file" });
  }
});

/** GET /api/admin/pilgrim-documents/files/:filename — Sajikan file yang sudah diupload */
router.get("/files/:filename", (req: any, res) => {
  const filePath = path.join(getUploadDir(), req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File tidak ditemukan" });
  res.sendFile(filePath);
});

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
