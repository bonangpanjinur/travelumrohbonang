-- Migration: tambah tabel document_types untuk konfigurasi master jenis dokumen jemaah
-- Tabel ini menyimpan semua jenis dokumen yang wajib/opsional dilengkapi jemaah,
-- menggantikan nilai hardcoded yang tersebar di frontend dan backend.

CREATE TABLE IF NOT EXISTS "document_types" (
  "id"                   text PRIMARY KEY,
  "code"                 text NOT NULL UNIQUE,
  "label"                text NOT NULL,
  "description"          text,
  "is_required"          boolean NOT NULL DEFAULT true,
  "applies_to"           text NOT NULL DEFAULT 'all',
  "allowed_formats"      text NOT NULL DEFAULT 'pdf,jpg,png',
  "max_size_mb"          integer NOT NULL DEFAULT 5,
  "needs_verification"   boolean NOT NULL DEFAULT true,
  "has_expiry"           boolean NOT NULL DEFAULT false,
  "is_active"            boolean NOT NULL DEFAULT true,
  "sort_order"           integer NOT NULL DEFAULT 0,
  "created_at"           timestamptz DEFAULT now(),
  "updated_at"           timestamptz DEFAULT now()
);

-- Index untuk query aktif yang diurutkan
CREATE INDEX IF NOT EXISTS "idx_document_types_active_order"
  ON "document_types" ("is_active", "sort_order");

-- Seed data awal: tipe dokumen umrah standar
INSERT INTO "document_types" ("id", "code", "label", "description", "is_required", "applies_to", "allowed_formats", "max_size_mb", "needs_verification", "has_expiry", "is_active", "sort_order")
VALUES
  (gen_random_uuid()::text, 'paspor',         'Paspor',            'Halaman data diri + foto paspor (min. 6 bulan berlaku dari tanggal keberangkatan)', true,  'all',     'pdf,jpg,png', 5,  true,  true,  true, 1),
  (gen_random_uuid()::text, 'ktp',            'KTP',               'Kartu Tanda Penduduk (kedua sisi)',                                                  true,  'adult',   'pdf,jpg,png', 5,  true,  true,  true, 2),
  (gen_random_uuid()::text, 'foto',           'Foto 4×6',          'Foto terbaru latar putih, tampak depan',                                             true,  'all',     'jpg,png',     3,  false, false, true, 3),
  (gen_random_uuid()::text, 'kartu_keluarga', 'Kartu Keluarga',    'Kartu Keluarga (KK)',                                                                true,  'all',     'pdf,jpg,png', 5,  true,  false, true, 4),
  (gen_random_uuid()::text, 'buku_nikah',     'Buku Nikah',        'Akta nikah / buku nikah untuk pasangan',                                             false, 'married', 'pdf,jpg,png', 5,  true,  false, true, 5),
  (gen_random_uuid()::text, 'akta_lahir',     'Akta Lahir',        'Akta kelahiran untuk anak/bayi',                                                     false, 'child',   'pdf,jpg,png', 5,  true,  false, true, 6),
  (gen_random_uuid()::text, 'visa',           'Visa',              'Visa umroh / dokumen izin masuk',                                                    false, 'all',     'pdf,jpg,png', 5,  true,  true,  true, 7),
  (gen_random_uuid()::text, 'surat_mahram',   'Surat Mahram',      'Surat keterangan mahram untuk wanita tanpa suami',                                   false, 'female',  'pdf,jpg,png', 5,  true,  false, true, 8),
  (gen_random_uuid()::text, 'vaksin',         'Sertifikat Vaksin', 'Sertifikat vaksinasi meningitis / COVID',                                            false, 'all',     'pdf,jpg,png', 5,  true,  true,  true, 9),
  (gen_random_uuid()::text, 'lainnya',        'Dokumen Lainnya',   'Dokumen pendukung lainnya',                                                          false, 'all',     'pdf,jpg,png', 10, false, false, true, 10)
ON CONFLICT ("code") DO NOTHING;
