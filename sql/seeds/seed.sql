-- ═══════════════════════════════════════════════════════════════
--  Seed Data — UmrohPlus Travel & Tours
-- ═══════════════════════════════════════════════════════════════

-- ── 1. KATEGORI PAKET ───────────────────────────────────────────
TRUNCATE package_categories CASCADE;
INSERT INTO package_categories (id, name, description, parent_id, icon, is_active, sort_order, created_at) VALUES
  ('cat_umroh',   'Umroh',    'Paket perjalanan umroh',                NULL,        '🕋', TRUE, 1, NOW()),
  ('cat_haji',    'Haji Plus','Paket haji plus & furoda',              NULL,        '🌙', TRUE, 2, NOW()),
  ('cat_reg',     'Reguler',  'Paket umroh reguler terjangkau',        'cat_umroh', '⭐', TRUE, 1, NOW()),
  ('cat_premium', 'Premium',  'Paket umroh premium bintang 5',         'cat_umroh', '💎', TRUE, 2, NOW()),
  ('cat_vip',     'VIP',      'Paket umroh VIP eksklusif',             'cat_umroh', '👑', TRUE, 3, NOW());

-- ── 2. HOTEL ────────────────────────────────────────────────────
TRUNCATE hotels CASCADE;
INSERT INTO hotels (id, name, city, stars, description, created_at) VALUES
  ('htl_mak1', 'Makkah Clock Royal Tower Fairmont', 'Makkah', 5, 'Hotel bintang 5 tepat di depan Masjidil Haram, view Kabah langsung dari kamar.', NOW()),
  ('htl_mak2', 'Hilton Makkah Convention Hotel',    'Makkah', 5, 'Hotel premium bintang 5 dengan akses mudah ke Masjidil Haram.', NOW()),
  ('htl_mak3', 'Grand Zam-Zam Hotel',               'Makkah', 4, 'Hotel bintang 4 bersebelahan langsung dengan Masjidil Haram, pilihan terbaik kelas menengah.', NOW()),
  ('htl_mad1', 'Anwar Al Madinah Mövenpick Hotel',  'Madinah', 5, 'Hotel bintang 5 sangat dekat Masjid Nabawi, fasilitas lengkap.', NOW()),
  ('htl_mad2', 'Al Madinah Hilton Hotel',           'Madinah', 5, 'Hotel premium bintang 5 di pusat kota Madinah, 5 menit dari Masjid Nabawi.', NOW()),
  ('htl_mad3', 'Dar Al Taqwa Hotel',                'Madinah', 4, 'Hotel bintang 4 dengan lokasi strategis dekat Masjid Nabawi.', NOW());

-- ── 3. MASKAPAI ─────────────────────────────────────────────────
TRUNCATE airlines CASCADE;
INSERT INTO airlines (id, name, code, created_at) VALUES
  ('air_ga', 'Garuda Indonesia', 'GA', NOW()),
  ('air_sv', 'Saudia Airlines',  'SV', NOW()),
  ('air_ek', 'Emirates',         'EK', NOW()),
  ('air_qg', 'Citilink',         'QG', NOW());

-- ── 4. BANDARA ──────────────────────────────────────────────────
TRUNCATE airports CASCADE;
INSERT INTO airports (id, name, code, city, created_at) VALUES
  ('apt_cgk', 'Soekarno-Hatta International Airport',        'CGK', 'Jakarta',    NOW()),
  ('apt_jog', 'Yogyakarta International Airport',            'YIA', 'Yogyakarta', NOW()),
  ('apt_sub', 'Juanda International Airport',                'SUB', 'Surabaya',   NOW()),
  ('apt_med', 'Prince Mohammad bin Abdulaziz Airport',       'MED', 'Madinah',    NOW());

-- ── 5. MUTHAWIF ─────────────────────────────────────────────────
TRUNCATE muthawifs CASCADE;
INSERT INTO muthawifs (id, name, phone, bio, is_active, created_at) VALUES
  ('mth_001', 'Ustaz H. Ahmad Fauzi, Lc.',       '08123456001', 'Lulusan Universitas Islam Madinah, berpengalaman 15 tahun membimbing jemaah umroh dan haji.', TRUE, NOW()),
  ('mth_002', 'Ustaz H. Ridwan Mustofa, M.Ag.', '08123456002', 'Dosen Studi Islam UIN, telah memimpin lebih dari 50 grup umroh selama 12 tahun.', TRUE, NOW());

