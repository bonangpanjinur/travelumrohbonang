-- ================================================================
--  UmrohPlus — Supabase Production Seed Data
--  Kompatibel dengan schema UUID asli Supabase
--  Idempotent: INSERT ... ON CONFLICT DO NOTHING
--  Jalankan via: node push-to-supabase.mjs
-- ================================================================

-- ── 1. CURRENCIES ────────────────────────────────────────────────
INSERT INTO currencies (id, code, name, symbol, rate_to_idr, is_default, is_active, created_at)
VALUES
  (gen_random_uuid(), 'IDR', 'Rupiah Indonesia', 'Rp',  1,     true,  true, now()),
  (gen_random_uuid(), 'USD', 'US Dollar',        '$',   16000, false, true, now()),
  (gen_random_uuid(), 'SAR', 'Riyal Saudi',      'SR',  4300,  false, true, now())
ON CONFLICT (code) DO NOTHING;

-- ── 2. PACKAGE CATEGORIES ────────────────────────────────────────
INSERT INTO package_categories (id, name, description, parent_id, show_extra_hotels, is_active, sort_order, created_at)
VALUES
  (gen_random_uuid(), 'Umroh Reguler',    'Paket umroh standar dengan fasilitas lengkap dan harga terjangkau',      NULL, false, true, 1, now()),
  (gen_random_uuid(), 'Umroh Plus',       'Paket umroh dengan hotel berbintang lebih dekat ke Masjidil Haram',      NULL, false, true, 2, now()),
  (gen_random_uuid(), 'Umroh VIP',        'Paket umroh eksklusif dengan pelayanan premium dan hotel bintang 5',     NULL, false, true, 3, now()),
  (gen_random_uuid(), 'Umroh VVIP',       'Paket umroh paling eksklusif dengan layanan personal concierge',         NULL, false, true, 4, now()),
  (gen_random_uuid(), 'Umroh Ramadhan',   'Paket umroh di bulan suci Ramadhan dengan pengalaman spiritual terbaik', NULL, false, true, 5, now()),
  (gen_random_uuid(), 'Umroh Keluarga',   'Paket umroh khusus keluarga dengan layanan ramah anak',                  NULL, false, true, 6, now()),
  (gen_random_uuid(), 'Umroh Backpacker', 'Paket umroh hemat untuk jamaah muda dengan anggaran terbatas',           NULL, false, true, 7, now())
ON CONFLICT DO NOTHING;

-- ── 3. SITE SETTINGS ─────────────────────────────────────────────
-- key harus unik, gunakan ON CONFLICT (key)
INSERT INTO site_settings (id, key, category, value, created_at)
VALUES
  (gen_random_uuid(), 'site_name',        'general',    '"UmrohPlus"',                                                                        now()),
  (gen_random_uuid(), 'site_tagline',     'general',    '"Biro Perjalanan Umroh Terpercaya"',                                                  now()),
  (gen_random_uuid(), 'site_description', 'general',    '"Wujudkan ibadah umroh impian Anda bersama UmrohPlus. Paket lengkap, hotel bintang 5, bimbingan ustadz berpengalaman."', now()),
  (gen_random_uuid(), 'contact_phone',    'general',    '"081234567890"',                                                                      now()),
  (gen_random_uuid(), 'contact_email',    'general',    '"info@umrohplus.id"',                                                                 now()),
  (gen_random_uuid(), 'contact_whatsapp', 'general',    '"081234567890"',                                                                      now()),
  (gen_random_uuid(), 'contact_address',  'general',    '"Jl. Sudirman No. 123, Jakarta Pusat 10220"',                                         now()),
  (gen_random_uuid(), 'template',         'appearance', '"classic"',                                                                           now()),
  (gen_random_uuid(), 'primary_color',    'appearance', '"#1a56db"',                                                                           now()),
  (gen_random_uuid(), 'logo_url',         'appearance', 'null',                                                                                now()),
  (gen_random_uuid(), 'hero_title',       'hero',       '"Raih Keberkahan Umroh Bersama UmrohPlus"',                                           now()),
  (gen_random_uuid(), 'hero_subtitle',    'hero',       '"Perjalanan ibadah terpercaya dengan harga terbaik dan pelayanan profesional"',        now()),
  (gen_random_uuid(), 'hero_cta_text',    'hero',       '"Lihat Paket Umroh"',                                                                 now()),
  (gen_random_uuid(), 'hero_cta_url',     'hero',       '"/paket"',                                                                            now()),
  (gen_random_uuid(), 'hero_image_url',   'hero',       '"https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1920"',               now()),
  (gen_random_uuid(), 'social_instagram', 'social',     '"https://instagram.com/umrohplus"',                                                   now()),
  (gen_random_uuid(), 'social_facebook',  'social',     '"https://facebook.com/umrohplus"',                                                    now()),
  (gen_random_uuid(), 'social_youtube',   'social',     '"https://youtube.com/@umrohplus"',                                                    now()),
  (gen_random_uuid(), 'social_tiktok',    'social',     '"https://tiktok.com/@umrohplus"',                                                     now())
