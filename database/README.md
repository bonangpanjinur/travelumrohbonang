# Database

Folder ini berisi semua SQL yang berhubungan dengan database Supabase.  
File-file ini adalah **referensi dan dokumentasi** — eksekusi dilakukan melalui Supabase CLI atau dashboard Supabase.

> ⚠️ **Jangan jalankan file-file ini langsung ke production tanpa review.**  
> Gunakan `supabase db push` atau `supabase migration apply` melalui CLI.

---

## Struktur

```
database/
├── schema/         ← Snapshot schema lengkap (untuk setup fresh / referensi)
├── migrations/     ← Perubahan incremental, berurutan (YYYYMMDD_NNN_deskripsi.sql)
├── patches/        ← Hotfix yang dijalankan manual di luar jalur migration normal
└── seed/           ← Setup data awal dan infrastruktur (storage bucket, dll)
```

---

## schema/

Snapshot schema database lengkap. Berguna untuk:
- Setup environment baru (development, staging)
- Referensi saat membaca kode

| File | Isi |
|------|-----|
| `001_full_schema.sql` | Schema lengkap semua tabel, fungsi, RLS, trigger |
| `002_additions.sql` | Tambahan fungsi auth, RPC helpers |

---

## migrations/

Perubahan database yang berjalan secara incremental dan berurutan.  
**Format nama:** `YYYYMMDD_NNN_deskripsi_singkat.sql`

### Konvensi