-- ── 6. CABANG ───────────────────────────────────────────────────
TRUNCATE branches CASCADE;
INSERT INTO branches (id, name, address, phone, email, is_active, created_at) VALUES
  ('brc_jkt', 'Kantor Pusat Jakarta',  'Jl. Sudirman No. 45, Jakarta Pusat 10270', '021-55501234', 'jakarta@umrohplus.co.id', TRUE, NOW()),
  ('brc_jog', 'Cabang Yogyakarta',     'Jl. Malioboro No. 12, Yogyakarta 55271',   '0274-555678',  'jogja@umrohplus.co.id',   TRUE, NOW());

-- ── 7. PAKET UMROH ──────────────────────────────────────────────
TRUNCATE packages CASCADE;
INSERT INTO packages (id, title, slug, description, duration_days, package_type, category_id,
  hotel_makkah_id, hotel_madinah_id, airline_id, airport_id,
  minimum_dp, dp_deadline_days, full_deadline_days, is_active, created_at) VALUES

  ('pkg_reg9',
   'Umroh Reguler 9 Hari', 'umroh-reguler-9-hari',
   'Paket umroh ekonomis 9 hari dengan hotel bintang 4 dekat Masjidil Haram dan Masjid Nabawi. Cocok untuk jemaah yang mengutamakan nilai terbaik.',
   9, 'reguler', 'cat_reg', 'htl_mak3', 'htl_mad3', 'air_qg', 'apt_cgk',
   5000000, 30, 14, TRUE, NOW()),

  ('pkg_reg12',
   'Umroh Reguler 12 Hari', 'umroh-reguler-12-hari',
   'Paket umroh reguler 12 hari dengan waktu ibadah lebih leluasa. Hotel bintang 4, termasuk city tour Makkah dan Madinah.',
   12, 'reguler', 'cat_reg', 'htl_mak3', 'htl_mad3', 'air_ga', 'apt_cgk',
   5000000, 30, 14, TRUE, NOW()),

  ('pkg_prm12',
   'Umroh Premium 12 Hari', 'umroh-premium-12-hari',
   'Paket umroh premium 12 hari dengan hotel bintang 5 tepat di depan Masjidil Haram. Fasilitas lengkap, pembimbing berpengalaman, dan layanan personal terbaik.',
   12, 'premium', 'cat_premium', 'htl_mak2', 'htl_mad1', 'air_ga', 'apt_cgk',
   8000000, 45, 21, TRUE, NOW()),

  ('pkg_vip15',
   'Umroh VIP 15 Hari', 'umroh-vip-15-hari',
   'Paket umroh VIP eksklusif 15 hari. Hotel bintang 5 Fairmont Makkah (view Kabah), Mövenpick Madinah, penerbangan Garuda direct flight, dan layanan concierge 24 jam.',
   15, 'vip', 'cat_vip', 'htl_mak1', 'htl_mad1', 'air_ga', 'apt_cgk',
   15000000, 60, 30, TRUE, NOW()),

  ('pkg_rmdn',
   'Umroh Ramadhan 10 Hari', 'umroh-ramadhan-10-hari',
   'Paket umroh spesial Ramadhan 10 hari. Nikmati berkah bulan suci di tanah haram dengan hotel premium bintang 5 dan bimbingan ustaz berpengalaman.',
   10, 'premium', 'cat_premium', 'htl_mak2', 'htl_mad2', 'air_sv', 'apt_cgk',
   10000000, 60, 30, TRUE, NOW());

