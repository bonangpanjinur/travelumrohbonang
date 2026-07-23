import { Router } from "express";
import { db, sql, packages, packageDepartures, departurePrices, departureHotels, packageCommissions, eq, asc, inArray } from "@workspace/db";
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
 * every schema column — only selects the columns required by PackageSchema / the frontend.
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
    const packageId = crypto.randomUUID();

    const created = await db.transaction(async (tx) => {
      const [pkg] = await tx
        .insert(packages)
        .values({
          id: packageId,
          title: body.title,
          slug: body.slug,
          description: body.description ?? null,
          imageUrl: body.imageUrl ?? null,
          durationDays: body.durationDays ?? null,
          packageType: body.packageType ?? null,
          categoryId: body.categoryId ?? null,
          // FASE 1: hotelMakkahId, hotelMadinahId, airlineId, airportId ada di departure
          minimumDp: body.minimumDp ?? null,
          dpDeadlineDays: body.dpDeadlineDays ?? null,
          fullDeadlineDays: body.fullDeadlineDays ?? null,
          isActive: body.isActive,
        })
        .returning();

      return pkg;
    });

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

/**
 * PATCH /api/admin/packages/bulk-status  (P3-07)
 * Body: { ids: string[], isActive: boolean }
 * Bulk-activate or bulk-deactivate packages.
 */
router.patch("/bulk-status", async (req, res) => {
  try {
    const { ids, isActive } = req.body as { ids: string[]; isActive: boolean };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(422).json({ error: "ids harus berupa array dan tidak boleh kosong" });
    }
    if (typeof isActive !== "boolean") {
      return res.status(422).json({ error: "isActive harus boolean" });
    }
    await db.update(packages).set({ isActive }).where(inArray(packages.id, ids));
    return res.json({ updated: ids.length });
  } catch (err) {
    return sendAdminError(res, "PATCH /api/admin/packages/bulk-status", err);
  }
});

router.patch("/:id", validate(AdminUpdatePackageRequest), async (req, res) => {
  try {
    const id = req.params.id as string;
    const updates = req.body as AdminUpdatePackageInput;

    const updated = await db.transaction(async (tx) => {
      const [pkg] = await tx
        .update(packages)
        .set({
          title: updates.title,
          slug: updates.slug,
          description: updates.description,
          imageUrl: updates.imageUrl,
          durationDays: updates.durationDays,
          packageType: updates.packageType,
          categoryId: updates.categoryId,
          minimumDp: updates.minimumDp,
          dpDeadlineDays: updates.dpDeadlineDays,
          fullDeadlineDays: updates.fullDeadlineDays,
          isActive: updates.isActive,
        } as any)
        .where(eq(packages.id, id))
        .returning();

      return pkg ?? null;
    });

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

// ── Extra Hotels (departure_hotels) ─────────────────────────────────────────
// FASE 1: Extra hotels sekarang per-keberangkatan, bukan per-paket.
// Endpoint lama /:packageId/extra-hotels diarahkan ke /:id di bawah untuk
// kompatibilitas; FASE 2 akan mengekspos endpoint ini di departures router.

router.get("/:id/extra-hotels", async (req, res) => {
  // Ambil semua extra hotels dari keberangkatan pertama paket ini
  try {
    const [firstDep] = await db
      .select({ id: packageDepartures.id })
      .from(packageDepartures)
      .where(eq(packageDepartures.packageId, req.params.id))
      .orderBy(asc(packageDepartures.departureDate))
      .limit(1);

    if (!firstDep) return res.json({ data: [] });

    const data = await db
      .select()
      .from(departureHotels)
      .where(eq(departureHotels.departureId, firstDep.id))
      .orderBy(asc(departureHotels.sortOrder));
    res.json({ data });
  } catch {
    res.status(500).json({ error: "Failed to fetch extra hotels" });
  }
});

router.post("/:id/extra-hotels", async (req, res) => {
  // FASE 2 akan mengimplementasikan endpoint ini di departures router.
  // Untuk sementara kembalikan 501 agar frontend tidak diam-diam gagal.
  res.status(501).json({
    error: "Extra hotels sekarang dikelola per keberangkatan. Gunakan endpoint departures.",
    hint: "PATCH /api/admin/departures/:departureId/hotels",
  });
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

/**
 * POST /api/admin/packages/:id/clone  (P3-08)
 * Duplikat paket. Slug dan title diberi suffix " (Kopi)".
 * FASE 1: hotel & maskapai tidak disalin (ada di masing-masing keberangkatan).
 */
router.post("/:id/clone", async (req, res) => {
  try {
    const sourceId = req.params.id as string;

    const cloneQueryResult = await db.execute(sql`
      SELECT
        title, slug, description, image_url, duration_days, package_type,
        category_id, minimum_dp, dp_deadline_days, full_deadline_days, required_doc_types
      FROM packages WHERE id = ${sourceId}
    `);
    const cloneRows = (cloneQueryResult as any).rows ?? cloneQueryResult;
    const src = cloneRows[0] as any;

    if (!src) return res.status(404).json({ error: "Package not found" });
    const newId = crypto.randomUUID();
    const newTitle = `${src.title} (Kopi)`;
    const baseSlug = `${(src.slug || "paket")}-kopi`;
    // Ensure slug uniqueness by appending a short random suffix
    const newSlug = `${baseSlug}-${crypto.randomUUID().substring(0, 4)}`;

    await db.transaction(async (tx) => {
      await tx.insert(packages).values({
        id: newId,
        title: newTitle,
        slug: newSlug,
        description: src.description ?? null,
        imageUrl: src.image_url ?? null,
        durationDays: src.duration_days ?? null,
        packageType: src.package_type ?? null,
        categoryId: src.category_id ?? null,
        minimumDp: src.minimum_dp ?? null,
        dpDeadlineDays: src.dp_deadline_days ?? null,
        fullDeadlineDays: src.full_deadline_days ?? null,
        requiredDocTypes: src.required_doc_types ?? null,
        isActive: false, // kopi dimulai sebagai nonaktif
      });
    });

    res.status(201).json({ id: newId, title: newTitle, slug: newSlug });
  } catch (err) {
    return sendAdminError(res, "POST /api/admin/packages/:id/clone", err);
  }
});

export default router;
