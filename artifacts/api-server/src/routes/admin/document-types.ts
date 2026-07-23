/**
 * Admin Document Types — Konfigurasi Master Jenis Dokumen Jemaah
 * CRUD untuk tabel document_types: admin dapat mengatur dokumen apa saja
 * yang wajib/opsional diupload oleh jemaah.
 */
import { Router } from "express";
import { db, documentTypes, pilgrimDocuments, eq, asc } from "@workspace/db";

const router = Router();

/** Seed data awal yang digunakan saat tabel masih kosong */
const DEFAULT_DOC_TYPES = [
  { code: "paspor",        label: "Paspor",            description: "Halaman data diri + foto paspor (min. 6 bulan berlaku)", isRequired: true,  appliesTo: "all",    allowedFormats: "pdf,jpg,png", maxSizeMb: 5, needsVerification: true,  hasExpiry: true,  sortOrder: 1 },
  { code: "ktp",           label: "KTP",               description: "Kartu Tanda Penduduk (kedua sisi)",                       isRequired: true,  appliesTo: "adult",  allowedFormats: "pdf,jpg,png", maxSizeMb: 5, needsVerification: true,  hasExpiry: true,  sortOrder: 2 },
  { code: "foto",          label: "Foto 4×6",          description: "Foto terbaru latar putih, tampak depan",                  isRequired: true,  appliesTo: "all",    allowedFormats: "jpg,png",     maxSizeMb: 3, needsVerification: false, hasExpiry: false, sortOrder: 3 },
  { code: "kartu_keluarga",label: "Kartu Keluarga",    description: "Kartu Keluarga (KK)",                                     isRequired: true,  appliesTo: "all",    allowedFormats: "pdf,jpg,png", maxSizeMb: 5, needsVerification: true,  hasExpiry: false, sortOrder: 4 },
  { code: "buku_nikah",    label: "Buku Nikah",        description: "Akta nikah / buku nikah untuk pasangan",                  isRequired: false, appliesTo: "married",allowedFormats: "pdf,jpg,png", maxSizeMb: 5, needsVerification: true,  hasExpiry: false, sortOrder: 5 },
  { code: "akta_lahir",    label: "Akta Lahir",        description: "Akta kelahiran untuk anak/bayi",                          isRequired: false, appliesTo: "child",  allowedFormats: "pdf,jpg,png", maxSizeMb: 5, needsVerification: true,  hasExpiry: false, sortOrder: 6 },
  { code: "visa",          label: "Visa",              description: "Visa umroh / dokumen izin masuk",                         isRequired: false, appliesTo: "all",    allowedFormats: "pdf,jpg,png", maxSizeMb: 5, needsVerification: true,  hasExpiry: true,  sortOrder: 7 },
  { code: "surat_mahram",  label: "Surat Mahram",      description: "Surat keterangan mahram untuk wanita tanpa suami",        isRequired: false, appliesTo: "female", allowedFormats: "pdf,jpg,png", maxSizeMb: 5, needsVerification: true,  hasExpiry: false, sortOrder: 8 },
  { code: "vaksin",        label: "Sertifikat Vaksin", description: "Sertifikat vaksinasi meningitis / COVID",                 isRequired: false, appliesTo: "all",    allowedFormats: "pdf,jpg,png", maxSizeMb: 5, needsVerification: true,  hasExpiry: true,  sortOrder: 9 },
  { code: "lainnya",       label: "Dokumen Lainnya",   description: "Dokumen pendukung lainnya",                               isRequired: false, appliesTo: "all",    allowedFormats: "pdf,jpg,png", maxSizeMb: 10,needsVerification: false, hasExpiry: false, sortOrder: 10 },
];

/**
 * GET /api/admin/document-types
 * List semua tipe dokumen, diurutkan berdasarkan sort_order.
 * Query: ?activeOnly=true untuk hanya yang aktif
 */
