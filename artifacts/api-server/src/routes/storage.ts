import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Upload guardrails: cap body size and restrict to safe content-types to
// prevent memory-exhaustion DoS and arbitrary file uploads (see .lovable/plan.md P1).
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/octet-stream", // Supabase JS client sometimes omits/blanks this
]);

function validateUploadHeaders(req: Request, res: Response): boolean {
  const contentType = (req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (contentType && !ALLOWED_CONTENT_TYPES.has(contentType)) {
    res.status(415).json({ error: `Unsupported content type: ${contentType}` });
    return false;
  }

  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > MAX_UPLOAD_BYTES) {
    res.status(413).json({ error: `File too large. Max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB` });
    return false;
  }

  return true;
}

function getBucketDir(bucket: string): string {
  const safe = bucket.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dir = path.join(UPLOADS_DIR, safe);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getFilePath(bucket: string, filePath: string): string {
  const bucketDir = getBucketDir(bucket);
  const safePath = filePath
    .split("/")
    .map((p) => p.replace(/[^a-zA-Z0-9._-]/g, "_"))
    .join("/");
  const fullPath = path.join(bucketDir, safePath);
  if (!fullPath.startsWith(bucketDir)) throw new Error("Invalid path");
  return fullPath;
}

function getWildcardPath(req: Request): string {
  const p = (req.params as Record<string, string | string[]>)["filePath"];
  if (Array.isArray(p)) return p.join("/");
  return (p as string) ?? "";
}

// Express 5 / path-to-regexp v8: wildcards use *name (no colon)
// POST /storage/v1/object/:bucket/*filePath
function handleUpload(req: Request, res: Response): void {
  const { bucket } = req.params as Record<string, string>;
  const filePath = getWildcardPath(req);
  if (!filePath) {
    res.status(400).json({ error: "Missing file path" });
    return;
  }
  if (!validateUploadHeaders(req, res)) return;

  try {
    const fullPath = getFilePath(bucket, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const chunks: Buffer[] = [];
    let total = 0;
    let aborted = false;

    req.on("data", (chunk: Buffer) => {
      if (aborted) return;
      total += chunk.length;
      if (total > MAX_UPLOAD_BYTES) {
        aborted = true;
        res.status(413).json({ error: `File too large. Max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB` });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (aborted) return;
      const buf = Buffer.concat(chunks);
      fs.writeFileSync(fullPath, buf);
      res.status(200).json({
        Key: `${bucket}/${filePath}`,
        Id: crypto.randomUUID(),
      });
    });
    req.on("error", (err) => {
      if (aborted) return;
      console.error("[Storage] upload error:", err);
      res.status(500).json({ error: err.message });
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

router.post("/object/:bucket/*filePath", requireAuth, handleUpload);

// PUT /storage/v1/object/:bucket/*filePath
router.put("/object/:bucket/*filePath", requireAuth, handleUpload);

// GET /storage/v1/object/public/:bucket/*filePath
router.get("/object/public/:bucket/*filePath", (req: Request, res: Response) => {
  const { bucket } = req.params as Record<string, string>;
  const filePath = getWildcardPath(req);
  if (!filePath) return res.status(400).json({ error: "Missing file path" });

  try {
    const fullPath = getFilePath(bucket, filePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "File not found" });
    }
    res.sendFile(fullPath);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /storage/v1/object/:bucket/*filePath
router.delete("/object/:bucket/*filePath", requireAuth, (req: Request, res: Response) => {
  const { bucket } = req.params as Record<string, string>;
  const filePath = getWildcardPath(req);

  try {
    const fullPath = getFilePath(bucket, filePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    res.status(200).json({ message: "Deleted" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
