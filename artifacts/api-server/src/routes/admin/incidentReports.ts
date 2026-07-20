/**
 * Incident Management — full DB-backed CRUD.
 * Replaces the previous in-memory store.
 *
 * GET    /api/admin/incident-reports           — list (filter by departureId, status, type)
 * POST   /api/admin/incident-reports           — create
 * PATCH  /api/admin/incident-reports/:id       — update (status, resolution, etc.)
 * DELETE /api/admin/incident-reports/:id       — hard delete
 */
import { Router } from "express";
import {
  db,
  incidentReports,
  bookingPilgrims,
  packageDepartures,
  packages,
  eq,
  and,
  desc,
  ilike,
  or,
} from "@workspace/db";

const router = Router();

// ── LIST ─────────────────────────────────────────────────────────────────────
router.get("/", async (req: any, res) => {
  try {
    const { departureId, status, type, severity, search } = req.query as Record<string, string>;

    const rows = await db
      .select({
        id:           incidentReports.id,
        departureId:  incidentReports.departureId,
        pilgrimId:    incidentReports.pilgrimId,
        type:         incidentReports.type,
        title:        incidentReports.title,
        description:  incidentReports.description,
        status:       incidentReports.status,
        severity:     incidentReports.severity,
        location:     incidentReports.location,
        handledBy:    incidentReports.handledBy,
        resolution:   incidentReports.resolution,
        reportedBy:   incidentReports.reportedBy,
        createdAt:    incidentReports.createdAt,
        updatedAt:    incidentReports.updatedAt,
        resolvedAt:   incidentReports.resolvedAt,
        pilgrimName:  bookingPilgrims.name,
        departureDate: packageDepartures.departureDate,
        packageTitle:  packages.title,
      })
      .from(incidentReports)
      .leftJoin(bookingPilgrims,    eq(incidentReports.pilgrimId,   bookingPilgrims.id))
      .leftJoin(packageDepartures,  eq(incidentReports.departureId, packageDepartures.id))
      .leftJoin(packages,           eq(packageDepartures.packageId, packages.id))
      .where(
        and(
          departureId ? eq(incidentReports.departureId, departureId) : undefined,
          status      ? eq(incidentReports.status,      status)      : undefined,
          type        ? eq(incidentReports.type,        type)        : undefined,
          severity    ? eq(incidentReports.severity,    severity)    : undefined,
          search
            ? or(
                ilike(incidentReports.title,       `%${search}%`),
                ilike(incidentReports.description, `%${search}%`),
              )
            : undefined,
        ),
      )
      .orderBy(desc(incidentReports.createdAt));

    res.json(rows);
  } catch (e) {
    console.error("[incident-reports GET /]", e);
    res.status(500).json({ error: "Failed to fetch incident reports" });
  }
});

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post("/", async (req: any, res) => {
  try {
    const {
      departureId, pilgrimId, type, title, description,
      severity = "medium", location, handledBy,
    } = req.body as Record<string, string | undefined>;

    if (!type || !title || !description) {
      res.status(400).json({ error: "type, title, dan description wajib diisi" });
      return;
    }

    const [row] = await db
      .insert(incidentReports)
      .values({
        id:          crypto.randomUUID(),
        departureId: departureId ?? null,
        pilgrimId:   pilgrimId   ?? null,
        type,
        title,
        description,
        severity,
        status:      "open",
        location:    location   ?? null,
        handledBy:   handledBy  ?? null,
        reportedBy:  req.user?.id ?? null,
        createdAt:   new Date(),
        updatedAt:   new Date(),
      })
      .returning();

    res.status(201).json(row);
  } catch (e) {
    console.error("[incident-reports POST /]", e);
    res.status(500).json({ error: "Failed to create incident report" });
  }
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.patch("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    const {
      status, severity, type, title, description,
      location, handledBy, resolution, pilgrimId, departureId,
    } = req.body as Record<string, string | undefined>;

    const resolvedAt =
      status === "resolved" || status === "closed" ? new Date() : undefined;

    const [row] = await db
      .update(incidentReports)
      .set({
        ...(status      !== undefined && { status }),
        ...(severity    !== undefined && { severity }),
        ...(type        !== undefined && { type }),
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(location    !== undefined && { location }),
        ...(handledBy   !== undefined && { handledBy }),
        ...(resolution  !== undefined && { resolution }),
        ...(pilgrimId   !== undefined && { pilgrimId }),
        ...(departureId !== undefined && { departureId }),
        ...(resolvedAt  !== undefined && { resolvedAt }),
        updatedAt: new Date(),
      })
      .where(eq(incidentReports.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Incident report not found" });
      return;
    }
    res.json(row);
  } catch (e) {
    console.error("[incident-reports PATCH /:id]", e);
    res.status(500).json({ error: "Failed to update incident report" });
  }
});

// ── DELETE ───────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await db
      .delete(incidentReports)
      .where(eq(incidentReports.id, req.params.id))
      .returning({ id: incidentReports.id });

    if (!deleted.length) {
      res.status(404).json({ error: "Incident report not found" });
      return;
    }
    res.json({ deleted: true });
  } catch (e) {
    console.error("[incident-reports DELETE /:id]", e);
    res.status(500).json({ error: "Failed to delete incident report" });
  }
});

export default router;
