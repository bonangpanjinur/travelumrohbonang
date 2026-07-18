/**
 * Admin General Image Uploads
 * Endpoint generik untuk upload gambar (itinerary, perlengkapan, dll.)
 */
import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";

const uploadDir = path.join(process.cwd(), "uploads", "images");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".bin";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
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

/** GET /api/admin/uploads/files/:filename — Sajikan file yang sudah diupload */
router.get("/files/:filename", (req: any, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File tidak ditemukan" });
  res.sendFile(filePath);
});

export default router;
