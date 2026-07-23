/**
 * O-9: Visa Tracking
 *
 * GET    /api/admin/visa                        — list semua (filter: departureId, status)
 * POST   /api/admin/visa                        — create record (per pilgrim)
 * PATCH  /api/admin/visa/:id                    — update status
 * DELETE /api/admin/visa/:id                    — hapus
 * GET    /api/admin/visa/stats/:departureId     — statistik per departure
 * POST   /api/admin/visa/bulk-update            — bulk update status
 */

import { Router } from "express";
import {
  db, visaApplications, bookingPilgrims, bookings, packageDepartures,
  eq, and, inArray, sql, desc, asc,
} from "@workspace/db";
import { sendAdminError } from "../../lib/adminApiError";

const router = Router();

// ── GET / — list visa applications ──────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const { departureId, status } = req.query as { departureId?: string; status?: string };

    // Join to get pilgrim name, booking code, departure info
    let query = db
      .select({
        id: visaApplications.id,
        bookingId: visaApplications.bookingId,
        pilgrimId: visaApplications.pilgrimId,
        status: visaApplications.status,
        submittedAt: visaApplications.submittedAt,
        approvedAt: visaApplications.approvedAt,
        expiryDate: visaApplications.expiryDate,
        rejectionReason: visaApplications.rejectionReason,
        visaNumber: visaApplications.visaNumber,
        notes: visaApplications.notes,
        updatedBy: visaApplications.updatedBy,
        createdAt: visaApplications.createdAt,
        updatedAt: visaApplications.updatedAt,
        pilgrimName: bookingPilgrims.name,
        pilgrimPassportNumber: bookingPilgrims.passportNumber,
        pilgrimPassportExpiry: bookingPilgrims.passportExpiry,
        pilgrimGender: bookingPilgrims.gender,
        bookingCode: bookings.bookingCode,
        departureId: bookings.departureId,
      })
      .from(visaApplications)
      .leftJoin(bookingPilgrims, eq(visaApplications.pilgrimId, bookingPilgrims.id))
      .leftJoin(bookings, eq(visaApplications.bookingId, bookings.id));

    const conditions: Parameters<typeof and>[0][] = [];
    if (departureId) conditions.push(eq(bookings.departureId, departureId));
    if (status && status !== "all") conditions.push(eq(visaApplications.status, status));
    if (conditions.length) query = query.where(and(...conditions)) as typeof query;

    const rows = await query.orderBy(desc(visaApplications.createdAt));
    res.json({ data: rows });
  } catch (err) {
    sendAdminError(res, "GET /api/admin/visa", err);
  }
});

// ── POST / — create visa application ────────────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const adminId = (req as any).user?.id as string | undefined;
    const { bookingId, pilgrimId, status, notes, visaNumber, expiryDate, submittedAt } = req.body;

    if (!bookingId || !pilgrimId) {
      return res.status(400).json({ error: "bookingId and pilgrimId required" });
    }

    const [created] = await db
      .insert(visaApplications)
      .values({
        id: crypto.randomUUID(),
        bookingId,
        pilgrimId,
        status: status ?? "draft",
        notes: notes ?? null,
        visaNumber: visaNumber ?? null,
        expiryDate: expiryDate ?? null,
        submittedAt: submittedAt ? new Date(submittedAt) : null,
        updatedBy: adminId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Visa application sudah ada untuk jemaah ini" });
    sendAdminError(res, "POST /api/admin/visa", err);
  }
});

// ── PATCH /:id — update visa status ─────────────────────────────────────────

