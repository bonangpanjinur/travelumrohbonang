import { Router } from "express";
import { db, siteSettings, eq } from "@workspace/db";

const router = Router();

export const DEFAULT_INVOICE_TEMPLATE = {
  templateKey: "emerald-classic",
  paper: "A4",
  orientation: "portrait",
  primaryColor: "#0d6b4e",
  accentColor: "#b88a2a",
  fontFamily: "Inter",
  borderStyle: "solid",
  showLogo: true,
  showQr: true,
  showCompanyAddress: true,
  showCustomerPhone: true,
  showRoomBreakdown: true,
  showPilgrims: true,
  showPaymentHistory: true,
  showPaymentPolicy: true,
  showPaymentSchedule: true,
  footerText: "Invoice ini dihasilkan secara otomatis oleh sistem.",
};

function sanitizeInvoiceTemplate(input: any) {
  const source = input && typeof input === "object" ? input : {};
  const hex = (value: unknown, fallback: string) => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
  const enumValue = (value: unknown, allowed: string[], fallback: string) => typeof value === "string" && allowed.includes(value) ? value : fallback;
  return {
    ...DEFAULT_INVOICE_TEMPLATE,
    templateKey: enumValue(source.templateKey, ["emerald-classic", "gold-premium", "minimal-slate", "ramadan-night"], DEFAULT_INVOICE_TEMPLATE.templateKey),
    paper: enumValue(source.paper, ["A4", "Letter"], DEFAULT_INVOICE_TEMPLATE.paper),
    orientation: enumValue(source.orientation, ["portrait", "landscape"], DEFAULT_INVOICE_TEMPLATE.orientation),
    primaryColor: hex(source.primaryColor, DEFAULT_INVOICE_TEMPLATE.primaryColor),
    accentColor: hex(source.accentColor, DEFAULT_INVOICE_TEMPLATE.accentColor),
    fontFamily: enumValue(source.fontFamily, ["Inter", "Arial", "Georgia", "Noto Sans"], DEFAULT_INVOICE_TEMPLATE.fontFamily),
    borderStyle: enumValue(source.borderStyle, ["none", "solid", "double"], DEFAULT_INVOICE_TEMPLATE.borderStyle),
    showLogo: source.showLogo !== false,
    showQr: source.showQr !== false,
    showCompanyAddress: source.showCompanyAddress !== false,
    showCustomerPhone: source.showCustomerPhone !== false,
    showRoomBreakdown: source.showRoomBreakdown !== false,
    showPilgrims: source.showPilgrims !== false,
    showPaymentHistory: source.showPaymentHistory !== false,
    showPaymentPolicy: source.showPaymentPolicy !== false,
    showPaymentSchedule: source.showPaymentSchedule !== false,
    footerText: typeof source.footerText === "string" ? source.footerText.slice(0, 500) : DEFAULT_INVOICE_TEMPLATE.footerText,
  };
}

router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(siteSettings);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch site settings" });
  }
});

router.get("/invoice-template", async (_req, res) => {
  try {
    const [item] = await db.select().from(siteSettings).where(eq(siteSettings.key, "invoice_template")).limit(1);
    res.json({ data: item ?? { key: "invoice_template", category: "documents", value: DEFAULT_INVOICE_TEMPLATE } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoice template settings" });
  }
});

router.put("/invoice-template", async (req, res) => {
  try {
    const value = sanitizeInvoiceTemplate(req.body?.value ?? req.body);
    const [existing] = await db.select({ id: siteSettings.id }).from(siteSettings).where(eq(siteSettings.key, "invoice_template")).limit(1);
    const [item] = existing
      ? await db.update(siteSettings).set({ category: "documents", value }).where(eq(siteSettings.key, "invoice_template")).returning()
      : await db.insert(siteSettings).values({ id: crypto.randomUUID(), key: "invoice_template", category: "documents", value, createdAt: new Date() }).returning();
    res.json({ data: item });
  } catch (err) {
    console.error("[settings PUT/invoice-template]", err);
    res.status(500).json({ error: "Failed to save invoice template settings" });
  }
});

// Single-key get/set helpers used by feature-specific admin pages (e.g. SEO defaults).
router.get("/seo", async (req, res) => {
  try {
    const [item] = await db.select().from(siteSettings).where(eq(siteSettings.key, "seo")).limit(1);
    res.json({ data: item ?? { key: "seo", category: "general", value: {} } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch SEO settings" });
  }
});

router.put("/seo", async (req, res) => {
  try {
    const { category, value } = req.body;
    const [existing] = await db.select().from(siteSettings).where(eq(siteSettings.key, "seo")).limit(1);

    let item;
    if (existing) {
      [item] = await db
        .update(siteSettings)
        .set({ category: category ?? existing.category, value })
        .where(eq(siteSettings.key, "seo"))
        .returning();
    } else {
      [item] = await db
        .insert(siteSettings)
        .values({
          id: crypto.randomUUID(),
          key: "seo",
          category: category ?? "general",
          value,
          createdAt: new Date(),
        })
        .returning();
    }

    res.json({ data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save SEO settings" });
  }
});

// Single-key get — used by feature pages (LoginSettings, etc.)
router.get("/:key", async (req, res) => {
  // Guard against shadowing specific named routes above (e.g. /seo)
  const reserved = ["seo", "invoice-template"];
  if (reserved.includes(req.params.key)) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const [item] = await db.select().from(siteSettings).where(eq(siteSettings.key, req.params.key)).limit(1);
    res.json({ data: item ?? null });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch setting" });
  }
});

// Upsert by key — atomic check-then-insert-or-update by key name.
// Called by Settings.tsx and LoginSettings.tsx instead of the old
// non-atomic supabase select+insert/update pattern.
router.put("/:key", async (req, res) => {
  const reserved = ["seo", "invoice-template"];
  if (reserved.includes(req.params.key)) {
    return res.status(404).json({ error: "Use the dedicated /seo endpoint" });
  }
  try {
    const { category, value } = req.body;
    const key = req.params.key;
    const [existing] = await db.select({ id: siteSettings.id }).from(siteSettings).where(eq(siteSettings.key, key)).limit(1);

    let item;
    if (existing) {
      [item] = await db
        .update(siteSettings)
        .set({ value, ...(category ? { category } : {}) })
        .where(eq(siteSettings.key, key))
        .returning();
    } else {
      [item] = await db
        .insert(siteSettings)
        .values({ id: crypto.randomUUID(), key, category: category ?? "general", value, createdAt: new Date() })
        .returning();
    }
    res.json({ data: item });
  } catch (err) {
    console.error("[settings PUT/:key]", err);
    res.status(500).json({ error: "Failed to upsert setting" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [item] = await db.insert(siteSettings).values({
      id: crypto.randomUUID(),
      ...req.body,
      createdAt: new Date(),
    }).returning();
    res.status(201).json({ data: item });
  } catch (err) {
    res.status(500).json({ error: "Failed to create site setting" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const [item] = await db.update(siteSettings).set(req.body).where(eq(siteSettings.id, req.params.id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ data: item });
  } catch (err) {
    res.status(500).json({ error: "Failed to update site setting" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [item] = await db.delete(siteSettings).where(eq(siteSettings.id, req.params.id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete site setting" });
  }
});

export default router;
