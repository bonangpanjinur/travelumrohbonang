# AUDIT REPORT — Umroh Gateway
**Tanggal:** 2026-07-01  
**Status:** Phase 4 SELESAI — Feature-based structure migration complete (2026-07-01)  
**Scope:** Seluruh monorepo (`/`, `artifacts/umroh-app/`, `database/`, `docs/`, `lib/`)

---

## DAFTAR ISI

1. [Current Structure](#1-current-structure)
2. [Problems Found](#2-problems-found)
3. [Proposed Structure](#3-proposed-structure)
4. [Mapping File-by-File](#4-mapping-file-by-file)
5. [Risk Assessment](#5-risk-assessment)
6. [Execution Plan (Phased Checklist)](#6-execution-plan-phased-checklist)

---

## 1. CURRENT STRUCTURE

```
/ (root)
├── PROJECT_ARCHITECTURE.md          ← doc di root
├── replit.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json / tsconfig.base.json
├── .migration-backup/               ← 30 file SQL backup
│
├── artifacts/
│   ├── umroh-app/src/
│   │   ├── App.tsx                  ← router utama
│   │   ├── main.tsx
│   │   ├── App.css / index.css
│   │   ├── assets/                  ← 2 gambar (about-madinah.jpg, hero-umroh.jpg)
│   │   ├── components/
│   │   │   ├── admin/               ← 20 komponen admin
│   │   │   ├── booking/             ← 1 komponen
│   │   │   ├── chat/                ← 1 komponen
│   │   │   ├── dashboard/           ← 3 komponen
│   │   │   ├── tenant/              ← 3 template
│   │   │   ├── ui/                  ← 55+ komponen shadcn/ui
│   │   │   └── [root level]         ← 35+ komponen tidak terkelompok
│   │   ├── hooks/                   ← 15 hooks (ada duplikat)
│   │   ├── i18n/                    ← LanguageContext + translations
│   │   ├── integrations/supabase/   ← client.ts + types.ts
│   │   ├── lib/                     ← 14 utility files
│   │   ├── pages/
│   │   │   ├── admin/               ← 54 halaman admin
│   │   │   └── [root level]         ← 28 halaman publik/user
│   │   └── test/                    ← 4 file test
│   │
│   ├── api-server/src/
│   │   ├── app.ts / index.ts
│   │   ├── lib/logger.ts
│   │   └── routes/health.ts
│   │
│   └── mockup-sandbox/src/
│       ├── components/ui/           ← DUPLIKAT dari umroh-app
│       └── hooks/                   ← DUPLIKAT dari umroh-app
│
├── database/
│   ├── migrations/                  ← 56 file SQL (teratur)
│   ├── patches/                     ← 5 file fix SQL
│   ├── schema/                      ← 2 file schema SQL
│   └── seed/                        ← 1 file SQL
│
├── docs/                            ← 8 file dokumentasi
│   ├── Architecture.md
│   ├── Database.md
│   ├── API.md
│   ├── Deployment.md
│   ├── FolderStructure.md
│   ├── CodingStandard.md
│   ├── DevelopmentGuide.md
│   └── FeatureList.md
│
├── lib/                             ← shared libraries
│   ├── api-client-react/
│   ├── api-spec/
│   ├── api-zod/
│   └── db/
│
└── scripts/
```

---

## 2. PROBLEMS FOUND

### 2.1 — Dokumentasi di Root (Severity: LOW)
| File | Problem |
|------|---------|
| `PROJECT_ARCHITECTURE.md` | Duplikat konten dari `docs/Architecture.md` — ada 2 sumber kebenaran |
| `replit.md` | Wajar di root (Replit convention), tidak perlu dipindah |

### 2.2 — SQL di Luar Struktur (Severity: MEDIUM)
| Lokasi | Problem |
|--------|---------|
| `.migration-backup/` | 30 file SQL backup, termasuk subfolder `supabase/migrations/` — ini **backup lama**, bukan aktif |
| `.migration-backup/bun.lock*` | File lock bun tersimpan di folder backup — tidak relevan |

> SQL aktif sudah **benar** di `database/migrations/`, `database/patches/`, `database/schema/`, `database/seed/`. Tidak ada SQL di root. ✅

### 2.3 — Komponen Duplikat (Severity: HIGH)
| File 1 | File 2 | Status |
|--------|--------|--------|
| `hooks/use-toast.ts` | `components/ui/use-toast.ts` | ⚠️ **Duplikat** — `ui/use-toast.ts` hanya re-export dari `hooks/use-toast.ts` (wrapper tidak perlu) |
| `hooks/use-mobile.tsx` | `mockup-sandbox/src/hooks/use-mobile.tsx` | ⚠️ **Duplikat** — logika identik, beda formatting saja |
| `components/ui/spinner.tsx` | `components/ui/loading-spinner.tsx` | ⚠️ **Duplikat** — dua spinner berbeda tanpa alasan |
| `components/ui/empty.tsx` | `components/ui/empty-state.tsx` | ⚠️ **Duplikat** — dua komponen "empty state" berbeda |

### 2.4 — Halaman Duplikat (Severity: HIGH)
| File | Problem |
|------|---------|
| `pages/not-found.tsx` | ❌ **TIDAK DIPAKAI** — tidak diimport di App.tsx manapun |
| `pages/NotFound.tsx` | ✅ Ini yang dipakai di router (`<Route path="*">`) |

> `pages/not-found.tsx` = **dead code** — placeholder lama yang tidak pernah diregistrasi di router.

### 2.5 — Utility / Lib Tidak Dipakai (Severity: MEDIUM)
| File | Jumlah Import | Status |
|------|---------------|--------|
| `lib/watermark.ts` | 0 | ❌ **Dead code** — tidak diimport dari mana pun |
| `lib/validations.ts` | 1 | ⚠️ Hampir tidak dipakai — perlu dicek |
| `lib/affiliate.ts` | 1 | ⚠️ Hanya 1 import — perlu dicek apakah aktif |
| `lib/promoPdf.ts` | 1 | ⚠️ Hanya 1 import |

### 2.6 — Komponen Root Tidak Terkelompok (Severity: MEDIUM)
35+ komponen di `components/` root level tanpa pengelompokan feature:
```
AboutSection.tsx, BlogSection.tsx, CTASection.tsx, FAQSection.tsx,
FloatingButtons.tsx, Footer.tsx, GallerySection.tsx, GuideSection.tsx,
HeroSection.tsx, InstallmentCalculator.tsx, InvoiceButton.tsx,
LanguageSwitcher.tsx, Navbar.tsx, NavLink.tsx, NotificationBell.tsx,
NotificationItem.tsx, NotificationList.tsx, PackageCard.tsx, PackageReviews.tsx,
PackagesPreview.tsx, PageFAQ.tsx, PromoPdfButton.tsx, RelatedArticles.tsx,
RelatedPackages.tsx, SEO.tsx, ServicesSection.tsx, SignaturePad.tsx,
StickyMobileCTA.tsx, TestimonialsSection.tsx, ThemeToggle.tsx,
TurnstileCaptcha.tsx, WishlistButton.tsx, CurrencySwitcher.tsx,
BackgroundPattern.tsx, ImpersonationBanner.tsx, BreadcrumbJsonLd.tsx,
Breadcrumbs.tsx, LocalBusinessJsonLd.tsx, ProductJsonLd.tsx
```
> Semua ini seharusnya dikelompokkan per feature.

### 2.7 — Halaman Admin Tidak Terkelompok per Feature (Severity: MEDIUM)
54 halaman admin di `pages/admin/` flat — tidak ada sub-feature folder.
Contoh yang sebaiknya dikelompokkan:
- `Bookings.tsx`, `Payments.tsx`, `Refunds.tsx`, `Installments.tsx` → `booking/`
- `Packages.tsx`, `Departures.tsx`, `PackageCosts.tsx`, `Itineraries.tsx` → `paket/`
- `Users.tsx`, `Agents.tsx`, `RoleManagement.tsx`, `Pilgrims.tsx` → `jamaah/`
- `Accounting.tsx`, `Reports.tsx`, `AgentWithdrawals.tsx` → `keuangan/`

### 2.8 — Mixed Naming Convention (Severity: LOW)
| Pattern | Contoh |
|---------|--------|
| `useXxx.tsx` (camelCase) | `useAuth.tsx`, `useTenant.tsx` |
| `use-xxx.tsx` (kebab-case) | `use-mobile.tsx`, `use-toast.ts` |
> Tidak konsisten — seharusnya pilih satu convention.

### 2.9 — .migration-backup Tidak Terarsip (Severity: LOW)
`.migration-backup/` berisi 30 file SQL + `bun.lock` yang seharusnya sudah tidak diperlukan. Harus dikonfirmasi dulu sebelum dihapus.

### 2.10 — Import Tidak Dipakai (Perlu Verifikasi)
- `components/ui/use-toast.ts` — wrapper yang hanya ada untuk kompatibilitas, bisa dihapus jika semua consumer sudah langsung import dari `hooks/use-toast.ts`

---

## 3. PROPOSED STRUCTURE

### 3.1 Struktur `src/` Target (Feature-Based)

```
artifacts/umroh-app/src/
├── App.tsx
├── main.tsx
├── App.css
├── index.css
├── vite-env.d.ts
│
├── assets/
│   ├── about-madinah.jpg
│   └── hero-umroh.jpg
│
├── features/
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── Auth.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   ├── ResetPassword.tsx
│   │   │   └── Account2FA.tsx
│   │   ├── components/
│   │   │   ├── AuthRoute.tsx
│   │   │   └── ImpersonationBanner.tsx
│   │   └── hooks/
│   │       └── useAuth.tsx
│   │
│   ├── dashboard/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   └── BranchDashboard.tsx
│   │   └── components/
│   │       ├── AdminBanner.tsx
│   │       └── RecentNotifications.tsx
│   │
│   ├── jamaah/
│   │   ├── pages/
│   │   │   ├── Profile.tsx
│   │   │   ├── MyDocuments.tsx
│   │   │   └── ContractSign.tsx
│   │   └── components/
│   │       └── SignaturePad.tsx
│   │
│   ├── paket/
│   │   ├── pages/
│   │   │   ├── Paket.tsx
│   │   │   ├── PackageDetail.tsx
│   │   │   ├── Compare.tsx
│   │   │   └── Wishlist.tsx
│   │   └── components/
│   │       ├── PackageCard.tsx
│   │       ├── PackageReviews.tsx
│   │       ├── PackagesPreview.tsx
│   │       ├── RelatedPackages.tsx
│   │       └── WishlistButton.tsx
│   │
│   ├── booking/
│   │   ├── pages/
│   │   │   ├── Booking.tsx
│   │   │   ├── Payment.tsx
│   │   │   ├── MyBookings.tsx
│   │   │   ├── RefundRequest.tsx
│   │   │   └── ETicket.tsx
│   │   └── components/
│   │       ├── BookingItinerary.tsx
│   │       └── InstallmentCalculator.tsx
│   │
│   ├── keuangan/
│   │   └── components/
│   │       └── InvoiceButton.tsx
│   │
│   ├── cms/
│   │   ├── pages/
│   │   │   ├── Blog.tsx
│   │   │   ├── BlogDetail.tsx
│   │   │   ├── Gallery.tsx
│   │   │   ├── Manasik.tsx
│   │   │   └── DynamicPage.tsx
│   │   └── components/
│   │       ├── BlogSection.tsx
│   │       ├── GallerySection.tsx
│   │       ├── FAQSection.tsx
│   │       ├── TestimonialsSection.tsx
│   │       ├── AboutSection.tsx
│   │       ├── ServicesSection.tsx
│   │       ├── CTASection.tsx
│   │       ├── GuideSection.tsx
│   │       ├── HeroSection.tsx
│   │       ├── RelatedArticles.tsx
│   │       └── PageFAQ.tsx
│   │
│   ├── laporan/
│   │   └── (report-related components)
│   │
│   ├── master-data/
│   │   └── (airlines, airports, hotels, etc.)
│   │
│   ├── settings/
│   │   └── components/
│   │       ├── ThemeToggle.tsx
│   │       ├── LanguageSwitcher.tsx
│   │       └── CurrencySwitcher.tsx
│   │
│   ├── agent/
│   │   ├── pages/
│   │   │   ├── AgentPortal.tsx
│   │   │   └── AgentCommissions.tsx
│   │   └── components/
│   │       └── (agent-specific components)
│   │
│   └── tenant/
│       ├── pages/
│       │   └── TenantSite.tsx
│       └── components/
│           ├── TenantClassicTemplate.tsx
│           ├── TenantModernTemplate.tsx
│           └── TenantPremiumTemplate.tsx
│
├── admin/
│   ├── components/              ← tetap di sini (sudah cukup terpisah)
│   │   ├── AdminLayout.tsx
│   │   ├── AdminSidebar.tsx
│   │   ├── AdminRoute.tsx
│   │   └── ...
│   └── pages/
│       ├── booking/             ← sub-feature admin
│       │   ├── Bookings.tsx
│       │   ├── Payments.tsx
│       │   ├── Refunds.tsx
│       │   └── Installments.tsx
│       ├── paket/
│       │   ├── Packages.tsx
│       │   ├── Departures.tsx
│       │   ├── PackageCosts.tsx
│       │   └── Itineraries.tsx
│       ├── jamaah/
│       │   ├── Users.tsx
│       │   ├── Agents.tsx
│       │   ├── Pilgrims.tsx
│       │   └── RoleManagement.tsx
│       ├── keuangan/
│       │   ├── Accounting.tsx
│       │   ├── Reports.tsx
│       │   └── AgentWithdrawals.tsx
│       └── ...
│
├── shared/
│   ├── components/
│   │   ├── ui/                  ← shadcn (tetap)
│   │   ├── SEO.tsx
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── Breadcrumbs.tsx
│   │   ├── FloatingButtons.tsx
│   │   ├── StickyMobileCTA.tsx
│   │   ├── BackgroundPattern.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── NotificationItem.tsx
│   │   ├── NotificationList.tsx
│   │   ├── BreadcrumbJsonLd.tsx
│   │   ├── LocalBusinessJsonLd.tsx
│   │   ├── ProductJsonLd.tsx
│   │   └── TurnstileCaptcha.tsx
│   ├── hooks/
│   │   ├── useAuth.tsx          ← pindah ke shared jika dipakai lintas feature
│   │   ├── useTenant.tsx
│   │   ├── useTheme.tsx
│   │   ├── useCurrency.tsx
│   │   ├── useNotifications.ts
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   └── lib/
│       ├── utils.ts
│       ├── audit.ts
│       ├── errorLogger.ts
│       ├── exportCsv.ts
│       ├── phone.ts
│       └── ...
│
├── i18n/
│   ├── LanguageContext.tsx
│   └── translations.ts
│
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
│
└── test/
    ├── setup.ts
    ├── example.test.ts
    ├── paymentProofs.test.ts
    └── phone.test.ts
```

### 3.2 Struktur `docs/` Target

```
docs/
├── Architecture.md          ← SUDAH ADA ✅
├── Database.md              ← SUDAH ADA ✅
├── API.md                   ← SUDAH ADA ✅
├── Deployment.md            ← SUDAH ADA ✅
├── FolderStructure.md       ← SUDAH ADA ✅ (perlu update setelah refactor)
├── CodingStandard.md        ← SUDAH ADA ✅
├── DevelopmentGuide.md      ← SUDAH ADA ✅
├── FeatureList.md           ← SUDAH ADA ✅
└── AuditReport.md           ← FILE INI
```

> `PROJECT_ARCHITECTURE.md` di root → dipindah/merge ke `docs/Architecture.md`

### 3.3 Struktur `database/` Target

```
database/
├── migrations/              ← SUDAH BENAR ✅ (56 file, format YYYYMMDD_NNN)
├── patches/                 ← SUDAH BENAR ✅ (5 file fix)
├── schema/                  ← SUDAH BENAR ✅ (2 file reference schema)
└── seed/                    ← SUDAH BENAR ✅ (1 file)
```

> `.migration-backup/` → perlu dikonfirmasi: apakah aman diarsip/hapus?

---

## 4. MAPPING FILE-BY-FILE

### 4.1 Duplikat — Aksi yang Diperlukan

| File | Aksi | Keterangan |
|------|------|------------|
| `pages/not-found.tsx` | **HAPUS** (setelah konfirmasi) | Dead code, tidak dipakai di router |
| `components/ui/use-toast.ts` | **HAPUS** (setelah audit import) | Wrapper tidak perlu, consumer langsung pakai `hooks/use-toast.ts` |
| `components/ui/spinner.tsx` | **PERTAHANKAN** | Pakai `Loader2Icon`, lebih fleksibel |
| `components/ui/loading-spinner.tsx` | **EVALUASI** | Apakah semua consumer bisa migrasi ke `Spinner`? |
| `components/ui/empty.tsx` | **PERTAHANKAN** | Komponen composable lebih lengkap |
| `components/ui/empty-state.tsx` | **EVALUASI** | Cek consumer — jika sedikit, merge ke `empty.tsx` |
| `lib/watermark.ts` | **HAPUS** (setelah konfirmasi) | 0 import, dead code |

### 4.2 Komponen — Relokasi ke Feature

| File Saat Ini | Target |
|---------------|--------|
| `components/AboutSection.tsx` | `features/cms/components/AboutSection.tsx` |
| `components/BlogSection.tsx` | `features/cms/components/BlogSection.tsx` |
| `components/CTASection.tsx` | `features/cms/components/CTASection.tsx` |
| `components/FAQSection.tsx` | `features/cms/components/FAQSection.tsx` |
| `components/GallerySection.tsx` | `features/cms/components/GallerySection.tsx` |
| `components/GuideSection.tsx` | `features/cms/components/GuideSection.tsx` |
| `components/HeroSection.tsx` | `features/cms/components/HeroSection.tsx` |
| `components/ServicesSection.tsx` | `features/cms/components/ServicesSection.tsx` |
| `components/TestimonialsSection.tsx` | `features/cms/components/TestimonialsSection.tsx` |
| `components/RelatedArticles.tsx` | `features/cms/components/RelatedArticles.tsx` |
| `components/PageFAQ.tsx` | `features/cms/components/PageFAQ.tsx` |
| `components/PackageCard.tsx` | `features/paket/components/PackageCard.tsx` |
| `components/PackageReviews.tsx` | `features/paket/components/PackageReviews.tsx` |
| `components/PackagesPreview.tsx` | `features/paket/components/PackagesPreview.tsx` |
| `components/RelatedPackages.tsx` | `features/paket/components/RelatedPackages.tsx` |
| `components/WishlistButton.tsx` | `features/paket/components/WishlistButton.tsx` |
| `components/InstallmentCalculator.tsx` | `features/booking/components/InstallmentCalculator.tsx` |
| `components/InvoiceButton.tsx` | `features/booking/components/InvoiceButton.tsx` |
| `components/SignaturePad.tsx` | `features/jamaah/components/SignaturePad.tsx` |
| `components/StickyMobileCTA.tsx` | `shared/components/StickyMobileCTA.tsx` |
| `components/FloatingButtons.tsx` | `shared/components/FloatingButtons.tsx` |
| `components/BackgroundPattern.tsx` | `shared/components/BackgroundPattern.tsx` |
| `components/Navbar.tsx` | `shared/components/Navbar.tsx` |
| `components/NavLink.tsx` | `shared/components/NavLink.tsx` |
| `components/Footer.tsx` | `shared/components/Footer.tsx` |
| `components/SEO.tsx` | `shared/components/SEO.tsx` |
| `components/Breadcrumbs.tsx` | `shared/components/Breadcrumbs.tsx` |
| `components/BreadcrumbJsonLd.tsx` | `shared/components/BreadcrumbJsonLd.tsx` |
| `components/LocalBusinessJsonLd.tsx` | `shared/components/LocalBusinessJsonLd.tsx` |
| `components/ProductJsonLd.tsx` | `shared/components/ProductJsonLd.tsx` |
| `components/NotificationBell.tsx` | `shared/components/NotificationBell.tsx` |
| `components/NotificationItem.tsx` | `shared/components/NotificationItem.tsx` |
| `components/NotificationList.tsx` | `shared/components/NotificationList.tsx` |
| `components/ThemeToggle.tsx` | `shared/components/ThemeToggle.tsx` |
| `components/LanguageSwitcher.tsx` | `shared/components/LanguageSwitcher.tsx` |
| `components/CurrencySwitcher.tsx` | `shared/components/CurrencySwitcher.tsx` |
| `components/TurnstileCaptcha.tsx` | `shared/components/TurnstileCaptcha.tsx` |
| `components/ImpersonationBanner.tsx` | `features/auth/components/ImpersonationBanner.tsx` |
| `components/AuthRoute.tsx` | `features/auth/components/AuthRoute.tsx` |
| `components/AdminRoute.tsx` | `admin/components/AdminRoute.tsx` |
| `components/PromoPdfButton.tsx` | `features/cms/components/PromoPdfButton.tsx` |
| `components/booking/BookingItinerary.tsx` | `features/booking/components/BookingItinerary.tsx` |
| `components/chat/ChatBox.tsx` | `features/cms/components/ChatBox.tsx` (atau `shared/`) |
| `components/dashboard/AdminBanner.tsx` | `features/dashboard/components/AdminBanner.tsx` |
| `components/dashboard/RecentNotifications.tsx` | `features/dashboard/components/RecentNotifications.tsx` |
| `components/dashboard/TestimonialForm.tsx` | `features/dashboard/components/TestimonialForm.tsx` |
| `components/tenant/TenantClassicTemplate.tsx` | `features/tenant/components/TenantClassicTemplate.tsx` |
| `components/tenant/TenantModernTemplate.tsx` | `features/tenant/components/TenantModernTemplate.tsx` |
| `components/tenant/TenantPremiumTemplate.tsx` | `features/tenant/components/TenantPremiumTemplate.tsx` |

### 4.3 Pages — Relokasi ke Feature

| File Saat Ini | Target |
|---------------|--------|
| `pages/Auth.tsx` | `features/auth/pages/Auth.tsx` |
| `pages/ForgotPassword.tsx` | `features/auth/pages/ForgotPassword.tsx` |
| `pages/ResetPassword.tsx` | `features/auth/pages/ResetPassword.tsx` |
| `pages/Account2FA.tsx` | `features/auth/pages/Account2FA.tsx` |
| `pages/Dashboard.tsx` | `features/dashboard/pages/Dashboard.tsx` |
| `pages/BranchDashboard.tsx` | `features/dashboard/pages/BranchDashboard.tsx` |
| `pages/Profile.tsx` | `features/jamaah/pages/Profile.tsx` |
| `pages/MyDocuments.tsx` | `features/jamaah/pages/MyDocuments.tsx` |
| `pages/ContractSign.tsx` | `features/jamaah/pages/ContractSign.tsx` |
| `pages/Paket.tsx` | `features/paket/pages/Paket.tsx` |
| `pages/PackageDetail.tsx` | `features/paket/pages/PackageDetail.tsx` |
| `pages/Compare.tsx` | `features/paket/pages/Compare.tsx` |
| `pages/Wishlist.tsx` | `features/paket/pages/Wishlist.tsx` |
| `pages/Booking.tsx` | `features/booking/pages/Booking.tsx` |
| `pages/Payment.tsx` | `features/booking/pages/Payment.tsx` |
| `pages/MyBookings.tsx` | `features/booking/pages/MyBookings.tsx` |
| `pages/RefundRequest.tsx` | `features/booking/pages/RefundRequest.tsx` |
| `pages/ETicket.tsx` | `features/booking/pages/ETicket.tsx` |
| `pages/Blog.tsx` | `features/cms/pages/Blog.tsx` |
| `pages/BlogDetail.tsx` | `features/cms/pages/BlogDetail.tsx` |
| `pages/Gallery.tsx` | `features/cms/pages/Gallery.tsx` |
| `pages/Manasik.tsx` | `features/cms/pages/Manasik.tsx` |
| `pages/DynamicPage.tsx` | `features/cms/pages/DynamicPage.tsx` |
| `pages/MyUpgrades.tsx` | `features/settings/pages/MyUpgrades.tsx` |
| `pages/AgentPortal.tsx` | `features/agent/pages/AgentPortal.tsx` |
| `pages/AgentCommissions.tsx` | `features/agent/pages/AgentCommissions.tsx` |
| `pages/AffiliateRedirect.tsx` | `features/agent/pages/AffiliateRedirect.tsx` |
| `pages/TenantSite.tsx` | `features/tenant/pages/TenantSite.tsx` |
| `pages/Index.tsx` | `features/cms/pages/Index.tsx` (landing page) |
| `pages/NotFound.tsx` | `shared/pages/NotFound.tsx` |
| `pages/not-found.tsx` | **HAPUS** (dead code) |

### 4.4 Hooks — Relokasi

| File Saat Ini | Target | Catatan |
|---------------|--------|---------|
| `hooks/useAuth.tsx` | `features/auth/hooks/useAuth.tsx` | Auth-specific |
| `hooks/useTenant.tsx` | `shared/hooks/useTenant.tsx` | Dipakai lintas feature |
| `hooks/useTheme.tsx` | `shared/hooks/useTheme.tsx` | Global |
| `hooks/useCurrency.tsx` | `shared/hooks/useCurrency.tsx` | Global |
| `hooks/useNotifications.ts` | `shared/hooks/useNotifications.ts` | Dipakai lintas |
| `hooks/use-mobile.tsx` | `shared/hooks/use-mobile.tsx` | Global |
| `hooks/use-toast.ts` | `shared/hooks/use-toast.ts` | Global |
| `hooks/useActiveTemplate.tsx` | `features/tenant/hooks/useActiveTemplate.tsx` | Tenant-specific |
| `hooks/useAdminPagination.ts` | `admin/hooks/useAdminPagination.ts` | Admin-specific |
| `hooks/useAuthSettings.ts` | `admin/hooks/useAuthSettings.ts` | Admin-specific |
| `hooks/useDeleteConfirm.ts` | `admin/hooks/useDeleteConfirm.ts` | Admin-specific |
| `hooks/useDynamicFavicon.tsx` | `shared/hooks/useDynamicFavicon.tsx` | Global |
| `hooks/useProofUrl.ts` | `features/booking/hooks/useProofUrl.ts` | Booking-specific |
| `hooks/useSeoOverride.ts` | `shared/hooks/useSeoOverride.ts` | Global SEO |
| `hooks/useWishlist.tsx` | `features/paket/hooks/useWishlist.tsx` | Paket-specific |

### 4.5 Lib — Relokasi

| File Saat Ini | Target | Catatan |
|---------------|--------|---------|
| `lib/utils.ts` | `shared/lib/utils.ts` | Global |
| `lib/audit.ts` | `shared/lib/audit.ts` | Cross-feature |
| `lib/errorLogger.ts` | `shared/lib/errorLogger.ts` | Global |
| `lib/exportCsv.ts` | `shared/lib/exportCsv.ts` | Cross-feature |
| `lib/phone.ts` | `shared/lib/phone.ts` | Shared |
| `lib/env.ts` | `shared/lib/env.ts` | Global |
| `lib/sentry.ts` | `shared/lib/sentry.ts` | Global |
| `lib/rateLimit.ts` | `shared/lib/rateLimit.ts` | Shared |
| `lib/slugRedirect.ts` | `features/cms/lib/slugRedirect.ts` | CMS-specific |
| `lib/affiliate.ts` | `features/agent/lib/affiliate.ts` | Agent-specific |
| `lib/paymentProofs.ts` | `features/booking/lib/paymentProofs.ts` | Booking-specific |
| `lib/pilgrimDocs.ts` | `features/jamaah/lib/pilgrimDocs.ts` | Jamaah-specific |
| `lib/promoPdf.ts` | `features/cms/lib/promoPdf.ts` | CMS-specific |
| `lib/validations.ts` | `shared/lib/validations.ts` | Shared |
| `lib/watermark.ts` | **HAPUS** (0 import, dead code) | — |

### 4.6 Dokumentasi

| File Saat Ini | Target | Catatan |
|---------------|--------|---------|
| `PROJECT_ARCHITECTURE.md` | `docs/Architecture.md` | Merge/replace — konten sudah ada di docs/ |
| `docs/Architecture.md` | Tetap | Update konten dari PROJECT_ARCHITECTURE.md |
| `docs/AuditReport.md` | Tetap (file ini) | Baru dibuat |

---

## 5. RISK ASSESSMENT

### Risiko Tinggi
| Risiko | Deskripsi | Mitigasi |
|--------|-----------|----------|
| **Import path break** | Memindahkan file tanpa update semua import akan crash app | Gunakan grep untuk map seluruh import sebelum pindah |
| **Circular dependency** | Saat dikelompokkan ke features/, potensi circular antar feature | Gunakan `shared/` sebagai buffer — feature tidak boleh import dari feature lain |
| **Dead code removal** | Menghapus file yang ternyata masih dipakai (misal via dynamic import) | Audit dynamic import sebelum hapus |

### Risiko Sedang
| Risiko | Deskripsi | Mitigasi |
|--------|-----------|----------|
| **App tidak bisa jalan** | Setiap perpindahan file berisiko break | Jalankan app setelah setiap phase |
| **Test gagal** | Test yang hardcode path relatif akan gagal | Update test imports bersamaan dengan file |
| **TypeScript error** | tsconfig path alias mungkin perlu update | Cek `@/` alias di vite.config dan tsconfig |

### Risiko Rendah
| Risiko | Deskripsi | Mitigasi |
|--------|-----------|----------|
| **Dokumentasi stale** | Docs tidak di-update setelah refactor | Update docs wajib setiap selesai satu phase |
| **Git history** | Pindah file akan putus git blame history | Gunakan `git mv` bukan hapus + buat baru |

---

## 6. EXECUTION PLAN (PHASED CHECKLIST)

> **Aturan:** Jangan refactor tanpa persetujuan. Satu phase selesai → commit → baru lanjut.

---

### Phase 1 — Bersihkan Root ✅ SELESAI (2026-07-01)
- [x] Pindah `PROJECT_ARCHITECTURE.md` → merge ke `docs/Architecture.md`, hapus dari root
  - `docs/Architecture.md` sekarang versi 1.1 (596 baris, konten gabungan — lebih lengkap dari versi lama 168 baris)
  - `PROJECT_ARCHITECTURE.md` di root sudah dihapus
- [ ] Konfirmasi apakah `.migration-backup/` aman diarsip (rename jadi `_archived/` atau hapus) — **PENDING: perlu konfirmasi manual**
- [x] Pastikan tidak ada file `*.sql`, `*.lock`, `*.env` yang salah tempat di root ✅ Root bersih

**Estimasi:** 30 menit  
**Risk:** Rendah (tidak ada kode yang berubah)

---

### Phase 2 — Hapus Dead Code ✅ SELESAI SEBAGIAN (2026-07-01)
- [x] Hapus `pages/not-found.tsx` — dihapus ✅ (0 consumer, dead code)
- [x] Hapus `lib/watermark.ts` — dihapus ✅ (0 import dari luar file)
- [x] Hapus `components/ui/use-toast.ts` — dihapus ✅ (0 consumer — wrapper tidak perlu)
- [ ] `components/ui/loading-spinner.tsx` vs `components/ui/spinner.tsx` — **DITUNDA ke Phase 4**
  - `loading-spinner.tsx` punya 6 consumer aktif (Dashboard, MyBookings, MyDocuments, Payment, PaymentProofAccessLogs, Payments)
  - Perlu migrasi consumer dulu sebelum hapus salah satu
- [ ] `components/ui/empty-state.tsx` vs `components/ui/empty.tsx` — **DITUNDA ke Phase 4**
  - `empty-state.tsx` punya 3 consumer aktif (MyBookings, PaymentProofAccessLogs, Payments)
  - Perlu migrasi consumer dulu sebelum hapus salah satu

**Estimasi:** 2-4 jam  
**Risk:** Sedang (perlu audit import dulu)

---

### Phase 3 — Rapikan Assets
- [ ] Pastikan semua gambar di `assets/` relevan dan dipakai
- [ ] Tambah subfolder jika diperlukan: `assets/images/`, `assets/icons/`
- [ ] Update import jika ada yang pakai path absolut ke assets

**Estimasi:** 30 menit  
**Risk:** Rendah

---

### Phase 4 — Rapikan src/ (Feature Structure) ✅ SELESAI
> Selesai 2026-07-01. App berjalan tanpa error setelah setiap sub-phase.

- [x] Buat folder `features/`, `shared/`, `admin/` di dalam `src/` ✅
- [x] Phase 4a: Pindah `shared/` items — lib (9 file), hooks (9 file), i18n, supabase, feature-specific lib ✅
- [x] Phase 4b: Pindah semua komponen — shared/ (20), admin/components/ (21), features/*/components/ ✅
- [x] Phase 4c-i: Pindah semua pages ke features/*/pages/ ✅
  - auth (4), dashboard (2), jamaah (4), paket (4), booking (5), cms (6), agent (3), tenant (1)
- [x] Phase 4j: Pindah semua admin pages ke admin/pages/ (57 file) ✅
- [x] Pindah feature-specific hooks: tenant, booking, paket, admin ✅
- [x] Update semua import (bulk sed + manual fix untuk relative paths) ✅
- [x] Jalankan app — zero errors, VITE ready in <500ms ✅

**Hasil akhir src/ structure:**
```
src/
├── admin/           ← components/ (21), hooks/ (3), pages/ (57), AdminRoute.tsx
├── features/        ← auth, booking, cms, dashboard, jamaah, agent, paket, tenant
│   └── [feature]/   ← components/, hooks/, lib/, pages/
├── shared/          ← components/ (20), hooks/ (9), i18n/, integrations/, lib/ (9)
├── components/ui/   ← shadcn (tidak dipindah)
├── pages/           ← hanya NotFound.tsx
└── App.tsx, main.tsx, index.css
```

---

### Phase 5 — Rapikan Database
- [ ] Konfirmasi `.migration-backup/` — jika sudah tidak diperlukan, hapus atau pindah ke luar repo
- [ ] Pastikan naming convention migrations konsisten (sudah: `YYYYMMDD_NNN_deskripsi.sql` ✅)
- [ ] Tambah `database/README.md` yang menjelaskan cara menjalankan migrations

**Estimasi:** 1 jam  
**Risk:** Rendah (SQL tidak disentuh, hanya organisasi)

---

### Phase 6 — Rapikan Dokumentasi
- [x] Merge `PROJECT_ARCHITECTURE.md` ke `docs/Architecture.md` ✅ Selesai di Phase 1
- [ ] Update `docs/FolderStructure.md` dengan struktur baru setelah Phase 4
- [ ] Update `docs/DevelopmentGuide.md` dengan cara kerja di struktur baru
- [ ] Tambah `docs/MigrationGuide.md` — panduan untuk developer yang terbiasa dengan struktur lama
- [ ] Update `docs/AuditReport.md` ini dengan status setiap phase

**Estimasi:** 2-3 jam  
**Risk:** Rendah

---

### Phase 7 — Testing & Validasi
- [ ] Jalankan seluruh test suite: `pnpm test`
- [ ] Cek TypeScript errors: `pnpm tsc --noEmit`
- [ ] Buka app di browser, navigasi ke semua route utama
- [ ] Cek admin panel semua menu
- [ ] Cek tidak ada 404 console error untuk assets
- [ ] Jalankan build production: `pnpm build`

**Estimasi:** 2-4 jam  
**Risk:** Tinggi — ini gerbang final sebelum dianggap selesai

---

### Phase 8 — Cleanup Final
- [ ] Hapus folder kosong yang tersisa
- [ ] Hapus file-file yang sudah dipastikan dead code
- [ ] Update `.gitignore` jika ada folder baru yang perlu diabaikan
- [ ] Final commit dengan pesan: `refactor: complete feature-based structure migration`
- [ ] Update `docs/AuditReport.md` dengan status COMPLETE

**Estimasi:** 1 jam  
**Risk:** Rendah

---

## SUMMARY

| Kategori | Temuan | Severity |
|----------|--------|----------|
| Duplikat komponen | 4 pasang | HIGH |
| Dead code | 2 file (not-found.tsx, watermark.ts) + 1 wrapper | HIGH |
| Root docs misplace | 1 file (PROJECT_ARCHITECTURE.md) | LOW |
| Komponen tidak terkelompok | 35+ komponen | MEDIUM |
| Halaman tidak terkelompok | 28 halaman publik + 54 halaman admin | MEDIUM |
| Hooks tidak terkelompok | 15 hooks | MEDIUM |
| SQL sudah terstruktur | ✅ OK | — |
| Dokumentasi sudah ada | ✅ OK (8 file di docs/) | — |
| Tidak ada SQL di root | ✅ OK | — |

**Total estimasi refactor: 2-3 hari kerja (incremental, dengan testing setiap phase)**

---

*Dokumen ini harus diperbarui setiap kali satu phase selesai. Jangan hapus section sebelumnya, tambahkan status (✅ Done / 🔄 In Progress) di setiap item checklist.*
