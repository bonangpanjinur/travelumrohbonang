-- =============================================================================
-- SEED DATA: Hotel Mekkah, Madinah, Turkey (Istanbul), Dubai
-- Jalankan di Supabase SQL Editor atau psql.
-- Gunakan ON CONFLICT DO NOTHING agar aman dijalankan ulang.
-- =============================================================================

INSERT INTO hotels (id, name, city, stars, image_url, description, created_at) VALUES

-- ============================================================
-- MEKKAH
-- ============================================================
('hotel-makkah-001', 'Makkah Clock Royal Tower – A Fairmont Hotel', 'Mekkah', 5,
 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800',
 'Hotel bintang 5 mewah yang bersebelahan langsung dengan Masjidil Haram. Menara jam ikonik dengan panorama Ka''bah dari kamar.',
 NOW()),

('hotel-makkah-002', 'Hilton Suites Makkah', 'Mekkah', 5,
 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
 'Suite mewah dengan akses langsung ke kompleks Abraj Al-Bait, restoran internasional, dan fasilitas premium.',
 NOW()),

('hotel-makkah-003', 'Swissotel Makkah', 'Mekkah', 5,
 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
 'Hotel bintang 5 di menara Abraj Al-Bait, jarak 200 meter dari Masjidil Haram, pemandangan langsung Ka''bah.',
 NOW()),

('hotel-makkah-004', 'Pullman Zamzam Makkah', 'Mekkah', 5,
 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800',
 'Properti bintang 5 di kompleks Abraj Al-Bait dengan lebih dari 1.200 kamar, dekat King Abdul Aziz Gate.',
 NOW()),

('hotel-makkah-005', 'Conrad Makkah', 'Mekkah', 5,
 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
 'Hotel Conrad modern dengan desain kontemporer, kolam renang rooftop, dan restoran halal berkelas.',
 NOW()),

('hotel-makkah-006', 'Anjum Hotel Makkah', 'Mekkah', 5,
 'https://images.unsplash.com/photo-1551882547-ff40c63fe2f7?w=800',
 'Hotel bintang 5 strategis, hanya 500 meter dari Masjidil Haram, pilihan populer untuk jamaah umroh.',
 NOW()),

('hotel-makkah-007', 'Movenpick Hotel & Residences Hajar Tower Makkah', 'Mekkah', 5,
 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
 'Terletak di kompleks Abraj Al-Bait, kamar dengan pemandangan Masjidil Haram dan layanan butik profesional.',
 NOW()),

('hotel-makkah-008', 'Al Shohada Hotel Makkah', 'Mekkah', 4,
 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
 'Hotel bintang 4 terjangkau dengan lokasi strategis, jarak berjalan kaki ke Masjidil Haram.',
 NOW()),

('hotel-makkah-009', 'Millennium Makkah Al Naseem Hotel', 'Mekkah', 4,
 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800',
 'Hotel bintang 4 modern dengan fasilitas lengkap dan lokasi dekat area Ajyad, Makkah.',
 NOW()),

('hotel-makkah-010', 'Grand Zam Zam Makkah Hotel', 'Mekkah', 3,
 'https://images.unsplash.com/photo-1586611292717-f828b167408c?w=800',
 'Hotel bintang 3 ekonomis pilihan jamaah dengan anggaran terjangkau, akses mudah ke Masjidil Haram.',
 NOW()),

-- ============================================================
-- MADINAH
-- ============================================================
('hotel-madinah-001', 'Anwar Al Madinah Movenpick Hotel', 'Madinah', 5,
 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
 'Hotel bintang 5 eksklusif di samping Masjid Nabawi dengan pemandangan langsung ke menara masjid.',
 NOW()),

('hotel-madinah-002', 'Dar Al Taqwa Hotel Madinah', 'Madinah', 5,
 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
 'Properti bintang 5 ikonik, hanya 50 meter dari Gate 21 Masjid Nabawi, sangat diminati jamaah.',
 NOW()),

('hotel-madinah-003', 'Pullman Zamzam Madinah', 'Madinah', 5,
 'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=800',
 'Hotel modern bintang 5 dengan fasilitas premium, restoran multi-masakan, dan akses mudah ke Masjid Nabawi.',
 NOW()),

('hotel-madinah-004', 'Al Madinah Hilton', 'Madinah', 5,
 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800',
 'Hilton Madinah menawarkan kamar luas dengan fasilitas kelas dunia dan tim staf profesional berbahasa Indonesia.',
 NOW()),

