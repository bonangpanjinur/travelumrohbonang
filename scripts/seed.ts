import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../lib/db/src/schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const now = new Date();

async function seed() {
  console.log("🌱 Mulai seed data...\n");

  // ─── 1. KATEGORI PAKET ─────────────────────────────────────────────
  console.log("1. Menyemai kategori paket...");
  const catUmroh = uid("cat");
  const catHaji = uid("cat");
  const catReg = uid("cat");
  const catPremium = uid("cat");
  const catVip = uid("cat");

  await db.delete(schema.packageCategories);
  await db.insert(schema.packageCategories).values([
    { id: catUmroh, name: "Umroh", description: "Paket perjalanan umroh", icon: "🕋", isActive: true, sortOrder: 1, createdAt: now },
    { id: catHaji, name: "Haji Plus", description: "Paket haji plus & furoda", icon: "🌙", isActive: true, sortOrder: 2, createdAt: now },
    { id: catReg, name: "Reguler", description: "Paket umroh reguler terjangkau", parentId: catUmroh, icon: "⭐", isActive: true, sortOrder: 1, createdAt: now },
    { id: catPremium, name: "Premium", description: "Paket umroh premium bintang 5", parentId: catUmroh, icon: "💎", isActive: true, sortOrder: 2, createdAt: now },
    { id: catVip, name: "VIP", description: "Paket umroh VIP eksklusif", parentId: catUmroh, icon: "👑", isActive: true, sortOrder: 3, createdAt: now },
  ]);
  console.log("   ✓ 5 kategori");

  // ─── 2. HOTEL ─────────────────────────────────────────────────────
  console.log("2. Menyemai hotel...");
  const hotelMakkah1 = uid("htl");
  const hotelMakkah2 = uid("htl");
  const hotelMakkah3 = uid("htl");
  const hotelMadinah1 = uid("htl");
  const hotelMadinah2 = uid("htl");
  const hotelMadinah3 = uid("htl");

  await db.delete(schema.hotels);
  await db.insert(schema.hotels).values([
    { id: hotelMakkah1, name: "Makkah Clock Royal Tower Fairmont", city: "Makkah", stars: 5, description: "Hotel bintang 5 tepat di depan Masjidil Haram, view Kabah langsung dari kamar.", createdAt: now },
    { id: hotelMakkah2, name: "Hilton Makkah Convention Hotel", city: "Makkah", stars: 5, description: "Hotel premium bintang 5 dengan akses mudah ke Masjidil Haram.", createdAt: now },
    { id: hotelMakkah3, name: "Grand Zam-Zam Hotel", city: "Makkah", stars: 4, description: "Hotel bintang 4 bersebelahan langsung dengan Masjidil Haram, pilihan terbaik kelas menengah.", createdAt: now },
    { id: hotelMadinah1, name: "Anwar Al Madinah Mövenpick Hotel", city: "Madinah", stars: 5, description: "Hotel bintang 5 sangat dekat Masjid Nabawi, fasilitas lengkap.", createdAt: now },
    { id: hotelMadinah2, name: "Al Madinah Hilton Hotel", city: "Madinah", stars: 5, description: "Hotel premium bintang 5 di pusat kota Madinah, 5 menit dari Masjid Nabawi.", createdAt: now },
    { id: hotelMadinah3, name: "Dar Al Taqwa Hotel", city: "Madinah", stars: 4, description: "Hotel bintang 4 dengan lokasi strategis dekat Masjid Nabawi.", createdAt: now },
  ]);
  console.log("   ✓ 6 hotel");

  // ─── 3. MASKAPAI ──────────────────────────────────────────────────
  console.log("3. Menyemai maskapai...");
  const airlineGA = uid("air");
  const airlineSV = uid("air");
  const airlineEK = uid("air");
  const airlineQG = uid("air");

  await db.delete(schema.airlines);
  await db.insert(schema.airlines).values([
    { id: airlineGA, name: "Garuda Indonesia", code: "GA", createdAt: now },
    { id: airlineSV, name: "Saudia Airlines", code: "SV", createdAt: now },
    { id: airlineEK, name: "Emirates", code: "EK", createdAt: now },
    { id: airlineQG, name: "Citilink", code: "QG", createdAt: now },
  ]);
  console.log("   ✓ 4 maskapai");

  // ─── 4. BANDARA ───────────────────────────────────────────────────
  console.log("4. Menyemai bandara...");
  const aptCGK = uid("apt");
  const aptJOG = uid("apt");
  const aptSUB = uid("apt");
  const aptULH = uid("apt");

  await db.delete(schema.airports);
  await db.insert(schema.airports).values([
    { id: aptCGK, name: "Soekarno-Hatta International Airport", code: "CGK", city: "Jakarta", createdAt: now },
    { id: aptJOG, name: "Yogyakarta International Airport", code: "YIA", city: "Yogyakarta", createdAt: now },
    { id: aptSUB, name: "Juanda International Airport", code: "SUB", city: "Surabaya", createdAt: now },
    { id: aptULH, name: "Prince Mohammad bin Abdulaziz Airport", code: "MED", city: "Madinah", createdAt: now },
  ]);
  console.log("   ✓ 4 bandara");

  // ─── 5. MUTHAWIF ─────────────────────────────────────────────────
  console.log("5. Menyemai muthawif...");
  const muthawif1 = uid("mth");
  const muthawif2 = uid("mth");

  await db.delete(schema.muthawifs);
  await db.insert(schema.muthawifs).values([
    { id: muthawif1, name: "Ustaz H. Ahmad Fauzi, Lc.", phone: "08123456001", bio: "Lulusan Universitas Islam Madinah, berpengalaman 15 tahun membimbing jemaah umroh dan haji.", isActive: true, createdAt: now },
    { id: muthawif2, name: "Ustaz H. Ridwan Mustofa, M.Ag.", phone: "08123456002", bio: "Dosen Studi Islam UIN, telah memimpin lebih dari 50 grup umroh selama 12 tahun.", isActive: true, createdAt: now },
  ]);
  console.log("   ✓ 2 muthawif");

  // ─── 6. CABANG ───────────────────────────────────────────────────
  console.log("6. Menyemai cabang...");
  const branchJKT = uid("brc");
  const branchJOG = uid("brc");

  await db.delete(schema.branches);
  await db.insert(schema.branches).values([
    { id: branchJKT, name: "Kantor Pusat Jakarta", address: "Jl. Sudirman No. 45, Jakarta Pusat 10270", phone: "021-55501234", email: "jakarta@umrohplus.co.id", isActive: true, createdAt: now },
    { id: branchJOG, name: "Cabang Yogyakarta", address: "Jl. Malioboro No. 12, Yogyakarta 55271", phone: "0274-555678", email: "jogja@umrohplus.co.id", isActive: true, createdAt: now },
  ]);
  console.log("   ✓ 2 cabang");

  // ─── 7. PAKET UMROH ──────────────────────────────────────────────
  console.log("7. Menyemai paket umroh...");
  const pkgReg9 = uid("pkg");
  const pkgReg12 = uid("pkg");
  const pkgPremium12 = uid("pkg");
  const pkgVip15 = uid("pkg");
  const pkgRamadhan = uid("pkg");

  await db.delete(schema.packages);
  await db.insert(schema.packages).values([
    {
      id: pkgReg9,
      title: "Umroh Reguler 9 Hari",
      slug: "umroh-reguler-9-hari",
      description: "Paket umroh ekonomis 9 hari dengan hotel bintang 4 dekat Masjidil Haram dan Masjid Nabawi. Cocok untuk jemaah yang mengutamakan nilai terbaik.",
      durationDays: 9,
      packageType: "reguler",
      categoryId: catReg,
      hotelMakkahId: hotelMakkah3,
      hotelMadinahId: hotelMadinah3,
      airlineId: airlineQG,
      airportId: aptCGK,
      minimumDp: 5000000,
      dpDeadlineDays: 30,
      fullDeadlineDays: 14,
      isActive: true,
      createdAt: now,
    },
    {
      id: pkgReg12,
      title: "Umroh Reguler 12 Hari",
      slug: "umroh-reguler-12-hari",
      description: "Paket umroh reguler 12 hari dengan waktu ibadah lebih leluasa. Hotel bintang 4, termasuk city tour Makkah dan Madinah.",
      durationDays: 12,
      packageType: "reguler",
      categoryId: catReg,
      hotelMakkahId: hotelMakkah3,
      hotelMadinahId: hotelMadinah3,
      airlineId: airlineGA,
      airportId: aptCGK,
      minimumDp: 5000000,
      dpDeadlineDays: 30,
      fullDeadlineDays: 14,
      isActive: true,
      createdAt: now,
    },
    {
      id: pkgPremium12,
      title: "Umroh Premium 12 Hari",
      slug: "umroh-premium-12-hari",
      description: "Paket umroh premium 12 hari dengan hotel bintang 5 tepat di depan Masjidil Haram. Fasilitas lengkap, pembimbing berpengalaman, dan layanan personal terbaik.",
      durationDays: 12,
      packageType: "premium",
      categoryId: catPremium,
      hotelMakkahId: hotelMakkah2,
      hotelMadinahId: hotelMadinah1,
      airlineId: airlineGA,
      airportId: aptCGK,
      minimumDp: 8000000,
      dpDeadlineDays: 45,
      fullDeadlineDays: 21,
      isActive: true,
      createdAt: now,
    },
    {
      id: pkgVip15,
      title: "Umroh VIP 15 Hari",
      slug: "umroh-vip-15-hari",
      description: "Paket umroh VIP eksklusif 15 hari. Hotel bintang 5 Fairmont Makkah (view Kabah), Mövenpick Madinah, penerbangan Garuda direct flight, dan layanan concierge 24 jam.",
      durationDays: 15,
      packageType: "vip",
      categoryId: catVip,
      hotelMakkahId: hotelMakkah1,
      hotelMadinahId: hotelMadinah1,
      airlineId: airlineGA,
      airportId: aptCGK,
      minimumDp: 15000000,
      dpDeadlineDays: 60,
      fullDeadlineDays: 30,
      isActive: true,
      createdAt: now,
    },
    {
      id: pkgRamadhan,
      title: "Umroh Ramadhan 10 Hari",
      slug: "umroh-ramadhan-10-hari",
      description: "Paket umroh spesial Ramadhan 10 hari. Nikmati berkah bulan suci di tanah haram dengan hotel premium bintang 5 dan bimbingan ustaz berpengalaman.",
      durationDays: 10,
      packageType: "premium",
      categoryId: catPremium,
      hotelMakkahId: hotelMakkah2,
      hotelMadinahId: hotelMadinah2,
      airlineId: airlineSV,
      airportId: aptCGK,
      minimumDp: 10000000,
      dpDeadlineDays: 60,
      fullDeadlineDays: 30,
      isActive: true,
      createdAt: now,
    },
  ]);
  console.log("   ✓ 5 paket");

  // ─── 8. KEBERANGKATAN ─────────────────────────────────────────────
  console.log("8. Menyemai jadwal keberangkatan...");
  const depIds: Record<string, string[]> = {
    [pkgReg9]: [uid("dep"), uid("dep"), uid("dep")],
    [pkgReg12]: [uid("dep"), uid("dep")],
    [pkgPremium12]: [uid("dep"), uid("dep")],
    [pkgVip15]: [uid("dep")],
    [pkgRamadhan]: [uid("dep")],
  };

  const departures = [
    // Reguler 9 Hari — 3 keberangkatan
    { id: depIds[pkgReg9][0], packageId: pkgReg9, departureDate: "2025-08-15", returnDate: "2025-08-24", quota: 45, remainingQuota: 32, status: "open", muthawifId: muthawif1, createdAt: now },
    { id: depIds[pkgReg9][1], packageId: pkgReg9, departureDate: "2025-09-20", returnDate: "2025-09-29", quota: 45, remainingQuota: 45, status: "open", muthawifId: muthawif2, createdAt: now },
    { id: depIds[pkgReg9][2], packageId: pkgReg9, departureDate: "2025-10-18", returnDate: "2025-10-27", quota: 45, remainingQuota: 45, status: "open", muthawifId: muthawif1, createdAt: now },
    // Reguler 12 Hari — 2 keberangkatan
    { id: depIds[pkgReg12][0], packageId: pkgReg12, departureDate: "2025-08-10", returnDate: "2025-08-22", quota: 40, remainingQuota: 28, status: "open", muthawifId: muthawif2, createdAt: now },
    { id: depIds[pkgReg12][1], packageId: pkgReg12, departureDate: "2025-09-08", returnDate: "2025-09-20", quota: 40, remainingQuota: 40, status: "open", muthawifId: muthawif1, createdAt: now },
    // Premium 12 Hari — 2 keberangkatan
    { id: depIds[pkgPremium12][0], packageId: pkgPremium12, departureDate: "2025-08-05", returnDate: "2025-08-17", quota: 30, remainingQuota: 14, status: "open", muthawifId: muthawif1, createdAt: now },
    { id: depIds[pkgPremium12][1], packageId: pkgPremium12, departureDate: "2025-09-15", returnDate: "2025-09-27", quota: 30, remainingQuota: 30, status: "open", muthawifId: muthawif2, createdAt: now },
    // VIP 15 Hari — 1 keberangkatan
    { id: depIds[pkgVip15][0], packageId: pkgVip15, departureDate: "2025-08-20", returnDate: "2025-09-04", quota: 20, remainingQuota: 11, status: "open", muthawifId: muthawif1, createdAt: now },
    // Ramadhan — 1 keberangkatan
    { id: depIds[pkgRamadhan][0], packageId: pkgRamadhan, departureDate: "2026-03-10", returnDate: "2026-03-20", quota: 35, remainingQuota: 35, status: "open", muthawifId: muthawif2, createdAt: now },
  ];

  await db.delete(schema.packageDepartures);
  await db.insert(schema.packageDepartures).values(departures);
  console.log(`   ✓ ${departures.length} jadwal keberangkatan`);

  // ─── 9. HARGA KAMAR ───────────────────────────────────────────────
  console.log("9. Menyemai harga kamar...");
  const prices = [];

  const priceMap: Record<string, Record<string, number>> = {
    [pkgReg9]:     { quad: 24000000, triple: 27000000, double: 31000000 },
    [pkgReg12]:    { quad: 28000000, triple: 31000000, double: 35000000 },
    [pkgPremium12]:{ quad: 39000000, triple: 44000000, double: 51000000 },
    [pkgVip15]:    { triple: 65000000, double: 75000000 },
    [pkgRamadhan]: { quad: 42000000, triple: 48000000, double: 55000000 },
  };

  for (const [pkgId, depDepList] of Object.entries(depIds)) {
    const roomPrices = priceMap[pkgId];
    for (const depId of depDepList) {
      for (const [roomType, price] of Object.entries(roomPrices)) {
        prices.push({ id: uid("prc"), departureId: depId, roomType, price, createdAt: now });
      }
    }
  }

  await db.delete(schema.departurePrices);
  await db.insert(schema.departurePrices).values(prices);
  console.log(`   ✓ ${prices.length} harga kamar`);

  // ─── 10. TESTIMONIAL ──────────────────────────────────────────────
  console.log("10. Menyemai testimonial...");
  await db.delete(schema.testimonials);
  await db.insert(schema.testimonials).values([
    {
      id: uid("tst"),
      name: "Bapak & Ibu Hendra Wijaya",
      location: "Jakarta",
      packageName: "Umroh Premium 12 Hari",
      rating: 5,
      content: "Alhamdulillah, perjalanan umroh kami bersama UmrohPlus sangat berkesan. Hotel sangat dekat Masjidil Haram, ustaz pembimbing sangat sabar dan berpengetahuan luas. Kami merasa terlayani dengan sangat baik sejak keberangkatan hingga kepulangan.",
      travelDate: "Mei 2024",
      isActive: true,
      sortOrder: 1,
      createdAt: now,
    },
    {
      id: uid("tst"),
      name: "Ibu Sari Rahayu",
      location: "Surabaya",
      packageName: "Umroh Reguler 9 Hari",
      rating: 5,
      content: "Ini pertama kali saya umroh dan alhamdulillah semuanya berjalan lancar. Paket reguler tapi pelayanannya premium. Makanan enak, kamar nyaman, dan pembimbing kami sangat membantu. Insya Allah akan kembali lagi dengan keluarga.",
      travelDate: "Maret 2024",
      isActive: true,
      sortOrder: 2,
      createdAt: now,
    },
    {
      id: uid("tst"),
      name: "Keluarga H. Bambang Sutrisno",
      location: "Yogyakarta",
      packageName: "Umroh VIP 15 Hari",
      rating: 5,
      content: "Subhanallah, pengalaman yang luar biasa. Hotel Fairmont dengan view Kabah langsung dari kamar adalah pengalaman tak terlupakan. Tim UmrohPlus sangat profesional dan responsif. Highly recommended untuk keluarga yang ingin ibadah maksimal.",
      travelDate: "Juli 2024",
      isActive: true,
      sortOrder: 3,
      createdAt: now,
    },
    {
      id: uid("tst"),
      name: "Ustazah Nisa Khoirunnisa",
      location: "Bandung",
      packageName: "Umroh Reguler 12 Hari",
      rating: 5,
      content: "Saya sudah 3 kali umroh bersama berbagai travel, dan UmrohPlus adalah yang terbaik. Koordinasi sangat rapi, tidak ada kebingungan selama perjalanan. Doa-doa kami terpanjatkan dengan khusyuk berkat dukungan tim yang luar biasa.",
      travelDate: "April 2024",
      isActive: true,
      sortOrder: 4,
      createdAt: now,
    },
    {
      id: uid("tst"),
      name: "Bapak Dodi Pratama",
      location: "Medan",
      packageName: "Umroh Premium 12 Hari",
      rating: 5,
      content: "Pelayanan prima dari awal hingga akhir. Manasik umroh yang komprehensif membuat kami siap secara mental dan fisik. Hotel bintang 5 dengan fasilitas lengkap. Terima kasih UmrohPlus atas pengalaman spiritual yang tak terlupakan ini.",
      travelDate: "Juni 2024",
      isActive: true,
      sortOrder: 5,
      createdAt: now,
    },
  ]);
  console.log("   ✓ 5 testimonial");

  // ─── 11. FAQ ──────────────────────────────────────────────────────
  console.log("11. Menyemai FAQ...");
  await db.delete(schema.faqs);
  await db.insert(schema.faqs).values([
    {
      id: uid("faq"),
      question: "Apa saja dokumen yang diperlukan untuk umroh?",
      answer: "Dokumen yang diperlukan antara lain: Paspor (masa berlaku minimal 6 bulan), Foto 4x6 background putih, KTP asli, Kartu Keluarga, Akta Nikah (untuk suami-istri), Buku Vaksinasi Meningitis, dan Visa Umroh (diurus oleh travel).",
      scope: "general",
      sortOrder: 1,
      isActive: true,
      createdAt: now,
    },
    {
      id: uid("faq"),
      question: "Berapa lama proses visa umroh?",
      answer: "Proses visa umroh biasanya membutuhkan waktu 7-14 hari kerja setelah semua dokumen lengkap. Kami akan membantu mengurus seluruh proses visa sehingga Anda tidak perlu khawatir.",
      scope: "general",
      sortOrder: 2,
      isActive: true,
      createdAt: now,
    },
    {
      id: uid("faq"),
      question: "Apakah ada biaya tambahan selain harga paket?",
      answer: "Harga paket sudah termasuk tiket pesawat PP, akomodasi hotel, konsumsi (3x makan/hari), transportasi darat selama di Arab Saudi, tour lokal, dan biaya handling. Biaya tambahan meliputi pembuatan paspor baru (jika belum punya), vaksin meningitis, dan oleh-oleh pribadi.",
      scope: "general",
      sortOrder: 3,
      isActive: true,
      createdAt: now,
    },
    {
      id: uid("faq"),
      question: "Bagaimana sistem pembayaran cicilan?",
      answer: "Kami menyediakan kemudahan pembayaran cicilan. Anda cukup membayar DP minimal sesuai paket yang dipilih untuk mengamankan kursi. Sisa pembayaran dapat dicicil hingga 2 minggu sebelum keberangkatan. Tidak ada bunga atau biaya tambahan untuk cicilan.",
      scope: "general",
      sortOrder: 4,
      isActive: true,
      createdAt: now,
    },
    {
      id: uid("faq"),
      question: "Apakah ada pembimbing ibadah selama perjalanan?",
      answer: "Ya, setiap grup akan didampingi oleh muthawif (pembimbing ibadah) berpengalaman yang merupakan lulusan universitas Islam terkemuka. Pembimbing akan memberikan bimbingan ibadah sejak manasik di Indonesia hingga seluruh rangkaian ibadah di Tanah Haram.",
      scope: "general",
      sortOrder: 5,
      isActive: true,
      createdAt: now,
    },
    {
      id: uid("faq"),
      question: "Apakah bisa mendaftar sendiri (tidak ada mahram)?",
      answer: "Untuk wanita di bawah 45 tahun, keberangkatan umroh wajib bersama mahram (suami atau kerabat laki-laki). Wanita berusia 45 tahun ke atas dapat mendaftar tanpa mahram dengan bergabung dalam rombongan resmi travel yang memiliki izin dari Kemenag.",
      scope: "general",
      sortOrder: 6,
      isActive: true,
      createdAt: now,
    },
    {
      id: uid("faq"),
      question: "Bagaimana jika saya sakit selama di perjalanan?",
      answer: "Kami menyediakan tim kesehatan dan pembimbing yang siap membantu. Kami juga merekomendasikan peserta memiliki asuransi perjalanan. Pihak kami akan membantu koordinasi dengan fasilitas kesehatan setempat apabila diperlukan.",
      scope: "general",
      sortOrder: 7,
      isActive: true,
      createdAt: now,
    },
    {
      id: uid("faq"),
      question: "Kapan sebaiknya mendaftar untuk mengamankan kursi?",
      answer: "Kami sangat menyarankan mendaftar minimal 3-4 bulan sebelum jadwal keberangkatan untuk mengamankan kursi dan harga terbaik. Terutama untuk periode high season (Ramadhan, liburan sekolah), kursi bisa habis jauh-jauh hari.",
      scope: "general",
      sortOrder: 8,
      isActive: true,
      createdAt: now,
    },
  ]);
  console.log("   ✓ 8 FAQ");

  // ─── 12. BLOG POST ────────────────────────────────────────────────
  console.log("12. Menyemai artikel blog...");
  await db.delete(schema.blogPosts);
  await db.insert(schema.blogPosts).values([
    {
      id: uid("blg"),
      title: "Panduan Lengkap Persiapan Umroh untuk Pemula",
      slug: "panduan-lengkap-persiapan-umroh-pemula",
      excerpt: "Persiapan umroh tidak hanya soal fisik dan dokumen, tapi juga mental dan spiritual. Simak panduan lengkap untuk jemaah yang pertama kali berangkat umroh.",
      content: "<h2>Persiapan Fisik</h2><p>Umroh membutuhkan stamina yang baik karena Anda akan banyak berjalan. Latih fisik minimal 3 bulan sebelum keberangkatan dengan berjalan kaki minimal 5 km per hari.</p><h2>Persiapan Dokumen</h2><p>Pastikan paspor Anda masih berlaku minimal 6 bulan dari tanggal keberangkatan. Segera urus vaksin meningitis di puskesmas atau klinik terdekat.</p><h2>Persiapan Spiritual</h2><p>Pelajari tata cara umroh, doa-doa, dan amalan sunnah selama di Tanah Haram. Manasik umroh bersama travel Anda akan sangat membantu.</p>",
      category: "panduan",
      author: "Tim UmrohPlus",
      seoTitle: "Panduan Umroh Pemula — Tips & Persiapan Lengkap",
      seoDescription: "Panduan lengkap persiapan umroh untuk pemula: dokumen, fisik, spiritual, dan tips dari para ahli. Baca sebelum berangkat!",
      isPublished: true,
      publishedAt: new Date("2024-06-01"),
      createdAt: now,
    },
    {
      id: uid("blg"),
      title: "5 Tips Ibadah Maksimal di Masjidil Haram",
      slug: "tips-ibadah-maksimal-masjidil-haram",
      excerpt: "Masjidil Haram adalah tempat paling mulia di bumi. Berikut tips agar ibadah Anda semakin bermakna dan khusyuk selama berada di sana.",
      content: "<h2>1. Manfaatkan Waktu Sepi</h2><p>Waktu sepi biasanya dini hari (pukul 02.00-04.00) dan siang hari. Gunakan waktu ini untuk thawaf dan shalat sunnah dengan lebih tenang.</p><h2>2. Perbanyak Doa di Multazam</h2><p>Multazam adalah tempat mustajab antara Hajar Aswad dan pintu Kabah. Jangan lewatkan kesempatan berdoa di sini.</p><h2>3. Shalat di Hijr Ismail</h2><p>Shalat di dalam Hijr Ismail dihitung seperti shalat di dalam Kabah. Manfaatkan waktu-waktu sepi untuk shalat di sini.</p>",
      category: "panduan",
      author: "Ustaz H. Ahmad Fauzi, Lc.",
      isPublished: true,
      publishedAt: new Date("2024-07-15"),
      createdAt: now,
    },
    {
      id: uid("blg"),
      title: "Kenapa Umroh di Bulan Ramadhan Sangat Istimewa?",
      slug: "keutamaan-umroh-di-bulan-ramadhan",
      excerpt: "Rasulullah SAW bersabda bahwa umroh di bulan Ramadhan pahalanya setara dengan haji. Simak keutamaan dan keistimewaan umroh Ramadhan.",
      content: "<h2>Hadits Keutamaan Umroh Ramadhan</h2><p>Dari Ibnu Abbas RA, Rasulullah SAW bersabda: 'Umroh di bulan Ramadhan setara dengan haji bersamaku.' (HR. Bukhari dan Muslim)</p><h2>Suasana yang Berbeda</h2><p>Suasana Masjidil Haram di bulan Ramadhan sangat berbeda. Jutaan jemaah dari seluruh dunia berkumpul, membuat atmosfer ibadah semakin terasa.</p><h2>Tips Umroh Ramadhan</h2><p>Rencanakan keberangkatan di 10 hari terakhir Ramadhan untuk mendapatkan malam Lailatul Qadar.</p>",
      category: "religi",
      author: "Tim UmrohPlus",
      isPublished: true,
      publishedAt: new Date("2024-03-01"),
      createdAt: now,
    },
  ]);
  console.log("   ✓ 3 artikel blog");

  // ─── 13. GALERI ───────────────────────────────────────────────────
  console.log("13. Menyemai galeri...");
  await db.delete(schema.gallery);
  await db.insert(schema.gallery).values([
    { id: uid("gal"), title: "Masjidil Haram dari udara", category: "makkah", imageUrl: "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=800", sortOrder: 1, isActive: true, createdAt: now },
    { id: uid("gal"), title: "Kabah di malam hari", category: "makkah", imageUrl: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800", sortOrder: 2, isActive: true, createdAt: now },
    { id: uid("gal"), title: "Masjid Nabawi Madinah", category: "madinah", imageUrl: "https://images.unsplash.com/photo-1587019158091-1a103c5dd17f?w=800", sortOrder: 3, isActive: true, createdAt: now },
    { id: uid("gal"), title: "Jemaah umroh thawaf", category: "ibadah", imageUrl: "https://images.unsplash.com/photo-1620932434011-c7db96e0e4bf?w=800", sortOrder: 4, isActive: true, createdAt: now },
    { id: uid("gal"), title: "Jabal Nur — Gua Hira", category: "wisata", imageUrl: "https://images.unsplash.com/photo-1569451840618-9a2c6295bcef?w=800", sortOrder: 5, isActive: true, createdAt: now },
    { id: uid("gal"), title: "Suasana iftar di Masjidil Haram", category: "makkah", imageUrl: "https://images.unsplash.com/photo-1608501947097-86951ad73fea?w=800", sortOrder: 6, isActive: true, createdAt: now },
  ]);
  console.log("   ✓ 6 foto galeri");

  // ─── 13B. MATA UANG (MULTI-CURRENCY) ───────────────────────────────
  console.log("13b. Menyemai mata uang...");
  await db.delete(schema.currencies);
  await db.insert(schema.currencies).values([
    { id: uid("cur"), code: "IDR", name: "Rupiah Indonesia", symbol: "Rp", rateToIdr: 1, isDefault: true, isActive: true, createdAt: now },
    { id: uid("cur"), code: "USD", name: "Dolar Amerika", symbol: "$", rateToIdr: 15800, isDefault: false, isActive: true, createdAt: now },
    { id: uid("cur"), code: "SAR", name: "Riyal Saudi", symbol: "﷼", rateToIdr: 4210, isDefault: false, isActive: true, createdAt: now },
    { id: uid("cur"), code: "MYR", name: "Ringgit Malaysia", symbol: "RM", rateToIdr: 3550, isDefault: false, isActive: true, createdAt: now },
    { id: uid("cur"), code: "SGD", name: "Dolar Singapura", symbol: "S$", rateToIdr: 11750, isDefault: false, isActive: true, createdAt: now },
  ]);
  console.log("   ✓ 5 mata uang");

  // ─── 14. PENGATURAN SITUS ─────────────────────────────────────────
  console.log("14. Menyemai pengaturan situs...");
  await db.delete(schema.siteSettings);
  await db.insert(schema.siteSettings).values([
    { id: uid("cfg"), key: "company_name", category: "general", value: "UmrohPlus Travel & Tours", createdAt: now },
    { id: uid("cfg"), key: "company_tagline", category: "general", value: "Wujudkan Ibadah Umroh Impian Anda", createdAt: now },
    { id: uid("cfg"), key: "company_phone", category: "general", value: "+62 21 5550 1234", createdAt: now },
    { id: uid("cfg"), key: "company_whatsapp", category: "general", value: "6281234567890", createdAt: now },
    { id: uid("cfg"), key: "company_email", category: "general", value: "info@umrohplus.co.id", createdAt: now },
    { id: uid("cfg"), key: "company_address", category: "general", value: "Jl. Sudirman No. 45, Jakarta Pusat 10270, Indonesia", createdAt: now },
    { id: uid("cfg"), key: "company_instagram", category: "social", value: "https://instagram.com/umrohplus", createdAt: now },
    { id: uid("cfg"), key: "company_facebook", category: "social", value: "https://facebook.com/umrohplus", createdAt: now },
    { id: uid("cfg"), key: "seo_title", category: "seo", value: "UmrohPlus — Travel Umroh Terpercaya #1 Indonesia", createdAt: now },
    { id: uid("cfg"), key: "seo_description", category: "seo", value: "UmrohPlus menyediakan paket umroh terjangkau hingga VIP dengan bimbingan ustaz berpengalaman, hotel terbaik, dan pelayanan prima. Daftar sekarang!", createdAt: now },
    { id: uid("cfg"), key: "hero_title", category: "homepage", value: "Wujudkan Ibadah Umroh Impian Anda", createdAt: now },
    { id: uid("cfg"), key: "hero_subtitle", category: "homepage", value: "Perjalanan spiritual dengan pelayanan terbaik, bimbingan ustaz berpengalaman, dan hotel bintang 5 dekat Masjidil Haram.", createdAt: now },
    { id: uid("cfg"), key: "stats_jamaah", category: "homepage", value: "12500", createdAt: now },
    { id: uid("cfg"), key: "stats_years", category: "homepage", value: "15", createdAt: now },
    { id: uid("cfg"), key: "stats_rating", category: "homepage", value: "4.9", createdAt: now },
    { id: uid("cfg"), key: "izin_kemenag", category: "legal", value: "D/702/2009", createdAt: now },
    { id: uid("cfg"), key: "iata_number", category: "legal", value: "IATA 02-3-5001", createdAt: now },
  ]);
  console.log("   ✓ 17 pengaturan situs");

  // ─── 15. TENANT SITE ──────────────────────────────────────────────
  console.log("15. Menyemai tenant site utama...");
  await db.delete(schema.tenantSites);
  const mainSiteId = uid("tnnt");
  await db.insert(schema.tenantSites).values([
    {
      id: mainSiteId,
      subdomain: "main",
      siteName: "UmrohPlus Travel & Tours",
      tagline: "Wujudkan Ibadah Umroh Impian Anda",
      primaryColor: "#8B0000",
      secondaryColor: "#D4AF37",
      heroTitle: "Wujudkan Ibadah Umroh Impian Anda",
      heroSubtitle: "Perjalanan spiritual dengan pelayanan terbaik, bimbingan ustaz berpengalaman, dan hotel bintang 5 dekat Masjidil Haram.",
      aboutText: "UmrohPlus Travel & Tours adalah travel umroh dan haji terpercaya berpengalaman lebih dari 15 tahun. Kami telah memberangkatkan lebih dari 12.500 jemaah dengan tingkat kepuasan 4.9/5. Berizin resmi Kemenag RI dan berkomitmen memberikan pengalaman ibadah terbaik.",
      whatsappNumber: "6281234567890",
      phone: "+62 21 5550 1234",
      email: "info@umrohplus.co.id",
      address: "Jl. Sudirman No. 45, Jakarta Pusat 10270",
      instagramUrl: "https://instagram.com/umrohplus",
      facebookUrl: "https://facebook.com/umrohplus",
      isActive: true,
      template: "default",
      createdAt: now,
    },
  ]);
  console.log("   ✓ 1 tenant site");

  await pool.end();

  console.log("\n✅ Seed selesai! Semua data berhasil ditambahkan:");
  console.log("   • 5 kategori paket");
  console.log("   • 6 hotel (Makkah & Madinah)");
  console.log("   • 4 maskapai, 4 bandara");
  console.log("   • 2 muthawif, 2 cabang");
  console.log("   • 5 paket umroh");
  console.log(`   • ${departures.length} jadwal keberangkatan`);
  console.log(`   • ${prices.length} harga kamar`);
  console.log("   • 5 testimonial, 8 FAQ");
  console.log("   • 3 artikel blog, 6 foto galeri");
  console.log("   • 17 pengaturan situs + 1 tenant site");
  console.log("\n💡 Admin user: Daftarkan akun melalui halaman /auth,");
  console.log("   lalu set role admin via kolom user_roles di database.");
}

seed().catch((err) => {
  console.error("❌ Seed gagal:", err);
  process.exit(1);
});
