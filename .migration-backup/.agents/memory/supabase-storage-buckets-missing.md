---
name: Supabase storage buckets missing on this project
description: The live Supabase project had zero storage buckets and zero storage.objects RLS policies despite code and migrations assuming they existed; how to check and what buckets/policies this app needs.
---

## Symptom
Any photo/file upload feature fails with "Bucket not found" (or silently denies writes even after buckets exist) even though the upload code and RLS-policy SQL migrations look correct.

## Root cause
Migration files under `sql/migrations/` only create RLS *policies* on `storage.objects` — they never create the *buckets* themselves (`storage.buckets` is a separate table, not managed by these migrations). On this project the buckets were never created via the Supabase dashboard/Storage API either, so `storage.buckets` was completely empty and `storage.objects` had RLS enabled with zero policies (deny-all for non-service-role).

**Why:** bucket creation is an infra-provisioning step outside the SQL migration flow; nothing in the repo re-creates buckets on a fresh Supabase project.

## How to check
Connect directly to `SUPABASE_DATABASE_URL` (not the Replit dev DB — `executeSql` targets the wrong database) with `pg` and query:
```sql
SELECT id, public, file_size_limit FROM storage.buckets;
SELECT policyname, cmd FROM pg_policies WHERE schemaname='storage' AND tablename='objects';
```
If either is empty/incomplete, uploads will fail.

## Buckets this app expects (grep `storage.from(` across `artifacts/umroh-app/src`)
- `cms-images`, `gallery`, `testimonials`, `avatars` — public, admin- or self-managed
- `pilgrim-documents`, `payment-proofs` — private, ownership-scoped via `storage.foldername(name)[1]` matching the owning user/pilgrim id

## Gotchas hit while fixing
- `public.is_admin()` takes **zero arguments** (reads role from JWT internally) — calling `is_admin(auth.uid())` throws "function does not exist".
- `booking_pilgrims.id` is `text`, not `uuid`, despite `bookings.user_id` being `uuid` — don't blindly cast folder-name path segments to `::uuid` when writing ownership-check functions; check actual column types first.
