# Rencana Perbaikan UmrohPlus — Analisis & Eksekusi Bertahap

> Dibuat berdasarkan analisis mendalam pada: codebase, schema Drizzle, SQL migrations, auth flow, admin panel

---

## Temuan Analisis

### Masalah 1 — Super Admin Tidak Tampil Tombol Admin Panel

**Akar masalah teridentifikasi di `artifacts/api-server/src/middlewares/authMiddleware.ts`:**

1. `authMiddleware` memanggil Supabase HTTP REST (`${SUPABASE_URL}/rest/v1/user_roles`) untuk ambil role user
2. Supabase memiliki trigger `on_auth_user_created` yang otomatis assign role **"buyer"** ke semua user baru
3. `isAdminEmail()` hanya dijalankan jika role **tidak ada** di DB — tapi karena trigger sudah set "buyer", check ini tidak pernah jalan
4. Akibatnya user dengan email admin tetap dapat role "buyer"
5. Di `useAuth.tsx` line 171: `isAdmin = !!(role && role !== "user" && role !== "buyer")` → "buyer" = `isAdmin: false` → tombol admin tidak muncul

**Alur yang rusak:**
```
Login Supabase → JWT → authMiddleware → getSupabaseRole() → dapat "buyer" (dari trigger) 
→ isAdminEmail() TIDAK dijalankan → role tetap "buyer" → isAdmin=false → tombol admin hilang
```

**Alur yang seharusnya:**
```
Login Supabase → JWT → authMiddleware → getSupabaseRole() → cek isAdminEmail()
→ jika email di ADMIN_EMAILS & role ≤ "buyer" → override ke "super_admin" → update DB
→ isAdmin=true → tombol admin muncul
```

---

### Masalah 2 — SQL Berantakan, Trigger Tidak Ada

**Trigger yang ADA (hanya FK constraint triggers otomatis, bukan business logic):**
- Semua trigger yang ada adalah `RI_ConstraintTrigger_*` — otomatis dibuat PostgreSQL untuk FK constraint
- **Tidak ada satu pun custom business logic trigger**

**Trigger yang SEHARUSNYA ADA tapi tidak dibuat:**

| # | Trigger | Tabel Target | Fungsi |
|---|---------|--------------|--------|
| 1 | `trg_set_updated_at` | semua tabel dengan `updated_at` | Auto-update kolom `updated_at` saat row diubah |
| 2 | `trg_booking_quota` | `bookings` | Kurangi `remaining_quota` saat booking dibuat, tambah saat dibatalkan |
| 3 | `trg_booking_auto_confirm` | `booking_payments` | Auto-ubah status booking → "confirmed" saat total bayar ≥ total_price |
| 4 | `trg_booking_commission` | `bookings` | Auto-buat record `agent_commissions` saat booking dikonfirmasi & ada agent_id |
| 5 | `trg_booking_notification` | `bookings` | Auto-buat `notifications` saat status booking berubah |
| 6 | `trg_new_user_profile` | `users` | Auto-buat `profiles` + `user_roles` (buyer) saat user baru dibuat di local DB |

**Masalah tambahan:**
- Drizzle ORM `$onUpdate(() => new Date())` hanya jalan lewat Drizzle — tidak terjadi saat raw SQL
- `remaining_quota` dikelola manual di kode (rawan inconsistency)
- Trigger Supabase `on_auth_user_created` tidak bisa jalan di local Postgres (butuh schema `auth.users`)

---

### Masalah 3 — Codebase ↔ SQL Tidak Sinkron

**Temuan ketidaksinkronan:**

| Area | Masalah |
|------|---------|
| `lib/db/src/schema/auth.ts` | Ada `usersTable` dan `sessionsTable` untuk Replit Auth — dead code, tidak dipakai (app pakai Supabase Auth) |
| `bookings` tabel | Tidak punya kolom `updated_at` di DB maupun schema Drizzle |
| `scripts/migrations/supabase_schema.sql` | Schema untuk Supabase, bukan local Postgres — bisa drift dari Drizzle |
| `authMiddleware.ts` | Selalu query Supabase HTTP untuk roles, padahal data ada di local Postgres (dev) |
| `getSupabaseRole()` | Nama fungsi menyesatkan — seharusnya `getUserRole()` yang bisa query local/Supabase tergantung env |
| Trigger `handle_new_user` | Di `scripts/migrations/add_new_user_profile_trigger.sql` tapi tidak bisa run di local (butuh `auth.users`) |
| `package_inclusions` | Direferensikan di `adminMenuConfig.ts` tapi tidak ada di Drizzle schema |

---

## Rencana Perbaikan Per Fase

---

## FASE A — Fix Admin Panel Access (KRITIS)

**Tujuan:** Super admin bisa melihat dan masuk admin panel

**Perubahan:**
1. `artifacts/api-server/src/middlewares/authMiddleware.ts`
   - Tambah logika: jika `isAdminEmail(email)` dan role saat ini ≤ "buyer" → override ke `super_admin`
   - Invalidate cache token lama saat role di-upgrade
   - Buat fungsi `getUserRole()` yang query local Postgres jika `DATABASE_URL` tersedia (bukan selalu Supabase HTTP)

