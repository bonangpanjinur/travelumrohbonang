# ROADMAP.md
> Rencana implementasi bertahap — dari Supabase foundation sampai production-ready.
> Terakhir diperbarui: 2026-07-08

---

## Target Akhir

- [ ] Website Umroh berjalan di production
- [ ] Login via Supabase Auth berfungsi
- [ ] Dashboard Admin (multi-role) berfungsi
- [ ] Dashboard Customer berfungsi
- [ ] Semua data dari Supabase/PostgreSQL
- [ ] Deploy di Vercel tanpa error
- [ ] Tidak ada HTTP 500 di production

---

## Sprint 1 — Supabase Foundation
**Goal**: Supabase berjalan, schema sinkron, koneksi DB normal

**Estimasi**: 1–2 hari

### Checklist
- [ ] Buat Supabase project (jika belum ada)
- [ ] Set env vars di Replit:
  ```
  VITE_SUPABASE_URL          = https://<project>.supabase.co
  VITE_SUPABASE_ANON_KEY     = eyJ...
  SUPABASE_SERVICE_ROLE_KEY  = eyJ...
  ```
- [ ] Jalankan `supabase-deploy.sql` di Supabase SQL editor
- [ ] Audit `scripts/migrations/business_logic_triggers.sql` — hapus referensi Replit Auth
- [ ] Jalankan trigger yang sudah dibersihkan di Supabase
- [ ] Jalankan `scripts/migrations/add_new_user_profile_trigger.sql` di Supabase
- [ ] Jalankan seed data: `supabase-seed.sql` (dev) atau `supabase-seed-prod.sql` (prod)
- [ ] Verifikasi schema Drizzle == schema Supabase
- [ ] Test koneksi DB dari API server (`GET /health`)

**Done looks like**: `GET /health` mengembalikan 200 dengan status DB dan Supabase OK.

---

## Sprint 2 — Authentication
**Goal**: Login/register/logout berjalan end-to-end, role assignment benar

**Estimasi**: 1–2 hari

### Checklist
- [ ] Test login flow: email + password → JWT → redirect ke dashboard
- [ ] Test register flow: buat user baru → auto-create profile via trigger
- [ ] Fix redirect loop: user ada di auth tapi tidak ada di `user_roles`
  - Solusi: tambah fallback assignment role `buyer` saat user login tanpa role
- [ ] Test admin login → redirect ke `/admin`
- [ ] Test customer login → redirect ke `/dashboard`
- [ ] Test 2FA flow (enable, verify, disable)
- [ ] Test forgot password / reset password
- [ ] Verifikasi token refresh berjalan otomatis
- [ ] Test logout membersihkan session

**Done looks like**: User bisa login, role terdeteksi benar, tidak ada redirect loop.

---

## Sprint 3 — Dashboard (Fix & Verify)
**Goal**: Admin dan Customer dashboard load sempurna tanpa error

**Estimasi**: 2–3 hari

### Checklist
- [ ] 🔒 **SECURITY FIX**: Tambah `requireAuth` + ownership check di `/cms/chat-messages`
  - File: `artifacts/api-server/src/routes/cms.ts` baris 212
- [ ] Verifikasi semua admin dashboard stats endpoints return 200
- [ ] Verifikasi Customer dashboard data (bookings, notifications, wishlist) load
- [ ] Tambah global React Error Boundary di `artifacts/umroh-app/src/App.tsx`
- [ ] Test semua sidebar menu items di admin — pastikan tidak ada dead links
- [ ] Test role-based sidebar filtering (super_admin vs staff vs agent)
- [ ] Verifikasi Supabase Realtime subscription untuk notifikasi berjalan
- [ ] Test site settings theming (ubah warna → lihat di frontend)

**Done looks like**: Admin dashboard dan Customer dashboard bisa dibuka tanpa error, semua data load.

---

## Sprint 4 — Booking Flow
**Goal**: Booking end-to-end: pilih paket → isi data → konfirmasi

**Estimasi**: 2–3 hari

### Checklist
- [ ] Test full booking flow sebagai customer baru
- [ ] Verifikasi quota trigger berjalan (`check_departure_quota`)
- [ ] Test overbooking scenario — harus ditolak
- [ ] Verifikasi `update_departure_booked_count` trigger update quota
- [ ] Test agent commission trigger saat booking via agen
- [ ] Test booking notification diterima customer (Supabase Realtime)
- [ ] Admin: approve booking → status berubah ke `confirmed`
- [ ] Admin: reject booking → status berubah ke `cancelled`
- [ ] Customer: lihat booking detail dengan status terkini

