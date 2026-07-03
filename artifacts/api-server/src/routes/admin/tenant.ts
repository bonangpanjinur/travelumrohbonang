import { Router } from "express";
import { db, tenantSites, tenantSitePackages, templateUpgradeOrders, eq, desc } from "@workspace/db";
import { v4 as uuidv4 } from "uuid";

const router = Router();

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
    const id = uuidv4();
    const [data] = await db.insert(tenantSites).values({
      ...req.body,
      id,
      createdAt: new Date(),
    }).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create tenant site" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const [data] = await db.update(tenantSites).set(req.body).where(eq(tenantSites.id, req.params.id)).returning();
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
    const id = uuidv4();
    const [data] = await db.insert(tenantSitePackages).values({
      ...req.body,
      id,
      createdAt: new Date(),
    }).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create tenant site package" });
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
