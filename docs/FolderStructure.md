# Folder Structure
**Umroh Gateway** | Diperbarui: 2026-07-01

---

## Struktur Saat Ini (Before Refactor)

```
project-root/
├── artifacts/
│   ├── umroh-app/                  ← Frontend SPA
│   │   ├── src/
│   │   │   ├── assets/             ← Gambar yang di-import kode
│   │   │   ├── components/         ← Semua komponen (flat + sub-folder by type)
│   │   │   │   ├── admin/          ← Komponen admin (layout, shell, dll)
│   │   │   │   ├── booking/        ← Komponen booking
│   │   │   │   ├── chat/           ← Komponen chat
│   │   │   │   ├── dashboard/      ← Komponen dashboard
│   │   │   │   ├── tenant/         ← Komponen tenant
│   │   │   │   └── ui/             ← shadcn/ui components
│   │   │   ├── hooks/              ← Semua custom hooks (flat)
│   │   │   ├── i18n/               ← LanguageContext + translations
│   │   │   ├── integrations/
│   │   │   │   └── supabase/       ← client.ts + types.ts
│   │   │   ├── lib/                ← Utility functions (flat)
│   │   │   ├── pages/              ← Halaman SPA
│   │   │   │   ├── admin/          ← 45+ halaman admin
│   │   │   │   └── *.tsx           ← Halaman publik
│   │   │   ├── test/               ← Test setup
│   │   │   ├── App.tsx             ← Root + router
│   │   │   ├── main.tsx            ← Entry point
│   │   │   └── index.css           ← Global styles
│   │   ├── public/                 ← Static assets
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   ├── api-server/                 ← Express API (Replit backend)
│   └── mockup-sandbox/             ← Vite dev untuk Canvas mockup
│
├── database/                       ← ✅ SQL terorganisir (Phase 1)
│   ├── schema/
│   ├── migrations/
│   ├── patches/
│   └── seed/
│
├── docs/                           ← ✅ Dokumentasi teknis (Phase 2)
│   ├── Architecture.md
│   ├── Database.md
│   ├── API.md
│   ├── Deployment.md
│   ├── FolderStructure.md          ← File ini
│   ├── CodingStandard.md
│   ├── DevelopmentGuide.md
│   └── FeatureList.md
│
├── .migration-backup/              ← Backup dari Vercel (jangan diedit)
│   ├── src/                        ← Source asli
│   └── supabase/                   ← SQL asli + edge functions
│
├── PROJECT_ARCHITECTURE.md         ← Standar arsitektur
├── PRD.md                          ← Product Requirements
└── replit.md                       ← Catatan Replit environment
```

---

## Struktur Target (After Refactor)

```
artifacts/umroh-app/src/
│
├── features/                       ← Kode per FITUR (target Phase 3+)
│   │
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   ├── ResetPassword.tsx
│   │   │   └── TwoFactor.tsx
│   │   ├── components/
│   │   │   ├── AuthRoute.tsx
│   │   │   └── LoginForm.tsx
│   │   └── hooks/
│   │       └── useAuth.tsx         ← (moved from hooks/)
│   │
│   ├── paket/
│   │   ├── pages/
│   │   │   ├── Paket.tsx
│   │   │   ├── PackageDetail.tsx
│   │   │   └── Compare.tsx
│   │   ├── components/
│   │   │   ├── PackageCard.tsx
│   │   │   ├── PackagesPreview.tsx
│   │   │   ├── InstallmentCalculator.tsx
│   │   │   └── PackageFilter.tsx
│   │   └── hooks/
│   │       └── usePackageFilter.ts
│   │
│   ├── booking/
│   │   ├── pages/
│   │   │   ├── Booking.tsx
│   │   │   ├── MyBookings.tsx
│   │   │   ├── BookingDetail.tsx
│   │   │   ├── ETicket.tsx
│   │   │   └── RefundRequest.tsx
│   │   └── components/
│   │       ├── BookingSteps.tsx
│   │       ├── PilgrimForm.tsx
│   │       └── PaymentUpload.tsx
│   │
│   ├── jamaah/
│   │   ├── pages/
│   │   │   ├── MyDocuments.tsx
│   │   │   ├── MyUpgrades.tsx
│   │   │   ├── Contract.tsx
│   │   │   └── Manasik.tsx
│   │   └── components/
│   │       └── DocumentCard.tsx
│   │
│   ├── dashboard/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   └── BranchDashboard.tsx
│   │   └── components/
│   │       ├── StatsCard.tsx
│   │       └── RecentBookings.tsx
│   │
│   ├── agent/
│   │   ├── pages/
│   │   │   ├── AgentPortal.tsx
│   │   │   └── AgentCommissions.tsx
│   │   └── components/
│   │       ├── AffiliateLink.tsx
│   │       └── CommissionTable.tsx
│   │
│   ├── cms/
│   │   ├── pages/
│   │   │   ├── Blog.tsx
│   │   │   ├── BlogPost.tsx
│   │   │   ├── Galeri.tsx
│   │   │   └── DynamicPage.tsx
│   │   └── components/
│   │       └── BlogCard.tsx
│   │
│   ├── wishlist/
│   │   ├── pages/
│   │   │   └── Wishlist.tsx
│   │   └── hooks/
│   │       └── useWishlist.tsx     ← (moved from hooks/)
│   │
│   ├── tenant/
│   │   └── components/
│   │       └── TenantProvider.tsx  ← (moved from components/tenant/)
│   │
│   └── admin/
│       ├── components/             ← Admin shell (layout, sidebar, route guard)
│       │   ├── AdminLayout.tsx
│       │   ├── AdminSidebar.tsx
│       │   ├── AdminRoute.tsx
│       │   └── adminMenuConfig.ts
│       └── pages/
│           ├── master-data/        ← Hotels, Airlines, Airports, Services
│           ├── paket/              ← Packages, Departures, Itineraries, Costs
│           ├── booking/            ← Bookings, Payments, Gateway, Refunds
│           ├── jamaah/             ← Pilgrims, Manifest, Documents, CheckIn
│           ├── laporan/            ← Reports, Accounting, AuditLogs
│           ├── agent/              ← Agents, Withdrawals, Branches, CRM
│           ├── cms/                ← Blog, Gallery, Pages, Navigation, FAQ
│           ├── pengguna/           ← Users, Roles, Coupons, Loyalty, Reviews
│           └── settings/           ← Settings, TenantSites, Integrations, SEO
│
├── shared/                         ← Kode lintas fitur (target Phase 3+)
│   ├── components/
│   │   ├── ui/                     ← shadcn/ui (dari components/ui/)
│   │   ├── layout/                 ← Navbar, Footer
│   │   ├── seo/                    ← SEO component, JSON-LD
│   │   ├── notifications/          ← NotificationBell, dll
│   │   └── common/                 ← LoadingSpinner, ErrorBoundary, dll
│   ├── hooks/                      ← Hooks lintas fitur
│   │   ├── useNotifications.ts
│   │   ├── useCurrency.tsx
│   │   └── use-mobile.tsx
│   ├── lib/                        ← Dari lib/ saat ini
│   │   ├── utils.ts
│   │   ├── validations.ts
│   │   ├── phone.ts
│   │   ├── env.ts
│   │   ├── errorLogger.ts
│   │   └── ...
│   └── integrations/
│       └── supabase/               ← client.ts + types.ts
│
├── pages/                          ← Entry-level pages saja
│   ├── Index.tsx                   ← Landing page
│   └── NotFound.tsx                ← 404
│
├── App.tsx                         ← Router + Providers
├── main.tsx                        ← Entry point
└── index.css                       ← Global styles
```

