# Analisa Menyeluruh — Tanpa Perubahan Kode

Sesuai permintaan, ini hanya laporan temuan. Tidak ada file yang diubah.

## 1. Tooling & Build (root cause utama build gagal)

**Gejala:** `bun install` gagal → `error: @types/node@catalog: failed to resolve`, lalu Vite `error: Script not found "dev"`, dev-server restart 5x lalu mati.

**Akar masalah:**
- Repo ini adalah **pnpm workspace** (`pnpm-workspace.yaml` dengan sintaks `catalog:` untuk pin versi bersama). Root `package.json` bahkan punya guard: `preinstall` menolak jika bukan pnpm.
- Sandbox Lovable menjalankan `bun install` di root. Bun tidak mengerti `catalog:` → resolver gagal pada `@types/node@catalog:`.
- Root `package.json` **tidak punya script `dev`**. Sandbox mencoba `vite dev` di root → “Script not found 'dev'”. Script `dev` ada di `artifacts/umroh-app`, `artifacts/mockup-sandbox`, `artifacts/api-server` — tidak di root.
- `lib/api-client-react/tsconfig.json` mereferensi `../api-zod`, tapi `api-zod/tsconfig.json` punya `emitDeclarationOnly: true` tanpa `noEmit:false` yang eksplisit — TS project references butuh referensi tidak menonaktifkan emit. Karena `composite: true` + `emitDeclarationOnly: true` sebenarnya sah, error TS6310 muncul kalau ada override lain (kemungkinan `tsconfig.base.json` menyetel `noEmit: true`).

**Konsekuensi:** semua sandbox workflow (bun install, `vite dev` di root) memang tidak kompatibel dengan struktur repo. Ini bukan bug kode aplikasi.

## 2. Backend (Express API `artifacts/api-server`)

Temuan dari review file konteks:

- `src/middlewares/auth.ts` bergantung pada Passport (`req.isAuthenticated()`) — pastikan session middleware terpasang; kalau tidak, semua route protected akan 500 alih-alih 401 (ada memory `auth-middleware-500-fix` — sudah pernah kena).
- `src/routes/pilgrim-documents.ts`:
  - `Math.random().toString(36).substring(2,15)` dipakai sebagai primary key (bukan `crypto.randomUUID()`) — potensi collision & tidak konsisten dengan route admin.
  - Pakai `req: any` — bypass typing; harus `AuthRequest` yang sudah dideklarasikan tapi tidak dipakai.
  - `res.json()` di dalam handler tidak diikuti `return`  konsisten (beberapa `return res.json(...)`, beberapa tidak) — fine functionally, tapi campur.
- `src/routes/storage.ts`:
  - Menerima upload lewat `req.on('data')` **tanpa batas ukuran** — risiko memory exhaustion / DoS. Tidak ada validasi content-type maupun MIME.
  - Bucket `payment-proofs` & `pilgrim-documents` privat di Supabase, tapi route `GET /object/public/:bucket/*` di sini menyajikan file publik untuk **semua** bucket lokal — jika ada developer memakai path lokal untuk bucket yang sebenarnya harus privat, ownership tidak dicek. Storage lokal ini tampak untuk dev fallback, bukan produksi.
- `src/routes/admin/documents.ts` — tidak ada guard admin role terlihat pada file (harus dicek `router` parent di `app.ts`). Kalau tidak dipagari `requireRole('admin')`, siapa pun yang login bisa memodifikasi status verifikasi dokumen jamaah orang lain.

## 3. Frontend (`artifacts/umroh-app`)

- `src/shared/integrations/supabase/client.ts` — di dev, `SUPABASE_URL = window.location.origin` dan meng-attach `Authorization` bearer dari `supabaseAuth`. Aman, tapi jika `apikey` header tetap dikirim sedangkan proxy Express tidak mengharapkan itu, request bisa 401. Perlu verifikasi handler proxy.
- `features/jamaah/lib/pilgrimDocs.ts` & `features/booking/lib/paymentProofs.ts` masih memanggil `supabase.storage.createSignedUrl()` langsung ke Supabase Storage. Artinya pola URL/signature tergantung pada RLS storage bucket — inilah tepatnya yang menjadi 3 dari 4 temuan security (lihat §5).
- Beberapa memory (`admin-route-frontend-backend-mismatches`, `api-camelcase-mismatch`, `generic-rest-proxy-auth-gaps`) menandakan sudah ada catatan drift kontrak API. Tanpa dijalankan generator zod/orval baru, drift bisa muncul lagi.

