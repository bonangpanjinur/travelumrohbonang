# Database
**Umroh Gateway** | Diperbarui: 2026-07-01

Platform menggunakan **Supabase PostgreSQL** dengan Row Level Security (RLS) aktif di semua tabel yang menyimpan data user.

---

## Koneksi

```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storage: localStorage, persistSession: true, autoRefreshToken: true } }
);
```

**Environment variables yang dibutuhkan:**
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Fungsi Helper RLS

Fungsi-fungsi ini dipakai di dalam RLS policy (`SECURITY DEFINER`):

| Fungsi | Signature | Kegunaan |
|--------|-----------|---------|
| `is_admin` | `is_admin(uuid) → boolean` | Cek apakah user adalah admin/super_admin |
| `has_role` | `has_role(uuid, text) → boolean` | Cek role spesifik user |
| `get_user_branch_id` | `get_user_branch_id(uuid) → uuid` | Ambil branch_id user (untuk isolasi cabang) |

> ⚠️ Fungsi `SECURITY DEFINER` hanya boleh di-EXECUTE oleh `authenticated` — sudah di-REVOKE dari `public` dan `anon`.

---

## Skema Tabel

### Auth & Users

#### `profiles`
Extended data user (diluar data bawaan Supabase Auth).

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | = `auth.users.id` |
| `full_name` | text | Nama lengkap |
| `phone` | text | Nomor HP (dinormalisasi) |
| `avatar_url` | text | URL foto profil |
| `nik` | text | Nomor Induk Kependudukan |
| `nip` | text | Nomor Induk Pegawai (staff) |
| `branch_id` | uuid FK→branches | Cabang user (staff) |
| `totp_secret` | text | Secret 2FA TOTP |
| `totp_enabled` | boolean | Status 2FA |
| `totp_force_enroll` | boolean | Wajib 2FA (untuk admin) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `user_roles`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `user_id` | uuid FK→auth.users | |
| `role` | text | buyer / agent / branch_manager / admin / super_admin |
| `created_at` | timestamptz | |

**Constraint:** `user_roles_role_check` — nilai hanya dari daftar role yang valid.

---

### Paket & Departures

#### `packages`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `name` | text | Nama paket |
| `slug` | text UNIQUE | URL-friendly identifier |
| `description` | text | |
| `price` | numeric | Harga dasar |
| `minimum_dp` | numeric | Minimal uang muka |
| `dp_deadline_days` | integer | Deadline DP sejak booking (hari) |
| `full_deadline_days` | integer | Deadline pelunasan sebelum berangkat (hari) |
| `duration_days` | integer | Lama perjalanan |
| `category_id` | uuid FK→package_categories | |
| `is_active` | boolean | Tampil di publik |
| `payment_scheme` | text | full / dp / installment |
| `created_at` / `updated_at` | timestamptz | |

#### `package_categories`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `name` | text | |
| `slug` | text UNIQUE | |
| `parent_id` | uuid FK→self | Hierarki kategori |

#### `package_departures`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `package_id` | uuid FK→packages | |
| `departure_date` | date | |
| `return_date` | date | |
| `quota` | integer | Total kuota |
| `quota_used` | integer | Terisi (diupdate via trigger) |
| `airline_id` | uuid FK→airlines | |
| `status` | text | open / closed / full / cancelled |

#### `package_hotels`
Hotel per paket (bisa 2: Makkah + Madinah).
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `package_id` | uuid FK→packages | |
| `hotel_id` | uuid FK→hotels | |
| `city` | text | makkah / madinah |
| `nights` | integer | Jumlah malam |

#### `package_commissions`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `package_id` | uuid FK→packages | |
| `agent_type` | text | Tipe agen |
| `commission_amount` | numeric | Komisi per jamaah |
| `commission_type` | text | fixed / percentage |

#### `package_costs`
HPP (Harga Pokok Penjualan) per paket.
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `package_id` | uuid FK→packages | |
| `departure_id` | uuid FK→package_departures | (opsional) |
| `cost_item` | text | Nama item biaya |
| `amount` | numeric | Jumlah biaya |
| `is_active` | boolean | |

---

### Booking & Payments

#### `bookings`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `booking_code` | text UNIQUE | Kode booking (generated) |
| `user_id` | uuid FK→profiles | |
| `package_id` | uuid FK→packages | |
| `departure_id` | uuid FK→package_departures | |
| `branch_id` | uuid FK→branches | |
| `agent_id` | uuid FK→agents | (afiliasi) |
| `status` | text | pending_payment / dp_paid / installment / paid / cancelled |
| `payment_scheme` | text | full / dp / installment |
| `total_price` | numeric | |
| `total_paid` | numeric | Sudah dibayar |
| `room_type` | text | quad / triple / double |
| `pilgrim_count` | integer | |
| `created_at` / `updated_at` | timestamptz | |

#### `booking_pilgrims`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `booking_id` | uuid FK→bookings | |
| `name` | text | |
| `gender` | text | male / female |
| `nik` | text | 16 digit |
| `passport_number` | text | |
| `birth_date` | date | |
| `phone` | text | |
| `email` | text | |

