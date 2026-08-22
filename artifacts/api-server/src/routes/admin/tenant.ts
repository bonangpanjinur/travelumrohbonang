import { Router } from "express";
import { db, tenantSites, tenantSitePackages, templateUpgradeOrders, eq, desc } from "@workspace/db";

const router = Router();

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

// Template Upgrade Orders
router.get("/upgrades", async (req, res) => {
  try {
    const data = await db.select().from(templateUpgradeOrders).orderBy(desc(templateUpgradeOrders.createdAt));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch upgrade orders" });
  }
});

router.patch("/upgrades/:id", async (req, res) => {
  try {
    const [data] = await db.update(templateUpgradeOrders).set(req.body).where(eq(templateUpgradeOrders.id, req.params.id)).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update upgrade order" });
  }
});

export default router;
