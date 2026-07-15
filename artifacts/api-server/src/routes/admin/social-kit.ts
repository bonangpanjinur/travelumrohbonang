import { Router } from "express";
import { db, packages, packageDepartures, hotels, airlines, eq, asc, sql } from "@workspace/db";
import { aliasedTable } from "drizzle-orm";

const router = Router();

const hotelMakkah = aliasedTable(hotels, "hotel_makkah");
const hotelMadinah = aliasedTable(hotels, "hotel_madinah");

/**
 * GET /api/admin/social-kit/packages
 * List active packages for social kit generation
 */
router.get("/packages", async (_req, res) => {
  try {
    const data = await db
      .select({
        id: packages.id,
        title: packages.title,
        slug: packages.slug,
        durationDays: packages.durationDays,
        imageUrl: packages.imageUrl,
        hotelMakkahName: hotelMakkah.name,
        hotelMadinahName: hotelMadinah.name,
        airlineName: airlines.name,
      })
      .from(packages)
      .leftJoin(hotelMakkah, eq(packages.hotelMakkahId, hotelMakkah.id))
      .leftJoin(hotelMadinah, eq(packages.hotelMadinahId, hotelMadinah.id))
      .leftJoin(airlines, eq(packages.airlineId, airlines.id))
      .where(eq(packages.isActive, true))
      .orderBy(asc(packages.title));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil paket" });
  }
});

/**
 * GET /api/admin/social-kit/packages/:packageId
 * Get package detail with departures for kit generation
 */
router.get("/packages/:packageId", async (req, res) => {
  try {
    const { packageId } = req.params;
    const [pkg] = await db
      .select({
        id: packages.id,
        title: packages.title,
        slug: packages.slug,
        durationDays: packages.durationDays,
        imageUrl: packages.imageUrl,
        hotelMakkahName: hotelMakkah.name,
        hotelMadinahName: hotelMadinah.name,
        airlineName: airlines.name,
      })
      .from(packages)
      .leftJoin(hotelMakkah, eq(packages.hotelMakkahId, hotelMakkah.id))
      .leftJoin(hotelMadinah, eq(packages.hotelMadinahId, hotelMadinah.id))
      .leftJoin(airlines, eq(packages.airlineId, airlines.id))
      .where(eq(packages.id, packageId));

    if (!pkg) return res.status(404).json({ error: "Paket tidak ditemukan" });

    const departures = await db
      .select()
      .from(packageDepartures)
      .where(eq(packageDepartures.packageId, packageId))
      .orderBy(asc(packageDepartures.departureDate));

    // Get lowest price for this package
    const priceRows = await db.execute(
      sql`SELECT MIN(dp.price) as min_price FROM departure_prices dp
          INNER JOIN package_departures pd ON dp.departure_id = pd.id
          WHERE pd.package_id = ${packageId}`,
    );
    const minPrice = (priceRows.rows?.[0] as any)?.min_price;

    res.json({ package: { ...pkg, price: minPrice }, departures });
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil detail paket" });
  }
});

/**
 * POST /api/admin/social-kit/generate
 * Generate social media content for a package
 */