('hotel-madinah-005', 'Frontel Al Harithia Hotel', 'Madinah', 4,
 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=800',
 'Hotel bintang 4 dengan lokasi strategis dekat Masjid Nabawi, sarapan buffet, dan layanan antar-jemput.',
 NOW()),

('hotel-madinah-006', 'Shaza Madinah', 'Madinah', 5,
 'https://images.unsplash.com/photo-1559508551-44bff1de756b?w=800',
 'Butik hotel bintang 5 dengan desain Islami kontemporer, hanya beberapa menit berjalan dari Masjid Nabawi.',
 NOW()),

('hotel-madinah-007', 'Holiday Inn Madinah Al Salam', 'Madinah', 4,
 'https://images.unsplash.com/photo-1596701062351-8ac031b6adea?w=800',
 'Hotel bintang 4 nyaman dengan harga kompetitif, restoran halal, dan pelayanan ramah.',
 NOW()),

('hotel-madinah-008', 'Saja Al Madinah Hotel', 'Madinah', 4,
 'https://images.unsplash.com/photo-1587213811864-c99b4e68e0f2?w=800',
 'Hotel bintang 4 modern dengan 300 kamar, dekat Masjid Nabawi, cocok untuk grup jamaah besar.',
 NOW()),

('hotel-madinah-009', 'Al Eiman Royal Hotel', 'Madinah', 3,
 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
 'Hotel bintang 3 terpercaya di kawasan pusat Madinah, favorit agen perjalanan umroh budget.',
 NOW()),

('hotel-madinah-010', 'Sama Al Deafah Hotel', 'Madinah', 3,
 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800',
 'Hotel bintang 3 dengan fasilitas dasar lengkap, lokasi tidak jauh dari Masjid Nabawi.',
 NOW()),

-- ============================================================
-- ISTANBUL, TURKEY
-- ============================================================
('hotel-istanbul-001', 'Four Seasons Hotel Istanbul at Sultanahmet', 'Istanbul', 5,
 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
 'Hotel mewah bintang 5 dalam bangunan bersejarah bekas penjara Ottoman, dekat Hagia Sophia dan Blue Mosque.',
 NOW()),

('hotel-istanbul-002', 'Çırağan Palace Kempinski Istanbul', 'Istanbul', 5,
 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
 'Istana era Ottoman di tepi Bosphorus, salah satu hotel paling ikonik di Istanbul dengan kolam renang terapung.',
 NOW()),

('hotel-istanbul-003', 'The Ritz-Carlton Istanbul', 'Istanbul', 5,
 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
 'Hotel bintang 5 di distrik Şişli dengan pemandangan Bosphorus, restoran rooftop, dan spa mewah.',
 NOW()),

('hotel-istanbul-004', 'Mandarin Oriental Bosphorus Istanbul', 'Istanbul', 5,
 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800',
 'Properti eksklusif di tepi selat Bosphorus dengan private beach, 4 restoran, dan spa kelas dunia.',
 NOW()),

('hotel-istanbul-005', 'Swissotel The Bosphorus Istanbul', 'Istanbul', 5,
 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
 'Hotel bintang 5 ikonik di Beşiktaş dengan pemandangan Bosphorus, 5 restoran & bar, dan fasilitas meeting luas.',
 NOW()),

('hotel-istanbul-006', 'Hilton Istanbul Bomonti', 'Istanbul', 5,
 'https://images.unsplash.com/photo-1551882547-ff40c63fe2f7?w=800',
 'Hotel megah dengan 829 kamar, rooftop bar, 2 kolam renang, dan lokasi strategis di pusat bisnis Istanbul.',
 NOW()),

('hotel-istanbul-007', 'Grand Hyatt Istanbul', 'Istanbul', 5,
 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
 'Hotel modern di Taksim dengan fasilitas premium, kolam renang indoor, dan akses mudah ke pusat perbelanjaan.',
 NOW()),

('hotel-istanbul-008', 'Radisson Blu Hotel Istanbul Pera', 'Istanbul', 4,
 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
 'Hotel bintang 4 di kawasan Pera bersejarah, dekat istana dan museum, pilihan tepat untuk wisata budaya.',
 NOW()),

