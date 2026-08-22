import { Router } from "express";
import rateLimit from "express-rate-limit";
import { db, tenantSites, tenantSitePackages, templateUpgradeOrders, eq, desc, sql, and, inArray } from "@workspace/db";
import { logSecurityAudit } from "../../lib/securityAudit";

const router = Router();
const upgradeWriteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });
const FINANCE_APPROVER_ROLES = new Set(["super_admin", "owner", "admin", "branch_manager", "finance"]);

const TENANT_FIELDS = [
  "subdomain", "customDomain", "siteName", "tagline", "logoUrl", "primaryColor", "secondaryColor",
  "heroImageUrl", "heroTitle", "heroSubtitle", "aboutText", "whatsappNumber", "phone", "email",
  "address", "instagramUrl", "facebookUrl", "isActive", "template", "gscVerification", "seoDefaultImage",
  "branchId", "agentId",
] as const;

function pickTenantFields(body: Record<string, unknown>) {
  return Object.fromEntries(TENANT_FIELDS.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
}

// Tenant Sites
router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(tenantSites);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tenant sites" });
  }
});

router.post("/", async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const fields = pickTenantFields(req.body ?? {}) as Record<string, any>;
    if (typeof fields.subdomain !== "string" || !fields.subdomain.trim()) {
      res.status(400).json({ error: "Subdomain wajib diisi" });
      return;
    }
    const [data] = await db.insert(tenantSites).values({
      ...fields,
      id,
      ownerId: (req.user as any)?.id ?? null,
      createdAt: new Date(),
    } as any).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create tenant site" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const updates = pickTenantFields(req.body ?? {});
    if (!Object.keys(updates).length) {
      res.status(400).json({ error: "Tidak ada field tenant yang dapat diperbarui" });
      return;
    }
    const [data] = await db.update(tenantSites).set(updates).where(eq(tenantSites.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Tenant site not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update tenant site" });
  }
});

// Tenant Site Packages
router.get("/packages", async (req, res) => {
  try {
    const data = await db.select().from(tenantSitePackages);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tenant site packages" });
  }
});

router.post("/packages", async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const { tenantSiteId, packageId, isFeatured, sortOrder } = req.body ?? {};
    if (typeof tenantSiteId !== "string" || typeof packageId !== "string") {
      res.status(400).json({ error: "tenantSiteId dan packageId wajib diisi" });
      return;
    }
    const [data] = await db.insert(tenantSitePackages).values({
      id,
      tenantSiteId,
      packageId,
      isFeatured: typeof isFeatured === "boolean" ? isFeatured : false,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      createdAt: new Date(),
    }).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create tenant site package" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(tenantSites).where(eq(tenantSites.id, req.params.id)).returning({ id: tenantSites.id });
    if (!deleted) return res.status(404).json({ error: "Tenant site not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete tenant site" });
  }
});

