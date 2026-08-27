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
  layout: "elegant",
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
  backgroundColor: "#fffdf7",
  borderWidth: 12,
  borderRadius: 12,
  watermarkText: "",
  showCertificateNumber: true,
  showIssueDate: true,
  signatureName: "Direktur Utama",
  signatureTitle: "Pimpinan Travel",
  sealText: "RESMI",
};

function sanitizeDesign(input: unknown) {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const safeText = (key: string, fallback: string, max = 300) => typeof source[key] === "string" ? String(source[key]).slice(0, max) : fallback;
  const safeColor = (key: string, fallback: string) => typeof source[key] === "string" && /^#[0-9a-fA-F]{6}$/.test(String(source[key])) ? String(source[key]) : fallback;
  const safeNumber = (key: string, fallback: number, min: number, max: number) => typeof source[key] === "number" && Number.isFinite(source[key]) ? Math.min(max, Math.max(min, Number(source[key]))) : fallback;
  const safeUrl = (key: string, fallback: string) => {
    const value = typeof source[key] === "string" ? String(source[key]).trim() : fallback;
    return value === "" || /^https:\/\//i.test(value) || /^data:image\/(png|jpeg|webp);base64,/i.test(value) ? value.slice(0, 2_000_000) : fallback;
  };
  return {
    ...DEFAULT_DESIGN,
    layout: ["elegant", "classic", "modern", "premium"].includes(String(source.layout)) ? String(source.layout) : DEFAULT_DESIGN.layout,
    accent: safeColor("accent", DEFAULT_DESIGN.accent),
    recipientColor: safeColor("recipientColor", DEFAULT_DESIGN.recipientColor),
    backgroundColor: safeColor("backgroundColor", DEFAULT_DESIGN.backgroundColor),
    title: safeText("title", DEFAULT_DESIGN.title),
    subtitle: safeText("subtitle", DEFAULT_DESIGN.subtitle),
    body: safeText("body", DEFAULT_DESIGN.body),
    footer: safeText("footer", DEFAULT_DESIGN.footer, 500),
    recipientSize: safeNumber("recipientSize", DEFAULT_DESIGN.recipientSize, 24, 72),
    borderWidth: safeNumber("borderWidth", DEFAULT_DESIGN.borderWidth, 0, 30),
    borderRadius: safeNumber("borderRadius", DEFAULT_DESIGN.borderRadius, 0, 40),
    watermarkText: safeText("watermarkText", DEFAULT_DESIGN.watermarkText, 80),
    showLogo: source.showLogo !== false,
    showAddress: source.showAddress !== false,
    showAdditionalLogo: source.showAdditionalLogo === true,
    additionalLogoUrl: safeUrl("additionalLogoUrl", ""),
    showCertificateNumber: source.showCertificateNumber !== false,
    showIssueDate: source.showIssueDate !== false,
    signatureName: safeText("signatureName", DEFAULT_DESIGN.signatureName, 120),
    signatureTitle: safeText("signatureTitle", DEFAULT_DESIGN.signatureTitle, 120),
    sealText: safeText("sealText", DEFAULT_DESIGN.sealText, 40),
  };
}

router.get("/selector/packages", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const rows = await db.select({ id: packages.id, title: packages.title })
      .from(bookings)
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .where(buildBookingScopeCondition(scope, "bookings"))
      .orderBy(packages.title);
    const unique = Array.from(new Map(rows.filter((row: typeof rows[number]) => row.id && row.title).map((row: typeof rows[number]) => [row.id, row])).values());
    res.json({ data: unique });
  } catch (error) {
    console.error("[certificates] GET /selector/packages", error);
    res.status(500).json({ error: "Gagal memuat daftar paket" });
  }
});

router.get("/selector/departures", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const packageId = typeof req.query.packageId === "string" ? req.query.packageId : "";
    const month = typeof req.query.month === "string" ? req.query.month : "";
    const rows = await db.select({ id: packageDepartures.id, departureDate: packageDepartures.departureDate, packageId: packageDepartures.packageId, packageTitle: packages.title })
      .from(bookings)
      .innerJoin(packageDepartures, eq(bookings.departureId, packageDepartures.id))
      .leftJoin(packages, eq(packageDepartures.packageId, packages.id))
      .where(buildBookingScopeCondition(scope, "bookings"))
      .orderBy(packageDepartures.departureDate);
    const filtered = rows.filter((row: typeof rows[number]) => (!packageId || row.packageId === packageId) && (!month || String(row.departureDate).slice(0, 7) === month));
    const unique = Array.from(new Map(filtered.map((row: typeof rows[number]) => [row.id, row])).values());
    res.json({ data: unique });
  } catch (error) {
    console.error("[certificates] GET /selector/departures", error);
    res.status(500).json({ error: "Gagal memuat tanggal keberangkatan" });
  }
});

