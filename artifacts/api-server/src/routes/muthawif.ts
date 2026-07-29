/**
 * Sprint 4A — Dedicated Muthawif Portal Routes
 *
 * All endpoints are scoped to the authenticated user's own muthawif record.
 * IDOR is prevented by always filtering by muthawifs.userId = req.user.id.
 *
 * GET  /api/muthawif/profile            — current muthawif profile + assigned departures
 * GET  /api/muthawif/jamaah             — pilgrims in muthawif's assigned departures
 * GET  /api/muthawif/laporan-harian     — list daily reports (most recent first)
 * POST /api/muthawif/laporan-harian     — submit a new daily report
 * GET  /api/muthawif/laporan-harian/:id — single report detail
 */

import { Router } from "express";
import {
  db,
  muthawifs,
  muthawifDailyReports,
  packageDepartures,
  packages,
  bookings,
  profiles,
  eq,
  desc,
  and,
  inArray,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// ── GET /api/muthawif/profile ────────────────────────────────────────────────
router.get("/profile", async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [muthawif] = await db
      .select({
        id: muthawifs.id,
        name: muthawifs.name,
        phone: muthawifs.phone,
        photoUrl: muthawifs.photoUrl,
        userId: muthawifs.userId,
        createdAt: muthawifs.createdAt,
      })
      .from(muthawifs)
      .where(eq(muthawifs.userId, userId))
      .limit(1);

    if (!muthawif) {
      return res.status(404).json({ error: "Muthawif record not found for this user" });
    }

    // Departures assigned to this muthawif
    const assignedDepartures = await db
      .select({
        id: packageDepartures.id,
        departureDate: packageDepartures.departureDate,
        returnDate: packageDepartures.returnDate,
        status: packageDepartures.status,
        quota: packageDepartures.quota,
        remainingQuota: packageDepartures.remainingQuota,
        packageId: packageDepartures.packageId,
        packageTitle: packages.title,
        packageSlug: packages.slug,
      })
      .from(packageDepartures)
      .leftJoin(packages, eq(packages.id, packageDepartures.packageId))
      .where(eq(packageDepartures.muthawifId, muthawif.id))
      .orderBy(desc(packageDepartures.departureDate));

    // Stats
    const departureIds = assignedDepartures.map((d) => d.id);
    let jamaahCount = 0;
    if (departureIds.length > 0) {
      const bookingRows = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            inArray(bookings.departureId, departureIds),
            eq(bookings.status, "paid"),
          ),
        );
      jamaahCount = bookingRows.length;
    }

    return res.json({
      ...muthawif,
      assignedDepartures,
      stats: {
        totalDepartures: assignedDepartures.length,
        jamaahCount,
      },
    });
  } catch (err) {
    console.error("[muthawif/profile]", err);
    return res.status(500).json({ error: "Failed to fetch muthawif profile" });
  }
});

// ── GET /api/muthawif/jamaah ─────────────────────────────────────────────────
router.get("/jamaah", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { departureId } = req.query as { departureId?: string };

    const [muthawif] = await db
      .select({ id: muthawifs.id })
      .from(muthawifs)
      .where(eq(muthawifs.userId, userId))
      .limit(1);

    if (!muthawif) {
      return res.status(404).json({ error: "Not a muthawif" });
    }

    // Get departures for this muthawif
    let departureFilter = eq(packageDepartures.muthawifId, muthawif.id);
    const assignedDepartures = await db
      .select({ id: packageDepartures.id })
      .from(packageDepartures)
      .where(departureFilter);

    const allDepartureIds = assignedDepartures.map((d) => d.id);

    if (allDepartureIds.length === 0) {
      return res.json([]);
    }

    // Filter by specific departure if requested
    const targetIds = departureId
      ? allDepartureIds.filter((id) => id === departureId)
      : allDepartureIds;

    if (targetIds.length === 0) {
      return res.json([]);
    }

    // Get confirmed bookings + pilgrim data
    const bookingRows = await db
      .select({
        bookingId: bookings.id,
        bookingCode: bookings.bookingCode,
        bookingStatus: bookings.status,
        departureId: bookings.departureId,
        createdAt: bookings.createdAt,
        profileId: bookings.userId,
        profileName: profiles.name,
        profilePhone: profiles.phone,
        profileEmail: profiles.email,
      })
      .from(bookings)
      .leftJoin(profiles, eq(profiles.id, bookings.userId))
      .where(
        and(
          inArray(bookings.departureId, targetIds),
          inArray(bookings.status, ["paid", "confirmed"]),
        ),
      )
      .orderBy(bookings.createdAt);

    return res.json(bookingRows);
  } catch (err) {
    console.error("[muthawif/jamaah]", err);
    return res.status(500).json({ error: "Failed to fetch jamaah list" });
  }
});

