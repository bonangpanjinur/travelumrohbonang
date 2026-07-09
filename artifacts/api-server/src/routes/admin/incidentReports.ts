import { Router } from "express";
import { createIncidentReportLink, getIncidentReportLink } from "../../lib/incidentReportStore";

const router = Router();

// POST /api/admin/incident-reports — store a report, return a short-lived id + expiry.
router.post("/", (req, res) => {
  const { report } = req.body as { report?: string };
  if (!report || typeof report !== "string" || !report.trim()) {
    res.status(400).json({ error: "report (non-empty string) is required" });
    return;
  }
  if (report.length > 2_000_000) {
    res.status(413).json({ error: "report too large" });
    return;
  }

  const createdBy = (req.user as any)?.id ?? null;
  const { id, expiresAt } = createIncidentReportLink(report, createdBy);
  res.status(201).json({ id, expiresAt });
});

// GET /api/admin/incident-reports/:id — fetch a previously stored report.
// Still gated by requireAdmin at the router mount level, so the "link" only
// works for someone who is themselves logged in as an admin — it's a
// convenience over pasting text, not a public share link.
router.get("/:id", (req, res) => {
  const entry = getIncidentReportLink(req.params.id);
  if (!entry) {
    res.status(404).json({ error: "Report not found or expired" });
    return;
  }
  res.json({
    report: entry.report,
    createdAt: entry.createdAt,
    expiresAt: entry.expiresAt,
  });
});

export default router;