-- ── 8. JADWAL KEBERANGKATAN ─────────────────────────────────────
TRUNCATE package_departures CASCADE;
INSERT INTO package_departures (id, package_id, departure_date, return_date, quota, remaining_quota, status, muthawif_id, created_at) VALUES
  -- Reguler 9 Hari
  ('dep_r9_1', 'pkg_reg9',  '2025-08-15', '2025-08-24', 45, 32, 'open', 'mth_001', NOW()),
  ('dep_r9_2', 'pkg_reg9',  '2025-09-20', '2025-09-29', 45, 45, 'open', 'mth_002', NOW()),
  ('dep_r9_3', 'pkg_reg9',  '2025-10-18', '2025-10-27', 45, 45, 'open', 'mth_001', NOW()),
  -- Reguler 12 Hari
  ('dep_r12_1','pkg_reg12', '2025-08-10', '2025-08-22', 40, 28, 'open', 'mth_002', NOW()),
  ('dep_r12_2','pkg_reg12', '2025-09-08', '2025-09-20', 40, 40, 'open', 'mth_001', NOW()),
  -- Premium 12 Hari
  ('dep_p12_1','pkg_prm12', '2025-08-05', '2025-08-17', 30, 14, 'open', 'mth_001', NOW()),
  ('dep_p12_2','pkg_prm12', '2025-09-15', '2025-09-27', 30, 30, 'open', 'mth_002', NOW()),
  -- VIP 15 Hari
  ('dep_vip_1','pkg_vip15', '2025-08-20', '2025-09-04', 20, 11, 'open', 'mth_001', NOW()),
  -- Ramadhan
  ('dep_rmn_1','pkg_rmdn',  '2026-03-10', '2026-03-20', 35, 35, 'open', 'mth_002', NOW());

-- ── 9. HARGA KAMAR ──────────────────────────────────────────────
TRUNCATE departure_prices CASCADE;
INSERT INTO departure_prices (id, departure_id, room_type, price, created_at) VALUES
  -- pkg_reg9
  ('prc_r9_1a','dep_r9_1','quad',   24000000, NOW()),
  ('prc_r9_1b','dep_r9_1','triple', 27000000, NOW()),
  ('prc_r9_1c','dep_r9_1','double', 31000000, NOW()),
  ('prc_r9_2a','dep_r9_2','quad',   24000000, NOW()),
  ('prc_r9_2b','dep_r9_2','triple', 27000000, NOW()),
  ('prc_r9_2c','dep_r9_2','double', 31000000, NOW()),
  ('prc_r9_3a','dep_r9_3','quad',   24000000, NOW()),
  ('prc_r9_3b','dep_r9_3','triple', 27000000, NOW()),
  ('prc_r9_3c','dep_r9_3','double', 31000000, NOW()),
  -- pkg_reg12
  ('prc_r12_1a','dep_r12_1','quad',   28000000, NOW()),
  ('prc_r12_1b','dep_r12_1','triple', 31000000, NOW()),
  ('prc_r12_1c','dep_r12_1','double', 35000000, NOW()),
  ('prc_r12_2a','dep_r12_2','quad',   28000000, NOW()),
  ('prc_r12_2b','dep_r12_2','triple', 31000000, NOW()),
  ('prc_r12_2c','dep_r12_2','double', 35000000, NOW()),
  -- pkg_prm12
  ('prc_p12_1a','dep_p12_1','quad',   39000000, NOW()),
  ('prc_p12_1b','dep_p12_1','triple', 44000000, NOW()),
  ('prc_p12_1c','dep_p12_1','double', 51000000, NOW()),
  ('prc_p12_2a','dep_p12_2','quad',   39000000, NOW()),
  ('prc_p12_2b','dep_p12_2','triple', 44000000, NOW()),
  ('prc_p12_2c','dep_p12_2','double', 51000000, NOW()),
  -- pkg_vip15
  ('prc_vip_1a','dep_vip_1','triple', 65000000, NOW()),
  ('prc_vip_1b','dep_vip_1','double', 75000000, NOW()),
  -- pkg_rmdn
  ('prc_rmn_1a','dep_rmn_1','quad',   42000000, NOW()),
  ('prc_rmn_1b','dep_rmn_1','triple', 48000000, NOW()),
  ('prc_rmn_1c','dep_rmn_1','double', 55000000, NOW());