// ── GET /api/muthawif/laporan-harian ────────────────────────────────────────
router.get("/laporan-harian", async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [muthawif] = await db
      .select({ id: muthawifs.id })
      .from(muthawifs)
      .where(eq(muthawifs.userId, userId))
      .limit(1);

    if (!muthawif) {
      return res.status(404).json({ error: "Not a muthawif" });
    }

    const reports = await db
      .select({
        id: muthawifDailyReports.id,
        departureId: muthawifDailyReports.departureId,
        reportDate: muthawifDailyReports.reportDate,
        location: muthawifDailyReports.location,
        groupCondition: muthawifDailyReports.groupCondition,
        content: muthawifDailyReports.content,
        notes: muthawifDailyReports.notes,
        status: muthawifDailyReports.status,
        createdAt: muthawifDailyReports.createdAt,
        updatedAt: muthawifDailyReports.updatedAt,
      })
      .from(muthawifDailyReports)
      .where(eq(muthawifDailyReports.muthawifId, muthawif.id))
      .orderBy(desc(muthawifDailyReports.reportDate));

    return res.json(reports);
  } catch (err) {
    console.error("[muthawif/laporan-harian GET]", err);
    return res.status(500).json({ error: "Failed to fetch daily reports" });
  }
});

// ── GET /api/muthawif/laporan-harian/:id ────────────────────────────────────
router.get("/laporan-harian/:id", async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [muthawif] = await db
      .select({ id: muthawifs.id })
      .from(muthawifs)
      .where(eq(muthawifs.userId, userId))
      .limit(1);

    if (!muthawif) return res.status(404).json({ error: "Not a muthawif" });

    const [report] = await db
      .select()
      .from(muthawifDailyReports)
      .where(
        and(
          eq(muthawifDailyReports.id, req.params.id),
          eq(muthawifDailyReports.muthawifId, muthawif.id),
        ),
      )
      .limit(1);

    if (!report) return res.status(404).json({ error: "Report not found" });
    return res.json(report);
  } catch (err) {
    console.error("[muthawif/laporan-harian/:id]", err);
    return res.status(500).json({ error: "Failed to fetch report" });
  }
});

// ── POST /api/muthawif/laporan-harian ───────────────────────────────────────
router.post("/laporan-harian", async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [muthawif] = await db
      .select({ id: muthawifs.id })
      .from(muthawifs)
      .where(eq(muthawifs.userId, userId))
      .limit(1);

    if (!muthawif) return res.status(404).json({ error: "Not a muthawif" });

    const { departureId, reportDate, location, groupCondition, content, notes } = req.body as {
      departureId?: string;
      reportDate?: string;
      location?: string;
      groupCondition?: string;
      content?: string;
      notes?: string;
    };

    if (!departureId || !reportDate) {
      return res.status(400).json({ error: "departureId and reportDate are required" });
    }

    // Verify the departure is actually assigned to this muthawif
    const [departure] = await db
      .select({ id: packageDepartures.id })
      .from(packageDepartures)
      .where(
        and(
          eq(packageDepartures.id, departureId),
          eq(packageDepartures.muthawifId, muthawif.id),
        ),
      )
      .limit(1);

    if (!departure) {
      return res.status(403).json({ error: "Departure not assigned to this muthawif" });
    }

    const now = new Date();
    const [report] = await db
      .insert(muthawifDailyReports)
      .values({
        id: crypto.randomUUID(),
        muthawifId: muthawif.id,
        departureId,
        reportDate,
        location: location ?? null,
        groupCondition: groupCondition ?? null,
        content: content ?? null,
        notes: notes ?? null,
        status: "submitted",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return res.status(201).json(report);
  } catch (err) {
    console.error("[muthawif/laporan-harian POST]", err);
    return res.status(500).json({ error: "Failed to submit daily report" });
  }
});

export default router;
