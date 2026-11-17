import { Router } from "express";
import { requireSuperAdmin } from "../../middlewares/requireAdmin";
import { readSiteBranding, saveSiteFaviconUrl } from "../../lib/siteBranding";
import { resolvePublicIconUrl } from "../../lib/siteIcon";

const router = Router();

router.get("/", requireSuperAdmin, async (_req, res) => {
  try {
    const branding = await readSiteBranding();
    res.json({
      data: {
        logo_url: typeof branding.logo_url === "string" ? branding.logo_url : "",
        favicon_url: typeof branding.favicon_url === "string" ? branding.favicon_url : "",
      },
    });
  } catch (error) {
    console.error("[admin/app-icon] Failed to load branding icon settings", error);
    res.status(500).json({ error: "Gagal memuat pengaturan ikon aplikasi" });
  }
});

router.put("/", requireSuperAdmin, async (req, res) => {
  const rawValue = req.body?.favicon_url;
  if (typeof rawValue !== "string") {
    return res.status(400).json({ error: "favicon_url harus berupa string" });
  }

  const trimmed = rawValue.trim();
  if (trimmed.length > 2048) {
    return res.status(400).json({ error: "URL ikon maksimal 2048 karakter" });
  }
  const faviconUrl = trimmed ? resolvePublicIconUrl(trimmed) : "";
  if (trimmed && !faviconUrl) {
    return res.status(400).json({ error: "URL ikon harus berupa URL HTTP(S) atau path lokal yang valid" });
  }

  try {
    const branding = await saveSiteFaviconUrl(faviconUrl || "");
    res.json({
      data: {
        logo_url: typeof branding.logo_url === "string" ? branding.logo_url : "",
        favicon_url: typeof branding.favicon_url === "string" ? branding.favicon_url : "",
      },
    });
  } catch (error) {
    console.error("[admin/app-icon] Failed to save branding icon settings", error);
    res.status(500).json({ error: "Gagal menyimpan pengaturan ikon aplikasi" });
  }
});

export default router;