router.get("/selector/bookings", async (req, res) => {
  try {
    const scope = await resolveUserScope(req);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const packageId = typeof req.query.packageId === "string" ? req.query.packageId : "";
    const departureId = typeof req.query.departureId === "string" ? req.query.departureId : "";
    const rows = await db.select({
      id: bookings.id,
      departureId: bookings.departureId,
      packageId: bookings.packageId,
      bookingCode: bookings.bookingCode,
      status: bookings.status,
      packageTitle: packages.title,
      departureDate: packageDepartures.departureDate,
    }).from(bookings)
      .leftJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(packageDepartures, eq(bookings.departureId, packageDepartures.id))
      .where(buildBookingScopeCondition(scope, "bookings"))
      .orderBy(desc(bookings.createdAt));
    const filtered = rows.filter((row: typeof rows[number]) => (!packageId || row.packageId === packageId) && (!departureId || row.departureId === departureId) && (!search || `${row.bookingCode} ${row.packageTitle || ""}`.toLowerCase().includes(search.toLowerCase())));
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
  } catch (error: any) {
    console.error("[certificates] GET /templates", error);
    if (error?.code === "42P01") return res.status(500).json({ error: "Tabel sertifikat belum tersedia. Silakan jalankan migration database." });
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
      design: sanitizeDesign(design),
      createdBy: (req.user as any).id,
      updatedAt: new Date(),
    }).returning();
    res.status(201).json({ data: created });
  } catch (error: any) {
    console.error("[certificates] POST /templates", error);
    if (error?.code === "42P01") return res.status(500).json({ error: "Tabel sertifikat belum tersedia. Silakan jalankan migration database." });
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
      ...(req.body.design ? { design: sanitizeDesign(req.body.design) } : {}),
      ...(req.body.certificateType ? { certificateType: req.body.certificateType === "badal_umroh" ? "badal_umroh" : "umroh" } : {}),
      updatedAt: new Date(),
    }).where(eq(certificateTemplates.id, existing.id)).returning();
    res.json({ data: updated });
  } catch (error: any) {
    console.error("[certificates] PATCH /templates/:id", error);
    if (error?.code === "42P01") return res.status(500).json({ error: "Tabel sertifikat belum tersedia. Silakan jalankan migration database." });
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
  } catch (error: any) {
    console.error("[certificates] GET /booking/:bookingId", error);
    if (error?.code === "42P01") return res.status(500).json({ error: "Tabel sertifikat belum tersedia. Silakan jalankan migration database." });
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
    let templateId: string | null = null;
    if (req.body?.templateId) {
      const [template] = await db.select().from(certificateTemplates).where(eq(certificateTemplates.id, String(req.body.templateId))).limit(1);
      if (!template || (scope.type !== "global" && template.branchId !== null && template.branchId !== scope.branchId)) {
        return res.status(403).json({ error: scopeDeniedMessage(scope) });
      }
      templateId = template.id;
    }
    const certificateNumber = `${certificateType === "badal_umroh" ? "BADAL" : "UMR"}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const [created] = await db.insert(certificates).values({
      id: crypto.randomUUID(),
      branchId: booking.branchId,
      templateId,
      bookingId: booking.id,
      pilgrimId: pilgrim.id,
      certificateType,
      certificateNumber,
      recipientName: pilgrim.name,
      performerName: certificateType === "badal_umroh" ? String(req.body?.performerName || "") || null : null,
      issuedAt: req.body?.issuedAt ? new Date(req.body.issuedAt) : new Date(),
      payload: { bookingCode: booking.bookingCode, packageTitle: typeof req.body?.packageTitle === "string" ? req.body.packageTitle.slice(0, 200) : null, design: sanitizeDesign(req.body?.design) },
      createdBy: (req.user as any).id,
    }).returning();
    res.status(201).json({ data: created });
  } catch (error: any) {
    console.error("[certificates] POST /issue", error);
    if (error?.code === "42P01") return res.status(500).json({ error: "Tabel sertifikat belum tersedia. Silakan jalankan migration database." });
    res.status(500).json({ error: "Gagal menerbitkan sertifikat" });
  }
});

export { DEFAULT_DESIGN };
export default router;
