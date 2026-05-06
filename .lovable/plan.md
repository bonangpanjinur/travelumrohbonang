
# Tahap 1 — Fix Akses Super Admin & Fitur Jamaah Prioritas

Catatan: Akun login Anda saat ini (`bpanjinur63@gmail.com`, user_id `37ad3abe…`) **sudah** punya role `super_admin` di database. Jika tetap tidak bisa masuk `/admin`, kemungkinan besar masalah cache role di sesi browser. Plan ini akan menambah tombol "Buka Admin Dashboard" + indikator role agar Anda langsung bisa masuk.

## A. Fix Akses Admin / Super Admin

1. **Migrasi SQL — backfill `user_roles`**
   - Sisipkan role `buyer` untuk semua user di `auth.users` yang belum punya entri di `user_roles`
   - Update trigger `handle_new_user()` agar setiap signup baru otomatis insert ke `user_roles` (default `buyer`) selain ke `profiles`
2. **Banner "Mode Admin"** di `/dashboard`
   - Bila `isAdmin === true`, tampilkan card menonjol di atas: "Anda login sebagai Super Admin → Buka Admin Dashboard"
3. **Indikator role di Navbar** (badge kecil di samping nama)
4. **Tombol "Refresh Role"** di Dashboard untuk paksa re-fetch role bila terjadi cache stale

## B. Fitur Jamaah Prioritas (4 item)

1. **Notifikasi terbaru di Dashboard jamaah**
   - Card baru di Dashboard menampilkan 5 notifikasi terbaru dari tabel `notifications` (filter `user_id = auth.uid()`)
   - Klik notifikasi → tandai `is_read = true` + navigate ke booking terkait bila ada
   
2. **Download Invoice PDF dari sisi jamaah**
   - Reuse `InvoiceGenerator.ts` yang sudah ada di admin
   - Tambah tombol "Download Invoice" di kartu booking pada `/my-bookings` dan `/dashboard`
   - Pastikan RLS sudah cukup (jamaah hanya bisa fetch booking miliknya — sudah ada)
   
3. **Itinerary harian di detail booking jamaah**
   - Di `/my-bookings`, expand booking → tampilkan tab/section "Itinerary"
   - Query `itineraries` + `itinerary_days` berdasarkan `departure_id` booking
   - Tampilkan timeline per hari (day_number, title, description, image)
   
4. **Form rating & testimoni otomatis muncul setelah selesai**
   - Tabel baru `pilgrim_testimonials` (booking_id, user_id, rating 1-5, message, photo_url, is_published default false, created_at)
   - RLS: user insert/select milik sendiri; admin manage all; public select hanya `is_published = true`
   - Card di Dashboard jamaah: jika ada booking dengan `status = completed` dan belum ada testimoni → tampilkan form (rating bintang + textarea + upload foto opsional ke bucket `testimonials`)
   - Setelah submit: toast success + entry menunggu approval admin

## C. File yang Akan Dibuat / Diubah

**Database (1 migrasi):**
- Backfill `user_roles`, update `handle_new_user`, create `pilgrim_testimonials` + RLS

**Frontend baru:**
- `src/components/dashboard/AdminBanner.tsx`
- `src/components/dashboard/RecentNotifications.tsx`
- `src/components/dashboard/TestimonialForm.tsx`
- `src/components/booking/BookingItinerary.tsx`
- `src/components/booking/DownloadInvoiceButton.tsx`

**Frontend diubah:**
- `src/pages/Dashboard.tsx` — sisip 3 komponen baru
- `src/pages/MyBookings.tsx` — tombol Download Invoice + expandable Itinerary
- `src/components/Navbar.tsx` — badge role
- `src/hooks/useAuth.tsx` — ekspor fungsi `refreshRole()` agar bisa dipanggil dari UI
- `src/integrations/supabase/types.ts` — auto-update setelah migrasi

## D. Yang TIDAK Termasuk Tahap 1

Tahap 2 (sesi terpisah): fitur agen (referral link, withdraw komisi, leaderboard), laporan keuangan per cabang, audit trail global super admin, impersonate user, e-ticket QR, refund request, chat CS.

Setelah Anda approve, saya langsung jalankan migrasi + implementasi semua di atas.
