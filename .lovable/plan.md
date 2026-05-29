
# Sprint SEO — Fokus Pengembangan SEO

Fondasi SEO sudah ada: `SEO.tsx` (Helmet per-route), `index.html` (Organization + WebSite JSON-LD), `robots.txt`, `scripts/generate-sitemap.ts` (dinamis dari Supabase), `LocalBusinessJsonLd`, `BreadcrumbJsonLd`, `PageFAQ`, hreflang, per-tenant canonical. Sprint ini menutup gap berikut.

## Lingkup

### 1. Schema.org diperkaya (paket & blog)
- `PackageDetail`: tambah JSON-LD **`Product`** + **`Offer`** (price, priceCurrency IDR, availability, validFrom/validThrough dari departure terdekat) dan **`AggregateRating`** bila ada review. Hubungkan ke `BreadcrumbList`.
- `BlogDetail`: lengkapi `Article` dengan `dateModified`, `wordCount`, `articleSection` (kategori), `keywords`, `image` 1200×630.
- `Index`: tambah `ItemList` paket unggulan + perkuat `LocalBusiness` (address, geo, openingHours, telephone, priceRange) dari `site_settings`.
- `Manasik` / FAQ pages: pastikan `FAQPage` schema valid dari `PageFAQ`.

### 2. Admin SEO Manager (baru)
Halaman `/admin/seo` (super_admin/admin) berisi:
- **Meta Defaults**: edit title template, default description, default OG image, GSC token, Bing verification, robots default.
- **Per-page overrides**: tabel CRUD untuk `seo_overrides` (path, title, description, og_image, noindex, canonical_override) — dipakai `SEO.tsx` via lookup by `window.location.pathname`.
- **Sitemap status**: tampilkan jumlah URL per kategori, last generated, tombol "Regenerate now" (panggil edge function).
- **Redirect 301**: sudah ada `slug_redirects`, tautkan dari menu ini.
- **Audit**: list halaman publik tanpa meta description / title terlalu pendek / panjang.

DB: tabel baru `seo_overrides` (path PK, fields meta, RLS admin-only, public SELECT untuk dipakai komponen SEO).

### 3. OG image otomatis
- Edge function `og-image` (Deno + canvas) generate PNG 1200×630 dengan judul + brand untuk paket & blog.
- `SEO.tsx` pakai `https://<project>.functions.supabase.co/og-image?title=...&type=...` sebagai fallback bila tidak ada `image` custom.

### 4. Sitemap & robots
- Konversi `scripts/generate-sitemap.ts` jadi **edge function** `sitemap-xml` agar URL paket/blog/page baru langsung muncul tanpa rebuild; tetap pertahankan build-time generator sebagai fallback statis.
- Tambah **`sitemap-images.xml`** (gambar paket & galeri) untuk Google Images.
- Robots: tambah `Disallow: /r/` (link redirect affiliate), `Disallow: /contract/`.

### 5. Internal linking & UX SEO
- Komponen `RelatedPackages` di `PackageDetail` (3 paket serupa berdasar kategori/harga).
- `RelatedPosts` di `BlogDetail`.
- Breadcrumbs visual + JSON-LD di semua halaman publik (Paket, PackageDetail, Blog, BlogDetail, Galeri, DynamicPage).
- Tambah `<nav aria-label="Footer">` dengan kategori paket populer (Reguler, Plus, Ramadhan, VIP).

### 6. Performance & Core Web Vitals
- `<img>` paket: tambah `loading="lazy"`, `decoding="async"`, `width`/`height` eksplisit, `alt` deskriptif dari nama paket.
- Hero image: `fetchpriority="high"` + `<link rel="preload" as="image">`.
- Audit komponen tanpa alt → tulis util `getPackageAlt(pkg)` dan `getGalleryAlt(item)`.

### 7. Konten on-page (template)
- Update `SEO.tsx` default description berbasis route (deteksi pathname): paket list, blog, galeri, manasik masing-masing punya copy unik.
- Halaman `/paket` & `/blog`: H1 unik, intro 80–120 kata kaya kata kunci (umroh murah, paket umroh 2026, dll.), section "Pertanyaan umum" dari `PageFAQ`.

### 8. Analytics SEO (admin)
- Widget di `/admin/seo`: top landing pages (dari `request_log` atau pageviews), CTR proxy (kunjungan vs konversi booking), broken link checker sederhana (cron edge function).

## Catatan teknis

- **DB migration** baru: `seo_overrides` + grants + RLS (admin write, anon/auth read).
- **Edge functions** baru: `og-image`, `sitemap-xml`, `seo-audit` (cron mingguan, simpan ke `seo_audit_results`).
- **Komponen** baru: `RelatedPackages`, `RelatedPosts`, `Breadcrumbs`, `ProductJsonLd`, `ArticleEnhanced`.
- **Hook** baru: `useSeoOverride(path)` di `SEO.tsx`.
- Tidak ada perubahan auth/booking/pembayaran.

## Urutan kerja (5 batch)

1. DB `seo_overrides` + `SEO.tsx` lookup + halaman `/admin/seo` (Meta Defaults + Per-page).
2. JSON-LD diperkaya: `ProductJsonLd` di PackageDetail, Article enhanced di BlogDetail, ItemList di Index.
3. Komponen `Breadcrumbs` + `RelatedPackages` + `RelatedPosts`; pasang ke halaman publik.
4. Edge function `og-image` + `sitemap-xml` + `sitemap-images.xml` + update robots.
5. Performance pass (lazy/eager, alt, preload) + audit tab di `/admin/seo` + cron `seo-audit`.

## Pertanyaan singkat sebelum mulai

1. Setujui pembuatan tabel `seo_overrides` + halaman `/admin/seo`?
2. OG image otomatis via edge function — oke, atau cukup pakai field manual saja?
3. Konversi sitemap ke edge function (dinamis), atau tetap build-time?

