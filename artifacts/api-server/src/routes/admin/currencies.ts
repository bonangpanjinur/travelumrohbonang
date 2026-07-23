import { Router } from "express";
import { db, currencies, eq } from "@workspace/db";
import { syncExchangeRates } from "../../lib/exchangeRateCron";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(currencies);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch currencies" });
  }
});

router.post("/", async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const [data] = await db.insert(currencies).values({
      ...req.body,
      id,
      createdAt: new Date(),
    }).returning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create currency" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const [data] = await db.update(currencies).set(req.body).where(eq(currencies.id, req.params.id)).returning();
    if (!data) return res.status(404).json({ error: "Currency not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update currency" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(currencies).where(eq(currencies.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete currency" });
  }
});

/**
 * F-14: Sinkronisasi kurs otomatis dari Open Exchange Rates API.
 * Dapat dipanggil manual dari halaman admin Mata Uang.
 *
 * Returns 200 when at least one currency was updated (partial errors tolerated).
 * Returns 502 when the upstream fetch itself failed (zero updates possible).
 */
router.post("/sync-rates", async (req, res) => {
  try {
    const result = await syncExchangeRates();

    // If no currencies were updated AND there are errors, the sync failed entirely.
    if (result.updated === 0 && result.errors.length > 0) {
      res.status(502).json({
        success: false,
        updated: 0,
        errors: result.errors,
        message: "Sinkronisasi kurs gagal — tidak ada data yang berhasil diperbarui",
      });
      return;
    }

    res.json({
      success: true,
      updated: result.updated,
      errors: result.errors,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Gagal sinkronisasi kurs" });
  }
});

export default router;