ON CONFLICT (key) DO NOTHING;

-- ── 4. SERVICES ──────────────────────────────────────────────────
INSERT INTO services (id, title, description, icon, sort_order, is_active, created_at)
VALUES
  (gen_random_uuid(), 'Bimbingan Ustadz Berpengalaman', 'Didampingi ustadz bersertifikat yang berpengalaman lebih dari 10 tahun dalam membimbing jamaah umroh', 'user-check',   1, true, now()),
  (gen_random_uuid(), 'Hotel Bintang 5 Dekat Haram',    'Menginap di hotel premium yang hanya 5-10 menit berjalan kaki dari Masjidil Haram dan Masjid Nabawi',    'building-2',   2, true, now()),
  (gen_random_uuid(), 'Transportasi Nyaman',            'Armada bus AC modern dengan kursi ergonomis untuk perjalanan nyaman ke seluruh destinasi ibadah',         'bus',          3, true, now()),
  (gen_random_uuid(), 'Visa Umroh Dijamin',             'Proses visa umroh cepat dan terjamin dengan tim berpengalaman yang menangani ribuan visa setiap tahun',   'file-check',   4, true, now()),
  (gen_random_uuid(), 'Katering Halal Premium',         'Makan 3 kali sehari dengan menu masakan Indonesia yang lezat, higienis, dan tersertifikasi halal',        'utensils',     5, true, now()),
  (gen_random_uuid(), 'Manasik Intensif',               'Program manasik ibadah selama 3 hari sebelum keberangkatan untuk memastikan ibadah yang sempurna',        'graduation-cap', 6, true, now())
ON CONFLICT DO NOTHING;

-- ── 5. ADVANTAGES ────────────────────────────────────────────────
INSERT INTO advantages (id, title, icon, sort_order, is_active, created_at)
VALUES
  (gen_random_uuid(), '10.000+ Jemaah Diberangkatkan',  'users',        1, true, now()),
  (gen_random_uuid(), 'Izin Resmi PPIU Kemenag',        'shield-check', 2, true, now()),
  (gen_random_uuid(), 'Pengalaman 15 Tahun',            'award',        3, true, now()),
  (gen_random_uuid(), 'Harga Transparan Tanpa Biaya Tersembunyi', 'tag', 4, true, now()),
  (gen_random_uuid(), 'Layanan 24/7',                   'headphones',   5, true, now()),
  (gen_random_uuid(), 'Rating 4.9/5 dari Jemaah',       'star',         6, true, now())
ON CONFLICT DO NOTHING;

-- ── 6. GUIDE STEPS ───────────────────────────────────────────────
INSERT INTO guide_steps (id, step_number, title, description, icon, is_active, created_at)
VALUES
  (gen_random_uuid(), 1, 'Pilih Paket',           'Temukan paket umroh yang sesuai dengan kebutuhan dan anggaran Anda dari berbagai pilihan yang tersedia',        'search',       true, now()),
  (gen_random_uuid(), 2, 'Daftar & Konsultasi',   'Isi formulir pendaftaran dan konsultasikan kebutuhan Anda dengan tim konsultan umroh kami yang berpengalaman',   'clipboard',    true, now()),
  (gen_random_uuid(), 3, 'Bayar & Konfirmasi',    'Lakukan pembayaran DP minimal 30% untuk mengamankan kursi, lalu kami akan proses dokumen dan visa Anda',        'credit-card',  true, now()),
  (gen_random_uuid(), 4, 'Manasik & Berangkat',   'Ikuti program manasik intensif kami lalu berangkat dengan tenang bersama tim muthawif kami yang profesional',    'plane',        true, now())
ON CONFLICT DO NOTHING;

