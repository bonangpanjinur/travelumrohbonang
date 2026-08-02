-- ============================================================
--  DEMO SEED DATA — Umroh App (Vins Tour Travel)
--  Untuk keperluan demo klien — data fiktif realistis
--
--  Cara pakai:
--    psql $SUPABASE_DATABASE_URL -f supabase/migrations/20260802999999_demo_seed.sql
--
--  Aman dijalankan ulang (ON CONFLICT DO NOTHING / upsert).
-- ============================================================

BEGIN;

-- ============================================================
-- 1. SITE SETTINGS (CMS — info agen & kontak)
-- ============================================================

INSERT INTO site_settings (id, key, category, value, created_at) VALUES
  ('ss-site-name',       'site_name',       'general',  '"Vins Tour & Travel"',                      NOW()),
  ('ss-site-tagline',    'site_tagline',     'general',  '"Perjalanan Ibadah Terpercaya Sejak 2010"', NOW()),
  ('ss-site-phone',      'contact_phone',    'contact',  '"+62-21-5551234"',                          NOW()),
  ('ss-site-email',      'contact_email',    'contact',  '"info@vinstour.co.id"',                     NOW()),
  ('ss-site-whatsapp',   'whatsapp_number',  'contact',  '"+6281234567890"',                          NOW()),
  ('ss-site-address',    'address',          'contact',  '"Jl. Mangga Dua Raya No. 45, Jakarta Pusat 10730"', NOW()),
  ('ss-site-logo',       'logo_url',         'branding', 'null',                                      NOW()),
  ('ss-site-favicon',    'favicon_url',      'branding', 'null',                                      NOW()),
  ('ss-meta-title',      'meta_title',       'seo',      '"Vins Tour & Travel — Paket Umroh Terpercaya"', NOW()),
  ('ss-meta-desc',       'meta_description', 'seo',      '"Agen perjalanan ibadah umroh & haji terpercaya dengan pengalaman lebih dari 14 tahun melayani jamaah Indonesia."', NOW()),
  ('ss-footer-about',    'footer_about',     'footer',   '"Vins Tour & Travel adalah agen perjalanan umroh resmi berizin Kemenag RI, melayani jamaah dari seluruh Indonesia dengan standar pelayanan premium."', NOW()),
  ('ss-instagram',       'social_instagram', 'social',   '"https://instagram.com/vinstour"',           NOW()),
  ('ss-facebook',        'social_facebook',  'social',   '"https://facebook.com/vinstour"',            NOW()),
  ('ss-youtube',         'social_youtube',   'social',   '"https://youtube.com/@vinstour"',            NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 2. CURRENCIES
-- ============================================================

INSERT INTO currencies (id, code, name, symbol, rate_to_idr, is_default, is_active, created_at) VALUES
  ('cur-idr', 'IDR', 'Rupiah Indonesia',    'Rp',  1,      true,  true, NOW()),
  ('cur-sar', 'SAR', 'Saudi Arabian Riyal', 'SAR', 4350,   false, true, NOW()),
  ('cur-usd', 'USD', 'US Dollar',           '$',   16250,  false, true, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 3. BRANCHES (Kantor Cabang)
-- ============================================================

INSERT INTO branches (id, name, slug, city, region, address, phone, email, opening_hours, is_active, created_at) VALUES
  ('br-jkt',  'Kantor Pusat Jakarta',   'jakarta',   'Jakarta Pusat',  'DKI Jakarta',   'Jl. Mangga Dua Raya No. 45, Jakarta Pusat',  '021-5551234', 'jakarta@vinstour.co.id',  'Sen–Jum 08:00–17:00', true, NOW()),
  ('br-sby',  'Cabang Surabaya',        'surabaya',  'Surabaya',       'Jawa Timur',    'Jl. Basuki Rahmat No. 120, Surabaya',        '031-5552345', 'surabaya@vinstour.co.id', 'Sen–Jum 08:00–17:00', true, NOW()),
  ('br-bdg',  'Cabang Bandung',         'bandung',   'Bandung',        'Jawa Barat',    'Jl. Asia Afrika No. 78, Bandung',            '022-5553456', 'bandung@vinstour.co.id',  'Sen–Jum 08:00–17:00', true, NOW()),
  ('br-mks',  'Cabang Makassar',        'makassar',  'Makassar',       'Sulawesi Selatan', 'Jl. Sam Ratulangi No. 55, Makassar',      '0411-5554567','makassar@vinstour.co.id', 'Sen–Jum 08:00–17:00', true, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 4. HOTELS
-- ============================================================

INSERT INTO hotels (id, name, city, stars, description, created_at) VALUES
  -- Makkah
  ('htl-hilton-makkah',   'Hilton Suites Makkah',      'Makkah',  5, 'Hotel bintang 5 berhadapan langsung dengan Masjidil Haram, jarak 200 meter dari pintu utama.', NOW()),
  ('htl-pullman-makkah',  'Pullman Zamzam Makkah',     'Makkah',  5, 'Hotel premium dengan fasilitas lengkap, akses mudah ke Masjidil Haram, area Zamzam Tower.', NOW()),
  ('htl-swissotel-makkah','Swissotel Al Maqam Makkah', 'Makkah',  5, 'Hotel Swiss bintang 5 di jantung kawasan Abraj Al-Bait, pemandangan Ka''bah dari kamar.', NOW()),
  ('htl-movenpick-makkah','Mövenpick Makkah',          'Makkah',  5, 'Hotel modern bintang 5, walking distance ke Masjidil Haram sekitar 5 menit.', NOW()),
  ('htl-dallah-makkah',   'Dallah Taibah Hotel',       'Makkah',  4, 'Hotel bintang 4 nyaman dengan harga terjangkau, 800 meter dari Masjidil Haram.', NOW()),
  -- Madinah
  ('htl-anwar-madinah',   'Anwar Al Madinah Mövenpick', 'Madinah', 5, 'Hotel bintang 5 tepat di depan Masjid Nabawi, fasilitas premium untuk kenyamanan jamaah.', NOW()),
  ('htl-pullman-madinah', 'Pullman Zamzam Madinah',    'Madinah', 5, 'Hotel mewah bersebelahan dengan Masjid Nabawi, pelayanan hospitality berkelas.', NOW()),
  ('htl-dar-iman',        'Dar Al Iman Royal',         'Madinah', 4, 'Hotel bintang 4 dengan lokasi strategis dekat Masjid Nabawi, cocok untuk paket ekonomis.', NOW()),
  ('htl-grand-madinah',   'Grand Mercure Madinah',     'Madinah', 5, 'Hotel modern dengan view Masjid Nabawi, fasilitas F&B dan spa tersedia.', NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 5. AIRLINES & AIRPORTS
-- ============================================================

INSERT INTO airlines (id, name, code, created_at) VALUES
  ('arl-garuda',  'Garuda Indonesia',         'GA',  NOW()),
  ('arl-saudi',   'Saudia Airlines',           'SV',  NOW()),
  ('arl-emirates','Emirates',                  'EK',  NOW()),
  ('arl-lionair', 'Lion Air',                  'JT',  NOW()),
  ('arl-batik',   'Batik Air',                 'ID',  NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO airports (id, name, code, city, created_at) VALUES
  ('apt-cgk',  'Soekarno-Hatta International Airport',        'CGK', 'Tangerang / Jakarta',  NOW()),
  ('apt-sub',  'Juanda International Airport',                 'SUB', 'Surabaya',             NOW()),
  ('apt-bdg',  'Husein Sastranegara International Airport',   'BDO', 'Bandung',              NOW()),
  ('apt-upg',  'Sultan Hasanuddin International Airport',     'UPG', 'Makassar',             NOW()),
  ('apt-jed',  'King Abdulaziz International Airport',        'JED', 'Jeddah',               NOW()),
  ('apt-med',  'Prince Mohammad Bin Abdulaziz Airport',       'MED', 'Madinah',              NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 6. PACKAGE CATEGORIES
-- ============================================================

INSERT INTO package_categories (id, name, description, sort_order, is_active, created_at) VALUES
  ('cat-regular',  'Regular',  'Paket umroh standar dengan hotel bintang 4, cocok untuk jamaah dengan anggaran menengah.', 1, true, NOW()),
  ('cat-plus',     'Plus',     'Paket umroh dengan hotel bintang 4+ dan layanan extra, nilai terbaik.', 2, true, NOW()),
  ('cat-vip',      'VIP',      'Paket umroh premium hotel bintang 5, fasilitas dan layanan eksklusif.', 3, true, NOW()),
  ('cat-vvip',     'VVIP',     'Paket umroh ultra-premium dengan hotel terdekat Masjidil Haram, layanan personal.', 4, true, NOW()),
  ('cat-ramadan',  'Ramadan',  'Paket umroh khusus Ramadan dengan suasana spiritual yang tak terlupakan.', 5, true, NOW()),
  ('cat-haji',     'Haji Plus', 'Paket haji plus dengan fasilitas premium dan kuota terjamin.', 6, true, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 7. MUTHAWIF (Pembimbing Ibadah)
-- ============================================================

INSERT INTO muthawifs (id, name, phone, created_at) VALUES
  ('mtw-ustaz-hasan',   'Ustaz H. Muhammad Hasan, Lc.',      '+6281111111001', NOW()),
  ('mtw-ustaz-ridwan',  'Ustaz Ridwan Fauzi, S.Ag., M.Ag.',  '+6281111111002', NOW()),
  ('mtw-ustaz-fadhil',  'Ustaz Ahmad Fadhil Al-Hafidz',      '+6281111111003', NOW()),
  ('mtw-ustaz-yusuf',   'Ustaz Yusuf Mansur, Lc., MA.',      '+6281111111004', NOW()),
  ('mtw-ustazah-siti',  'Ustazah Siti Maryam, S.Ag.',        '+6281111111005', NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 8. EQUIPMENT (Perlengkapan Jamaah)
-- ============================================================

INSERT INTO equipment (id, name, category, description, total_stock, is_active, sort_order, created_at) VALUES
  ('eq-koper',      'Koper 24 inch',          'bagasi',      'Koper hardcase 24 inch branded Vins Tour', 150, true, 1, NOW()),
  ('eq-koper-kabin','Koper Kabin 20 inch',    'bagasi',      'Koper kabin hardcase 20 inch',              80,  true, 2, NOW()),
  ('eq-tas-jinjing','Tas Jinjing Umroh',      'tas',         'Tas kain premium branded Vins Tour',       200, true, 3, NOW()),
  ('eq-baju-ihram', 'Baju Ihram Pria',        'pakaian',     'Kain ihram 100% cotton 2 lembar',          120, true, 4, NOW()),
  ('eq-mukena',     'Mukena Umroh',           'pakaian',     'Mukena travel praktis ringan anti-kusut',  100, true, 5, NOW()),
  ('eq-buku-doa',   'Buku Doa & Panduan',     'perlengkapan','Buku doa umroh lengkap Bahasa Indonesia',  300, true, 6, NOW()),
  ('eq-sabuk-uang', 'Sabuk Uang / Money Belt','perlengkapan','Sabuk anti-kehilangan untuk menyimpan uang', 100, true, 7, NOW()),
  ('eq-masker',     'Masker KN95 (isi 10)',   'kesehatan',   'Masker KN95 untuk perlindungan di tanah suci', 500, true, 8, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 9. PACKAGES
-- ============================================================

INSERT INTO packages (id, title, slug, description, duration_days, package_type, category_id, minimum_dp, dp_deadline_days, full_deadline_days, is_active, required_doc_types, created_at) VALUES

  ('pkg-regular-9',
   'Umroh Regular 9 Hari',
   'umroh-regular-9-hari',
   'Paket umroh ekonomis 9 hari dengan hotel bintang 4 dekat Masjidil Haram. Termasuk visa, tiket PP Garuda Indonesia, akomodasi, konsumsi 3x sehari, dan pembimbing ibadah berpengalaman. Cocok untuk jamaah yang ingin menunaikan ibadah umroh dengan nyaman dan terjangkau.',
   9, 'umroh', 'cat-regular', 5000000, 30, 14, true,
   '["paspor","ktp","foto","vaksin_meningitis","surat_nikah_atau_akta","buku_nikah"]', NOW()),

  ('pkg-plus-12',
   'Umroh Plus 12 Hari',
   'umroh-plus-12-hari',
   'Paket umroh 12 hari dengan hotel bintang 4+ dan program ziarah lengkap. Menikmati lebih banyak waktu beribadah di tanah suci dengan fasilitas yang lebih nyaman. Program mencakup ziarah Makkah, Madinah, dan kunjungan situs bersejarah Islam.',
   12, 'umroh', 'cat-plus', 7500000, 30, 14, true,
   '["paspor","ktp","foto","vaksin_meningitis","surat_nikah_atau_akta"]', NOW()),

  ('pkg-vip-15',
   'Umroh VIP 15 Hari',
   'umroh-vip-15-hari',
   'Pengalaman umroh premium 15 hari di hotel bintang 5 dengan lokasi paling strategis. Nikmati layanan personal, akomodasi mewah berhadapan Masjidil Haram, dan pembimbing private. Termasuk program private tour dan welcome dinner.',
   15, 'umroh', 'cat-vip', 10000000, 45, 21, true,
   '["paspor","ktp","foto","vaksin_meningitis","surat_nikah_atau_akta"]', NOW()),

  ('pkg-ramadan-12',
   'Umroh Ramadan 12 Hari',
   'umroh-ramadan-12-hari',
   'Paket umroh spesial Ramadan 12 hari. Rasakan suasana Ramadan yang luar biasa di Makkah dan Madinah — shalat tarawih di Masjidil Haram, buka puasa bersama jutaan jamaah, dan malam lailatul qadar. Pengalaman spiritual tak terlupakan seumur hidup.',
   12, 'umroh', 'cat-ramadan', 8000000, 45, 21, true,
   '["paspor","ktp","foto","vaksin_meningitis"]', NOW()),

  ('pkg-vvip-10',
   'Umroh VVIP 10 Hari — Tower Zamzam',
   'umroh-vvip-10-hari-tower-zamzam',
   'Paket eksklusif VVIP 10 hari di Swissotel Makkah (Abraj Al-Bait Tower) — kamar dengan pemandangan Ka''bah langsung. Fasilitas butler service, airport transfer private, dan program ibadah yang disesuaikan. Untuk 4 pax minimum.',
   10, 'umroh', 'cat-vvip', 15000000, 60, 30, true,
   '["paspor","ktp","foto","vaksin_meningitis","surat_nikah_atau_akta"]', NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 10. PACKAGE DEPARTURES (Jadwal Keberangkatan)
-- ============================================================

INSERT INTO package_departures (id, package_id, departure_date, return_date, quota, remaining_quota, status, muthawif_id, airline_id, flight_number, departure_airport_id, arrival_airport_id, hotel_makkah_id, hotel_madinah_id, departure_type, created_at) VALUES

  -- Regular 9 Hari — 3 keberangkatan
  ('dep-r9-sep25', 'pkg-regular-9', '2025-09-15', '2025-09-23', 45, 3,  'selesai',  'mtw-ustaz-hasan',  'arl-garuda', 'GA-980', 'apt-cgk', 'apt-jed', 'htl-dallah-makkah',    'htl-dar-iman',       'direct', NOW()),
  ('dep-r9-nov25', 'pkg-regular-9', '2025-11-10', '2025-11-18', 45, 12, 'selesai',  'mtw-ustaz-ridwan', 'arl-garuda', 'GA-980', 'apt-cgk', 'apt-jed', 'htl-dallah-makkah',    'htl-dar-iman',       'direct', NOW()),
  ('dep-r9-jan26', 'pkg-regular-9', '2026-01-20', '2026-01-28', 45, 18, 'aktif',    'mtw-ustaz-hasan',  'arl-garuda', 'GA-980', 'apt-cgk', 'apt-jed', 'htl-dallah-makkah',    'htl-dar-iman',       'direct', NOW()),
  ('dep-r9-mar26', 'pkg-regular-9', '2026-03-10', '2026-03-18', 45, 40, 'aktif',    'mtw-ustaz-fadhil', 'arl-garuda', 'GA-982', 'apt-cgk', 'apt-jed', 'htl-movenpick-makkah', 'htl-dar-iman',       'direct', NOW()),
  ('dep-r9-may26', 'pkg-regular-9', '2026-05-05', '2026-05-13', 45, 45, 'aktif',    'mtw-ustaz-ridwan', 'arl-garuda', 'GA-980', 'apt-cgk', 'apt-jed', 'htl-dallah-makkah',    'htl-dar-iman',       'direct', NOW()),
  ('dep-r9-aug26', 'pkg-regular-9', '2026-08-20', '2026-08-28', 50, 50, 'aktif',    'mtw-ustaz-hasan',  'arl-garuda', 'GA-980', 'apt-cgk', 'apt-jed', 'htl-dallah-makkah',    'htl-dar-iman',       'direct', NOW()),

  -- Plus 12 Hari — 3 keberangkatan
  ('dep-p12-oct25', 'pkg-plus-12', '2025-10-05', '2025-10-16', 40, 5,  'selesai',  'mtw-ustaz-yusuf',   'arl-saudi', 'SV-820', 'apt-cgk', 'apt-med', 'htl-pullman-makkah',   'htl-pullman-madinah','direct', NOW()),
  ('dep-p12-feb26', 'pkg-plus-12', '2026-02-14', '2026-02-25', 40, 22, 'aktif',    'mtw-ustaz-yusuf',   'arl-saudi', 'SV-820', 'apt-cgk', 'apt-med', 'htl-pullman-makkah',   'htl-pullman-madinah','direct', NOW()),
  ('dep-p12-jun26', 'pkg-plus-12', '2026-06-10', '2026-06-21', 40, 40, 'aktif',    'mtw-ustaz-fadhil',  'arl-saudi', 'SV-822', 'apt-cgk', 'apt-med', 'htl-pullman-makkah',   'htl-anwar-madinah',  'direct', NOW()),

  -- VIP 15 Hari — 2 keberangkatan
  ('dep-v15-dec25', 'pkg-vip-15', '2025-12-20', '2026-01-03', 30, 4,  'selesai',  'mtw-ustaz-hasan',   'arl-garuda', 'GA-984', 'apt-cgk', 'apt-jed', 'htl-hilton-makkah',    'htl-anwar-madinah',  'direct', NOW()),
  ('dep-v15-apr26', 'pkg-vip-15', '2026-04-12', '2026-04-26', 30, 25, 'aktif',    'mtw-ustaz-hasan',   'arl-garuda', 'GA-984', 'apt-cgk', 'apt-jed', 'htl-hilton-makkah',    'htl-anwar-madinah',  'direct', NOW()),

  -- Ramadan — 1 keberangkatan
  ('dep-rmdn-mar26','pkg-ramadan-12', '2026-03-18', '2026-03-29', 60, 18, 'aktif',  'mtw-ustaz-hasan',   'arl-garuda', 'GA-986', 'apt-cgk', 'apt-jed', 'htl-swissotel-makkah', 'htl-grand-madinah',  'direct', NOW()),

  -- VVIP 10 Hari — 1 keberangkatan
  ('dep-vvip-sep26','pkg-vvip-10', '2026-09-10', '2026-09-19', 20, 20, 'aktif',    'mtw-ustaz-yusuf',   'arl-emirates','EK-360','apt-cgk', 'apt-jed', 'htl-swissotel-makkah', 'htl-grand-madinah',  'direct', NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 11. DEPARTURE PRICES (Harga per Tipe Kamar)
-- ============================================================

INSERT INTO departure_prices (id, departure_id, room_type, price, created_at) VALUES
  -- Regular 9 Hari (dep-r9-jan26, dep-r9-mar26, dep-r9-may26, dep-r9-aug26)
  ('dp-r9-jan26-quad',   'dep-r9-jan26', 'quad',   23500000, NOW()),
  ('dp-r9-jan26-triple', 'dep-r9-jan26', 'triple', 26500000, NOW()),
  ('dp-r9-jan26-double', 'dep-r9-jan26', 'double', 30500000, NOW()),
  ('dp-r9-jan26-single', 'dep-r9-jan26', 'single', 42000000, NOW()),

  ('dp-r9-mar26-quad',   'dep-r9-mar26', 'quad',   24000000, NOW()),
  ('dp-r9-mar26-triple', 'dep-r9-mar26', 'triple', 27000000, NOW()),
  ('dp-r9-mar26-double', 'dep-r9-mar26', 'double', 31000000, NOW()),
  ('dp-r9-mar26-single', 'dep-r9-mar26', 'single', 43000000, NOW()),

  ('dp-r9-may26-quad',   'dep-r9-may26', 'quad',   24500000, NOW()),
  ('dp-r9-may26-triple', 'dep-r9-may26', 'triple', 27500000, NOW()),
  ('dp-r9-may26-double', 'dep-r9-may26', 'double', 32000000, NOW()),
  ('dp-r9-may26-single', 'dep-r9-may26', 'single', 44000000, NOW()),

  ('dp-r9-aug26-quad',   'dep-r9-aug26', 'quad',   25000000, NOW()),
  ('dp-r9-aug26-triple', 'dep-r9-aug26', 'triple', 28500000, NOW()),
  ('dp-r9-aug26-double', 'dep-r9-aug26', 'double', 33000000, NOW()),
  ('dp-r9-aug26-single', 'dep-r9-aug26', 'single', 46000000, NOW()),

  -- Plus 12 Hari (dep-p12-feb26, dep-p12-jun26)
  ('dp-p12-feb26-quad',   'dep-p12-feb26', 'quad',   31500000, NOW()),
  ('dp-p12-feb26-triple', 'dep-p12-feb26', 'triple', 35000000, NOW()),
  ('dp-p12-feb26-double', 'dep-p12-feb26', 'double', 41000000, NOW()),
  ('dp-p12-feb26-single', 'dep-p12-feb26', 'single', 57000000, NOW()),

  ('dp-p12-jun26-quad',   'dep-p12-jun26', 'quad',   32500000, NOW()),
  ('dp-p12-jun26-triple', 'dep-p12-jun26', 'triple', 36000000, NOW()),
  ('dp-p12-jun26-double', 'dep-p12-jun26', 'double', 42000000, NOW()),
  ('dp-p12-jun26-single', 'dep-p12-jun26', 'single', 59000000, NOW()),

  -- VIP 15 Hari (dep-v15-apr26)
  ('dp-v15-apr26-quad',   'dep-v15-apr26', 'quad',   48000000, NOW()),
  ('dp-v15-apr26-triple', 'dep-v15-apr26', 'triple', 54000000, NOW()),
  ('dp-v15-apr26-double', 'dep-v15-apr26', 'double', 63000000, NOW()),
  ('dp-v15-apr26-single', 'dep-v15-apr26', 'single', 88000000, NOW()),

  -- Ramadan (dep-rmdn-mar26)
  ('dp-rmdn-quad',   'dep-rmdn-mar26', 'quad',   35000000, NOW()),
  ('dp-rmdn-triple', 'dep-rmdn-mar26', 'triple', 39000000, NOW()),
  ('dp-rmdn-double', 'dep-rmdn-mar26', 'double', 46000000, NOW()),
  ('dp-rmdn-single', 'dep-rmdn-mar26', 'single', 65000000, NOW()),

  -- VVIP (dep-vvip-sep26)
  ('dp-vvip-quad',   'dep-vvip-sep26', 'quad',   68000000, NOW()),
  ('dp-vvip-triple', 'dep-vvip-sep26', 'triple', 78000000, NOW()),
  ('dp-vvip-double', 'dep-vvip-sep26', 'double', 95000000, NOW()),
  ('dp-vvip-single', 'dep-vvip-sep26', 'single', 135000000, NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 12. PROFILES (Admin, Agen, Jamaah)
-- ============================================================
-- Catatan: ID ini adalah UUID simulasi — untuk login nyata perlu
-- dihubungkan ke akun Supabase Auth yang sesungguhnya.

INSERT INTO profiles (id, name, email, phone, branch_id, created_at) VALUES
  -- Admin
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Admin Vins Tour',      'admin@vinstour.co.id',       '+6281200000001', 'br-jkt', NOW()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Siti Rahmawati',       'siti.rahma@vinstour.co.id',  '+6281200000002', 'br-jkt', NOW()),
  -- Agen
  ('00000000-0000-0000-0001-000000000001'::uuid, 'Budi Santoso',         'budi.santoso@gmail.com',     '+6281300000001', 'br-jkt', NOW()),
  ('00000000-0000-0000-0001-000000000002'::uuid, 'Dewi Lestari',         'dewi.lestari@gmail.com',     '+6281300000002', 'br-sby', NOW()),
  ('00000000-0000-0000-0001-000000000003'::uuid, 'Rizky Pratama',        'rizky.pratama@gmail.com',    '+6281300000003', 'br-bdg', NOW()),
  -- Jamaah / Customer
  ('00000000-0000-0000-0002-000000000001'::uuid, 'H. Ahmad Fauzan',      'ahmad.fauzan@gmail.com',     '+6281500000001', 'br-jkt', NOW()),
  ('00000000-0000-0000-0002-000000000002'::uuid, 'Hj. Nuraini Wahyudi',  'nuraini.wahyudi@gmail.com',  '+6281500000002', 'br-jkt', NOW()),
  ('00000000-0000-0000-0002-000000000003'::uuid, 'Drs. Bambang Widianto','bambang.widianto@gmail.com', '+6281500000003', 'br-sby', NOW()),
  ('00000000-0000-0000-0002-000000000004'::uuid, 'Sari Indah Permata',   'sari.permata@gmail.com',     '+6281500000004', 'br-sby', NOW()),
  ('00000000-0000-0000-0002-000000000005'::uuid, 'Muhammad Ikhsan',      'ikhsan.mhdz@gmail.com',      '+6281500000005', 'br-bdg', NOW()),
  ('00000000-0000-0000-0002-000000000006'::uuid, 'Fatimah Az-Zahra',     'fatimah.azzahra@gmail.com',  '+6281500000006', 'br-bdg', NOW()),
  ('00000000-0000-0000-0002-000000000007'::uuid, 'Eko Prasetyo',         'eko.prasetyo@yahoo.com',     '+6281500000007', 'br-mks', NOW()),
  ('00000000-0000-0000-0002-000000000008'::uuid, 'Lilis Suryani',        'lilis.suryani@yahoo.com',    '+6281500000008', 'br-mks', NOW()),
  ('00000000-0000-0000-0002-000000000009'::uuid, 'H. Supriyono',         'supriyono.h@gmail.com',      '+6281500000009', 'br-jkt', NOW()),
  ('00000000-0000-0000-0002-000000000010'::uuid, 'Nur Amaliah',          'nur.amaliah89@gmail.com',    '+6281500000010', 'br-jkt', NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 13. USER ROLES
-- ============================================================

INSERT INTO user_roles (id, user_id, role, created_at) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'admin', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002'::uuid, 'admin', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0001-000000000001'::uuid, 'agent', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0001-000000000002'::uuid, 'agent', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0001-000000000003'::uuid, 'agent', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0002-000000000001'::uuid, 'user',  NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0002-000000000002'::uuid, 'user',  NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0002-000000000003'::uuid, 'user',  NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0002-000000000004'::uuid, 'user',  NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0002-000000000005'::uuid, 'user',  NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0002-000000000006'::uuid, 'user',  NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0002-000000000007'::uuid, 'user',  NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0002-000000000008'::uuid, 'user',  NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0002-000000000009'::uuid, 'user',  NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0002-000000000010'::uuid, 'user',  NOW())
ON CONFLICT DO NOTHING;


-- ============================================================
-- 14. AGENTS (Data Agen Penjualan)
-- ============================================================

INSERT INTO agents (id, user_id, branch_id, name, phone, email, referral_code, commission_percent, monthly_target, is_active, created_at) VALUES
  ('agt-budi',  '00000000-0000-0000-0001-000000000001', 'br-jkt', 'Budi Santoso',  '+6281300000001', 'budi.santoso@gmail.com',  'BUDI2024',  2.5, 500000000, true, NOW()),
  ('agt-dewi',  '00000000-0000-0000-0001-000000000002', 'br-sby', 'Dewi Lestari',  '+6281300000002', 'dewi.lestari@gmail.com',  'DEWI2024',  3.0, 400000000, true, NOW()),
  ('agt-rizky', '00000000-0000-0000-0001-000000000003', 'br-bdg', 'Rizky Pratama', '+6281300000003', 'rizky.pratama@gmail.com', 'RIZKY2024', 2.5, 300000000, true, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 15. BOOKINGS (Pemesanan)
-- ============================================================

INSERT INTO bookings (
  id, booking_code, user_id, package_id, departure_id, branch_id, agent_id,
  status, total_price, currency, payment_scheme, pax_count,
  pemesan_name, pemesan_phone, pemesan_email,
  is_group_booking, notes, created_at
) VALUES

  -- ── LUNAS (sudah selesai/bayar) ──────────────────────────────────────────
  ('bk-001', 'VT-2026-0001', '00000000-0000-0000-0002-000000000001', 'pkg-regular-9', 'dep-r9-jan26', 'br-jkt', 'agt-budi',
   'lunas', 47000000, 'IDR', 'lunas', 2,
   'H. Ahmad Fauzan', '+6281500000001', 'ahmad.fauzan@gmail.com', false, NULL, '2025-12-10 09:00:00+07'),

  ('bk-002', 'VT-2026-0002', '00000000-0000-0000-0002-000000000002', 'pkg-regular-9', 'dep-r9-jan26', 'br-jkt', 'agt-budi',
   'lunas', 30500000, 'IDR', 'lunas', 1,
   'Hj. Nuraini Wahyudi', '+6281500000002', 'nuraini.wahyudi@gmail.com', false, NULL, '2025-12-11 10:30:00+07'),

  ('bk-003', 'VT-2026-0003', '00000000-0000-0000-0002-000000000003', 'pkg-plus-12', 'dep-p12-feb26', 'br-sby', 'agt-dewi',
   'lunas', 70000000, 'IDR', 'lunas', 2,
   'Drs. Bambang Widianto', '+6281500000003', 'bambang.widianto@gmail.com', false, 'Suami istri, kamar double', '2026-01-05 08:00:00+07'),

  ('bk-004', 'VT-2026-0004', '00000000-0000-0000-0002-000000000004', 'pkg-vip-15', 'dep-v15-apr26', 'br-sby', 'agt-dewi',
   'lunas', 63000000, 'IDR', 'dp', 1,
   'Sari Indah Permata', '+6281500000004', 'sari.permata@gmail.com', false, NULL, '2026-01-15 14:00:00+07'),

  ('bk-005', 'VT-2026-0005', '00000000-0000-0000-0002-000000000009', 'pkg-ramadan-12', 'dep-rmdn-mar26', 'br-jkt', NULL,
   'lunas', 156000000, 'IDR', 'lunas', 4,
   'H. Supriyono', '+6281500000009', 'supriyono.h@gmail.com', true, 'Rombongan Keluarga Supriyono — 4 orang kamar quad', '2026-01-20 10:00:00+07'),

  -- ── DP DIBAYAR (dalam proses pelunasan) ──────────────────────────────────
  ('bk-006', 'VT-2026-0006', '00000000-0000-0000-0002-000000000005', 'pkg-regular-9', 'dep-r9-mar26', 'br-bdg', 'agt-rizky',
   'dp_paid', 24000000, 'IDR', 'cicilan', 1,
   'Muhammad Ikhsan', '+6281500000005', 'ikhsan.mhdz@gmail.com', false, 'Cicilan 3x — DP sudah masuk', '2026-02-01 09:00:00+07'),

  ('bk-007', 'VT-2026-0007', '00000000-0000-0000-0002-000000000006', 'pkg-plus-12', 'dep-p12-feb26', 'br-bdg', 'agt-rizky',
   'dp_paid', 41000000, 'IDR', 'dp', 1,
   'Fatimah Az-Zahra', '+6281500000006', 'fatimah.azzahra@gmail.com', false, NULL, '2026-02-03 11:00:00+07'),

  ('bk-008', 'VT-2026-0008', '00000000-0000-0000-0002-000000000007', 'pkg-regular-9', 'dep-r9-mar26', 'br-mks', NULL,
   'dp_paid', 48000000, 'IDR', 'cicilan', 2,
   'Eko Prasetyo', '+6281500000007', 'eko.prasetyo@yahoo.com', false, 'Bayar cicilan bulan depan tersisa 2x', '2026-02-05 13:00:00+07'),

  -- ── CONFIRMED (terkonfirmasi, belum bayar DP) ────────────────────────────
  ('bk-009', 'VT-2026-0009', '00000000-0000-0000-0002-000000000008', 'pkg-regular-9', 'dep-r9-may26', 'br-mks', NULL,
   'confirmed', 27500000, 'IDR', 'lunas', 1,
   'Lilis Suryani', '+6281500000008', 'lilis.suryani@yahoo.com', false, NULL, '2026-02-10 08:30:00+07'),

  ('bk-010', 'VT-2026-0010', '00000000-0000-0000-0002-000000000010', 'pkg-vip-15', 'dep-v15-apr26', 'br-jkt', 'agt-budi',
   'confirmed', 54000000, 'IDR', 'dp', 1,
   'Nur Amaliah', '+6281500000010', 'nur.amaliah89@gmail.com', false, 'Minat kamar triple, tunggu konfirmasi', '2026-02-12 10:00:00+07'),

  -- ── PENDING (baru masuk, belum diproses) ─────────────────────────────────
  ('bk-011', 'VT-2026-0011', NULL, 'pkg-ramadan-12', 'dep-rmdn-mar26', 'br-jkt', NULL,
   'pending', 78000000, 'IDR', 'dp', 2,
   'H. Ridwan Kusuma', '+6281555000011', 'ridwan.kusuma@gmail.com', false, 'Tanya via WA, minta kamar double', NOW()),

  ('bk-012', 'VT-2026-0012', NULL, 'pkg-regular-9', 'dep-r9-aug26', 'br-sby', 'agt-dewi',
   'pending', 57000000, 'IDR', 'cicilan', 2,
   'Yuni Astuti', '+6281555000012', 'yuni.astuti@gmail.com', false, NULL, NOW()),

  -- ── CANCELLED ────────────────────────────────────────────────────────────
  ('bk-013', 'VT-2026-0013', NULL, 'pkg-plus-12', 'dep-p12-feb26', 'br-jkt', NULL,
   'cancelled', 35000000, 'IDR', 'lunas', 1,
   'Anton Wijaya', '+6281555000013', 'anton.wijaya@gmail.com', false, 'Dibatalkan karena visa ditolak', '2026-01-25 09:00:00+07'),

  -- ── VVIP ─────────────────────────────────────────────────────────────────
  ('bk-014', 'VT-2026-0014', NULL, 'pkg-vvip-10', 'dep-vvip-sep26', 'br-jkt', 'agt-budi',
   'confirmed', 380000000, 'IDR', 'dp', 4,
   'Ir. Hendro Saputra', '+6281666000014', 'hendro.saputra@company.co.id', true, 'Rombongan direksi perusahaan — 4 orang VVIP quad', NOW()),

  ('bk-015', 'VT-2026-0015', NULL, 'pkg-regular-9', 'dep-r9-may26', 'br-bdg', 'agt-rizky',
   'confirmed', 112000000, 'IDR', 'lunas', 4,
   'KH. Agus Salim', '+6281666000015', 'agus.salim.kh@gmail.com', true, 'Rombongan masjid Al-Furqan 4 jamaah quad', NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 16. BOOKING ROOMS
-- ============================================================

INSERT INTO booking_rooms (id, booking_id, room_type, price, quantity, subtotal, created_at) VALUES
  ('br-001', 'bk-001', 'double', 30500000, 1, 30500000, '2025-12-10 09:00:00+07'), -- +surcharge pasangan
  ('br-002', 'bk-001', 'single', 16500000, 1, 16500000, '2025-12-10 09:00:00+07'), -- total 47jt
  ('br-003', 'bk-002', 'double', 30500000, 1, 30500000, '2025-12-11 10:30:00+07'),
  ('br-004', 'bk-003', 'double', 41000000, 1, 41000000, '2026-01-05 08:00:00+07'),
  ('br-005', 'bk-003', 'quad',   29000000, 1, 29000000, '2026-01-05 08:00:00+07'), -- adjusted price
  ('br-006', 'bk-004', 'double', 63000000, 1, 63000000, '2026-01-15 14:00:00+07'),
  ('br-007', 'bk-005', 'quad',   39000000, 4, 156000000,'2026-01-20 10:00:00+07'),
  ('br-008', 'bk-006', 'quad',   24000000, 1, 24000000, '2026-02-01 09:00:00+07'),
  ('br-009', 'bk-007', 'double', 41000000, 1, 41000000, '2026-02-03 11:00:00+07'),
  ('br-010', 'bk-008', 'triple', 27000000, 2, 54000000, '2026-02-05 13:00:00+07'), -- Adjusted
  ('br-011', 'bk-009', 'triple', 27500000, 1, 27500000, '2026-02-10 08:30:00+07'),
  ('br-012', 'bk-010', 'triple', 54000000, 1, 54000000, '2026-02-12 10:00:00+07'),
  ('br-013', 'bk-014', 'quad',   95000000, 4, 380000000,NOW()),
  ('br-014', 'bk-015', 'quad',   28000000, 4, 112000000,NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 17. BOOKING PILGRIMS (Data Jemaah per Booking)
-- ============================================================

INSERT INTO booking_pilgrims (id, booking_id, name, phone, email, gender, nik, birth_date, nationality, passport_number, passport_expiry, room_type, created_at) VALUES
  -- bk-001 (Ahmad Fauzan + Istrinya)
  ('bp-001a', 'bk-001', 'H. Ahmad Fauzan',        '+6281500000001', 'ahmad.fauzan@gmail.com',     'male',   '3174011501780001', '1978-01-15', 'Indonesia', 'A1234001', '2028-06-30', 'double', '2025-12-10 09:00:00+07'),
  ('bp-001b', 'bk-001', 'Hj. Fatimah Fauzan',     '+6281500000001', 'ahmad.fauzan@gmail.com',     'female', '3174015601800001', '1980-01-16', 'Indonesia', 'A1234002', '2028-07-15', 'double', '2025-12-10 09:00:00+07'),

  -- bk-002 (Nuraini)
  ('bp-002a', 'bk-002', 'Hj. Nuraini Wahyudi',    '+6281500000002', 'nuraini.wahyudi@gmail.com',  'female', '3578014502750001', '1975-02-05', 'Indonesia', 'B2345001', '2028-08-20', 'double', '2025-12-11 10:30:00+07'),

  -- bk-003 (Bambang + Istri)
  ('bp-003a', 'bk-003', 'Drs. Bambang Widianto',  '+6281500000003', 'bambang.widianto@gmail.com', 'male',   '3578012003700001', '1970-03-20', 'Indonesia', 'C3456001', '2027-11-10', 'double', '2026-01-05 08:00:00+07'),
  ('bp-003b', 'bk-003', 'Dra. Sri Widianto',      '+6281500000003', 'bambang.widianto@gmail.com', 'female', '3578015704720001', '1972-04-17', 'Indonesia', 'C3456002', '2027-12-05', 'double', '2026-01-05 08:00:00+07'),

  -- bk-004 (Sari)
  ('bp-004a', 'bk-004', 'Sari Indah Permata',     '+6281500000004', 'sari.permata@gmail.com',     'female', '3578017809900001', '1990-09-18', 'Indonesia', 'D4567001', '2029-03-12', 'double', '2026-01-15 14:00:00+07'),

  -- bk-005 (Keluarga Supriyono — 4 orang)
  ('bp-005a', 'bk-005', 'H. Supriyono',           '+6281500000009', 'supriyono.h@gmail.com',      'male',   '3174010106680001', '1968-06-01', 'Indonesia', 'E5678001', '2029-01-20', 'quad', '2026-01-20 10:00:00+07'),
  ('bp-005b', 'bk-005', 'Hj. Sumiati Supriyono',  '+6281500000009', 'supriyono.h@gmail.com',      'female', '3174014206700001', '1970-06-02', 'Indonesia', 'E5678002', '2029-01-20', 'quad', '2026-01-20 10:00:00+07'),
  ('bp-005c', 'bk-005', 'Rizal Supriyono',        '+6281500009901', NULL,                          'male',   '3174010998980001', '1998-09-09', 'Indonesia', 'E5678003', '2029-02-10', 'quad', '2026-01-20 10:00:00+07'),
  ('bp-005d', 'bk-005', 'Raisa Supriyono',        '+6281500009902', NULL,                          'female', '3174014400010001', '2001-04-04', 'Indonesia', 'E5678004', '2029-02-10', 'quad', '2026-01-20 10:00:00+07'),

  -- bk-006 (Ikhsan)
  ('bp-006a', 'bk-006', 'Muhammad Ikhsan',        '+6281500000005', 'ikhsan.mhdz@gmail.com',      'male',   '3273012502950001', '1995-02-25', 'Indonesia', 'F6789001', '2029-07-05', 'quad', '2026-02-01 09:00:00+07'),

  -- bk-007 (Fatimah)
  ('bp-007a', 'bk-007', 'Fatimah Az-Zahra',       '+6281500000006', 'fatimah.azzahra@gmail.com',  'female', '3273014809930001', '1993-09-08', 'Indonesia', 'G7890001', '2029-04-20', 'double', '2026-02-03 11:00:00+07'),

  -- bk-008 (Eko + 1)
  ('bp-008a', 'bk-008', 'Eko Prasetyo',           '+6281500000007', 'eko.prasetyo@yahoo.com',     'male',   '7471010105820001', '1982-05-01', 'Indonesia', 'H8901001', '2028-09-15', 'triple', '2026-02-05 13:00:00+07'),
  ('bp-008b', 'bk-008', 'Sri Rejeki Prasetyo',    '+6281500000007', NULL,                          'female', '7471014106840001', '1984-06-01', 'Indonesia', 'H8901002', '2028-09-20', 'triple', '2026-02-05 13:00:00+07'),

  -- bk-009 (Lilis)
  ('bp-009a', 'bk-009', 'Lilis Suryani',          '+6281500000008', 'lilis.suryani@yahoo.com',    'female', '7471015607880001', '1988-07-16', 'Indonesia', 'I9012001', '2028-11-30', 'triple', '2026-02-10 08:30:00+07'),

  -- bk-010 (Nur Amaliah)
  ('bp-010a', 'bk-010', 'Nur Amaliah',            '+6281500000010', 'nur.amaliah89@gmail.com',    'female', '3174015701890001', '1989-01-17', 'Indonesia', 'J0123001', '2029-05-11', 'triple', '2026-02-12 10:00:00+07')

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 18. BOOKING PAYMENTS (Riwayat Pembayaran)
-- ============================================================

INSERT INTO booking_payments (id, booking_id, type, amount, paid_at, method, reference_number, notes, is_voided, created_at) VALUES
  -- bk-001 LUNAS
  ('pay-001-dp',  'bk-001', 'dp',         5000000,  '2025-12-10 09:30:00+07', 'transfer', 'TRF20251210001', 'DP awal booking', false, '2025-12-10 09:30:00+07'),
  ('pay-001-lns', 'bk-001', 'pelunasan',  42000000, '2025-12-28 14:00:00+07', 'transfer', 'TRF20251228001', 'Pelunasan sebelum berangkat', false, '2025-12-28 14:00:00+07'),

  -- bk-002 LUNAS
  ('pay-002-lns', 'bk-002', 'lunas',      30500000, '2025-12-12 10:00:00+07', 'transfer', 'TRF20251212001', 'Bayar lunas sekaligus', false, '2025-12-12 10:00:00+07'),

  -- bk-003 LUNAS
  ('pay-003-dp',  'bk-003', 'dp',         7500000,  '2026-01-05 09:00:00+07', 'transfer', 'TRF20260105001', 'DP booking', false, '2026-01-05 09:00:00+07'),
  ('pay-003-lns', 'bk-003', 'pelunasan',  62500000, '2026-01-25 11:00:00+07', 'transfer', 'TRF20260125001', 'Pelunasan', false, '2026-01-25 11:00:00+07'),

  -- bk-004 DP paid
  ('pay-004-dp',  'bk-004', 'dp',         10000000, '2026-01-16 10:00:00+07', 'transfer', 'TRF20260116001', 'DP 15% paket VIP', false, '2026-01-16 10:00:00+07'),
  ('pay-004-c1',  'bk-004', 'cicilan',    20000000, '2026-02-15 10:00:00+07', 'transfer', 'TRF20260215001', 'Cicilan ke-1', false, '2026-02-15 10:00:00+07'),

  -- bk-005 LUNAS
  ('pay-005-dp',  'bk-005', 'dp',         8000000,  '2026-01-20 10:30:00+07', 'qris',     'QRIS202601200001','DP keluarga Supriyono', false, '2026-01-20 10:30:00+07'),
  ('pay-005-c1',  'bk-005', 'cicilan',    50000000, '2026-02-05 08:00:00+07', 'transfer', 'TRF20260205001', 'Cicilan 1 keluarga', false, '2026-02-05 08:00:00+07'),
  ('pay-005-lns', 'bk-005', 'pelunasan',  98000000, '2026-02-25 09:00:00+07', 'transfer', 'TRF20260225001', 'Pelunasan', false, '2026-02-25 09:00:00+07'),

  -- bk-006 DP cicilan
  ('pay-006-dp',  'bk-006', 'dp',         5000000,  '2026-02-01 09:30:00+07', 'transfer', 'TRF20260201001', 'DP cicilan 3x', false, '2026-02-01 09:30:00+07'),

  -- bk-007 DP
  ('pay-007-dp',  'bk-007', 'dp',         7500000,  '2026-02-03 11:30:00+07', 'transfer', 'TRF20260203001', 'DP paket Plus', false, '2026-02-03 11:30:00+07'),

  -- bk-008 DP cicilan
  ('pay-008-dp',  'bk-008', 'dp',         10000000, '2026-02-05 13:30:00+07', 'cash',     NULL,              'DP tunai di kantor Makassar', false, '2026-02-05 13:30:00+07'),
  ('pay-008-c1',  'bk-008', 'cicilan',    15000000, '2026-03-05 10:00:00+07', 'transfer', 'TRF20260305001', 'Cicilan ke-1', false, '2026-03-05 10:00:00+07')

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 19. INSTALLMENT SCHEDULES (Jadwal Cicilan — F-05)
-- ============================================================

INSERT INTO installment_schedules (id, booking_id, installment_number, due_date, amount, status, paid_at, created_at) VALUES
  -- bk-006 cicilan 3x
  ('ins-006-0', 'bk-006', 0, '2026-02-01 00:00:00+07', 5000000,  'paid',    '2026-02-01 09:30:00+07', '2026-02-01 09:00:00+07'),
  ('ins-006-1', 'bk-006', 1, '2026-03-01 00:00:00+07', 9500000,  'overdue', NULL,                     '2026-02-01 09:00:00+07'),
  ('ins-006-2', 'bk-006', 2, '2026-04-01 00:00:00+07', 9500000,  'pending', NULL,                     '2026-02-01 09:00:00+07'),

  -- bk-008 cicilan 3x
  ('ins-008-0', 'bk-008', 0, '2026-02-05 00:00:00+07', 10000000, 'paid',    '2026-02-05 13:30:00+07', '2026-02-05 13:00:00+07'),
  ('ins-008-1', 'bk-008', 1, '2026-03-05 00:00:00+07', 15000000, 'paid',    '2026-03-05 10:00:00+07', '2026-02-05 13:00:00+07'),
  ('ins-008-2', 'bk-008', 2, '2026-04-05 00:00:00+07', 23000000, 'pending', NULL,                     '2026-02-05 13:00:00+07')

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 20. BOOKING STATUS LOGS (Audit Trail)
-- ============================================================

INSERT INTO booking_status_logs (id, booking_id, from_status, to_status, changed_by, notes, created_at) VALUES
  ('sl-001a', 'bk-001', NULL,        'pending',   'system',       'Booking baru dibuat',          '2025-12-10 09:00:00+07'),
  ('sl-001b', 'bk-001', 'pending',   'confirmed', 'admin-siti',   'Dokumen lengkap, dikonfirmasi','2025-12-10 15:00:00+07'),
  ('sl-001c', 'bk-001', 'confirmed', 'dp_paid',   'system',       'DP diterima',                  '2025-12-10 09:35:00+07'),
  ('sl-001d', 'bk-001', 'dp_paid',   'lunas',     'system',       'Pelunasan diterima',           '2025-12-28 14:05:00+07'),
  ('sl-003a', 'bk-003', NULL,        'pending',   'system',       'Booking baru dibuat',          '2026-01-05 08:00:00+07'),
  ('sl-003b', 'bk-003', 'pending',   'confirmed', '00000000-0000-0000-0000-000000000002','Dikonfirmasi admin','2026-01-05 09:00:00+07'),
  ('sl-003c', 'bk-003', 'confirmed', 'dp_paid',   'system',       'DP diterima',                  '2026-01-05 09:05:00+07'),
  ('sl-003d', 'bk-003', 'dp_paid',   'lunas',     'system',       'Pelunasan diterima',           '2026-01-25 11:05:00+07'),
  ('sl-006a', 'bk-006', NULL,        'pending',   'system',       'Booking baru masuk',           '2026-02-01 09:00:00+07'),
  ('sl-006b', 'bk-006', 'pending',   'confirmed', '00000000-0000-0000-0000-000000000001','OK', '2026-02-01 10:00:00+07'),
  ('sl-006c', 'bk-006', 'confirmed', 'dp_paid',   'system',       'DP diterima',                  '2026-02-01 09:35:00+07'),
  ('sl-013a', 'bk-013', NULL,        'pending',   'system',       NULL,                           '2026-01-25 09:00:00+07'),
  ('sl-013b', 'bk-013', 'pending',   'cancelled', '00000000-0000-0000-0000-000000000001','Visa ditolak — di-cancel atas permintaan jamaah','2026-01-26 10:00:00+07')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 21. AGENT COMMISSIONS
-- ============================================================

INSERT INTO agent_commissions (id, booking_id, agent_id, amount, status, created_at) VALUES
  ('ac-001', 'bk-001', 'agt-budi',  1175000, 'paid',    '2025-12-28 15:00:00+07'),
  ('ac-002', 'bk-002', 'agt-budi',  762500,  'paid',    '2025-12-12 11:00:00+07'),
  ('ac-003', 'bk-003', 'agt-dewi',  2100000, 'paid',    '2026-01-25 12:00:00+07'),
  ('ac-004', 'bk-004', 'agt-dewi',  1890000, 'pending', '2026-01-16 11:00:00+07'),
  ('ac-006', 'bk-006', 'agt-rizky', 600000,  'pending', '2026-02-01 10:00:00+07'),
  ('ac-007', 'bk-007', 'agt-rizky', 1025000, 'pending', '2026-02-03 12:00:00+07'),
  ('ac-010', 'bk-010', 'agt-budi',  1350000, 'pending', '2026-02-12 11:00:00+07'),
  ('ac-014', 'bk-014', 'agt-budi',  9500000, 'pending', NOW()),
  ('ac-015', 'bk-015', 'agt-rizky', 2800000, 'pending', NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 22. LEADS / CRM
-- ============================================================

INSERT INTO leads (id, name, phone, email, source, status, package_interest, notes, estimated_value, assigned_to, is_repeat_customer, last_interaction_at, created_at) VALUES
  ('ld-001', 'Ahmad Subhan',      '+6281666100001', 'ahmad.subhan@gmail.com',   'whatsapp',   'hot',         'Umroh Plus 12 Hari',     'Sangat tertarik, tanya harga quad dan triple', 35000000, '00000000-0000-0000-0001-000000000001', false, NOW() - INTERVAL '1 day',  NOW() - INTERVAL '3 days'),
  ('ld-002', 'Rini Handayani',    '+6281666100002', 'rini.handayani@gmail.com', 'instagram',  'warm',        'Umroh Regular 9 Hari',   'Tanya via DM Instagram, minta brosur',          24000000, '00000000-0000-0000-0001-000000000001', false, NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 days'),
  ('ld-003', 'Harjono Saputra',   '+6281666100003', NULL,                       'referral',   'new',         'Umroh VIP 15 Hari',      'Direferensikan oleh H. Ahmad Fauzan (bk-001)',   63000000, '00000000-0000-0000-0001-000000000002', false, NOW() - INTERVAL '1 day',  NOW() - INTERVAL '1 day'),
  ('ld-004', 'Munawaroh',         '+6281666100004', 'muna.waroh@yahoo.com',     'website',    'follow_up',   'Umroh Ramadan 12 Hari',  'Isi form di website, minta info Ramadan',        39000000, '00000000-0000-0000-0001-000000000002', false, NOW() - INTERVAL '4 days', NOW() - INTERVAL '7 days'),
  ('ld-005', 'Suroto Wibowo',     '+6281666100005', NULL,                       'pameran',    'warm',        'Umroh Regular 9 Hari',   'Ketemu di pameran travel, minta follow up',      24000000, '00000000-0000-0000-0001-000000000003', false, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('ld-006', 'H. Zainudin',       '+6281666100006', 'zainudin.h@gmail.com',     'telepon',    'converted',   'Umroh Regular 9 Hari',   'Sudah booking — lihat bk-015',                  112000000,'00000000-0000-0000-0001-000000000003', true,  NOW() - INTERVAL '5 days', NOW() - INTERVAL '10 days'),
  ('ld-007', 'Yusri Nasution',    '+6281666100007', NULL,                       'whatsapp',   'cold',        NULL,                     'Tanya-tanya harga saja, belum ada niat serius',  0,        NULL,                                  false, NOW() - INTERVAL '14 days',NOW() - INTERVAL '14 days'),
  ('ld-008', 'Dr. Arief Budiman', '+6281666100008', 'arief.budiman@rsia.co.id', 'linkedin',   'hot',         'Umroh VVIP Tower Zamzam','Minta penawaran khusus untuk grup dokter 8 orang',608000000,'00000000-0000-0000-0001-000000000001', false, NOW(),                     NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 23. LEAD INTERACTIONS
-- ============================================================

INSERT INTO lead_interactions (id, lead_id, type, summary, outcome, created_by, created_at) VALUES
  ('li-001a', 'ld-001', 'whatsapp', 'Kirim brosur paket Plus 12 Hari. Jamaah tertarik kamar triple.', 'interested',     '00000000-0000-0000-0001-000000000001', NOW() - INTERVAL '3 days'),
  ('li-001b', 'ld-001', 'call',     'Follow up harga — minta diskon. Dijanjikan 3 hari lagi.',        'callback',       '00000000-0000-0000-0001-000000000001', NOW() - INTERVAL '1 day'),
  ('li-002a', 'ld-002', 'whatsapp', 'Kirim e-brochure. Belum bisa memutuskan karena masih diskusi keluarga.','callback', '00000000-0000-0000-0001-000000000001', NOW() - INTERVAL '4 days'),
  ('li-004a', 'ld-004', 'email',    'Balas form website dengan info lengkap paket Ramadan.',          'interested',     '00000000-0000-0000-0001-000000000002', NOW() - INTERVAL '6 days'),
  ('li-004b', 'ld-004', 'call',     'Telepon, tanya kursi tersisa. Informasikan sisa 18 kursi.',      'interested',     '00000000-0000-0000-0001-000000000002', NOW() - INTERVAL '4 days'),
  ('li-006a', 'ld-006', 'whatsapp', 'Kirim penawaran dan info cicilan.',                              'interested',     '00000000-0000-0000-0001-000000000003', NOW() - INTERVAL '9 days'),
  ('li-006b', 'ld-006', 'meeting',  'Meeting di kantor — bahas detail. Langsung booking bk-015.',    'booked',         '00000000-0000-0000-0001-000000000003', NOW() - INTERVAL '7 days'),
  ('li-008a', 'ld-008', 'email',    'Kirim proposal VVIP khusus grup dokter 8 pax.',                  'interested',     '00000000-0000-0000-0001-000000000001', NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 24. COUPONS (Kode Promo)
-- ============================================================

INSERT INTO coupons (id, code, discount_type, value, min_purchase, max_uses, used_count, expired_at, is_active, created_at) VALUES
  ('cpn-ramadan',  'RAMADAN2026',  'percentage', 5,       30000000, 50,  3,  '2026-03-31 23:59:59+07', true,  NOW()),
  ('cpn-earlybird','EARLYBIRD10',  'percentage', 10,      40000000, 20,  2,  '2026-02-28 23:59:59+07', true,  NOW()),
  ('cpn-flat500',  'HEMAT500RB',   'fixed',      500000,  20000000, 100, 8,  '2026-12-31 23:59:59+07', true,  NOW()),
  ('cpn-vip',      'VIPEXCLUSIVE', 'percentage', 7,       50000000, 10,  1,  '2026-06-30 23:59:59+07', true,  NOW()),
  ('cpn-expired',  'LEBARAN2025',  'percentage', 5,       20000000, 30,  15, '2025-05-01 23:59:59+07', false, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 25. TESTIMONIALS (Ulasan Jamaah)
-- ============================================================

INSERT INTO testimonials (id, name, location, package_name, rating, content, travel_date, is_active, sort_order, created_at) VALUES
  ('tst-001', 'H. Ahmad Fauzan',       'Jakarta Timur',   'Umroh Regular 9 Hari',  5, 'Alhamdulillah, perjalanan umroh bersama Vins Tour sangat berkesan. Pembimbing ibadah sangat ramah dan berpengalaman, hotel dekat Masjidil Haram. Sangat recommended!', '2026-01', true, 1, NOW()),
  ('tst-002', 'Hj. Nuraini Wahyudi',   'Bekasi',          'Umroh Regular 9 Hari',  5, 'Pelayanan dari awal pendaftaran hingga kembali ke tanah air sangat memuaskan. Semua terurus dengan baik, kami tinggal fokus ibadah. Terima kasih Vins Tour!', '2026-01', true, 2, NOW()),
  ('tst-003', 'Drs. Bambang Widianto', 'Surabaya',        'Umroh Plus 12 Hari',    5, 'Saya dan istri sudah 2x berangkat bersama Vins Tour. Konsisten dengan kualitas, hotel bintang 4+ sangat nyaman. Program ziarahnya lengkap dan berkesan.', '2026-02', true, 3, NOW()),
  ('tst-004', 'Ibu Sari I. Permata',   'Surabaya Selatan','Umroh VIP 15 Hari',     5, 'Luar biasa! Hotel tepat di depan Masjidil Haram, kamar sangat nyaman dan bersih. Ustadjah pembimbing wanita sangat perhatian. Worth every rupiah!', '2026-03', true, 4, NOW()),
  ('tst-005', 'H. Supriyono',          'Jakarta Selatan', 'Umroh Ramadan 12 Hari', 5, 'Berangkat bersama seluruh keluarga — pengalaman Ramadan di Makkah yang tidak terlupakan. Shalat tarawih di Masjidil Haram bersama jutaan jamaah, subhanallah. Sangat berterima kasih kepada Vins Tour!', '2025-03', true, 5, NOW()),
  ('tst-006', 'Ustaz Andi Rahman',     'Makassar',        'Umroh Plus 12 Hari',    5, 'Saya rekomendasikan Vins Tour kepada jamaah masjid kami. Manajemen perjalanan profesional, pembimbing ibadah sabar dan berilmu. Harga sepadan dengan kualitas.', '2025-10', true, 6, NOW()),
  ('tst-007', 'Hj. Ruqayyah Siregar',  'Medan',           'Umroh Regular 9 Hari',  4, 'Secara keseluruhan bagus. Kamar hotel lumayan, makanan cukup. Sedikit kendala di bagasi tapi cepat diselesaikan oleh tim. Insya Allah mau daftar lagi tahun depan.', '2025-09', true, 7, NOW()),
  ('tst-008', 'Bapak & Ibu Hartono',   'Bandung',         'Umroh VIP 15 Hari',     5, 'Ini perjalanan kami yang ke-3 bersama Vins Tour. Setiap kali berangkat, selalu ada peningkatan kualitas. Masha Allah, terus tingkatkan ya!', '2025-12', true, 8, NOW()),
  ('tst-009', 'DR. Fitri Maharani',    'Jakarta Barat',   'Umroh Plus 12 Hari',    5, 'Paket Plus 12 Hari sangat value for money. Waktu ibadah lebih panjang, program ziarah komprehensif. Ustaz pembimbing sangat berpengetahuan, banyak ilmu yang kami dapatkan.', '2026-01', true, 9, NOW()),
  ('tst-010', 'Kel. Besar Al-Huda',    'Bogor',           'Umroh Regular 9 Hari',  5, 'Rombongan 20 orang dari Majelis Al-Huda, semua merasa puas! Koordinasi Vins Tour sangat baik menangani rombongan besar. Terima kasih banyak, semoga berkah.', '2025-11', true, 10, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 26. BLOG POSTS
-- ============================================================

INSERT INTO blog_posts (id, title, slug, excerpt, content, category, author, is_published, published_at, created_at) VALUES
  ('blog-001',
   'Persiapan Fisik dan Mental Sebelum Umroh: Panduan Lengkap',
   'persiapan-fisik-mental-sebelum-umroh',
   'Ibadah umroh memerlukan persiapan yang matang. Berikut panduan lengkap persiapan fisik dan mental agar ibadah Anda berjalan lancar dan khusyuk.',
   'Ibadah umroh adalah perjalanan suci yang memerlukan persiapan menyeluruh — mulai dari kesehatan fisik hingga kesiapan spiritual. Artikel ini membahas langkah-langkah penting yang perlu Anda lakukan sebelum berangkat umroh...',
   'panduan', 'Tim Vins Tour', true, '2026-01-15 08:00:00+07', '2026-01-14 10:00:00+07'),

  ('blog-002',
   'Perbedaan Kamar Quad, Triple, Double, dan Single di Hotel Tanah Suci',
   'perbedaan-tipe-kamar-hotel-tanah-suci',
   'Bingung memilih tipe kamar untuk umroh? Simak penjelasan lengkap perbedaan kamar quad, triple, double, dan single beserta kelebihan dan kekurangannya.',
   'Salah satu pertanyaan paling umum dari calon jamaah adalah soal tipe kamar hotel. Setiap tipe kamar memiliki kelebihan dan kekurangan tersendiri, disesuaikan dengan kebutuhan dan anggaran Anda...',
   'tips', 'Tim Vins Tour', true, '2026-01-20 08:00:00+07', '2026-01-19 10:00:00+07'),

  ('blog-003',
   'Amalan Sunah yang Bisa Diperbanyak Saat Umroh di Bulan Ramadan',
   'amalan-sunah-umroh-bulan-ramadan',
   'Umroh di bulan Ramadan memiliki keutamaan yang luar biasa. Ketahui amalan-amalan sunah yang bisa diperbanyak untuk memaksimalkan ibadah Anda.',
   'Rasulullah SAW bersabda bahwa umroh di bulan Ramadan setara dengan haji bersamaku (HR. Bukhari & Muslim). Berikut amalan-amalan yang bisa Anda perbanyak...',
   'ibadah', 'Ustaz H. Muhammad Hasan, Lc.', true, '2026-02-01 08:00:00+07', '2026-01-31 10:00:00+07'),

  ('blog-004',
   'Dokumen Wajib Umroh 2026: Checklist Lengkap dan Tips Menghindari Penolakan Visa',
   'dokumen-wajib-umroh-2026',
   'Jangan sampai perjalanan umroh Anda terkendala masalah dokumen. Ikuti checklist lengkap ini dan tips agar visa umroh Anda disetujui.',
   'Persiapan dokumen adalah salah satu aspek terpenting dalam perjalanan umroh. Visa Saudi Arabia untuk umroh memiliki persyaratan yang cukup ketat...',
   'panduan', 'Tim Vins Tour', true, '2026-02-10 08:00:00+07', '2026-02-09 10:00:00+07'),

  ('blog-005',
   '5 Hotel Terbaik di Makkah yang Dekat Masjidil Haram Tahun 2026',
   'hotel-terbaik-makkah-dekat-masjidil-haram-2026',
   'Ingin menginap di hotel yang paling dekat dengan Masjidil Haram? Berikut rekomendasi 5 hotel terbaik pilihan Vins Tour untuk jamaah Indonesia.',
   'Lokasi hotel adalah salah satu faktor terpenting dalam memilih paket umroh. Semakin dekat hotel dengan Masjidil Haram, semakin nyaman ibadah Anda...',
   'rekomendasi', 'Tim Vins Tour', true, '2026-02-15 08:00:00+07', '2026-02-14 10:00:00+07')

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 27. FAQs (Pertanyaan Umum)
-- ============================================================

INSERT INTO faqs (id, question, answer, scope, sort_order, is_active, created_at) VALUES
  ('faq-001', 'Apa saja dokumen yang diperlukan untuk mendaftar umroh?',
   'Dokumen wajib umroh meliputi: (1) Paspor aktif minimal 6 bulan sebelum keberangkatan, (2) KTP asli dan fotokopi, (3) Foto berwarna terbaru ukuran 4×6 cm background putih, (4) Sertifikat vaksin meningitis (wajib), (5) Buku nikah (untuk suami istri), (6) Akta lahir dan kartu keluarga (untuk anak di bawah umur). Dokumen tambahan mungkin diperlukan sesuai ketentuan Kedutaan Saudi Arabia.',
   'general', 1, true, NOW()),

  ('faq-002', 'Berapa lama proses pengurusan visa umroh?',
   'Proses visa umroh biasanya memakan waktu 7–14 hari kerja setelah semua dokumen lengkap. Kami menyarankan untuk melunasi pembayaran dan melengkapi dokumen minimal 1 bulan sebelum keberangkatan agar ada waktu yang cukup jika ada kendala.',
   'general', 2, true, NOW()),

  ('faq-003', 'Apakah bisa daftar umroh dengan sistem cicilan?',
   'Ya, Vins Tour menyediakan fasilitas cicilan yang fleksibel. Anda dapat memulai dengan membayar DP minimal Rp 5.000.000, kemudian melunasi dalam 3–6 cicilan. Hubungi tim kami untuk simulasi cicilan yang sesuai dengan kemampuan Anda.',
   'general', 3, true, NOW()),

  ('faq-004', 'Apa perbedaan paket Regular, Plus, VIP, dan VVIP?',
   'Perbedaan utama ada pada kualitas hotel dan jarak ke Masjidil Haram: Regular (hotel bintang 4, jarak 500–1000m), Plus (hotel bintang 4+, jarak 300–500m, fasilitas lebih baik), VIP (hotel bintang 5, jarak 100–300m, layanan premium), VVIP (hotel bintang 5 paling dekat seperti Swissotel Makkah, view Ka''bah langsung, layanan eksklusif).',
   'general', 4, true, NOW()),

  ('faq-005', 'Berapa lama waktu yang ideal untuk umroh pertama kali?',
   'Untuk umroh pertama kali, kami merekomendasikan paket 12–15 hari agar Anda memiliki waktu yang cukup untuk menikmati ibadah di Makkah dan Madinah tanpa terburu-buru. Paket 9 hari juga cukup bagi jamaah yang sudah pernah umroh sebelumnya.',
   'general', 5, true, NOW()),

  ('faq-006', 'Apakah ada pembimbing ibadah (muthawif) yang mendampingi?',
   'Ya, setiap keberangkatan Vins Tour selalu didampingi oleh muthawif (pembimbing ibadah) bersertifikat dari Kemenag RI. Muthawif kami lulusan pesantren dan perguruan tinggi agama Islam, berpengalaman membimbing jamaah di tanah suci.',
   'general', 6, true, NOW()),

  ('faq-007', 'Apa yang termasuk dalam harga paket umroh?',
   'Harga paket umroh Vins Tour sudah termasuk: tiket pesawat PP, biaya visa umroh, akomodasi hotel sesuai paket, konsumsi 3x sehari (sarapan, makan siang, makan malam), transportasi selama di tanah suci, biaya muthawif, handling bagasi, dan perlengkapan umroh (koper, tas, buku doa). Tidak termasuk: pengeluaran pribadi, belanja, dan tips.',
   'general', 7, true, NOW()),

  ('faq-008', 'Bagaimana kebijakan pembatalan dan pengembalian dana?',
   'Pembatalan lebih dari 60 hari sebelum berangkat: refund 80%. Pembatalan 30–60 hari: refund 50%. Pembatalan 14–30 hari: refund 25%. Pembatalan kurang dari 14 hari: tidak ada refund (kecuali force majeure yang dapat dibuktikan). Pengembalian dana diproses dalam 14 hari kerja.',
   'general', 8, true, NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 28. SERVICES (Layanan Unggulan — Landing Page)
-- ============================================================

INSERT INTO services (id, title, description, icon, sort_order, is_active, created_at) VALUES
  ('svc-001', 'Visa Umroh Resmi',      'Pengurusan visa umroh resmi melalui jalur resmi Kedutaan Besar Kerajaan Saudi Arabia dengan tingkat approval tertinggi.',  'shield-check', 1, true, NOW()),
  ('svc-002', 'Hotel Bintang 5',       'Akomodasi premium di hotel-hotel terbaik dengan lokasi paling strategis dekat Masjidil Haram dan Masjid Nabawi.',            'building',     2, true, NOW()),
  ('svc-003', 'Penerbangan Langsung',  'Penerbangan direct dari kota keberangkatan Anda dengan maskapai terpercaya — Garuda Indonesia, Saudia Airlines, Emirates.',  'plane',        3, true, NOW()),
  ('svc-004', 'Pembimbing Ibadah',     'Muthawif bersertifikat Kemenag RI yang berpengalaman dan sabar mendampingi Anda selama di tanah suci 24 jam.',               'user-check',   4, true, NOW()),
  ('svc-005', 'Konsumsi Lengkap',      'Makan 3x sehari dengan menu halal berkualitas, termasuk sarapan prasmanan, makan siang, dan makan malam.',                    'utensils',     5, true, NOW()),
  ('svc-006', 'Layanan 24/7',          'Tim Vins Tour siap melayani dan membantu jamaah 24 jam sehari, 7 hari seminggu selama perjalanan di tanah suci.',             'headset',      6, true, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 29. ADVANTAGES (Keunggulan — Landing Page)
-- ============================================================

INSERT INTO advantages (id, title, icon, sort_order, is_active, created_at) VALUES
  ('adv-001', 'Izin Resmi Kemenag RI',       'award',         1, true, NOW()),
  ('adv-002', 'Pengalaman 14+ Tahun',        'clock',         2, true, NOW()),
  ('adv-003', '10.000+ Jamaah Berangkat',    'users',         3, true, NOW()),
  ('adv-004', 'Harga Transparan No Hidden',  'eye',           4, true, NOW()),
  ('adv-005', 'Cicilan Mudah & Fleksibel',   'credit-card',   5, true, NOW()),
  ('adv-006', 'Garansi Kepuasan Jamaah',     'thumbs-up',     6, true, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 30. GUIDE STEPS (Cara Mendaftar — Landing Page)
-- ============================================================

INSERT INTO guide_steps (id, step_number, title, description, icon, is_active, created_at) VALUES
  ('gs-001', 1, 'Konsultasi Gratis',    'Hubungi tim kami via WhatsApp atau datang langsung ke kantor untuk konsultasi paket umroh yang sesuai kebutuhan dan anggaran Anda.', 'message-circle', true, NOW()),
  ('gs-002', 2, 'Pilih Paket & Tanggal','Pilih paket umroh yang diinginkan dan tanggal keberangkatan yang tersedia. Tim kami akan membantu menjelaskan detail setiap paket.', 'calendar',       true, NOW()),
  ('gs-003', 3, 'Daftar & Bayar DP',    'Lakukan pendaftaran resmi dengan mengisi formulir dan membayar DP. Anda langsung mendapatkan konfirmasi kursi via WhatsApp.',        'clipboard-check', true, NOW()),
  ('gs-004', 4, 'Lengkapi Dokumen',     'Siapkan dan serahkan semua dokumen yang diperlukan. Tim kami akan memandu dan membantu proses pengurusan visa umroh Anda.',          'file-text',      true, NOW()),
  ('gs-005', 5, 'Manasik Umroh',        'Ikuti bimbingan manasik umroh yang kami adakan sebelum keberangkatan. Pembelajaran tata cara ibadah umroh yang benar dan lengkap.',  'book-open',      true, NOW()),
  ('gs-006', 6, 'Berangkat ke Tanah Suci','Berangkat dengan tenang bersama rombongan Vins Tour. Tim kami mendampingi Anda dari keberangkatan hingga tiba kembali di Indonesia.','plane-takeoff',  true, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 31. NAVIGATION ITEMS
-- ============================================================

INSERT INTO navigation_items (id, label, url, parent_id, sort_order, is_active, open_in_new_tab, created_at) VALUES
  ('nav-beranda',    'Beranda',         '/',             NULL,         1, true, false, NOW()),
  ('nav-paket',      'Paket Umroh',     '/paket',        NULL,         2, true, false, NOW()),
  ('nav-jadwal',     'Jadwal',          '/jadwal',       NULL,         3, true, false, NOW()),
  ('nav-galeri',     'Galeri',          '/galeri',       NULL,         4, true, false, NOW()),
  ('nav-blog',       'Blog & Artikel',  '/blog',         NULL,         5, true, false, NOW()),
  ('nav-tentang',    'Tentang Kami',    '/tentang',      NULL,         6, true, false, NOW()),
  ('nav-kontak',     'Kontak',          '/kontak',       NULL,         7, true, false, NOW()),
  ('nav-daftar',     'Daftar Sekarang', '/daftar',       NULL,         8, true, false, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 32. FLOATING BUTTONS (WhatsApp & Sosial)
-- ============================================================

INSERT INTO floating_buttons (id, platform, label, url, icon, is_active, sort_order, created_at) VALUES
  ('fb-wa',  'whatsapp', 'Chat WhatsApp',  'https://wa.me/6281234567890?text=Assalamualaikum%2C%20saya%20ingin%20info%20paket%20umroh%20Vins%20Tour', 'message-circle', true, 1, NOW()),
  ('fb-ig',  'instagram','Instagram',      'https://instagram.com/vinstour', 'instagram', true, 2, NOW()),
  ('fb-yt',  'youtube',  'YouTube',        'https://youtube.com/@vinstour',  'youtube',   true, 3, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 33. MANASIK MATERIALS (Materi Bimbingan)
-- ============================================================

INSERT INTO manasik_materials (id, title, description, type, sort_order, is_active, created_at) VALUES
  ('mm-001', 'Buku Panduan Manasik Umroh',             'Panduan lengkap tata cara umroh dari awal hingga akhir, dilengkapi doa-doa beserta artinya.',  'pdf',   1, true, NOW()),
  ('mm-002', 'Video: Tata Cara Ihram dan Niat',        'Video panduan memakai pakaian ihram dengan benar dan bacaan niat umroh.',                        'video', 2, true, NOW()),
  ('mm-003', 'Video: Tata Cara Thawaf',                'Panduan video 7 putaran thawaf mengelilingi Ka''bah beserta doa-doa yang dibaca.',               'video', 3, true, NOW()),
  ('mm-004', 'Video: Tata Cara Sa''i',                  'Panduan video sa''i antara Bukit Shafa dan Marwah 7 kali perjalanan.',                             'video', 4, true, NOW()),
  ('mm-005', 'Doa-doa Pilihan di Tanah Suci',          'Kumpulan doa pilihan yang dianjurkan dibaca di tempat-tempat mustajab di Makkah dan Madinah.',    'pdf',   5, true, NOW()),
  ('mm-006', 'Presentasi: Sejarah Masjidil Haram',     'Presentasi interaktif tentang sejarah Masjidil Haram dan Ka''bah dari masa ke masa.',              'slide', 6, true, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 34. SEO OVERRIDES (Meta Tag per Halaman)
-- ============================================================

INSERT INTO seo_overrides (id, path, title, description, noindex, created_at) VALUES
  ('seo-home',    '/',         'Vins Tour & Travel — Paket Umroh Terpercaya 2025/2026',
   'Dapatkan paket umroh terbaik dari Vins Tour & Travel — agen umroh resmi berizin Kemenag. Tersedia paket Regular, Plus, VIP, VVIP, dan Ramadan. Daftar sekarang!',
   false, NOW()),
  ('seo-paket',   '/paket',    'Paket Umroh 2025/2026 — Vins Tour & Travel',
   'Pilih paket umroh terbaik sesuai budget Anda. Tersedia mulai Rp 23 juta — hotel bintang 4 & 5, direct flight, pembimbing berpengalaman.',
   false, NOW()),
  ('seo-jadwal',  '/jadwal',   'Jadwal Keberangkatan Umroh 2025/2026 — Vins Tour',
   'Cek jadwal keberangkatan umroh terbaru. Tersedia keberangkatan dari Jakarta, Surabaya, Bandung, dan Makassar.',
   false, NOW()),
  ('seo-kontak',  '/kontak',   'Kontak & Cabang Vins Tour & Travel',
   'Hubungi Vins Tour & Travel di kantor pusat Jakarta atau cabang Surabaya, Bandung, dan Makassar. Konsultasi gratis!',
   false, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- RINGKASAN DATA DEMO
-- ============================================================
-- ✅ Site settings         : 14 record
-- ✅ Currencies            : 3 (IDR, SAR, USD)
-- ✅ Branches              : 4 (Jakarta, Surabaya, Bandung, Makassar)
-- ✅ Hotels                : 9 (5 Makkah, 4 Madinah)
-- ✅ Airlines              : 5 (Garuda, Saudia, Emirates, Lion, Batik)
-- ✅ Airports              : 6 (CGK, SUB, BDO, UPG, JED, MED)
-- ✅ Package categories    : 6 (Regular, Plus, VIP, VVIP, Ramadan, Haji)
-- ✅ Muthawif              : 5 pembimbing ibadah
-- ✅ Equipment             : 8 item perlengkapan
-- ✅ Packages              : 5 paket umroh aktif
-- ✅ Package departures    : 14 jadwal keberangkatan
-- ✅ Departure prices      : 36 harga per tipe kamar
-- ✅ Profiles              : 15 (2 admin, 3 agen, 10 jamaah)
-- ✅ User roles            : 15 record
-- ✅ Agents                : 3 agen penjualan
-- ✅ Bookings              : 15 booking (berbagai status)
-- ✅ Booking rooms         : 14 record kamar
-- ✅ Booking pilgrims      : 16 data jemaah
-- ✅ Booking payments      : 14 pembayaran
-- ✅ Installment schedules : 6 jadwal cicilan
-- ✅ Booking status logs   : 13 audit trail
-- ✅ Agent commissions     : 9 komisi agen
-- ✅ Leads/CRM             : 8 prospek + 8 interaksi
-- ✅ Coupons               : 5 kode promo
-- ✅ Testimonials          : 10 ulasan jamaah
-- ✅ Blog posts            : 5 artikel
-- ✅ FAQs                  : 8 pertanyaan umum
-- ✅ Services              : 6 layanan unggulan
-- ✅ Advantages            : 6 keunggulan
-- ✅ Guide steps           : 6 langkah pendaftaran
-- ✅ Navigation items      : 8 menu navigasi
-- ✅ Floating buttons      : 3 tombol sosial
-- ✅ Manasik materials     : 6 materi bimbingan
-- ✅ SEO overrides         : 4 halaman

COMMIT;
