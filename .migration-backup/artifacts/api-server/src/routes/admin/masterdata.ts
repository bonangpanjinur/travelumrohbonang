import { Router } from "express";
import {
  db,
  hotels,
  airlines,
  airports,
  muthawifs,
  packageCategories,
  packageHotels,
  equipment,
  eq,
  asc,
} from "@workspace/db";

/** Map a caught DB/unknown error to an appropriate HTTP response. */
function dbError(res: any, entityLabel: string, action: "create" | "update" | "delete", err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  // Postgres NOT NULL violation (code 23502) or FK violation (23503/23505)
  if (msg.includes("23502") || msg.includes("null value") || msg.includes("violates not-null")) {
    res.status(400).json({ error: `Missing required field for ${entityLabel}` });
  } else if (msg.includes("23503") || msg.includes("foreign key")) {
    res.status(400).json({ error: `Invalid reference — related record not found` });
  } else if (msg.includes("23505") || msg.includes("unique")) {
    res.status(409).json({ error: `${entityLabel} already exists` });
  } else {
    console.error(`[masterdata] Failed to ${action} ${entityLabel}:`, msg);
    res.status(500).json({ error: `Failed to ${action} ${entityLabel}` });
  }
}

const router = Router();

// Hotels
router.get("/hotels", async (_req, res) => {
  try {
    const data = await db.select().from(hotels).orderBy(asc(hotels.name));
    res.json({ data, total: data.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch hotels" });
  }
});

router.post("/hotels", async (req, res) => {
  if (!req.body?.name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const [created] = await db
      .insert(hotels)
      .values({
        id: crypto.randomUUID(),
        ...req.body,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    dbError(res, "hotel", "create", err);
  }
});

router.patch("/hotels/:id", async (req, res) => {
  try {
    const [updated] = await db
      .update(hotels)
      .set(req.body)
      .where(eq(hotels.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Hotel not found" });
    res.json(updated);
  } catch (err) {
    dbError(res, "hotel", "update", err);
  }
});

router.delete("/hotels/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(hotels).where(eq(hotels.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Hotel not found" });
    res.json({ message: "Hotel deleted" });
  } catch (err) {
    dbError(res, "hotel", "delete", err);
  }
});

// Airlines
router.get("/airlines", async (_req, res) => {
  try {
    const data = await db.select().from(airlines).orderBy(asc(airlines.name));
    res.json({ data, total: data.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch airlines" });
  }
});

router.post("/airlines", async (req, res) => {
  if (!req.body?.name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const [created] = await db
      .insert(airlines)
      .values({
        id: crypto.randomUUID(),
        ...req.body,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    dbError(res, "airline", "create", err);
  }
});

router.patch("/airlines/:id", async (req, res) => {
  try {
    const [updated] = await db
      .update(airlines)
      .set(req.body)
      .where(eq(airlines.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Airline not found" });
    res.json(updated);
  } catch (err) {
    dbError(res, "airline", "update", err);
  }
});

router.delete("/airlines/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(airlines).where(eq(airlines.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Airline not found" });
    res.json({ message: "Airline deleted" });
  } catch (err) {
    dbError(res, "airline", "delete", err);
  }
});

// Airports
router.get("/airports", async (_req, res) => {
  try {
    const data = await db.select().from(airports).orderBy(asc(airports.name));
    res.json({ data, total: data.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch airports" });
  }
});

router.post("/airports", async (req, res) => {
  if (!req.body?.name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const [created] = await db
      .insert(airports)
      .values({
        id: crypto.randomUUID(),
        ...req.body,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    dbError(res, "airport", "create", err);
  }
});

router.patch("/airports/:id", async (req, res) => {
  try {
    const [updated] = await db
      .update(airports)
      .set(req.body)
      .where(eq(airports.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Airport not found" });
    res.json(updated);
  } catch (err) {
    dbError(res, "airport", "update", err);
  }
});

router.delete("/airports/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(airports).where(eq(airports.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Airport not found" });
    res.json({ message: "Airport deleted" });
  } catch (err) {
    dbError(res, "airport", "delete", err);
  }
});

// Muthawifs
router.get("/muthawifs", async (_req, res) => {
  try {
    const data = await db.select().from(muthawifs).orderBy(asc(muthawifs.name));
    res.json({ data, total: data.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch muthawifs" });
  }
});

router.post("/muthawifs", async (req, res) => {
  if (!req.body?.name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const [created] = await db
      .insert(muthawifs)
      .values({
        id: crypto.randomUUID(),
        ...req.body,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    dbError(res, "muthawif", "create", err);
  }
});

router.patch("/muthawifs/:id", async (req, res) => {
  try {
    const [updated] = await db
      .update(muthawifs)
      .set(req.body)
      .where(eq(muthawifs.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Muthawif not found" });
    res.json(updated);
  } catch (err) {
    dbError(res, "muthawif", "update", err);
  }
});

router.delete("/muthawifs/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(muthawifs).where(eq(muthawifs.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Muthawif not found" });
    res.json({ message: "Muthawif deleted" });
  } catch (err) {
    dbError(res, "muthawif", "delete", err);
  }
});

// Categories
router.get("/categories", async (_req, res) => {
  try {
    const data = await db.select().from(packageCategories).orderBy(asc(packageCategories.sortOrder));
    res.json({ data, total: data.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.post("/categories", async (req, res) => {
  if (!req.body?.name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const [created] = await db
      .insert(packageCategories)
      .values({
        id: crypto.randomUUID(),
        ...req.body,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    dbError(res, "category", "create", err);
  }
});

router.patch("/categories/:id", async (req, res) => {
  try {
    const [updated] = await db
      .update(packageCategories)
      .set(req.body)
      .where(eq(packageCategories.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Category not found" });
    res.json(updated);
  } catch (err) {
    dbError(res, "category", "update", err);
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(packageCategories).where(eq(packageCategories.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (err) {
    dbError(res, "category", "delete", err);
  }
});

// Equipment (Perlengkapan)
router.get("/equipment", async (_req, res) => {
  try {
    const data = await db.select().from(equipment).orderBy(asc(equipment.sortOrder), asc(equipment.name));
    res.json({ data, total: data.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch equipment" });
  }
});

router.post("/equipment", async (req, res) => {
  if (!req.body?.name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const [created] = await db
      .insert(equipment)
      .values({
        id: crypto.randomUUID(),
        ...req.body,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    dbError(res, "equipment", "create", err);
  }
});

router.patch("/equipment/:id", async (req, res) => {
  try {
    const [updated] = await db
      .update(equipment)
      .set(req.body)
      .where(eq(equipment.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Equipment not found" });
    res.json(updated);
  } catch (err) {
    dbError(res, "equipment", "update", err);
  }
});

router.delete("/equipment/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(equipment).where(eq(equipment.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Equipment not found" });
    res.json({ message: "Equipment deleted" });
  } catch (err) {
    dbError(res, "equipment", "delete", err);
  }
});

export default router;
