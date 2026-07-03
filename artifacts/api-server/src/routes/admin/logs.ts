import { Router } from "express";
import { db, auditLogs, errorLogs, desc } from "@workspace/db";

const router = Router();

router.get("/audit", async (req, res) => {
  try {
    const data = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

router.get("/error", async (req, res) => {
  try {
    const data = await db.select().from(errorLogs).orderBy(desc(errorLogs.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch error logs" });
  }
});

export default router;
