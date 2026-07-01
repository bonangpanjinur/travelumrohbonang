import { Router } from "express";
import { db, packages, packageDepartures, departurePrices, eq, and } from "@workspace/db";
import { PackageListResponse, PackageDetailSchema } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { type, active } = req.query;

    const conditions = [];

    if (active !== "false") {
      conditions.push(eq(packages.isActive, true));
    }

    if (type && typeof type === "string") {
      conditions.push(eq(packages.packageType, type));
    }

    const data = await db
      .select()
      .from(packages)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json(PackageListResponse.parse({ data, total: data.length }));
  } catch {
    res.status(500).json({ error: "Failed to fetch packages" });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const slug = req.params.slug as string;

    const [pkg] = await db
      .select()
      .from(packages)
      .where(eq(packages.slug, slug))
      .limit(1);

    if (!pkg) {
      res.status(404).json({ error: "Package not found" });
      return;
    }

    const departures = await db
      .select()
      .from(packageDepartures)
      .where(eq(packageDepartures.packageId, pkg.id));

    const departuresWithPrices = await Promise.all(
      departures.map(async (dep) => {
        const prices = await db
          .select()
          .from(departurePrices)
          .where(eq(departurePrices.departureId, dep.id));
        return { ...dep, prices };
      }),
    );

    res.json(
      PackageDetailSchema.parse({ ...pkg, departures: departuresWithPrices }),
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch package" });
  }
});

export default router;
