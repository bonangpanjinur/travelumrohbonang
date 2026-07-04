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
  ('nav_01', 'Beranda',           '/',             NULL, 1, true, false, now()),
  ('nav_02', 'Paket Perjalanan',  '/paket',        NULL, 2, true, false, now()),
  ('nav_03', 'Galeri',            '/galeri',       NULL, 3, true, false, now()),
  ('nav_04', 'Blog',              '/blog',         NULL, 4, true, false, now()),
  ('nav_05', 'Tentang Kami',      '/tentang-kami', NULL, 5, true, false, now()),
  ('nav_06', 'Kontak',            '/kontak',       NULL, 6, true, false, now())
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
-- 14. TESTIMONIALS — Testimoni jemaah
-- =============================================================

INSERT INTO testimonials (id, name, location, package_name, photo_url, rating, content, travel_date, is_active, sort_order, created_at)
VALUES
  ('tml_01',
   'Hj. Siti Rahayu',
   'Jakarta Selatan',
   'Umroh Plus 12 Hari',
   'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
   5,
   'Alhamdulillah, perjalanan umroh bersama UmrohPlus sangat berkesan. Hotel dekat Masjidil Haram, muthawif sabar dan berpengalaman, semua urusan dokumen dan visa lancar tanpa hambatan. Saya dan suami sangat puas dan insya Allah akan kembali lagi.',
   'Maret 2024',
   true, 1, now()),

  ('tml_02',
   'H. Ahmad Fauzi',
   'Bandung',
   'Umroh Reguler 9 Hari',
   'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face',
   5,
   'Ini umroh pertama saya dan keluarga. Pelayanan tim UmrohPlus luar biasa dari awal hingga akhir. Manasik sebelum berangkat sangat membantu kami yang baru pertama kali. Akomodasi nyaman, makanan enak, transportasi tepat waktu. Terima kasih UmrohPlus!',
   'Januari 2024',
   true, 2, now()),

  ('tml_03',
   'Dewi Lestari',
   'Surabaya',
   'Umroh Ramadhan 15 Hari',
   'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=face',
   5,
   'Subhanallah, umroh Ramadhan bersama UmrohPlus adalah pengalaman spiritual yang tak terlupakan. I''tikaf di 10 hari terakhir Ramadhan, buka puasa berjamaah di Masjidil Haram, tarawih sepanjang malam. Tim UmrohPlus sangat responsif dan perhatian kepada seluruh jemaah.',
   'April 2024',
   true, 3, now()),

  ('tml_04',
   'H. Bambang Santoso',
   'Semarang',
   'Umroh VIP 12 Hari',
   'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
   5,
   'Paket VIP UmrohPlus benar-benar premium. Hotel hanya 50 meter dari Masjidil Haram, kamar luas dan nyaman untuk kami sekeluarga. Guide sangat profesional, hafal seluruh doa dan bacaan. Tidak ada kata penyesalan memilih UmrohPlus, harga sesuai kualitas.',
   'Februari 2024',
   true, 4, now()),

  ('tml_05',
   'Hj. Fatimah Zahra',
   'Medan',
   'Umroh Plus 12 Hari',
   'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
   5,
   'Umroh kedua saya dan tetap pilih UmrohPlus. Pelayanan konsisten berkualitas tinggi. Yang paling saya suka adalah pendampingan muthawif yang sabar menjelaskan makna setiap ritual. Pulang dengan hati tenang dan penuh syukur. Sangat direkomendasikan!',
   'November 2023',
   true, 5, now()),

  ('tml_06',
   'Rizky Hidayat',
   'Yogyakarta',
   'Umroh Reguler 9 Hari',
   'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
   5,
   'Saya berangkat bersama orang tua yang sudah lansia. Tim UmrohPlus sangat perhatian dan sabar mendampingi beliau. Tersedia kursi roda, dibantu saat tawaf dan sa''i, kamar di lantai rendah. Melihat orang tua saya khusyuk beribadah adalah kebahagiaan terbesar.',
   'Oktober 2023',
   true, 6, now()),

  ('tml_07',
   'Hj. Nur Ainun',
   'Makassar',
   'Umroh Keluarga 12 Hari',
   'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=200&h=200&fit=crop&crop=face',
   5,
   'Kami berangkat berempat: saya, suami, dan dua anak remaja. UmrohPlus menyediakan program khusus anak muda yang membuat anak-anak antusias beribadah. Mereka pulang dengan semangat keislaman yang lebih baik. Investasi terbaik untuk keluarga kami.',
   'Desember 2023',
   true, 7, now()),

  ('tml_08',
   'H. Irwan Maulana',
   'Palembang',
   'Umroh Plus 12 Hari',
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
   5,
   'Proses pendaftaran mudah, dokumen diurus tim profesional, berangkat tepat waktu, pulang selamat. Itu standar minimum yang terpenuhi UmrohPlus. Di atas itu, mereka memberikan pengalaman spiritual yang mendalam. Ustadz pembimbing kami luar biasa ilmunya.',
   'September 2023',
   true, 8, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 15. GALLERY — Foto perjalanan umroh
-- =============================================================

INSERT INTO gallery (id, image_url, title, description, category, sort_order, is_active, created_at)
VALUES
  -- Kategori: Makkah
  ('gal_01',
   'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=800&h=600&fit=crop',
   'Masjidil Haram dari Udara',
   'Pemandangan Masjidil Haram dan Ka''bah dari ketinggian, keindahan rumah Allah yang mengagumkan',
   'makkah', 1, true, now()),

  ('gal_02',
   'https://images.unsplash.com/photo-1537031931935-7f2eb41fec9d?w=800&h=600&fit=crop',
   'Tawaf di Ka''bah',
   'Jamaah melaksanakan tawaf mengelilingi Ka''bah, ritual inti ibadah umroh yang penuh makna',
   'makkah', 2, true, now()),

  ('gal_03',
   'https://images.unsplash.com/photo-1573483830994-8f07b6975cf0?w=800&h=600&fit=crop',
   'Gerbang Masjidil Haram',
   'Salah satu gerbang megah Masjidil Haram yang menyambut jutaan jemaah dari seluruh dunia',
   'makkah', 3, true, now()),

  ('gal_04',
   'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop',
   'Bukit Shafa — Tempat Sa''i',
   'Lokasi pelaksanaan sa''i antara Bukit Shafa dan Marwah, mengikuti jejak Siti Hajar',
   'makkah', 4, true, now()),

  -- Kategori: Madinah
  ('gal_05',
   'https://images.unsplash.com/photo-1596394723269-b2cbca4e6e33?w=800&h=600&fit=crop',
   'Masjid Nabawi di Malam Hari',
   'Keindahan Masjid Nabawi di Madinah saat malam hari, kubah hijau bersinar penuh keagungan',
   'madinah', 5, true, now()),

  ('gal_06',
   'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800&h=600&fit=crop',
   'Payung Raksasa Masjid Nabawi',
   'Payung elektrik raksasa ikonik yang melindungi jemaah dari terik matahari di pelataran Masjid Nabawi',
   'madinah', 6, true, now()),

  ('gal_07',
   'https://images.unsplash.com/photo-1605773527852-c546a8584ea3?w=800&h=600&fit=crop',
   'Raudhah — Taman Surga',
   'Area Raudhah di dalam Masjid Nabawi, tempat yang sangat mustajab untuk berdoa',
   'madinah', 7, true, now()),

  -- Kategori: Jamaah
  ('gal_08',
   'https://images.unsplash.com/photo-1565688528990-7c2f9a0ef1b8?w=800&h=600&fit=crop',
   'Momen Kebersamaan Jamaah',
   'Para jemaah UmrohPlus berfoto bersama di depan Masjidil Haram, momen tak terlupakan',
   'jamaah', 8, true, now()),

  ('gal_09',
   'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&h=600&fit=crop',
   'Doa Bersama Setelah Tawaf',
   'Jemaah UmrohPlus berdoa bersama setelah melaksanakan tawaf, dipimpin muthawif berpengalaman',
   'jamaah', 9, true, now()),

  ('gal_10',
   'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800&h=600&fit=crop',
   'Sesi Manasik Sebelum Berangkat',
   'Peserta manasik UmrohPlus menerima bimbingan langsung dari ustadz sebelum keberangkatan',
   'jamaah', 10, true, now()),

  -- Kategori: Hotel
  ('gal_11',
   'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
   'Hotel Bintang 5 di Makkah',
   'Akomodasi premium yang kami sediakan untuk jemaah paket VIP, hanya langkah kaki dari Masjidil Haram',
   'hotel', 11, true, now()),

  ('gal_12',
   'https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?w=800&h=600&fit=crop',
   'Kamar Hotel Nyaman',
   'Kamar hotel bintang 5 yang lapang dan nyaman untuk beristirahat setelah ibadah seharian',
   'hotel', 12, true, now()),

  -- Kategori: Perjalanan
  ('gal_13',
   'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop',
   'Perjalanan Menuju Tanah Suci',
   'Armada penerbangan yang membawa jemaah UmrohPlus menuju Tanah Suci dengan aman dan nyaman',
   'perjalanan', 13, true, now()),

  ('gal_14',
   'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop',
   'Bus Transportasi Eksklusif',
   'Armada bus ber-AC eksklusif yang digunakan untuk mobilitas jemaah selama di Makkah dan Madinah',
   'perjalanan', 14, true, now()),

  ('gal_15',
   'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=800&h=600&fit=crop',
   'Matahari Terbit di Arafah',
   'Keindahan panorama matahari terbit di padang Arafah, ketenangan yang tak bisa dilukiskan kata-kata',
   'perjalanan', 15, true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 16. MASTER DATA — Hotel, Maskapai, Bandara, Muthawif
-- =============================================================

-- Hotels
INSERT INTO hotels (id, name, city, stars, image_url, description, created_at)
VALUES
  ('htl_swissotel',   'Swissotel Al Maqam Makkah',           'Makkah',  5, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop', 'Hotel bintang 5 tepat di dalam Masjidil Haram, pemandangan langsung Ka''bah dari kamar',                           now()),
  ('htl_hilton_mk',   'Hilton Suites Makkah',                 'Makkah',  5, 'https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?w=600&h=400&fit=crop', 'Hotel mewah 5 bintang berjarak 200m dari Masjidil Haram dengan fasilitas lengkap dan restoran halal premium',      now()),
  ('htl_pullman',     'Pullman ZamZam Makkah',                'Makkah',  5, 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&h=400&fit=crop', 'Hotel ikonik di Abraj Al-Bait Tower, berjarak hanya 50 meter dari Masjidil Haram dengan view Ka''bah spektakuler', now()),
  ('htl_dartaqwa',    'Dar Al Taqwa Hotel Madinah',           'Madinah', 5, 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&h=400&fit=crop', 'Hotel bintang 5 di Madinah berjarak 50 meter dari Masjid Nabawi, pilihan favorit jemaah Indonesia',               now()),
  ('htl_movenpick',   'Anwar Al Madinah Mövenpick Hotel',     'Madinah', 5, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&h=400&fit=crop', 'Hotel premium di jantung kota Madinah, langsung terhubung ke Masjid Nabawi via jembatan tertutup',                 now()),
  ('htl_rawda',       'Al Rawda Royal Inn Madinah',           'Madinah', 4, 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop', 'Hotel bintang 4 nyaman di Madinah berjarak 300m dari Masjid Nabawi, cocok untuk paket reguler',                    now()),
  ('htl_novotel_mk',  'Novotel Makkah Al Shohada',            'Makkah',  4, 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&h=400&fit=crop', 'Hotel bintang 4 strategis di Makkah berjarak 500m dari Masjidil Haram, pilihan tepat untuk paket hemat berkualitas', now())
ON CONFLICT (id) DO NOTHING;

-- Airlines
INSERT INTO airlines (id, name, code, logo_url, created_at)
VALUES
  ('arl_ga',  'Garuda Indonesia',  'GA', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Garuda_Indonesia_Logo.svg/200px-Garuda_Indonesia_Logo.svg.png', now()),
  ('arl_sv',  'Saudi Airlines',    'SV', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Saudia_Airlines_Logo.svg/200px-Saudia_Airlines_Logo.svg.png',   now()),
  ('arl_sq',  'Singapore Airlines','SQ', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Singapore_Airlines_Logo_2.svg/200px-Singapore_Airlines_Logo_2.svg.png', now()),
  ('arl_jt',  'Lion Air',          'JT', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Lion_Air_logo.svg/200px-Lion_Air_logo.svg.png',                  now())
ON CONFLICT (id) DO NOTHING;

-- Airports
INSERT INTO airports (id, name, code, city, created_at)
VALUES
  ('apt_cgk', 'Bandara Internasional Soekarno-Hatta',      'CGK', 'Tangerang',      now()),
  ('apt_sub', 'Bandara Internasional Juanda',               'SUB', 'Surabaya',       now()),
  ('apt_upg', 'Bandara Internasional Sultan Hasanuddin',    'UPG', 'Makassar',       now()),
  ('apt_kno', 'Bandara Internasional Kualanamu',            'KNO', 'Medan',          now()),
  ('apt_jed', 'Bandara Internasional King Abdul Aziz',      'JED', 'Jeddah',         now()),
  ('apt_med', 'Bandara Amir Muhammad bin Abdulaziz',        'MED', 'Madinah',        now())
ON CONFLICT (id) DO NOTHING;

-- Muthawifs (pembimbing ibadah)
INSERT INTO muthawifs (id, name, phone, photo_url, bio, is_active, created_at)
VALUES
  ('mtw_01', 'Ustadz Dr. Ahmad Syukri, Lc.',
   '08111234567',
   'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&h=200&fit=crop&crop=face',
   'Lulusan Universitas Islam Madinah, berpengalaman 15 tahun membimbing jemaah umroh dan haji. Hafidz Quran 30 juz. Dikenal sabar, ramah, dan menguasai sejarah Tanah Suci secara mendalam.',
   true, now()),

  ('mtw_02', 'Ustadz Muhammad Amin Fauzan, S.Ag.',
   '08222345678',
   'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
   'Alumni Universitas Al-Azhar Kairo dengan pengalaman 10 tahun sebagai muthawif profesional. Spesialis bimbingan doa dan dzikir selama umroh. Penulis buku panduan ibadah umroh.',
   true, now()),

  ('mtw_03', 'Ustadzah Hj. Fatimah Azzahra, M.Ag.',
   '08333456789',
   'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=face',
   'Muthawifah berpengalaman 12 tahun khusus mendampingi jemaah wanita dan keluarga. Magister Ilmu Agama Islam dengan spesialisasi fiqih ibadah perempuan. Fasih bahasa Arab dan Inggris.',
   true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 17. PACKAGES — 5 paket umroh lengkap
-- =============================================================

INSERT INTO packages (id, title, slug, description, image_url, duration_days, package_type, category_id, hotel_makkah_id, hotel_madinah_id, airline_id, airport_id, minimum_dp, dp_deadline_days, full_deadline_days, is_active, created_at)
VALUES
  -- Paket 1: Umroh Reguler 9 Hari
  ('pkg_reguler',
   'Umroh Reguler 9 Hari',
   'umroh-reguler-9-hari',
   'Paket umroh standar terjangkau dengan fasilitas lengkap dan bimbingan ustadz berpengalaman. Cocok untuk jemaah yang ingin beribadah khusyuk dengan anggaran efisien. Hotel bintang 4 berjarak dekat dari kedua masjid suci, transportasi AC eksklusif, dan visa terjamin.',
   'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=800&h=500&fit=crop',
   9, 'reguler', 'cat_reguler', 'htl_novotel_mk', 'htl_rawda', 'arl_ga', 'apt_cgk',
   5000000, 60, 45, true, now()),

  -- Paket 2: Umroh Plus 12 Hari
  ('pkg_plus',
   'Umroh Plus 12 Hari',
   'umroh-plus-12-hari',
   'Paket umroh premium dengan hotel bintang 5 lebih dekat ke Masjidil Haram dan Masjid Nabawi. Durasi 12 hari memberikan waktu ibadah lebih leluasa. Termasuk ziarah lengkap, makan 3 kali sehari, dan muthawif profesional berdedikasi.',
   'https://images.unsplash.com/photo-1537031931935-7f2eb41fec9d?w=800&h=500&fit=crop',
   12, 'plus', 'cat_plus', 'htl_hilton_mk', 'htl_dartaqwa', 'arl_ga', 'apt_cgk',
   7500000, 60, 45, true, now()),

  -- Paket 3: Umroh VIP 12 Hari
  ('pkg_vip',
   'Umroh VIP 12 Hari',
   'umroh-vip-12-hari',
   'Pengalaman umroh paling eksklusif dengan hotel bintang 5 kelas dunia — Swissotel Al Maqam dan Mövenpick Madinah. Layanan concierge pribadi, akses lounge bandara, makan di restoran premium, dan fasilitas spa. Untuk jemaah yang menginginkan kenyamanan tanpa kompromi.',
   'https://images.unsplash.com/photo-1596394723269-b2cbca4e6e33?w=800&h=500&fit=crop',
   12, 'vip', 'cat_vip', 'htl_swissotel', 'htl_movenpick', 'arl_ga', 'apt_cgk',
   10000000, 90, 60, true, now()),

  -- Paket 4: Umroh Ramadhan 15 Hari
  ('pkg_ramadhan',
   'Umroh Ramadhan 15 Hari',
   'umroh-ramadhan-15-hari',
   'Rasakan keistimewaan Ramadhan di Tanah Suci selama 15 hari. Shalat tarawih di Masjidil Haram, buka puasa berjamaah, i''tikaf di masjid, dan malam Lailatul Qadar yang penuh berkah. Paket terpopuler kami — kuota terbatas setiap tahun.',
   'https://images.unsplash.com/photo-1605773527852-c546a8584ea3?w=800&h=500&fit=crop',
   15, 'ramadhan', 'cat_ramadhan', 'htl_pullman', 'htl_dartaqwa', 'arl_sv', 'apt_cgk',
   10000000, 90, 60, true, now()),

  -- Paket 5: Umroh Keluarga 12 Hari
  ('pkg_keluarga',
   'Umroh Keluarga 12 Hari',
   'umroh-keluarga-12-hari',
   'Paket umroh dirancang khusus untuk keluarga dengan anak-anak. Kamar family, program edukasi manasik untuk anak, pendampingan khusus anak-anak di tempat ibadah, dan kegiatan keluarga islami. Bekal spiritual terbaik untuk generasi penerus.',
   'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=500&fit=crop',
   12, 'keluarga', 'cat_keluarga', 'htl_hilton_mk', 'htl_dartaqwa', 'arl_ga', 'apt_cgk',
   7500000, 60, 45, true, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 18. PACKAGE DEPARTURES — Jadwal keberangkatan
-- =============================================================

INSERT INTO package_departures (id, package_id, departure_date, return_date, quota, remaining_quota, status, muthawif_id, created_at)
VALUES
  -- Jadwal Umroh Reguler 9 Hari
  ('dep_reg_aug10',  'pkg_reguler', '2026-08-10', '2026-08-18', 45, 23, 'open',  'mtw_02', now()),
  ('dep_reg_sep07',  'pkg_reguler', '2026-09-07', '2026-09-15', 45, 38, 'open',  'mtw_01', now()),
  ('dep_reg_oct05',  'pkg_reguler', '2026-10-05', '2026-10-13', 45, 45, 'open',  'mtw_02', now()),
  ('dep_reg_nov02',  'pkg_reguler', '2026-11-02', '2026-11-10', 45, 42, 'open',  'mtw_01', now()),
  ('dep_reg_dec07',  'pkg_reguler', '2026-12-07', '2026-12-15', 45, 45, 'open',  'mtw_02', now()),

  -- Jadwal Umroh Plus 12 Hari
  ('dep_plus_aug24', 'pkg_plus',    '2026-08-24', '2026-09-04', 40, 12, 'open',  'mtw_01', now()),
  ('dep_plus_sep21', 'pkg_plus',    '2026-09-21', '2026-10-02', 40, 27, 'open',  'mtw_03', now()),
  ('dep_plus_oct19', 'pkg_plus',    '2026-10-19', '2026-10-30', 40, 40, 'open',  'mtw_01', now()),
  ('dep_plus_nov16', 'pkg_plus',    '2026-11-16', '2026-11-27', 40, 35, 'open',  'mtw_03', now()),
  ('dep_plus_dec21', 'pkg_plus',    '2026-12-21', '2027-01-01', 40, 40, 'open',  'mtw_01', now()),

  -- Jadwal Umroh VIP 12 Hari
  ('dep_vip_aug24',  'pkg_vip',     '2026-08-24', '2026-09-04', 25,  5, 'open',  'mtw_01', now()),
  ('dep_vip_oct19',  'pkg_vip',     '2026-10-19', '2026-10-30', 25, 18, 'open',  'mtw_01', now()),
  ('dep_vip_dec21',  'pkg_vip',     '2026-12-21', '2027-01-01', 25, 25, 'open',  'mtw_01', now()),

  -- Jadwal Umroh Ramadhan 15 Hari
  ('dep_rmdn_feb15', 'pkg_ramadhan','2027-02-15', '2027-03-01', 50,  8, 'open',  'mtw_01', now()),
  ('dep_rmdn_mar01', 'pkg_ramadhan','2027-03-01', '2027-03-15', 50, 22, 'open',  'mtw_03', now()),
  ('dep_rmdn_mar10', 'pkg_ramadhan','2027-03-10', '2027-03-24', 50, 50, 'open',  'mtw_02', now()),

  -- Jadwal Umroh Keluarga 12 Hari
  ('dep_kel_sep07',  'pkg_keluarga','2026-09-07', '2026-09-18', 30, 20, 'open',  'mtw_03', now()),
  ('dep_kel_nov02',  'pkg_keluarga','2026-11-02', '2026-11-13', 30, 28, 'open',  'mtw_03', now()),
  ('dep_kel_dec21',  'pkg_keluarga','2026-12-21', '2027-01-01', 30, 30, 'open',  'mtw_03', now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 19. DEPARTURE PRICES — Harga per tipe kamar
-- =============================================================

INSERT INTO departure_prices (id, departure_id, room_type, price, created_at)
VALUES
  -- ─── Umroh Reguler 9 Hari ────────────────────────────────
  -- Keberangkatan 10 Agustus 2026
  ('dp_reg_aug10_quad',   'dep_reg_aug10',  'quadruple', 27500000, now()),
  ('dp_reg_aug10_triple', 'dep_reg_aug10',  'triple',    31000000, now()),
  ('dp_reg_aug10_double', 'dep_reg_aug10',  'double',    37500000, now()),
  ('dp_reg_aug10_single', 'dep_reg_aug10',  'single',    54000000, now()),
  -- Keberangkatan 7 September 2026
  ('dp_reg_sep07_quad',   'dep_reg_sep07',  'quadruple', 27500000, now()),
  ('dp_reg_sep07_triple', 'dep_reg_sep07',  'triple',    31000000, now()),
  ('dp_reg_sep07_double', 'dep_reg_sep07',  'double',    37500000, now()),
  ('dp_reg_sep07_single', 'dep_reg_sep07',  'single',    54000000, now()),
  -- Keberangkatan 5 Oktober 2026
  ('dp_reg_oct05_quad',   'dep_reg_oct05',  'quadruple', 28000000, now()),
  ('dp_reg_oct05_triple', 'dep_reg_oct05',  'triple',    31500000, now()),
  ('dp_reg_oct05_double', 'dep_reg_oct05',  'double',    38000000, now()),
  ('dp_reg_oct05_single', 'dep_reg_oct05',  'single',    55000000, now()),
  -- Keberangkatan 2 November 2026
  ('dp_reg_nov02_quad',   'dep_reg_nov02',  'quadruple', 28000000, now()),
  ('dp_reg_nov02_triple', 'dep_reg_nov02',  'triple',    31500000, now()),
  ('dp_reg_nov02_double', 'dep_reg_nov02',  'double',    38000000, now()),
  ('dp_reg_nov02_single', 'dep_reg_nov02',  'single',    55000000, now()),
  -- Keberangkatan 7 Desember 2026
  ('dp_reg_dec07_quad',   'dep_reg_dec07',  'quadruple', 29000000, now()),
  ('dp_reg_dec07_triple', 'dep_reg_dec07',  'triple',    32500000, now()),
  ('dp_reg_dec07_double', 'dep_reg_dec07',  'double',    39000000, now()),
  ('dp_reg_dec07_single', 'dep_reg_dec07',  'single',    56000000, now()),

  -- ─── Umroh Plus 12 Hari ──────────────────────────────────
  -- Keberangkatan 24 Agustus 2026
  ('dp_plus_aug24_quad',   'dep_plus_aug24', 'quadruple', 34500000, now()),
  ('dp_plus_aug24_triple', 'dep_plus_aug24', 'triple',    39000000, now()),
  ('dp_plus_aug24_double', 'dep_plus_aug24', 'double',    47000000, now()),
  ('dp_plus_aug24_single', 'dep_plus_aug24', 'single',    67000000, now()),
  -- Keberangkatan 21 September 2026
  ('dp_plus_sep21_quad',   'dep_plus_sep21', 'quadruple', 34500000, now()),
  ('dp_plus_sep21_triple', 'dep_plus_sep21', 'triple',    39000000, now()),
  ('dp_plus_sep21_double', 'dep_plus_sep21', 'double',    47000000, now()),
  ('dp_plus_sep21_single', 'dep_plus_sep21', 'single',    67000000, now()),
  -- Keberangkatan 19 Oktober 2026
  ('dp_plus_oct19_quad',   'dep_plus_oct19', 'quadruple', 35000000, now()),
  ('dp_plus_oct19_triple', 'dep_plus_oct19', 'triple',    39500000, now()),
  ('dp_plus_oct19_double', 'dep_plus_oct19', 'double',    48000000, now()),
  ('dp_plus_oct19_single', 'dep_plus_oct19', 'single',    68000000, now()),
  -- Keberangkatan 16 November 2026
  ('dp_plus_nov16_quad',   'dep_plus_nov16', 'quadruple', 35000000, now()),
  ('dp_plus_nov16_triple', 'dep_plus_nov16', 'triple',    39500000, now()),
  ('dp_plus_nov16_double', 'dep_plus_nov16', 'double',    48000000, now()),
  ('dp_plus_nov16_single', 'dep_plus_nov16', 'single',    68000000, now()),
  -- Keberangkatan 21 Desember 2026
  ('dp_plus_dec21_quad',   'dep_plus_dec21', 'quadruple', 36000000, now()),
  ('dp_plus_dec21_triple', 'dep_plus_dec21', 'triple',    40500000, now()),
  ('dp_plus_dec21_double', 'dep_plus_dec21', 'double',    49000000, now()),
  ('dp_plus_dec21_single', 'dep_plus_dec21', 'single',    70000000, now()),

  -- ─── Umroh VIP 12 Hari ───────────────────────────────────
  -- Keberangkatan 24 Agustus 2026
  ('dp_vip_aug24_quad',   'dep_vip_aug24',  'quadruple', 44000000, now()),
  ('dp_vip_aug24_triple', 'dep_vip_aug24',  'triple',    51000000, now()),
  ('dp_vip_aug24_double', 'dep_vip_aug24',  'double',    61000000, now()),
  ('dp_vip_aug24_single', 'dep_vip_aug24',  'single',    84000000, now()),
  -- Keberangkatan 19 Oktober 2026
  ('dp_vip_oct19_quad',   'dep_vip_oct19',  'quadruple', 45000000, now()),
  ('dp_vip_oct19_triple', 'dep_vip_oct19',  'triple',    52000000, now()),
  ('dp_vip_oct19_double', 'dep_vip_oct19',  'double',    62000000, now()),
  ('dp_vip_oct19_single', 'dep_vip_oct19',  'single',    85000000, now()),
  -- Keberangkatan 21 Desember 2026
  ('dp_vip_dec21_quad',   'dep_vip_dec21',  'quadruple', 46000000, now()),
  ('dp_vip_dec21_triple', 'dep_vip_dec21',  'triple',    53000000, now()),
  ('dp_vip_dec21_double', 'dep_vip_dec21',  'double',    63000000, now()),
  ('dp_vip_dec21_single', 'dep_vip_dec21',  'single',    87000000, now()),

  -- ─── Umroh Ramadhan 15 Hari ──────────────────────────────
  -- Keberangkatan 15 Februari 2027
  ('dp_rmdn_feb15_quad',   'dep_rmdn_feb15','quadruple', 44000000, now()),
  ('dp_rmdn_feb15_triple', 'dep_rmdn_feb15','triple',    51000000, now()),
  ('dp_rmdn_feb15_double', 'dep_rmdn_feb15','double',    60000000, now()),
  ('dp_rmdn_feb15_single', 'dep_rmdn_feb15','single',    82000000, now()),
  -- Keberangkatan 1 Maret 2027
  ('dp_rmdn_mar01_quad',   'dep_rmdn_mar01','quadruple', 45000000, now()),
  ('dp_rmdn_mar01_triple', 'dep_rmdn_mar01','triple',    52000000, now()),
  ('dp_rmdn_mar01_double', 'dep_rmdn_mar01','double',    62000000, now()),
  ('dp_rmdn_mar01_single', 'dep_rmdn_mar01','single',    85000000, now()),
  -- Keberangkatan 10 Maret 2027
  ('dp_rmdn_mar10_quad',   'dep_rmdn_mar10','quadruple', 48000000, now()),
  ('dp_rmdn_mar10_triple', 'dep_rmdn_mar10','triple',    55000000, now()),
  ('dp_rmdn_mar10_double', 'dep_rmdn_mar10','double',    65000000, now()),
  ('dp_rmdn_mar10_single', 'dep_rmdn_mar10','single',    90000000, now()),

  -- ─── Umroh Keluarga 12 Hari ──────────────────────────────
  -- Keberangkatan 7 September 2026
  ('dp_kel_sep07_quad',   'dep_kel_sep07',  'quadruple', 33000000, now()),
  ('dp_kel_sep07_triple', 'dep_kel_sep07',  'triple',    37500000, now()),
  ('dp_kel_sep07_double', 'dep_kel_sep07',  'double',    45000000, now()),
  ('dp_kel_sep07_single', 'dep_kel_sep07',  'single',    64000000, now()),
  -- Keberangkatan 2 November 2026
  ('dp_kel_nov02_quad',   'dep_kel_nov02',  'quadruple', 33000000, now()),
  ('dp_kel_nov02_triple', 'dep_kel_nov02',  'triple',    37500000, now()),
  ('dp_kel_nov02_double', 'dep_kel_nov02',  'double',    45000000, now()),
  ('dp_kel_nov02_single', 'dep_kel_nov02',  'single',    64000000, now()),
  -- Keberangkatan 21 Desember 2026
  ('dp_kel_dec21_quad',   'dep_kel_dec21',  'quadruple', 34000000, now()),
  ('dp_kel_dec21_triple', 'dep_kel_dec21',  'triple',    38500000, now()),
  ('dp_kel_dec21_double', 'dep_kel_dec21',  'double',    46000000, now()),
  ('dp_kel_dec21_single', 'dep_kel_dec21',  'single',    66000000, now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 20. PACKAGE COMMISSIONS — Komisi agen per paket
-- =============================================================

INSERT INTO package_commissions (id, package_id, label, commission_amount, created_at)
VALUES
  ('pcm_reg_1',  'pkg_reguler',  'Komisi Agen Level 1',  750000,  now()),
  ('pcm_reg_2',  'pkg_reguler',  'Komisi Agen Level 2',  400000,  now()),
  ('pcm_plus_1', 'pkg_plus',     'Komisi Agen Level 1',  1200000, now()),
  ('pcm_plus_2', 'pkg_plus',     'Komisi Agen Level 2',  600000,  now()),
  ('pcm_vip_1',  'pkg_vip',      'Komisi Agen Level 1',  2000000, now()),
  ('pcm_vip_2',  'pkg_vip',      'Komisi Agen Level 2',  1000000, now()),
  ('pcm_rmdn_1', 'pkg_ramadhan', 'Komisi Agen Level 1',  1800000, now()),
  ('pcm_rmdn_2', 'pkg_ramadhan', 'Komisi Agen Level 2',  900000,  now()),
  ('pcm_kel_1',  'pkg_keluarga', 'Komisi Agen Level 1',  1000000, now()),
  ('pcm_kel_2',  'pkg_keluarga', 'Komisi Agen Level 2',  500000,  now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 21. BLOG POSTS — Artikel panduan & inspirasi umroh
-- =============================================================

INSERT INTO blog_posts (id, title, slug, excerpt, content, image_url, category, author, seo_title, seo_description, is_published, published_at, created_at)
VALUES

-- ─── Artikel 1 ───────────────────────────────────────────────
('blog_01',
 'Panduan Lengkap Persiapan Umroh untuk Pemula: Dari Dokumen hingga Perlengkapan',
 'panduan-persiapan-umroh-pemula',
 'Umroh pertama Anda? Jangan khawatir. Artikel ini membahas tuntas semua yang perlu Anda siapkan — mulai dari persyaratan dokumen, vaksinasi wajib, perlengkapan bawaan, hingga tips mental dan spiritual sebelum berangkat.',
 '<h2>Persiapan Dokumen</h2>
<p>Persiapan dokumen adalah langkah pertama dan terpenting sebelum berangkat umroh. Pastikan semua dokumen berikut sudah lengkap minimal 2 bulan sebelum keberangkatan:</p>
<ul>
  <li><strong>Paspor aktif</strong> — berlaku minimal 6 bulan dari tanggal keberangkatan, kondisi baik (tidak rusak/basah)</li>
  <li><strong>KTP asli</strong> — untuk proses administrasi di dalam negeri</li>
  <li><strong>Kartu Keluarga (KK)</strong> — untuk verifikasi hubungan keluarga</li>
  <li><strong>Foto terbaru 4×6</strong> — background putih, wajah 80%, tidak menggunakan kacamata, minimal 6 lembar</li>
  <li><strong>Buku nikah</strong> — wajib untuk pasangan suami-istri yang berangkat bersama</li>
  <li><strong>Akte lahir / KK</strong> — untuk anak-anak yang berangkat bersama orang tua</li>
  <li><strong>Surat mahram</strong> — wajib untuk wanita di bawah 45 tahun yang berangkat tanpa suami</li>
</ul>

<h2>Vaksinasi Wajib</h2>
<p>Pemerintah Arab Saudi mewajibkan beberapa vaksinasi sebelum memasuki wilayahnya:</p>
<ul>
  <li><strong>Vaksin Meningitis (ACYW135)</strong> — wajib, berlaku 3 tahun, suntik minimal 10 hari sebelum berangkat</li>
  <li><strong>Vaksin COVID-19</strong> — pastikan sudah booster dan sesuai ketentuan terbaru Arab Saudi</li>
  <li><strong>Vaksin Influenza</strong> — sangat disarankan mengingat padatnya jemaah dari seluruh dunia</li>
</ul>
<p>Buku kuning (International Certificate of Vaccination) harus dibawa sebagai bukti vaksinasi meningitis.</p>

<h2>Perlengkapan yang Perlu Dibawa</h2>
<h3>Pakaian Ihram (Pria)</h3>
<p>Dua lembar kain putih tanpa jahitan untuk ihram. Pastikan kualitasnya tebal agar nyaman dipakai seharian. Lengkapi dengan ikat pinggang (hizami) untuk menjaga kain tetap rapi.</p>
<h3>Pakaian Ihram (Wanita)</h3>
<p>Wanita boleh menggunakan pakaian biasa yang menutup aurat sempurna berwarna apa saja. Pastikan longgar dan nyaman untuk aktivitas tawaf dan sa''i yang membutuhkan banyak gerakan.</p>
<h3>Alas Kaki</h3>
<p>Sandal atau sepatu yang nyaman dan kuat. Anda akan berjalan sangat jauh setiap harinya. Hindari alas kaki baru yang belum dipakai — bisa menyebabkan lecet.</p>
<h3>Perlengkapan Kesehatan</h3>
<ul>
  <li>Masker (udara Makkah bisa sangat berdebu)</li>
  <li>Obat-obatan pribadi secukupnya</li>
  <li>Krim tabir surya SPF 50+ (suhu bisa mencapai 45°C di musim panas)</li>
  <li>Botol semprot air untuk mendinginkan wajah</li>
  <li>Oralit atau minuman elektrolit</li>
</ul>

<h2>Persiapan Mental dan Spiritual</h2>
<p>Ibadah umroh bukan sekadar perjalanan fisik — ini adalah perjalanan jiwa. Beberapa persiapan spiritual yang perlu dilakukan:</p>
<ul>
  <li>Pelajari niat dan tata cara umroh dengan benar melalui buku panduan dan manasik</li>
  <li>Hafal doa-doa penting: doa masuk masjid, doa tawaf, doa sa''i, dan doa di berbagai tempat mustajab</li>
  <li>Perbanyak membaca Al-Quran dan dzikir sebelum berangkat</li>
  <li>Minta maaf kepada orang-orang terdekat dan selesaikan urusan duniawi</li>
  <li>Ikuti manasik yang diselenggarakan travel agen Anda — ini sangat membantu</li>
</ul>

<h2>Tips Praktis di Tanah Suci</h2>
<p>Beberapa tips dari jemaah berpengalaman yang perlu Anda ketahui:</p>
<ul>
  <li><strong>Simpan nomor darurat</strong>: nomor hotel, guide, dan KJRI Jeddah (+966-12-661-4918)</li>
  <li><strong>Bawa uang cash Riyal</strong>: tidak semua tempat menerima kartu kredit</li>
  <li><strong>Jaga kondisi fisik</strong>: tidur cukup, makan teratur, jangan memaksakan ibadah saat sakit</li>
  <li><strong>Hindari jam sibuk tawaf</strong>: setelah shalat wajib adalah waktu tersibuk — pilih waktu tengah malam untuk tawaf yang lebih khusyuk</li>
  <li><strong>Simpan sandal di kantong plastik</strong> saat masuk masjid — bawa sendiri lebih aman</li>
</ul>',
 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=1200&h=630&fit=crop',
 'Panduan',
 'Tim Redaksi UmrohPlus',
 'Panduan Lengkap Persiapan Umroh Pemula — Dokumen, Vaksin & Perlengkapan',
 'Panduan umroh pemula paling lengkap: persyaratan dokumen, vaksinasi wajib, daftar perlengkapan, dan tips spiritual sebelum berangkat ke Tanah Suci.',
 true, '2026-06-01 08:00:00+07', now()),

-- ─── Artikel 2 ───────────────────────────────────────────────
('blog_02',
 'Tata Cara Umroh Lengkap Sesuai Sunnah: Niat, Tawaf, Sa''i, dan Tahallul',
 'tata-cara-umroh-lengkap-sesuai-sunnah',
 'Pahami seluruh rangkaian ibadah umroh secara mendalam: dari ihram di miqat, niat, tawaf 7 putaran, sa''i antara Shafa-Marwah, hingga tahallul. Dilengkapi bacaan doa di setiap tahapan.',
 '<h2>Rukun Umroh yang Wajib Dipahami</h2>
<p>Umroh terdiri dari 4 rukun utama yang wajib dilakukan secara berurutan. Meninggalkan salah satunya menyebabkan umroh tidak sah:</p>
<ol>
  <li><strong>Ihram</strong> — niat memulai ibadah umroh</li>
  <li><strong>Tawaf</strong> — mengelilingi Ka''bah 7 putaran</li>
  <li><strong>Sa''i</strong> — berlari-lari kecil antara Bukit Shafa dan Marwah</li>
  <li><strong>Tahallul</strong> — mencukur atau memotong rambut</li>
</ol>

<h2>1. Ihram — Memulai Ibadah</h2>
<p>Ihram adalah niat untuk memasuki ibadah umroh sambil mengenakan pakaian ihram. Dilakukan di miqat (batas tempat yang telah ditentukan).</p>
<h3>Tempat Miqat untuk Jemaah Indonesia</h3>
<ul>
  <li><strong>Bandara KAIA Jeddah</strong>: Jemaah berihram di pesawat saat melintas di atas Yalamlam atau di bandara</li>
  <li><strong>Bir Ali (Dzul Hulaifah)</strong>: Jika masuk dari arah Madinah</li>
</ul>
<h3>Bacaan Niat Ihram Umroh</h3>
<p><em>"Labbaik Allahumma umratan"</em></p>
<p>Artinya: "Aku penuhi panggilan-Mu ya Allah untuk melaksanakan umroh."</p>
<p>Setelah niat, jemaah wajib menghindari larangan ihram: tidak boleh memakai wangi-wangian, memotong kuku/rambut, berhubungan suami-istri, dan berburu hewan.</p>

<h2>2. Tawaf — Mengelilingi Ka''bah</h2>
<p>Tawaf adalah mengelilingi Ka''bah sebanyak 7 putaran berlawanan arah jarum jam, dimulai dan diakhiri di Hajar Aswad (batu hitam di sudut Ka''bah).</p>
<h3>Tata Cara Tawaf</h3>
<ul>
  <li>Posisikan Ka''bah di sebelah kiri Anda setiap saat</li>
  <li>Mulai dari garis lurus sejajar Hajar Aswad (ditandai garis hijau di lantai)</li>
  <li>Pada 3 putaran pertama, pria berjalan agak cepat (raml) — wanita berjalan biasa</li>
  <li>Di sudut Yamani (sudut ketiga sebelum Hajar Aswad), usap dengan tangan kanan jika memungkinkan</li>
</ul>
<h3>Doa Antara Rukun Yamani dan Hajar Aswad</h3>
<p><em>"Rabbana atina fid-dunya hasanah wa fil-akhirati hasanah wa qina adzabannar."</em></p>

<h2>3. Sa''i — Berlari antara Shafa dan Marwah</h2>
<p>Sa''i dilakukan 7 kali antara Bukit Shafa dan Marwah, mengikuti jejak Siti Hajar yang berlari mencari air untuk Nabi Ismail.</p>
<h3>Hitungan Sa''i</h3>
<ul>
  <li>Shafa → Marwah = 1 kali</li>
  <li>Marwah → Shafa = 2 kali</li>
  <li>Dan seterusnya hingga 7 kali, berakhir di Marwah</li>
</ul>
<h3>Doa Memulai Sa''i di Bukit Shafa</h3>
<p><em>"Innas-Shafa wal-Marwata min sha''airillah..."</em> (QS. Al-Baqarah: 158)</p>

<h2>4. Tahallul — Mengakhiri Ihram</h2>
<p>Tahallul dilakukan dengan mencukur seluruh rambut kepala (afdhal) atau memotong minimal 3 helai rambut. Setelah tahallul, semua larangan ihram gugur dan umroh dinyatakan selesai.</p>
<p>Bagi wanita, cukup memotong rambut sepanjang ruas jari dari ujung rambut — tidak perlu dicukur habis.</p>

<h2>Doa Setelah Umroh Selesai</h2>
<p>Perbanyak doa dan syukur setelah menyelesaikan rangkaian umroh. Sempatkan shalat 2 rakaat di dekat Maqam Ibrahim setelah tawaf. Manfaatkan waktu di Tanah Suci untuk memperbanyak ibadah — setiap langkah di Masjidil Haram bernilai 100.000 pahala.</p>',
 'https://images.unsplash.com/photo-1537031931935-7f2eb41fec9d?w=1200&h=630&fit=crop',
 'Panduan Ibadah',
 'Ustadz Dr. Ahmad Syukri, Lc.',
 'Tata Cara Umroh Lengkap Sesuai Sunnah — Ihram, Tawaf, Sa''i, Tahallul',
 'Pelajari tata cara umroh yang benar: niat ihram di miqat, panduan tawaf 7 putaran, sa''i Shafa-Marwah, dan tahallul lengkap dengan bacaan doa.',
 true, '2026-06-08 09:00:00+07', now()),

-- ─── Artikel 3 ───────────────────────────────────────────────
('blog_03',
 'Tips Menjaga Kesehatan Selama Umroh: Panduan Lengkap di Tanah Suci',
 'tips-menjaga-kesehatan-selama-umroh',
 'Jutaan jemaah berkumpul dari berbagai penjuru dunia — kondisi ini membuat kesehatan menjadi tantangan tersendiri. Pelajari cara menjaga stamina, mencegah penyakit, dan tetap fit sepanjang perjalanan umroh Anda.',
 '<h2>Kondisi Cuaca di Tanah Suci</h2>
<p>Makkah dan Madinah memiliki iklim yang sangat berbeda dengan Indonesia. Suhu bisa mencapai 45-48°C di musim panas (Juni-September) dan turun hingga 10°C di malam hari musim dingin. Pemahaman tentang kondisi cuaca ini sangat penting untuk persiapan kesehatan Anda.</p>

<h2>Ancaman Utama Kesehatan Jemaah</h2>
<h3>1. Dehidrasi</h3>
<p>Penyebab utama jemaah jatuh sakit. Udara kering dan aktivitas fisik intens menguras cairan tubuh lebih cepat dari biasanya. Tanda-tanda dehidrasi: pusing, mulut kering, urine gelap, kelelahan berlebihan.</p>
<p><strong>Solusi:</strong> Minum air minimal 2-3 liter per hari, bahkan jika tidak haus. Selalu bawa botol air kemana-mana. Di musim panas, tambahkan minuman elektrolit setiap hari.</p>

<h3>2. Heat Stroke (Serangan Panas)</h3>
<p>Sangat berbahaya dan bisa fatal. Gejala: suhu tubuh sangat tinggi, tidak berkeringat, kulit merah dan kering, kebingungan, hingga pingsan.</p>
<p><strong>Pencegahan:</strong> Hindari keluar di siang hari antara pukul 11.00-15.00. Gunakan payung, topi, atau penutup kepala. Semprotkan air ke wajah dan leher secara berkala.</p>

<h3>3. Infeksi Saluran Pernapasan</h3>
<p>Padatnya jemaah dari berbagai negara meningkatkan risiko penularan penyakit pernapasan. ISPA, influenza, dan pneumonia adalah penyakit yang paling sering menyerang jemaah.</p>
<p><strong>Pencegahan:</strong> Selalu kenakan masker di keramaian. Hindari menyentuh wajah setelah memegang permukaan umum. Cuci tangan sesering mungkin dengan sabun atau hand sanitizer.</p>

<h3>4. Kelelahan Fisik</h3>
<p>Aktivitas ibadah yang sangat padat — tawaf, sa''i, shalat berjamaah 5 waktu — sangat menguras energi, terutama bagi jemaah yang tidak terbiasa berjalan jauh.</p>

<h2>Panduan Nutrisi di Tanah Suci</h2>
<ul>
  <li><strong>Makan teratur 3 kali sehari</strong> meski tidak lapar — jangan skip makan karena terlalu semangat beribadah</li>
  <li><strong>Konsumsi buah-buahan</strong> yang tersedia melimpah di Makkah: kurma, pisang, jeruk, semangka</li>
  <li><strong>Hindari makanan pedas berlebihan</strong> yang bisa memicu gangguan pencernaan</li>
  <li><strong>Air zamzam</strong> sangat dianjurkan — minum sesering mungkin untuk menjaga stamina dan keberkahan</li>
  <li><strong>Kurangi kopi dan teh</strong> — kafein membuat lebih sering buang air kecil dan memperparah dehidrasi</li>
</ul>

<h2>Daftar Obat Wajib Bawa</h2>
<p>Siapkan kotak P3K pribadi dengan isi berikut:</p>
<ul>
  <li>Paracetamol / ibuprofen (demam dan nyeri)</li>
  <li>Antidiare (Imodium atau oralit)</li>
  <li>Antasida (maag/asam lambung)</li>
  <li>Obat flu dan batuk</li>
  <li>Salep antijamur (kelembaban tinggi bisa memicu jamur)</li>
  <li>Plester luka dan perban</li>
  <li>Obat tetes mata (mata kering karena udara panas)</li>
  <li>Obat-obatan rutin pribadi (hipertensi, diabetes, dll.)</li>
</ul>

<h2>Tips Menjaga Stamina</h2>
<ul>
  <li>Tidur 6-8 jam sehari — jangan korbankan tidur meski ingin perbanyak ibadah malam</li>
  <li>Gunakan lift atau eskalator bila tersedia untuk menghemat energi</li>
  <li>Manfaatkan kursi roda yang tersedia gratis di Masjidil Haram untuk jemaah lansia</li>
  <li>Beribadah sesuai kemampuan — Allah tidak membebani hamba melebihi kemampuannya</li>
</ul>',
 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&h=630&fit=crop',
 'Kesehatan',
 'Dr. Hj. Sari Dewi, SpPD',
 'Tips Menjaga Kesehatan Saat Umroh — Panduan Lengkap Jemaah',
 'Panduan kesehatan umroh: cara mencegah dehidrasi, heat stroke, infeksi pernapasan, daftar obat wajib bawa, dan tips menjaga stamina selama di Tanah Suci.',
 true, '2026-06-15 10:00:00+07', now()),

-- ─── Artikel 4 ───────────────────────────────────────────────
('blog_04',
 'Keutamaan Umroh di Bulan Ramadhan: Pahala Setara Haji Bersama Rasulullah',
 'keutamaan-umroh-ramadhan-pahala-setara-haji',
 'Rasulullah SAW bersabda bahwa umroh di bulan Ramadhan pahalanya setara dengan haji bersama beliau. Pelajari keutamaan spiritual umroh Ramadhan, waktu terbaik berangkat, dan tips khusus ibadah di bulan suci.',
 '<h2>Hadits Tentang Keutamaan Umroh Ramadhan</h2>
<p>Dari Ibnu Abbas RA, Rasulullah SAW bersabda:</p>
<blockquote>
<p><em>"Umroh di bulan Ramadhan itu (pahalanya) seperti haji — atau seperti haji bersamaku."</em></p>
<p>(HR. Bukhari no. 1863 dan Muslim no. 1256)</p>
</blockquote>
<p>Hadits ini diriwayatkan ketika Nabi SAW mengetahui seorang wanita Anshar bernama Ummu Sinan tidak bisa ikut haji bersama beliau karena uzur. Beliau menghiburnya dengan mengatakan bahwa umroh Ramadhan setara dengan haji bersama Rasulullah.</p>

<h2>Keistimewaan Ibadah di Ramadhan</h2>
<p>Bulan Ramadhan adalah bulan yang Allah jadikan penuh keberkahan. Di bulan ini, pahala setiap amal ibadah dilipatgandakan:</p>
<ul>
  <li>Pahala shalat wajib setara 70 kali shalat di bulan biasa</li>
  <li>Pahala shalat sunnah setara shalat wajib di bulan biasa</li>
  <li>Pintu surga dibuka, pintu neraka ditutup, setan dibelenggu</li>
  <li>Terdapat Lailatul Qadar — satu malam yang lebih baik dari 1000 bulan (83 tahun ibadah)</li>
</ul>

<h2>Pengalaman Ibadah Eksklusif di Ramadhan</h2>
<h3>Buka Puasa di Masjidil Haram</h3>
<p>Ribuan nampan kurma, air zamzam, dan makanan disediakan gratis di seluruh pelataran Masjidil Haram menjelang maghrib. Berbuka bersama jutaan jemaah dari seluruh dunia adalah pengalaman spiritual yang tak tergantikan.</p>

<h3>Shalat Tarawih 20 Rakaat</h3>
<p>Shalat tarawih di Masjidil Haram dipimpin oleh imam-imam terbaik dunia dengan suara merdu yang memilukan. Setiap malam tarawih, imam membacakan beberapa juz Al-Quran — dalam satu Ramadhan penuh, seluruh Al-Quran dikhatamkan.</p>

<h3>I''tikaf 10 Malam Terakhir</h3>
<p>Paket Ramadhan UmrohPlus menyediakan waktu untuk i''tikaf di 10 malam terakhir Ramadhan — waktu paling utama untuk mencari Lailatul Qadar. Berdiam di masjid, memperbanyak doa, dzikir, dan tilawah Al-Quran.</p>

<h3>Malam Takbiran dan Idul Fitri di Tanah Suci</h3>
<p>Bagi yang berangkat di akhir Ramadhan, kesempatan merasakan malam takbiran dan shalat Idul Fitri di Masjidil Haram atau Masjid Nabawi adalah pengalaman sekali seumur hidup yang tidak ternilai harganya.</p>

<h2>Tips Khusus Umroh Ramadhan</h2>
<ul>
  <li><strong>Pesan jauh-jauh hari</strong>: kursi umroh Ramadhan selalu penuh jauh sebelum musim — idealnya 6-12 bulan sebelumnya</li>
  <li><strong>Pilih jadwal awal atau akhir Ramadhan</strong>: pertengahan Ramadhan adalah paling padat</li>
  <li><strong>Atur waktu tawaf di luar jam shalat</strong>: gunakan waktu tengah malam setelah tarawih yang lebih lengang</li>
  <li><strong>Jaga kondisi fisik</strong>: berpuasa sekaligus beribadah membutuhkan manajemen energi yang baik</li>
  <li><strong>Bawa Al-Quran ukuran saku</strong>: manfaatkan setiap momen menunggu untuk tilawah</li>
</ul>

<h2>Kenapa Memilih Umroh Ramadhan UmrohPlus?</h2>
<p>Paket Umroh Ramadhan UmrohPlus dirancang khusus untuk memaksimalkan pengalaman spiritual Anda di bulan mulia ini. Hotel pilihan kami berada sangat dekat dengan Masjidil Haram dan Masjid Nabawi, sehingga Anda bisa lebih banyak menghabiskan waktu dalam ibadah, bukan dalam perjalanan.</p>',
 'https://images.unsplash.com/photo-1605773527852-c546a8584ea3?w=1200&h=630&fit=crop',
 'Inspirasi',
 'Ustadz Muhammad Amin Fauzan, S.Ag.',
 'Keutamaan Umroh Ramadhan: Pahala Setara Haji Bersama Rasulullah SAW',
 'Pahami keutamaan umroh di bulan Ramadhan berdasarkan hadits sahih. Pengalaman tarawih, i''tikaf, dan buka puasa di Masjidil Haram yang tak terlupakan.',
 true, '2026-06-22 08:30:00+07', now()),

-- ─── Artikel 5 ───────────────────────────────────────────────
('blog_05',
 'Ziarah Wajib di Makkah dan Madinah: Tempat-Tempat Bersejarah yang Harus Dikunjungi',
 'ziarah-tempat-bersejarah-makkah-madinah',
 'Selain tawaf dan sa''i, Tanah Suci menyimpan banyak tempat bersejarah Islam yang sarat makna. Dari Gua Hira dan Jabal Tsur di Makkah, hingga Masjid Quba dan Kebun Kurma di Madinah — panduan lengkap ziarah Anda.',
 '<h2>Tempat Ziarah Utama di Makkah</h2>

<h3>1. Jabal Nur dan Gua Hira</h3>
<p>Di sinilah wahyu pertama Al-Quran turun kepada Nabi Muhammad SAW — Surat Al-Alaq ayat 1-5. Gua Hira berada di puncak Jabal Nur yang harus didaki sekitar 45 menit. Pemandangan kota Makkah dari atas sangat memukau, dan rasakan atmosfer spiritualitas tempat bersejarah ini.</p>
<p><em>Catatan: Tidak ada kewajiban shalat khusus di sini — cukup berdoa dan bertafakur.</em></p>

<h3>2. Jabal Tsur dan Gua Tsur</h3>
<p>Tempat Nabi SAW dan Abu Bakar RA bersembunyi selama 3 hari saat hijrah ke Madinah. Dikisahkan seekor laba-laba membuat sarang dan merpati bersarang di mulut gua untuk melindungi Nabi dari kejaran kaum Quraisy.</p>

<h3>3. Jabal Rahmah (Bukit Kasih Sayang)</h3>
<p>Di Padang Arafah, bukit ini adalah tempat Nabi Adam dan Siti Hawa bertemu kembali setelah berpisah dari surga. Di puncak bukit terdapat tiang putih sebagai penanda. Area wukuf haji berada di sekitar bukit ini.</p>

<h3>4. Masjid Ji''ranah</h3>
<p>Tempat Rasulullah SAW berihram untuk umroh terakhir beliau setelah Fathu Makkah. Bagi yang ingin melakukan umroh tambahan selama di Makkah, Ji''ranah adalah salah satu miqat yang bisa digunakan.</p>

<h3>5. Maqam Ibrahim</h3>
<p>Batu tempat Nabi Ibrahim AS berdiri saat membangun Ka''bah. Jejak kaki beliau masih tampak tertinggal di atas batu tersebut. Shalat 2 rakaat di belakang Maqam Ibrahim setelah tawaf adalah sunnah.</p>

<h2>Tempat Ziarah Utama di Madinah</h2>

<h3>1. Masjid Nabawi dan Raudhah</h3>
<p>Masjid Nabawi adalah masjid kedua yang paling suci dalam Islam, dibangun langsung oleh Rasulullah SAW. Di dalamnya terdapat Raudhah — taman surga — yang merupakan tempat paling mustajab untuk berdoa. Makam Rasulullah SAW beserta para sahabatnya (Abu Bakar dan Umar) juga berada di sini.</p>

<h3>2. Masjid Quba</h3>
<p>Masjid pertama yang dibangun dalam sejarah Islam. Rasulullah SAW bersabda: "Shalat 2 rakaat di Masjid Quba pahalanya setara dengan ibadah umroh." Shalat di sini adalah sunnah muakkad yang sangat sayang untuk dilewatkan.</p>

<h3>3. Masjid Qiblatain (Masjid Dua Kiblat)</h3>
<p>Tempat di mana Rasulullah SAW menerima perintah untuk mengubah arah kiblat dari Masjid Al-Aqsa di Yerusalem ke Ka''bah di Makkah. Di sinilah terjadi peristiwa bersejarah perpindahan kiblat di tengah shalat.</p>

<h3>4. Pemakaman Baqi''</h3>
<p>Makam para sahabat, istri-istri Rasulullah (Ummahatul Mukminin), dan keluarga Nabi. Di sini dimakamkan Siti Khadijah (di Makkah, Jannatul Mualla), Utsman bin Affan, dan ribuan sahabat lainnya. Berziarah ke Baqi'' adalah sunnah dengan membaca salam dan doa untuk penghuni kubur.</p>

<h3>5. Kebun Kurma Madinah</h3>
<p>Madinah adalah penghasil kurma terbaik dunia. Kunjungi kebun kurma dan pasar kurma untuk memilih berbagai varietas langsung dari petaninya — Ajwa, Medjool, Safawi, Sukari — sebagai oleh-oleh terbaik dari Tanah Suci.</p>

<h2>Etika Ziarah yang Perlu Diperhatikan</h2>
<ul>
  <li>Niatkan ziarah untuk mengambil ibrah (pelajaran) dan mendoakan kaum muslimin</li>
  <li>Tidak berlebihan dalam berdoa di kuburan atau meminta kepada orang yang sudah meninggal</li>
  <li>Jaga kebersihan dan ketertiban di setiap tempat ziarah</li>
  <li>Ikuti panduan muthawif Anda — mereka tahu lokasi dan waktu terbaik untuk setiap ziarah</li>
</ul>',
 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1200&h=630&fit=crop',
 'Destinasi',
 'Tim Redaksi UmrohPlus',
 'Panduan Ziarah Makkah & Madinah — Tempat Bersejarah Islam Wajib Kunjungi',
 'Panduan lengkap ziarah ke tempat bersejarah di Makkah (Gua Hira, Jabal Tsur, Arafah) dan Madinah (Raudhah, Masjid Quba, Baqi'') saat umroh.',
 true, '2026-06-29 09:00:00+07', now()),

-- ─── Artikel 6 ───────────────────────────────────────────────
('blog_06',
 'Panduan Lengkap Memilih Paket Umroh yang Tepat: Reguler, Plus, atau VIP?',
 'cara-memilih-paket-umroh-reguler-plus-vip',
 'Bingung memilih antara paket reguler, plus, atau VIP? Artikel ini membantu Anda membuat keputusan terbaik berdasarkan anggaran, kebutuhan, dan prioritas ibadah Anda.',
 '<h2>Memahami Perbedaan Tipe Paket Umroh</h2>
<p>Sebelum memilih paket, pahami terlebih dahulu apa yang menjadi prioritas Anda: apakah kedekatan hotel ke masjid, kualitas akomodasi, durasi waktu, atau efisiensi anggaran. Berikut perbandingan lengkapnya:</p>

<h2>Paket Umroh Reguler</h2>
<h3>Cocok untuk siapa?</h3>
<ul>
  <li>Jemaah yang ingin umroh dengan anggaran terjangkau</li>
  <li>Usia produktif dengan kondisi fisik prima</li>
  <li>Tidak menjadikan jarak hotel sebagai prioritas utama</li>
</ul>
<h3>Yang biasanya termasuk:</h3>
<ul>
  <li>Hotel bintang 4 dengan jarak 500m-1km dari Masjidil Haram</li>
  <li>Durasi 9 hari (4 malam Makkah, 3 malam Madinah)</li>
  <li>Penerbangan kelas ekonomi</li>
  <li>Makan 2-3 kali sehari (prasmanan)</li>
  <li>Transportasi bus AC bersama</li>
</ul>
<h3>Harga Paket Reguler UmrohPlus:</h3>
<p>Mulai dari <strong>Rp 27.500.000</strong> per orang (kamar quadruple)</p>

<h2>Paket Umroh Plus</h2>
<h3>Cocok untuk siapa?</h3>
<ul>
  <li>Jemaah yang menginginkan kenyamanan lebih tanpa harga VIP</li>
  <li>Pasangan suami-istri atau keluarga kecil</li>
  <li>Yang ingin durasi lebih panjang untuk ibadah lebih leluasa</li>
</ul>
<h3>Yang biasanya termasuk:</h3>
<ul>
  <li>Hotel bintang 5 dengan jarak 200-300m dari Masjidil Haram</li>
  <li>Durasi 12 hari (5 malam Makkah, 4 malam Madinah)</li>
  <li>Penerbangan kelas ekonomi pilihan (Garuda Indonesia)</li>
  <li>Makan 3 kali sehari dengan menu lebih beragam</li>
  <li>Ziarah lengkap Makkah-Madinah</li>
</ul>
<h3>Harga Paket Plus UmrohPlus:</h3>
<p>Mulai dari <strong>Rp 34.500.000</strong> per orang (kamar quadruple)</p>

<h2>Paket Umroh VIP</h2>
<h3>Cocok untuk siapa?</h3>
<ul>
  <li>Jemaah lansia yang membutuhkan kenyamanan maksimal</li>
  <li>Jemaah yang ingin pengalaman ibadah paling premium</li>
  <li>Honeymoon islami atau hadiah istimewa untuk orang tua</li>
</ul>
<h3>Yang biasanya termasuk:</h3>
<ul>
  <li>Hotel bintang 5 tepat di dalam atau bersebelahan dengan Masjidil Haram</li>
  <li>Durasi 12 hari dengan jadwal fleksibel</li>
  <li>Penerbangan kelas bisnis atau ekonomi premium</li>
  <li>Layanan concierge pribadi</li>
  <li>Kamar superior dengan view Ka''bah (untuk paket tertentu)</li>
  <li>Akses lounge bandara</li>
</ul>
<h3>Harga Paket VIP UmrohPlus:</h3>
<p>Mulai dari <strong>Rp 44.000.000</strong> per orang (kamar quadruple)</p>

<h2>Tipe Kamar: Quadruple, Triple, Double, atau Single?</h2>
<p>Pilihan tipe kamar sangat mempengaruhi harga dan kenyamanan:</p>
<ul>
  <li><strong>Quadruple (4 orang/kamar)</strong>: Paling hemat, cocok untuk grup atau keluarga besar. Kurangi biaya akomodasi hingga 40%.</li>
  <li><strong>Triple (3 orang/kamar)</strong>: Keseimbangan antara hemat dan nyaman. Ideal untuk 3 bersaudara atau teman.</li>
  <li><strong>Double (2 orang/kamar)</strong>: Untuk pasangan suami-istri atau yang ingin privasi lebih. Paling populer.</li>
  <li><strong>Single (1 orang/kamar)</strong>: Privasi penuh, bebas mengatur jadwal sendiri. Harga premium namun kenyamanan maksimal.</li>
</ul>

<h2>Checklist Memilih Travel Umroh Terpercaya</h2>
<p>Sebelum memutuskan, pastikan travel Anda memenuhi kriteria berikut:</p>
<ul>
  <li>✅ Terdaftar resmi di Kemenag RI (cek di website resmi Kemenag)</li>
  <li>✅ Memiliki track record jelas — berapa ribu jemaah sudah diberangkatkan</li>
  <li>✅ Harga transparan tanpa biaya tersembunyi</li>
  <li>✅ Kontrak tertulis yang jelas mencantumkan semua fasilitas</li>
  <li>✅ Responsif dan mudah dihubungi sebelum keberangkatan</li>
  <li>✅ Ada muthawif profesional bersertifikat yang mendampingi selama perjalanan</li>
</ul>',
 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=1200&h=630&fit=crop',
 'Tips & Trik',
 'Tim Redaksi UmrohPlus',
 'Cara Memilih Paket Umroh yang Tepat: Reguler vs Plus vs VIP',
 'Panduan praktis memilih paket umroh sesuai kebutuhan dan anggaran. Perbandingan lengkap paket reguler, plus, dan VIP beserta tips memilih travel terpercaya.',
 true, '2026-07-01 08:00:00+07', now())

ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- VERIFIKASI — Hitung total data yang berhasil di-insert
-- =============================================================

SELECT
  'currencies'         AS tabel, COUNT(*) AS total FROM currencies
UNION ALL SELECT 'package_categories',  COUNT(*) FROM package_categories
UNION ALL SELECT 'hotels',              COUNT(*) FROM hotels
UNION ALL SELECT 'airlines',            COUNT(*) FROM airlines
UNION ALL SELECT 'airports',            COUNT(*) FROM airports
UNION ALL SELECT 'muthawifs',           COUNT(*) FROM muthawifs
UNION ALL SELECT 'branches',            COUNT(*) FROM branches
UNION ALL SELECT 'packages',            COUNT(*) FROM packages
UNION ALL SELECT 'package_departures',  COUNT(*) FROM package_departures
UNION ALL SELECT 'departure_prices',    COUNT(*) FROM departure_prices
UNION ALL SELECT 'package_commissions', COUNT(*) FROM package_commissions
UNION ALL SELECT 'blog_posts',          COUNT(*) FROM blog_posts
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
UNION ALL SELECT 'testimonials',        COUNT(*) FROM testimonials
UNION ALL SELECT 'gallery',             COUNT(*) FROM gallery
ORDER BY tabel;
