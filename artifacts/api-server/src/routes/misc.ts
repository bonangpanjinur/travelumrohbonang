import { Router } from "express";
import { db, currencies, tenantSites, siteSettings, eq } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireFinance, requireSuperAdmin } from "../middlewares/requireAdmin";

const router = Router();

const HOSTING_NOTICE_KEY = "hosting_notice";
const DEFAULT_HOSTING_NOTICE = {
  active: false,
  title: "Website Tidak Dapat Diakses",
  message: "Perpanjang hosting sekarang untuk mengaktifkan kembali website ini.",
  contactLabel: "Hubungi Developer",
  contactUrl: "",
};

router.get("/hosting-notice", async (_req, res) => {
  try {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, HOSTING_NOTICE_KEY)).limit(1);
    const value = row?.value && typeof row.value === "object" && !Array.isArray(row.value)
      ? row.value as Partial<typeof DEFAULT_HOSTING_NOTICE>
      : {};
    res.setHeader("Cache-Control", "no-store");
    res.json({ notice: { ...DEFAULT_HOSTING_NOTICE, ...value } });
  } catch (err) {
    console.error("[misc/hosting-notice GET]", err);
    res.status(500).json({ error: "Failed to fetch website availability" });
  }
});

router.put("/hosting-notice", requireSuperAdmin, async (req, res) => {
  try {
    const body = req.body as Partial<typeof DEFAULT_HOSTING_NOTICE>;
    if (typeof body.active !== "boolean") return res.status(400).json({ error: "active must be a boolean" });
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const contactLabel = typeof body.contactLabel === "string" ? body.contactLabel.trim() : "";
    const contactUrl = typeof body.contactUrl === "string" ? body.contactUrl.trim() : "";
    if (title.length > 120 || message.length > 1000 || contactLabel.length > 60 || contactUrl.length > 500) {
      return res.status(400).json({ error: "One or more fields exceed the allowed length" });
    }
    if (contactUrl) {
      try {
        const parsed = new URL(contactUrl);
        if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) throw new Error("Unsupported protocol");
      } catch {
        return res.status(400).json({ error: "contactUrl must use https://, http://, mailto:, or tel:" });
      }
    }

    const notice = {
      active: body.active,
      title: title || DEFAULT_HOSTING_NOTICE.title,
      message: message || DEFAULT_HOSTING_NOTICE.message,
      contactLabel: contactLabel || DEFAULT_HOSTING_NOTICE.contactLabel,
      contactUrl,
    };
    const [existing] = await db.select({ id: siteSettings.id }).from(siteSettings)
      .where(eq(siteSettings.key, HOSTING_NOTICE_KEY)).limit(1);
    if (existing) {
      await db.update(siteSettings).set({ category: "website", value: notice }).where(eq(siteSettings.id, existing.id));
    } else {
      await db.insert(siteSettings).values({
        id: crypto.randomUUID(),
        key: HOSTING_NOTICE_KEY,
        category: "website",
        value: notice,
        createdAt: new Date(),
      });
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ notice });
  } catch (err) {
    console.error("[misc/hosting-notice PUT]", err);
    res.status(500).json({ error: "Failed to save website availability" });
  }
});

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

router.put("/payment-settings", requireFinance, async (req, res) => {
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