-- ── 7. FAQS ──────────────────────────────────────────────────────
INSERT INTO faqs (id, question, answer, scope, sort_order, is_active, package_id, created_at)
VALUES
  (gen_random_uuid(), 'Apakah UmrohPlus memiliki izin resmi dari Kemenag?',
   'Ya, UmrohPlus adalah Penyelenggara Perjalanan Ibadah Umroh (PPIU) yang telah mendapatkan izin resmi dari Kementerian Agama RI dengan nomor izin yang dapat diverifikasi.',
   'general', 1, true, NULL, now()),
  (gen_random_uuid(), 'Berapa DP minimal untuk mendaftar umroh?',
   'DP minimal adalah 30% dari total harga paket. Pelunasan dapat dilakukan hingga 45 hari sebelum keberangkatan.',
   'general', 2, true, NULL, now()),
  (gen_random_uuid(), 'Apakah bisa mendaftar umroh secara online?',
   'Ya, Anda dapat mendaftar secara online melalui website kami. Tim kami akan menghubungi Anda dalam 1x24 jam untuk konfirmasi dan panduan selanjutnya.',
   'general', 3, true, NULL, now()),
  (gen_random_uuid(), 'Berapa lama proses pembuatan visa umroh?',
   'Proses visa umroh biasanya membutuhkan waktu 2-4 minggu setelah semua dokumen lengkap. Kami menyarankan mendaftar minimal 3 bulan sebelum tanggal keberangkatan.',
   'general', 4, true, NULL, now()),
  (gen_random_uuid(), 'Apakah ada program cicilan?',
   'Ya, kami menyediakan program cicilan 0% untuk pembelian paket umroh dengan kartu kredit tertentu. Hubungi tim kami untuk informasi lebih lanjut.',
   'general', 5, true, NULL, now()),
  (gen_random_uuid(), 'Dokumen apa saja yang dibutuhkan untuk umroh?',
   'Dokumen yang dibutuhkan: Paspor (berlaku min. 7 bulan), KTP, KK, buku nikah/akta kelahiran, pas foto 4x6 latar putih. Tim kami akan memandu proses dokumen Anda.',
   'general', 6, true, NULL, now())
ON CONFLICT DO NOTHING;

-- ── 8. FLOATING BUTTONS ──────────────────────────────────────────
INSERT INTO floating_buttons (id, platform, label, url, icon, is_active, sort_order, created_at)
VALUES
  (gen_random_uuid(), 'whatsapp', 'Chat WhatsApp',   'https://wa.me/6281234567890?text=Assalamualaikum%2C%20saya%20ingin%20informasi%20paket%20umroh', 'message-circle', true, 1, now()),
  (gen_random_uuid(), 'phone',    'Telepon Kami',    'tel:081234567890', 'phone', true, 2, now())
ON CONFLICT DO NOTHING;

-- ── 9. NAVIGATION ITEMS ──────────────────────────────────────────
INSERT INTO navigation_items (id, label, url, parent_id, sort_order, is_active, open_in_new_tab, created_at)
VALUES
  (gen_random_uuid(), 'Beranda',        '/',              NULL, 1, true, false, now()),
  (gen_random_uuid(), 'Paket Umroh',    '/paket',         NULL, 2, true, false, now()),
  (gen_random_uuid(), 'Blog',           '/blog',          NULL, 3, true, false, now()),
  (gen_random_uuid(), 'Galeri',         '/galeri',        NULL, 4, true, false, now()),
  (gen_random_uuid(), 'Tentang Kami',   '/tentang-kami',  NULL, 5, true, false, now()),
  (gen_random_uuid(), 'Kontak',         '/kontak',        NULL, 6, true, false, now())
ON CONFLICT DO NOTHING;

