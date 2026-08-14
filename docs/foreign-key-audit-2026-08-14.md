# Laporan Audit Foreign Key Supabase

## Ringkasan

Audit statis terhadap schema Drizzle dan migration SQL telah dilakukan untuk memeriksa foreign key, tipe kolom parent-child, target tabel, serta dependency migration. Mismatch yang memicu error checklist telah teridentifikasi dan sudah diperbaiki: `departure_checklists.done_by` sekarang bertipe `UUID`, sesuai dengan `profiles.id`.

Audit ini dilakukan terhadap source repository. Verifikasi langsung terhadap database Supabase production belum dapat dijalankan dari sandbox karena tidak tersedia `DATABASE_URL`, Supabase CLI, atau kredensial service role.

## Temuan

| Status | Area | Temuan | Tindakan |
|---|---|---|---|
| Diperbaiki | `departure_checklists.done_by` → `profiles.id` | Child sebelumnya `TEXT`, parent `UUID`; PostgreSQL menolak constraint. | Migration `20260814000008_departure_checklists.sql` sudah diubah menjadi `done_by UUID`. |
| Konsisten | `departure_checklists.departure_id` → `package_departures.id` | Keduanya menggunakan `TEXT`. | Tidak ada perubahan. |
| Konsisten | Relasi booking/jemaah/dokumen | ID pada schema Drizzle dan relasi utama menggunakan `TEXT`. | Tidak ada mismatch yang ditemukan pada relasi tersebut. |
| Disengaja tanpa FK lokal | `agents.user_id` dan `user_roles.user_id` | Keduanya mereferensikan Supabase Auth secara konseptual; schema menjelaskan bahwa relasi tidak dibuat sebagai FK lokal. | Tidak diubah. |
| Perlu verifikasi production | Seluruh constraint yang berasal dari migration awal `0000_*` | Repository memiliki migration historis besar yang tidak bisa membuktikan keadaan aktual database tanpa introspeksi langsung. | Jalankan query verifikasi di bawah pada Supabase SQL Editor. |

## Migration Checklist yang benar

File yang harus dijalankan adalah:

```text
supabase/migrations/20260814000008_departure_checklists.sql
```

Versi terbaru menggunakan:

```sql
done_by UUID REFERENCES profiles(id) ON DELETE SET NULL
```

Jika eksekusi versi lama sempat membuat tabel parsial, jalankan recovery berikut sebelum migration terbaru:

```sql
DROP TABLE IF EXISTS departure_checklists CASCADE;
```

Kemudian jalankan seluruh isi migration terbaru.

## Query verifikasi langsung di Supabase

Jalankan query berikut di **Supabase SQL Editor** untuk memeriksa semua foreign key yang aktif beserta tipe parent-child-nya:

```sql
SELECT
  tc.table_schema,
  tc.table_name AS child_table,
  kcu.column_name AS child_column,
  ccu.table_schema AS parent_schema,
  ccu.table_name AS parent_table,
  ccu.column_name AS parent_column,
  child_cols.data_type AS child_type,
  parent_cols.data_type AS parent_type,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.table_schema = tc.table_schema
JOIN information_schema.columns AS child_cols
  ON child_cols.table_schema = tc.table_schema
 AND child_cols.table_name = tc.table_name
 AND child_cols.column_name = kcu.column_name
JOIN information_schema.columns AS parent_cols
  ON parent_cols.table_schema = ccu.table_schema
 AND parent_cols.table_name = ccu.table_name
 AND parent_cols.column_name = ccu.column_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND child_cols.udt_name <> parent_cols.udt_name
ORDER BY tc.table_schema, tc.table_name, kcu.column_name;
```

Query tersebut idealnya mengembalikan **0 baris**. Jika menghasilkan baris, berarti masih ada foreign key aktif dengan tipe child dan parent yang berbeda.

Untuk memeriksa checklist secara khusus:

```sql
SELECT
  child.column_name AS child_column,
  child.udt_name AS child_type,
  parent.table_name AS parent_table,
  parent.column_name AS parent_column,
  parent.udt_name AS parent_type
FROM information_schema.columns child
JOIN information_schema.columns parent
  ON (child.column_name = 'done_by' AND parent.table_name = 'profiles' AND parent.column_name = 'id')
WHERE child.table_name = 'departure_checklists'
  AND child.column_name = 'done_by';
```

Hasil yang benar adalah `uuid` pada kedua kolom.

## Kesimpulan

Secara static analysis, mismatch yang sudah terbukti adalah foreign key `departure_checklists.done_by`. Perbaikannya sudah dibuat pada migration dan dipush dalam commit `df66586`. Namun, karena belum ada koneksi introspeksi ke database production, status aktual seluruh constraint Supabase tetap harus dikonfirmasi dengan query SQL di atas.
