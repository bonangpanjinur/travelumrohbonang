# FEATURE_STATUS.md
> Status setiap fitur di Umroh App.
> Terakhir diperbarui: 2026-07-08

---

## Legend

| Status | Arti |
|--------|------|
| ✅ Complete | Fitur selesai dan fungsional |
| ⚠️ Incomplete | Fitur ada tapi belum lengkap |
| ❌ Broken | Fitur ada tapi tidak berfungsi |
| 🔲 Unused | Komponen/halaman ada tapi tidak terhubung |

---

## Authentication & Account

| Fitur | Status | File Utama | Keterangan |
|-------|--------|------------|------------|
| Login (email + password) | ✅ Complete | `features/auth/Auth.tsx` | Via Supabase Auth |
| Register | ✅ Complete | `features/auth/Auth.tsx` | Auto-create profile via trigger |
| Forgot Password / Reset | ✅ Complete | `features/auth/Auth.tsx` | Email link dari Supabase |
| Two-Factor Authentication (2FA) | ✅ Complete | `features/auth/Account2FA.tsx` | TOTP via Supabase MFA |
| Logout | ✅ Complete | Supabase `signOut()` | Clear session |
| Session Persistence | ✅ Complete | Supabase default | localStorage |

---

## Public Pages

| Fitur | Status | File Utama | Keterangan |
|-------|--------|------------|------------|
| Landing Page | ✅ Complete | `pages/` | Dengan theming dinamis |
| Katalog Paket | ✅ Complete | `features/paket/Paket.tsx` | Filter & search |
| Detail Paket | ✅ Complete | `features/paket/PackageDetail.tsx` | Termasuk departures |
| Perbandingan Paket | ✅ Complete | `features/paket/Compare.tsx` | Side-by-side comparison |
| Blog / Artikel | ✅ Complete | `features/cms/Blog.tsx` | CMS-driven |
| Detail Artikel | ✅ Complete | `features/cms/BlogDetail.tsx` | |
| FAQ | ✅ Complete | `features/cms/FAQ.tsx` | CMS-driven |
| Gallery | ✅ Complete | `features/cms/Gallery.tsx` | |
| Gallery per Keberangkatan | ✅ Complete | `features/cms/DepartureGallery.tsx` | |

---

## Customer Dashboard

| Fitur | Status | File Utama | Keterangan |
|-------|--------|------------|------------|
| Dashboard Overview | ✅ Complete | `features/dashboard/Dashboard.tsx` | Stats, recent bookings |
| My Bookings | ✅ Complete | `features/dashboard/MyBookings.tsx` | Daftar + status booking |
| Detail Booking | ✅ Complete | `features/booking/` | Pilgrim data, payment status |
| Profile Management | ✅ Complete | `features/dashboard/Profile.tsx` | Edit data diri |
| Wishlist | ✅ Complete | `features/wishlist/Wishlist.tsx` | Toggle, list paket favorit |
| Notifikasi | ✅ Complete | `features/dashboard/` | Real-time via Supabase |
| Upload Dokumen Jamaah | ✅ Complete | `features/jamaah/` | KTP, paspor, foto |

---

## Booking Flow

| Fitur | Status | File Utama | Keterangan |
|-------|--------|------------|------------|
| Pilih Paket & Keberangkatan | ✅ Complete | `features/booking/Booking.tsx` | Multi-step form |
| Input Data Jamaah | ✅ Complete | `features/booking/` | Per-pilgrim data |
| Pilih Tipe Kamar | ✅ Complete | `features/booking/` | Double/Triple/Quad |
| Booking Code Generation | ✅ Complete | `api/bookings.ts` | Auto-generate di backend |
| Quota Check | ✅ Complete | DB trigger | Hard lock via `FOR UPDATE` |
| Konfirmasi Booking | ✅ Complete | | |

---

## Pembayaran

| Fitur | Status | File Utama | Keterangan |
|-------|--------|------------|------------|
| Upload Bukti Transfer | ⚠️ Incomplete | `features/booking/Payment.tsx` | Ada tapi perlu verifikasi |
| Admin Verifikasi Pembayaran | ⚠️ Incomplete | `features/admin/AdminPayments.tsx` | UI ada, flow belum sempurna |
| Payment Gateway (Midtrans) | ❌ Broken | — | **Tidak terintegrasi sama sekali** |
| Payment Gateway (Xendit) | ❌ Broken | — | **Tidak terintegrasi sama sekali** |
| Auto-Confirm via Webhook | ❌ Broken | — | Trigger ada, tapi tidak ada webhook handler |
| Refund | ⚠️ Incomplete | `features/admin/AdminRefunds.tsx` | UI ada, backend belum lengkap |

---

## Admin Dashboard

| Fitur | Status | File Utama | Keterangan |
|-------|--------|------------|------------|
| Dashboard Overview | ✅ Complete | `features/admin/AdminDashboard.tsx` | KPI, stats, charts |
| System Health Monitor | ✅ Complete | `features/admin/SystemHealth.tsx` | DB, API, realtime |
| Analytics AI | 🔲 Unused | `features/admin/AnalyticsAI.tsx` | Komponen ada, tidak terhubung model AI |