## 4. Database & Migrasi

- Banyak SQL migration ad hoc di `sql/migrations/*.sql` dan `sql/schema/*.sql`, mix Drizzle (`lib/db/src/schema/*`) + raw SQL + Supabase dashboard. Risiko drift antara Drizzle schema, migrasi, dan state Supabase live (lihat memory `supabase-database-url-split-brain`, `seed-file-schema-drift`).
- Function `has_role(_user_id, _role text)` — parameter `text` bukan enum `app_role`. Panduan standar Lovable memakai enum; kalau ada policy lain memakai enum, comparison bisa gagal.
- Function `handle_new_user()` memberi role default `'buyer'` — pastikan enum `app_role` memiliki nilai `'buyer'`. Kalau tidak, trigger meledak saat signup.
- Trigger `update_departure_quota_on_booking_paid` — memang restore quota saat cancel, tapi tidak menangani transisi paid → pending/refund lain. Bisa jadi bug bisnis (kuota tidak balik).

## 5. Security Findings (dari scan sebelumnya, belum ditangani)

Ini 4 finding yang masih terbuka dan sebelumnya jadi tugas awal:

1. **`SUPA_authenticated_security_definer_function_executable`** (warn) — satu/lebih fungsi `SECURITY DEFINER` masih `EXECUTE` untuk role `authenticated`. Perlu `REVOKE EXECUTE ... FROM authenticated` atau ubah ke `SECURITY INVOKER` bila memang tidak butuh privilege owner.
2. **`pilgrim_documents_storage_no_ownership_check`** (error) — policy SELECT pada bucket `pilgrim-documents` hanya cek `bucket_id`. Setiap user login bisa unduh paspor/KTP jamaah lain. Harus join ke `booking_pilgrims` → `bookings` pada `auth.uid()`.
3. **`pilgrim_documents_storage_no_ownership_check_insert`** (warn) — policy INSERT bucket sama tidak validasi path/pemilik. Perlu `WITH CHECK` yang mem-verifikasi path pilgrim milik booking `auth.uid()`.
4. **`public_content_buckets_writable_by_any_authenticated_user`** (warn) — bucket `cms-images`, `gallery`, `testimonials` mengizinkan INSERT/UPDATE/DELETE untuk `authenticated`. Harus dibatasi `is_admin(auth.uid())`.

## 6. Prioritas Rekomendasi (kalau nanti diperbaiki)

```text
P0  Security findings 2 & 4 (data leak & admin asset tampering)
P1  Security findings 1 & 3
P1  Upload size limit + MIME check di src/routes/storage.ts
P2  Ganti Math.random() → crypto.randomUUID() di pilgrim-documents.ts
P2  Verifikasi admin role guard pada /admin/documents
P3  Konsolidasi drift Drizzle vs SQL migrations
P3  Perjelas app_role enum & has_role signature
```

## 7. Catatan tentang “build error”

Tidak direkomendasikan “fix” dengan `rm bun.lock && bun install` atau menghapus `catalog:` — itu akan merusak konvensi pnpm workspace. Solusi sebenarnya adalah **konfigurasikan sandbox agar tidak menjalankan `bun install` / `vite dev` di root**, atau tambahkan script proxy di root `package.json` yang delegasi ke `pnpm --filter ./artifacts/umroh-app dev`. Ini keputusan tooling, bukan bug aplikasi — perlu dikonfirmasi sebelum diubah.

---

**Tidak ada perubahan file dilakukan.** Kalau setuju melanjutkan, beri tahu subset mana yang mau diperbaiki dulu (mis. "P0 saja") dan saya susun plan implementasi terpisah.