router.get("/", async (req: any, res) => {
  try {
    const rows = await db
      .select()
      .from(documentTypes)
      .orderBy(asc(documentTypes.sortOrder), asc(documentTypes.createdAt));

    // Jika tabel masih kosong, seed data default
    if (rows.length === 0) {
      const seeded = DEFAULT_DOC_TYPES.map((d) => ({
        id: crypto.randomUUID(),
        ...d,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await db.insert(documentTypes).values(seeded);
      return res.json(seeded);
    }

    const { activeOnly } = req.query as Record<string, string | undefined>;
    const result = activeOnly === "true" ? rows.filter((r) => r.isActive) : rows;
    return res.json(result);
  } catch (err) {
    console.error("[document-types] GET / error:", err);
    return res.status(500).json({ error: "Gagal memuat tipe dokumen" });
  }
});

/**
 * POST /api/admin/document-types
 * Buat tipe dokumen baru.
 */
router.post("/", async (req: any, res) => {
  const { code, label, description, isRequired, appliesTo, allowedFormats, maxSizeMb, needsVerification, hasExpiry, sortOrder } = req.body;
  if (!code || !label) {
    return res.status(400).json({ error: "code dan label wajib diisi" });
  }
  try {
    const [existing] = await db.select({ id: documentTypes.id }).from(documentTypes).where(eq(documentTypes.code, code)).limit(1);
    if (existing) return res.status(409).json({ error: `Kode "${code}" sudah digunakan` });

    const [inserted] = await db
      .insert(documentTypes)
      .values({
        id: crypto.randomUUID(),
        code,
        label,
        description: description || null,
        isRequired: isRequired !== false,
        appliesTo: appliesTo || "all",
        allowedFormats: allowedFormats || "pdf,jpg,png",
        maxSizeMb: maxSizeMb || 5,
        needsVerification: needsVerification !== false,
        hasExpiry: hasExpiry || false,
        isActive: true,
        sortOrder: sortOrder || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return res.status(201).json(inserted);
  } catch (err) {
    console.error("[document-types] POST / error:", err);
    return res.status(500).json({ error: "Gagal membuat tipe dokumen" });
  }
});

/**
 * PUT /api/admin/document-types/:id
 * Update tipe dokumen.
 */
router.put("/:id", async (req: any, res) => {
  const { code, label, description, isRequired, appliesTo, allowedFormats, maxSizeMb, needsVerification, hasExpiry, isActive, sortOrder } = req.body;
  try {
    // Cek duplikasi code jika code diubah
    if (code) {
      const [dup] = await db.select({ id: documentTypes.id }).from(documentTypes)
        .where(eq(documentTypes.code, code)).limit(1);
      if (dup && dup.id !== req.params.id) {
        return res.status(409).json({ error: `Kode "${code}" sudah digunakan` });
      }
    }

    const [updated] = await db
      .update(documentTypes)
      .set({
        ...(code !== undefined && { code }),
        ...(label !== undefined && { label }),
        ...(description !== undefined && { description }),
        ...(isRequired !== undefined && { isRequired }),
        ...(appliesTo !== undefined && { appliesTo }),
        ...(allowedFormats !== undefined && { allowedFormats }),
        ...(maxSizeMb !== undefined && { maxSizeMb }),
        ...(needsVerification !== undefined && { needsVerification }),
        ...(hasExpiry !== undefined && { hasExpiry }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
        updatedAt: new Date(),
      })
      .where(eq(documentTypes.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Tipe dokumen tidak ditemukan" });
    return res.json(updated);
  } catch (err) {
    console.error("[document-types] PUT /:id error:", err);
    return res.status(500).json({ error: "Gagal update tipe dokumen" });
  }
});

/**
 * PATCH /api/admin/document-types/:id/toggle
 * Toggle aktif/nonaktif.
 */
router.patch("/:id/toggle", async (req: any, res) => {
  try {
    const [current] = await db.select({ isActive: documentTypes.isActive }).from(documentTypes)
      .where(eq(documentTypes.id, req.params.id)).limit(1);
    if (!current) return res.status(404).json({ error: "Tipe dokumen tidak ditemukan" });

    const [updated] = await db
      .update(documentTypes)
      .set({ isActive: !current.isActive, updatedAt: new Date() })
      .where(eq(documentTypes.id, req.params.id))
      .returning();
    return res.json(updated);
  } catch (err) {
    console.error("[document-types] PATCH /:id/toggle error:", err);
    return res.status(500).json({ error: "Gagal toggle status" });
  }
});

/**
 * POST /api/admin/document-types/reorder
 * Body: { items: Array<{ id: string; sortOrder: number }> }
 * Update urutan tampil sekaligus.
 */
router.post("/reorder", async (req: any, res) => {
  const { items } = req.body as { items: Array<{ id: string; sortOrder: number }> };
  if (!Array.isArray(items)) return res.status(400).json({ error: "items harus array" });
  try {
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        db.update(documentTypes).set({ sortOrder, updatedAt: new Date() }).where(eq(documentTypes.id, id))
      )
    );
    return res.json({ message: "Urutan diperbarui" });
  } catch (err) {
    console.error("[document-types] POST /reorder error:", err);
    return res.status(500).json({ error: "Gagal update urutan" });
  }
});

/**
 * DELETE /api/admin/document-types/:id
 * Hapus permanen hanya jika belum digunakan di pilgrim_documents.
 * Jika sudah ada data dokumen jemaah yang memakai kode ini, kembalikan 409.
 * Lebih aman: gunakan PATCH /:id/toggle untuk menonaktifkan saja.
 */
router.delete("/:id", async (req: any, res) => {
  try {
    // Ambil kode tipe dokumen ini dulu
    const [target] = await db
      .select({ code: documentTypes.code })
      .from(documentTypes)
      .where(eq(documentTypes.id, req.params.id))
      .limit(1);
    if (!target) return res.status(404).json({ error: "Tipe dokumen tidak ditemukan" });

    // Cek apakah sudah dipakai di pilgrim_documents
    const [usage] = await db
      .select({ id: pilgrimDocuments.id })
      .from(pilgrimDocuments)
      .where(eq(pilgrimDocuments.documentType, target.code))
      .limit(1);

    if (usage) {
      return res.status(409).json({
        error: `Tidak dapat menghapus: tipe dokumen "${target.code}" sudah digunakan oleh data jemaah. Nonaktifkan saja agar tidak muncul di checklist baru.`,
      });
    }

    const [deleted] = await db
      .delete(documentTypes)
      .where(eq(documentTypes.id, req.params.id))
      .returning();
    return res.json({ message: "Tipe dokumen dihapus" });
  } catch (err) {
    console.error("[document-types] DELETE /:id error:", err);
    return res.status(500).json({ error: "Gagal menghapus tipe dokumen" });
  }
});

export default router;
