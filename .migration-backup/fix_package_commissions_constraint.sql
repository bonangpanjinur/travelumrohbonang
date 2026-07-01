-- SQL untuk memperbaiki unique constraint pada tabel package_commissions
-- Jalankan ini di SQL Editor Supabase Anda jika Anda masih ingin menggunakan fitur .upsert()

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'package_commissions_package_id_pic_type_key'
    ) THEN
        ALTER TABLE public.package_commissions 
        ADD CONSTRAINT package_commissions_package_id_pic_type_key UNIQUE (package_id, pic_type);
    END IF;
END $$;
