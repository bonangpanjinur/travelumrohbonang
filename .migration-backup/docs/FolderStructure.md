# Folder Structure
**Umroh Gateway** | Diperbarui: 2026-07-01 (Phase 4 selesai)

---

## Struktur Aktual (After Refactor)

```
project-root/
│
├── artifacts/
│   ├── umroh-app/                  ← Frontend SPA (React + Vite + Tailwind)
│   │   ├── src/
│   │   │   ├── admin/              ← Semua kode admin panel
│   │   │   │   ├── components/     ← Layout, shell, guard (AdminLayout, Sidebar, dll)
│   │   │   │   ├── hooks/          ← Hook khusus admin (useAdminPagination, useDeleteConfirm, useAuthSettings)
│   │   │   │   ├── pages/          ← 57 halaman admin (Packages, Bookings, Users, dll)
│   │   │   │   └── AdminRoute.tsx  ← Route guard admin (cek role + 2FA)
│   │   │   │
│   │   │   ├── features/           ← Kode per fitur (domain user-facing)
│   │   │   │   ├── auth/
│   │   │   │   │   ├── components/ ← AuthForm, dll
│   │   │   │   │   └── pages/      ← Auth, ForgotPassword, ResetPassword, Account2FA
│   │   │   │   ├── booking/
│   │   │   │   │   ├── components/ ← BookingSteps, PilgrimForm, PaymentUpload
│   │   │   │   │   ├── hooks/      ← useProofUrl
│   │   │   │   │   ├── lib/        ← booking utilities
│   │   │   │   │   └── pages/      ← Booking, Payment, MyBookings, ETicket, RefundRequest
│   │   │   │   ├── cms/
│   │   │   │   │   ├── components/ ← BlogCard, GalleryGrid, dll
│   │   │   │   │   ├── lib/        ← cms utilities
│   │   │   │   │   └── pages/      ← Index, Blog, BlogDetail, Gallery, Manasik, DynamicPage
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── components/ ← StatsCard, RecentBookings, dll
│   │   │   │   │   └── pages/      ← Dashboard, BranchDashboard
│   │   │   │   ├── jamaah/
│   │   │   │   │   ├── components/ ← DocumentCard, dll
│   │   │   │   │   ├── lib/        ← jamaah utilities
│   │   │   │   │   └── pages/      ← Profile, MyDocuments, ContractSign, MyUpgrades
│   │   │   │   ├── agent/
│   │   │   │   │   ├── lib/        ← agent utilities
│   │   │   │   │   └── pages/      ← AgentPortal, AgentCommissions, AffiliateRedirect
│   │   │   │   ├── paket/
│   │   │   │   │   ├── components/ ← PackageCard, PackageFilter, InstallmentCalculator, dll
│   │   │   │   │   ├── hooks/      ← useWishlist
│   │   │   │   │   └── pages/      ← Paket, PackageDetail, Compare, Wishlist
│   │   │   │   └── tenant/
│   │   │   │       ├── components/ ← Template components (Template1-3, dll)
│   │   │   │       ├── hooks/      ← useActiveTemplate
│   │   │   │       └── pages/      ← TenantSite
│   │   │   │
│   │   │   ├── shared/             ← Kode lintas fitur
│   │   │   │   ├── components/     ← Navbar, Footer, SEO, NotificationBell, AuthRoute, dll (20 file)
│   │   │   │   ├── hooks/          ← useAuth, useTenant, useTheme, useCurrency, dll (9 file)
│   │   │   │   ├── i18n/           ← LanguageContext + translations
│   │   │   │   ├── integrations/
│   │   │   │   │   └── supabase/   ← client.ts + types.ts
│   │   │   │   └── lib/            ← utils, validations, phone, env, sentry, errorLogger, dll (9 file)
│   │   │   │
│   │   │   ├── components/
│   │   │   │   └── ui/             ← shadcn/ui (TIDAK dipindah — path alias @/components/ui/ tetap)
│   │   │   │
│   │   │   ├── pages/
│   │   │   │   └── NotFound.tsx    ← Satu-satunya halaman di root pages/
│   │   │   │
│   │   │   ├── test/               ← Test setup
│   │   │   ├── App.tsx             ← Router + Providers
│   │   │   ├── main.tsx            ← Entry point
│   │   │   └── index.css           ← Global styles
│   │   │
│   │   ├── public/                 ← Static assets (favicon, dll)
│   │   ├── package.json
│   │   ├── vite.config.ts          ← Path alias: @/ → src/
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   ├── api-server/                 ← Express API (Replit backend untuk health check)
│   └── mockup-sandbox/             ← Vite dev server untuk Canvas mockup
│
├── database/                       ← ✅ SQL terorganisir (Phase 1)
│   ├── schema/                     ← DDL schema utama
│   ├── migrations/                 ← YYYYMMDD_NNN_deskripsi.sql
│   ├── patches/                    ← Hotfix SQL
│   └── seed/                       ← Data awal
│
├── docs/                           ← ✅ Dokumentasi teknis (Phase 2)
│   ├── Architecture.md             ← Arsitektur sistem
│   ├── Database.md                 ← Skema database
│   ├── API.md                      ← API endpoints
│   ├── Deployment.md               ← Panduan deploy
│   ├── FolderStructure.md          ← File ini
│   ├── CodingStandard.md           ← Konvensi kode
│   ├── DevelopmentGuide.md         ← Panduan development
│   ├── FeatureList.md              ← Daftar fitur
│   └── AuditReport.md              ← Laporan & checklist refactor
│
├── .migration-backup/              ← Backup legacy Vercel (jangan edit/hapus)
│   ├── *.sql                       ← SQL asli sebelum reorganisasi
│   └── ...                         ← Lock files dan schema backup
│
├── PRD.md                          ← Product Requirements
└── replit.md                       ← Catatan Replit environment
```

---

## Path Alias

File `vite.config.ts` dan `tsconfig.json` mendefinisikan:

```
@/ → artifacts/umroh-app/src/
```

Contoh penggunaan:
```ts
import { useAuth } from "@/shared/hooks/useAuth";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/components/ui/button";           // shadcn — tetap di sini
import AdminLayout from "@/admin/components/AdminLayout";
import { useWishlist } from "@/features/paket/hooks/useWishlist";
```

---

## Konvensi Penambahan File Baru

| Jenis file | Letakkan di |
|------------|------------|
| Halaman user-facing baru | `features/<nama-fitur>/pages/` |
| Komponen khusus satu fitur | `features/<nama-fitur>/components/` |
| Hook khusus satu fitur | `features/<nama-fitur>/hooks/` |
| Utility khusus satu fitur | `features/<nama-fitur>/lib/` |
| Halaman admin baru | `admin/pages/` |
| Komponen admin | `admin/components/` |
| Komponen dipakai 2+ fitur | `shared/components/` |
| Hook dipakai 2+ fitur | `shared/hooks/` |
| Utility dipakai 2+ fitur | `shared/lib/` |
| shadcn UI component baru | `components/ui/` (jangan pindahkan shadcn!) |

---

## Catatan Penting

- **shadcn/ui** (`@/components/ui/`) **TIDAK dipindah** — path alias `@/components/ui/` sudah dikonfigurasi shadcn dan dipakai 50+ file. Memindahkan ini akan break semua komponen.
- **`@/integrations/supabase/`** (lama) sudah di-redirect ke `@/shared/integrations/supabase/` — jangan pakai path lama.
- Setiap penambahan fitur: buat folder `features/<fitur>/` lengkap dengan sub-folder yang diperlukan.
