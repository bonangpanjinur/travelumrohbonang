# `sql/` — status & sumber kebenaran (P3 consolidation note)

Direktori `sql/` berisi **snapshot historis** dari beberapa kali generate/export
schema Supabase secara manual (kemungkinan oleh tool/generator berbeda-beda di
titik waktu berbeda). Empat file di `sql/schema/` **bukan duplikat** satu sama
lain — dicek dengan `md5sum`, semuanya berbeda konten, urutan tabel, dan gaya
quoting:

| File | Baris | Asal (dari header komentar) |
|---|---|---|
| `full_schema_for_supabase.sql` | 944 | Manual, "MIGRATION LENGKAP" |
| `supabase-deploy.sql` | 2006 | Generate dari Drizzle + gabungan seed data |
| `supabase-schema.sql` | 1101 | Generate dari Drizzle ORM schema |
| `supabase_schema.sql` | 1133 | Auto-generate dari `types.ts` Supabase |

Tidak ada akses ke Supabase live project dari environment ini (belum ada
`SUPABASE_SERVICE_ROLE_KEY`), sehingga **tidak bisa dipastikan** file mana —
kalau ada — yang paling mendekati state DB production saat ini. Karena itu
tidak ada file yang dihapus; masing-masing sudah diberi header
"⚠️ LEGACY / HISTORICAL SNAPSHOT" di bagian atas.

## Sumber kebenaran mulai sekarang

- **Struktur tabel / kolom** → `lib/db/src/schema/*.ts` (Drizzle ORM). Ini yang
  dipakai kode aplikasi (`@workspace/db`) dan harus selalu jadi acuan pertama.
- **Perubahan yang benar-benar diterapkan ke Supabase** (migrations,
  RLS policy, function) → `supabase/migrations/*.sql`. Direktori ini yang
  seharusnya jadi satu-satunya tempat migration baru ditambahkan ke depannya.
- `sql/migrations/*.sql` — ad-hoc script perbaikan satu-kali (tambah kolom,
  fix FK, dsb.) yang dijalankan manual di masa lalu. Ini bukan duplikat schema
  dump, jadi dibiarkan sebagai riwayat; tidak perlu ditandai ulang.
- `sql/seeds/*.sql` — data seed manual, terpisah dari schema.

## Rekomendasi ke depan (belum dieksekusi — butuh keputusan/akses live DB)

1. Isi `SUPABASE_SERVICE_ROLE_KEY` lalu jalankan `\d+ <table>` / introspeksi
   Supabase untuk dapat schema aktual yang ter-apply.
2. Bandingkan hasil introspeksi vs `lib/db/src/schema/*.ts` — kalau ada drift,
   perbaiki lewat migration baru di `supabase/migrations/`, jangan edit dump
   lama di `sql/schema/`.
3. Setelah dikonfirmasi tidak ada yang masih dipakai sebagai referensi aktif,
   pertimbangkan memindahkan keempat file `sql/schema/*.sql` ke folder
   `sql/schema/_archive/` (atau menghapusnya) — belum dilakukan di sini karena
   berisiko menghapus riwayat yang mungkin masih dirujuk manual oleh tim.

## `app_role` enum vs `has_role(uuid, text)` — sudah diverifikasi, bukan bug

Kekhawatiran di analisis awal (§4 plan.md) adalah `has_role` memakai parameter
`text` padahal mungkin ada enum `app_role` di tempat lain. Sudah dicek:

- **Tidak ada enum `app_role`** di manapun dalam codebase ini (`grep -rn
  "app_role"` kosong, tidak ada `CREATE TYPE ... AS ENUM` untuk role).
- Kolom role di semua tempat konsisten `TEXT`:
  - Drizzle: `lib/db/src/schema/agents.ts` → `role: text("role").notNull()`
    (tabel `user_roles` dan `role_menu_permissions`).
  - SQL: `sql/migrations/create_user_roles_table.sql` → `role TEXT NOT NULL
    DEFAULT 'buyer'`.
  - Function: `has_role(_user_id uuid, _role text)`.

Jadi tidak ada type mismatch — desainnya memang TEXT di semua layer, bukan
enum. Tidak ada perubahan kode yang diperlukan untuk item ini.
