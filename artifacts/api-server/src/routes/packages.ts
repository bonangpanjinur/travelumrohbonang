import { Router, type Request, type Response } from "express";
import {
  db,
  packages,
  packageDepartures,
  departurePrices,
  hotels,
  airlines,
  airports,
  packageCategories,
  packageReviews,
  profiles,
  eq,
  and,
  desc,
  sql,
} from "@workspace/db";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "../lib/supabaseEnv";
import { shouldUseSupabaseHttp } from "../lib/dbFlags";

const router = Router();

// When DATABASE_URL is absent or points to a Replit-internal host ("helium"),
// the pg pool can't connect from Vercel — fall back to Supabase PostgREST HTTP.
const USE_SUPABASE_HTTP = shouldUseSupabaseHttp();

// Every packages.* -> {category,hotel,airline,airport} relation has TWO foreign
// key constraints in the live DB (a hand-named one and Postgres's default
// `<table>_<col>_fkey`), so PostgREST embeds must disambiguate with `!fkName`
// or they fail with PGRST201 ("more than one relationship was found").
const PKG_EMBED_SELECT =
  "*," +
  "category:package_categories!packages_category_id_fkey(id,name,parent_id)," +
  "hotel_makkah:hotels!packages_hotel_makkah_id_fkey(id,name,star:stars,city,description)," +
  "hotel_madinah:hotels!packages_hotel_madinah_id_fkey(id,name,star:stars,city,description)," +
  "airline:airlines!packages_airline_id_fkey(id,name,code)," +
  "airport:airports!packages_airport_id_fkey(id,name,code,city)," +
  "departures:package_departures!package_departures_package_id_fkey(id,departure_date,return_date,quota,remaining_quota,status,muthawif_id,prices:departure_prices!departure_prices_departure_id_fkey(price,room_type))";

async function supabaseGet(path: string): Promise<any> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase not configured: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY missing");
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase REST GET /${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

function mapPkgRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    image_url: row.image_url,
    duration_days: row.duration_days,
    package_type: row.package_type,
    category_id: row.category_id,
    hotel_makkah_id: row.hotel_makkah_id,
    hotel_madinah_id: row.hotel_madinah_id,
    airline_id: row.airline_id,
    airport_id: row.airport_id,
    minimum_dp: row.minimum_dp,
    dp_deadline_days: row.dp_deadline_days,
    full_deadline_days: row.full_deadline_days,
    is_active: row.is_active,
    created_at: row.created_at,
    category: row.category ?? null,
    hotel_makkah: row.hotel_makkah ?? null,
    hotel_madinah: row.hotel_madinah ?? null,
    airline: row.airline ?? null,
    airport: row.airport ?? null,
    departures: (row.departures ?? []).map((d: any) => ({
      id: d.id,
      departure_date: d.departure_date,
      return_date: d.return_date,
      quota: d.quota,
      remaining_quota: d.remaining_quota,
      status: d.status,
      muthawif_id: d.muthawif_id,
      prices: d.prices ?? [],
    })),
  };
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const { type, active } = req.query;

    if (USE_SUPABASE_HTTP) {
      const filters: string[] = [`select=${encodeURIComponent(PKG_EMBED_SELECT)}`];
      if (active !== "false") filters.push("is_active=eq.true");
      if (type && typeof type === "string") filters.push(`package_type=eq.${encodeURIComponent(type)}`);
      const rows = await supabaseGet(`packages?${filters.join("&")}`);
      const data = rows.map(mapPkgRow);
      res.json({ data, total: data.length });
      return;
    }

    const conditions = [];
    if (active !== "false") conditions.push(eq(packages.isActive, true));
    if (type && typeof type === "string") conditions.push(eq(packages.packageType, type));

    const pkgs = await db
      .select()
      .from(packages)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    if (pkgs.length === 0) {
      res.json({ data: [], total: 0 });
      return;
    }

    const [allDeps, allHotels, allAirlines, allAirports, allCats] = await Promise.all([
      db.select().from(packageDepartures),
      db.select().from(hotels),
      db.select().from(airlines),
      db.select().from(airports),
      db.select().from(packageCategories),
    ]);

    const depIds = allDeps.map((d) => d.id);
    const allPrices = depIds.length > 0
      ? await db.select().from(departurePrices)
      : [];

    const pricesByDep = allPrices.reduce<Record<string, typeof allPrices>>((acc, p) => {
      if (!p.departureId) return acc;
      if (!acc[p.departureId]) acc[p.departureId] = [];
      acc[p.departureId].push(p);
      return acc;
    }, {});

    const depsByPkg = allDeps.reduce<Record<string, typeof allDeps>>((acc, d) => {
      if (!d.packageId) return acc;
      if (!acc[d.packageId]) acc[d.packageId] = [];
      acc[d.packageId].push(d);
      return acc;
    }, {});

    const hotelMap = Object.fromEntries(allHotels.map((h) => [h.id, h]));
    const airlineMap = Object.fromEntries(allAirlines.map((a) => [a.id, a]));
    const airportMap = Object.fromEntries(allAirports.map((a) => [a.id, a]));
    const catMap = Object.fromEntries(allCats.map((c) => [c.id, c]));

    const data = pkgs.map((pkg) => {
      const hotelMakkah = pkg.hotelMakkahId ? hotelMap[pkg.hotelMakkahId] : null;
      const airline = pkg.airlineId ? airlineMap[pkg.airlineId] : null;
      const airport = pkg.airportId ? airportMap[pkg.airportId] : null;
      const category = pkg.categoryId ? catMap[pkg.categoryId] : null;
      const deps = (depsByPkg[pkg.id] || []).map((d) => ({
        id: d.id,
        departure_date: d.departureDate,
        return_date: d.returnDate,
        remaining_quota: d.remainingQuota,
        quota: d.quota,
        status: d.status,
        prices: (pricesByDep[d.id] || []).map((p) => ({
          price: p.price,
          room_type: p.roomType,
        })),
      }));

      return {
        id: pkg.id,
        title: pkg.title,
        slug: pkg.slug,
        description: pkg.description,
        image_url: pkg.imageUrl,
        duration_days: pkg.durationDays,
        package_type: pkg.packageType,
        category_id: pkg.categoryId,
        hotel_makkah_id: pkg.hotelMakkahId,
        hotel_madinah_id: pkg.hotelMadinahId,
        airline_id: pkg.airlineId,
        airport_id: pkg.airportId,
        minimum_dp: pkg.minimumDp,
        is_active: pkg.isActive,
        created_at: pkg.createdAt,
        category: category
          ? { id: category.id, name: category.name, parent_id: category.parentId }
          : null,
        hotel_makkah: hotelMakkah
          ? { id: hotelMakkah.id, name: hotelMakkah.name, star: hotelMakkah.stars }
          : null,
        airline: airline ? { id: airline.id, name: airline.name } : null,
        airport: airport ? { id: airport.id, name: airport.name, city: airport.city } : null,
        departures: deps,
      };
    });

    res.json({ data, total: data.length });
  } catch (err: any) {
    console.error("[GET /api/packages] failed:", err);
    res.status(500).json({
      error: "Failed to fetch packages",
      message: process.env.NODE_ENV === "development" ? err?.message : undefined,
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    });
  }
});