-- ── 10. TESTIMONIAL ─────────────────────────────────────────────
TRUNCATE testimonials CASCADE;
INSERT INTO testimonials (id, name, location, package_name, rating, content, travel_date, is_active, sort_order, created_at) VALUES
  ('tst_001', 'Bapak & Ibu Hendra Wijaya', 'Jakarta', 'Umroh Premium 12 Hari', 5,
   'Alhamdulillah, perjalanan umroh kami bersama UmrohPlus sangat berkesan. Hotel sangat dekat Masjidil Haram, ustaz pembimbing sangat sabar dan berpengetahuan luas. Kami merasa terlayani dengan sangat baik sejak keberangkatan hingga kepulangan.',
   'Mei 2024', TRUE, 1, NOW()),
  ('tst_002', 'Ibu Sari Rahayu', 'Surabaya', 'Umroh Reguler 9 Hari', 5,
   'Ini pertama kali saya umroh dan alhamdulillah semuanya berjalan lancar. Paket reguler tapi pelayanannya premium. Makanan enak, kamar nyaman, dan pembimbing kami sangat membantu. Insya Allah akan kembali lagi dengan keluarga.',
   'Maret 2024', TRUE, 2, NOW()),
  ('tst_003', 'Keluarga H. Bambang Sutrisno', 'Yogyakarta', 'Umroh VIP 15 Hari', 5,
   'Subhanallah, pengalaman yang luar biasa. Hotel Fairmont dengan view Kabah langsung dari kamar adalah pengalaman tak terlupakan. Tim UmrohPlus sangat profesional dan responsif. Highly recommended untuk keluarga yang ingin ibadah maksimal.',
   'Juli 2024', TRUE, 3, NOW()),
  ('tst_004', 'Ustazah Nisa Khoirunnisa', 'Bandung', 'Umroh Reguler 12 Hari', 5,
   'Saya sudah 3 kali umroh bersama berbagai travel, dan UmrohPlus adalah yang terbaik. Koordinasi sangat rapi, tidak ada kebingungan selama perjalanan. Doa-doa kami terpanjatkan dengan khusyuk berkat dukungan tim yang luar biasa.',
   'April 2024', TRUE, 4, NOW()),
  ('tst_005', 'Bapak Dodi Pratama', 'Medan', 'Umroh Premium 12 Hari', 5,
   'Pelayanan prima dari awal hingga akhir. Manasik umroh yang komprehensif membuat kami siap secara mental dan fisik. Hotel bintang 5 dengan fasilitas lengkap. Terima kasih UmrohPlus atas pengalaman spiritual yang tak terlupakan ini.',
   'Juni 2024', TRUE, 5, NOW());

-- ── 11. FAQ ─────────────────────────────────────────────────────
TRUNCATE faqs CASCADE;
INSERT INTO faqs (id, question, answer, scope, sort_order, is_active, created_at) VALUES
  ('faq_01', 'Apa saja dokumen yang diperlukan untuk umroh?',
   'Dokumen yang diperlukan antara lain: Paspor (masa berlaku minimal 6 bulan), Foto 4x6 background putih, KTP asli, Kartu Keluarga, Akta Nikah (untuk suami-istri), Buku Vaksinasi Meningitis, dan Visa Umroh (diurus oleh travel).',
   'general', 1, TRUE, NOW()),
  ('faq_02', 'Berapa lama proses visa umroh?',
   'Proses visa umroh biasanya membutuhkan waktu 7-14 hari kerja setelah semua dokumen lengkap. Kami akan membantu mengurus seluruh proses visa sehingga Anda tidak perlu khawatir.',
   'general', 2, TRUE, NOW()),
  ('faq_03', 'Apakah ada biaya tambahan selain harga paket?',
   'Harga paket sudah termasuk tiket pesawat PP, akomodasi hotel, konsumsi (3x makan/hari), transportasi darat selama di Arab Saudi, tour lokal, dan biaya handling. Biaya tambahan meliputi pembuatan paspor baru, vaksin meningitis, dan oleh-oleh pribadi.',
   'general', 3, TRUE, NOW()),
  ('faq_04', 'Bagaimana sistem pembayaran cicilan?',
   'Kami menyediakan kemudahan pembayaran cicilan. Anda cukup membayar DP minimal sesuai paket yang dipilih untuk mengamankan kursi. Sisa pembayaran dapat dicicil hingga 2 minggu sebelum keberangkatan. Tidak ada bunga atau biaya tambahan untuk cicilan.',
   'general', 4, TRUE, NOW()),
  ('faq_05', 'Apakah ada pembimbing ibadah selama perjalanan?',
   'Ya, setiap grup akan didampingi oleh muthawif (pembimbing ibadah) berpengalaman yang merupakan lulusan universitas Islam terkemuka. Pembimbing akan memberikan bimbingan ibadah sejak manasik di Indonesia hingga seluruh rangkaian ibadah di Tanah Haram.',
   'general', 5, TRUE, NOW()),
  ('faq_06', 'Apakah bisa mendaftar sendiri (tidak ada mahram)?',
   'Untuk wanita di bawah 45 tahun, keberangkatan umroh wajib bersama mahram (suami atau kerabat laki-laki). Wanita berusia 45 tahun ke atas dapat mendaftar tanpa mahram dengan bergabung dalam rombongan resmi travel yang memiliki izin dari Kemenag.',
   'general', 6, TRUE, NOW()),
  ('faq_07', 'Bagaimana jika saya sakit selama di perjalanan?',
   'Kami menyediakan tim kesehatan dan pembimbing yang siap membantu. Kami juga merekomendasikan peserta memiliki asuransi perjalanan. Pihak kami akan membantu koordinasi dengan fasilitas kesehatan setempat apabila diperlukan.',
   'general', 7, TRUE, NOW()),
  ('faq_08', 'Kapan sebaiknya mendaftar untuk mengamankan kursi?',
   'Kami sangat menyarankan mendaftar minimal 3-4 bulan sebelum jadwal keberangkatan. Terutama untuk periode high season (Ramadhan, liburan sekolah), kursi bisa habis jauh-jauh hari.',
   'general', 8, TRUE, NOW());

