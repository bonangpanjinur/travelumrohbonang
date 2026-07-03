import { Router } from "express";
import {
  db,
  hotels,
  airlines,
  airports,
  muthawifs,
  packageCategories,
  packageHotels,
  eq,
  asc,
} from "@workspace/db";

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
    res.status(500).json({ error: "Failed to create hotel" });
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
    res.status(500).json({ error: "Failed to update hotel" });
  }
});

router.delete("/hotels/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(hotels).where(eq(hotels.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Hotel not found" });
    res.json({ message: "Hotel deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete hotel" });
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
    res.status(500).json({ error: "Failed to create airline" });
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
    res.status(500).json({ error: "Failed to update airline" });
  }
});

router.delete("/airlines/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(airlines).where(eq(airlines.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Airline not found" });
    res.json({ message: "Airline deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete airline" });
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
    res.status(500).json({ error: "Failed to create airport" });
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
    res.status(500).json({ error: "Failed to update airport" });
  }
});

router.delete("/airports/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(airports).where(eq(airports.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Airport not found" });
    res.json({ message: "Airport deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete airport" });
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
    res.status(500).json({ error: "Failed to create muthawif" });
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
    res.status(500).json({ error: "Failed to update muthawif" });
  }
});

router.delete("/muthawifs/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(muthawifs).where(eq(muthawifs.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Muthawif not found" });
    res.json({ message: "Muthawif deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete muthawif" });
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
    res.status(500).json({ error: "Failed to create category" });
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
    res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(packageCategories).where(eq(packageCategories.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