---

## Admin — Manajemen Konten

| Fitur | Status | File Utama | Keterangan |
|-------|--------|------------|------------|
| Kelola Paket | ✅ Complete | `features/admin/AdminPackages.tsx` | CRUD lengkap |
| Kelola Kategori Paket | ✅ Complete | `features/admin/AdminPackageCategories.tsx` | |
| Kelola Keberangkatan | ✅ Complete | `features/admin/AdminDepartures.tsx` | |
| Kelola Gallery | ✅ Complete | `features/admin/AdminGallery.tsx` | |
| Kelola Blog/Artikel | ✅ Complete | `features/admin/AdminBlog.tsx` | |
| Kelola FAQ | ✅ Complete | Via CMS admin | |
| Kelola Halaman Statis | ✅ Complete | Via CMS admin | |
| Kelola Navigation CMS | ✅ Complete | Via admin/settings | |
| Kelola Testimonial | ✅ Complete | `features/admin/AdminTestimonials.tsx` | |
| Kelola SEO | ✅ Complete | `features/admin/AdminSEO.tsx` | |
| Kelola Redirect | ✅ Complete | `features/admin/AdminRedirects.tsx` | |

---

## Admin — Operasional

| Fitur | Status | File Utama | Keterangan |
|-------|--------|------------|------------|
| Kelola Booking | ✅ Complete | `features/admin/AdminBookings.tsx` | Approve/reject/status |
| Kelola Jamaah (Pilgrims) | ✅ Complete | `features/admin/AdminPilgrims.tsx` | |
| Kelola Dokumen | ✅ Complete | `features/admin/AdminDocuments.tsx` | Verifikasi dokumen |
| Live Chat Support | ✅ Complete | `features/admin/AdminChats.tsx` | Per booking |
| Contracts | ⚠️ Incomplete | `features/admin/AdminContracts.tsx` | Permission check ada, CRUD belum |

---

## Admin — Keuangan

| Fitur | Status | File Utama | Keterangan |
|-------|--------|------------|------------|
| Kelola Pembayaran | ⚠️ Incomplete | `features/admin/AdminPayments.tsx` | Manual verify ada |
| Kelola Refund | ⚠️ Incomplete | `features/admin/AdminRefunds.tsx` | UI ada, approval flow belum |
| Kelola Biaya (Costs) | ⚠️ Incomplete | `features/admin/AdminCosts.tsx` | Belum diverifikasi penuh |
| Reports | ✅ Complete | `features/admin/AdminReports.tsx` | Export CSV/PDF |

---

## Admin — User & Role

| Fitur | Status | File Utama | Keterangan |
|-------|--------|------------|------------|
| Kelola User | ✅ Complete | `features/admin/AdminUsers.tsx` | |
| Role Management (RBAC) | ✅ Complete | `features/admin/RoleManagement.tsx` | Permission matrix |
| Kelola Agen | ✅ Complete | `features/admin/AdminAgents.tsx` | Komisi & withdrawal |
| Kelola Cabang | ✅ Complete | `features/admin/AdminBranches.tsx` | |
| CRM Leads | ✅ Complete | `features/admin/AdminCRM.tsx` | |
| Loyalty Program | ✅ Complete | `features/admin/AdminLoyalty.tsx` | |

---

## Admin — Konfigurasi

| Fitur | Status | File Utama | Keterangan |
|-------|--------|------------|------------|
| Site Settings (Theming) | ✅ Complete | `features/admin/AdminSettings.tsx` | HSL color overrides |
| Coupon / Promo Code | ✅ Complete | `features/admin/AdminCoupons.tsx` | |
| Currency Management | ✅ Complete | `features/admin/AdminCurrencies.tsx` | |
| Integrasi & API | ✅ Complete | `features/admin/AdminIntegrations.tsx` | Super admin only |
| Audit Logs | ✅ Complete | `features/admin/AdminLogs.tsx` | |

---

## Infrastruktur & Cross-Cutting

| Fitur | Status | Keterangan |
|-------|--------|------------|
| Agent Commissions (auto via trigger) | ✅ Complete | DB trigger saat booking terbuat |
| Agent Withdrawals | ⚠️ Incomplete | UI ada, approval flow belum |
| Dynamic Theming (CSS vars) | ✅ Complete | `site_settings` → CSS variables |
| Multi-language (i18n) | ✅ Complete | `shared/i18n/` — Indonesia/English |
| Dark Mode | ✅ Complete | Tailwind CSS dark mode |
| Real-time Notifications | ✅ Complete | Supabase Realtime channel |
| Global Error Boundary | ❌ Broken | Tidak ada di `App.tsx` — white screen saat error |
| Rate Limiting | ✅ Complete | `middlewares/rateLimiter.ts` |
| Request Logging | ✅ Complete | `routes/logs.ts` |

---

## Ringkasan Status

| Status | Jumlah | Persentase |
|--------|--------|------------|
| ✅ Complete | ~45 | ~73% |
| ⚠️ Incomplete | ~10 | ~16% |
| ❌ Broken | ~4 | ~6% |
| 🔲 Unused | ~2 | ~3% |
| **Total** | **~61** | **100%** |
