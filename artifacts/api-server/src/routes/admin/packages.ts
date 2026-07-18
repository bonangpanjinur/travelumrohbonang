import { Router } from "express";
import { db, sql, packages, packageDepartures, departurePrices, packageHotels, packageCommissions, eq, asc, inArray } from "@workspace/db";
import { sendAdminError } from "../../lib/adminApiError";
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

/**
 * GET /api/admin/packages
 *
 * Uses raw SQL (same pattern as dashboard-stats) to avoid Drizzle enumerating
 * every schema column — some columns (hotel_makkah_id, required_doc_types, etc.)
 * may not exist in older DB instances, causing "column does not exist" 500 errors.
 * Only selects the columns required by PackageSchema / the frontend.
 */
router.get("/", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        id,
        title,
        slug,
        description,
        image_url          AS "imageUrl",
        duration_days      AS "durationDays",
        package_type       AS "packageType",
        category_id        AS "categoryId",
        is_active          AS "isActive",
        COALESCE(minimum_dp, 0)        AS "minimumDp",
        COALESCE(dp_deadline_days, 30) AS "dpDeadlineDays",
        COALESCE(full_deadline_days, 7) AS "fullDeadlineDays",
        created_at         AS "createdAt"
      FROM packages
      ORDER BY created_at ASC NULLS LAST
    `);
    const data = result.rows as any[];
    res.json(PackageListResponse.parse({ data, total: data.length }));
  } catch (err) {
    console.error("[packages] GET / error:", err);
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
    return sendAdminError(res, "POST /api/admin/packages", err);
  }
});

/** GET /api/admin/packages/:id/document-requirements */
router.get("/:id/document-requirements", async (req, res) => {
  try {
    const id = req.params.id as string;
    const [pkg] = await db
      .select({ requiredDocTypes: packages.requiredDocTypes })
      .from(packages)
      .where(eq(packages.id, id))
      .limit(1);
    if (!pkg) return res.status(404).json({ error: "Package not found" });
    const types: string[] = pkg.requiredDocTypes
      ? JSON.parse(pkg.requiredDocTypes)
      : ["paspor", "ktp", "foto"];
    return res.json({ packageId: id, requiredDocTypes: types });
  } catch {
    return res.status(500).json({ error: "Failed to fetch document requirements" });
  }
});

/** PATCH /api/admin/packages/:id/document-requirements */
router.patch("/:id/document-requirements", async (req, res) => {
  try {
    const id = req.params.id as string;
    const { requiredDocTypes } = req.body as { requiredDocTypes: string[] };
    if (!Array.isArray(requiredDocTypes) || !requiredDocTypes.every((t) => typeof t === "string")) {
      return res.status(422).json({ error: "requiredDocTypes must be a string array" });
    }
    await db
      .update(packages)
      .set({ requiredDocTypes: JSON.stringify(requiredDocTypes) })
      .where(eq(packages.id, id));
    return res.json({ packageId: id, requiredDocTypes });
  } catch {
    return res.status(500).json({ error: "Failed to update document requirements" });
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

    const departureIds = departures.map((dep) => dep.id);
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

    const departuresWithPrices = departures.map((dep) => ({
      ...dep,
      prices: pricesByDeparture.get(dep.id) ?? [],
    }));

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
          hotelId: r.hotelId ?? r.hotel_id,
          label: r.label ?? null,
          sortOrder: i,
        }))
      );
    }
    res.json({ message: "Extra hotels updated" });
  } catch {
    res.status(500).json({ error: "Failed to update extra hotels" });
  }
});

// ── Commissions ──────────────────────────────────────────────────────────────

/** GET /api/admin/packages/:id/commissions */
router.get("/:id/commissions", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(packageCommissions)
      .where(eq(packageCommissions.packageId, req.params.id))
      .orderBy(asc(packageCommissions.createdAt));
    res.json({ data });
  } catch {
    res.status(500).json({ error: "Failed to fetch commissions" });
  }
});

/**
 * PUT /api/admin/packages/:id/commissions
 * Body: { cabang: number, agen: number, karyawan: number }
 * Upserts ketiga baris komisi berdasarkan label.
 */
router.put("/:id/commissions", async (req, res) => {
  try {
    const packageId = req.params.id as string;
    const body = req.body as Record<string, number>;
    const PIC_TYPES = ["cabang", "agen", "karyawan"] as const;

    await db.transaction(async (tx) => {
      for (const picType of PIC_TYPES) {
        const amount = Number(body[picType] ?? 0);
        const [existing] = await tx
          .select({ id: packageCommissions.id })
          .from(packageCommissions)
          .where(eq(packageCommissions.packageId, packageId))
          // label column stores the pic type key
          .where(eq(packageCommissions.label, picType))
          .limit(1);

        if (existing) {
          await tx
            .update(packageCommissions)
            .set({ commissionAmount: String(amount) })
            .where(eq(packageCommissions.id, existing.id));
        } else {
          await tx.insert(packageCommissions).values({
            id: crypto.randomUUID(),
            packageId,
            label: picType,
            commissionAmount: String(amount),
          });
        }
      }
    });

    res.json({ message: "Commissions updated" });
  } catch (err) {
    console.error("[packages] PUT /:id/commissions:", err);
    res.status(500).json({ error: "Failed to update commissions" });
  }
});

export default router;
