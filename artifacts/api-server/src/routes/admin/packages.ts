import { Router } from "express";
import { db, packages, packageDepartures, departurePrices, packageHotels, eq, asc } from "@workspace/db";
import {
  PackageSchema,
  PackageListResponse,
  PackageDetailSchema,
  AdminCreatePackageRequest,
  AdminUpdatePackageRequest,
  type AdminCreatePackageInput,
  type AdminUpdatePackageInput,
} from "@workspace/api-zod";
import { validate } from "../../middlewares/validate";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const data = await db.select().from(packages).orderBy(asc(packages.createdAt));
    res.json(PackageListResponse.parse({ data, total: data.length }));
  } catch {
    res.status(500).json({ error: "Failed to fetch packages" });
  }
});

router.post("/", validate(AdminCreatePackageRequest), async (req, res) => {
  try {
    const body = req.body as AdminCreatePackageInput;

    const [created] = await db
      .insert(packages)
      .values({
        id: crypto.randomUUID(),
        title: body.title,
        slug: body.slug,
        description: body.description ?? null,
        imageUrl: body.imageUrl ?? null,
        durationDays: body.durationDays ?? null,
        packageType: body.packageType ?? null,
        categoryId: body.categoryId ?? null,
        hotelMakkahId: (body as any).hotelMakkahId ?? null,
        hotelMadinahId: (body as any).hotelMadinahId ?? null,
        airlineId: (body as any).airlineId ?? null,
        airportId: (body as any).airportId ?? null,
        minimumDp: body.minimumDp ?? null,
        dpDeadlineDays: body.dpDeadlineDays ?? null,
        fullDeadlineDays: body.fullDeadlineDays ?? null,
        isActive: body.isActive,
      })
      .returning();

    res.status(201).json(PackageSchema.parse(created));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create package" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id as string;

    const [pkg] = await db
      .select()
      .from(packages)
      .where(eq(packages.id, id))
      .limit(1);

    if (!pkg) {
      res.status(404).json({ error: "Package not found" });
      return;
    }

    const departures = await db
      .select()
      .from(packageDepartures)
      .where(eq(packageDepartures.packageId, id));

    const departuresWithPrices = await Promise.all(
      departures.map(async (dep) => {
        const prices = await db
          .select()
          .from(departurePrices)
          .where(eq(departurePrices.departureId, dep.id));
        return { ...dep, prices };
      }),
    );

    res.json(PackageDetailSchema.parse({ ...pkg, departures: departuresWithPrices }));
  } catch {
    res.status(500).json({ error: "Failed to fetch package" });
  }
});

router.patch("/:id", validate(AdminUpdatePackageRequest), async (req, res) => {
  try {
    const id = req.params.id as string;
    const updates = req.body as AdminUpdatePackageInput;

    const [updated] = await db
      .update(packages)
      .set({
        ...updates,
        hotelMakkahId: (updates as any).hotelMakkahId,
        hotelMadinahId: (updates as any).hotelMadinahId,
        airlineId: (updates as any).airlineId,
        airportId: (updates as any).airportId,
      } as any)
      .where(eq(packages.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Package not found" });
      return;
    }

    res.json(PackageSchema.parse(updated));
  } catch {
    res.status(500).json({ error: "Failed to update package" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id as string;

    const [deleted] = await db
      .delete(packages)
      .where(eq(packages.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Package not found" });
      return;
    }

    res.json({ message: "Package deleted successfully" });
  } catch {
    res.status(500).json({ error: "Failed to delete package" });
  }
});

// Extra Hotels (package_hotels)
router.get("/:id/extra-hotels", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(packageHotels)
      .where(eq(packageHotels.packageId, req.params.id))
      .orderBy(asc(packageHotels.sortOrder));
    res.json({ data });
  } catch {
    res.status(500).json({ error: "Failed to fetch extra hotels" });
  }
});

router.post("/:id/extra-hotels", async (req, res) => {
  try {
    const { hotels: rows } = req.body;
    await db.delete(packageHotels).where(eq(packageHotels.packageId, req.params.id));
    if (rows && rows.length > 0) {
      await db.insert(packageHotels).values(
        rows.map((r: any, i: number) => ({
          id: crypto.randomUUID(),
          packageId: req.params.id,
          hotelId: r.hotel_id,
          label: r.label,
          sortOrder: i,
        }))
      );
    }
    res.json({ message: "Extra hotels updated" });
  } catch {
    res.status(500).json({ error: "Failed to update extra hotels" });
  }
});

export default router;