-- ── 12. BLOG POST ───────────────────────────────────────────────
TRUNCATE blog_posts CASCADE;
INSERT INTO blog_posts (id, title, slug, excerpt, content, category, author, seo_title, seo_description, is_published, published_at, created_at) VALUES
  ('blg_001',
   'Panduan Lengkap Persiapan Umroh untuk Pemula',
   'panduan-lengkap-persiapan-umroh-pemula',
   'Persiapan umroh tidak hanya soal fisik dan dokumen, tapi juga mental dan spiritual. Simak panduan lengkap untuk jemaah yang pertama kali berangkat umroh.',
   '<h2>Persiapan Fisik</h2><p>Umroh membutuhkan stamina yang baik karena Anda akan banyak berjalan. Latih fisik minimal 3 bulan sebelum keberangkatan dengan berjalan kaki minimal 5 km per hari.</p><h2>Persiapan Dokumen</h2><p>Pastikan paspor Anda masih berlaku minimal 6 bulan dari tanggal keberangkatan. Segera urus vaksin meningitis di puskesmas atau klinik terdekat.</p><h2>Persiapan Spiritual</h2><p>Pelajari tata cara umroh, doa-doa, dan amalan sunnah selama di Tanah Haram. Manasik umroh bersama travel Anda akan sangat membantu.</p>',
   'panduan', 'Tim UmrohPlus',
   'Panduan Umroh Pemula — Tips & Persiapan Lengkap',
   'Panduan lengkap persiapan umroh untuk pemula: dokumen, fisik, spiritual, dan tips dari para ahli. Baca sebelum berangkat!',
   TRUE, '2024-06-01', NOW()),
  ('blg_002',
   '5 Tips Ibadah Maksimal di Masjidil Haram',
   'tips-ibadah-maksimal-masjidil-haram',
   'Masjidil Haram adalah tempat paling mulia di bumi. Berikut tips agar ibadah Anda semakin bermakna dan khusyuk selama berada di sana.',
   '<h2>1. Manfaatkan Waktu Sepi</h2><p>Waktu sepi biasanya dini hari (pukul 02.00-04.00) dan siang hari. Gunakan waktu ini untuk thawaf dan shalat sunnah dengan lebih tenang.</p><h2>2. Perbanyak Doa di Multazam</h2><p>Multazam adalah tempat mustajab antara Hajar Aswad dan pintu Kabah. Jangan lewatkan kesempatan berdoa di sini.</p><h2>3. Shalat di Hijr Ismail</h2><p>Shalat di dalam Hijr Ismail dihitung seperti shalat di dalam Kabah. Manfaatkan waktu-waktu sepi untuk shalat di sini.</p>',
   'panduan', 'Ustaz H. Ahmad Fauzi, Lc.',
   NULL, NULL,
   TRUE, '2024-07-15', NOW()),
  ('blg_003',
   'Kenapa Umroh di Bulan Ramadhan Sangat Istimewa?',
   'keutamaan-umroh-di-bulan-ramadhan',
   'Rasulullah SAW bersabda bahwa umroh di bulan Ramadhan pahalanya setara dengan haji. Simak keutamaan dan keistimewaan umroh Ramadhan.',
   '<h2>Hadits Keutamaan Umroh Ramadhan</h2><p>Dari Ibnu Abbas RA, Rasulullah SAW bersabda: ''Umroh di bulan Ramadhan setara dengan haji bersamaku.'' (HR. Bukhari dan Muslim)</p><h2>Suasana yang Berbeda</h2><p>Suasana Masjidil Haram di bulan Ramadhan sangat berbeda. Jutaan jemaah dari seluruh dunia berkumpul, membuat atmosfer ibadah semakin terasa.</p>',
   'religi', 'Tim UmrohPlus',
   NULL, NULL,
   TRUE, '2024-03-01', NOW());

