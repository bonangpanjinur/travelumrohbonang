/**
 * Admin General Image Uploads
 * Endpoint generik untuk upload gambar (itinerary, perlengkapan, dll.)
 */
import { Router } from "express";
import path from "path";
import fs from "fs";
import crypto from "node:crypto";
import multer from "multer";
import { resolveUserScope } from "../../lib/scopeGuard";

// Resolve upload dir and ensure it exists — called lazily at request time,
// never at module load, so the server can't crash during cold-start on Vercel.
function getUploadDir(branchId = "legacy"): string {
  const safeBranchId = branchId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const root =
    process.env.VERCEL === "1" || process.cwd().startsWith("/var/task")
      ? "/tmp/uploads/images"
      : path.join(process.cwd(), "uploads", "images");
  const dir = path.join(root, safeBranchId);
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return dir;
}

const storage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    resolveUserScope(req)
      .then((scope) => {
        const branchId = scope.type === "branch" && scope.branchId ? scope.branchId : "hq";
        cb(null, getUploadDir(branchId));
      })
      .catch((err) => cb(err as Error, getUploadDir("legacy")));
  },
  filename: (_req, file, cb) => {
    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
      "application/pdf": ".pdf", "video/mp4": ".mp4", "video/webm": ".webm", "video/ogg": ".ogv",
      "application/epub+zip": ".epub",
    };
    cb(null, `${crypto.randomUUID()}${extensions[file.mimetype] ?? ".bin"}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "application/pdf",
      "video/mp4", "video/webm", "video/ogg",
      "application/epub+zip",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

/**
 * POST /api/admin/uploads/image
 * Multipart upload: terima file gambar, simpan ke disk lokal.
 * Returns { url } — URL yang bisa diakses lewat /api/admin/uploads/files/:filename
 */
router.post("/image", upload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File tidak diterima atau format tidak didukung (JPG/PNG/WebP)" });
    }
    const scope = await resolveUserScope(req);
    const branchId = scope.type === "branch" && scope.branchId ? scope.branchId : "hq";
    const url = `/api/admin/uploads/files/${encodeURIComponent(branchId)}/${encodeURIComponent(req.file.filename)}`;
    return res.json({ url, filename: req.file.filename, branchId, size: req.file.size, correlationId: req.correlationId ?? null });
  } catch (err) {
    console.error("[uploads] upload error:", err);
    return res.status(500).json({ error: "Gagal upload gambar" });
  }
});

/**
 * POST /api/admin/uploads/file
 * Endpoint generik — terima PDF, video, gambar, epub.
 * Returns { url } — URL yang bisa diakses lewat /api/admin/uploads/files/:filename
 */
router.post("/file", upload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File tidak diterima atau format tidak didukung (PDF/MP4/WebM/JPG/PNG/EPUB)" });
    }
    const scope = await resolveUserScope(req);
    const branchId = scope.type === "branch" && scope.branchId ? scope.branchId : "hq";
    const url = `/api/admin/uploads/files/${encodeURIComponent(branchId)}/${encodeURIComponent(req.file.filename)}`;
    return res.json({ url, filename: req.file.filename, branchId, size: req.file.size, mimetype: req.file.mimetype, correlationId: req.correlationId ?? null });
  } catch (err) {
    console.error("[uploads] upload error:", err);
    return res.status(500).json({ error: "Gagal upload file" });
  }
});

/** GET /api/admin/uploads/files/:filename — Sajikan file yang sudah diupload */
router.get("/files/:branchId/:filename", async (req: any, res) => {
  const scope = await resolveUserScope(req);
  const requestedBranch = req.params.branchId;
  const allowed = scope.type === "global" || (scope.type === "branch" && scope.branchId === requestedBranch);
  if (!allowed) return res.status(404).json({ error: "File tidak ditemukan" });
  const filePath = path.join(getUploadDir(requestedBranch), path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File tidak ditemukan" });
  res.sendFile(filePath);
});

// Legacy flat paths are only available to global administrators during migration.
router.get("/files/:filename", async (req: any, res) => {
  const scope = await resolveUserScope(req);
  if (scope.type !== "global") return res.status(404).json({ error: "File tidak ditemukan" });
  const filePath = path.join(getUploadDir("legacy"), path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File tidak ditemukan" });
  res.sendFile(filePath);
});

export default router;
