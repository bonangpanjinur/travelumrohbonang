/**
 * Admin General Image Uploads
 * Endpoint generik untuk upload gambar (itinerary, perlengkapan, dll.)
 */
import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";

// Resolve upload dir and ensure it exists — called lazily at request time,
// never at module load, so the server can't crash during cold-start on Vercel.
function getUploadDir(): string {
  const dir =
    process.env.VERCEL === "1" || process.cwd().startsWith("/var/task")
      ? "/tmp/uploads/images"
      : path.join(process.cwd(), "uploads", "images");
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
    const url = `/api/admin/uploads/files/${req.file.filename}`;
    return res.json({ url, filename: req.file.filename, size: req.file.size });
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
    const url = `/api/admin/uploads/files/${req.file.filename}`;
    return res.json({ url, filename: req.file.filename, size: req.file.size, mimetype: req.file.mimetype });
  } catch (err) {
    console.error("[uploads] upload error:", err);
    return res.status(500).json({ error: "Gagal upload file" });
  }
});

/** GET /api/admin/uploads/files/:filename — Sajikan file yang sudah diupload */
router.get("/files/:filename", (req: any, res) => {
  const filePath = path.join(getUploadDir(), req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File tidak ditemukan" });
  res.sendFile(filePath);
});

export default router;
