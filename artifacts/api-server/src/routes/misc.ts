import { Router } from "express";
import { db, currencies, tenantSites, siteSettings, eq } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

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

// ── Payment Settings (public read) ────────────────────────────────────────────
// Returns manual bank transfer accounts so the Payment page can display them
// dynamically instead of having them hardcoded in the frontend.
//
// Expected site_settings row:
//   key = 'bank_accounts'
//   value = [{ bank, number, name, logo? }, ...]

router.get("/payment-settings", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "bank_accounts"))
      .limit(1);

    // Default fallback so the frontend always gets a usable response.
    const bankAccounts = row?.value ?? [
      { bank: "Bank Mandiri", number: "123-456-7890", name: "PT Umroh Travel" },
    ];

    res.json({ bankAccounts });
  } catch (err) {
    console.error("[misc/payment-settings]", err);
    res.status(500).json({ error: "Failed to fetch payment settings" });
  }
});

// ── Payment Settings (admin write) ───────────────────────────────────────────
// Protected endpoint — only authenticated users (admin) may update bank accounts.

router.put("/payment-settings", requireAuth, async (req, res) => {
  try {
    const { bankAccounts } = req.body as { bankAccounts?: unknown[] };
    if (!Array.isArray(bankAccounts) || bankAccounts.length === 0) {
      return res.status(400).json({ error: "bankAccounts must be a non-empty array" });
    }

    const [existing] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "bank_accounts"))
      .limit(1);

    let updated;
    if (existing) {
      [updated] = await db
        .update(siteSettings)
        .set({ value: bankAccounts })
        .where(eq(siteSettings.key, "bank_accounts"))
        .returning();
    } else {
      [updated] = await db
        .insert(siteSettings)
        .values({
          id: crypto.randomUUID(),
          key: "bank_accounts",
          category: "payment",
          value: bankAccounts,
          createdAt: new Date(),
        })
        .returning();
    }

    res.json({ bankAccounts: updated?.value });
  } catch (err) {
    console.error("[misc/payment-settings PUT]", err);
    res.status(500).json({ error: "Failed to update payment settings" });
  }
});

export default router;