-- ── 10. PAGES ────────────────────────────────────────────────────
INSERT INTO pages (id, slug, title, content, seo_title, seo_description, is_active, created_at)
VALUES
  (gen_random_uuid(), 'tentang-kami', 'Tentang Kami',
   '<h2>Tentang UmrohPlus</h2><p>UmrohPlus adalah biro perjalanan umroh terpercaya yang telah melayani lebih dari 10.000 jemaah selama 15 tahun. Kami berkomitmen memberikan pengalaman ibadah terbaik dengan layanan profesional dan harga transparan.</p><h3>Visi</h3><p>Menjadi penyelenggara umroh terbaik di Indonesia yang memberikan pengalaman ibadah berkesan dan sesuai syariah.</p><h3>Misi</h3><ul><li>Memberikan pelayanan umroh berkualitas tinggi dengan harga terjangkau</li><li>Memastikan setiap jemaah mendapatkan bimbingan ibadah yang benar</li><li>Menjaga kepercayaan jemaah dengan transparansi dan profesionalisme</li></ul>',
   'Tentang UmrohPlus - Biro Perjalanan Umroh Terpercaya', 'Kenali UmrohPlus, biro perjalanan umroh terpercaya dengan 15 tahun pengalaman melayani 10.000+ jemaah.', true, now()),
  (gen_random_uuid(), 'kontak', 'Kontak Kami',
   '<h2>Hubungi Kami</h2><p>Tim kami siap membantu Anda 7 hari seminggu. Jangan ragu untuk menghubungi kami melalui berbagai saluran komunikasi yang tersedia.</p>',
   'Kontak UmrohPlus - Hubungi Kami', 'Hubungi tim UmrohPlus untuk konsultasi paket umroh terbaik untuk Anda.', true, now())
ON CONFLICT (slug) DO NOTHING;

