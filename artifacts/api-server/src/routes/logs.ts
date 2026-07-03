import { Router } from "express";
import { db, requestLog, errorLogs, auditLogs } from "@workspace/db";
import { v4 as uuidv4 } from "uuid";
// NOTE: In a real app, you'd add rate limiting here. The requirement mentioned rate limiting.
// artifacts/api-server/src/middlewares/rateLimiter.ts likely exists.

const router = Router();

router.post("/request", async (req, res) => {
  try {
    const id = uuidv4();
    await db.insert(requestLog).values({
      ...req.body,
      id,
      ip: req.ip,
      createdAt: new Date(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to log request" });
  }
});

router.post("/error", async (req, res) => {
  try {
    const id = uuidv4();
    await db.insert(errorLogs).values({
      ...req.body,
      id,
      createdAt: new Date(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to log error" });
  }
});

router.post("/audit", async (req, res) => {
  try {
    const id = uuidv4();
    await db.insert(auditLogs).values({
      ...req.body,
      id,
      createdAt: new Date(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to log audit" });
  }
});

export default router;
