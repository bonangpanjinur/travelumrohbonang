import { Router } from "express";
import {
  db,
  packageDepartures,
  departurePrices,
  packages,
  hotels,
  airlines,
  airports,
  muthawifs,
  eq,
  and,
  inArray,
} from "@workspace/db";

// mergeParams: true so req.params.packageId from parent router is accessible here
const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  try {
    // When mounted under /packages/:packageId/departures, filter by that package.
    const { packageId } = req.params as Record<string, string>;

    const baseQuery = db
      .select({
        id: packageDepartures.id,
        packageId: packageDepartures.packageId,
        departureDate: packageDepartures.departureDate,
        returnDate: packageDepartures.returnDate,
        quota: packageDepartures.quota,
        remainingQuota: packageDepartures.remainingQuota,
        status: packageDepartures.status,
        muthawifId: packageDepartures.muthawifId,
        packageTitle: packages.title,
      })
      .from(packageDepartures)
      .leftJoin(packages, eq(packageDepartures.packageId, packages.id));

    const data = packageId
      ? await baseQuery.where(eq(packageDepartures.packageId, packageId)).orderBy(packageDepartures.departureDate)
      : await baseQuery.orderBy(packageDepartures.departureDate);

    const departureIds = data.map((dep: any) => dep.id);
    const allPrices = departureIds.length
      ? await db
          .select()
          .from(departurePrices)
          .where(inArray(departurePrices.departureId, departureIds))
      : [];

    const pricesByDeparture = new Map<string, typeof allPrices>();
    for (const price of allPrices) {
      const list = pricesByDeparture.get(price.departureId) ?? [];
      list.push(price);
      pricesByDeparture.set(price.departureId, list);
    }

    const departuresWithPrices = data.map((dep: any) => ({
      ...dep,
      prices: pricesByDeparture.get(dep.id) ?? [],
    }));

    res.json({ data: departuresWithPrices, total: departuresWithPrices.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch departures" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { prices, ...depData } = req.body;
    const id = crypto.randomUUID();
    
    const [created] = await db
      .insert(packageDepartures)
      .values({
        id,
        ...depData,
        remainingQuota: depData.remainingQuota ?? depData.quota,
      })
      .returning();

    if (prices) {
      const priceInserts = Object.entries(prices).map(([roomType, price]) => ({
        id: crypto.randomUUID(),
        departureId: id,
        roomType,
        price: Number(price),
      }));
      if (priceInserts.length > 0) {
        await db.insert(departurePrices).values(priceInserts);
      }
    }

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to create departure" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { prices, ...depData } = req.body;
    const [updated] = await db
      .update(packageDepartures)
      .set(depData)
      .where(eq(packageDepartures.id, req.params.id))
      .returning();

    if (prices) {
      for (const [roomType, price] of Object.entries(prices)) {
        const [existing] = await db
          .select()
          .from(departurePrices)
          .where(and(eq(departurePrices.departureId, req.params.id), eq(departurePrices.roomType, roomType)))
          .limit(1);
        
        if (existing) {
          await db.update(departurePrices).set({ price: Number(price) }).where(eq(departurePrices.id, existing.id));
        } else {
          await db.insert(departurePrices).values({
            id: crypto.randomUUID(),
            departureId: req.params.id,
            roomType,
            price: Number(price),
          });
        }
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update departure" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(departurePrices).where(eq(departurePrices.departureId, req.params.id));
    const [deleted] = await db.delete(packageDepartures).where(eq(packageDepartures.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Departure not found" });
    return res.json({ message: "Departure deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete departure" });
  }
});

export default router;