-- ── 13. GALERI ──────────────────────────────────────────────────
TRUNCATE gallery CASCADE;
INSERT INTO gallery (id, title, category, image_url, sort_order, is_active, created_at) VALUES
  ('gal_001', 'Masjidil Haram dari udara',    'makkah',  'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=800', 1, TRUE, NOW()),
  ('gal_002', 'Kabah di malam hari',           'makkah',  'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800', 2, TRUE, NOW()),
  ('gal_003', 'Masjid Nabawi Madinah',         'madinah', 'https://images.unsplash.com/photo-1587019158091-1a103c5dd17f?w=800', 3, TRUE, NOW()),
  ('gal_004', 'Jemaah umroh thawaf',           'ibadah',  'https://images.unsplash.com/photo-1620932434011-c7db96e0e4bf?w=800', 4, TRUE, NOW()),
  ('gal_005', 'Jabal Nur — Gua Hira',          'wisata',  'https://images.unsplash.com/photo-1569451840618-9a2c6295bcef?w=800', 5, TRUE, NOW()),
  ('gal_006', 'Suasana iftar di Masjidil Haram','makkah', 'https://images.unsplash.com/photo-1608501947097-86951ad73fea?w=800', 6, TRUE, NOW());

-- ── 13B. MATA UANG (MULTI-CURRENCY) ─────────────────────────────
TRUNCATE currencies CASCADE;
INSERT INTO currencies (id, code, name, symbol, rate_to_idr, is_default, is_active, created_at) VALUES
  ('cur_idr', 'IDR', 'Rupiah Indonesia',  'Rp', 1,     TRUE,  TRUE, NOW()),
  ('cur_usd', 'USD', 'Dolar Amerika',     '$',  15800, FALSE, TRUE, NOW()),
  ('cur_sar', 'SAR', 'Riyal Saudi',       '﷼',  4210,  FALSE, TRUE, NOW()),
  ('cur_myr', 'MYR', 'Ringgit Malaysia',  'RM', 3550,  FALSE, TRUE, NOW()),
  ('cur_sgd', 'SGD', 'Dolar Singapura',   'S$', 11750, FALSE, TRUE, NOW());

