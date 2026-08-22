/**
 * Admin Pilgrim Documents — P3-04
 * Admin dapat melihat, menyimpan, dan menghapus catatan dokumen jemaah
 * tanpa batasan kepemilikan (admin bypass).
 */
import { Router } from "express";
import { db, pilgrimDocuments, documentTypes, bookingPilgrims, bookings, packages, eq, and, inArray, asc, sql } from "@workspace/db";
import { resolveUserScope } from "../../lib/scopeGuard";
import { buildBookingScopeCondition, isBookingInScope } from "../../lib/scopeConditions";
import path from "path";
import fs from "fs";
import multer from "multer";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "../../lib/supabaseEnv";

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

const allowedDocumentTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, allowedDocumentTypes.has(file.mimetype)),
});

function documentExtension(mimetype: string): string {
  return ({ "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" } as Record<string, string>)[mimetype] ?? ".bin";
}

function validDocumentSignature(buffer: Buffer, mimetype: string): boolean {
  if (mimetype === "image/jpeg") return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimetype === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimetype === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimetype === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}

async function uploadDocumentToPrivateStorage(file: Express.Multer.File, branchId: string): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Private document storage is not configured");
  const bucket = process.env.SUPABASE_DOCUMENT_BUCKET || "pilgrim-documents";
  const objectName = `admin/${branchId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${documentExtension(file.mimetype)}`;
  const encodedPath = objectName.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY, "Content-Type": file.mimetype, "x-upsert": "false" },
    body: file.buffer,
  });
  if (!response.ok) throw new Error(`Document storage upload failed (${response.status})`);
  return `/private-documents/${bucket}/${objectName}`;
}

function fileUrlMatchesBranch(fileUrl: string, branchId: string): boolean {
  const prefix = "/api/admin/pilgrim-documents/files/";
  if (!fileUrl.startsWith(prefix)) return false;
  try {
    const token = fileUrl.slice(prefix.length);
    const objectPath = Buffer.from(token, "base64url").toString("utf8");
    const bucket = process.env.SUPABASE_DOCUMENT_BUCKET || "pilgrim-documents";
    return objectPath.startsWith(`/private-documents/${bucket}/admin/${branchId}/`);
  } catch { return false; }
}

