-- =============================================================
--  UmrohPlus — Supabase Seed Data
--  Jalankan SETELAH supabase-schema.sql
--  Idempotent: INSERT ... ON CONFLICT DO NOTHING
-- =============================================================

-- =============================================================
-- 1. CURRENCIES — Mata uang default
-- =============================================================

INSERT INTO currencies (id, code, name, symbol, rate_to_idr, is_default, is_active, created_at)
VALUES
  ('cur_idr', 'IDR', 'Rupiah Indonesia', 'Rp',    1,      true,  true, now()),
  ('cur_usd', 'USD', 'US Dollar',        '$',     16000,  false, true, now()),
  ('cur_sar', 'SAR', 'Riyal Saudi',      'SR',    4300,   false, true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 2. PACKAGE CATEGORIES — Kategori paket umroh
-- =============================================================

INSERT INTO package_categories (id, name, description, parent_id, icon, show_extra_hotels, is_active, sort_order, created_at)
VALUES
  ('cat_reguler',   'Umroh Reguler',    'Paket umroh standar dengan fasilitas lengkap dan harga terjangkau',       NULL, 'star',    false, true, 1, now()),
  ('cat_plus',      'Umroh Plus',       'Paket umroh dengan hotel berbintang lebih dekat ke Masjidil Haram',       NULL, 'star-filled', false, true, 2, now()),
  ('cat_vip',       'Umroh VIP',        'Paket umroh eksklusif dengan pelayanan premium dan hotel bintang 5',      NULL, 'crown',   false, true, 3, now()),
  ('cat_vvip',      'Umroh VVIP',       'Paket umroh paling eksklusif dengan layanan personal concierge',          NULL, 'diamond', false, true, 4, now()),
  ('cat_ramadhan',  'Umroh Ramadhan',   'Paket umroh di bulan suci Ramadhan dengan pengalaman spiritual terbaik',  NULL, 'moon',    false, true, 5, now()),
  ('cat_keluarga',  'Umroh Keluarga',   'Paket umroh khusus keluarga dengan layanan ramah anak',                  NULL, 'home',    false, true, 6, now()),
  ('cat_backpacker','Umroh Backpacker', 'Paket umroh hemat untuk jamaah muda dengan anggaran terbatas',            NULL, 'backpack',false, true, 7, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 3. BRANCHES — Kantor cabang
-- =============================================================

INSERT INTO branches (id, name, address, phone, email, is_active, created_at)
VALUES
  ('branch_pusat', 'Kantor Pusat', 'Jakarta, Indonesia', '02112345678', 'info@umrohplus.id', true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 4. SITE SETTINGS — Pengaturan tampilan & kontak
-- =============================================================

INSERT INTO site_settings (id, key, category, value, created_at)
VALUES
  -- Identitas perusahaan
  ('ss_site_name',       'site_name',       'general',   '"UmrohPlus"',                                    now()),
  ('ss_site_tagline',    'site_tagline',    'general',   '"Travel & Tours Terpercaya"',                     now()),
  ('ss_site_logo',       'site_logo_url',   'general',   'null',                                            now()),
  ('ss_favicon',         'favicon_url',     'general',   'null',                                            now()),

  -- Kontak
  ('ss_whatsapp',        'whatsapp_number', 'contact',   '"6281234567890"',                                 now()),
  ('ss_phone',           'phone',           'contact',   '"021-1234-5678"',                                 now()),
  ('ss_email',           'contact_email',   'contact',   '"info@umrohplus.id"',                             now()),
  ('ss_address',         'address',         'contact',   '"Jakarta, Indonesia"',                            now()),

  -- Hero section
  ('ss_hero_title',      'hero_title',      'homepage',  '"Wujudkan Ibadah Umroh Impian Anda"',            now()),
  ('ss_hero_subtitle',   'hero_subtitle',   'homepage',  '"Perjalanan spiritual dengan pelayanan terbaik, bimbingan ustadz berpengalaman, dan hotel bintang 5 dekat Masjidil Haram."', now()),
  ('ss_hero_image',      'hero_image_url',  'homepage',  'null',                                            now()),
  ('ss_hero_badge',      'hero_badge_text', 'homepage',  '"Dipercaya 10.000+ Jemaah"',                     now()),

  -- Tentang
  ('ss_about_text',      'about_text',      'about',     '"UmrohPlus adalah biro perjalanan umroh terpercaya yang telah melayani lebih dari 10.000 jemaah sejak 2009. Kami berkomitmen memberikan pelayanan terbaik agar ibadah umroh Anda berjalan lancar dan penuh berkah."', now()),
  ('ss_founded_year',    'founded_year',    'about',     '"2009"',                                          now()),
  ('ss_total_jamaah',    'total_jamaah',    'about',     '"10000"',                                         now()),

  -- Warna tema
  ('ss_primary_color',   'primary_color',   'theme',     '"#8B1A1A"',                                      now()),
  ('ss_secondary_color', 'secondary_color', 'theme',     '"#C8922A"',                                      now()),

  -- Social media
  ('ss_instagram',       'instagram_url',   'social',    '"https://instagram.com/umrohplus"',              now()),
  ('ss_facebook',        'facebook_url',    'social',    '"https://facebook.com/umrohplus"',               now()),
  ('ss_youtube',         'youtube_url',     'social',    '"https://youtube.com/@umrohplus"',               now()),

  -- SEO global
  ('ss_seo_title',       'seo_title',       'seo',       '"UmrohPlus - Biro Perjalanan Umroh Terpercaya"', now()),
  ('ss_seo_description', 'seo_description', 'seo',       '"Wujudkan ibadah umroh impian Anda bersama UmrohPlus. Paket lengkap, hotel bintang 5, bimbingan ustadz berpengalaman. Daftar sekarang!"', now()),
  ('ss_seo_image',       'seo_og_image',    'seo',       'null',                                            now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 5. SERVICES — Layanan unggulan
-- =============================================================

INSERT INTO services (id, title, description, icon, sort_order, is_active, created_at)
VALUES
  ('svc_01', 'Bimbingan Ustadz Berpengalaman', 'Didampingi ustadz bersertifikat yang berpengalaman lebih dari 10 tahun dalam membimbing jamaah umroh',                      'user-check',   1, true, now()),
  ('svc_02', 'Hotel Bintang 5 Dekat Haram',    'Akomodasi premium dengan jarak berjalan kaki ke Masjidil Haram dan Masjid Nabawi, kenyamanan ibadah terjaga',               'building',     2, true, now()),
  ('svc_03', 'Visa Dijamin Terbit',             'Proses visa umroh ditangani langsung oleh tim profesional kami dengan tingkat keberhasilan 99%',                             'shield-check', 3, true, now()),
  ('svc_04', 'Transportasi Nyaman',             'Armada bus AC modern antar-jemput dari hotel ke masjid, sehingga jamaah bisa fokus beribadah tanpa khawatir transportasi', 'bus',          4, true, now()),
  ('svc_05', 'Asuransi Perjalanan Lengkap',     'Perlindungan jiwa dan kesehatan selama perjalanan umroh, jamaah dan keluarga tenang sepanjang ibadah',                      'heart-pulse',  5, true, now()),
  ('svc_06', 'Konsultasi Manasik Gratis',       'Pelatihan manasik umroh komprehensif sebelum keberangkatan agar jamaah siap lahir dan batin menjalankan ibadah',            'book-open',    6, true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 6. ADVANTAGES — Keunggulan perusahaan
-- =============================================================

INSERT INTO advantages (id, title, icon, sort_order, is_active, created_at)
VALUES
  ('adv_01', '10.000+ Jemaah Diberangkatkan', 'users',        1, true, now()),
  ('adv_02', 'Berpengalaman Sejak 2009',       'calendar',     2, true, now()),
  ('adv_03', 'Izin Resmi Kemenag RI',          'badge-check',  3, true, now()),
  ('adv_04', 'Harga Transparan Tanpa Biaya Tersembunyi', 'circle-dollar-sign', 4, true, now()),
  ('adv_05', 'Pelayanan 24/7 Selama di Tanah Suci',     'headset',            5, true, now()),
  ('adv_06', 'Rating 4.9/5 dari 3.000+ Ulasan',         'star',               6, true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 7. GUIDE STEPS — Langkah-langkah pendaftaran
-- =============================================================

INSERT INTO guide_steps (id, step_number, title, description, icon, is_active, created_at)
VALUES
  ('gs_01', 1, 'Pilih Paket',           'Temukan paket umroh yang sesuai dengan kebutuhan dan anggaran Anda dari berbagai pilihan yang tersedia',        'search',       true, now()),
  ('gs_02', 2, 'Daftarkan Diri',        'Isi formulir pendaftaran online atau kunjungi kantor kami. Konsultasikan kebutuhan Anda dengan tim kami',        'clipboard',    true, now()),
  ('gs_03', 3, 'Bayar & Konfirmasi',    'Lakukan pembayaran DP untuk mengamankan kursi Anda. Kami menerima transfer bank dan berbagai metode pembayaran', 'credit-card',  true, now()),
  ('gs_04', 4, 'Lengkapi Dokumen',      'Upload dokumen yang diperlukan (paspor, KTP, foto) melalui portal jemaah. Tim kami siap membantu proses visa',  'file-text',    true, now()),
  ('gs_05', 5, 'Ikuti Manasik',         'Hadiri pelatihan manasik umroh yang kami selenggarakan agar ibadah Anda sempurna dan sesuai tuntunan',           'book-open',    true, now()),
  ('gs_06', 6, 'Berangkat ke Tanah Suci','Tiba waktunya! Kami antar dari bandara dan dampingi selama ibadah umroh hingga kembali ke tanah air dengan selamat', 'plane',   true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 8. FAQS — Pertanyaan yang sering ditanyakan
-- =============================================================

INSERT INTO faqs (id, question, answer, scope, package_id, sort_order, is_active, created_at)
VALUES
  -- FAQ Umum
  ('faq_01', 'Apakah UmrohPlus memiliki izin resmi dari Kemenag?',
   'Ya, UmrohPlus terdaftar resmi sebagai Penyelenggara Perjalanan Ibadah Umrah (PPIU) yang berizin dari Kementerian Agama Republik Indonesia. Nomor izin kami dapat dilihat di halaman Tentang Kami.',
   'general', NULL, 1, true, now()),

  ('faq_02', 'Berapa lama durasi paket umroh yang tersedia?',
   'Kami menyediakan paket umroh mulai dari 9 hari hingga 15 hari, disesuaikan dengan kebutuhan jamaah. Paket Ramadhan tersedia mulai 12 hingga 30 hari.',
   'general', NULL, 2, true, now()),

  ('faq_03', 'Apakah harga sudah termasuk biaya visa?',
   'Ya, semua harga paket umroh kami sudah termasuk biaya visa umroh, tiket pesawat PP, hotel, transportasi, dan muthawif pendamping. Tidak ada biaya tersembunyi.',
   'general', NULL, 3, true, now()),

  ('faq_04', 'Berapa uang muka (DP) yang harus dibayar untuk mendaftar?',
   'Uang muka minimal untuk mengamankan kursi adalah Rp 5.000.000. Pelunasan dapat dilakukan secara bertahap sebelum batas waktu yang ditentukan pada setiap paket.',
   'general', NULL, 4, true, now()),

  ('faq_05', 'Dokumen apa saja yang diperlukan untuk umroh?',
   'Dokumen wajib yang diperlukan: (1) Paspor aktif minimal berlaku 6 bulan, (2) KTP asli, (3) Kartu Keluarga, (4) Foto 4x6 background putih 6 lembar, (5) Buku nikah (untuk suami-istri), (6) Akte lahir (untuk anak-anak). Untuk wanita di bawah 45 tahun wajib ada mahram.',
   'general', NULL, 5, true, now()),

  ('faq_06', 'Apakah ada batas usia untuk umroh?',
   'Umroh dapat dilakukan oleh jamaah dari segala usia. Untuk anak-anak di bawah 12 tahun dan lansia di atas 60 tahun, kami sarankan konsultasi dengan tim kami terlebih dahulu untuk pemilihan paket yang tepat.',
   'general', NULL, 6, true, now()),

  ('faq_07', 'Kapan waktu terbaik untuk umroh?',
   'Umroh dapat dilakukan sepanjang tahun kecuali saat musim haji (bulan Dzulhijjah). Waktu terfavorit adalah bulan Ramadhan (pahala berlipat ganda) dan bulan Rajab. Untuk cuaca terbaik, pilih Oktober-Februari.',
   'general', NULL, 7, true, now()),

  ('faq_08', 'Bagaimana jika saya perlu membatalkan atau mengganti jadwal?',
   'Perubahan jadwal keberangkatan dapat dilakukan maksimal 30 hari sebelum tanggal berangkat dengan biaya administrasi. Pembatalan dengan pengembalian dana diatur sesuai kebijakan yang berlaku. Silakan hubungi tim kami untuk informasi lebih lanjut.',
   'general', NULL, 8, true, now()),

  ('faq_09', 'Apakah tersedia layanan umroh untuk jamaah lansia atau berkebutuhan khusus?',
   'Ya, kami memiliki paket khusus untuk jamaah lansia dan berkebutuhan khusus dengan fasilitas tambahan seperti kursi roda, asisten pendamping, dan kamar hotel yang mudah diakses.',
   'general', NULL, 9, true, now()),

  ('faq_10', 'Bagaimana cara menghubungi tim UmrohPlus?',
   'Anda dapat menghubungi kami melalui: WhatsApp di nomor yang tertera, telepon kantor, email, atau mengunjungi kantor kami langsung. Tim customer service kami siap melayani 24/7 selama Anda di Tanah Suci.',
   'general', NULL, 10, true, now()),

  -- FAQ Pembayaran
  ('faq_p01', 'Metode pembayaran apa saja yang diterima?',
   'Kami menerima pembayaran melalui: transfer bank (BCA, Mandiri, BNI, BSI), kartu kredit/debit, dan QRIS. Untuk pembayaran tunai dapat dilakukan langsung di kantor kami.',
   'payment', NULL, 1, true, now()),

  ('faq_p02', 'Apakah bisa cicilan?',
   'Ya, kami menyediakan skema cicilan yang fleksibel. Pembayaran dapat diangsur hingga batas waktu pelunasan yang ditentukan (biasanya H-45 sebelum keberangkatan). Hubungi tim kami untuk simulasi cicilan.',
   'payment', NULL, 2, true, now()),

  -- FAQ Dokumen
  ('faq_d01', 'Berapa lama proses pengurusan visa umroh?',
   'Proses visa umroh normal memerlukan waktu 14-21 hari kerja setelah semua dokumen lengkap diterima. Kami menyarankan untuk melengkapi dokumen minimal 2 bulan sebelum tanggal keberangkatan.',
   'documents', NULL, 1, true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 9. FLOATING BUTTONS — Tombol kontak mengambang
-- =============================================================

INSERT INTO floating_buttons (id, platform, label, url, icon, is_active, sort_order, created_at)
VALUES
  ('fb_wa',  'whatsapp', 'Chat WhatsApp',   'https://wa.me/6281234567890?text=Assalamualaikum%2C%20saya%20ingin%20informasi%20paket%20umroh', 'message-circle', true, 1, now()),
  ('fb_tel', 'phone',    'Telepon Kami',    'tel:02112345678', 'phone', true, 2, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 10. NAVIGATION ITEMS — Menu navigasi
-- =============================================================

INSERT INTO navigation_items (id, label, url, parent_id, sort_order, is_active, open_in_new_tab, created_at)
VALUES
  ('nav_01', 'Beranda',           '/',                  NULL, 1, true, false, now()),
  ('nav_02', 'Paket Perjalanan',  '/packages',          NULL, 2, true, false, now()),
  ('nav_03', 'Galeri',            '/gallery',           NULL, 3, true, false, now()),
  ('nav_04', 'Blog',              '/blog',              NULL, 4, true, false, now()),
  ('nav_05', 'Tentang Kami',      '/about',             NULL, 5, true, false, now()),
  ('nav_06', 'Kontak',            '/contact',           NULL, 6, true, false, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 11. PAGES — Halaman statis
-- =============================================================

INSERT INTO pages (id, slug, title, content, seo_title, seo_description, is_active, created_at)
VALUES
  ('page_about',
   'tentang-kami',
   'Tentang Kami',
   '<h2>Tentang UmrohPlus</h2><p>UmrohPlus adalah biro perjalanan umroh terpercaya yang telah melayani lebih dari 10.000 jemaah sejak 2009. Kami berkomitmen memberikan pelayanan terbaik agar ibadah umroh Anda berjalan lancar dan penuh berkah.</p><h3>Visi</h3><p>Menjadi penyelenggara perjalanan ibadah umroh terbaik dan terpercaya di Indonesia.</p><h3>Misi</h3><ul><li>Memberikan pelayanan prima kepada setiap jemaah</li><li>Memastikan kenyamanan dan keamanan ibadah dari awal hingga akhir</li><li>Membantu jamaah meraih umroh yang mabrur</li></ul>',
   'Tentang UmrohPlus - Biro Perjalanan Umroh Terpercaya',
   'Kenali UmrohPlus, biro perjalanan umroh berpengalaman sejak 2009. Lebih dari 10.000 jemaah telah kami berangkatkan dengan selamat dan penuh berkah.',
   true, now()),

  ('page_contact',
   'kontak',
   'Hubungi Kami',
   '<h2>Hubungi Kami</h2><p>Tim kami siap membantu Anda merencanakan ibadah umroh yang sempurna.</p>',
   'Kontak UmrohPlus - Konsultasi Paket Umroh Gratis',
   'Hubungi tim UmrohPlus untuk konsultasi paket umroh gratis. Tersedia via WhatsApp, telepon, dan email.',
   true, now()),

  ('page_terms',
   'syarat-ketentuan',
   'Syarat & Ketentuan',
   '<h2>Syarat dan Ketentuan</h2><p>Dengan menggunakan layanan UmrohPlus, Anda menyetujui syarat dan ketentuan berikut ini.</p>',
   'Syarat & Ketentuan UmrohPlus',
   'Baca syarat dan ketentuan layanan perjalanan umroh UmrohPlus.',
   true, now()),

  ('page_privacy',
   'kebijakan-privasi',
   'Kebijakan Privasi',
   '<h2>Kebijakan Privasi</h2><p>UmrohPlus berkomitmen menjaga privasi dan keamanan data pribadi Anda.</p>',
   'Kebijakan Privasi UmrohPlus',
   'Pelajari bagaimana UmrohPlus melindungi data pribadi Anda.',
   true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 12. SEO OVERRIDES — Meta tag per halaman
-- =============================================================

INSERT INTO seo_overrides (id, path, title, description, og_image, noindex, keywords, created_at)
VALUES
  ('seo_home',     '/',          'UmrohPlus - Biro Perjalanan Umroh Terpercaya',             'Wujudkan ibadah umroh impian Anda bersama UmrohPlus. Paket lengkap, hotel bintang 5, bimbingan ustadz berpengalaman.',                NULL, false, 'umroh, paket umroh, biro umroh, umroh murah, umroh terpercaya', now()),
  ('seo_packages', '/packages',  'Paket Umroh Lengkap - UmrohPlus',                          'Temukan paket umroh terbaik sesuai kebutuhan Anda. Reguler, Plus, VIP, Ramadhan, dan Keluarga tersedia dengan harga transparan.',    NULL, false, 'paket umroh, harga umroh, jadwal umroh, umroh reguler, umroh vip', now()),
  ('seo_gallery',  '/gallery',   'Galeri Foto Perjalanan Umroh - UmrohPlus',                 'Lihat dokumentasi perjalanan umroh jemaah UmrohPlus. Foto dan video kegiatan selama di Tanah Suci.',                                NULL, false, 'foto umroh, galeri umroh, dokumentasi umroh', now()),
  ('seo_blog',     '/blog',      'Blog & Panduan Umroh - UmrohPlus',                         'Baca artikel, tips, dan panduan lengkap seputar ibadah umroh dari UmrohPlus.',                                                      NULL, false, 'blog umroh, tips umroh, panduan umroh, manasik umroh', now()),
  ('seo_auth',     '/auth',      'Masuk atau Daftar - UmrohPlus',                            'Login atau buat akun UmrohPlus untuk mengelola booking dan profil umroh Anda.',                                                     NULL, false, NULL, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 13. MANASIK MATERIALS — Materi panduan ibadah
-- =============================================================

INSERT INTO manasik_materials (id, title, description, type, file_url, thumbnail_url, sort_order, is_active, created_at)
VALUES
  ('mm_01', 'Panduan Umroh Lengkap',         'Buku panduan ibadah umroh dari awal hingga akhir, mulai dari niat, tawaf, sa''i, hingga tahallul',              'pdf',   NULL, NULL, 1, true, now()),
  ('mm_02', 'Video Tutorial Tawaf',           'Panduan visual cara melakukan tawaf yang benar sesuai sunnah Nabi',                                            'video', NULL, NULL, 2, true, now()),
  ('mm_03', 'Do''a-Do''a Umroh',              'Kumpulan doa selama ibadah umroh: doa masuk Masjidil Haram, tawaf, sa''i, dan doa di berbagai tempat mustajab', 'pdf',   NULL, NULL, 3, true, now()),
  ('mm_04', 'Panduan Kesehatan di Tanah Suci','Tips menjaga kesehatan selama umroh, termasuk cara menghindari dehidrasi dan penyakit selama di Makkah & Madinah', 'pdf', NULL, NULL, 4, true, now()),
  ('mm_05', 'Checklist Perlengkapan Umroh',   'Daftar lengkap barang bawaan yang perlu disiapkan sebelum berangkat umroh',                                    'pdf',   NULL, NULL, 5, true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- VERIFIKASI — Hitung total data yang berhasil di-insert
-- =============================================================

SELECT
  'currencies'         AS tabel, COUNT(*) AS total FROM currencies
UNION ALL SELECT 'package_categories',  COUNT(*) FROM package_categories
UNION ALL SELECT 'branches',            COUNT(*) FROM branches
UNION ALL SELECT 'site_settings',       COUNT(*) FROM site_settings
UNION ALL SELECT 'services',            COUNT(*) FROM services
UNION ALL SELECT 'advantages',          COUNT(*) FROM advantages
UNION ALL SELECT 'guide_steps',         COUNT(*) FROM guide_steps
UNION ALL SELECT 'faqs',                COUNT(*) FROM faqs
UNION ALL SELECT 'floating_buttons',    COUNT(*) FROM floating_buttons
UNION ALL SELECT 'navigation_items',    COUNT(*) FROM navigation_items
UNION ALL SELECT 'pages',               COUNT(*) FROM pages
UNION ALL SELECT 'seo_overrides',       COUNT(*) FROM seo_overrides
UNION ALL SELECT 'manasik_materials',   COUNT(*) FROM manasik_materials
ORDER BY tabel;