router.post("/generate", async (req, res) => {
  try {
    const { packageId, platform, style, departureDate, customNote, priceOverride } = req.body as {
      packageId: string;
      platform: "instagram" | "facebook" | "whatsapp" | "twitter";
      style: "formal" | "casual" | "urgent";
      departureDate?: string;
      customNote?: string;
      priceOverride?: string;
    };

    const [pkg] = await db
      .select({
        id: packages.id,
        title: packages.title,
        durationDays: packages.durationDays,
        hotelMakkahName: hotelMakkah.name,
        hotelMadinahName: hotelMadinah.name,
        airlineName: airlines.name,
      })
      .from(packages)
      .leftJoin(hotelMakkah, eq(packages.hotelMakkahId, hotelMakkah.id))
      .leftJoin(hotelMadinah, eq(packages.hotelMadinahId, hotelMadinah.id))
      .leftJoin(airlines, eq(packages.airlineId, airlines.id))
      .where(eq(packages.id, packageId));

    if (!pkg) return res.status(404).json({ error: "Paket tidak ditemukan" });

    let price = priceOverride ?? "-";
    if (!priceOverride) {
      const priceRows = await db.execute(
        sql`SELECT MIN(dp.price) as min_price FROM departure_prices dp
            INNER JOIN package_departures pd ON dp.departure_id = pd.id
            WHERE pd.package_id = ${packageId}`,
      );
      const minPrice = (priceRows.rows?.[0] as any)?.min_price;
      if (minPrice) price = Number(minPrice).toLocaleString("id-ID");
    }

    const duration = pkg.durationDays ? `${pkg.durationDays} hari` : "-";
    const departure = departureDate
      ? new Date(departureDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : "Segera";

    const kits = generateSocialKits({
      title: pkg.title,
      price,
      duration,
      airline: pkg.airlineName ?? undefined,
      hotelMakkah: pkg.hotelMakkahName ?? undefined,
      hotelMadinah: pkg.hotelMadinahName ?? undefined,
      departure,
      platform,
      style,
      customNote,
    });

    res.json(kits);
  } catch (err) {
    res.status(500).json({ error: "Gagal generate konten" });
  }
});

// ─── Template Generator ───────────────────────────────────────────────────────

interface KitParams {
  title: string;
  price: string;
  duration: string;
  airline?: string;
  hotelMakkah?: string;
  hotelMadinah?: string;
  departure: string;
  platform: string;
  style: string;
  customNote?: string;
}

function generateSocialKits(p: KitParams) {
  const e = {
    formal: { star: "✨", pray: "🕌", check: "✅", arrow: "👉", fire: "📣" },
    casual: { star: "⭐", pray: "🌙", check: "✔️", arrow: "➡️", fire: "🔥" },
    urgent: { star: "🚨", pray: "🕌", check: "✅", arrow: "👉", fire: "🔥" },
  }[p.style] ?? { star: "✨", pray: "🕌", check: "✅", arrow: "👉", fire: "📣" };

  const hashtagMap: Record<string, string[]> = {
    instagram: ["#UmrohMurah", "#PaketUmroh", "#UmrohIndonesia", "#UmrohTerjangkau", "#TravelUmroh", "#Umroh2026"],
    facebook: ["#UmrohMurah", "#PaketUmroh2026", "#TravelUmroh"],
    whatsapp: [],
    twitter: ["#Umroh", "#TravelUmroh", "#UmrohMurah"],
  };
  const hashtags: string[] = hashtagMap[p.platform] ?? [];

  const tagStr = hashtags.join(" ");
  const hotelLine = p.hotelMakkah ? `${e.check} Hotel Makkah: ${p.hotelMakkah}\n` : "";
  const hotelMadLine = p.hotelMadinah ? `${e.check} Hotel Madinah: ${p.hotelMadinah}\n` : "";
  const airlineLine = p.airline ? `${e.check} Maskapai: ${p.airline}\n` : "";
  const noteBlock = p.customNote ? `\n${p.customNote}\n` : "";

  const caption: Record<string, string> = {
    formal: `${e.pray} PAKET UMROH ${p.title.toUpperCase()} ${e.pray}

${e.check} Durasi: ${p.duration}
${e.check} Harga: Rp ${p.price}
${e.check} Keberangkatan: ${p.departure}
${airlineLine}${hotelLine}${hotelMadLine}${noteBlock}
Hubungi kami untuk informasi dan pendaftaran.

${tagStr}`.trim(),

    casual: `${e.fire} Yuk, wujudkan impian umroh kamu! ${e.pray}

Paket ${p.title} — Harga Terjangkau!

${e.check} ${p.duration} • Rp ${p.price}
${e.check} Berangkat: ${p.departure}
${airlineLine}${hotelLine}${noteBlock}
Seat terbatas! ${e.arrow} DM atau hubungi kami sekarang.

${tagStr}`.trim(),

    urgent: `${e.star} BURUAN! Seat tersisa terbatas! ${e.star}

Paket Umroh ${p.title}
💰 Harga: Rp ${p.price}
📅 Keberangkatan: ${p.departure}
⏰ Durasi: ${p.duration}
${airlineLine}${hotelLine}${noteBlock}
${e.arrow} Daftar sekarang sebelum kehabisan!

${tagStr}`.trim(),
  };

  const waMessage = `Assalamu'alaikum 🌙

Kami ingin menginformasikan paket umroh terbaru kami:

*${p.title}*
💰 Harga: Rp ${p.price}
📅 Keberangkatan: ${p.departure}
⏳ Durasi: ${p.duration}
${p.airline ? `✈️ Maskapai: ${p.airline}\n` : ""}${p.hotelMakkah ? `🏨 Hotel Makkah: ${p.hotelMakkah}\n` : ""}${p.hotelMadinah ? `🏨 Hotel Madinah: ${p.hotelMadinah}\n` : ""}${noteBlock}
Informasi & pendaftaran, hubungi kami sekarang. Jazakallahu khairan 🤲`.trim();

  const storyCaption = `${e.pray} ${p.title}\n💰 Rp ${p.price} | ${p.duration}\n📅 ${p.departure}\n\nSwipe up untuk info lengkap!`;

  return {
    caption: caption[p.style] ?? caption.casual,
    waMessage,
    storyCaption,
    hashtags,
    metadata: { packageTitle: p.title, platform: p.platform, style: p.style, generatedAt: new Date().toISOString() },
  };
}

export default router;