#### `payments`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `booking_id` | uuid FK→bookings | |
| `amount` | numeric | |
| `payment_type` | text | dp / installment / full |
| `proof_url` | text | Path file di Storage |
| `status` | text | pending / verified / rejected |
| `verified_by` | uuid FK→profiles | Admin yang verifikasi |
| `verified_at` | timestamptz | |
| `gateway_transaction_id` | text | (jika via gateway) |

#### `payment_proof_access_logs`
Audit trail akses ke file bukti pembayaran.
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `payment_id` | uuid FK→payments | |
| `accessed_by` | uuid FK→profiles | |
| `accessed_at` | timestamptz | |
| `ip_address` | text | |

#### `payment_gateway_transactions`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `booking_id` | uuid FK→bookings | |
| `gateway` | text | midtrans / xendit |
| `transaction_id` | text | ID dari gateway |
| `status` | text | pending / success / failed |
| `amount` | numeric | |
| `payload` | jsonb | Raw response gateway |

#### `installment_schedules`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `booking_id` | uuid FK→bookings | |
| `due_date` | date | Tanggal jatuh tempo |
| `amount` | numeric | Jumlah cicilan |
| `status` | text | pending / paid / overdue |

---

### Jamaah & Dokumen

#### `pilgrim_documents`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `booking_pilgrim_id` | uuid FK→booking_pilgrims | |
| `document_type` | text | passport / visa / photo / other |
| `file_url` | text | Path di Storage (private) |
| `status` | text | pending / approved / rejected |
| `uploaded_at` | timestamptz | |

#### `check_ins`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `booking_pilgrim_id` | uuid FK→booking_pilgrims | |
| `departure_id` | uuid FK→package_departures | |
| `checked_in_at` | timestamptz | |
| `checked_in_by` | uuid FK→profiles | |

#### `manasik_materials`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `title` | text | |
| `content` | text | (rich text HTML) |
| `category` | text | |
| `sort_order` | integer | |
| `is_published` | boolean | |

---

### Agen & Keuangan

#### `agents`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | |
| `agent_code` | text UNIQUE | Kode afiliasi |
| `phone` | text | (dinormalisasi) |
| `is_active` | boolean | |
| `branch_id` | uuid FK→branches | |
| `target_monthly_omzet` | numeric | Target omzet bulanan |

#### `agent_commissions`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `agent_id` | uuid FK→agents | |
| `booking_id` | uuid FK→bookings | |
| `amount` | numeric | |
| `status` | text | pending / approved / paid |

#### `agent_withdrawals`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `agent_id` | uuid FK→agents | |
| `amount` | numeric | |
| `status` | text | pending / approved / rejected / paid |
| `bank_account` | text | |
| `bank_name` | text | |
| `notes` | text | |

#### `financial_transactions`
Jurnal keuangan umum.
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `type` | text | income / expense |
| `category` | text | |
| `amount` | numeric | |
| `reference_id` | uuid | ID dari tabel lain |
| `description` | text | |
| `date` | date | |

---

### CRM & Lead

#### `leads`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `name` | text | |
| `phone` | text | |
| `email` | text | |
| `interest_package_id` | uuid FK→packages | |
| `status` | text | new / contacted / hot / converted / lost |
| `assigned_to` | uuid FK→profiles | |
| `source` | text | website / referral / ads |
| `notes` | text | |

---

### CMS

#### `site_settings`
Pengaturan per tenant.
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `site_name` | text | |
| `logo_url` | text | |
| `primary_color` | text | |
| `is_active` | boolean | |
| `maintenance_mode` | boolean | |

#### `cms_pages` / `blog_posts` / `gallery` / `testimonials` / `faqs`
Tabel konten standar. Masing-masing punya `is_published`, `created_at`, `updated_at`.

---

### Sistem

#### `notifications`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | |
| `title` | text | |
| `message` | text | |
| `type` | text | |
| `is_read` | boolean | |
| `created_at` | timestamptz | |

#### `api_logs`
Log semua API call ke Edge Functions.

#### `audit_logs`
Trail perubahan data sensitif (integration secrets, auth settings).

#### `seo_overrides`
Override meta tag SEO per halaman/route.

#### `tenant_sites`
Konfigurasi multi-tenant: domain, branding, SEO, social media, GSC verification.

---

## Storage Buckets

| Bucket | Akses | Path Convention |
|--------|-------|----------------|
| `cms-images` | Public | `<category>/<filename>` |
| `avatars` | Public | `<user_id>/<filename>` |
| `gallery` | Public | `<departure_id>/<filename>` |
| `payment-proofs` | **Private** | `<booking_id>/<payment_id>/<filename>` |
| `documents` | **Private** | `<booking_pilgrim_id>/<type>/<filename>` |

**Signed URL:** Bucket private harus diakses via Signed URL (30 menit TTL) yang di-generate di Edge Function, bukan langsung dari frontend.

---

## RLS Policy Patterns

### Pattern 1: User hanya lihat data sendiri
```sql
CREATE POLICY "Users view own data"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);
```

### Pattern 2: Admin lihat semua
```sql
CREATE POLICY "Admins view all"
  ON public.bookings FOR ALL
  USING (is_admin(auth.uid()));
```

### Pattern 3: Isolasi cabang
```sql
CREATE POLICY "Branch manager view branch data"
  ON public.bookings FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    branch_id = get_user_branch_id(auth.uid())
  );
```