async function deletePrivateObject(objectPath: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !objectPath.startsWith("/private-documents/")) return;
  const value = objectPath.replace(/^\/private-documents\//, "");
  const slash = value.indexOf("/");
  if (slash <= 0) return;
  const bucket = value.slice(0, slash);
  const objectName = value.slice(slash + 1).split("/").map(encodeURIComponent).join("/");
  await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${objectName}`, { method: "DELETE", headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY } }).catch(() => undefined);
}

const router = Router();

/**
 * POST /api/admin/pilgrim-documents/upload
 * Multipart upload: menerima file dan menyimpan ke private object storage.
 * Returns { url } — URL internal yang hanya dapat diakses setelah scope check.
 */
router.post("/upload", documentUpload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File tidak diterima atau format tidak didukung (JPG/PNG/PDF)" });
    if (!validDocumentSignature(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ error: "Isi file tidak cocok dengan tipe yang diklaim" });
    }
    const { bookingId, pilgrimId } = req.body as { bookingId?: string; pilgrimId?: string };
    if (!bookingId || !pilgrimId) return res.status(400).json({ error: "bookingId dan pilgrimId wajib diisi" });
    const scope = await resolveUserScope(req);
    const scopeCond = buildBookingScopeCondition(scope, "bookings");
    const [booking] = await db.select({ branchId: bookings.branchId }).from(bookings).where(and(eq(bookings.id, bookingId), scopeCond)).limit(1);
    if (!booking) return res.status(404).json({ error: "Booking tidak ditemukan" });
    const [pilgrim] = await db.select({ id: bookingPilgrims.id }).from(bookingPilgrims).where(and(eq(bookingPilgrims.id, pilgrimId), eq(bookingPilgrims.bookingId, bookingId))).limit(1);
    if (!pilgrim) return res.status(403).json({ error: "Pilgrim tidak berada dalam booking tersebut" });
    const branchId = booking.branchId ?? "hq";
    const objectPath = await uploadDocumentToPrivateStorage(req.file, branchId);
    const token = Buffer.from(objectPath).toString("base64url");
    const url = `/api/admin/pilgrim-documents/files/${token}`;
    return res.json({ url, filename: `${crypto.randomUUID()}${documentExtension(req.file.mimetype)}`, size: req.file.size, correlationId: req.correlationId ?? null });
  } catch (err) {
    console.error("[pilgrim-documents] upload error:", err);
    return res.status(500).json({ error: "Gagal upload file", correlationId: req.correlationId ?? null });
  }
});

/** GET /api/admin/pilgrim-documents/files/:token — Serve private document after scope check */
router.get("/files/:token", async (req: any, res) => {
  const token = String(req.params.token ?? "");
  if (!token || token.includes("..")) return res.status(400).json({ error: "Token tidak valid" });
  let objectPath: string;
  try { objectPath = Buffer.from(token, "base64url").toString("utf8"); } catch { return res.status(400).json({ error: "Token tidak valid" }); }
  if (!objectPath.startsWith("/private-documents/")) return res.status(400).json({ error: "Token tidak valid" });
  const fileUrl = `/api/admin/pilgrim-documents/files/${token}`;
  const scope = await resolveUserScope(req);
  const rows = await db.select({ branchId: bookings.branchId, agentId: bookings.agentId, picType: bookings.picType, picId: bookings.picId })
    .from(pilgrimDocuments).leftJoin(bookings, eq(pilgrimDocuments.bookingId, bookings.id)).where(eq(pilgrimDocuments.fileUrl, fileUrl)).limit(1);
  if (!rows[0] || !isBookingInScope(rows[0], scope)) return res.status(404).json({ error: "File tidak ditemukan" });
  const value = objectPath.replace(/^\/private-documents\//, "");
  const slash = value.indexOf("/");
  if (slash <= 0 || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(404).json({ error: "File tidak ditemukan" });
  const bucket = value.slice(0, slash);
  const objectName = value.slice(slash + 1);
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(bucket)}`, {
    method: "POST", headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300, paths: [objectName] }),
  });
  if (!response.ok) return res.status(404).json({ error: "File tidak ditemukan" });
  const payload = await response.json() as { signedURLs?: Array<{ signedURL?: string }> };
  const signed = payload.signedURLs?.[0]?.signedURL;
  if (!signed) return res.status(404).json({ error: "File tidak ditemukan" });
  return res.redirect(302, signed.startsWith("http") ? signed : `${SUPABASE_URL}/storage/v1${signed}`);
});

/**
 * GET /api/admin/pilgrim-documents/pilgrims
 * Mengembalikan semua jemaah beserta info booking, paket, dan dokumen mereka.
 * Query params: search (nama/paspor), status (filter client-side)
 */
