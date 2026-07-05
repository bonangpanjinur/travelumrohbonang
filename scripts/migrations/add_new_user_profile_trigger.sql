-- Auto-create a row in public.profiles (and default role in public.user_roles)
-- whenever a new user signs up via Supabase Auth (auth.users).
--
-- Without this trigger, `public.profiles` / `public.user_roles` stay empty
-- even after a successful signup, because the app never inserts into them
-- directly on registration — it relies on Supabase Auth's own `auth.users`
-- table plus this trigger to mirror the essentials into the public schema.
--
-- Safe to re-run (uses CREATE OR REPLACE / IF NOT EXISTS).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, created_at)
  values (
    new.id::text,
    coalesce(
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    now()
  )
  on conflict (id) do nothing;

  insert into public.user_roles (id, user_id, role, created_at)
  values (gen_random_uuid()::text, new.id::text, 'buyer', now())
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
