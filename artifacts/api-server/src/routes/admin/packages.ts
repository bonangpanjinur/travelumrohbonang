import { Router } from "express";
import { db, packages, packageDepartures, departurePrices, eq } from "@workspace/db";
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
    const data = await db.select().from(packages);
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
        minimumDp: body.minimumDp ?? null,
        dpDeadlineDays: body.dpDeadlineDays ?? null,
        fullDeadlineDays: body.fullDeadlineDays ?? null,
        isActive: body.isActive,
      })
      .returning();

    res.status(201).json(PackageSchema.parse(created));
  } catch {
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
      .set(updates)
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

export default router;