router.patch("/packages/:id", async (req, res) => {
  try {
    const allowed = {
      isFeatured: typeof req.body?.isFeatured === "boolean" ? req.body.isFeatured : undefined,
      sortOrder: typeof req.body?.sortOrder === "number" ? req.body.sortOrder : undefined,
    };
    const updates = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
    const [data] = await db.update(tenantSitePackages).set(updates).where(eq(tenantSitePackages.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Tenant site package not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update tenant site package" });
  }
});

router.delete("/packages/:id", async (req, res) => {
  try {
    await db.delete(tenantSitePackages).where(eq(tenantSitePackages.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete tenant site package" });
  }
});

// Template pricing — read-only server-side source for upgrade dialog.
router.get("/pricing", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      select template_name, price, description
      from template_pricing
      where is_active = true
      order by price asc
    `);
    res.json(((result as any).rows ?? result).map((row: any) => ({
      template_name: String(row.template_name),
      price: Number(row.price ?? 0),
      description: row.description ?? null,
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch template pricing" });
  }
});

// Template Upgrade Orders
router.post("/upgrades", upgradeWriteLimiter, async (req, res) => {
  try {
    const { tenantSiteId, currentTemplate, targetTemplate, proofUrl, notes } = req.body ?? {};
    const requestedBy = (req.user as any)?.id;
    if (typeof requestedBy !== "string" || typeof tenantSiteId !== "string" || typeof targetTemplate !== "string") {
      return res.status(400).json({ error: "tenantSiteId dan targetTemplate wajib diisi" });
    }
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(targetTemplate)) {
      return res.status(400).json({ error: "Template tujuan tidak valid" });
    }
    if (proofUrl !== undefined && proofUrl !== null && (typeof proofUrl !== "string" || !proofUrl.startsWith("/api/admin/uploads/"))) {
      return res.status(400).json({ error: "Bukti pembayaran harus berasal dari upload internal" });
    }
    const [tenant] = await db.select({ id: tenantSites.id, template: tenantSites.template }).from(tenantSites).where(eq(tenantSites.id, tenantSiteId)).limit(1);
    if (!tenant) return res.status(404).json({ error: "Tenant site not found" });

    const existing = await db.select().from(templateUpgradeOrders).where(and(
      eq(templateUpgradeOrders.tenantSiteId, tenantSiteId),
      eq(templateUpgradeOrders.targetTemplate, targetTemplate),
      inArray(templateUpgradeOrders.status, ["pending", "proof_submitted"]),
    )).limit(1);
    if (existing[0]) {
      return res.status(200).json({ ...existing[0], deduplicated: true });
    }

    const pricing = await db.execute(sql`
      select price from template_pricing
      where template_name = ${targetTemplate} and is_active = true
      limit 1
    `);
    const price = Number(((pricing as any).rows ?? pricing)[0]?.price ?? NaN);
    if (!Number.isFinite(price)) return res.status(400).json({ error: "Harga template tidak tersedia" });

    const [data] = await db.insert(templateUpgradeOrders).values({
      id: crypto.randomUUID(),
      tenantSiteId,
      requestedBy,
      currentTemplate: typeof currentTemplate === "string" ? currentTemplate : tenant.template,
      targetTemplate,
      price,
      proofUrl: typeof proofUrl === "string" ? proofUrl : null,
      notes: typeof notes === "string" ? notes.slice(0, 2000) : null,
      status: typeof proofUrl === "string" && proofUrl ? "proof_submitted" : "pending",
      createdAt: new Date(),
    }).returning();
    await logSecurityAudit(req, "admin.template_upgrade.submit", "success", { entityType: "template_upgrade_order", entityId: data.id, metadata: { tenantSiteId, targetTemplate } });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create upgrade order" });
  }
});

router.get("/upgrades", async (req, res) => {
  try {
    const data = await db.select().from(templateUpgradeOrders).orderBy(desc(templateUpgradeOrders.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch upgrade orders" });
  }
});

router.patch("/upgrades/:id", upgradeWriteLimiter, async (req, res) => {
  try {
    const { status, notes } = req.body ?? {};
    const allowedStatuses = ["pending", "proof_submitted", "approved", "rejected"];
    if (status !== undefined && !allowedStatuses.includes(status)) return res.status(400).json({ error: "Status upgrade tidak valid" });
    const [before] = await db.select().from(templateUpgradeOrders).where(eq(templateUpgradeOrders.id, String(req.params.id))).limit(1);
    if (!before) return res.status(404).json({ error: "Upgrade order not found" });
    const transitions: Record<string, string[]> = {
      pending: ["proof_submitted", "rejected"],
      proof_submitted: ["approved", "rejected"],
      approved: [],
      rejected: ["pending"],
    };
    if (status !== undefined && status !== before.status && !transitions[before.status]?.includes(status)) {
      return res.status(409).json({ error: `Transisi status ${before.status} ke ${status} tidak diizinkan` });
    }
    if (status === "approved" && before.status !== "proof_submitted") {
      return res.status(409).json({ error: "Order hanya dapat disetujui setelah bukti pembayaran disubmit" });
    }
    if (status === "approved" && !FINANCE_APPROVER_ROLES.has((req.user as any)?.role)) {
      return res.status(403).json({ error: "Role tidak berwenang menyetujui upgrade template" });
    }
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = typeof notes === "string" ? notes.slice(0, 2000) : null;
    if (!Object.keys(updates).length) return res.status(400).json({ error: "Tidak ada perubahan" });
    const [data] = await db.update(templateUpgradeOrders).set(updates as any).where(and(eq(templateUpgradeOrders.id, String(req.params.id)), eq(templateUpgradeOrders.status, before.status))).returning();
    if (!data) return res.status(409).json({ error: "Order berubah oleh proses lain; muat ulang lalu coba lagi" });
    await logSecurityAudit(req, "admin.template_upgrade.update", "success", { entityType: "template_upgrade_order", entityId: data.id, metadata: { from: before.status, to: data.status } });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update upgrade order" });
  }
});

export default router;
