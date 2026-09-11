import { Router } from "express";

const router = Router();
const WILAYAH_API = "https://wilayah.id/api";
const allowedLevels = new Set(["regencies", "districts", "villages"]);

async function proxyJson(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Wilayah API returned ${response.status}`);
  return response.json();
}

router.get("/provinces", async (_req, res) => {
  try {
    const data = await proxyJson(`${WILAYAH_API}/provinces.json`);
    res.set("Cache-Control", "public, max-age=86400").json(data);
  } catch (error) {
    console.error("[regions] provinces proxy failed", error);
    res.status(502).json({ error: "Gagal memuat data provinsi" });
  }
});

router.get("/:level/:code", async (req, res) => {
  const { level, code } = req.params;
  if (!allowedLevels.has(level) || !/^[0-9.]+$/.test(code)) {
    res.status(400).json({ error: "Wilayah tidak valid" });
    return;
  }
  try {
    const data = await proxyJson(`${WILAYAH_API}/${level}/${encodeURIComponent(code)}.json`);
    res.set("Cache-Control", "public, max-age=86400").json(data);
  } catch (error) {
    console.error(`[regions] ${level}/${code} proxy failed`, error);
    res.status(502).json({ error: "Gagal memuat data wilayah" });
  }
});

export default router;