('hotel-istanbul-009', 'DoubleTree by Hilton Istanbul - Topkapi', 'Istanbul', 4,
 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800',
 'Hotel bintang 4 modern dekat Topkapi Palace, sarapan mewah, dan pelayanan ramah keluarga.',
 NOW()),

('hotel-istanbul-010', 'Holiday Inn Istanbul City', 'Istanbul', 4,
 'https://images.unsplash.com/photo-1586611292717-f828b167408c?w=800',
 'Hotel bintang 4 terjangkau di pusat kota Istanbul, akses mudah ke transportasi dan objek wisata utama.',
 NOW()),

-- ============================================================
-- DUBAI
-- ============================================================
('hotel-dubai-001', 'Burj Al Arab Jumeirah', 'Dubai', 7,
 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800',
 'Ikon kemewahan Dubai, satu-satunya hotel "tujuh bintang" berbentuk layar kapal di atas pulau buatan.',
 NOW()),

('hotel-dubai-002', 'Atlantis The Palm Dubai', 'Dubai', 5,
 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=800',
 'Resort megah di Palm Jumeirah dengan Aquaventure Waterpark, akuarium raksasa, dan 30+ restoran.',
 NOW()),

('hotel-dubai-003', 'Jumeirah Beach Hotel', 'Dubai', 5,
 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
 'Hotel berbentuk gelombang ikonik di pantai Jumeirah, bersebelahan dengan Burj Al Arab.',
 NOW()),

('hotel-dubai-004', 'Address Downtown Dubai', 'Dubai', 5,
 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
 'Hotel bintang 5 mewah di jantung Downtown Dubai, dekat Burj Khalifa dan Dubai Mall.',
 NOW()),

('hotel-dubai-005', 'Waldorf Astoria Dubai Palm Jumeirah', 'Dubai', 5,
 'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=800',
 'Resort eksklusif di Palm Jumeirah dengan private beach, kolam renang infinity, dan restoran fine dining.',
 NOW()),

('hotel-dubai-006', 'The St. Regis Dubai, The Palm', 'Dubai', 5,
 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800',
 'Hotel St. Regis mewah dengan butler service 24 jam, pantai privat, dan pemandangan skyline Dubai.',
 NOW()),

('hotel-dubai-007', 'Sofitel Dubai Downtown', 'Dubai', 5,
 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=800',
 'Hotel Prancis-chic bintang 5 dekat Burj Khalifa, menggabungkan keanggunan Eropa dengan kemewahan Dubai.',
 NOW()),

('hotel-dubai-008', 'JW Marriott Marquis Dubai', 'Dubai', 5,
 'https://images.unsplash.com/photo-1559508551-44bff1de756b?w=800',
 'Salah satu hotel tertinggi dunia dengan 72 lantai, 14 restoran & bar, dan spa mewah di Business Bay.',
 NOW()),

('hotel-dubai-009', 'Hilton Dubai Al Habtoor City', 'Dubai', 5,
 'https://images.unsplash.com/photo-1596701062351-8ac031b6adea?w=800',
 'Hotel megah di Al Habtoor City dengan kolam renang outdoor luas, dekat Dubai Water Canal.',
 NOW()),

('hotel-dubai-010', 'Hyatt Regency Dubai Creek Heights', 'Dubai', 5,
 'https://images.unsplash.com/photo-1587213811864-c99b4e68e0f2?w=800',
 'Hotel modern di Creek Heights dengan fasilitas bisnis lengkap, restoran rooftop, dan akses Dubai Frame.',
 NOW()),

('hotel-dubai-011', 'Crowne Plaza Dubai Festival City', 'Dubai', 4,
 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
 'Hotel bintang 4 di tepi Creek dengan pemandangan Dubai Festival City Mall dan akses ke mal langsung.',
 NOW()),

('hotel-dubai-012', 'Premier Inn Dubai International Airport', 'Dubai', 3,
 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800',
 'Hotel bintang 3 dekat bandara internasional Dubai, ideal untuk transit, shuttle gratis ke terminal.',
 NOW())

ON CONFLICT (id) DO NOTHING;

-- Verifikasi hasil
SELECT city, COUNT(*) AS jumlah_hotel, MIN(stars) AS min_bintang, MAX(stars) AS max_bintang
FROM hotels
WHERE city IN ('Mekkah', 'Madinah', 'Istanbul', 'Dubai')
GROUP BY city
ORDER BY city;
