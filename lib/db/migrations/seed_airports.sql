-- =============================================================================
-- SEED DATA: Bandara Indonesia, Jeddah, Madinah, Turkey, Qatar, India, Mesir
-- Jalankan di Supabase SQL Editor.
-- ON CONFLICT DO NOTHING agar aman dijalankan ulang.
-- =============================================================================

INSERT INTO airports (id, name, code, city, created_at) VALUES

-- ============================================================
-- INDONESIA — Bandara Embarkasi Utama Haji & Umroh
-- ============================================================
('apt-id-cgk',  'Bandar Udara Internasional Soekarno-Hatta',           'CGK', 'Jakarta (Tangerang)',  NOW()),
('apt-id-hlp',  'Bandar Udara Halim Perdanakusuma',                     'HLP', 'Jakarta',              NOW()),
('apt-id-kno',  'Bandar Udara Internasional Kualanamu',                 'KNO', 'Medan',                NOW()),
('apt-id-bth',  'Bandar Udara Internasional Hang Nadim',                'BTH', 'Batam',                NOW()),
('apt-id-pku',  'Bandar Udara Internasional Sultan Syarif Kasim II',    'PKU', 'Pekanbaru',            NOW()),
('apt-id-pdg',  'Bandar Udara Internasional Minangkabau',               'PDG', 'Padang',               NOW()),
('apt-id-plm',  'Bandar Udara Internasional Sultan Mahmud Badaruddin II','PLM', 'Palembang',            NOW()),
('apt-id-bdo',  'Bandar Udara Internasional Husein Sastranegara',       'BDO', 'Bandung',              NOW()),
('apt-id-jog',  'Bandar Udara Internasional Yogyakarta (YIA)',          'YIA', 'Yogyakarta (Kulon Progo)', NOW()),
('apt-id-soc',  'Bandar Udara Internasional Adi Soemarmo',              'SOC', 'Solo',                 NOW()),
('apt-id-sub',  'Bandar Udara Internasional Juanda',                    'SUB', 'Surabaya',             NOW()),
('apt-id-mlg',  'Bandar Udara Abdul Rachman Saleh',                     'MLG', 'Malang',               NOW()),
('apt-id-upg',  'Bandar Udara Internasional Sultan Hasanuddin',         'UPG', 'Makassar',             NOW()),
('apt-id-bpn',  'Bandar Udara Internasional Sultan Aji Muhammad Sulaiman Sepinggan', 'BPN', 'Balikpapan', NOW()),
('apt-id-pnk',  'Bandar Udara Internasional Supadio',                   'PNK', 'Pontianak',            NOW()),
('apt-id-bdj',  'Bandar Udara Internasional Syamsudin Noor',            'BDJ', 'Banjarmasin',          NOW()),
('apt-id-dps',  'Bandar Udara Internasional Ngurah Rai',                'DPS', 'Bali (Denpasar)',      NOW()),
('apt-id-lop',  'Bandar Udara Internasional Zainuddin Abdul Majid',     'LOP', 'Lombok',               NOW()),
('apt-id-amid', 'Bandar Udara Internasional Maimun Saleh',              'SBG', 'Sabang (Aceh)',        NOW()),
('apt-id-bja',  'Bandar Udara Internasional Rembele',                   'BTJ', 'Banda Aceh',           NOW()),
('apt-id-mdc',  'Bandar Udara Internasional Sam Ratulangi',             'MDC', 'Manado',               NOW()),
('apt-id-amq',  'Bandar Udara Internasional Pattimura',                 'AMQ', 'Ambon',                NOW()),
('apt-id-tim',  'Bandar Udara Mozes Kilangin',                          'TIM', 'Timika',               NOW()),
('apt-id-djj',  'Bandar Udara Internasional Dortheys Hiyo Eluay',       'DJJ', 'Jayapura',             NOW()),

-- ============================================================
-- ARAB SAUDI
-- ============================================================
('apt-sa-jed',  'Bandar Udara Internasional King Abdulaziz',            'JED', 'Jeddah',               NOW()),
('apt-sa-med',  'Bandar Udara Internasional Prince Mohammad bin Abdulaziz', 'MED', 'Madinah',          NOW()),
('apt-sa-ruh',  'Bandar Udara Internasional King Khalid',               'RUH', 'Riyadh',               NOW()),
('apt-sa-dmm',  'Bandar Udara Internasional King Fahd',                 'DMM', 'Dammam',               NOW()),
('apt-sa-abha', 'Bandar Udara Internasional Abha',                      'AHB', 'Abha',                 NOW()),
('apt-sa-taj',  'Bandar Udara Internasional Taif',                      'TIF', 'Taif',                 NOW()),