- Setiap migration harus **idempoten** (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- Jangan **mengubah** migration yang sudah dijalankan — buat migration baru
- Satu migration = **satu perubahan logis** yang kohesif
- Sertakan **komentar rollback** jika memungkinkan

### Daftar Migration

| File | Isi |
|------|-----|
| `20260209_001_create_profiles.sql` | Tabel `profiles` (extended user data) |
| `20260209_002_booking_code_function.sql` | Fungsi generate kode booking |
| `20260209_003_storage_payment_proofs_bucket.sql` | Bucket storage `payment-proofs` |
| `20260209_004_storage_cms_images_bucket.sql` | Bucket storage `cms-images` |
| `20260209_005_create_gallery.sql` | Tabel `gallery` |
| `20260209_006_create_testimonials.sql` | Tabel `testimonials` |
| `20260209_007_create_faqs.sql` | Tabel `faqs` |
| `20260209_008_package_categories_parent.sql` | Hierarki kategori paket (`parent_id`) |
| `20260209_009_storage_avatars_bucket.sql` | Bucket storage `avatars` |
| `20260209_010_bookings_user_fk.sql` | FK `bookings.user_id → profiles.id` |
| `20260209_011_packages_minimum_dp.sql` | Kolom `minimum_dp` di `packages` |
| `20260209_012_packages_payment_deadline.sql` | Kolom deadline DP & pelunasan |
| `20260209_013_notifications_rls_fix.sql` | Perbaikan RLS policy notifikasi |
| `20260209_014_create_package_commissions.sql` | Tabel `package_commissions` |
| `20260209_015_departure_quota_trigger.sql` | Trigger update kuota keberangkatan |
| `20260211_001_create_package_hotels.sql` | Tabel `package_hotels` (hotel per paket) |
| `20260211_002_auth_user_trigger.sql` | Trigger `on_auth_user_created` |
| `20260211_003_fix_auth_roles.sql` | Perbaikan constraint `user_roles` |
| `20260211_004_fix_new_user_default_role.sql` | Default role `buyer` untuk user baru |
| `20260306_001_create_financial_transactions.sql` | Tabel `financial_transactions` |
| `20260308_001_create_leads.sql` | Tabel `leads` (CRM) |
| `20260309_001_create_pilgrim_documents.sql` | Tabel `pilgrim_documents` |
| `20260309_002_create_payment_gateway_transactions.sql` | Tabel transaksi gateway (Midtrans/Xendit) |
| `20260309_003_enable_pg_cron.sql` | Aktifkan ekstensi `pg_cron` |
| `20260309_004_bookings_branch_id.sql` | Kolom `branch_id` di `bookings` |
| `20260309_005_create_tenant_sites.sql` | Tabel `tenant_sites` (multi-tenant) |
| `20260411_001_create_template_pricing_upgrade_orders.sql` | Tabel `template_pricing` & `template_upgrade_orders` (multi-tenant upgrade) |
| `20260412_001_notify_admins_on_upgrade_order.sql` | Fungsi & trigger notifikasi admin saat ada pengajuan upgrade template |
| `20260414_001_realtime_template_upgrade_orders.sql` | Realtime untuk `template_upgrade_orders` |
| `20260414_002_rls_template_upgrade_orders.sql` | RLS policy upgrade orders |
| `20260415_001_bookings_payment_scheme_installments.sql` | Skema cicilan + tabel `installment_schedules` |
| `20260502_001_profiles_branch_id.sql` | Kolom `branch_id` di `profiles` (isolasi cabang) |
| `20260503_001_rls_agents_booking_view.sql` | RLS: agen hanya lihat booking referral sendiri |
| `20260503_002_rls_agents_profile_update.sql` | RLS: agen hanya update profil sendiri |
| `20260504_001_phone_normalization_function.sql` | Fungsi normalisasi nomor telepon |
| `20260504_002_lockdown_security_definer.sql` | Revoke EXECUTE dari fungsi SECURITY DEFINER |
| `20260504_003_rls_payment_proofs_storage.sql` | RLS storage: upload bukti bayar per user |
| `20260505_001_create_payment_proof_access_logs.sql` | Tabel `payment_proof_access_logs` |
| `20260506_001_user_roles_branch_manager.sql` | Role `branch_manager` di constraint |
| `20260507_001_create_agent_commissions_withdrawals.sql` | Tabel komisi & withdrawal agen |
| `20260529_001_rls_restrict_agents_public.sql` | Batasi akses publik ke data agen |
| `20260529_002_create_currencies.sql` | Tabel `currencies` (multi-currency) |
| `20260529_003_grant_security_functions.sql` | Grant EXECUTE fungsi keamanan |
| `20260529_004_site_settings_maintenance_mode.sql` | Mode maintenance di `site_settings` |
| `20260529_005_site_settings_indexes.sql` | Index performa `site_settings` |
| `20260529_006_create_api_logs.sql` | Tabel `api_logs` |
| `20260529_007_tenant_sites_social_media.sql` | Kolom social media di `tenant_sites` |
| `20260529_008_branches_slug_email.sql` | Kolom `slug` dan `email` di `branches` |
| `20260529_009_tenant_sites_seo_fields.sql` | Kolom SEO di `tenant_sites` |
| `20260529_010_operational_b2b_tables.sql` | Tabel operasional & B2B batch |
| `20260529_011_profiles_2fa_columns.sql` | Kolom 2FA TOTP di `profiles` |
| `20260529_012_super_admin_helper_function.sql` | Fungsi helper super admin check |
| `20260529_013_security_definer_execute_grants.sql` | Grant EXECUTE fungsi security definer |
| `20260529_014_create_seo_overrides.sql` | Tabel `seo_overrides` per halaman |
| `20260529_015_audit_integration_secrets.sql` | Audit trail integration secrets & auth |
| `20260529_016_revoke_audit_function_public.sql` | Revoke EXECUTE audit function dari public |
| `20260601_001_create_package_hpp.sql` | Tabel HPP / biaya pokok paket |
| `20260601_002_package_hpp_summary_security.sql` | Security invoker untuk view HPP |
| `20260605_001_package_costs_departure_id.sql` | Kolom `departure_id` di `package_costs` |

---

## patches/

File SQL yang dijalankan **manual** (bukan melalui Supabase migration CLI).  
Biasanya merupakan hotfix data atau perbaikan schema di luar jalur normal.

| File | Isi |
|------|-----|
| `fix_auth_schema.sql` | Bersihkan profiles orphan, sinkronisasi auth |
| `fix_admin_access.sql` | Tambah kolom `role` ke `profiles` jika belum ada |
| `fix_rls.sql` | Perbaiki kolom `dp_deadline_days` dan RLS policy |
| `fix_infinite_recursion.sql` | Perbaiki fungsi `is_admin()` tanpa recursive policy |
| `fix_package_commissions_constraint.sql` | Perbaiki constraint unique di `package_commissions` |

> **Cara pakai patch:**  
> Jalankan manual via Supabase SQL Editor atau `psql`.  
> Catat tanggal eksekusi dan siapa yang menjalankan.

---

## seed/

Data awal dan setup infrastruktur yang perlu ada sebelum app berjalan.

| File | Isi |
|------|-----|
| `setup_storage_buckets.sql` | Buat semua storage buckets (cms-images, avatars, gallery, dll) |

---

## Cara Menambah Migration Baru

```bash
# 1. Buat file baru dengan format nama yang benar
# Format: YYYYMMDD_NNN_deskripsi_singkat.sql

# 2. Tulis SQL yang idempoten
# Contoh:
CREATE TABLE IF NOT EXISTS public.nama_tabel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.nama_tabel ENABLE ROW LEVEL SECURITY;

# 3. Apply via Supabase CLI
supabase db push

# 4. Update types.ts
supabase gen types typescript --linked > \
  artifacts/umroh-app/src/shared/integrations/supabase/types.ts

# 5. Commit
git add database/migrations/YYYYMMDD_NNN_*.sql
git commit -m "db: add YYYYMMDD_NNN_deskripsi"
```

---

## Catatan Penting

- File di `database/` adalah **salinan** dari `.migration-backup/supabase/migrations/`
- File **asli di Supabase** tetap di `.migration-backup/` dan tidak diubah
- Untuk Supabase CLI, masih pointing ke `supabase/migrations/` yang ada di project Supabase
- Folder `database/` ini adalah **referensi yang mudah dibaca** dengan nama deskriptif
