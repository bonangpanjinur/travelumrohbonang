import { Router, type Request, type Response } from "express";
import {
  db,
  packages,
  packageDepartures,
  departurePrices,
  packageHotels,
  hotels,
  airlines,
  airports,
  packageCategories,
  packageReviews,
  profiles,
  eq,
  and,
  asc,
  desc,
  sql,
  inArray,
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
  "departures:package_departures!package_departures_package_id_fkey(id,departure_date,return_date,quota,remaining_quota,status,muthawif_id,prices:departure_prices!departure_prices_departure_id_fkey(price,room_type))," +
  "extra_hotels:package_hotels!package_hotels_package_id_fkey(id,label,sort_order,hotel:hotels!package_hotels_hotel_id_fkey(name,star:stars,city))";

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
    extra_hotels: (row.extra_hotels ?? []).map((eh: any) => ({
      id: eh.id,
      label: eh.label ?? null,
      sort_order: eh.sort_order ?? null,
      hotel: eh.hotel
        ? { name: eh.hotel.name, star: eh.hotel.star ?? null, city: eh.hotel.city ?? null }
        : null,
    })),
  };
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const { type, active } = req.query;

    if (USE_SUPABASE_HTTP) {
      const filters: string[] = [`select=${encodeURIComponent(PKG_EMBED_SELECT)}`];
      // is_active is nullable in the schema — treat NULL as active (IS NOT FALSE).
      // PostgREST OR filter: matches rows where is_active=true OR is_active IS NULL.
      if (active !== "false") filters.push("or=(is_active.eq.true,is_active.is.null)");
      if (type && typeof type === "string") filters.push(`package_type=eq.${encodeURIComponent(type)}`);
      const rows = await supabaseGet(`packages?${filters.join("&")}`);
      const data = rows.map(mapPkgRow);
      res.json({ data, total: data.length });
      return;
    }

    const conditions = [];
    // is_active is nullable — treat NULL as active (IS NOT FALSE matches true + null).
    if (active !== "false") conditions.push(sql`${packages.isActive} IS NOT FALSE`);
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

    const [deps, hotelMakkah, hotelMadinah, airline, airport, category, extraHotelRows] = await Promise.all([
      db.select().from(packageDepartures).where(eq(packageDepartures.packageId, pkg.id)),
      pkg.hotelMakkahId ? db.select().from(hotels).where(eq(hotels.id, pkg.hotelMakkahId)).limit(1) : Promise.resolve([]),
      pkg.hotelMadinahId ? db.select().from(hotels).where(eq(hotels.id, pkg.hotelMadinahId)).limit(1) : Promise.resolve([]),
      pkg.airlineId ? db.select().from(airlines).where(eq(airlines.id, pkg.airlineId)).limit(1) : Promise.resolve([]),
      pkg.airportId ? db.select().from(airports).where(eq(airports.id, pkg.airportId)).limit(1) : Promise.resolve([]),
      pkg.categoryId ? db.select().from(packageCategories).where(eq(packageCategories.id, pkg.categoryId)).limit(1) : Promise.resolve([]),
      db.select().from(packageHotels).where(eq(packageHotels.packageId, pkg.id)).orderBy(asc(packageHotels.sortOrder)),
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

    // Fetch hotel details for extra hotels
    const extraHotelIds = extraHotelRows.map((eh) => eh.hotelId).filter(Boolean);
    const extraHotelDetails = extraHotelIds.length > 0
      ? await db.select().from(hotels).where(sql`${hotels.id} = ANY(ARRAY[${sql.raw(extraHotelIds.map(id => `'${id}'`).join(","))}]::text[])`)
      : [];
    const extraHotelMap = Object.fromEntries(extraHotelDetails.map((h) => [h.id, h]));

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
      extra_hotels: extraHotelRows.map((eh) => {
        const h = extraHotelMap[eh.hotelId];
        return {
          id: eh.id,
          label: eh.label ?? null,
          sort_order: eh.sortOrder ?? null,
          hotel: h ? { name: h.name, star: h.stars ?? null, city: h.city ?? null } : null,
        };
      }),
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

/**
 * GET /api/packages/jadwal
 * Public list of upcoming departures grouped by month, with package info and lowest price.
 * Query params: month (1-12), year (YYYY), packageId
 */
router.get("/jadwal", async (req, res) => {
  try {
    const { month, year, packageId: pkgIdFilter } = req.query as Record<string, string | undefined>;

    const conditions: any[] = [
      sql`${packageDepartures.status} != 'closed'`,
      sql`${packageDepartures.departureDate} >= CURRENT_DATE`,
    ];
    if (pkgIdFilter) conditions.push(eq(packageDepartures.packageId, pkgIdFilter));
    if (year) conditions.push(sql`EXTRACT(YEAR FROM ${packageDepartures.departureDate}) = ${Number(year)}`);
    if (month) conditions.push(sql`EXTRACT(MONTH FROM ${packageDepartures.departureDate}) = ${Number(month)}`);

    const rows = await db
      .select({
        id: packageDepartures.id,
        departureDate: packageDepartures.departureDate,
        returnDate: packageDepartures.returnDate,
        quota: packageDepartures.quota,
        remainingQuota: packageDepartures.remainingQuota,
        status: packageDepartures.status,
        packageId: packages.id,
        packageTitle: packages.title,
        packageSlug: packages.slug,
        packageDuration: packages.durationDays,
      })
      .from(packageDepartures)
      .innerJoin(packages, eq(packageDepartures.packageId, packages.id))
      .where(and(...conditions))
      .orderBy(asc(packageDepartures.departureDate))
      .limit(200);

    // Fetch lowest price per departure
    const depIds = rows.map((r) => r.id);
    const prices = depIds.length
      ? await db
          .select({
            departureId: departurePrices.departureId,
            price: departurePrices.price,
          })
          .from(departurePrices)
          .where(inArray(departurePrices.departureId, depIds))
      : [];

    const priceMap = new Map<string, number>();
    for (const p of prices) {
      const cur = priceMap.get(p.departureId);
      if (cur === undefined || Number(p.price) < cur) {
        priceMap.set(p.departureId, Number(p.price));
      }
    }

    const data = rows.map((r) => ({
      id: r.id,
      departureDate: r.departureDate,
      returnDate: r.returnDate,
      quota: r.quota,
      remainingQuota: r.remainingQuota,
      status: r.status,
      package: {
        id: r.packageId,
        title: r.packageTitle,
        slug: r.packageSlug,
        durationDays: r.packageDuration,
      },
      lowestPrice: priceMap.get(r.id) ?? null,
    }));

    res.json({ data, total: data.length });
  } catch (err) {
    console.error("[packages] jadwal error:", err);
    res.status(500).json({ error: "Failed to fetch jadwal" });
  }
});

export default router;