-- ============================================================
-- TURKEY (TÜRKIYE)
-- ============================================================
('apt-tr-ist',  'Bandar Udara Internasional Istanbul',                  'IST', 'Istanbul',             NOW()),
('apt-tr-saw',  'Bandar Udara Sabiha Gökçen Istanbul',                  'SAW', 'Istanbul (Sabiha Gökçen)', NOW()),
('apt-tr-esb',  'Bandar Udara Internasional Ankara Esenboğa',           'ESB', 'Ankara',               NOW()),
('apt-tr-ayt',  'Bandar Udara Internasional Antalya',                   'AYT', 'Antalya',              NOW()),
('apt-tr-izm',  'Bandar Udara Internasional Adnan Menderes',            'ADB', 'Izmir',                NOW()),
('apt-tr-con',  'Bandar Udara Internasional Konya',                     'KYA', 'Konya',                NOW()),
('apt-tr-trz',  'Bandar Udara Trabzon',                                  'TZX', 'Trabzon',              NOW()),

-- ============================================================
-- QATAR
-- ============================================================
('apt-qa-doh',  'Bandar Udara Internasional Hamad',                     'DOH', 'Doha',                 NOW()),

-- ============================================================
-- INDIA
-- ============================================================
('apt-in-del',  'Bandar Udara Internasional Indira Gandhi',             'DEL', 'New Delhi',            NOW()),
('apt-in-bom',  'Bandar Udara Internasional Chhatrapati Shivaji Maharaj', 'BOM', 'Mumbai',             NOW()),
('apt-in-maa',  'Bandar Udara Internasional Chennai',                   'MAA', 'Chennai',              NOW()),
('apt-in-cok',  'Bandar Udara Internasional Cochin',                    'COK', 'Kochi (Kerala)',       NOW()),
('apt-in-cok2', 'Bandar Udara Internasional Calicut',                   'CCJ', 'Calicut (Kozhikode)',  NOW()),
('apt-in-hyd',  'Bandar Udara Internasional Rajiv Gandhi',              'HYD', 'Hyderabad',            NOW()),
('apt-in-blr',  'Bandar Udara Internasional Kempegowda',                'BLR', 'Bangalore',            NOW()),
('apt-in-amd',  'Bandar Udara Internasional Sardar Vallabhbhai Patel', 'AMD', 'Ahmedabad',            NOW()),

-- ============================================================
-- MESIR (EGYPT)
-- ============================================================
('apt-eg-cai',  'Bandar Udara Internasional Kairo',                     'CAI', 'Kairo',                NOW()),
('apt-eg-hbe',  'Bandar Udara Internasional Borg El Arab',              'HBE', 'Alexandria',           NOW()),
('apt-eg-lxr',  'Bandar Udara Internasional Luxor',                     'LXR', 'Luxor',                NOW()),
('apt-eg-hrg',  'Bandar Udara Internasional Hurghada',                  'HRG', 'Hurghada',             NOW()),
('apt-eg-ssh',  'Bandar Udara Internasional Sharm el-Sheikh',           'SSH', 'Sharm el-Sheikh',      NOW()),
('apt-eg-asy',  'Bandar Udara Internasional Aswan',                     'ASW', 'Aswan',                NOW())

ON CONFLICT (id) DO NOTHING;

-- Verifikasi hasil
SELECT
  CASE
    WHEN city LIKE '%Jakarta%' OR city IN ('Medan','Batam','Pekanbaru','Padang','Palembang','Bandung',
         'Yogyakarta (Kulon Progo)','Solo','Surabaya','Malang','Makassar','Balikpapan','Pontianak',
         'Banjarmasin','Bali (Denpasar)','Lombok','Banda Aceh','Manado','Ambon','Timika','Jayapura',
         'Sabang (Aceh)') THEN 'Indonesia'
    WHEN city IN ('Jeddah','Madinah','Riyadh','Dammam','Abha','Taif') THEN 'Arab Saudi'
    WHEN city LIKE '%Istanbul%' OR city IN ('Ankara','Antalya','Izmir','Konya','Trabzon') THEN 'Turkey'
    WHEN city = 'Doha' THEN 'Qatar'
    WHEN city IN ('New Delhi','Mumbai','Chennai','Kochi (Kerala)','Calicut (Kozhikode)',
                  'Hyderabad','Bangalore','Ahmedabad') THEN 'India'
    WHEN city IN ('Kairo','Alexandria','Luxor','Hurghada','Sharm el-Sheikh','Aswan') THEN 'Mesir'
    ELSE 'Lainnya'
  END AS negara,
  COUNT(*) AS jumlah_bandara
FROM airports
WHERE id LIKE 'apt-%'
GROUP BY negara
ORDER BY negara;
