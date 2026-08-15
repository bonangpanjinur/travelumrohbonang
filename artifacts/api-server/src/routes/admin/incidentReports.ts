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
  sql,
} from "@workspace/db";
import { sendAdminError } from "../../lib/adminApiError";
import { resolveUserScope } from "../../lib/scopeGuard";

const router = Router();

async function incidentScopeCondition(req: any) {
  const scope = await resolveUserScope(req);
  if (scope.type === "global") return sql`TRUE`;
  if (scope.type === "branch" && scope.branchId) {
    return sql`EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.departure_id = incident_reports.departure_id
        AND b.branch_id = ${scope.branchId}
    ) OR incident_reports.reported_by = ${req.user?.id ?? ""}`;
  }
  if (scope.type === "agent" && scope.agentId) {
    return sql`EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.departure_id = incident_reports.departure_id
        AND (b.agent_id = ${scope.agentId}
          OR (b.pic_type = 'agen' AND b.pic_id = ${scope.agentId}))
    ) OR incident_reports.reported_by = ${req.user?.id ?? ""}`;
  }
  return sql`incident_reports.reported_by = ${req.user?.id ?? "__no_user__"}`;
}

async function assertIncidentScope(req: any, incidentId: string, departureId?: string | null) {
  const scope = await resolveUserScope(req);
  if (scope.type === "global") return true;
  const targetDeparture = departureId ?? (await db.select({ departureId: incidentReports.departureId })
    .from(incidentReports).where(eq(incidentReports.id, incidentId)).limit(1))[0]?.departureId;
  if (!targetDeparture) return req.user?.id != null && !!(await db.select({ id: incidentReports.id })
    .from(incidentReports).where(and(eq(incidentReports.id, incidentId), eq(incidentReports.reportedBy, req.user.id))).limit(1))[0];
  const rows = await db.execute(sql`
    SELECT 1 FROM bookings b
    WHERE b.departure_id = ${targetDeparture}
      AND (${scope.type === "branch" ? sql`b.branch_id = ${scope.branchId ?? ""}` : sql`b.agent_id = ${scope.agentId ?? ""} OR (b.pic_type = 'agen' AND b.pic_id = ${scope.agentId ?? ""})`})
    LIMIT 1
  `);
  return ((rows as any).rows ?? rows).length > 0;
}

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
          await incidentScopeCondition(req),
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
    sendAdminError(res, "GET /api/admin/incident-reports", e);
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
    if (!(await assertIncidentScope(req, "", departureId))) {
      res.status(403).json({ error: "Anda tidak memiliki akses ke keberangkatan ini" });
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
    sendAdminError(res, "POST /api/admin/incident-reports", e);
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
    if (!(await assertIncidentScope(req, id, departureId))) {
      res.status(403).json({ error: "Anda tidak memiliki akses ke laporan insiden ini" });
      return;
    }

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
    sendAdminError(res, "PATCH /api/admin/incident-reports/:id", e);
  }
});

// ── DELETE ───────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    if (!(await assertIncidentScope(req, req.params.id))) {
      res.status(403).json({ error: "Anda tidak memiliki akses ke laporan insiden ini" });
      return;
    }
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
    sendAdminError(res, "DELETE /api/admin/incident-reports/:id", e);
  }
});

export default router;
