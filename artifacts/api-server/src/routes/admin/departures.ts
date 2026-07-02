import { Router, type Request, type Response } from "express";
import { db, packageDepartures, departurePrices, eq, and } from "@workspace/db";
import {
  PackageDepartureSchema,
  DeparturePriceSchema,
  AdminCreateDepartureRequest,
  AdminUpdateDepartureRequest,
  AdminCreateDeparturePriceRequest,
  AdminUpdateDeparturePriceRequest,
  type AdminCreateDepartureInput,
  type AdminUpdateDepartureInput,
  type AdminCreateDeparturePriceInput,
  type AdminUpdateDeparturePriceInput,
} from "@workspace/api-zod";
import { validate } from "../../middlewares/validate";

const router = Router({ mergeParams: true });

router.get("/", async (req: Request, res: Response) => {
  try {
    const packageId = (req.params as Record<string, string>).packageId;

    const departures = await db
      .select()
      .from(packageDepartures)
      .where(eq(packageDepartures.packageId, packageId));

    const departuresWithPrices = await Promise.all(
      departures.map(async (dep) => {
        const prices = await db
          .select()
          .from(departurePrices)
          .where(eq(departurePrices.departureId, dep.id));
        return { ...dep, prices };
      }),
    );

    res.json({ data: departuresWithPrices, total: departuresWithPrices.length });
  } catch {
    res.status(500).json({ error: "Failed to fetch departures" });
  }
});

router.post("/", validate(AdminCreateDepartureRequest), async (req: Request, res: Response) => {
  try {
    const packageId = (req.params as Record<string, string>).packageId;
    const body = req.body as AdminCreateDepartureInput;

    const [created] = await db
      .insert(packageDepartures)
      .values({
        id: crypto.randomUUID(),
        packageId,
        departureDate: body.departureDate,
        returnDate: body.returnDate ?? null,
        quota: body.quota,
        remainingQuota: body.remainingQuota ?? body.quota,
        status: body.status,
        muthawifId: body.muthawifId ?? null,
      })
      .returning();

    res.status(201).json(PackageDepartureSchema.omit({ prices: true }).parse(created));
  } catch {
    res.status(500).json({ error: "Failed to create departure" });
  }
});

router.get("/:depId", async (req: Request, res: Response) => {
  try {
    const packageId = (req.params as Record<string, string>).packageId;
    const depId = req.params.depId as string;

    const [departure] = await db
      .select()
      .from(packageDepartures)
      .where(
        and(
          eq(packageDepartures.id, depId),
          eq(packageDepartures.packageId, packageId),
        ),
      )
      .limit(1);

    if (!departure) {
      res.status(404).json({ error: "Departure not found" });
      return;
    }

    const prices = await db
      .select()
      .from(departurePrices)
      .where(eq(departurePrices.departureId, depId));

    res.json(PackageDepartureSchema.parse({ ...departure, prices }));
  } catch {
    res.status(500).json({ error: "Failed to fetch departure" });
  }
});

router.patch("/:depId", validate(AdminUpdateDepartureRequest), async (req: Request, res: Response) => {
  try {
    const packageId = (req.params as Record<string, string>).packageId;
    const depId = req.params.depId as string;
    const updates = req.body as AdminUpdateDepartureInput;

    const [updated] = await db
      .update(packageDepartures)
      .set(updates)
      .where(
        and(
          eq(packageDepartures.id, depId),
          eq(packageDepartures.packageId, packageId),
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Departure not found" });
      return;
    }

    const prices = await db
      .select()
      .from(departurePrices)
      .where(eq(departurePrices.departureId, depId));

    res.json(PackageDepartureSchema.parse({ ...updated, prices }));
  } catch {
    res.status(500).json({ error: "Failed to update departure" });
  }
});

router.delete("/:depId", async (req: Request, res: Response) => {
  try {
    const packageId = (req.params as Record<string, string>).packageId;
    const depId = req.params.depId as string;

    await db
      .delete(departurePrices)
      .where(eq(departurePrices.departureId, depId));

    const [deleted] = await db
      .delete(packageDepartures)
      .where(
        and(
          eq(packageDepartures.id, depId),
          eq(packageDepartures.packageId, packageId),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Departure not found" });
      return;
    }

    res.json({ message: "Departure and its prices deleted successfully" });
  } catch {
    res.status(500).json({ error: "Failed to delete departure" });
  }
});

router.post("/:depId/prices", validate(AdminCreateDeparturePriceRequest), async (req: Request, res: Response) => {
  try {
    const depId = req.params.depId as string;
    const body = req.body as AdminCreateDeparturePriceInput;

    const [created] = await db
      .insert(departurePrices)
      .values({
        id: crypto.randomUUID(),
        departureId: depId,
        roomType: body.roomType,
        price: body.price,
      })
      .returning();

    res.status(201).json(DeparturePriceSchema.parse(created));
  } catch {
    res.status(500).json({ error: "Failed to create departure price" });
  }
});

router.patch("/:depId/prices/:priceId", validate(AdminUpdateDeparturePriceRequest), async (req: Request, res: Response) => {
  try {
    const depId = req.params.depId as string;
    const priceId = req.params.priceId as string;
    const updates = req.body as AdminUpdateDeparturePriceInput;

    const [updated] = await db
      .update(departurePrices)
      .set(updates)
      .where(
        and(
          eq(departurePrices.id, priceId),
          eq(departurePrices.departureId, depId),
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Price not found" });
      return;
    }

    res.json(DeparturePriceSchema.parse(updated));
  } catch {
    res.status(500).json({ error: "Failed to update departure price" });
  }
});

router.delete("/:depId/prices/:priceId", async (req: Request, res: Response) => {
  try {
    const depId = req.params.depId as string;
    const priceId = req.params.priceId as string;

    const [deleted] = await db
      .delete(departurePrices)
      .where(
        and(
          eq(departurePrices.id, priceId),
          eq(departurePrices.departureId, depId),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Price not found" });
      return;
    }

    res.json({ message: "Price deleted successfully" });
  } catch {
    res.status(500).json({ error: "Failed to delete departure price" });
  }
});

export default router;