router.patch("/:id", async (req, res) => {
  try {
    const adminId = (req as any).user?.id as string | undefined;
    const {
      status, notes, visaNumber, expiryDate,
      rejectionReason, submittedAt, approvedAt,
    } = req.body;

    const patch: Record<string, unknown> = { updatedAt: new Date(), updatedBy: adminId ?? null };
    if (status !== undefined) patch.status = status;
    if (notes !== undefined) patch.notes = notes;
    if (visaNumber !== undefined) patch.visaNumber = visaNumber;
    if (expiryDate !== undefined) patch.expiryDate = expiryDate;
    if (rejectionReason !== undefined) patch.rejectionReason = rejectionReason;
    if (submittedAt !== undefined) patch.submittedAt = submittedAt ? new Date(submittedAt) : null;
    if (approvedAt !== undefined) patch.approvedAt = approvedAt ? new Date(approvedAt) : null;

    // Auto-set timestamps based on status transitions
    if (status === "submitted" && !submittedAt) patch.submittedAt = new Date();
    if (status === "approved" && !approvedAt) patch.approvedAt = new Date();

    const [updated] = await db
      .update(visaApplications)
      .set(patch)
      .where(eq(visaApplications.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Visa application not found" });
    res.json(updated);
  } catch (err) {
    sendAdminError(res, "PATCH /api/admin/visa/:id", err);
  }
});

// ── DELETE /:id ──────────────────────────────────────────────────────────────

router.delete("/:id", async (req, res) => {
  try {
    const [deleted] = await db
      .delete(visaApplications)
      .where(eq(visaApplications.id, req.params.id))
      .returning({ id: visaApplications.id });

    if (!deleted) return res.status(404).json({ error: "Visa application not found" });
    res.json({ ok: true });
  } catch (err) {
    sendAdminError(res, "DELETE /api/admin/visa/:id", err);
  }
});

// ── GET /stats/:departureId — statistik visa per departure ──────────────────

router.get("/stats/:departureId", async (req, res) => {
  try {
    const { departureId } = req.params;

    const rows = await db
      .select({
        status: visaApplications.status,
        cnt: sql<number>`count(*)::int`,
      })
      .from(visaApplications)
      .leftJoin(bookings, eq(visaApplications.bookingId, bookings.id))
      .where(eq(bookings.departureId, departureId))
      .groupBy(visaApplications.status);

    const stats = rows.reduce((acc, r) => {
      acc[r.status] = r.cnt;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(stats).reduce((s, c) => s + c, 0);
    res.json({ stats, total });
  } catch (err) {
    sendAdminError(res, "GET /api/admin/visa/stats/:departureId", err);
  }
});

// ── POST /bulk — create visa applications untuk semua jemaah di departure ────

router.post("/bulk", async (req, res) => {
  try {
    const adminId = (req as any).user?.id as string | undefined;
    const { departureId, status } = req.body as { departureId: string; status?: string };

    if (!departureId) return res.status(400).json({ error: "departureId required" });

    // Get all booking_pilgrims for this departure
    const pilgrims = await db
      .select({
        pilgrimId: bookingPilgrims.id,
        bookingId: bookingPilgrims.bookingId,
      })
      .from(bookingPilgrims)
      .leftJoin(bookings, eq(bookingPilgrims.bookingId, bookings.id))
      .where(eq(bookings.departureId, departureId));

    if (pilgrims.length === 0) {
      return res.status(404).json({ error: "Tidak ada jemaah di keberangkatan ini" });
    }

    let inserted = 0;
    let skipped = 0;

    for (const p of pilgrims) {
      try {
        await db.insert(visaApplications).values({
          id: crypto.randomUUID(),
          bookingId: p.bookingId,
          pilgrimId: p.pilgrimId,
          status: status ?? "draft",
          updatedBy: adminId ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        inserted++;
      } catch (e: any) {
        if (e?.code === "23505") { skipped++; continue; }
        throw e;
      }
    }

    res.status(201).json({ ok: true, inserted, skipped, total: pilgrims.length });
  } catch (err) {
    sendAdminError(res, "POST /api/admin/visa/bulk", err);
  }
});

// ── POST /bulk-update — bulk update status ───────────────────────────────────

router.post("/bulk-update", async (req, res) => {
  try {
    const adminId = (req as any).user?.id as string | undefined;
    const { ids, status, notes } = req.body as { ids: string[]; status: string; notes?: string };

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array required" });
    }
    if (!status) return res.status(400).json({ error: "status required" });

    const patch: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
      updatedBy: adminId ?? null,
    };
    if (notes !== undefined) patch.notes = notes;
    if (status === "submitted") patch.submittedAt = new Date();
    if (status === "approved") patch.approvedAt = new Date();

    await db.update(visaApplications).set(patch).where(inArray(visaApplications.id, ids));

    res.json({ ok: true, updated: ids.length });
  } catch (err) {
    sendAdminError(res, "POST /api/admin/visa/bulk-update", err);
  }
});

export default router;