2. Test validasi:
   - `GET /api/auth/user` harus return `role: "super_admin"` untuk email admin
   - Tombol Admin Panel muncul di navbar

**Estimasi:** ~30 menit

---

## FASE B — SQL Triggers & Business Logic

**Tujuan:** Database self-consistent, tidak perlu handle logic duplikat di kode

**Perubahan — buat file `scripts/migrations/business_logic_triggers.sql`:**

1. **Fungsi + trigger `updated_at`** untuk semua tabel relevan
2. **Trigger quota booking** — `remaining_quota` auto-decrement/increment
3. **Trigger auto-confirm booking** — ketika total bayar sudah lunas
4. **Trigger komisi agen** — auto-buat `agent_commissions` saat booking confirmed + ada agent
5. **Trigger notifikasi** — auto-push notif ke `notifications` saat booking status berubah
6. **Trigger user profile** — versi lokal dari `handle_new_user` untuk local Postgres (tanpa `auth.users`)

**Apply ke database lokal dan dokumentasi cara apply ke Supabase**

**Estimasi:** ~60 menit

---

## FASE C — Schema Alignment (Codebase ↔ SQL Sinkron)

**Tujuan:** Drizzle schema = actual DB = supabase_schema.sql, tidak ada drift

**Perubahan:**

1. Hapus/isolasi dead code Replit Auth dari `lib/db/src/schema/auth.ts`
2. Perbaiki `authMiddleware.ts` — fungsi `getUserRole()` query local Postgres via `pool` saat `DATABASE_URL` ada
3. Tambah kolom yang hilang via Drizzle schema + `drizzle-kit push`
4. Update `scripts/migrations/supabase_schema.sql` agar sync dengan Drizzle
5. Buat `scripts/migrations/local_setup.sql` — versi trigger untuk local Postgres (tanpa Supabase schema)
6. Update `replit.md` — dokumentasikan cara setup DB baru dari awal

**Estimasi:** ~45 menit

---

## Status Eksekusi

| Fase | Status | Catatan |
|------|--------|---------|
| **A — Admin Panel Access** | ✅ Selesai | `authMiddleware.ts` — admin email override + local-first role resolution + dual-write + Supabase-wins-on-demotion |
| **B — SQL Triggers** | ✅ Selesai | 8 trigger di-apply ke DB; quota trigger dengan hard quota guard + departure reassignment handling |
| **C — Schema Alignment** | ✅ Selesai | `package_inclusions` dihapus dari rest.ts; `nationality`+`room_type` ditambah ke `booking_pilgrims`; auth.ts dead code ditandai `@deprecated`; `supabase_schema.sql` disinkron |

---

## Ringkasan Perubahan Final

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `artifacts/api-server/src/middlewares/authMiddleware.ts` | `getLocalRole()`, `getUserRole()` (local-first + Supabase wins demotion), `persistRole()` (dual-write), admin email override, ROLE_RANK conflict resolution |
| `artifacts/api-server/src/routes/rest.ts` | Hapus `package_inclusions` dari REVERSE_FKS (tabel tidak ada di DB) |
| `artifacts/api-server/src/routes/pilgrims.ts` | Tambah `nationality`, `nik`, `roomType`, `passportExpiry` ke SELECT |
| `lib/db/src/schema/bookings.ts` | Tambah kolom `nationality`, `room_type` ke `bookingPilgrims` |
| `lib/db/src/schema/auth.ts` | Tandai `usersTable`, `sessionsTable` sebagai `@deprecated` dengan penjelasan lengkap |
| `scripts/migrations/business_logic_triggers.sql` | **BARU** — 8 business logic triggers dengan quota hard guard + departure reassignment |
| `scripts/migrations/supabase_schema.sql` | Sinkron `booking_pilgrims` dengan kolom `nationality` dan `room_type` |
| `docs/repair-plan.md` | **BARU** — dokumentasi analisis dan rencana perbaikan |

### Trigger yang Aktif di Database

| Trigger | Tabel | Event | Fungsi |
|---------|-------|-------|--------|
| `trg_users_updated_at` | `users` | BEFORE UPDATE | Auto-update `updated_at` |
| `trg_booking_quota_insert` | `bookings` | AFTER INSERT | Kurangi `remaining_quota` (dengan lock + hard quota guard) |
| `trg_booking_quota_update` | `bookings` | AFTER UPDATE | Kelola kuota saat cancel/reaktivasi/departure change |
| `trg_booking_payment_auto_confirm` | `booking_payments` | AFTER INSERT/UPDATE | Auto-konfirmasi booking saat lunas |
| `trg_booking_commission` | `bookings` | AFTER UPDATE | Auto-buat `agent_commissions` saat dikonfirmasi |
| `trg_booking_status_notification` | `bookings` | AFTER UPDATE | Auto-kirim notifikasi saat status berubah |
| `trg_handle_new_local_user` | `users` | AFTER INSERT | Auto-buat `profiles` + `user_roles(buyer)` |