router.get("/filter-options", async (req: Request, res: Response) => {
  try {
    if (USE_SUPABASE_HTTP) {
      const [cats, airs, apts] = await Promise.all([
        supabaseGet("package_categories?select=id,name,parent_id&is_active=eq.true"),
        supabaseGet("airlines?select=id,name"),
        supabaseGet("airports?select=id,name,city"),
      ]);
      res.json({
        categories: cats.map((c: any) => ({ id: c.id, name: c.name, parent_id: c.parent_id })),
        airlines: airs.map((a: any) => ({ id: a.id, name: a.name })),
        airports: apts.map((a: any) => ({ id: a.id, name: a.name, city: a.city })),
      });
      return;
    }

    const [cats, airs, apts] = await Promise.all([
      db.select().from(packageCategories).where(eq(packageCategories.isActive, true)),
      db.select().from(airlines),
      db.select().from(airports),
    ]);
    res.json({
      categories: cats.map((c) => ({ id: c.id, name: c.name, parent_id: c.parentId })),
      airlines: airs.map((a) => ({ id: a.id, name: a.name })),
      airports: apts.map((a) => ({ id: a.id, name: a.name, city: a.city })),
    });
  } catch (err: any) {
    console.error("[GET /api/packages/filter-options] failed:", err);
    res.status(500).json({
      error: "Failed to fetch filter options",
      message: process.env.NODE_ENV === "development" ? err?.message : undefined,
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    });
  }
});

