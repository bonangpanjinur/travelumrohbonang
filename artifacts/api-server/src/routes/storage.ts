import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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
router.post("/object/:bucket/*filePath", (req: Request, res: Response) => {
  const { bucket } = req.params;
  const filePath = getWildcardPath(req);
  if (!filePath) return res.status(400).json({ error: "Missing file path" });

  try {
    const fullPath = getFilePath(bucket, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const buf = Buffer.concat(chunks);
      fs.writeFileSync(fullPath, buf);
      res.status(200).json({
        Key: `${bucket}/${filePath}`,
        Id: crypto.randomUUID(),
      });
    });
    req.on("error", (err) => {
      console.error("[Storage] upload error:", err);
      res.status(500).json({ error: err.message });
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /storage/v1/object/:bucket/*filePath
router.put("/object/:bucket/*filePath", (req: Request, res: Response) => {
  const { bucket } = req.params;
  const filePath = getWildcardPath(req);
  if (!filePath) return res.status(400).json({ error: "Missing file path" });

  try {
    const fullPath = getFilePath(bucket, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const buf = Buffer.concat(chunks);
      fs.writeFileSync(fullPath, buf);
      res.status(200).json({
        Key: `${bucket}/${filePath}`,
        Id: crypto.randomUUID(),
      });
    });
    req.on("error", (err) => {
      console.error("[Storage] upload error:", err);
      res.status(500).json({ error: err.message });
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /storage/v1/object/public/:bucket/*filePath
router.get("/object/public/:bucket/*filePath", (req: Request, res: Response) => {
  const { bucket } = req.params;
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
router.delete("/object/:bucket/*filePath", (req: Request, res: Response) => {
  const { bucket } = req.params;
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
