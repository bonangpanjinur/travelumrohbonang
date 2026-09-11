# Audit dan Perbaikan Data Agen

**Tanggal:** 10 September 2026  
**Penulis:** Manus AI

## Kesimpulan

Struktur agen sebelumnya belum dapat merepresentasikan daftar mitra pada gambar secara lengkap. Data yang sudah tersedia mencakup nama, telepon, email, kode referral, cabang, komisi, target bulanan, dan status aktif. Data **gender, alamat, tanggal lahir, kode cabang, kode agen yang terpisah dari referral, slug halaman publik, kontrol publikasi, dan barcode/QR per agen** belum tersedia sebagai satu alur yang utuh.

Perbaikan telah diterapkan pada schema database, API admin, API publik, halaman admin, pengelolaan cabang, route halaman publik, dan tipe Supabase. Referral code lama tetap dipertahankan agar atribusi booking yang sudah ada tidak putus.

## Pemetaan Field

| Kebutuhan pada daftar mitra | Implementasi | Catatan |
|---|---|---|
| Kode cabang | `branches.code` | Dikelola dari halaman admin Cabang dan ditampilkan pada agen. |
| Kode agen | `agents.agent_code` | Kode internal yang berdiri sendiri. Jika kosong saat membuat agen, backend membuat kode `AG-XXXXXXXX`. |
| Gender | `agents.gender` | Nilai yang diterima adalah `L` atau `P`. |
| Nama | `agents.name` | Tetap wajib diisi. |
| Alamat | `agents.address` | Disimpan sebagai alamat agen. |
| Tanggal lahir | `agents.date_of_birth` | Disimpan bertipe `date`, bukan teks bebas. |
| Nomor telepon | `agents.phone` | Ditampilkan pada tabel admin dan halaman publik. |
| Status | `agents.is_active` dan label publik `Agen Resmi` | Status nonaktif membuat halaman publik tidak dapat diakses. |
| Kode referral lama | `agents.referral_code` | Dipertahankan untuk atribusi booking dan redirect `/r/:code`. |
| Halaman publik | `agents.public_slug`, `agents.public_page_enabled` | Route publik menggunakan `/agen/:slug`. |
| Barcode atau QR | QR dibuat dari URL halaman publik | QR tidak menyimpan gambar permanen di database sehingga selalu mengarah ke URL terbaru. |

## Perubahan yang Diterapkan

### Database

Migrasi `20260910000001_agent_profiles_public_pages.sql` menambahkan kolom baru pada `agents` dan `branches`, melakukan backfill kode agen dari referral code lama, membuat slug publik stabil untuk data lama, serta menambahkan indeks unik untuk kode cabang, kode agen, dan slug publik.

Backfill slug menggunakan nama agen dan delapan karakter awal UUID. Dengan pola ini, dua agen dengan nama sama tetap memperoleh URL yang berbeda. Kode referral lama digunakan sebagai nilai awal kode agen bila tersedia.

### Backend

Endpoint CRUD admin agen sekarang menormalisasi dan memvalidasi nama, gender, tanggal lahir, kode agen, referral code, komisi, slug, status, dan kontrol publikasi. PATCH tetap mendukung perubahan parsial, termasuk toggle status, tanpa mereset field lain.

Endpoint publik baru tersedia pada `GET /api/agents/:slug`. Endpoint ini hanya mengembalikan data yang aman untuk pengunjung anonim, yaitu nama, status, kode agen, alamat, nomor telepon, deskripsi publik, referral code untuk atribusi CTA, dan ringkasan cabang. Email, tanggal lahir, gender, komisi, target, user ID, dan field operasional tidak dikembalikan.

### Admin

Halaman **Agen & Mitra** sekarang memiliki tiga kelompok data. Kelompok pertama memuat nama, gender, tanggal lahir, telepon, dan alamat. Kelompok kedua memuat kode cabang, kode agen, komisi, target bulanan, dan referral code legacy. Kelompok ketiga memuat slug publik, deskripsi publik, email portal, dan kontrol publikasi.

Tabel admin menampilkan kode, identitas dan kontak, gender serta tanggal lahir, alamat, cabang, status publikasi, dan status aktif. Admin dapat membuka dialog QR, menyalin link, mengunduh QR PNG, atau membuka halaman publik.

Halaman **Cabang** juga memperoleh field kode cabang agar pasangan kode pada format `CABANG / AGEN` dapat dikelola secara konsisten.