-- ── 11. SEO OVERRIDES ────────────────────────────────────────────
INSERT INTO seo_overrides (id, path, title, description, keywords, noindex, og_image, created_at)
VALUES
  (gen_random_uuid(), '/',              'UmrohPlus - Biro Perjalanan Umroh Terpercaya', 'Wujudkan ibadah umroh impian Anda bersama UmrohPlus. Paket lengkap, hotel bintang 5, bimbingan ustadz berpengalaman.', 'umroh, paket umroh, biro umroh, umroh murah, umroh terpercaya', false, 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200', now()),
  (gen_random_uuid(), '/paket',         'Paket Umroh Terbaik 2025 - UmrohPlus', 'Temukan paket umroh terbaik dengan harga transparan. Reguler, Plus, VIP, hingga VVIP tersedia.', 'paket umroh, harga umroh, umroh reguler, umroh vip', false, NULL, now()),
  (gen_random_uuid(), '/blog',          'Blog Umroh - Tips & Panduan Ibadah - UmrohPlus', 'Baca artikel tips umroh, panduan ibadah, dan inspirasi perjalanan spiritual dari UmrohPlus.', 'blog umroh, tips umroh, panduan umroh', false, NULL, now()),
  (gen_random_uuid(), '/tentang-kami',  'Tentang UmrohPlus - 15 Tahun Melayani Jemaah', 'UmrohPlus biro perjalanan umroh berpengalaman 15 tahun dengan 10.000+ jemaah yang telah diberangkatkan.', 'tentang umrohplus, biro umroh terpercaya', false, NULL, now()),
  (gen_random_uuid(), '/kontak',        'Kontak UmrohPlus - Konsultasi Gratis', 'Hubungi tim UmrohPlus untuk konsultasi paket umroh. Kami siap membantu 7 hari seminggu.', 'kontak umrohplus, konsultasi umroh', false, NULL, now())
ON CONFLICT (path) DO NOTHING;

-- ── 12. TESTIMONIALS ─────────────────────────────────────────────
INSERT INTO testimonials (id, name, location, content, rating, photo_url, package_name, travel_date, sort_order, is_active, created_at)
VALUES
  (gen_random_uuid(), 'Hj. Siti Rahayu', 'Jakarta Selatan',
   'Alhamdulillah, perjalanan umroh bersama UmrohPlus benar-benar berkesan. Pembimbing ustadz sangat sabar dan berpengetahuan luas. Hotel dekat Haram sehingga mudah untuk sholat berjamaah. Rekomendasikan untuk semua keluarga!',
   5, 'https://i.pravatar.cc/150?img=47', 'Umroh Reguler 9 Hari', 'Maret 2025', 1, true, now()),
  (gen_random_uuid(), 'Bpk. Ahmad Fauzi', 'Surabaya',
   'Ini adalah umroh pertama saya dan saya sangat terkesan dengan pelayanan UmrohPlus. Mulai dari proses pendaftaran hingga kepulangan, semuanya berjalan lancar. Manasiknya sangat membantu mempersiapkan diri.',
   5, 'https://i.pravatar.cc/150?img=68', 'Umroh Plus 12 Hari', 'Februari 2025', 2, true, now()),
  (gen_random_uuid(), 'Ibu Dewi Lestari', 'Bandung',
   'Paket VIP yang kami ambil benar-benar worth it. Kamar hotel luas, makanan enak, dan yang paling penting bimbingan ustadznya sangat profesional. Kami sudah berniat untuk umroh lagi tahun depan bersama UmrohPlus.',
   5, 'https://i.pravatar.cc/150?img=32', 'Umroh VIP 14 Hari', 'Januari 2025', 3, true, now()),
  (gen_random_uuid(), 'Ust. Mahmud Wahyudi', 'Yogyakarta',
   'Sebagai seorang yang berprofesi sebagai ustadz, saya sangat menghargai kualitas bimbingan ibadah yang diberikan tim muthawif UmrohPlus. Sungguh profesional dan sesuai tuntunan. Semoga makin banyak jemaah yang bisa diberangkatkan.',
   5, 'https://i.pravatar.cc/150?img=57', 'Umroh Ramadhan 15 Hari', 'Maret 2025', 4, true, now()),
  (gen_random_uuid(), 'Keluarga Santoso', 'Semarang',
   'Umroh keluarga bersama 5 orang anak kami. Alhamdulillah semua berjalan lancar, anak-anak sangat antusias dan mendapat pengalaman spiritual yang luar biasa. Tim UmrohPlus sangat perhatian kepada keluarga dengan anak kecil.',
   5, 'https://i.pravatar.cc/150?img=15', 'Umroh Keluarga 10 Hari', 'April 2025', 5, true, now())
ON CONFLICT DO NOTHING;

-- ── 13. GALLERY ──────────────────────────────────────────────────
INSERT INTO gallery (id, title, description, image_url, category, sort_order, is_active, created_at)
VALUES
  (gen_random_uuid(), 'Masjidil Haram - Makkah',         'Pemandangan Masjidil Haram dari sudut terbaik saat musim umroh',                          'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800', 'makkah',  1, true, now()),
  (gen_random_uuid(), 'Kabah - Pusat Tawaf',              'Ribuan jemaah melakukan tawaf mengelilingi Kabah yang suci',                               'https://images.unsplash.com/photo-1564769625673-e81b43ad4de5?w=800', 'makkah',  2, true, now()),
  (gen_random_uuid(), 'Masjid Nabawi - Madinah',          'Keindahan Masjid Nabawi di sore hari dengan payung-payung raksasa yang terbuka',           'https://images.unsplash.com/photo-1571406761720-6f2b24f4bda9?w=800', 'madinah', 3, true, now()),
  (gen_random_uuid(), 'Raudhah - Taman Surga',            'Area Raudhah yang penuh berkah di dalam Masjid Nabawi',                                    'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800', 'madinah', 4, true, now()),
  (gen_random_uuid(), 'Jamaah Sholat Subuh',              'Ribuan jemaah memenuhi pelataran Masjidil Haram untuk sholat subuh berjamaah',             'https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?w=800', 'makkah',  5, true, now()),
  (gen_random_uuid(), 'Jabal Nur - Gua Hira',             'Perjalanan menuju Jabal Nur tempat wahyu pertama diturunkan',                              'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?w=800', 'ziarah',  6, true, now()),
  (gen_random_uuid(), 'Manasik Jamaah UmrohPlus',         'Sesi manasik bersama ustadz pembimbing sebelum keberangkatan',                             'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800', 'kegiatan',7, true, now()),
  (gen_random_uuid(), 'Hotel Bintang 5 Makkah',           'Kamar mewah hotel bintang 5 dengan pemandangan langsung ke Masjidil Haram',                'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800', 'hotel',   8, true, now()),
  (gen_random_uuid(), 'Makan Bersama Jamaah',             'Momen kebersamaan jamaah saat makan bersama di restoran hotel',                            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', 'kegiatan',9, true, now()),
  (gen_random_uuid(), 'Pemandangan Makkah dari Atas',     'Panorama kota Makkah yang indah dengan Masjidil Haram di tengahnya',                       'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800', 'makkah', 10, true, now())
ON CONFLICT DO NOTHING;

-- ── 14. BLOG POSTS ───────────────────────────────────────────────
INSERT INTO blog_posts (id, title, slug, excerpt, content, image_url, category, author, is_published, published_at, seo_title, seo_description, created_at)
VALUES
(
  gen_random_uuid(),
  'Panduan Lengkap Umroh untuk Pemula: Dari Pendaftaran hingga Kepulangan',
  'panduan-umroh-pemula',
  'Panduan komprehensif bagi Anda yang pertama kali menunaikan ibadah umroh. Semua yang perlu Anda ketahui mulai dari persiapan dokumen, manasik, hingga tips selama di tanah suci.',
  '<h2>Persiapan Dokumen Umroh</h2><p>Langkah pertama yang harus Anda lakukan adalah mempersiapkan semua dokumen yang diperlukan. Pastikan paspor Anda masih berlaku minimal 7 bulan dari tanggal keberangkatan.</p><h3>Dokumen Wajib</h3><ul><li><strong>Paspor</strong> - Berlaku minimal 7 bulan</li><li><strong>KTP</strong> - Fotokopi yang masih berlaku</li><li><strong>Kartu Keluarga</strong> - Untuk verifikasi hubungan keluarga</li><li><strong>Buku Nikah / Akta Kelahiran</strong> - Tergantung status Anda</li><li><strong>Pas Foto</strong> - 4x6 cm, latar putih, wajah 80%</li></ul><h2>Manasik Umroh</h2><p>Manasik adalah latihan simulasi ibadah umroh yang sangat penting. Di UmrohPlus, kami menyediakan program manasik intensif selama 3 hari sebelum keberangkatan.</p><h2>Persiapan Fisik dan Mental</h2><p>Ibadah umroh membutuhkan stamina yang baik. Mulailah berolahraga ringan 3 bulan sebelum keberangkatan dan konsultasikan kondisi kesehatan Anda dengan dokter.</p>',
  'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200',
  'Panduan',
  'Tim Editorial UmrohPlus',
  true,
  now() - INTERVAL '30 days',
  'Panduan Lengkap Umroh untuk Pemula 2025 | UmrohPlus',
  'Panduan komprehensif umroh untuk pemula. Persiapan dokumen, manasik, tips selama di tanah suci, dan semua yang perlu Anda ketahui.',
  now() - INTERVAL '30 days'
),
(
  gen_random_uuid(),
  'Tata Cara Umroh yang Benar Sesuai Sunnah',
  'tata-cara-umroh-sesuai-sunnah',
  'Pelajari tata cara umroh yang benar sesuai tuntunan Rasulullah SAW, mulai dari ihram, tawaf, sai, hingga tahallul dengan penjelasan lengkap dan dalil-dalilnya.',
  '<h2>Rukun Umroh</h2><p>Umroh memiliki 4 rukun utama yang wajib dilaksanakan. Meninggalkan salah satu rukun akan membuat umroh Anda tidak sah.</p><h3>1. Ihram</h3><p>Ihram adalah niat untuk memulai ibadah umroh disertai dengan memakai pakaian ihram. Miqat untuk jamaah dari Indonesia adalah Yalamlam atau Bir Ali (Dzulhulaifah).</p><h3>2. Tawaf</h3><p>Tawaf adalah mengelilingi Kabah sebanyak 7 kali putaran berlawanan arah jarum jam, dimulai dari Hajar Aswad.</p><h3>3. Sai</h3><p>Sai adalah berjalan antara Bukit Shafa dan Marwah sebanyak 7 kali, dimulai dari Shafa dan berakhir di Marwah.</p><h3>4. Tahallul</h3><p>Tahallul adalah mencukur atau memotong rambut sebagai tanda berakhirnya ibadah umroh. Bagi pria disunnahkan mencukur habis.</p>',
  'https://images.unsplash.com/photo-1564769625673-e81b43ad4de5?w=1200',
  'Panduan',
  'Ustadz Ahmad Fauzi, Lc.',
  true,
  now() - INTERVAL '25 days',
  'Tata Cara Umroh yang Benar Sesuai Sunnah | UmrohPlus',
  'Panduan lengkap tata cara umroh sesuai sunnah Rasulullah SAW. Mulai dari ihram, tawaf, sai, hingga tahallul.',
  now() - INTERVAL '25 days'
),
(
  gen_random_uuid(),
  'Tips Menjaga Kesehatan Selama Umroh di Musim Panas',
  'tips-kesehatan-umroh-musim-panas',
  'Cuaca panas di Arab Saudi bisa mencapai 45°C di musim panas. Pelajari tips penting untuk menjaga kesehatan dan stamina selama menunaikan ibadah umroh.',
  '<h2>Mengapa Kesehatan Sangat Penting?</h2><p>Ibadah umroh melibatkan banyak aktivitas fisik seperti tawaf, sai, dan berjalan jauh. Tanpa persiapan yang baik, jamaah rentan terserang heat stroke, dehidrasi, dan kelelahan.</p><h2>Tips Utama Menjaga Kesehatan</h2><h3>1. Hidrasi yang Cukup</h3><p>Minumlah air minimal 3-4 liter per hari. Bawa selalu botol air minum dan manfaatkan air zamzam yang tersedia di masjid.</p><h3>2. Gunakan Payung dan Tabir Surya</h3><p>Saat berada di luar ruangan, gunakan payung untuk melindungi dari sinar matahari langsung. Aplikasikan tabir surya SPF 50+ setiap 2 jam.</p><h3>3. Pilih Waktu yang Tepat untuk Ibadah</h3><p>Hindari berada di luar ruangan antara pukul 11.00-16.00. Manfaatkan waktu ini untuk istirahat di hotel.</p>',
  'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1200',
  'Tips',
  'dr. Nurul Huda, SpPD',
  true,
  now() - INTERVAL '20 days',
  'Tips Kesehatan Umroh Musim Panas - Jaga Stamina di Tanah Suci | UmrohPlus',
  'Tips penting menjaga kesehatan dan stamina selama umroh di cuaca panas Arab Saudi. Panduan dari dokter untuk jamaah.',
  now() - INTERVAL '20 days'
),
(
  gen_random_uuid(),
  'Keutamaan Umroh di Bulan Ramadhan: Pahala Setara Haji',
  'keutamaan-umroh-ramadhan',
  'Rasulullah SAW bersabda bahwa umroh di bulan Ramadhan pahalanya setara dengan ibadah haji. Pelajari keutamaan dan tips khusus untuk umroh Ramadhan.',
  '<h2>Hadits tentang Umroh Ramadhan</h2><p>Dari Ibnu Abbas ra. bahwa Rasulullah SAW bertanya kepada seorang wanita dari Anshar: "Apa yang menghalangimu untuk berhaji bersama kami?" Ia menjawab: "Kami tidak memiliki unta kecuali dua ekor, satunya sudah dipakai oleh suamiku dan anaknya." Rasulullah SAW berkata: "Apabila Ramadhan datang, tunaikanlah umroh, karena sesungguhnya umroh di bulan Ramadhan senilai dengan haji." (HR. Bukhari dan Muslim)</p><h2>Keutamaan Khusus Umroh Ramadhan</h2><ul><li>Pahala berlipat ganda di setiap amalan</li><li>Merasakan suasana Ramadhan di tanah suci yang sangat istimewa</li><li>Sholat tarawih dan tahajjud berjamaah di Masjidil Haram</li><li>Kesempatan itikaf di 10 malam terakhir Ramadhan</li></ul>',
  'https://images.unsplash.com/photo-1571406761720-6f2b24f4bda9?w=1200',
  'Inspirasi',
  'Ustadz Mahmud Wahyudi, MA.',
  true,
  now() - INTERVAL '15 days',
  'Keutamaan Umroh Ramadhan - Pahala Setara Haji | UmrohPlus',
  'Hadits dan keutamaan umroh di bulan Ramadhan yang pahalanya setara haji. Tips khusus untuk umroh Ramadhan.',
  now() - INTERVAL '15 days'
),
(
  gen_random_uuid(),
  'Ziarah Wajib di Makkah dan Madinah: Panduan Lengkap',
  'ziarah-makkah-madinah',
  'Panduan ziarah ke tempat-tempat bersejarah di Makkah dan Madinah. Dari Jabal Nur hingga Raudhah, kenali makna spiritual setiap lokasi.',
  '<h2>Ziarah di Makkah</h2><h3>1. Jabal Nur - Gua Hira</h3><p>Tempat turunnya wahyu pertama kepada Nabi Muhammad SAW. Untuk mencapai gua ini, jamaah harus mendaki sekitar 1,5 km. Persiapkan fisik yang baik.</p><h3>2. Jabal Tsur</h3><p>Gua tempat Nabi SAW dan Abu Bakar ra. bersembunyi saat hijrah ke Madinah selama 3 hari 3 malam.</p><h3>3. Masjid Ji''ranah</h3><p>Miqat untuk umroh kedua bagi yang ingin melaksanakan umroh lagi setelah sampai di Makkah.</p><h2>Ziarah di Madinah</h2><h3>1. Raudhah</h3><p>Area antara mimbar dan rumah Nabi SAW yang disebut sebagai taman surga. Sangat dianjurkan untuk sholat dan berdoa di sini.</p><h3>2. Makam Baqi</h3><p>Pemakaman para sahabat Nabi SAW dan keluarga beliau. Tempat untuk mendoakan mereka yang telah mendahului kita.</p>',
  'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?w=1200',
  'Panduan',
  'Tim Editorial UmrohPlus',
  true,
  now() - INTERVAL '10 days',
  'Panduan Ziarah di Makkah dan Madinah | UmrohPlus',
  'Panduan lengkap ziarah di Makkah dan Madinah. Jabal Nur, Gua Hira, Raudhah, dan tempat bersejarah Islam lainnya.',
  now() - INTERVAL '10 days'
),
(
  gen_random_uuid(),
  'Cara Memilih Paket Umroh yang Tepat: Reguler, Plus, atau VIP?',
  'cara-memilih-paket-umroh',
  'Bingung memilih paket umroh? Panduan lengkap perbedaan paket Reguler, Plus, VIP, dan VVIP beserta tips memilih sesuai kebutuhan dan anggaran Anda.',
  '<h2>Perbedaan Paket Umroh</h2><h3>Paket Reguler</h3><p>Cocok untuk jamaah yang mengutamakan nilai ibadah dengan harga terjangkau. Hotel bintang 3-4, jarak 500m-1km dari Haram.</p><h3>Paket Plus</h3><p>Keseimbangan antara kenyamanan dan harga. Hotel bintang 4-5, jarak 200-500m dari Haram. Pilihan populer untuk keluarga.</p><h3>Paket VIP</h3><p>Kenyamanan premium dengan hotel bintang 5 berjarak 50-200m dari Haram. Layanan personal dan fasilitas mewah.</p><h3>Paket VVIP</h3><p>Pengalaman paling eksklusif. Hotel berbatasan langsung dengan Haram, layanan concierge 24 jam, dan program ibadah yang sangat personal.</p><h2>Tips Memilih Paket</h2><ul><li>Sesuaikan dengan kondisi fisik, terutama bagi lansia</li><li>Pertimbangkan jarak hotel dari Masjidil Haram</li><li>Cek fasilitas makan yang termasuk dalam paket</li><li>Pastikan ada program manasik yang komprehensif</li></ul>',
  'https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?w=1200',
  'Tips',
  'Tim Konsultan UmrohPlus',
  true,
  now() - INTERVAL '5 days',
  'Cara Memilih Paket Umroh Reguler, Plus, atau VIP | UmrohPlus',
  'Panduan memilih paket umroh yang tepat. Perbandingan paket Reguler, Plus, VIP, dan VVIP beserta tips sesuai kebutuhan.',
  now() - INTERVAL '5 days'
)
ON CONFLICT (slug) DO NOTHING;

-- ── 15. VERIFIKASI ───────────────────────────────────────────────
SELECT tabel, jumlah FROM (
  SELECT 'currencies'        AS tabel, COUNT(*) AS jumlah FROM currencies
  UNION ALL SELECT 'package_categories', COUNT(*) FROM package_categories
  UNION ALL SELECT 'site_settings',      COUNT(*) FROM site_settings
  UNION ALL SELECT 'services',           COUNT(*) FROM services
  UNION ALL SELECT 'advantages',         COUNT(*) FROM advantages
  UNION ALL SELECT 'guide_steps',        COUNT(*) FROM guide_steps
  UNION ALL SELECT 'faqs',               COUNT(*) FROM faqs
  UNION ALL SELECT 'floating_buttons',   COUNT(*) FROM floating_buttons
  UNION ALL SELECT 'navigation_items',   COUNT(*) FROM navigation_items
  UNION ALL SELECT 'pages',              COUNT(*) FROM pages
  UNION ALL SELECT 'seo_overrides',      COUNT(*) FROM seo_overrides
  UNION ALL SELECT 'testimonials',       COUNT(*) FROM testimonials
  UNION ALL SELECT 'gallery',            COUNT(*) FROM gallery
  UNION ALL SELECT 'blog_posts',         COUNT(*) FROM blog_posts
) sub
ORDER BY tabel;
