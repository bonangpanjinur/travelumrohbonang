-- ============================================================
-- SEED DATA DEMO — UmrohPlus
-- Jalankan: psql "$DATABASE_URL" -f scripts/seeds/seed-demo.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CURRENCIES
-- ============================================================
INSERT INTO currencies (id, code, name, symbol, rate_to_idr, is_default, is_active)
VALUES
  ('cur-idr', 'IDR', 'Rupiah Indonesia', 'Rp', 1,     true,  true),
  ('cur-usd', 'USD', 'US Dollar',        '$',  16500, false, true),
  ('cur-sar', 'SAR', 'Saudi Riyal',      'SR', 4400,  false, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. SITE SETTINGS
-- ============================================================
INSERT INTO site_settings (id, key, category, value, created_at) VALUES
  ('ss-01', 'site_name',       'general',    '"UmrohPlus Travel & Tours"',    NOW()),
  ('ss-02', 'site_tagline',    'general',    '"Mitra Terpercaya Ibadah Umroh Anda"', NOW()),
  ('ss-03', 'site_email',      'contact',    '"info@umrohplus.co.id"',         NOW()),
  ('ss-04', 'site_phone',      'contact',    '"+62 812-1234-5678"',            NOW()),
  ('ss-05', 'site_whatsapp',   'contact',    '"+6281212345678"',               NOW()),
  ('ss-06', 'site_address',    'contact',    '"Jl. Masjid Al-Ikhlas No. 88, Jakarta Selatan 12560"', NOW()),
  ('ss-07', 'site_instagram',  'social',     '"https://instagram.com/umrohplus"', NOW()),
  ('ss-08', 'site_facebook',   'social',     '"https://facebook.com/umrohplus"',  NOW()),
  ('ss-09', 'site_youtube',    'social',     '"https://youtube.com/@umrohplus"',  NOW()),
  ('ss-10', 'template',        'appearance', '"classic"',                      NOW()),
  ('ss-11', 'primary_color',   'appearance', '"#8B1A1A"',                      NOW()),
  ('ss-12', 'accent_color',    'appearance', '"#C9A84C"',                      NOW()),
  ('ss-13', 'hero_title',      'content',    '"Wujudkan Ibadah Umroh Impian Anda"', NOW()),
  ('ss-14', 'hero_subtitle',   'content',    '"Perjalanan spiritual dengan pelayanan terbaik, bimbingan ustadz berpengalaman, dan hotel bintang 5 dekat Masjidil Haram."', NOW()),
  ('ss-15', 'about_title',     'content',    '"Mengapa Memilih UmrohPlus?"',   NOW()),
  ('ss-16', 'about_text',      'content',    '"Kami telah melayani lebih dari 10.000 jamaah umroh sejak 2010. Dengan pengalaman 15 tahun, kami memastikan setiap perjalanan ibadah Anda berjalan lancar, aman, dan penuh kekhusyukan."', NOW()),
  ('ss-17', 'years_experience','content',    '"15"',                           NOW()),
  ('ss-18', 'total_jamaah',    'content',    '"10000"',                        NOW()),
  ('ss-19', 'satisfaction_rate','content',   '"99"',                           NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. NAVIGATION ITEMS
-- ============================================================
INSERT INTO navigation_items (id, label, url, parent_id, sort_order, is_active, open_in_new_tab, created_at) VALUES
  ('nav-01', 'Beranda',          '/',          NULL, 1, true, false, NOW()),
  ('nav-02', 'Paket Perjalanan', '/paket',     NULL, 2, true, false, NOW()),
  ('nav-03', 'Galeri',           '/galeri',    NULL, 3, true, false, NOW()),
  ('nav-04', 'Blog',             '/blog',      NULL, 4, true, false, NOW()),
  ('nav-05', 'FAQ',              '/faq',       NULL, 5, true, false, NOW()),
  ('nav-06', 'Kontak',           '/kontak',    NULL, 6, true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. FLOATING BUTTONS (WhatsApp + Instagram)
-- ============================================================
INSERT INTO floating_buttons (id, platform, label, url, icon, is_active, sort_order, created_at) VALUES
  ('fb-wa',  'whatsapp',  'Konsultasi WhatsApp', 'https://wa.me/6281212345678?text=Halo%20UmrohPlus%2C%20saya%20ingin%20bertanya%20tentang%20paket%20umroh', 'MessageCircle', true, 1, NOW()),
  ('fb-ig',  'instagram', 'Follow Instagram',    'https://instagram.com/umrohplus', 'Instagram', true, 2, NOW()),
  ('fb-tg',  'telegram',  'Chat Telegram',       'https://t.me/umrohplus', 'Send', true, 3, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. GUIDE STEPS (Cara Daftar)
-- ============================================================
INSERT INTO guide_steps (id, step_number, title, description, icon, is_active, created_at) VALUES
  ('gs-01', 1, 'Pilih Paket',       'Jelajahi berbagai paket umroh kami dan pilih yang sesuai dengan kebutuhan dan anggaran Anda.', 'Search',      true, NOW()),
  ('gs-02', 2, 'Daftar & Pesan',    'Isi formulir pendaftaran secara online. Data Anda aman dan terenkripsi.', 'ClipboardList', true, NOW()),
  ('gs-03', 3, 'Lakukan Pembayaran','Bayar DP minimal 50% untuk konfirmasi booking. Tersedia cicilan hingga 12 bulan.', 'CreditCard',   true, NOW()),
  ('gs-04', 4, 'Persiapan Dokumen', 'Kami bantu proses visa, paspor, dan dokumen lainnya. Tim kami siap memandu Anda.', 'FileText',     true, NOW()),
  ('gs-05', 5, 'Berangkat Umroh',   'Nikmati perjalanan ibadah bersama jamaah dan muthawif berpengalaman kami.', 'Plane',        true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. ADVANTAGES (Keunggulan)
-- ============================================================
INSERT INTO advantages (id, title, icon, sort_order, is_active, created_at) VALUES
  ('adv-01', 'Berpengalaman 15 Tahun',        'Award',        1, true, NOW()),
  ('adv-02', 'Hotel Bintang 5 Terdekat',      'Hotel',        2, true, NOW()),
  ('adv-03', 'Muthawif Bersertifikat',        'UserCheck',    3, true, NOW()),
  ('adv-04', 'Visa Terjamin',                 'Shield',       4, true, NOW()),
  ('adv-05', 'Layanan 24 Jam',                'Headphones',   5, true, NOW()),
  ('adv-06', 'Asuransi Perjalanan Lengkap',   'HeartPulse',   6, true, NOW()),
  ('adv-07', 'Cicilan Tanpa Bunga',           'BadgePercent', 7, true, NOW()),
  ('adv-08', '10.000+ Jamaah Puas',           'Users',        8, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. HOTELS
-- ============================================================
INSERT INTO hotels (id, name, city, stars, image_url, description, created_at) VALUES
  ('htl-mak-1', 'Hilton Makkah Convention Hotel',    'Makkah',  5, 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=800', 'Hotel bintang 5 tepat di samping Masjidil Haram, jarak 200 meter dari Ka''bah.', NOW()),
  ('htl-mak-2', 'Pullman ZamZam Makkah',             'Makkah',  5, 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', 'Hotel mewah dengan pemandangan langsung Ka''bah, fasilitas lengkap dan layanan premium.', NOW()),
  ('htl-mak-3', 'Swissotel Makkah',                  'Makkah',  5, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', 'Hotel bintang 5 dengan akses mudah ke Masjidil Haram dan fasilitas spa.', NOW()),
  ('htl-mak-4', 'Makkah Hotel & Towers',             'Makkah',  4, 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800', 'Hotel nyaman bintang 4 dengan jarak 500 meter dari Masjidil Haram.', NOW()),
  ('htl-mad-1', 'Anwar Al Madinah Mövenpick Hotel',  'Madinah', 5, 'https://images.unsplash.com/photo-1587979931-9b77a1a80f82?w=800', 'Hotel bintang 5 berhadapan langsung dengan Masjid Nabawi.', NOW()),
  ('htl-mad-2', 'Dar Al Iman Intercontinental',      'Madinah', 5, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800', 'Hotel mewah dengan pemandangan Masjid Nabawi yang menakjubkan.', NOW()),
  ('htl-mad-3', 'Pullman Zamzam Madina',             'Madinah', 4, 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800', 'Hotel nyaman bintang 4, 100 meter dari Masjid Nabawi.', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. AIRLINES
-- ============================================================
INSERT INTO airlines (id, name, code, logo_url, created_at) VALUES
  ('air-ga',  'Garuda Indonesia',      'GA',  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Garuda_Indonesia_Logo.svg/240px-Garuda_Indonesia_Logo.svg.png', NOW()),
  ('air-sv',  'Saudia Airlines',       'SV',  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/SaudiArabianAirlines_logo.svg/240px-SaudiArabianAirlines_logo.svg.png', NOW()),
  ('air-qa',  'Qatar Airways',         'QR',  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Qatar_Airways_Logo.svg/240px-Qatar_Airways_Logo.svg.png', NOW()),
  ('air-ek',  'Emirates',              'EK',  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Emirates_logo.svg/240px-Emirates_logo.svg.png', NOW()),
  ('air-jt',  'Lion Air',              'JT',  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Lion_Air_Logo.svg/240px-Lion_Air_Logo.svg.png', NOW()),
  ('air-bi',  'Royal Brunei Airlines', 'BI',  NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. AIRPORTS
-- ============================================================
INSERT INTO airports (id, name, code, city, created_at) VALUES
  ('apt-cgk', 'Bandara Internasional Soekarno-Hatta', 'CGK', 'Jakarta',    NOW()),
  ('apt-sub', 'Bandara Internasional Juanda',          'SUB', 'Surabaya',   NOW()),
  ('apt-upg', 'Bandara Sultan Hasanuddin',             'UPG', 'Makassar',   NOW()),
  ('apt-kno', 'Bandara Kualanamu',                     'KNO', 'Medan',      NOW()),
  ('apt-jog', 'Bandara Adisutjipto / YIA',             'JOG', 'Yogyakarta', NOW()),
  ('apt-jed', 'King Abdulaziz International Airport',  'JED', 'Jeddah',     NOW()),
  ('apt-med', 'Prince Mohammad bin Abdulaziz Airport', 'MED', 'Madinah',    NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 10. PACKAGE CATEGORIES
-- ============================================================
INSERT INTO package_categories (id, name, description, parent_id, show_extra_hotels, is_active, sort_order, created_at) VALUES
  ('cat-hemat',    'Paket Hemat',    'Paket umroh ekonomis dengan fasilitas terjangkau namun tetap nyaman',                          NULL, false, true, 1, NOW()),
  ('cat-reguler',  'Paket Reguler',  'Paket umroh standar dengan fasilitas lengkap dan hotel bintang 4',                             NULL, false, true, 2, NOW()),
  ('cat-vip',      'Paket VIP',      'Paket umroh premium dengan hotel bintang 5 terdekat dari Masjidil Haram',                      NULL, true,  true, 3, NOW()),
  ('cat-keluarga', 'Paket Keluarga', 'Paket spesial untuk keluarga dengan program wisata Islami dan pembimbing khusus anak',         NULL, false, true, 4, NOW()),
  ('cat-ramadan',  'Paket Ramadan',  'Umroh di bulan Ramadan dengan pengalaman spiritual yang tak terlupakan',                       NULL, false, true, 5, NOW()),
  ('cat-promo',    'Paket Promo',    'Penawaran terbatas dengan harga spesial — segera booking sebelum kehabisan!',                  NULL, false, true, 6, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 11. PACKAGES
-- ============================================================
INSERT INTO packages (id, title, slug, description, image_url, duration_days, package_type, category_id, hotel_makkah_id, hotel_madinah_id, airline_id, airport_id, minimum_dp, dp_deadline_days, full_deadline_days, is_active, created_at) VALUES
  ('pkg-01',
   'Paket Hemat 9 Hari — Garuda Indonesia',
   'paket-hemat-9-hari-garuda',
   'Paket umroh hemat 9 hari bersama Garuda Indonesia. Hotel bintang 4 di Makkah (500m dari Masjidil Haram) dan Madinah (300m dari Masjid Nabawi). Termasuk makan 3x sehari, visa umroh, dan muthawif bersertifikat.',
   'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=800',
   9, 'umroh', 'cat-hemat', 'htl-mak-4', 'htl-mad-3', 'air-ga', 'apt-cgk',
   5000000, 30, 60, true, NOW()),

  ('pkg-02',
   'Paket Reguler 12 Hari — Saudi Airlines',
   'paket-reguler-12-hari-saudi',
   'Paket umroh reguler 12 hari dengan Saudi Airlines. Hotel bintang 5 di Makkah dan Madinah. Fasilitas lengkap termasuk city tour Makkah & Madinah, manasik online, dan handbook jamaah.',
   'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800',
   12, 'umroh', 'cat-reguler', 'htl-mak-3', 'htl-mad-3', 'air-sv', 'apt-cgk',
   7500000, 30, 60, true, NOW()),

  ('pkg-03',
   'Paket VIP 14 Hari — Qatar Airways',
   'paket-vip-14-hari-qatar',
   'Paket umroh VIP premium 14 hari dengan Qatar Airways kelas bisnis. Hotel Hilton Makkah 200m dari Ka''bah dan Mövenpick Madinah berhadapan Masjid Nabawi. Makan prasmanan 3x, private guide, dan welcome pack eksklusif.',
   'https://images.unsplash.com/photo-1573074617613-fc8ef27eaa2f?w=800',
   14, 'umroh', 'cat-vip', 'htl-mak-1', 'htl-mad-1', 'air-qa', 'apt-cgk',
   15000000, 45, 90, true, NOW()),

  ('pkg-04',
   'Paket Keluarga 12 Hari — Lion Air',
   'paket-keluarga-12-hari-lion',
   'Paket umroh keluarga 12 hari spesial. Tersedia kamar quadruple, program anak, dan pembimbing keluarga khusus. Hotel bintang 4 strategis. Cocok untuk keluarga dengan anak-anak.',
   'https://images.unsplash.com/photo-1609188076864-c35269136b09?w=800',
   12, 'umroh', 'cat-keluarga', 'htl-mak-4', 'htl-mad-3', 'air-jt', 'apt-cgk',
   6000000, 30, 60, true, NOW()),

  ('pkg-05',
   'Paket Ramadan 15 Hari — Garuda Indonesia',
   'paket-ramadan-15-hari-garuda',
   'Umroh di 10 hari terakhir Ramadan yang penuh berkah. Saksikan malam Lailatul Qadar di Masjidil Haram. Hotel Pullman bintang 5, makan sunnah, dan kajian Ramadan bersama ustadz.',
   'https://images.unsplash.com/photo-1631382258814-abc7e6285d49?w=800',
   15, 'umroh', 'cat-ramadan', 'htl-mak-2', 'htl-mad-2', 'air-ga', 'apt-cgk',
   10000000, 60, 90, true, NOW()),

  ('pkg-06',
   'Paket Promo Akhir Tahun 9 Hari',
   'paket-promo-akhir-tahun-9-hari',
   'Promo spesial akhir tahun! Diskon 20% untuk keberangkatan Desember. Hotel bintang 4, maskapai Saudia, full board. Terbatas hanya 30 kursi — segera booking!',
   'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=800',
   9, 'umroh', 'cat-promo', 'htl-mak-4', 'htl-mad-3', 'air-sv', 'apt-sub',
   4000000, 14, 30, true, NOW()),

  ('pkg-07',
   'Paket VIP Plus 14 Hari — Emirates',
   'paket-vip-plus-14-hari-emirates',
   'Pengalaman umroh paling mewah dengan Emirates First Class. Swissotel Makkah & Dar Al Iman Intercontinental Madinah. Butler service 24 jam, private ziarah, dan welcome dinner eksklusif.',
   'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800',
   14, 'umroh', 'cat-vip', 'htl-mak-3', 'htl-mad-2', 'air-ek', 'apt-cgk',
   20000000, 60, 90, true, NOW()),

  ('pkg-08',
   'Paket Reguler 10 Hari — Surabaya',
   'paket-reguler-10-hari-surabaya',
   'Paket umroh 10 hari keberangkatan dari Surabaya. Hotel bintang 4-5 di Makkah dan Madinah. Cocok untuk jamaah dari Jawa Timur dan sekitarnya.',
   'https://images.unsplash.com/photo-1608889476561-6242cfdbf622?w=800',
   10, 'umroh', 'cat-reguler', 'htl-mak-4', 'htl-mad-3', 'air-ga', 'apt-sub',
   6500000, 30, 60, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12. PACKAGE DEPARTURES
-- ============================================================
INSERT INTO package_departures (id, package_id, departure_date, return_date, quota, remaining_quota, status, muthawif_id, created_at) VALUES
  -- pkg-01 Hemat
  ('dep-01-a', 'pkg-01', '2025-08-10', '2025-08-18', 45, 45, 'open', NULL, NOW()),
  ('dep-01-b', 'pkg-01', '2025-09-05', '2025-09-13', 45, 32, 'open', NULL, NOW()),
  ('dep-01-c', 'pkg-01', '2025-10-12', '2025-10-20', 45, 45, 'open', NULL, NOW()),

  -- pkg-02 Reguler
  ('dep-02-a', 'pkg-02', '2025-08-20', '2025-09-01', 40, 28, 'open', NULL, NOW()),
  ('dep-02-b', 'pkg-02', '2025-09-15', '2025-09-27', 40, 40, 'open', NULL, NOW()),
  ('dep-02-c', 'pkg-02', '2025-11-10', '2025-11-22', 40, 40, 'open', NULL, NOW()),

  -- pkg-03 VIP
  ('dep-03-a', 'pkg-03', '2025-08-01', '2025-08-14', 30, 12, 'open', NULL, NOW()),
  ('dep-03-b', 'pkg-03', '2025-10-05', '2025-10-18', 30, 30, 'open', NULL, NOW()),

  -- pkg-04 Keluarga
  ('dep-04-a', 'pkg-04', '2025-07-20', '2025-08-01', 50, 50, 'open', NULL, NOW()),
  ('dep-04-b', 'pkg-04', '2025-12-22', '2026-01-03', 50, 42, 'open', NULL, NOW()),

  -- pkg-05 Ramadan
  ('dep-05-a', 'pkg-05', '2026-03-15', '2026-03-29', 60, 60, 'open', NULL, NOW()),

  -- pkg-06 Promo
  ('dep-06-a', 'pkg-06', '2025-12-01', '2025-12-09', 30, 15, 'open', NULL, NOW()),
  ('dep-06-b', 'pkg-06', '2025-12-20', '2025-12-28', 30, 30, 'open', NULL, NOW()),

  -- pkg-07 VIP Plus
  ('dep-07-a', 'pkg-07', '2025-09-20', '2025-10-03', 20, 8,  'open', NULL, NOW()),
  ('dep-07-b', 'pkg-07', '2025-11-01', '2025-11-14', 20, 20, 'open', NULL, NOW()),

  -- pkg-08 Surabaya
  ('dep-08-a', 'pkg-08', '2025-08-25', '2025-09-04', 35, 35, 'open', NULL, NOW()),
  ('dep-08-b', 'pkg-08', '2025-10-18', '2025-10-28', 35, 20, 'open', NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 13. DEPARTURE PRICES (per room type)
-- ============================================================
INSERT INTO departure_prices (id, departure_id, room_type, price, created_at) VALUES
  -- dep-01-a (Hemat 9hr)
  ('dp-01a-double', 'dep-01-a', 'double', 22000000, NOW()),
  ('dp-01a-triple', 'dep-01-a', 'triple', 19500000, NOW()),
  ('dp-01a-quad',   'dep-01-a', 'quad',   17500000, NOW()),
  -- dep-01-b
  ('dp-01b-double', 'dep-01-b', 'double', 22000000, NOW()),
  ('dp-01b-triple', 'dep-01-b', 'triple', 19500000, NOW()),
  ('dp-01b-quad',   'dep-01-b', 'quad',   17500000, NOW()),
  -- dep-01-c
  ('dp-01c-double', 'dep-01-c', 'double', 23000000, NOW()),
  ('dp-01c-triple', 'dep-01-c', 'triple', 20500000, NOW()),
  ('dp-01c-quad',   'dep-01-c', 'quad',   18500000, NOW()),

  -- dep-02 (Reguler 12hr)
  ('dp-02a-double', 'dep-02-a', 'double', 32000000, NOW()),
  ('dp-02a-triple', 'dep-02-a', 'triple', 28000000, NOW()),
  ('dp-02a-quad',   'dep-02-a', 'quad',   25000000, NOW()),
  ('dp-02b-double', 'dep-02-b', 'double', 32000000, NOW()),
  ('dp-02b-triple', 'dep-02-b', 'triple', 28000000, NOW()),
  ('dp-02b-quad',   'dep-02-b', 'quad',   25000000, NOW()),
  ('dp-02c-double', 'dep-02-c', 'double', 33500000, NOW()),
  ('dp-02c-triple', 'dep-02-c', 'triple', 29500000, NOW()),
  ('dp-02c-quad',   'dep-02-c', 'quad',   26500000, NOW()),

  -- dep-03 (VIP 14hr)
  ('dp-03a-double', 'dep-03-a', 'double', 55000000, NOW()),
  ('dp-03a-triple', 'dep-03-a', 'triple', 48000000, NOW()),
  ('dp-03b-double', 'dep-03-b', 'double', 55000000, NOW()),
  ('dp-03b-triple', 'dep-03-b', 'triple', 48000000, NOW()),

  -- dep-04 (Keluarga)
  ('dp-04a-double', 'dep-04-a', 'double', 27000000, NOW()),
  ('dp-04a-triple', 'dep-04-a', 'triple', 23000000, NOW()),
  ('dp-04a-quad',   'dep-04-a', 'quad',   20000000, NOW()),
  ('dp-04b-double', 'dep-04-b', 'double', 28000000, NOW()),
  ('dp-04b-triple', 'dep-04-b', 'triple', 24000000, NOW()),
  ('dp-04b-quad',   'dep-04-b', 'quad',   21000000, NOW()),

  -- dep-05 (Ramadan)
  ('dp-05a-double', 'dep-05-a', 'double', 45000000, NOW()),
  ('dp-05a-triple', 'dep-05-a', 'triple', 39000000, NOW()),
  ('dp-05a-quad',   'dep-05-a', 'quad',   35000000, NOW()),

  -- dep-06 (Promo)
  ('dp-06a-double', 'dep-06-a', 'double', 19500000, NOW()),
  ('dp-06a-triple', 'dep-06-a', 'triple', 17000000, NOW()),
  ('dp-06a-quad',   'dep-06-a', 'quad',   15000000, NOW()),
  ('dp-06b-double', 'dep-06-b', 'double', 19500000, NOW()),
  ('dp-06b-triple', 'dep-06-b', 'triple', 17000000, NOW()),
  ('dp-06b-quad',   'dep-06-b', 'quad',   15000000, NOW()),

  -- dep-07 (VIP Plus)
  ('dp-07a-double', 'dep-07-a', 'double', 85000000, NOW()),
  ('dp-07b-double', 'dep-07-b', 'double', 85000000, NOW()),

  -- dep-08 (Surabaya)
  ('dp-08a-double', 'dep-08-a', 'double', 29500000, NOW()),
  ('dp-08a-triple', 'dep-08-a', 'triple', 25500000, NOW()),
  ('dp-08a-quad',   'dep-08-a', 'quad',   22500000, NOW()),
  ('dp-08b-double', 'dep-08-b', 'double', 30000000, NOW()),
  ('dp-08b-triple', 'dep-08-b', 'triple', 26000000, NOW()),
  ('dp-08b-quad',   'dep-08-b', 'quad',   23000000, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 14. BLOG POSTS
-- ============================================================
INSERT INTO blog_posts (id, title, slug, excerpt, content, image_url, category, author, seo_title, seo_description, is_published, published_at, created_at) VALUES
  ('blog-01',
   'Panduan Lengkap Persiapan Umroh untuk Pemula',
   'panduan-persiapan-umroh-pemula',
   'Mempersiapkan ibadah umroh memerlukan perencanaan matang. Simak panduan lengkap dari A-Z untuk pemula yang ingin menunaikan umroh.',
   '<h2>Persiapan Dokumen</h2><p>Dokumen yang perlu disiapkan untuk umroh meliputi: paspor dengan masa berlaku minimal 6 bulan, visa umroh (diurus oleh travel agent), kartu keluarga, dan surat nikah/akta kelahiran.</p><h2>Persiapan Fisik</h2><p>Ibadah umroh memerlukan kondisi fisik yang prima karena banyak berjalan. Mulailah rutin olahraga 3 bulan sebelum keberangkatan. Konsultasikan kondisi kesehatan dengan dokter.</p><h2>Persiapan Mental & Spiritual</h2><p>Perbanyak ibadah sebelum berangkat. Pelajari tata cara umroh yang benar. Baca buku tentang sejarah Makkah dan Madinah.</p><h2>Packing Tips</h2><p>Bawa pakaian ihram, sandal yang nyaman, obat-obatan pribadi, dan perlengkapan mandi. Jangan lupa kamera untuk mengabadikan momen bersejarah.</p>',
   'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=800',
   'Tips', 'Tim UmrohPlus', 'Panduan Lengkap Persiapan Umroh untuk Pemula', 'Tips lengkap mempersiapkan ibadah umroh dari dokumen, fisik, hingga packing list.',
   true, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),

  ('blog-02',
   'Doa-Doa Mustajab yang Dibaca Saat Umroh',
   'doa-mustajab-saat-umroh',
   'Momen beribadah di Tanah Suci adalah waktu terbaik untuk berdoa. Berikut doa-doa mustajab yang dianjurkan selama ibadah umroh.',
   '<h2>Doa Ketika Melihat Ka''bah</h2><p>Ketika pertama kali melihat Ka''bah, adalah waktu yang mustajab untuk berdoa. "Allahumma zid hadzal baita tasyrifa wa ta''zhima wa takrima wa mahabbah..." Manfaatkan momen ini sebaik-baiknya.</p><h2>Doa Saat Thawaf</h2><p>Tidak ada doa khusus yang harus dibaca saat thawaf. Anda bebas berdoa dalam bahasa apapun dengan hati yang khusyuk.</p><h2>Doa di Multazam</h2><p>Multazam adalah tempat antara Hajar Aswad dan pintu Ka''bah. Tempat ini dikenal sebagai tempat dikabulkannya doa.</p>',
   'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800',
   'Spiritual', 'Ustadz Ahmad Fauzi', 'Doa-Doa Mustajab saat Umroh', 'Kumpulan doa mustajab yang dianjurkan selama menjalankan ibadah umroh di Tanah Suci.',
   true, NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),

  ('blog-03',
   '5 Tips Hemat Selama di Tanah Suci',
   '5-tips-hemat-di-tanah-suci',
   'Berikut tips cerdas agar pengeluaran Anda selama umroh tetap terkontrol tanpa mengurangi kekhusyukan ibadah.',
   '<h2>1. Tukar Riyal Sebelum Berangkat</h2><p>Kurs di Indonesia biasanya lebih menguntungkan dibanding menukar di Saudi. Tukar secukupnya untuk kebutuhan awal.</p><h2>2. Makan di Resto Lokal</h2><p>Restoran lokal di sekitar Masjidil Haram menawarkan makanan halal dengan harga jauh lebih terjangkau dibanding restoran hotel.</p><h2>3. Belanja di Pasar Lama</h2><p>Souvenir dan oleh-oleh lebih murah di Pasar Lama Makkah dibanding toko di dalam hotel.</p><h2>4. Gunakan Transportasi Umum</h2><p>Kereta cepat Haramain antara Makkah dan Madinah lebih hemat dibanding taksi.</p><h2>5. Pesan Paket All-Inclusive</h2><p>Paket yang sudah termasuk makan lebih hemat dibanding membeli makanan sendiri setiap hari.</p>',
   'https://images.unsplash.com/photo-1573074617613-fc8ef27eaa2f?w=800',
   'Tips', 'Tim UmrohPlus', '5 Tips Hemat Selama di Tanah Suci', 'Tips praktis menghemat pengeluaran selama ibadah umroh di Arab Saudi.',
   true, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),

  ('blog-04',
   'Mengenal Rukun dan Wajib Umroh',
   'rukun-dan-wajib-umroh',
   'Memahami rukun dan wajib umroh adalah kewajiban setiap jamaah. Artikel ini menjelaskan perbedaan keduanya dan konsekuensi jika ditinggalkan.',
   '<h2>Rukun Umroh</h2><p>Rukun umroh adalah amalan yang wajib dilakukan dan jika ditinggalkan maka umroh tidak sah. Rukun umroh ada 5: (1) Niat ihram, (2) Thawaf, (3) Sa''i, (4) Tahallul (mencukur/memotong rambut), (5) Tertib.</p><h2>Wajib Umroh</h2><p>Wajib umroh adalah amalan yang harus dilakukan, namun jika ditinggalkan dapat diganti dengan dam (denda). Wajib umroh: memakai ihram dari miqat dan menjauhi larangan ihram.</p>',
   'https://images.unsplash.com/photo-1632375810709-75b1da00537c?w=800',
   'Edukasi', 'Ustadz Ahmad Fauzi', 'Rukun dan Wajib Umroh yang Wajib Diketahui', 'Penjelasan lengkap tentang rukun dan wajib umroh beserta konsekuensinya.',
   true, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),

  ('blog-05',
   'Pengalaman Umroh Pertama: Tips dari Jamaah Senior',
   'tips-umroh-pertama-dari-jamaah-senior',
   'Kisah dan tips berharga dari jamaah yang telah berulang kali menunaikan umroh. Pelajari dari pengalaman mereka.',
   '<h2>Kesan Pertama di Masjidil Haram</h2><p>"Saat pertama melihat Ka''bah, air mata langsung mengalir. Rasanya seperti mimpi yang menjadi kenyataan," kenang Bapak Haji Sukirno (65 tahun) yang telah 7 kali umroh.</p><h2>Tips dari Senior</h2><p>1. Jangan terburu-buru saat thawaf dan sa''i. Nikmati setiap langkah. 2. Perbanyak doa ketika di Multazam. 3. Manfaatkan waktu antara Ashar dan Maghrib untuk beribadah di dalam masjid. 4. Jaga stamina — istirahatlah cukup di kamar hotel.</p>',
   'https://images.unsplash.com/photo-1609188076864-c35269136b09?w=800',
   'Pengalaman', 'Tim UmrohPlus', 'Tips Umroh Pertama dari Jamaah Senior', 'Kisah dan tips berharga dari jamaah senior yang sudah berkali-kali umroh.',
   true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

  ('blog-06',
   'Perbedaan Umroh Reguler, Plus, dan VIP',
   'perbedaan-umroh-reguler-plus-vip',
   'Bingung memilih paket umroh? Simak perbandingan lengkap paket Reguler, Plus, dan VIP agar Anda bisa memilih yang paling sesuai.',
   '<h2>Paket Reguler</h2><p>Hotel bintang 4, jarak 500m-1km dari Masjidil Haram, makan 3x sehari dengan menu Indonesia, maskapai transit 1-2x. Cocok untuk yang mengutamakan nilai ekonomis.</p><h2>Paket Plus</h2><p>Hotel bintang 5, jarak 200-500m, makan prasmanan, maskapai transit maksimal 1x. Keseimbangan antara kenyamanan dan harga.</p><h2>Paket VIP</h2><p>Hotel langsung menghadap Ka''bah atau Masjid Nabawi, maskapai non-stop, layanan butler, private guide, dan fasilitas eksklusif. Untuk pengalaman paling premium.</p>',
   'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800',
   'Tips', 'Tim UmrohPlus', 'Perbandingan Paket Umroh Reguler, Plus, dan VIP', 'Panduan memilih paket umroh yang tepat sesuai kebutuhan dan anggaran.',
   true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 15. FAQs
-- ============================================================
INSERT INTO faqs (id, question, answer, scope, package_id, sort_order, is_active, created_at) VALUES
  ('faq-01', 'Berapa lama durasi umroh?',
   'Durasi umroh bervariasi tergantung paket yang dipilih. Paket Hemat kami 9 hari, Reguler 12 hari, VIP 14 hari, dan Ramadan hingga 15 hari. Semua sudah termasuk perjalanan pulang-pergi.',
   'general', NULL, 1, true, NOW()),

  ('faq-02', 'Apa saja yang termasuk dalam paket umroh?',
   'Semua paket UmrohPlus sudah termasuk: ✅ Tiket pesawat PP, ✅ Hotel sesuai paket, ✅ Makan 3x sehari (menu Indonesia), ✅ Visa umroh, ✅ Muthawif bersertifikat, ✅ Asuransi perjalanan, ✅ Perlengkapan umroh (koper + tas + buku manasik), ✅ City tour Makkah & Madinah.',
   'general', NULL, 2, true, NOW()),

  ('faq-03', 'Berapa minimal DP untuk booking?',
   'Minimal DP adalah 20-30% dari total harga paket, tergantung paket yang dipilih. Untuk Paket Hemat minimal DP Rp 5.000.000, Reguler Rp 7.500.000, dan VIP Rp 15.000.000. Pelunasan dilakukan 30-60 hari sebelum keberangkatan.',
   'general', NULL, 3, true, NOW()),

  ('faq-04', 'Apakah bisa cicilan?',
   'Ya! Kami menyediakan fasilitas cicilan tanpa bunga hingga 12 bulan bekerja sama dengan beberapa bank dan platform keuangan. Hubungi tim kami untuk informasi lebih lanjut tentang skema cicilan.',
   'general', NULL, 4, true, NOW()),

  ('faq-05', 'Bagaimana proses pengurusan visa?',
   'Kami mengurus seluruh proses visa umroh untuk Anda. Dokumen yang diperlukan: paspor asli (berlaku min. 6 bulan), foto 4x6 background putih, kartu keluarga, dan surat nikah/akta kelahiran (untuk wanita di bawah 45 tahun yang tanpa mahram). Proses 7-14 hari kerja.',
   'general', NULL, 5, true, NOW()),

  ('faq-06', 'Apakah wanita di bawah 45 tahun bisa umroh sendiri?',
   'Berdasarkan aturan terbaru Arab Saudi (2021), wanita tanpa batasan usia bisa umroh tanpa mahram asalkan bersama grup resmi travel yang terdaftar. UmrohPlus adalah travel resmi terdaftar di Kemenag RI, sehingga jamaah wanita mandiri tetap bisa bergabung.',
   'general', NULL, 6, true, NOW()),

  ('faq-07', 'Bagaimana jika saya ingin membatalkan booking?',
   'Kebijakan pembatalan: > 60 hari sebelum keberangkatan: refund 90%, 30-60 hari: refund 70%, 14-29 hari: refund 50%, 7-13 hari: refund 30%, < 7 hari: tidak ada refund. Pembatalan harus diajukan secara tertulis melalui email atau WhatsApp.',
   'general', NULL, 7, true, NOW()),

  ('faq-08', 'Apakah ada pembimbing (muthawif) yang menemani?',
   'Ya, setiap keberangkatan didampingi muthawif bersertifikat dari Kemenag RI. Rasio muthawif adalah 1:25 jamaah untuk paket Reguler dan 1:15 untuk paket VIP. Muthawif kami fasih berbahasa Indonesia dan Arab.',
   'general', NULL, 8, true, NOW()),

  ('faq-09', 'Hotel di Makkah berapa dekat dari Masjidil Haram?',
   'Jarak hotel tergantung paket: Paket Hemat 500m-1km, Paket Reguler 300-500m, Paket VIP 50-200m langsung menghadap Masjidil Haram. Semua hotel kami walking distance dan tersedia shuttle bus.',
   'general', NULL, 9, true, NOW()),

  ('faq-10', 'Apakah tersedia paket untuk lansia dan jamaah dengan kebutuhan khusus?',
   'Ya, kami menyediakan layanan khusus untuk lansia dan jamaah berkebutuhan khusus, termasuk kursi roda, pendampingan khusus, dan kamar hotel di lantai rendah. Silakan informasikan kebutuhan Anda saat pendaftaran.',
   'general', NULL, 10, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 16. GALLERY
-- ============================================================
INSERT INTO gallery (id, image_url, title, description, category, sort_order, is_active, created_at) VALUES
  ('gal-01', 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=800', 'Masjidil Haram dari Atas', 'Pemandangan udara Masjidil Haram yang megah saat musim haji', 'Masjid', 1, true, NOW()),
  ('gal-02', 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800', 'Ka''bah di Malam Hari', 'Keindahan Ka''bah yang bersinar di malam hari', 'Masjid', 2, true, NOW()),
  ('gal-03', 'https://images.unsplash.com/photo-1573074617613-fc8ef27eaa2f?w=800', 'Jamaah Thawaf', 'Ribuan jamaah mengelilingi Ka''bah dalam ibadah thawaf', 'Ibadah', 3, true, NOW()),
  ('gal-04', 'https://images.unsplash.com/photo-1632375810709-75b1da00537c?w=800', 'Masjid Nabawi Madinah', 'Masjid Nabawi yang megah di kota Madinah Al-Munawaroh', 'Masjid', 4, true, NOW()),
  ('gal-05', 'https://images.unsplash.com/photo-1608889476561-6242cfdbf622?w=800', 'Jamaah Berdoa', 'Jamaah UmrohPlus khusyuk berdoa di depan Ka''bah', 'Ibadah', 5, true, NOW()),
  ('gal-06', 'https://images.unsplash.com/photo-1609188076864-c35269136b09?w=800', 'Hotel Bintang 5 Makkah', 'Lobby mewah hotel bintang 5 pilihan UmrohPlus', 'Hotel', 6, true, NOW()),
  ('gal-07', 'https://images.unsplash.com/photo-1587979931-9b77a1a80f82?w=800', 'Bukit Shafa dan Marwa', 'Jamaah melaksanakan sa''i antara Shafa dan Marwa', 'Ibadah', 7, true, NOW()),
  ('gal-08', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800', 'Waktu Makan Bersama', 'Makan malam bersama jamaah dengan menu masakan Indonesia', 'Suasana', 8, true, NOW()),
  ('gal-09', 'https://images.unsplash.com/photo-1631382258814-abc7e6285d49?w=800', 'Ramadan di Masjidil Haram', 'Suasana Ramadan yang luar biasa di Masjidil Haram', 'Ibadah', 9, true, NOW()),
  ('gal-10', 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800', 'Pesawat Menuju Makkah', 'Perjalanan udara menuju Tanah Suci bersama maskapai pilihan', 'Perjalanan', 10, true, NOW()),
  ('gal-11', 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800', 'Kamar Hotel Madinah', 'Kamar nyaman dengan pemandangan Masjid Nabawi', 'Hotel', 11, true, NOW()),
  ('gal-12', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800', 'Foto Bersama Jamaah', 'Kenangan indah bersama keluarga besar UmrohPlus', 'Suasana', 12, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 17. PAGES (Halaman Statis)
-- ============================================================
INSERT INTO pages (id, slug, title, content, seo_title, seo_description, is_active, created_at) VALUES
  ('page-about', 'tentang-kami', 'Tentang Kami',
   '<h1>Tentang UmrohPlus Travel & Tours</h1><p>UmrohPlus adalah travel umroh terpercaya yang berdiri sejak 2010. Kami telah melayani lebih dari <strong>10.000 jamaah</strong> dari seluruh Indonesia dengan pengalaman ibadah yang berkesan dan aman.</p><h2>Visi Kami</h2><p>Menjadi mitra perjalanan ibadah umroh terbaik di Indonesia yang memberikan layanan prima, terpercaya, dan berkesan.</p><h2>Misi Kami</h2><ul><li>Memberikan kemudahan akses umroh untuk semua kalangan</li><li>Menjamin keamanan dan kenyamanan setiap jamaah</li><li>Menyediakan pembimbing ibadah yang profesional dan bersertifikat</li></ul><h2>Legalitas</h2><p>UmrohPlus telah mendapatkan izin resmi dari Kementerian Agama Republik Indonesia (Kemenag RI) dengan nomor izin PPIU: 123/2010.</p>',
   'Tentang UmrohPlus Travel & Tours', 'Kenali lebih dekat UmrohPlus, travel umroh terpercaya dengan pengalaman 15 tahun melayani 10.000+ jamaah.',
   true, NOW()),
  ('page-kontak', 'kontak', 'Kontak Kami',
   '<h1>Hubungi Kami</h1><p>Tim UmrohPlus siap melayani Anda 24 jam sehari, 7 hari seminggu.</p><h2>Informasi Kontak</h2><p>Alamat: Jl. Masjid Al-Ikhlas No. 88, Jakarta Selatan 12560</p><p>Telepon: +62 812-1234-5678</p><p>WhatsApp: +62 812-1234-5678</p><p>Email: info@umrohplus.co.id</p><h2>Jam Operasional</h2><p>Senin - Jumat: 08.00 - 17.00 WIB. Sabtu: 09.00 - 15.00 WIB. Minggu & Libur: Khusus via WhatsApp</p>',
   'Kontak UmrohPlus', 'Hubungi tim UmrohPlus untuk konsultasi paket umroh terbaik. Tersedia via telepon, WhatsApp, dan email.',
   true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 18. CURRENCIES (additional check)
-- ============================================================
-- Already inserted above

COMMIT;

SELECT 'Seed berhasil dijalankan!' as status;
