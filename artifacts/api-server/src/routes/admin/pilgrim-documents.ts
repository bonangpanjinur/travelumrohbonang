/**
 * Admin Pilgrim Documents — P3-04
 * Admin dapat melihat, menyimpan, dan menghapus catatan dokumen jemaah
 * tanpa batasan kepemilikan (admin bypass).
 */
import { Router } from "express";
import { db, pilgrimDocuments, bookingPilgrims, bookings, packages, eq, and, inArray } from "@workspace/db";
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

/**
 * GET /api/admin/pilgrim-documents/pilgrims
 * Mengembalikan semua jemaah beserta info booking, paket, dan dokumen mereka.
 * Query params: search (nama/paspor), status (filter client-side)
 */
router.get("/pilgrims", async (req: any, res) => {
  try {
    const { search } = req.query as Record<string, string | undefined>;

    // Join booking_pilgrims → bookings → packages
    const pilgrimRows = await db
      .select({
        id: bookingPilgrims.id,
        name: bookingPilgrims.name,
        passport_number: bookingPilgrims.passportNumber,
        passport_expiry: bookingPilgrims.passportExpiry,
        booking_id: bookingPilgrims.bookingId,
        booking_code: bookings.bookingCode,
        package_title: packages.title,
      })
      .from(bookingPilgrims)
      .leftJoin(bookings, eq(bookingPilgrims.bookingId, bookings.id))
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .orderBy(bookingPilgrims.createdAt);

    // Apply search filter
    const filtered = search
      ? pilgrimRows.filter(
          (p) =>
            p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.passport_number?.toLowerCase().includes(search.toLowerCase()),
        )
      : pilgrimRows;

    const pilgrimIds = filtered.map((p) => p.id);

    // Batch-fetch documents for all filtered pilgrims
    let docRows: any[] = [];
    if (pilgrimIds.length > 0) {
      const raw = await db
        .select()
        .from(pilgrimDocuments)
        .where(inArray(pilgrimDocuments.pilgrimId, pilgrimIds));

      // Map to frontend-compatible snake_case shape
      docRows = raw.map((d) => ({
        id: d.id,
        pilgrim_id: d.pilgrimId,
        doc_type: d.documentType,
        file_url: d.fileUrl,
        file_name: null, // not stored in schema
        status: d.status,
        expiry_date: null, // not stored in schema
        notes: d.notes,
        verified_by: d.verifiedBy,
        verified_at: d.verifiedAt,
        created_at: d.createdAt,
        updated_at: null,
      }));
    }

    // Attach documents to each pilgrim
    const result = filtered.map((p) => ({
      ...p,
      documents: docRows.filter((d) => d.pilgrim_id === p.id),
    }));

    return res.json(result);
  } catch (err) {
    console.error("[pilgrim-documents] GET /pilgrims error:", err);
    return res.status(500).json({ error: "Gagal memuat data jemaah" });
  }
});

/**
 * POST /api/admin/pilgrim-documents/init-pilgrim/:pilgrimId
 * Buat placeholder dokumen (status: pending) untuk semua tipe dokumen
 * yang belum ada untuk jemaah ini.
 * Body: { bookingId }
 */
router.post("/init-pilgrim/:pilgrimId", async (req: any, res) => {
  const { pilgrimId } = req.params;
  const { bookingId } = req.body as Record<string, string | undefined>;
  if (!bookingId) return res.status(400).json({ error: "bookingId diperlukan" });

  const DOC_TYPES = ["paspor", "visa", "ktp", "foto", "surat_mahram", "lainnya"];

  try {
    const existing = await db
      .select({ documentType: pilgrimDocuments.documentType })
      .from(pilgrimDocuments)
      .where(eq(pilgrimDocuments.pilgrimId, pilgrimId));

    const existingTypes = existing.map((d) => d.documentType);
    const missing = DOC_TYPES.filter((t) => !existingTypes.includes(t));

    if (missing.length > 0) {
      await db.insert(pilgrimDocuments).values(
        missing.map((t) => ({
          id: crypto.randomUUID(),
          pilgrimId,
          bookingId,
          documentType: t,
          status: "pending",
          createdAt: new Date(),
        })),
      );
    }

    return res.json({ message: "Dokumen diinisialisasi", count: missing.length });
  } catch (err) {
    console.error("[pilgrim-documents] POST /init-pilgrim error:", err);
    return res.status(500).json({ error: "Gagal inisialisasi dokumen" });
  }
});

/**
 * PATCH /api/admin/pilgrim-documents/:docId
 * Update status dokumen (verified / rejected) beserta catatan.
 * Body: { status, notes? }
 */
router.patch("/:docId", async (req: any, res) => {
  const { status, notes } = req.body as Record<string, string | undefined>;
  if (!status) return res.status(400).json({ error: "status diperlukan" });
  try {
    const [updated] = await db
      .update(pilgrimDocuments)
      .set({
        status: status as any,
        notes: notes || null,
        verifiedAt: new Date(),
      })
      .where(eq(pilgrimDocuments.id, req.params.docId))
      .returning();
    if (!updated) return res.status(404).json({ error: "Dokumen tidak ditemukan" });
    return res.json({ message: "Status diperbarui", doc: updated });
  } catch (err) {
    console.error("[pilgrim-documents] PATCH error:", err);
    return res.status(500).json({ error: "Gagal update dokumen" });
  }
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
