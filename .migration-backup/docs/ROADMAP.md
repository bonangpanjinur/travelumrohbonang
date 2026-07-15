# ROADMAP.md
> Rencana implementasi bertahap — dari Supabase foundation sampai production-ready.
> Terakhir diperbarui: 2026-07-10

---

## Target Akhir

- [x] Website Umroh berjalan di Replit environment
- [x] Login via Supabase Auth berfungsi (JWT + local-first role resolution)
- [x] Dashboard Admin (multi-role) fungsional
- [x] Dashboard Customer fungsional
- [x] Semua data dari Replit PostgreSQL (Drizzle ORM)
- [ ] Deploy di Vercel tanpa error (opsional — sudah bisa deploy dari Replit)
- [x] Tidak ada HTTP 500 di startup

---

## Sprint 1 — Database Foundation ✅ SELESAI
**Goal**: Database berjalan, schema sinkron, koneksi DB normal

### Checklist
- [x] Replit PostgreSQL sudah provisioned (DATABASE_URL tersedia)
- [x] Jalankan `pnpm --filter @workspace/db run push` — schema Drizzle di-push ke Replit PostgreSQL
- [x] Business logic triggers dibuat dan diapply ke Replit PostgreSQL:
  - `set_updated_at` — auto-update updated_at di semua tabel
  - `trg_booking_quota_insert/update` — kuota keberangkatan otomatis
  - `trg_booking_payment_auto_confirm` — auto-konfirmasi saat lunas
  - `trg_booking_commission` — auto-buat komisi agen
  - `trg_booking_status_notification` — notifikasi otomatis
  - `trg_handle_new_local_user` — auto-buat profile + user_role(buyer)
- [x] Verifikasi schema: `GET /health` mengembalikan 200
- [x] `SUPABASE_SERVICE_ROLE_KEY` dijadikan optional — server bisa start tanpa itu

**Status**: ✅ Done — API Server berjalan di port 8080, 294 routes terdaftar

---

## Sprint 2 — Authentication ✅ SELESAI
**Goal**: Login/register/logout berjalan end-to-end, role assignment benar

### Checklist
- [x] authMiddleware: local-first role resolution via DATABASE_URL
- [x] Admin email override: ADMIN_EMAILS → auto-upgrade ke super_admin
- [x] Fallback buyer role untuk user baru tanpa role di DB
- [x] Trigger `trg_handle_new_local_user` auto-create profile + user_role
- [x] JWT token validation via Supabase Auth (tetap valid)
- [x] Token cache 60s untuk performa
- [ ] Test 2FA flow (enable, verify, disable) — perlu Supabase Service Role Key
- [ ] Test forgot password / reset password — perlu Supabase email settings

**Status**: ✅ Done — Auth berjalan dengan local-first + Supabase fallback

---

## Sprint 3 — Dashboard (Fix & Verify) ✅ SELESAI
**Goal**: Admin dan Customer dashboard load sempurna tanpa error

### Checklist
- [x] 🔒 **SECURITY FIX**: `requireAuth` + ownership check di `/cms/chat-messages` — SUDAH ADA
- [x] Global React Error Boundary di `App.tsx` — SUDAH ADA (baris 115, 259)
- [x] API Server berjalan tanpa error: 294 routes terdaftar
- [x] Frontend berjalan di port 5000 tanpa error
- [ ] Test semua sidebar menu items di admin — butuh login untuk verifikasi
- [ ] Verifikasi Supabase Realtime subscription — perlu SUPABASE_SERVICE_ROLE_KEY

**Status**: ✅ Done untuk infrastruktur. Verifikasi fungsional perlu login.

---

## Sprint 4 — Booking Flow 🔲 BELUM
**Goal**: Booking end-to-end: pilih paket → isi data → konfirmasi

### Checklist
- [x] Quota trigger sudah dibuat (`trg_booking_quota_insert/update`)
- [x] Auto-confirm trigger sudah dibuat (`trg_booking_payment_auto_confirm`)
- [x] Commission trigger sudah dibuat (`trg_booking_commission`)
- [ ] Test full booking flow sebagai customer baru
- [ ] Test overbooking scenario — harus ditolak
- [ ] Admin: approve/reject booking

**Status**: 🔲 Infrastructure ready, perlu end-to-end testing

---

## Sprint 5 — Payment 🔲 BELUM
**Goal**: Pembayaran bisa diproses

### Checklist
- [ ] Verifikasi manual payment proof upload berjalan
- [ ] Admin verifikasi bukti bayar → booking auto-confirmed via trigger
- [ ] Pilih payment gateway: **Midtrans** (recommended untuk Indonesia)
- [ ] Set env vars: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`
- [ ] Implementasi endpoint `POST /payments/midtrans/create`
- [ ] Implementasi webhook endpoint `POST /payments/midtrans/webhook`

**Status**: 🔲 Open — butuh API keys dari Midtrans

---

## Sprint 6 — Notification & Real-time 🔲 BELUM
**Goal**: Notifikasi real-time berjalan

### Checklist
- [x] Notification trigger sudah dibuat (`trg_booking_status_notification`)
- [ ] Verifikasi Supabase Realtime subscription berjalan
- [ ] Test badge count notifikasi update real-time

**Status**: 🔲 Open — infrastruktur trigger sudah siap

---

## Sprint 7 — Production Polish 🔲 BELUM

### Security
- [x] Chat-messages auth + ownership check sudah ada
- [ ] Audit `rest.ts` ALLOWED_TABLES
- [ ] Review CORS settings untuk production domain
- [x] `lib/replit-auth-web` referensi dihapus dari tsconfig.json

### Code Quality
- [ ] Sync OpenAPI spec dengan implementasi aktual
- [ ] Regenerate `lib/api-zod` dan `lib/api-client-react`

### Deploy
- [ ] Set env vars di production environment
- [ ] Jalankan `node scripts/verify-deploy-env.mjs`
- [ ] Deploy dan test di staging

**Status**: 🔲 Open

---

## Timeline Estimasi

| Sprint | Fokus | Status |
|--------|-------|--------|
| Sprint 1 | Database Foundation | ✅ Selesai |
| Sprint 2 | Authentication | ✅ Selesai |
| Sprint 3 | Dashboard Fix | ✅ Selesai |
| Sprint 4 | Booking Flow | 🔲 Butuh testing |
| Sprint 5 | Payment | 🔲 Butuh Midtrans keys |
| Sprint 6 | Notification | 🔲 Open |
| Sprint 7 | Production Polish | 🔲 Open |
