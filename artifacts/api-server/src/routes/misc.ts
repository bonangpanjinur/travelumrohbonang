import { Router } from "express";
import { db, currencies, tenantSites, eq } from "@workspace/db";

const router = Router();

router.get("/currencies", async (req, res) => {
  try {
    const data = await db.select().from(currencies).where(eq(currencies.isActive, true));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch currencies" });
  }
});

router.get("/tenant-site", async (req, res) => {
  try {
    const { subdomain } = req.query;
    if (!subdomain || typeof subdomain !== "string") {
      return res.status(400).json({ error: "Subdomain is required" });
    }
    const [data] = await db.select().from(tenantSites).where(eq(tenantSites.subdomain, subdomain)).limit(1);
    if (!data) return res.status(404).json({ error: "Tenant site not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tenant site" });
  }
});

export default router;