---

## Peta Migrasi: Saat Ini → Target

### `src/components/` → Split ke `features/` dan `shared/`

| File Saat Ini | Lokasi Target |
|---------------|--------------|
| `components/ui/*` | `shared/components/ui/` |
| `components/admin/*` | `features/admin/components/` |
| `components/booking/*` | `features/booking/components/` |
| `components/chat/*` | `features/booking/components/chat/` atau `shared/components/` |
| `components/dashboard/*` | `features/dashboard/components/` |
| `components/tenant/*` | `features/tenant/components/` |
| `components/Navbar.tsx` | `shared/components/layout/` |
| `components/Footer.tsx` | `shared/components/layout/` |
| `components/SEO.tsx` | `shared/components/seo/` |

### `src/hooks/` → Split ke `features/` dan `shared/`

| Hook Saat Ini | Lokasi Target |
|---------------|--------------|
| `useAuth.tsx` | `features/auth/hooks/` |
| `useWishlist.tsx` | `features/wishlist/hooks/` |
| `useTenant.tsx` | `features/tenant/hooks/` |
| `useNotifications.ts` | `shared/hooks/` |
| `useCurrency.tsx` | `shared/hooks/` |
| `use-mobile.tsx` | `shared/hooks/` |
| `useActiveTemplate.tsx` | `shared/hooks/` atau `features/tenant/` |
| `useAdminPagination.ts` | `features/admin/hooks/` |

### `src/lib/` → `shared/lib/`

Semua file di `lib/` pindah ke `shared/lib/` tanpa perubahan nama.

### `src/i18n/` → `shared/i18n/`

`LanguageContext.tsx` dan `translations.ts` → `shared/i18n/`.

### `src/integrations/` → `shared/integrations/`

`supabase/client.ts` dan `supabase/types.ts` → `shared/integrations/supabase/`.

### `src/pages/` → Split ke `features/` dan `pages/`

| Pages Saat Ini | Lokasi Target |
|----------------|--------------|
| `pages/admin/*.tsx` (45+ files) | `features/admin/pages/` (by sub-domain) |
| `pages/Index.tsx` | `pages/Index.tsx` |
| `pages/NotFound.tsx` | `pages/NotFound.tsx` |
| `pages/Login.tsx` | `features/auth/pages/` |
| `pages/Register.tsx` | `features/auth/pages/` |
| `pages/Paket.tsx` | `features/paket/pages/` |
| `pages/PackageDetail.tsx` | `features/paket/pages/` |
| `pages/Booking.tsx` | `features/booking/pages/` |
| `pages/MyBookings.tsx` | `features/booking/pages/` |
| `pages/Dashboard.tsx` | `features/dashboard/pages/` |
| `pages/AgentPortal.tsx` | `features/agent/pages/` |
| `pages/Blog.tsx` | `features/cms/pages/` |
| `pages/Wishlist.tsx` | `features/wishlist/pages/` |
| ... | ... |

---

## Catatan Penting

> Refactor **tidak dilakukan sekaligus**. Setiap phase harus:
> 1. Pindahkan file ke lokasi baru
> 2. Update **semua import** yang mereferensikan file tersebut
> 3. Pastikan app masih berjalan
> 4. Commit

> Gunakan `grep -r "from.*komponen-yang-dipindah"` sebelum memindahkan file untuk menemukan semua import yang perlu diupdate.