### Halaman Publik dan QR

Halaman publik tersedia pada pola URL berikut:

```text
https://domain-website/agen/<public-slug>
```

Contoh untuk agen Bonang Panji Nur:

```text
https://domain-website/agen/bonang-panji-nur
```

QR yang dibuat dari halaman admin berisi URL tersebut. Saat dipindai, pengunjung langsung membuka halaman publik agen. Tombol **Lihat Paket Umroh** pada halaman itu meneruskan referral code melalui route `/r/:code`, sehingga calon jamaah tetap tercatat berasal dari agen tersebut.

## Alur Penggunaan

Admin membuat atau mengedit agen melalui **Admin → Agen & Mitra**. Admin dapat mengisi nama, kode agen, kode cabang, gender, alamat, tanggal lahir, nomor telepon, dan status. Admin kemudian mengisi slug, misalnya `bonang-panji-nur`, mengaktifkan publikasi, dan menyimpan data.

Setelah data tersimpan, ikon QR pada baris agen membuka QR yang siap disalin link-nya, diunduh sebagai PNG, atau dibuka halaman publiknya. Jika agen dinonaktifkan atau publikasi dimatikan, endpoint publik mengembalikan status tidak ditemukan dan QR tidak ditampilkan sebagai QR aktif pada tabel admin.

## Catatan Privasi dan Operasional

Tanggal lahir, gender, email portal, komisi, target, dan user ID tetap diperlakukan sebagai data internal. Halaman publik hanya menampilkan data yang relevan untuk calon jamaah. Penghapusan agen tetap tersedia pada admin, tetapi untuk menjaga riwayat komisi dan booking, rekomendasi operasionalnya adalah menonaktifkan agen daripada menghapusnya.

Migrasi perlu dijalankan pada database environment tujuan sebelum form baru digunakan. Source code dan tipe sudah disiapkan, tetapi eksekusi migrasi production tidak dilakukan dari sandbox ini karena tidak ada permintaan eksplisit untuk mengubah database eksternal dan kredensial koneksi production tidak digunakan.

## File Utama

| Area | File |
|---|---|
| Migrasi | `supabase/migrations/20260910000001_agent_profiles_public_pages.sql` |
| Schema agen | `lib/db/src/schema/agents.ts` |
| Schema cabang | `lib/db/src/schema/masterdata.ts` |
| CRUD admin agen | `artifacts/api-server/src/routes/admin/agents.ts` |
| API publik agen | `artifacts/api-server/src/routes/public-agents.ts` |
| Registrasi route API | `artifacts/api-server/src/routes/index.ts` |
| Halaman admin agen | `artifacts/umroh-app/src/features/admin/pages/Agents.tsx` |
| Halaman publik agen | `artifacts/umroh-app/src/features/agent/pages/PublicAgentProfile.tsx` |
| Route frontend | `artifacts/umroh-app/src/App.tsx` |

## Validasi

Dependency workspace berhasil dipasang, lalu validasi dijalankan. Typecheck frontend, build frontend, typecheck backend, build backend, dan test suite yang tersedia berhasil lulus. Typecheck backend sempat menemukan mismatch tipe `numeric` pada `commission_percent`; payload backend kemudian diperbaiki untuk mengirim nilai komisi sebagai string desimal sesuai kontrak Drizzle, lalu typecheck dan build backend diulang hingga lulus.

```bash
pnpm --filter @workspace/umroh-app run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/umroh-app run build
pnpm --filter @workspace/api-server run build
```

Frontend test suite juga lulus dengan 27 test pada 4 file. Backend test suite lulus dengan 56 test pada 10 file. Build frontend menghasilkan bundle halaman admin agen dan halaman publik, sedangkan build backend menghasilkan bundle API yang memuat route publik agen.

## References

[1]: https://github.com/bonangpanjinur/travelumrohbonang/blob/main/supabase/migrations/20260910000001_agent_profiles_public_pages.sql "Agent profile and public page migration"

[2]: https://github.com/bonangpanjinur/travelumrohbonang/blob/main/artifacts/api-server/src/routes/public-agents.ts "Public agent API route"

[3]: https://github.com/bonangpanjinur/travelumrohbonang/blob/main/artifacts/umroh-app/src/features/admin/pages/Agents.tsx "Admin agent management page"
