-- Auto-create a row in public.profiles (and default role in public.user_roles)
-- whenever a new user signs up via Supabase Auth (auth.users).
--
-- Without this trigger, `public.profiles` / `public.user_roles` stay empty
-- even after a successful signup, because the app never inserts into them
-- directly on registration — it relies on Supabase Auth's own `auth.users`
-- table plus this trigger to mirror the essentials into the public schema.
--
-- Safe to re-run (uses CREATE OR REPLACE / IF NOT EXISTS).
--
-- NOTE: In Supabase, auth.users.id is type UUID.
--       profiles.id and user_roles.user_id must accept UUID (no ::text cast).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, created_at)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    now()
  )
  on conflict (id) do nothing;

  insert into public.user_roles (id, user_id, role, created_at)
  values (gen_random_uuid(), new.id, 'buyer', now())
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────
-- BACKFILL: isi profiles + user_roles untuk user yang SUDAH ada di
-- auth.users sebelum trigger ini dibuat (mis. yang daftar lewat form
-- sebelum SQL ini dijalankan). Aman dijalankan berkali-kali.
-- ─────────────────────────────────────────────────────────────────

insert into public.profiles (id, name, email, created_at)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.email,
  u.created_at
from auth.users u
on conflict (id) do nothing;

insert into public.user_roles (id, user_id, role, created_at)
select
  gen_random_uuid(),
  u.id,
  'buyer',
  u.created_at
from auth.users u
where not exists (
  select 1 from public.user_roles ur where ur.user_id = u.id
);