router.get("/pilgrims", async (req: any, res) => {
  try {
    const { search } = req.query as Record<string, string | undefined>;

    // D-3: scope — filter jemaah berdasarkan booking yang diizinkan
    const scope = await resolveUserScope(req);
    const scopeCond = buildBookingScopeCondition(scope);

    // Join booking_pilgrims → bookings → packages dengan scope filter
    const pilgrimRows = await db.execute(sql`
      SELECT
        bp.id,
        bp.name,
        bp.passport_number,
        bp.passport_expiry,
        bp.booking_id,
        b.booking_code,
        pkg.title AS package_title
      FROM booking_pilgrims bp
      LEFT JOIN bookings b ON b.id = bp.booking_id
      LEFT JOIN packages pkg ON pkg.id = b.package_id
      WHERE ${scopeCond}
      ORDER BY bp.created_at
    `);
    const rawRows = ((pilgrimRows as any).rows ?? pilgrimRows) as Array<{
      id: string;
      name: string | null;
      passport_number: string | null;
      passport_expiry: string | null;
      booking_id: string | null;
      booking_code: string | null;
      package_title: string | null;
    }>;

    // Apply search filter
    const filtered = search
      ? rawRows.filter(
          (p) =>
            p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.passport_number?.toLowerCase().includes(search.toLowerCase()),
        )
      : rawRows;

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

  try {
    const [booking] = await db
      .select({ branchId: bookings.branchId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!booking) return res.status(404).json({ error: "Booking tidak ditemukan" });
    const branchId = booking.branchId ?? "hq";

    // Ambil tipe dokumen aktif dari DB (fallback ke hardcoded jika tabel kosong)
    const configuredTypes = await db
      .select({ code: documentTypes.code })
      .from(documentTypes)
      .where(eq(documentTypes.isActive, true))
      .orderBy(asc(documentTypes.sortOrder));

    const DOC_TYPES = configuredTypes.length > 0
      ? configuredTypes.map((t) => t.code)
      : ["paspor", "ktp", "foto", "visa", "surat_mahram", "lainnya"];

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
          branchId,
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
  const allowedStatuses = new Set(["pending", "submitted", "verified", "rejected"]);
  if (!status || !allowedStatuses.has(status)) return res.status(400).json({ error: "status dokumen tidak valid" });
  try {
    const scope = await resolveUserScope(req);
    const scopeCond = buildBookingScopeCondition(scope);
    const [updated] = await db
      .update(pilgrimDocuments)
      .set({
        status: status as any,
        notes: notes?.slice(0, 2000) || null,
        verifiedAt: status === "verified" ? new Date() : null,
      })
      .where(and(eq(pilgrimDocuments.id, String(req.params.docId)), sql`EXISTS (SELECT 1 FROM bookings b WHERE b.id = ${pilgrimDocuments.bookingId} AND ${scopeCond})`))
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
    const scope = await resolveUserScope(req);
    const scopeCond = buildBookingScopeCondition(scope);
    const docs = await db
      .select({ doc: pilgrimDocuments })
      .from(pilgrimDocuments)
      .where(and(eq(pilgrimDocuments.pilgrimId, pilgrimId), sql`EXISTS (SELECT 1 FROM bookings b WHERE b.id = ${pilgrimDocuments.bookingId} AND ${scopeCond})`));
    const data = docs.map((row) => row.doc);
    return res.json({ data });
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
  const allowedStatuses = new Set(["pending", "submitted", "verified", "rejected"]);
  if (!pilgrimId || !documentType || !bookingId) {
    return res.status(400).json({ error: "pilgrimId, bookingId, dan documentType diperlukan" });
  }
  if (status && !allowedStatuses.has(status)) return res.status(400).json({ error: "status dokumen tidak valid" });
  if (fileUrl !== undefined && fileUrl !== null && fileUrl !== "" && !fileUrl.startsWith("/api/admin/pilgrim-documents/files/")) return res.status(400).json({ error: "fileUrl harus berasal dari upload dokumen internal" });
  try {
    const scope = await resolveUserScope(req);
    const scopeCond = buildBookingScopeCondition(scope, "bookings");
    const [booking] = await db
      .select({ branchId: bookings.branchId })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), scopeCond))
      .limit(1);
    if (!booking) return res.status(404).json({ error: "Booking tidak ditemukan" });
    const branchId = booking.branchId ?? "hq";
    if (fileUrl && !fileUrlMatchesBranch(fileUrl, branchId)) return res.status(400).json({ error: "fileUrl tidak sesuai dengan branch booking" });
    const [pilgrim] = await db.select({ id: bookingPilgrims.id }).from(bookingPilgrims).where(and(eq(bookingPilgrims.id, pilgrimId), eq(bookingPilgrims.bookingId, bookingId))).limit(1);
    if (!pilgrim) return res.status(403).json({ error: "Pilgrim tidak berada dalam booking tersebut" });

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
          notes: notes?.slice(0, 2000) || null,
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
          branchId,
          pilgrimId,
          bookingId,
          documentType,
          fileUrl: fileUrl || null,
          status: (status || "submitted") as any,
          notes: notes?.slice(0, 2000) || null,
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
    const scope = await resolveUserScope(req);
    const scopeCond = buildBookingScopeCondition(scope);
    const [deleted] = await db
      .delete(pilgrimDocuments)
      .where(and(eq(pilgrimDocuments.id, String(req.params.docId)), sql`EXISTS (SELECT 1 FROM bookings b WHERE b.id = ${pilgrimDocuments.bookingId} AND ${scopeCond})`))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Dokumen tidak ditemukan" });
    return res.json({ message: "Dokumen dihapus" });
  } catch (err) {
    console.error("[admin/pilgrim-documents] DELETE error:", err);
    return res.status(500).json({ error: "Gagal menghapus dokumen" });
  }
});

export default router;
