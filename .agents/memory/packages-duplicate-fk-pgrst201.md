---
name: packages.category_id duplicate FK causes PGRST201
description: Why supabase-js nested-select embeds of package_categories fail with "more than one relationship was found", and the fix pattern.
---

## The problem

The live Supabase `packages` table has two foreign key constraints on `category_id` pointing at
`package_categories` (`fk_packages_category` and `packages_category_id_fkey`). PostgREST refuses to
pick one automatically for a nested-select embed like `category:package_categories(name)` — it
returns HTTP 400 `PGRST201` ("more than one relationship was found for 'packages' and
'package_categories'").

**Why:** an earlier migration re-added the FK under a different name without dropping the original,
so both constraints coexist pointing at the same column/table.

**How to apply:** disambiguate every embed with the FK name PostgREST needs, e.g.
`category:package_categories!packages_category_id_fkey(name)`. Don't just patch the one call site
that errors — grep the whole frontend for `package_categories(` (bare, no `!fkname`) since this
project has the same embed duplicated across several package-listing components
(`PackageDetail.tsx`, `PackagesPreview.tsx`, `RelatedPackages.tsx`). The redundant constraint itself
was left in the live DB (dropping it requires DB write access this session didn't have configured);
a future session with `SUPABASE_DATABASE_URL` access could drop `fk_packages_category` to remove the
duplicate at the source instead of patching every query.