router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;

    if (USE_SUPABASE_HTTP) {
      const rows = await supabaseGet(
        `packages?slug=eq.${encodeURIComponent(slug)}&select=${encodeURIComponent(PKG_EMBED_SELECT)}&limit=1`,
      );
      const row = rows[0];
      if (!row) {
        res.status(404).json({ error: "Package not found" });
        return;
      }
      res.json(mapPkgRow(row));
      return;
    }

    const [pkg] = await db
      .select()
      .from(packages)
      .where(eq(packages.slug, slug))
      .limit(1);

    if (!pkg) {
      res.status(404).json({ error: "Package not found" });
      return;
    }

    const [deps, hotelMakkah, hotelMadinah, airline, airport, category] = await Promise.all([
      db.select().from(packageDepartures).where(eq(packageDepartures.packageId, pkg.id)),
      pkg.hotelMakkahId ? db.select().from(hotels).where(eq(hotels.id, pkg.hotelMakkahId)).limit(1) : Promise.resolve([]),
      pkg.hotelMadinahId ? db.select().from(hotels).where(eq(hotels.id, pkg.hotelMadinahId)).limit(1) : Promise.resolve([]),
      pkg.airlineId ? db.select().from(airlines).where(eq(airlines.id, pkg.airlineId)).limit(1) : Promise.resolve([]),
      pkg.airportId ? db.select().from(airports).where(eq(airports.id, pkg.airportId)).limit(1) : Promise.resolve([]),
      pkg.categoryId ? db.select().from(packageCategories).where(eq(packageCategories.id, pkg.categoryId)).limit(1) : Promise.resolve([]),
    ]);

    const departuresWithPrices = await Promise.all(
      deps.map(async (dep) => {
        const prices = await db
          .select()
          .from(departurePrices)
          .where(eq(departurePrices.departureId, dep.id));
        return {
          id: dep.id,
          departure_date: dep.departureDate,
          return_date: dep.returnDate,
          quota: dep.quota,
          remaining_quota: dep.remainingQuota,
          status: dep.status,
          muthawif_id: dep.muthawifId,
          prices: prices.map((p) => ({ price: p.price, room_type: p.roomType })),
        };
      }),
    );

    const h1 = hotelMakkah[0] ?? null;
    const h2 = hotelMadinah[0] ?? null;
    const a = airline[0] ?? null;
    const ap = airport[0] ?? null;
    const cat = category[0] ?? null;

    res.json({
      id: pkg.id,
      title: pkg.title,
      slug: pkg.slug,
      description: pkg.description,
      image_url: pkg.imageUrl,
      duration_days: pkg.durationDays,
      package_type: pkg.packageType,
      category_id: pkg.categoryId,
      hotel_makkah_id: pkg.hotelMakkahId,
      hotel_madinah_id: pkg.hotelMadinahId,
      airline_id: pkg.airlineId,
      airport_id: pkg.airportId,
      minimum_dp: pkg.minimumDp,
      dp_deadline_days: pkg.dpDeadlineDays,
      full_deadline_days: pkg.fullDeadlineDays,
      is_active: pkg.isActive,
      created_at: pkg.createdAt,
      category: cat ? { id: cat.id, name: cat.name, parent_id: cat.parentId } : null,
      hotel_makkah: h1 ? { id: h1.id, name: h1.name, star: h1.stars, city: h1.city, description: h1.description } : null,
      hotel_madinah: h2 ? { id: h2.id, name: h2.name, star: h2.stars, city: h2.city, description: h2.description } : null,
      airline: a ? { id: a.id, name: a.name, code: a.code } : null,
      airport: ap ? { id: ap.id, name: ap.name, code: ap.code, city: ap.city } : null,
      departures: departuresWithPrices,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch package" });
  }
});

router.get("/reviews/:packageId", async (req: Request, res: Response) => {
  try {
    if (USE_SUPABASE_HTTP) {
      const packageId = String(req.params.packageId);
      const reviews = await supabaseGet(
        `package_reviews?select=id,rating,title,comment,created_at,user_id&package_id=eq.${encodeURIComponent(packageId)}&is_approved=eq.true&order=created_at.desc`,
      );
      const userIds = [...new Set(reviews.map((r: any) => r.user_id).filter(Boolean))];
      let profilesById: Record<string, any> = {};
      if (userIds.length > 0) {
        const filter = `id=in.(${userIds.map((id) => `"${id}"`).join(",")})`;
        const profileRows = await supabaseGet(`profiles?select=id,name&${filter}`);
        profilesById = Object.fromEntries(profileRows.map((p: any) => [p.id, p]));
      }
      const data = reviews.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        createdAt: r.created_at,
        userName: profilesById[r.user_id]?.name ?? null,
      }));
      res.json({ data });
      return;
    }

    const data = await db
      .select({
        id: packageReviews.id,
        rating: packageReviews.rating,
        title: packageReviews.title,
        comment: packageReviews.comment,
        createdAt: packageReviews.createdAt,
        userName: profiles.name,
      })
      .from(packageReviews)
      .leftJoin(profiles, sql`${profiles.id}::text = ${packageReviews.userId}`)
      .where(and(eq(packageReviews.packageId, String(req.params.packageId)), eq(packageReviews.isApproved, true)))
      .orderBy(desc(packageReviews.createdAt));
    res.json({ data });
  } catch (err) {
    console.error("[packages] failed to fetch reviews:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

export default router;