-- ── 14. PENGATURAN SITUS ────────────────────────────────────────
TRUNCATE site_settings CASCADE;
INSERT INTO site_settings (id, key, category, value, created_at) VALUES
  ('cfg_001', 'company_name',     'general',  '"UmrohPlus Travel & Tours"',           NOW()),
  ('cfg_002', 'company_tagline',  'general',  '"Wujudkan Ibadah Umroh Impian Anda"', NOW()),
  ('cfg_003', 'company_phone',    'general',  '"+62 21 5550 1234"',                   NOW()),
  ('cfg_004', 'company_whatsapp', 'general',  '"6281234567890"',                       NOW()),
  ('cfg_005', 'company_email',    'general',  '"info@umrohplus.co.id"',               NOW()),
  ('cfg_006', 'company_address',  'general',  '"Jl. Sudirman No. 45, Jakarta Pusat 10270, Indonesia"', NOW()),
  ('cfg_007', 'company_instagram','social',   '"https://instagram.com/umrohplus"',    NOW()),
  ('cfg_008', 'company_facebook', 'social',   '"https://facebook.com/umrohplus"',     NOW()),
  ('cfg_009', 'seo_title',        'seo',      '"UmrohPlus — Travel Umroh Terpercaya #1 Indonesia"', NOW()),
  ('cfg_010', 'seo_description',  'seo',      '"UmrohPlus menyediakan paket umroh terjangkau hingga VIP dengan bimbingan ustaz berpengalaman, hotel terbaik, dan pelayanan prima."', NOW()),
  ('cfg_011', 'stats_jamaah',     'homepage', '"12500"',                               NOW()),
  ('cfg_012', 'stats_years',      'homepage', '"15"',                                  NOW()),
  ('cfg_013', 'stats_rating',     'homepage', '"4.9"',                                 NOW()),
  ('cfg_014', 'izin_kemenag',     'legal',    '"D/702/2009"',                          NOW()),
  ('cfg_015', 'iata_number',      'legal',    '"IATA 02-3-5001"',                      NOW());

-- ── 15. TENANT SITE UTAMA ───────────────────────────────────────
TRUNCATE tenant_sites CASCADE;
INSERT INTO tenant_sites (id, subdomain, site_name, tagline, primary_color, secondary_color,
  hero_title, hero_subtitle, about_text,
  whatsapp_number, phone, email, address,
  instagram_url, facebook_url, is_active, template, created_at) VALUES
  ('tnnt_main', 'main', 'UmrohPlus Travel & Tours',
   'Wujudkan Ibadah Umroh Impian Anda',
   '#8B0000', '#D4AF37',
   'Wujudkan Ibadah Umroh Impian Anda',
   'Perjalanan spiritual dengan pelayanan terbaik, bimbingan ustaz berpengalaman, dan hotel bintang 5 dekat Masjidil Haram.',
   'UmrohPlus Travel & Tours adalah travel umroh dan haji terpercaya berpengalaman lebih dari 15 tahun. Kami telah memberangkatkan lebih dari 12.500 jemaah dengan tingkat kepuasan 4.9/5. Berizin resmi Kemenag RI dan berkomitmen memberikan pengalaman ibadah terbaik.',
   '6281234567890', '+62 21 5550 1234', 'info@umrohplus.co.id',
   'Jl. Sudirman No. 45, Jakarta Pusat 10270',
   'https://instagram.com/umrohplus', 'https://facebook.com/umrohplus',
   TRUE, 'default', NOW());

-- ── RINGKASAN ───────────────────────────────────────────────────
SELECT 'package_categories' AS tabel, COUNT(*) AS jumlah FROM package_categories
UNION ALL SELECT 'hotels',             COUNT(*) FROM hotels
UNION ALL SELECT 'airlines',           COUNT(*) FROM airlines
UNION ALL SELECT 'airports',           COUNT(*) FROM airports
UNION ALL SELECT 'muthawifs',          COUNT(*) FROM muthawifs
UNION ALL SELECT 'branches',           COUNT(*) FROM branches
UNION ALL SELECT 'packages',           COUNT(*) FROM packages
UNION ALL SELECT 'package_departures', COUNT(*) FROM package_departures
UNION ALL SELECT 'departure_prices',   COUNT(*) FROM departure_prices
UNION ALL SELECT 'testimonials',       COUNT(*) FROM testimonials
UNION ALL SELECT 'faqs',               COUNT(*) FROM faqs
UNION ALL SELECT 'blog_posts',         COUNT(*) FROM blog_posts
UNION ALL SELECT 'gallery',            COUNT(*) FROM gallery
UNION ALL SELECT 'site_settings',      COUNT(*) FROM site_settings
UNION ALL SELECT 'tenant_sites',       COUNT(*) FROM tenant_sites
ORDER BY tabel;
