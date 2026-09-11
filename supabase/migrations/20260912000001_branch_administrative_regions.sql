-- Wilayah administratif cabang dari API wilayah Indonesia.
alter table public.branches
  add column if not exists province_code text,
  add column if not exists regency_code text,
  add column if not exists district text,
  add column if not exists district_code text,
  add column if not exists village text,
  add column if not exists village_code text;
