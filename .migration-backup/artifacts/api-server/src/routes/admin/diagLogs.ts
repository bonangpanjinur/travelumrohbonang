import { Router } from "express";
import { getDiagLogs } from "../../lib/diagLogBuffer";

const router = Router();

// GET /api/admin/logs/rest-diag?sinceId=&table=&method=&stage=&q=&limit=
// Powers the "Live REST Diagnostics" admin page — a polling tail of the
// in-memory [REST-DIAG] ring buffer (see diagLogBuffer.ts).
router.get("/rest-diag", (req, res) => {
  const { sinceId, table, method, stage, q, limit } = req.query as Record<string, string>;
  const logs = getDiagLogs({
    sinceId: sinceId ? parseInt(sinceId, 10) : undefined,
    table: table || undefined,
    method: method || undefined,
    stage: stage || undefined,
    q: q || undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  res.json(logs);
});

export default router;