**Done looks like**: Booking bisa dibuat, quota terkurangi, admin bisa approve/reject.

---

## Sprint 5 — Payment
**Goal**: Pembayaran bisa diproses (minimal manual, idealnya online)

**Estimasi**: 3–5 hari

### Checklist
- [ ] Verifikasi manual payment proof upload berjalan
- [ ] Admin verifikasi bukti bayar → booking auto-confirmed via trigger
- [ ] Pilih payment gateway: **Midtrans** (recommended untuk Indonesia)
- [ ] Daftar akun Midtrans, dapatkan Server Key & Client Key
- [ ] Set env vars: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`
- [ ] Implementasi endpoint `POST /payments/midtrans/create`
- [ ] Implementasi webhook endpoint `POST /payments/midtrans/webhook`
- [ ] Test flow: customer bayar → webhook diterima → booking confirmed
- [ ] Test refund flow (manual admin → update status)

**Done looks like**: Customer bisa bayar online, booking otomatis confirmed setelah pembayaran berhasil.

---

## Sprint 6 — Notification & Real-time
**Goal**: Notifikasi real-time berjalan untuk semua event penting

**Estimasi**: 1–2 hari

### Checklist
- [ ] Verifikasi `send_booking_notification` trigger berjalan di semua status change
- [ ] Test notifikasi booking pending → customer dapat notif
- [ ] Test notifikasi payment verified → customer dapat notif
- [ ] Test notifikasi booking confirmed → customer dapat notif
- [ ] Admin: broadcast notification ke semua user / segment tertentu
- [ ] Verifikasi badge count notifikasi di navbar update real-time
- [ ] Test mark all as read

**Done looks like**: Customer mendapat notifikasi real-time untuk semua event booking & pembayaran.

---

## Sprint 7 — Optimization & Production Polish
**Goal**: Production-ready, performant, secure

**Estimasi**: 3–5 hari

### Security
- [ ] Pastikan semua admin routes memiliki role check yang tepat
- [ ] Audit `rest.ts` ALLOWED_TABLES — pastikan tidak ada tabel sensitif yang exposed
- [ ] Pastikan Supabase RLS policies aktif untuk tabel yang diakses langsung dari frontend
- [ ] Review CORS settings untuk production domain
- [ ] Hapus/nonaktifkan route debug yang tidak diperlukan

### Code Quality
- [ ] Hapus `lib/replit-auth-web` (legacy, tidak dipakai)
- [ ] Sync OpenAPI spec (`lib/api-spec/openapi.yaml`) dengan implementasi aktual Express routes
- [ ] Regenerate `lib/api-zod` dan `lib/api-client-react` dari spec terbaru

### Testing
- [ ] Tulis integration tests untuk auth flow
- [ ] Tulis integration tests untuk booking flow
- [ ] Tulis unit tests untuk DB triggers
- [ ] Setup CI/CD di GitHub Actions

### Performance
- [ ] Lazy loading untuk halaman admin yang berat
- [ ] Image optimization (WebP, lazy load)
- [ ] TanStack Query cache tuning

### Deploy ke Vercel
- [ ] Set semua env vars di Vercel dashboard (bukan dari Replit)
- [ ] Jalankan `node scripts/verify-deploy-env.mjs` untuk verifikasi
- [ ] Deploy dan test di staging
- [ ] Verifikasi `/health` di production
- [ ] Test login flow di production
- [ ] Monitor logs 24 jam pertama

**Done looks like**: App berjalan di production tanpa error, semua fitur utama fungsional.

---

## Timeline Estimasi

| Sprint | Fokus | Estimasi |
|--------|-------|----------|
| Sprint 1 | Supabase Foundation | 1–2 hari |
| Sprint 2 | Authentication | 1–2 hari |
| Sprint 3 | Dashboard Fix | 2–3 hari |
| Sprint 4 | Booking Flow | 2–3 hari |
| Sprint 5 | Payment | 3–5 hari |
| Sprint 6 | Notification | 1–2 hari |
| Sprint 7 | Production Polish | 3–5 hari |
| **Total** | | **~2–3 minggu** |

---

## Dependency antar Sprint

```
Sprint 1 (DB)
    │
    ▼
Sprint 2 (Auth) ── harus selesai sebelum Sprint 3, 4, 5
    │
    ├──▼ Sprint 3 (Dashboard)
    │
    └──▼ Sprint 4 (Booking)
              │
              ▼
         Sprint 5 (Payment)
              │
              ▼
         Sprint 6 (Notification)
              │
              ▼
         Sprint 7 (Production)
```
