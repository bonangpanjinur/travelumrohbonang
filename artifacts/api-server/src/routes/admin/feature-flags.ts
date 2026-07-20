import { Router } from "express";
import { db, siteSettings, eq } from "@workspace/db";
import { requireSuperAdmin } from "../../middlewares/requireAdmin";

const router = Router();

const SETTING_KEY = "feature_flags";

/**
 * GET /api/admin/feature-flags
 * Returns the current enabled/disabled state of all feature flags.
 * Readable by all authenticated admins (gate applied at index.ts level).
 */
router.get("/", async (_req, res) => {
  try {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, SETTING_KEY))
      .limit(1);

    res.json({ data: (row?.value as Record<string, boolean>) ?? {} });
  } catch (err) {
    console.error("[feature-flags GET]", err);
    res.status(500).json({ error: "Gagal memuat feature flags" });
  }
});

/**
 * PUT /api/admin/feature-flags
 * Upserts the feature_flags JSONB blob.
 * Body: { flags: Record<string, boolean> }
 * Requires super_admin role.
 */
router.put("/", requireSuperAdmin, async (req, res) => {
  try {
    const { flags } = req.body as { flags: Record<string, boolean> };
    if (!flags || typeof flags !== "object") {
      res.status(400).json({ error: "Body harus berisi field 'flags'" });
      return;
    }

    const [existing] = await db
      .select({ id: siteSettings.id })
      .from(siteSettings)
      .where(eq(siteSettings.key, SETTING_KEY))
      .limit(1);

    let row;
    if (existing) {
      [row] = await db
        .update(siteSettings)
        .set({ value: flags })
        .where(eq(siteSettings.key, SETTING_KEY))
        .returning();
    } else {
      [row] = await db
        .insert(siteSettings)
        .values({
          id: crypto.randomUUID(),
          key: SETTING_KEY,
          category: "features",
          value: flags,
          createdAt: new Date(),
        })
        .returning();
    }

    res.json({ data: row?.value ?? flags });
  } catch (err) {
    console.error("[feature-flags PUT]", err);
    res.status(500).json({ error: "Gagal menyimpan feature flags" });
  }
});

export default router;
