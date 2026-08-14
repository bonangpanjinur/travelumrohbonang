import { Router } from "express";
import {
  db,
  certificateTemplates,
  certificates,
  bookings,
  bookingPilgrims,
  packages,
  packageDepartures,
  eq,
  and,
  desc,
} from "@workspace/db";
import { requireOperational } from "../../middlewares/requireAdmin";
import { resolveUserScope } from "../../lib/scopeGuard";
import { buildBookingScopeCondition, isBookingInScope, scopeDeniedMessage } from "../../lib/scopeConditions";

const router = Router();

const DEFAULT_DESIGN = {
  page: { width: 1123, height: 794, background: "#fffdf7" },
  accent: "#b88a2a",
  title: "SERTIFIKAT {TYPE}",
  subtitle: "Diberikan kepada",
  body: "Dengan ini menerangkan bahwa",
  recipientSize: 38,
  recipientColor: "#123f35",
  footer: "Semoga menjadi amal ibadah yang diterima Allah SWT.",
  showLogo: true,
  showAddress: true,
};

router.get("/selector/bookings", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const rows = await db.select({
      id: bookings.id,
      bookingCode: bookings.bookingCode,
      status: bookings.status,
      packageTitle: packages.title,
      departureDate: packageDepartures.departureDate,
    }).from(bookings)
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(packageDepartures, eq(bookings.departureId, packageDepartures.id))
      .where(buildBookingScopeCondition(scope, "bookings"))
      .orderBy(desc(bookings.createdAt));
    const filtered = search ? rows.filter((row: typeof rows[number]) => `${row.bookingCode} ${row.packageTitle || ""}`.toLowerCase().includes(search.toLowerCase())) : rows;
    res.json({ data: filtered.slice(0, 100) });
  } catch (error) {
    console.error("[certificates] GET /selector/bookings", error);
    res.status(500).json({ error: "Gagal memuat daftar booking" });
  }
});

router.get("/selector/bookings/:bookingId/pilgrims", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, req.params.bookingId)).limit(1);
    if (!booking || !isBookingInScope(booking, scope)) return res.status(403).json({ error: scopeDeniedMessage(scope) });
    const rows = await db.select({ id: bookingPilgrims.id, name: bookingPilgrims.name, gender: bookingPilgrims.gender, passportNumber: bookingPilgrims.passportNumber })
      .from(bookingPilgrims).where(eq(bookingPilgrims.bookingId, booking.id)).orderBy(bookingPilgrims.name);
    res.json({ data: rows });
  } catch (error) {
    console.error("[certificates] GET /selector/bookings/:bookingId/pilgrims", error);
    res.status(500).json({ error: "Gagal memuat daftar jemaah" });
  }
});

router.get("/templates", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const rows = await db
      .select()
      .from(certificateTemplates)
      .where(type ? eq(certificateTemplates.certificateType, type) : undefined)
      .orderBy(desc(certificateTemplates.createdAt));
    const visible = rows.filter((row: typeof rows[number]) => scope.type === "global" || row.branchId === null || row.branchId === scope.branchId);
    res.json({ data: visible });
  } catch (error) {
    console.error("[certificates] GET /templates", error);
    res.status(500).json({ error: "Gagal memuat template sertifikat" });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const { name, certificateType = "umroh", design = {}, branchId } = req.body ?? {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Nama template wajib diisi" });
    const targetBranchId = scope.type === "branch" ? scope.branchId : branchId || null;
    if (scope.type === "branch" && !targetBranchId) return res.status(403).json({ error: "Akun belum terhubung ke cabang" });

    const [created] = await db.insert(certificateTemplates).values({
      id: crypto.randomUUID(),
      branchId: targetBranchId,
      name: String(name).trim(),
      certificateType: certificateType === "badal_umroh" ? "badal_umroh" : "umroh",
      design: { ...DEFAULT_DESIGN, ...design },
      createdBy: (req.user as any).id,
      updatedAt: new Date(),
    }).returning();
    res.status(201).json({ data: created });
  } catch (error) {
    console.error("[certificates] POST /templates", error);
    res.status(500).json({ error: "Gagal menyimpan template sertifikat" });
  }
});

router.patch("/templates/:id", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const [existing] = await db.select().from(certificateTemplates).where(eq(certificateTemplates.id, req.params.id)).limit(1);
    if (!existing || (scope.type !== "global" && existing.branchId !== null && existing.branchId !== scope.branchId)) {
      return res.status(404).json({ error: "Template tidak ditemukan" });
    }
    const [updated] = await db.update(certificateTemplates).set({
      ...(req.body.name ? { name: String(req.body.name).trim() } : {}),
      ...(req.body.design ? { design: req.body.design } : {}),
      ...(req.body.certificateType ? { certificateType: req.body.certificateType === "badal_umroh" ? "badal_umroh" : "umroh" } : {}),
      updatedAt: new Date(),
    }).where(eq(certificateTemplates.id, existing.id)).returning();
    res.json({ data: updated });
  } catch (error) {
    console.error("[certificates] PATCH /templates/:id", error);
    res.status(500).json({ error: "Gagal memperbarui template sertifikat" });
  }
});

router.get("/booking/:bookingId", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, req.params.bookingId)).limit(1);
    if (!booking || !isBookingInScope(booking, scope)) return res.status(403).json({ error: scopeDeniedMessage(scope) });
    const rows = await db.select().from(certificates).where(eq(certificates.bookingId, booking.id)).orderBy(desc(certificates.createdAt));
    res.json({ data: rows });
  } catch (error) {
    console.error("[certificates] GET /booking/:bookingId", error);
    res.status(500).json({ error: "Gagal memuat sertifikat booking" });
  }
});

router.post("/booking/:bookingId/pilgrim/:pilgrimId/issue", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, req.params.bookingId)).limit(1);
    if (!booking || !isBookingInScope(booking, scope)) return res.status(403).json({ error: scopeDeniedMessage(scope) });
    const [pilgrim] = await db.select().from(bookingPilgrims).where(and(eq(bookingPilgrims.id, req.params.pilgrimId), eq(bookingPilgrims.bookingId, booking.id))).limit(1);
    if (!pilgrim) return res.status(404).json({ error: "Jemaah tidak ditemukan" });

    const certificateType = req.body?.certificateType === "badal_umroh" ? "badal_umroh" : "umroh";
    const certificateNumber = `${certificateType === "badal_umroh" ? "BADAL" : "UMR"}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const [created] = await db.insert(certificates).values({
      id: crypto.randomUUID(),
      branchId: booking.branchId,
      templateId: req.body?.templateId || null,
      bookingId: booking.id,
      pilgrimId: pilgrim.id,
      certificateType,
      certificateNumber,
      recipientName: pilgrim.name,
      performerName: certificateType === "badal_umroh" ? String(req.body?.performerName || "") || null : null,
      issuedAt: req.body?.issuedAt ? new Date(req.body.issuedAt) : new Date(),
      payload: { bookingCode: booking.bookingCode, packageTitle: req.body?.packageTitle || null },
      createdBy: (req.user as any).id,
    }).returning();
    res.status(201).json({ data: created });
  } catch (error) {
    console.error("[certificates] POST /issue", error);
    res.status(500).json({ error: "Gagal menerbitkan sertifikat" });
  }
});

export { DEFAULT_DESIGN };
export default router;
