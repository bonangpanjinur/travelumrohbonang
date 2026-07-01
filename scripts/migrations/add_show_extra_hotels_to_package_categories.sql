-- Migration: tambah kolom show_extra_hotels ke tabel package_categories
-- Jalankan di: Supabase Dashboard → SQL Editor
--
-- Kolom ini mengontrol apakah form paket menampilkan pilihan "Hotel Tambahan"
-- saat kategori tersebut dipilih. Sebelumnya logika ini bergantung pada nama
-- kategori (mengandung "plus" atau "haji") — sekarang dikontrol dari admin.

ALTER TABLE package_categories
  ADD COLUMN IF NOT EXISTS show_extra_hotels boolean NOT NULL DEFAULT false;

-- Migrasi data lama: aktifkan show_extra_hotels untuk kategori yang namanya
-- mengandung "plus" atau "haji" (sesuai logika lama)
UPDATE package_categories
SET show_extra_hotels = true
WHERE lower(name) LIKE '%plus%'
   OR lower(name) LIKE '%haji%';
